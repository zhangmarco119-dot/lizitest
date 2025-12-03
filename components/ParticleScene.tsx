import React, { useRef, useMemo, useEffect } from 'react';
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
  
  // Buffers for animation
  const currentPositions = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const targetPositions = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const velocities = useRef(new Float32Array(PARTICLE_COUNT * 3));
  
  // Generate shapes once
  const shapes = useMemo(() => ({
    [AppStage.INTRO]: generateRandom(PARTICLE_COUNT),
    [AppStage.EARTH]: generateSphere(PARTICLE_COUNT, 4),
    [AppStage.EVEREST]: generateEverest(PARTICLE_COUNT),
    [AppStage.NAME]: generateText(PARTICLE_COUNT),
    [AppStage.HEART]: generateHeart(PARTICLE_COUNT),
    [AppStage.FIREWORKS]: generateRandom(PARTICLE_COUNT),
  }), []);

  // Update target when stage changes
  useEffect(() => {
    const shape = shapes[stage];
    // Copy shape to target
    targetPositions.current.set(shape);
    
    // Sound effect
    if (stage === AppStage.FIREWORKS) {
       audioManager.playDisperse();
    }
  }, [stage, shapes]);

  // Effect for gesture changes (Audio triggers)
  useEffect(() => {
    if (gesture === HandGesture.CLOSED) {
      audioManager.playConverge();
    } else if (gesture === HandGesture.OPEN && stage !== AppStage.INTRO) {
      audioManager.playDisperse();
    }
  }, [gesture, stage]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const target = targetPositions.current;
    
    // Determine behavior based on gesture
    const isAggregating = gesture === HandGesture.CLOSED;
    const isExploding = stage === AppStage.FIREWORKS && gesture === HandGesture.OPEN;

    // Movement parameters
    const speed = isAggregating ? 4.0 : 2.0;
    const noise = 0.05;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const px = positions[i * 3];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];

      let tx = target[i * 3];
      let ty = target[i * 3 + 1];
      let tz = target[i * 3 + 2];

      if (!isAggregating) {
        // If hand is open, particles float/disperse from their target shape
        // Or if in intro/fireworks, they just float
        if (stage === AppStage.FIREWORKS || stage === AppStage.INTRO) {
            // Random float
             tx = px + (Math.random() - 0.5) * 0.1;
             ty = py + (Math.random() - 0.5) * 0.1;
             tz = pz + (Math.random() - 0.5) * 0.1;
        } else {
             // Gentle expansion
             tx = tx * 1.5;
             ty = ty * 1.5;
             tz = tz * 1.5;
        }
      }

      // If fireworks mode and exploding
      if (isExploding) {
          tx = px * 1.05 + (Math.random() - 0.5);
          ty = py * 1.05 + (Math.random() - 0.5);
          tz = pz * 1.05 + (Math.random() - 0.5);
      }

      // Lerp current to target
      positions[i * 3] += (tx - px) * speed * delta;
      positions[i * 3 + 1] += (ty - py) * speed * delta;
      positions[i * 3 + 2] += (tz - pz) * speed * delta;

      // Add idle rotation/noise
      if (isAggregating && stage === AppStage.EARTH) {
        // Rotate Earth
        const x = positions[i*3];
        const z = positions[i*3+2];
        const rotSpeed = 0.5 * delta;
        positions[i*3] = x * Math.cos(rotSpeed) - z * Math.sin(rotSpeed);
        positions[i*3+2] = x * Math.sin(rotSpeed) + z * Math.cos(rotSpeed);
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Rotate entire group slowly for dynamism
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
          array={currentPositions.current} // Initial empty
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default ParticleScene;
