import { CAMERA_STATE_KEY } from '../core/constants.js';

export function saveCameraState(camera, controls) {
  const state = {
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    },
    target: {
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z
    }
  };
  localStorage.setItem(CAMERA_STATE_KEY, JSON.stringify(state));
}

export function restoreCameraState(camera, controls) {
  const saved = localStorage.getItem(CAMERA_STATE_KEY);
  if (!saved) return;
  
  try {
    const state = JSON.parse(saved);
    if (state.position && state.target) {
      camera.position.set(state.position.x, state.position.y, state.position.z);
      controls.target.set(state.target.x, state.target.y, state.target.z);
      controls.update();
    }
  } catch (e) {
    console.warn('Failed to restore camera state:', e);
  }
} 