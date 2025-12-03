import { TEXT_TO_DISPLAY } from '../constants';

// Pseudo-random noise function
function noise(x: number, y: number, z: number) {
  return Math.sin(x * 10) * Math.cos(y * 10) * Math.sin(z * 10);
}

export const generateSphere = (count: number, radius: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;

    let x = Math.cos(theta) * radiusAtY;
    let z = Math.sin(theta) * radiusAtY;
    let curY = y;

    // Add "Terrain" noise
    const n = Math.abs(noise(x, curY, z));
    const r = radius + (n > 0.5 ? n * 0.5 : 0); // Continents pop out

    positions[i * 3] = x * r;
    positions[i * 3 + 1] = curY * r;
    positions[i * 3 + 2] = z * r;
  }
  return positions;
};

export const generateEverest = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Better mountain shape using exponential decay for slope + noise
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 9; 
    
    // Height decreases as radius increases, but with noise
    let height = 10 * Math.exp(-r * 0.4) - 4;
    
    // Add ruggedness
    height += (Math.random() - 0.5) * 1.5;

    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = Math.sin(angle) * r;
  }
  return positions;
};

export const generateHeart = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2;
    const u = Math.random(); // volume filler
    
    // Heart surface
    let x = 16 * Math.pow(Math.sin(t), 3);
    let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    
    // Scale down
    const scale = 0.2;
    x *= scale;
    y *= scale;

    // Add thickness based on position (thicker in middle)
    const zScale = Math.abs(x) * 0.5 + 1; 
    const z = (Math.random() - 0.5) * 2 * zScale;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y + 1; // Lift up slightly
    positions[i * 3 + 2] = z;
  }
  return positions;
};

export const generateText = (count: number): Float32Array => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = 512; // Higher res canvas
  canvas.width = size;
  canvas.height = size;

  if (!ctx) return new Float32Array(count * 3);

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'white';
  // Use a very bold font
  ctx.font = 'bold 160px "Microsoft YaHei", "SimHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(TEXT_TO_DISPLAY, size / 2, size / 2);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const validPixels: number[] = [];

  // Sampling
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 100) { 
      const idx = i / 4;
      const x = (idx % size) - size / 2;
      const y = size / 2 - Math.floor(idx / size);
      validPixels.push(x, y);
    }
  }

  const positions = new Float32Array(count * 3);
  if (validPixels.length === 0) return positions;

  for (let i = 0; i < count; i++) {
    const randomIdx = Math.floor(Math.random() * (validPixels.length / 2)) * 2;
    // Scale factor needs to be smaller now that canvas is bigger
    const scale = 0.04; 
    
    positions[i * 3] = validPixels[randomIdx] * scale;
    positions[i * 3 + 1] = validPixels[randomIdx + 1] * scale;
    // Add volume to text
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }

  return positions;
};

export const generateRandom = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Spread widely
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  return positions;
};