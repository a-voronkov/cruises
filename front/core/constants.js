// Earth and scene constants
export const EARTH_RADIUS_KM = 6371;
export const DEGREE_TO_RADIANS = Math.PI / 180;
export const EARTH_RADIUS = 100;
export const COUNTRY_SURFACE_RADIUS = EARTH_RADIUS;

// Colors
export const COUNTRY_FILL_COLOR = 0xf5f5f5;
export const BORDER_COLOR = 0xcccccc;
export const HOVER_FILL_COLOR = 0xcccccc;
export const HOVER_BORDER_COLOR = 0x333333;

// Cruise visualization
export const KM_TO_UNITS = EARTH_RADIUS / EARTH_RADIUS_KM;
export const CRUISE_DAY_HEIGHT_KM = 10;
export const CRUISE_PORT_RADIUS = 0.5;
export const CRUISE_LINE_RADIUS = 0.1;

// Cruise colors palette
export const CRUISE_COLORS = [
  0xff0000, 0x00aaff, 0x00cc44, 0xff9900, 0x9900ff, 
  0x00ffcc, 0xff00aa, 0xaaaa00, 0x0088ff, 0xff6600
];

// Storage keys
export const CAMERA_STATE_KEY = 'globe_camera_state';

// Camera settings
export const CAMERA_SETTINGS = {
  fov: 75,
  near: 0.1,
  far: 1000,
  initialPosition: [0, 0, 200],
  lookAt: [0, 0, 0]
};

// Controls settings
export const CONTROLS_SETTINGS = {
  dampingFactor: 0.25,
  minDistance: EARTH_RADIUS + 10,
  maxDistance: EARTH_RADIUS * 5,
  baseRotateSpeed: 1.0
}; 