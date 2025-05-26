import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONTROLS_SETTINGS, CAMERA_STATE_KEY } from './constants.js';
import { saveCameraState, restoreCameraState } from '../utils/storage.js';

export class ControlsManager {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.setupControls();
    this.restoreState();
  }

  setupControls() {
    const { dampingFactor, minDistance, maxDistance, baseRotateSpeed } = CONTROLS_SETTINGS;
    
    this.controls.enableDamping = true;
    this.controls.dampingFactor = dampingFactor;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = minDistance;
    this.controls.maxDistance = maxDistance;
    this.controls.target.set(0, 0, 0);
    
    this.baseRotateSpeed = baseRotateSpeed;
    this.baseDistance = maxDistance;
    
    this.controls.addEventListener('change', () => {
      saveCameraState(this.camera, this.controls);
    });
  }

  restoreState() {
    restoreCameraState(this.camera, this.controls);
  }

  update() {
    // Update rotation speed based on distance
    const dist = this.camera.position.distanceTo(this.controls.target);
    this.controls.rotateSpeed = this.baseRotateSpeed * (dist / this.baseDistance);
    this.controls.rotateSpeed = Math.max(this.controls.rotateSpeed, 0.1);
    
    this.controls.update();
  }

  // Rotate globe left
  rotateLeft(angle = 0.1) {
    this.controls.rotateLeft(angle);
    this.controls.update();
  }

  // Rotate globe right
  rotateRight(angle = 0.1) {
    this.controls.rotateLeft(-angle);
    this.controls.update();
  }

  // Rotate globe up
  rotateUp(angle = 0.1) {
    this.controls.rotateUp(angle);
    this.controls.update();
  }

  // Rotate globe down
  rotateDown(angle = 0.1) {
    this.controls.rotateUp(-angle);
    this.controls.update();
  }

  // Zoom in
  zoomIn(factor = 0.9) {
    this.camera.position.multiplyScalar(factor);
    this.controls.update();
  }

  // Zoom out
  zoomOut(factor = 1.1) {
    this.camera.position.multiplyScalar(factor);
    this.controls.update();
  }
} 