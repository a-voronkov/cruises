import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import earcut from 'earcut';
import { useFrame, useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { TubeGeometry } from 'three';
import { CatmullRomCurve3, MeshBasicMaterial, Mesh, Vector3 } from 'three';

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
    // ВАЖНО: инвертируем порядок обхода для правильной ориентации нормалей
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
        verts2d.push(x, z); // xz-проекция
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
const CRUISE_LINE_RADIUS = 0.001;

function lonLatDayToVec3(lon, lat, dayNum, radius = 2, height = 0.12) {
  // dayNum влияет на высоту маршрута (слегка поднимаем кривую)
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const r = radius + height + dayNum * 0.002; // небольшое смещение по дням
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

function CruiseStatusBar({ tooltip }) {
  // Строка статуса внизу блока
  let text = '';
  if (tooltip && tooltip.visible && tooltip.data) {
    if (tooltip.data.type === 'port') {
      const { stop, cruise } = tooltip.data;
      text = `⚓ ${stop.point_name || ''}${stop.country ? ', ' + stop.country : ''} — ${stop.date ? stop.date : ''} | 🚢 ${cruise.cruise_name || ''}${cruise.ship_name ? ' (' + cruise.ship_name + ')' : ''}`;
    } else if (tooltip.data.type === 'cruise') {
      const { cruise } = tooltip.data;
      text = `🚢 ${cruise.cruise_name || ''}${cruise.ship_name ? ' (' + cruise.ship_name + ')' : ''}${cruise.company_name ? ' — ' + cruise.company_name : ''}`;
    }
  }
  if (!text) text = 'Hover a cruise or port for details';
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

function CruiseRoutes({ selectedShipIds, onCruiseClick, setTooltip }) {
  const [cruises, setCruises] = useState([]);
  useEffect(() => {
    if (!selectedShipIds || selectedShipIds.length === 0) {
      setCruises([]);
      return;
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = thirtyDaysLater.toISOString().split('T')[0];
    let url = `/api/cruises?date_from=${dateFrom}&date_to=${dateTo}`;
    if (selectedShipIds && selectedShipIds.length > 0) {
      url += `&ship_id=${selectedShipIds.join(',')}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Фильтруем круизы: только те, у которых минимальная дата остановки >= today
        const filtered = data.filter(cruise => {
          if (!cruise.stops || cruise.stops.length === 0) return false;
          const minDate = cruise.stops.reduce((min, stop) => {
            const d = new Date(stop.date);
            d.setHours(0,0,0,0);
            return d < min ? d : min;
          }, new Date(cruise.stops[0].date));
          minDate.setHours(0,0,0,0);
          return minDate >= today;
        });
        setCruises(filtered);
      });
  }, [selectedShipIds]);

  // Только onPointerOver/onPointerOut для тултипов
  return cruises.map((cruise, idx) => {
    if (!cruise.stops || cruise.stops.length < 2) return null;
    const color = CRUISE_COLORS[idx % CRUISE_COLORS.length];
    const today = new Date();
    today.setHours(0,0,0,0);
    const points = cruise.stops.map(stop => {
      const stopDate = new Date(stop.date);
      stopDate.setHours(0,0,0,0);
      const dayNum = Math.floor((stopDate - today) / (1000 * 60 * 60 * 24));
      return lonLatDayToVec3(stop.lng, stop.lat, dayNum);
    });
    const curve = new CatmullRomCurve3(points);
    return (
      <group key={cruise.cruise_id}>
        <mesh
          geometry={new TubeGeometry(curve, 100, CRUISE_LINE_RADIUS, 16, false)}
          onClick={e => {
            e.stopPropagation();
            if (onCruiseClick) onCruiseClick(cruise);
          }}
          renderOrder={10}
          cursor="pointer"
          onPointerOver={e => {
            setTooltip && setTooltip({ visible: true, data: { type: 'cruise', cruise } });
          }}
          onPointerOut={e => {
            setTooltip && setTooltip({ visible: false });
          }}
        >
          <meshBasicMaterial color={color} />
        </mesh>
        {cruise.stops.map((stop, stopIdx) => {
          const stopDate = new Date(stop.date);
          stopDate.setHours(0,0,0,0);
          const dayNum = Math.floor((stopDate - today) / (1000 * 60 * 60 * 24));
          const pos = lonLatDayToVec3(stop.lng, stop.lat, dayNum);
          return (
            <mesh
              key={stopIdx}
              position={pos}
              onClick={e => {
                e.stopPropagation();
                if (onCruiseClick) onCruiseClick(cruise);
              }}
              renderOrder={11}
              cursor="pointer"
              onPointerOver={e => {
                setTooltip && setTooltip({ visible: true, data: { type: 'port', cruise, stop } });
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
  });
}

function CameraPersistence({ controlsRef }) {
  const { camera } = useThree();
  // Восстановление
  useEffect(() => {
    const state = loadCameraState();
    if (state && camera && controlsRef.current) {
      camera.position.fromArray(state.position);
      controlsRef.current.target.fromArray(state.target);
      controlsRef.current.update();
    }
  }, [camera, controlsRef]);
  // Сохранение
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
      // Вращаем вокруг центра (target)
      const offset = camera.position.clone().sub(controls.target);
      const radius = offset.length();
      let phi = Math.acos(offset.y / radius); // [0, PI]
      let theta = Math.atan2(offset.x, offset.z); // [-PI, PI]
      const step = 10 * Math.PI / 180; // 10 градусов
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
        // Новая позиция
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
  const radius = 2;
  const countryOffset = 0.01;
  const controlsRef = useRef();

  useEffect(() => {
    fetch('countries.geo.json')
      .then(res => res.json())
      .then(setGeojson);
  }, []);

  useKeyboardOrbit(controlsRef);

  // Фокус на Canvas для приёма клавиш
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
        {/* Сфера земли */}
        <mesh>
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial color="#4a90e2" transparent opacity={0} />
        </mesh>
        {/* Страны */}
        {geojson && <Countries geojson={geojson} radius={radius} offset={countryOffset} />}
        {/* Круизы и порты */}
        <CruiseRoutes selectedShipIds={selectedShipIds} onCruiseClick={onCruiseClick} setTooltip={setTooltip} />
        <OrbitControls enablePan={false} ref={controlsRef} />
        <CameraPersistence controlsRef={controlsRef} />
      </Canvas>
      <CruiseStatusBar tooltip={tooltip} />
    </div>
  );
};

export default CruiseGlobe; 