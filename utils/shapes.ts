import * as THREE from 'three';
import { TEXT_TO_DISPLAY } from '../constants';

export const generateSphere = (count: number, radius: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    positions[i * 3] = x * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = z * radius;
  }
  return positions;
};

export const generateEverest = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Cone-like base with noise
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 8; // Base radius
    const height = 8 - r + (Math.random() - 0.5) * 2; // Rough cone

    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = (height * 0.6) - 3; // Shift down
    positions[i * 3 + 2] = Math.sin(angle) * r;
  }
  return positions;
};

export const generateHeart = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // 3D Heart formula
    // x = 16sin^3(t)
    // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
    // z = varies for thickness
    
    // We use rejection sampling or just parametric distribution
    const t = Math.random() * Math.PI * 2;
    const scale = 0.25;
    
    // Base shape
    let x = 16 * Math.pow(Math.sin(t), 3);
    let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    
    // Add volume
    const z = (Math.random() - 0.5) * 4;
    
    // Scale and center
    positions[i * 3] = x * scale;
    positions[i * 3 + 1] = y * scale;
    positions[i * 3 + 2] = z;
  }
  return positions;
};

export const generateText = (count: number): Float32Array => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = 256;
  canvas.width = size;
  canvas.height = size;

  if (!ctx) return new Float32Array(count * 3);

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 80px "Microsoft YaHei", "SimHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(TEXT_TO_DISPLAY, size / 2, size / 2);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const validPixels: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 128) { // If pixel is bright enough
      const idx = i / 4;
      const x = (idx % size) - size / 2;
      const y = size / 2 - Math.floor(idx / size); // Flip Y
      validPixels.push(x, y);
    }
  }

  const positions = new Float32Array(count * 3);
  if (validPixels.length === 0) return positions;

  for (let i = 0; i < count; i++) {
    const randomIdx = Math.floor(Math.random() * (validPixels.length / 2)) * 2;
    // Map pixels to 3D space
    positions[i * 3] = validPixels[randomIdx] * 0.08; // Scale down
    positions[i * 3 + 1] = validPixels[randomIdx + 1] * 0.08;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1; // Slight depth
  }

  return positions;
};

export const generateRandom = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  return positions;
};
