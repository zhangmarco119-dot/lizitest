export enum AppStage {
  INTRO = 'INTRO',
  EARTH = 'EARTH',
  EVEREST = 'EVEREST',
  NAME = 'NAME',
  HEART = 'HEART',
  FIREWORKS = 'FIREWORKS'
}

export enum HandGesture {
  NONE = 'NONE',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export interface ParticleConfig {
  count: number;
  color: string;
  size: number;
}

// Augment the global JSX namespace to include React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      ambientLight: any;
      color: any;
    }
  }
}