import React, { useEffect, useRef, useState } from 'react';
import { HandGesture } from '../types';

interface HandDetectorProps {
  onGestureChange: (gesture: HandGesture) => void;
}

const HandDetector: React.FC<HandDetectorProps> = ({ onGestureChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'manual'>('loading');
  const lastGestureRef = useRef<HandGesture>(HandGesture.NONE);
  const frameIdRef = useRef<number>(0);

  useEffect(() => {
    // Check if running from file protocol
    if (window.location.protocol === 'file:') {
        console.warn("Running from file:// protocol, switching to manual mode.");
        setStatus('manual');
        return;
    }

    let handLandmarker: any = null;
    let running = true;
    let videoElement: HTMLVideoElement | null = null;

    const setupMediaPipe = async () => {
      try {
        console.log("Loading MediaPipe module...");
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        
        if (!running) return;
        
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        if (!running) return;

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (!running) {
            handLandmarker.close();
            return;
        }

        startWebcam(handLandmarker);
      } catch (error) {
        console.error("MediaPipe error:", error);
        if (running) setStatus('error');
      }
    };

    const startWebcam = async (landmarker: any) => {
      if (!videoRef.current) return;
      videoElement = videoRef.current;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        if (!running) {
             stream.getTracks().forEach(t => t.stop());
             return;
        }
        videoElement.srcObject = stream;
        videoElement.addEventListener('loadeddata', () => {
            if (running) {
                setStatus('ready');
                predictWebcam(landmarker);
            }
        });
      } catch (err) {
        console.error("Camera access denied or failed", err);
        if (running) setStatus('error');
      }
    };

    const predictWebcam = (landmarker: any) => {
      if (!running || !videoRef.current) return;
      
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
           frameIdRef.current = requestAnimationFrame(() => predictWebcam(landmarker));
           return;
      }

      const nowInMs = Date.now();
      const results = landmarker.detectForVideo(videoRef.current, nowInMs);

      let detectedGesture = HandGesture.NONE;

      if (results.landmarks.length > 0) {
        const lm = results.landmarks[0];
        
        // Multi-finger check for robustness
        // Check fingertips (8, 12, 16, 20) against their PIP joints (6, 10, 14, 18)
        // If tips are BELOW joints (in y-axis relative to wrist orientation) or simply close to wrist
        
        const wrist = lm[0];
        const tips = [lm[8], lm[12], lm[16], lm[20]]; // Index, Middle, Ring, Pinky
        // const pips = [lm[6], lm[10], lm[14], lm[18]];
        
        let foldedFingers = 0;
        
        // Check distance of fingertips to wrist
        // Average hand size ref -> Wrist to Middle Finger Base (0->9)
        const handSize = Math.hypot(lm[9].x - wrist.x, lm[9].y - wrist.y);
        const foldThreshold = handSize * 1.1; 

        tips.forEach(tip => {
            const dist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
            if (dist < foldThreshold) foldedFingers++;
        });

        // If 3 or more fingers are close to wrist -> FIST
        if (foldedFingers >= 3) {
            detectedGesture = HandGesture.CLOSED;
        } else {
            detectedGesture = HandGesture.OPEN;
        }
      } else {
          detectedGesture = HandGesture.NONE;
      }

      if (detectedGesture !== lastGestureRef.current) {
        lastGestureRef.current = detectedGesture;
        onGestureChange(detectedGesture);
      }

      frameIdRef.current = requestAnimationFrame(() => predictWebcam(landmarker));
    };

    setupMediaPipe();

    const timeout = setTimeout(() => {
        if (running && status === 'loading') {
            console.warn("MediaPipe init timeout");
            setStatus('error');
        }
    }, 15000);

    return () => {
      running = false;
      clearTimeout(timeout);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      if (videoElement && videoElement.srcObject) {
         const stream = videoElement.srcObject as MediaStream;
         stream.getTracks().forEach(t => t.stop());
      }
      if (handLandmarker) handLandmarker.close();
    };
  }, []);

  if (status === 'manual') {
      return (
        <div className="fixed bottom-4 left-4 z-50 rounded-xl p-3 bg-blue-900/80 text-white text-xs max-w-[200px] border border-blue-500 backdrop-blur-md">
           手动模式已激活（文件运行）
        </div>
      );
  }

  if (status === 'error') {
      return (
        <div className="fixed bottom-4 left-4 z-50 rounded-xl p-3 bg-red-900/80 text-white text-xs max-w-[200px] border border-red-500 backdrop-blur-md">
           摄像头不可用，请使用按钮控制
        </div>
      );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 w-32 h-24 bg-black/50">
       <video 
         ref={videoRef} 
         autoPlay 
         playsInline 
         muted
         className={`w-full h-full object-cover transform scale-x-[-1] ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`} 
       />
       {status === 'loading' && (
         <div className="absolute inset-0 flex items-center justify-center text-center text-[10px] text-white bg-black/80 p-2">
           AI 模型加载中...
         </div>
       )}
    </div>
  );
};

export default HandDetector;