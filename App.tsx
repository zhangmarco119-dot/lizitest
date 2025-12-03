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
    if (newGesture === HandGesture.CLOSED && !hasStarted) {
        startExperience();
    }
  }, [hasStarted, startExperience]);

  useEffect(() => {
    if (!hasStarted) {
        prevGesture.current = gesture;
        return;
    }

    if (prevGesture.current === HandGesture.OPEN && gesture === HandGesture.CLOSED) {
        setCurrentStageIndex(prev => {
            const next = prev + 1;
            const nextIndex = next >= STAGE_ORDER.length ? 1 : next;
            
            const stage = STAGE_ORDER[nextIndex];
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
    if (!hasStarted) return "握拳 ✊ 或点击开始";
    
    const stage = STAGE_ORDER[currentStageIndex];
    if (stage === AppStage.FIREWORKS && gesture === HandGesture.OPEN) return "烟花绽放！";
    
    if (gesture === HandGesture.CLOSED) return "保持握拳，凝聚形状...";
    if (gesture === HandGesture.OPEN) return "握拳 ✊ 进入下一幕";
    return "请将手放入摄像头视野";
  };

  const getTitle = () => {
      const stage = STAGE_ORDER[currentStageIndex];
      switch(stage) {
          case AppStage.INTRO: return "粒子交互之旅";
          case AppStage.EARTH: return "蔚蓝星球";
          case AppStage.EVEREST: return "珠穆朗玛";
          case AppStage.NAME: return "专属定制";
          case AppStage.HEART: return "爱的凝聚";
          case AppStage.FIREWORKS: return "盛大庆典";
          default: return "";
      }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans">
      <Canvas camera={{ position: [0, 0, 14], fov: 60 }} dpr={[1, 2]}>
        <color attach="background" args={['#020202']} />
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
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_10px_rgba(100,200,255,0.5)]">
              {getTitle()}
            </h1>
            <p className="text-cyan-100 text-lg md:text-xl font-mono animate-pulse drop-shadow-md bg-black/30 px-2 rounded inline-block">
               {getInstructions()}
            </p>
        </div>

        <div className="pointer-events-auto bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col gap-4 w-64 shadow-2xl">
           <div className="flex flex-col gap-1">
             <label className="text-xs text-gray-400 font-semibold tracking-wider">粒子颜色调节</label>
             <div className="flex items-center gap-2">
                 <input 
                   type="color" 
                   value={particleColor} 
                   onChange={(e) => setParticleColor(e.target.value)}
                   className="w-full h-8 cursor-pointer rounded border-none bg-transparent"
                 />
             </div>
           </div>
           
           <div className="flex flex-col gap-2">
               <label className="text-xs text-gray-400 font-semibold tracking-wider">手动控制台</label>
               <div className="grid grid-cols-2 gap-2">
                   <button 
                    onMouseDown={() => handleGestureChange(HandGesture.CLOSED)}
                    onMouseUp={() => handleGestureChange(HandGesture.OPEN)}
                    onTouchStart={() => handleGestureChange(HandGesture.CLOSED)}
                    onTouchEnd={() => handleGestureChange(HandGesture.OPEN)}
                    className="px-3 py-4 bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white rounded-lg font-bold text-sm transition-all active:scale-95 shadow-lg border border-blue-400/30 touch-manipulation"
                   >
                       按住握拳
                   </button>
                   <button 
                    onClick={() => handleGestureChange(HandGesture.OPEN)}
                    className="px-3 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-sm transition-all active:scale-95 border border-white/10 touch-manipulation"
                   >
                       松开手掌
                   </button>
               </div>
               <p className="text-[10px] text-gray-500 text-center">如摄像头不可用，请使用按钮</p>
           </div>
        </div>
      </div>

      <HandDetector onGestureChange={handleGestureChange} />

      {!hasStarted && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="text-center space-y-8 p-8 max-w-lg bg-gray-900/90 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.3)] mx-4">
                <div className="text-7xl animate-bounce">👋</div>
                <h2 className="text-3xl font-bold text-white tracking-tight">手势粒子交互体验</h2>
                <div className="space-y-4 text-gray-300 text-left bg-black/40 p-6 rounded-xl border border-white/5">
                    <p className="flex items-center gap-3"><span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white font-bold shrink-0">1</span> <span>允许浏览器访问摄像头</span></p>
                    <p className="flex items-center gap-3"><span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white font-bold shrink-0">2</span> <span><strong>握紧拳头</strong>：凝聚粒子成型</span></p>
                    <p className="flex items-center gap-3"><span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white font-bold shrink-0">3</span> <span><strong>张开手掌</strong>：粒子扩散/爆炸</span></p>
                </div>
                
                <button 
                    onClick={startExperience}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xl rounded-xl transition-all transform hover:scale-105 shadow-xl ring-2 ring-white/20"
                >
                    开启体验
                </button>
                <p className="text-xs text-gray-500">提示：如无法使用摄像头，可使用界面右侧按钮</p>
            </div>
        </div>
      )}
      
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 pointer-events-none transition-all duration-300 opacity-80 z-20">
         <div className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm border backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
             gesture === HandGesture.CLOSED 
             ? 'bg-green-500/20 border-green-500 text-green-300 shadow-green-500/20' 
             : gesture === HandGesture.OPEN 
                ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-blue-500/20' 
                : 'bg-red-500/20 border-red-500 text-red-300'
         }`}>
             <div className={`w-2 h-2 rounded-full ${gesture === HandGesture.NONE ? 'bg-red-500' : 'bg-current animate-pulse'}`} />
             状态: {gesture === HandGesture.NONE ? '未检测到手' : (gesture === HandGesture.CLOSED ? '握拳 (凝聚)' : '张开 (扩散)')}
         </div>
      </div>
    </div>
  );
}