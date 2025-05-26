import * as THREE from 'three';
import { 
  EARTH_RADIUS, 
  DEGREE_TO_RADIANS, 
  COUNTRY_SURFACE_RADIUS,
  KM_TO_UNITS,
  CRUISE_DAY_HEIGHT_KM
} from '../core/constants.js';

export function lonLatToVector3(lon, lat, radius = EARTH_RADIUS, height = 0) {
  const phi = (90 - lat) * DEGREE_TO_RADIANS;
  const theta = (lon + 180) * DEGREE_TO_RADIANS;
  const r = radius + height;

  return new THREE.Vector3(
    -(r * Math.sin(phi) * Math.cos(theta)),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export function lonLatDayToVec3(lon, lat, date) {
  const startDate = new Date(date);
  const days = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
  const height = days * CRUISE_DAY_HEIGHT_KM * KM_TO_UNITS;
  return lonLatToVector3(lon, lat, COUNTRY_SURFACE_RADIUS, height);
}

export function calculateDistance(lon1, lat1, lon2, lat2) {
  const R = EARTH_RADIUS_KM;
  const dLat = (lat2 - lat1) * DEGREE_TO_RADIANS;
  const dLon = (lon2 - lon1) * DEGREE_TO_RADIANS;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * DEGREE_TO_RADIANS) * Math.cos(lat2 * DEGREE_TO_RADIANS) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
} 