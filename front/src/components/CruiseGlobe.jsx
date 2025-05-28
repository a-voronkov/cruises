import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import earcut from 'earcut';
import { useFrame, useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { TubeGeometry } from 'three';
import { CatmullRomCurve3, MeshBasicMaterial, Mesh, Vector3 } from 'three';
import { formatDate } from '../utils/format';
import ShipRouteDrawer from './ShipRouteDrawer';

function lonLatToVector3(lon, lat, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

function CountryBufferMesh({ coordinates, color = 0xf8f8f8, radius = 2, offset = 0.01 }) {
  // coordinates: [ [ [lon, lat], ... ], [hole1], ... ]
  const geometry = useMemo(() => {
    const vertices = [];
    const holes = [];
    let holeIndex = 0;
    // IMPORTANT: reverse ring order for correct normal orientation
    const reversed = coordinates.map(ring => ring.slice().reverse());
    reversed.forEach((ring, i) => {
      if (i > 0) {
        holeIndex += reversed[i - 1].length;
        holes.push(holeIndex);
      }
      ring.forEach(([lon, lat]) => {
        const [x, y, z] = lonLatToVector3(lon, lat, radius + offset);
        vertices.push(x, y, z);
      });
    });
    const verts2d = [];
    reversed.forEach(ring => {
      ring.forEach(([lon, lat]) => {
        const [x, y, z] = lonLatToVector3(lon, lat, radius + offset);
        verts2d.push(x, z); // xz-projection
      });
    });
    const triangles = earcut(verts2d, holes, 2);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(triangles);
    geom.computeVertexNormals();
    return geom;
  }, [coordinates, radius, offset]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} flatShading={true} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Countries({ geojson, radius, offset }) {
  if (!geojson) return null;
  return geojson.features.map((feature, idx) => {
    const { geometry } = feature;
    if (!geometry) return null;
    if (geometry.type === 'Polygon') {
      return (
        <CountryBufferMesh
          key={idx}
          coordinates={geometry.coordinates}
          radius={radius}
          offset={offset}
        />
      );
    }
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.map((poly, i) => (
        <CountryBufferMesh
          key={idx + '-' + i}
          coordinates={poly}
          radius={radius}
          offset={offset}
        />
      ));
    }
    return null;
  });
}

const CRUISE_COLORS = [
  0xff0000, 0x00aaff, 0x00cc44, 0xff9900, 0x9900ff, 0x00ffcc, 0xff00aa, 0xaaaa00, 0x0088ff, 0xff6600
];
const CRUISE_LINE_RADIUS = 0.003;

function lonLatDayToVec3(lon, lat, dayNum, radius = 2, height = 0.12) {
  // dayNum affects route height (slightly raises the curve)
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const r = radius + height + dayNum * 0.002; // not significant day shift
  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return new Vector3(x, y, z);
}

function CruiseTooltip({ tooltip }) {
  if (!tooltip || !tooltip.visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: tooltip.x,
        top: tooltip.y,
        background: 'rgba(30,40,60,0.97)',
        color: '#fff',
        padding: '8px 14px',
        borderRadius: 8,
        pointerEvents: 'none',
        fontSize: 14,
        zIndex: 2000,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)'
      }}
    >
      {tooltip.text}
    </div>
  );
}

const CAMERA_STATE_KEY = 'globe_camera_state';

function saveCameraState(camera, controls) {
  const state = {
    position: camera.position.toArray(),
    target: controls.target.toArray(),
  };
  localStorage.setItem(CAMERA_STATE_KEY, JSON.stringify(state));
}
function loadCameraState() {
  try {
    const val = localStorage.getItem(CAMERA_STATE_KEY);
    if (!val) return null;
    return JSON.parse(val);
  } catch {
    return null;
  }
}

function ShipRoutes({ selectedShipIds, setTooltip, setPopup }) {
  const [routes, setRoutes] = useState([]);
  const [hoveredShipId, setHoveredShipId] = useState(null);
  useEffect(() => {
    if (!selectedShipIds || selectedShipIds.length === 0) {
      setRoutes([]);
      return;
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = thirtyDaysLater.toISOString().split('T')[0];
    let url = `/api/route?date_from=${dateFrom}&date_to=${dateTo}`;
    if (selectedShipIds && selectedShipIds.length > 0) {
      url += `&ship_id=${selectedShipIds.join(',')}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setRoutes(data);
      });
  }, [selectedShipIds]);

  // Группируем маршруты по кораблям
  const routesByShip = {};
  routes.forEach(route => {
    const shipId = route.ship?.id;
    if (!shipId) return;
    if (!routesByShip[shipId]) routesByShip[shipId] = { ship: route.ship, points: [] };
    routesByShip[shipId].points.push(route);
  });

  // Для каждого корабля строим линию по точкам (отсортировано по дате)
  return <>
    {Object.entries(routesByShip).map(([shipId, group], idx) => {
      const color = CRUISE_COLORS[idx % CRUISE_COLORS.length];
      // Сортируем по дате
      const sorted = group.points.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      const today = new Date();
      today.setHours(0,0,0,0);
      const points = sorted.map(route => {
        const stopDate = new Date(route.date);
        stopDate.setHours(0,0,0,0);
        const dayNum = Math.floor((stopDate - today) / (1000 * 60 * 60 * 24));
        // lng/lat могут быть строками, приводим к числу
        const lng = typeof route.point?.lng === 'string' ? parseFloat(route.point.lng) : route.point?.lng;
        const lat = typeof route.point?.lat === 'string' ? parseFloat(route.point.lat) : route.point?.lat;
        return lonLatDayToVec3(lng, lat, dayNum);
      });
      if (points.length < 2) return null;
      const ship = group.ship;
      const isHovered = hoveredShipId === ship.id;
      return (
        <group key={shipId}>
          <mesh
            geometry={new TubeGeometry(new CatmullRomCurve3(points), 100, isHovered ? CRUISE_LINE_RADIUS * 2 : CRUISE_LINE_RADIUS, 16, false)}
            renderOrder={10}
            cursor="pointer"
            onClick={e => {
              e.stopPropagation();
              setPopup({ open: true, ship, stops: sorted });
            }}
            onPointerOver={e => {
              setTooltip && setTooltip({ visible: true, data: { type: 'ship', ship } });
              setHoveredShipId(ship.id);
            }}
            onPointerOut={e => {
              setTooltip && setTooltip({ visible: false });
              setHoveredShipId(null);
            }}
          >
            <meshBasicMaterial color={color} />
          </mesh>
          {sorted.map((route, stopIdx) => {
            const stopDate = new Date(route.date);
            stopDate.setHours(0,0,0,0);
            const lng = typeof route.point?.lng === 'string' ? parseFloat(route.point.lng) : route.point?.lng;
            const lat = typeof route.point?.lat === 'string' ? parseFloat(route.point.lat) : route.point?.lat;
            const dayNum = Math.floor((stopDate - today) / (1000 * 60 * 60 * 24));
            const pos = lonLatDayToVec3(lng, lat, dayNum);
            return (
              <mesh
                key={route.id}
                position={pos}
                renderOrder={11}
                cursor="pointer"
                onPointerOver={e => {
                  setTooltip && setTooltip({ visible: true, data: { type: 'port', route, ship } });
                }}
                onPointerOut={e => {
                  setTooltip && setTooltip({ visible: false });
                }}
              >
                <sphereGeometry args={[0.0125, 16, 16]} />
                <meshBasicMaterial color={color} />
              </mesh>
            );
          })}
        </group>
      );
    })}
  </>;
}

function CameraPersistence({ controlsRef }) {
  const { camera } = useThree();
  // Restore
  useEffect(() => {
    const state = loadCameraState();
    if (state && camera && controlsRef.current) {
      camera.position.fromArray(state.position);
      controlsRef.current.target.fromArray(state.target);
      controlsRef.current.update();
    }
  }, [camera, controlsRef]);
  // Save
  useEffect(() => {
    if (!controlsRef.current || !camera) return;
    const controls = controlsRef.current;
    function handleChange() {
      saveCameraState(camera, controls);
    }
    controls.addEventListener('change', handleChange);
    return () => controls.removeEventListener('change', handleChange);
  }, [camera, controlsRef]);
  return null;
}

function useKeyboardOrbit(controlsRef) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (!controlsRef.current) return;
      const controls = controlsRef.current;
      const camera = controls.object;
      // Rotate around center (target)
      const offset = camera.position.clone().sub(controls.target);
      const radius = offset.length();
      let phi = Math.acos(offset.y / radius); // [0, PI]
      let theta = Math.atan2(offset.x, offset.z); // [-PI, PI]
      const step = 10 * Math.PI / 180; // 10 degrees
      let changed = false;
      if (e.key === 'ArrowLeft') {
        theta -= step;
        changed = true;
      }
      if (e.key === 'ArrowRight') {
        theta += step;
        changed = true;
      }
      if (e.key === 'ArrowUp') {
        phi -= step;
        if (phi < 0.01) phi = 0.01;
        changed = true;
      }
      if (e.key === 'ArrowDown') {
        phi += step;
        if (phi > Math.PI - 0.01) phi = Math.PI - 0.01;
        changed = true;
      }
      if (changed) {
        // New position
        offset.x = radius * Math.sin(phi) * Math.sin(theta);
        offset.y = radius * Math.cos(phi);
        offset.z = radius * Math.sin(phi) * Math.cos(theta);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlsRef]);
}

const CruiseGlobe = ({ selectedShipIds, onCruiseClick }) => {
  const [geojson, setGeojson] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false });
  const [popup, setPopup] = useState({ open: false, ship: null, stops: [] });
  const radius = 2;
  const countryOffset = 0.01;
  const controlsRef = useRef();

  useEffect(() => {
    fetch('countries.geo.json')
      .then(res => res.json())
      .then(setGeojson);
  }, []);

  useKeyboardOrbit(controlsRef);

  // Focus on Canvas to receive keyboard events
  const canvasRef = useRef();
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', background: '#222', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }} style={{ width: '100%', height: '100%' }}
        tabIndex={0}
        ref={canvasRef}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        {/* Earth sphere */}
        <mesh>
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial color="#4a90e2" transparent opacity={0} />
        </mesh>
        {/* Countries */}
        {geojson && <Countries geojson={geojson} radius={radius} offset={countryOffset} />}
        {/* Ship routes and ports */}
        <ShipRoutes selectedShipIds={selectedShipIds} setTooltip={setTooltip} setPopup={setPopup} />
        <OrbitControls enablePan={false} ref={controlsRef} />
        <CameraPersistence controlsRef={controlsRef} />
      </Canvas>
      <CruiseStatusBar tooltip={tooltip} />
      {/* Попап теперь вне Canvas! */}
      <ShipRouteDrawer
        open={popup.open}
        onClose={() => setPopup({ open: false, ship: null, stops: [] })}
        ship={popup.ship}
        stops={popup.stops}
        onLoadMore={newStops => setPopup(popup => ({ ...popup, stops: newStops }))}
      />
    </div>
  );
};

function CruiseStatusBar({ tooltip }) {
  let text = '';
  if (tooltip && tooltip.visible && tooltip.data) {
    if (tooltip.data.type === 'port') {
      const { route, ship } = tooltip.data;
      text = `⚓ ${route.point?.name || ''}${route.point?.country ? ', ' + route.point.country : ''} — ${route.date ? formatDate(route.date) : ''} | 🚢 ${ship?.name || ''}${ship?.company?.name ? ' — ' + ship.company.name : ''}`;
    } else if (tooltip.data.type === 'ship') {
      const { ship } = tooltip.data;
      text = `🚢 ${ship?.name || ''}${ship?.company?.name ? ' — ' + ship.company.name : ''}`;
    }
  }
  if (!text) return null;
  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(30,40,60,0.98)',
      color: '#fff',
      fontWeight: 500,
      fontSize: 16,
      padding: '10px 24px',
      borderTop: '1px solid #333',
      zIndex: 2000,
      textAlign: 'left',
      letterSpacing: 0.2,
      userSelect: 'none',
      pointerEvents: 'none',
      fontFamily: 'inherit',
    }}>{text}</div>
  );
}

export default CruiseGlobe; 