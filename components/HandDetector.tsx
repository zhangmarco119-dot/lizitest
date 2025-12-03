import React, { useEffect, useRef, useState } from 'react';
import { HandGesture } from '../types';

// We dynamically import MediaPipe types to avoid build-time/load-time blocking
// The actual import happens in useEffect

interface HandDetectorProps {
  onGestureChange: (gesture: HandGesture) => void;
}

const HandDetector: React.FC<HandDetectorProps> = ({ onGestureChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const lastGestureRef = useRef<HandGesture>(HandGesture.NONE);
  const frameIdRef = useRef<number>(0);

  useEffect(() => {
    let handLandmarker: any = null;
    let running = true;
    let videoElement: HTMLVideoElement | null = null;

    const setupMediaPipe = async () => {
      try {
        console.log("Loading MediaPipe module...");
        // Dynamic import to prevent main thread blocking on initial load
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        
        if (!running) return;
        console.log("Initializing Vision Tasks...");

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
          numHands: 2
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
      
      // Ensure video has dimensions
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
           frameIdRef.current = requestAnimationFrame(() => predictWebcam(landmarker));
           return;
      }

      const nowInMs = Date.now();
      const results = landmarker.detectForVideo(videoRef.current, nowInMs);

      let detectedGesture = HandGesture.NONE;

      if (results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const wrist = landmarks[0];
        const middleTip = landmarks[12];
        const middleBase = landmarks[9];

        // Calculate distance squared
        const distTipToWrist = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
        const distBaseToWrist = Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y);

        // Simple heuristic: If tip is close to base/wrist, it's a fist.
        if (distTipToWrist < distBaseToWrist * 1.2) {
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

    // Timeout to stop blocking if camera/AI never loads
    const timeout = setTimeout(() => {
        if (running && status === 'loading') {
            console.warn("MediaPipe initialization timed out, falling back to manual");
            setStatus('error'); // Trigger fallback UI
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

  if (status === 'error') {
      return (
        <div className="fixed bottom-4 left-4 z-50 rounded-xl p-4 bg-red-900/80 text-white text-xs max-w-[200px] border border-red-500">
           Camera unavailable. Please use manual buttons.
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
           Loading AI...
         </div>
       )}
    </div>
  );
};

export default HandDetector;