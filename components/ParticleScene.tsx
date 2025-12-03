import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppStage, HandGesture } from '../types';
import { 
  generateSphere, 
  generateEverest, 
  generateText, 
  generateHeart, 
  generateRandom 
} from '../utils/shapes';
import { PARTICLE_COUNT, COLORS } from '../constants';
import { audioManager } from '../utils/audio';

interface ParticleSceneProps {
  stage: AppStage;
  gesture: HandGesture;
  color: string;
}

const ParticleScene: React.FC<ParticleSceneProps> = ({ stage, gesture, color }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [explosionTime, setExplosionTime] = useState(0);
  
  // Buffers
  const currentPositions = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const targetPositions = useRef(new Float32Array(PARTICLE_COUNT * 3));
  // Store custom velocity for physics
  const velocities = useRef(new Float32Array(PARTICLE_COUNT * 3)); 
  
  const shapes = useMemo(() => ({
    [AppStage.INTRO]: generateRandom(PARTICLE_COUNT),
    [AppStage.EARTH]: generateSphere(PARTICLE_COUNT, 4),
    [AppStage.EVEREST]: generateEverest(PARTICLE_COUNT),
    [AppStage.NAME]: generateText(PARTICLE_COUNT),
    [AppStage.HEART]: generateHeart(PARTICLE_COUNT),
    [AppStage.FIREWORKS]: generateRandom(PARTICLE_COUNT), // Placeholder, logic handled in loop
  }), []);

  useEffect(() => {
    // Standard morph target update
    if (stage !== AppStage.FIREWORKS) {
        const shape = shapes[stage];
        targetPositions.current.set(shape);
    }
  }, [stage, shapes]);

  useEffect(() => {
    if (gesture === HandGesture.CLOSED) {
      audioManager.playConverge();
    } else if (gesture === HandGesture.OPEN && stage !== AppStage.INTRO) {
      audioManager.playDisperse();
      
      // Reset fireworks physics when triggered
      if (stage === AppStage.FIREWORKS) {
          setExplosionTime(Date.now());
          // Init velocities for launch
          for(let i=0; i<PARTICLE_COUNT; i++) {
              velocities.current[i*3] = (Math.random() - 0.5) * 0.5; // X drift
              velocities.current[i*3+1] = 5 + Math.random() * 5; // Y Launch Speed
              velocities.current[i*3+2] = (Math.random() - 0.5) * 0.5; // Z drift
          }
      }
    }
  }, [gesture, stage]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const target = targetPositions.current;
    
    const isAggregating = gesture === HandGesture.CLOSED;
    const isFireworks = stage === AppStage.FIREWORKS && gesture === HandGesture.OPEN;

    const speed = isAggregating ? 4.0 : 2.5;

    // Special physics for fireworks
    if (isFireworks) {
        const timeSinceExplosion = (Date.now() - explosionTime) / 1000;
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            let vx = velocities.current[i*3];
            let vy = velocities.current[i*3+1];
            let vz = velocities.current[i*3+2];

            // Phase 1: Launch (First 0.5s)
            if (timeSinceExplosion < 0.6) {
                positions[i*3] += vx * delta;
                positions[i*3+1] += vy * delta;
                positions[i*3+2] += vz * delta;
            } 
            // Phase 2: Explode
            else {
                // If just switched to phase 2, scramble velocities once (simulated)
                // We do continuous gravity
                
                // Explode outwards from current pos roughly? 
                // We use a simple gravity model here for "falling sparks"
                vy -= 9.8 * delta * 0.5; // Gravity
                
                // Add some "burst" radial velocity if roughly at transition
                if (timeSinceExplosion < 0.7) {
                     vx *= 1.1;
                     vz *= 1.1;
                     vy *= 0.5; // Slow down vertical ascent
                }

                velocities.current[i*3+1] = vy;
                
                positions[i*3] += vx * delta * 2; // Spread faster
                positions[i*3+1] += vy * delta;
                positions[i*3+2] += vz * delta * 2;
            }
            
            // Floor collision
            if (positions[i*3+1] < -10) positions[i*3+1] = -10;
        }
    } else {
        // Standard Morphing Logic
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const px = positions[i * 3];
            const py = positions[i * 3 + 1];
            const pz = positions[i * 3 + 2];

            let tx = target[i * 3];
            let ty = target[i * 3 + 1];
            let tz = target[i * 3 + 2];

            if (!isAggregating) {
                // Disperse / Float
                if (stage === AppStage.INTRO) {
                    tx = px + (Math.random() - 0.5) * 0.1;
                    ty = py + (Math.random() - 0.5) * 0.1;
                    tz = pz + (Math.random() - 0.5) * 0.1;
                } else {
                    // Gentle expansion from shape
                    tx = tx * 2;
                    ty = ty * 2;
                    tz = tz * 2;
                }
            }

            // Lerp
            positions[i * 3] += (tx - px) * speed * delta;
            positions[i * 3 + 1] += (ty - py) * speed * delta;
            positions[i * 3 + 2] += (tz - pz) * speed * delta;

            // Earth Rotation
            if (stage === AppStage.EARTH && isAggregating) {
                const x = positions[i*3];
                const z = positions[i*3+2];
                const rotSpeed = 0.5 * delta;
                positions[i*3] = x * Math.cos(rotSpeed) - z * Math.sin(rotSpeed);
                positions[i*3+2] = x * Math.sin(rotSpeed) + z * Math.cos(rotSpeed);
            }
        }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Slow global rotation for aesthetics
    if (!isAggregating) {
        pointsRef.current.rotation.y += 0.05 * delta;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={currentPositions.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06} // Smaller particles for higher density
        color={color}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default ParticleScene;