import * as THREE from 'three';
import { lonLatDayToVec3 } from '../utils/geo.js';
import { CRUISE_COLORS, CRUISE_PORT_RADIUS, CRUISE_LINE_RADIUS } from '../core/constants.js';

export class CruiseManager {
  constructor(scene) {
    this.scene = scene;
    this.cruisePortSpheres = [];
    this.cruiseLines = [];
  }

  clearCruises() {
    this.cruisePortSpheres.forEach(sphere => this.scene.remove(sphere));
    this.cruiseLines.forEach(line => this.scene.remove(line));
    this.cruisePortSpheres.length = 0;
    this.cruiseLines.length = 0;
  }

  async renderCruises(cruises) {
    this.clearCruises();
    
    cruises.forEach((cruise, idx) => {
      if (!cruise.stops || cruise.stops.length < 2) return;
      
      const color = CRUISE_COLORS[idx % CRUISE_COLORS.length];
      this.createCruiseRoute(cruise, color);
      this.createCruiseStops(cruise, color);
    });
  }

  createCruiseRoute(cruise, color) {
    // Create route points
    const points = cruise.stops.map(stop => 
      lonLatDayToVec3(stop.lng, stop.lat, stop.date)
    );

    // Create route curve
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, CRUISE_LINE_RADIUS, 16, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({ color });
    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    
    tubeMesh.userData = {
      type: 'cruise',
      cruiseId: cruise.cruise_id,
      cruiseName: cruise.cruise_name,
      shipName: cruise.ship_name,
      companyName: cruise.company_name
    };
    
    this.cruiseLines.push(tubeMesh);
    this.scene.add(tubeMesh);
  }

  createCruiseStops(cruise, color) {
    cruise.stops.forEach(stop => {
      const pos = lonLatDayToVec3(stop.lng, stop.lat, stop.date);
      const sphereGeometry = new THREE.SphereGeometry(CRUISE_PORT_RADIUS, 24, 24);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      
      sphere.position.copy(pos);
      sphere.userData = {
        type: 'port',
        portName: stop.point_name,
        country: stop.country,
        date: stop.date,
        cruiseId: cruise.cruise_id,
        cruiseName: cruise.cruise_name
      };
      
      this.cruisePortSpheres.push(sphere);
      this.scene.add(sphere);
    });
  }

  getObjects() {
    return [...this.cruisePortSpheres, ...this.cruiseLines];
  }
} 