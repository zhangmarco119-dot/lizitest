import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParticleScene from './components/ParticleScene';
import HandDetector from './components/HandDetector';
import { AppStage, HandGesture } from './types';
import { COLORS } from './constants';
import { audioManager } from './utils/audio';

const STAGE_ORDER = [
  AppStage.INTRO,
  AppStage.EARTH,
  AppStage.EVEREST,
  AppStage.NAME,
  AppStage.HEART,
  AppStage.FIREWORKS
];

export default function App() {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [gesture, setGesture] = useState<HandGesture>(HandGesture.NONE);
  const [particleColor, setParticleColor] = useState(COLORS.DEFAULT);
  const [hasStarted, setHasStarted] = useState(false);
  const prevGesture = useRef(HandGesture.NONE);

  const startExperience = useCallback(() => {
    if (!hasStarted) {
        setHasStarted(true);
        audioManager.resume();
        setCurrentStageIndex(1); // Jump to Earth
        setParticleColor(COLORS.EARTH);
    }
  }, [hasStarted]);

  const handleGestureChange = useCallback((newGesture: HandGesture) => {
    setGesture(newGesture);
    
    // Auto-start on first closed fist
    if (newGesture === HandGesture.CLOSED && !hasStarted) {
        startExperience();
    }
  }, [hasStarted, startExperience]);

  // Main interaction logic
  useEffect(() => {
    if (!hasStarted) {
        prevGesture.current = gesture;
        return;
    }

    // Detect transition from OPEN to CLOSED -> Advance stage
    if (prevGesture.current === HandGesture.OPEN && gesture === HandGesture.CLOSED) {
        setCurrentStageIndex(prev => {
            const next = prev + 1;
            // If we reach the end, loop back to Earth (index 1), skipping intro
            const nextIndex = next >= STAGE_ORDER.length ? 1 : next;
            
            const stage = STAGE_ORDER[nextIndex];
            // Auto-update color based on stage default
            switch(stage) {
                case AppStage.EARTH: setParticleColor(COLORS.EARTH); break;
                case AppStage.EVEREST: setParticleColor(COLORS.EVEREST); break;
                case AppStage.NAME: setParticleColor(COLORS.NAME); break;
                case AppStage.HEART: setParticleColor(COLORS.HEART); break;
                case AppStage.FIREWORKS: setParticleColor(COLORS.FIREWORKS); break;
            }
            return nextIndex;
        });
    }

    prevGesture.current = gesture;
  }, [gesture, hasStarted]);

  const getInstructions = () => {
    if (!hasStarted) return "Make a Fist ✊ or Click Start";
    
    const stage = STAGE_ORDER[currentStageIndex];
    if (stage === AppStage.FIREWORKS && gesture === HandGesture.OPEN) return "Explosion!";
    
    if (gesture === HandGesture.CLOSED) return "Keep closed to form shape...";
    if (gesture === HandGesture.OPEN) return "Make a Fist ✊ to morph next";
    return "Show hand to camera";
  };

  const getTitle = () => {
      const stage = STAGE_ORDER[currentStageIndex];
      switch(stage) {
          case AppStage.INTRO: return "Gesture Particles";
          case AppStage.EARTH: return "Planet Earth";
          case AppStage.EVEREST: return "Mt. Everest";
          case AppStage.NAME: return "Yan Qianqian";
          case AppStage.HEART: return "Love";
          case AppStage.FIREWORKS: return "Celebration";
          default: return "";
      }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      {/* 3D Scene - Always render immediately */}
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }} dpr={[1, 2]}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.5} />
        <ParticleScene 
          stage={STAGE_ORDER[currentStageIndex]} 
          gesture={gesture} 
          color={particleColor} 
        />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={!hasStarted} autoRotateSpeed={0.5} />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 flex flex-col md:flex-row justify-between items-start pointer-events-none z-10">
        <div className="flex flex-col space-y-2 mb-4 md:mb-0">
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg filter">
              {getTitle()}
            </h1>
            <p className="text-blue-200 text-lg md:text-xl font-mono animate-pulse drop-shadow-md">
               {getInstructions()}
            </p>
        </div>

        <div className="pointer-events-auto bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col gap-4 w-64">
           <div className="flex flex-col gap-1">
             <label className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Particle Color</label>
             <div className="flex items-center gap-2">
                 <input 
                   type="color" 
                   value={particleColor} 
                   onChange={(e) => setParticleColor(e.target.value)}
                   className="w-8 h-8 cursor-pointer rounded border-none bg-transparent"
                 />
                 <span className="text-xs text-gray-300 font-mono">{particleColor}</span>
             </div>
           </div>
           
           <div className="flex flex-col gap-2">
               <label className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Manual Controls</label>
               <div className="grid grid-cols-2 gap-2">
                   <button 
                    onMouseDown={() => handleGestureChange(HandGesture.CLOSED)}
                    onMouseUp={() => handleGestureChange(HandGesture.OPEN)}
                    onTouchStart={() => handleGestureChange(HandGesture.CLOSED)}
                    onTouchEnd={() => handleGestureChange(HandGesture.OPEN)}
                    className="px-3 py-3 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition-all active:scale-95 shadow-lg border border-blue-400/30 touch-manipulation"
                   >
                       HOLD (Fist)
                   </button>
                   <button 
                    onClick={() => handleGestureChange(HandGesture.OPEN)}
                    className="px-3 py-3 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg font-bold text-xs transition-all active:scale-95 border border-white/10 touch-manipulation"
                   >
                       RELEASE
                   </button>
               </div>
               <p className="text-[10px] text-gray-500 text-center">Use buttons if camera fails</p>
           </div>
        </div>
      </div>

      {/* Hand Tracker - Loads async */}
      <HandDetector onGestureChange={handleGestureChange} />

      {/* Intro Overlay */}
      {!hasStarted && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center space-y-8 p-8 max-w-lg bg-black/80 rounded-2xl border border-white/10 shadow-2xl mx-4">
                <div className="text-7xl animate-bounce">👋</div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Particle Story</h2>
                <div className="space-y-3 text-gray-300 text-left bg-white/5 p-6 rounded-lg">
                    <p className="flex items-center gap-2"><span className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white font-bold">1</span> Allow Camera Access</p>
                    <p className="flex items-center gap-2"><span className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white font-bold">2</span> <strong>Close Hand (Fist)</strong> to form shapes</p>
                    <p className="flex items-center gap-2"><span className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white font-bold">3</span> <strong>Open Hand</strong> to disperse</p>
                </div>
                
                <button 
                    onClick={startExperience}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xl rounded-xl transition-all transform hover:scale-105 shadow-xl"
                >
                    Start Experience
                </button>
                <p className="text-xs text-gray-500">Camera recommended but not required.</p>
            </div>
        </div>
      )}
      
      {/* Current Gesture Indicator */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 pointer-events-none transition-all duration-300 opacity-80 z-20">
         <div className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm border backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
             gesture === HandGesture.CLOSED 
             ? 'bg-green-500/20 border-green-500 text-green-300 shadow-green-500/20' 
             : gesture === HandGesture.OPEN 
                ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-blue-500/20' 
                : 'bg-red-500/20 border-red-500 text-red-300'
         }`}>
             <div className={`w-2 h-2 rounded-full ${gesture === HandGesture.NONE ? 'bg-red-500' : 'bg-current animate-pulse'}`} />
             STATUS: {gesture === HandGesture.NONE ? 'NO HAND' : gesture}
         </div>
      </div>
    </div>
  );
}