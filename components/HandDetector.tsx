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

        // LOWER THRESHOLDS: Make detection much easier (0.3 instead of default 0.5)
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3
        });

        if (!running) {
            handLandmarker.close();
            return;
        }

        startWebcam(handLandmarker);
      } catch (error) {
        console.error("MediaPipe initialization error:", error);
        // Only set error if it's a critical failure, otherwise keep trying/loading
        // We don't want to kill the camera just because of a network glitch
      }
    };

    const startWebcam = async (landmarker: any) => {
      if (!videoRef.current) return;
      videoElement = videoRef.current;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640, 
                height: 480,
                frameRate: { ideal: 30 }
            } 
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
        // ONLY set error status if camera is explicitly denied or hardware fails
        if (running) setStatus('error');
      }
    };

    const predictWebcam = (landmarker: any) => {
      if (!running || !videoRef.current) return;
      
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
           frameIdRef.current = requestAnimationFrame(() => predictWebcam(landmarker));
           return;
      }

      try {
          const nowInMs = Date.now();
          const results = landmarker.detectForVideo(videoRef.current, nowInMs);

          let detectedGesture = HandGesture.NONE;

          if (results.landmarks.length > 0) {
            const lm = results.landmarks[0];
            
            // Multi-finger check
            const wrist = lm[0];
            const tips = [lm[8], lm[12], lm[16], lm[20]]; // Index, Middle, Ring, Pinky
            
            // Calculate dynamic hand size for relative measurement
            const handSize = Math.hypot(lm[9].x - wrist.x, lm[9].y - wrist.y);
            
            // Increased threshold slightly to make "Fist" detection easier
            // 1.2 * handSize means even if fingers aren't super tight, it counts as closed
            const foldThreshold = handSize * 1.2; 

            let foldedFingers = 0;
            tips.forEach(tip => {
                const dist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
                if (dist < foldThreshold) foldedFingers++;
            });

            // Logic: 
            // If 3+ fingers are folded -> CLOSED
            // Otherwise -> OPEN
            if (foldedFingers >= 3) {
                detectedGesture = HandGesture.CLOSED;
            } else {
                detectedGesture = HandGesture.OPEN;
            }
          } else {
              // If we lose tracking, keep the last known gesture for a few frames 
              // to prevent flickering (optional, but sticking to NONE for responsiveness for now)
              detectedGesture = HandGesture.NONE;
          }

          if (detectedGesture !== lastGestureRef.current) {
            lastGestureRef.current = detectedGesture;
            onGestureChange(detectedGesture);
          }
      } catch (e) {
          console.warn("Prediction error", e);
      }

      frameIdRef.current = requestAnimationFrame(() => predictWebcam(landmarker));
    };

    setupMediaPipe();

    // REMOVED: The timeout that forces 'error' state. 
    // We now wait indefinitely for the model to load or camera to start.

    return () => {
      running = false;
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
           无法访问摄像头，已切换至按钮控制
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
           AI 模型初始化中...
         </div>
       )}
    </div>
  );
};

export default HandDetector;