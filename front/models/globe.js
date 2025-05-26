import * as THREE from 'three';
import Earcut from 'earcut';
import { lonLatToVector3 } from '../utils/geo.js';
import { 
  COUNTRY_SURFACE_RADIUS, 
  COUNTRY_FILL_COLOR, 
  BORDER_COLOR 
} from '../core/constants.js';

export class GlobeManager {
  constructor(scene) {
    this.scene = scene;
    this.countryMeshes = [];
  }

  async loadCountries(geoData) {
    geoData.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      const type = feature.geometry.type;
      const countryName = feature.properties.name;

      const polygons = (type === 'Polygon') ? [coords] : coords;
      
      polygons.forEach(poly => {
        const outerRing = poly[0];
        const holes = poly.slice(1);

        // Create country mesh
        const mesh = this.createCountryMesh(outerRing, holes, countryName);
        this.countryMeshes.push(mesh);
        this.scene.add(mesh);

        // Create border lines
        this.createBorderLines(outerRing, holes);
      });
    });
  }

  createCountryMesh(outerRing, holes, countryName) {
    // Create 2D shape for triangulation
    const vertices2D = [];
    const holeIndices = [];
    let currentIndex = 0;

    // Add outer ring vertices
    outerRing.forEach(([x, y]) => {
      vertices2D.push(x, y);
    });
    currentIndex += outerRing.length;

    // Add hole vertices
    holes.forEach(hole => {
      holeIndices.push(currentIndex);
      hole.forEach(([x, y]) => {
        vertices2D.push(x, y);
      });
      currentIndex += hole.length;
    });

    // Triangulate
    const triangles = Earcut(vertices2D, holeIndices);

    // Create 3D geometry
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i < vertices2D.length; i += 2) {
      const lon = vertices2D[i];
      const lat = vertices2D[i + 1];
      const point = lonLatToVector3(lon, lat, COUNTRY_SURFACE_RADIUS);
      positions.push(point.x, point.y, point.z);

      const u = (lon + 180) / 360;
      const v = (90 - lat) / 180;
      uvs.push(u, v);
    }

    indices.push(...triangles);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      color: COUNTRY_FILL_COLOR,
      side: THREE.FrontSide,
      depthWrite: true,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = {
      type: 'country',
      name: countryName
    };

    return mesh;
  }

  createBorderLines(outerRing, holes) {
    const rings = [outerRing, ...holes];
    rings.forEach(ring => {
      const borderPoints = [];
      ring.forEach(([lon, lat]) => {
        const point = lonLatToVector3(lon, lat, COUNTRY_SURFACE_RADIUS + 0.01);
        borderPoints.push(point);
      });
      if (borderPoints.length > 0) {
        borderPoints.push(borderPoints[0].clone());
      }

      if (borderPoints.length > 1) {
        const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
        const borderMaterial = new THREE.LineBasicMaterial({
          color: BORDER_COLOR,
          linewidth: 1
        });
        const borderLine = new THREE.Line(borderGeometry, borderMaterial);
        this.scene.add(borderLine);
      }
    });
  }

  getObjects() {
    return this.countryMeshes;
  }
} 