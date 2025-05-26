import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Earcut from 'earcut';

// Scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 200);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff);
document.body.appendChild(renderer.domElement);

// Constants
const EARTH_RADIUS_KM = 6371;
const DEGREE_TO_RADIANS = Math.PI / 180;
const EARTH_RADIUS = 100;
const COUNTRY_SURFACE_RADIUS = EARTH_RADIUS;
const COUNTRY_FILL_COLOR = 0xf5f5f5;
const BORDER_COLOR = 0xcccccc;
const HOVER_FILL_COLOR = 0xcccccc;
const HOVER_BORDER_COLOR = 0x333333;

// Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 50, 100).normalize();
scene.add(directionalLight);

// Arrays to store meshes for interaction
const countryMeshes = [];
const cruisePortSpheres = [];
const cruiseLines = [];

// Constants for visualization
const KM_TO_UNITS = EARTH_RADIUS / EARTH_RADIUS_KM;
const CRUISE_DAY_HEIGHT_KM = 50;
const CRUISE_PORT_RADIUS = 0.5;
const CRUISE_LINE_RADIUS = 0.1;

// Палитра цветов для маршрутов
const CRUISE_COLORS = [
  0xff0000, 0x00aaff, 0x00cc44, 0xff9900, 0x9900ff, 0x00ffcc, 0xff00aa, 0xaaaa00, 0x0088ff, 0xff6600
];

// Функция для конвертации географических координат в 3D
function lonLatToVector3(lon, lat, radius = EARTH_RADIUS, height = 0) {
  const phi = (90 - lat) * DEGREE_TO_RADIANS;
  const theta = (lon + 180) * DEGREE_TO_RADIANS;
  const r = radius + height;

  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// Новая функция: высота по смещению от сегодняшней даты
function lonLatDayToVec3(lon, lat, dayNum, offset = 0.5) {
  const height = dayNum * CRUISE_DAY_HEIGHT_KM * KM_TO_UNITS + offset;
  return lonLatToVector3(lon, lat, COUNTRY_SURFACE_RADIUS, height);
}

// Функция для очистки сцены от круизов
function clearCruises() {
  cruisePortSpheres.forEach(sphere => scene.remove(sphere));
  cruiseLines.forEach(line => scene.remove(line));
  cruisePortSpheres.length = 0;
  cruiseLines.length = 0;
}

let selectedShipIds = [];

async function loadShips() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);
  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = thirtyDaysLater.toISOString().split('T')[0];
  const res = await fetch(`/api/ships?date_from=${dateFrom}&date_to=${dateTo}`);
  if (!res.ok) return [];
  return await res.json();
}

function updateShipFilter(ships) {
  const select = document.getElementById('ship-filter');
  select.innerHTML = '';
  ships
    .slice()
    .sort((a, b) => a.ship_name.localeCompare(b.ship_name, undefined, { sensitivity: 'base' }))
    .forEach(ship => {
      const option = document.createElement('option');
      option.value = ship.ship_id;
      option.textContent = `${ship.ship_name}${ship.company_name ? ' (' + ship.company_name + ')' : ''}`;
      select.appendChild(option);
    });
  // Восстанавливаем выбранные значения
  for (const opt of select.options) {
    opt.selected = selectedShipIds.includes(opt.value);
  }
}

const SHIP_FILTER_KEY = 'selected_ship_ids';

function saveShipFilter(ids) {
  localStorage.setItem(SHIP_FILTER_KEY, JSON.stringify(ids));
}

function loadShipFilter() {
  try {
    const val = localStorage.getItem(SHIP_FILTER_KEY);
    if (!val) return [];
    return JSON.parse(val);
  } catch {
    return [];
  }
}

async function initShipFilter() {
  const ships = await loadShips();
  updateShipFilter(ships);
  const select = document.getElementById('ship-filter');
  // Восстанавливаем фильтр из localStorage
  let stored = loadShipFilter();
  // Сортируем ships по алфавиту (как в updateShipFilter)
  const sortedShips = ships.slice().sort((a, b) => a.ship_name.localeCompare(b.ship_name, undefined, { sensitivity: 'base' }));
  if (!stored || stored.length === 0) {
    // Если фильтр пуст, выбираем первый корабль
    if (sortedShips.length > 0) {
      stored = [String(sortedShips[0].ship_id)];
    }
  }
  selectedShipIds = stored;
  // Устанавливаем выбранные значения
  for (const opt of select.options) {
    opt.selected = selectedShipIds.includes(opt.value);
  }
  select.addEventListener('change', () => {
    selectedShipIds = Array.from(select.selectedOptions).map(opt => opt.value);
    saveShipFilter(selectedShipIds);
    renderCruises();
  });
  // Если есть выбранные корабли, сразу загружаем круизы
  if (selectedShipIds.length > 0) {
    renderCruises();
  }
}

// Функция для отрисовки круизов
async function renderCruises() {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = thirtyDaysLater.toISOString().split('T')[0];
    let url = `/api/cruises?date_from=${dateFrom}&date_to=${dateTo}`;
    if (selectedShipIds.length > 0) {
      url += `&ship_id=${selectedShipIds.join(',')}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch cruises');
    let cruises = await response.json();
    // Фильтруем круизы: показываем только те, у которых минимальная дата остановки >= dateFrom
    cruises = cruises.filter(cruise => {
      if (!cruise.stops || cruise.stops.length === 0) return false;
      const minDate = cruise.stops.reduce((min, stop) => {
        const d = new Date(stop.date);
        d.setHours(0,0,0,0);
        return d < min ? d : min;
      }, new Date(cruise.stops[0].date));
      minDate.setHours(0,0,0,0);
      return minDate >= today;
    });
    clearCruises();

    // Отрисовываем новые круизы
    cruises.forEach((cruise, idx) => {
      if (!cruise.stops || cruise.stops.length < 2) return;
      
      const color = CRUISE_COLORS[idx % CRUISE_COLORS.length];
      
      // Текущая дата (без времени)
      const today = new Date();
      today.setHours(0,0,0,0);
      
      // Создаем точки маршрута
      const points = cruise.stops.map(stop => {
        const stopDate = new Date(stop.date);
        stopDate.setHours(0,0,0,0);
        const dayNum = Math.floor((stopDate - today) / (1000 * 60 * 60 * 24));
        return lonLatDayToVec3(stop.lng, stop.lat, dayNum, 0.5);
      });

      // Создаем кривую маршрута
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
      tubeMesh.renderOrder = 10;
      tubeMesh.cursor = 'pointer';
      tubeMesh.onClick = () => showCruisePopup(cruise.cruise_id);
      cruiseLines.push(tubeMesh);
      scene.add(tubeMesh);

      // Создаем точки остановок
      cruise.stops.forEach(stop => {
        const stopDate = new Date(stop.date);
        stopDate.setHours(0,0,0,0);
        const dayNum = Math.floor((stopDate - today) / (1000 * 60 * 60 * 24));
        const pos = lonLatDayToVec3(stop.lng, stop.lat, dayNum, 0.5);
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
        sphere.cursor = 'pointer';
        sphere.onClick = () => showCruisePopup(cruise.cruise_id);
        cruisePortSpheres.push(sphere);
        scene.add(sphere);
      });
    });

    // Обновляем счетчик круизов
    document.getElementById('cruise-count').textContent = `${cruises.length} cruises found`;
  } catch (error) {
    console.error('Error loading cruises:', error);
    document.getElementById('cruise-count').textContent = '0 cruises found';
  }
}

// Загрузка карты стран
async function loadCountries() {
  try {
    const response = await fetch('countries.geo.json');
    if (!response.ok) throw new Error('Failed to fetch countries');
    const geo = await response.json();

    geo.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      const type = feature.geometry.type;
      const countryName = feature.properties.name;

      const polygons = (type === 'Polygon') ? [coords] : coords;
      
      polygons.forEach(poly => {
        const outerRing = poly[0];
        const holes = poly.slice(1);

        // Create 2D shape for triangulation
        const shape2D = new THREE.Shape();
        outerRing.forEach(([x, y], i) => {
          if (i === 0) shape2D.moveTo(x, y);
          else shape2D.lineTo(x, y);
        });

        holes.forEach(hole => {
          const holePath = new THREE.Path();
          hole.forEach(([x, y], i) => {
            if (i === 0) holePath.moveTo(x, y);
            else holePath.lineTo(x, y);
          });
          shape2D.holes.push(holePath);
        });

        // Create country geometry
        const vertices2D = [];
        const holeIndices = [];
        let currentIndex = 0;

        outerRing.forEach(([x, y]) => {
          vertices2D.push(x, y);
        });
        currentIndex += outerRing.length;

        holes.forEach(hole => {
          holeIndices.push(currentIndex);
          hole.forEach(([x, y]) => {
            vertices2D.push(x, y);
          });
          currentIndex += hole.length;
        });

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
        
        scene.add(mesh);
        countryMeshes.push(mesh);

        // Create border lines
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
            scene.add(borderLine);
          }
        });
      });
    });
  } catch (error) {
    console.error('Error loading countries:', error);
  }
}

// Инициализация контролов
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.minDistance = EARTH_RADIUS + 10;
controls.maxDistance = EARTH_RADIUS * 5;
controls.target.set(0, 0, 0);

// Восстановление состояния камеры
const CAMERA_STATE_KEY = 'globe_camera_state';
function restoreCameraState() {
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
    // ignore
  }
}

// Сохранение состояния камеры
function saveCameraState() {
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

controls.addEventListener('change', saveCameraState);
restoreCameraState();

// Raycaster для взаимодействия
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredObject = null;

// Создание тултипа
const tooltip = document.getElementById('tooltip') || (() => {
  const div = document.createElement('div');
  div.id = 'tooltip';
  div.style.position = 'absolute';
  div.style.background = 'rgba(0, 0, 0, 0.8)';
  div.style.color = 'white';
  div.style.padding = '8px 12px';
  div.style.borderRadius = '4px';
  div.style.fontSize = '14px';
  div.style.pointerEvents = 'none';
  div.style.display = 'none';
  div.style.zIndex = '1000';
  document.body.appendChild(div);
  return div;
})();

// Функция подсветки объекта
function highlightObject(object, highlight = true) {
  if (!object || !object.material) return;
  
  if (highlight) {
    object.material.color.set(HOVER_FILL_COLOR);
  } else {
    object.material.color.set(COUNTRY_FILL_COLOR);
  }
}

// Обработчик движения мыши
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Проверяем пересечения со всеми объектами
  const intersects = raycaster.intersectObjects([...countryMeshes, ...cruisePortSpheres, ...cruiseLines]);
  
  if (intersects.length > 0) {
    const object = intersects[0].object;
    lastIntersected = intersects[0];
    
    if (hoveredObject !== object) {
      if (hoveredObject) {
        highlightObject(hoveredObject, false);
      }
      hoveredObject = object;
      highlightObject(hoveredObject, true);

      // Формируем текст тултипа в зависимости от типа объекта
      let tooltipText = '';
      if (object.userData.type === 'country') {
        tooltipText = object.userData.name;
      } else if (object.userData.type === 'port') {
        const date = new Date(object.userData.date).toLocaleDateString();
        tooltipText = `⚓ ${object.userData.portName}, ${object.userData.country}\n🚢 ${object.userData.cruiseName}\n📅 ${date}`;
      } else if (object.userData.type === 'cruise') {
        tooltipText = `🚢 ${object.userData.cruiseName}\n⚓ ${object.userData.shipName}\n🏢 ${object.userData.companyName}`;
      }

      tooltip.textContent = tooltipText;
      tooltip.style.display = 'block';
    }
  } else {
    if (hoveredObject) {
      highlightObject(hoveredObject, false);
      hoveredObject = null;
    }
    tooltip.style.display = 'none';
  }
}

window.addEventListener('mousemove', onMouseMove);

// Базовая скорость вращения
const BASE_ROTATE_SPEED = 1.0;
const BASE_DISTANCE = controls.maxDistance;

function updateRotateSpeed() {
  const dist = camera.position.distanceTo(controls.target);
  controls.rotateSpeed = BASE_ROTATE_SPEED * (dist / BASE_DISTANCE);
  controls.rotateSpeed = Math.max(controls.rotateSpeed, 0.1);
}

// Анимация
function animate() {
  requestAnimationFrame(animate);
  updateRotateSpeed();
  controls.update();
  renderer.render(scene, camera);
}

// Обработчик изменения размера окна
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Запуск приложения
window.addEventListener('DOMContentLoaded', () => {
  initShipFilter();
  loadCountries();
  animate();
});

// Создание и управление попапом
function showCruisePopup(cruiseId) {
  fetch(`/api/cruise/${cruiseId}`)
    .then(res => res.json())
    .then(cruise => {
      const popup = document.createElement('div');
      popup.id = 'cruise-popup';
      popup.style.position = 'fixed';
      popup.style.top = '5%';
      popup.style.left = '5%';
      popup.style.width = '90%';
      popup.style.height = '90%';
      popup.style.background = 'white';
      popup.style.zIndex = 2000;
      popup.style.overflow = 'auto';
      popup.style.borderRadius = '12px';
      popup.style.boxShadow = '0 4px 32px rgba(0,0,0,0.25)';
      popup.style.padding = '32px 24px 24px 24px';
      popup.innerHTML = `
        <button id="close-cruise-popup" style="position:absolute;top:16px;right:24px;font-size:2em;background:none;border:none;cursor:pointer;">&times;</button>
        <h2 style="margin-top:0;">${cruise.cruise_name || ''}</h2>
        <div style="margin-bottom:12px;">
          <b>Компания:</b> ${cruise.company_name || ''} <img src="${cruise.logo_url || ''}" style="height:1.5em;vertical-align:middle;">
        </div>
        <div style="margin-bottom:12px;"><b>Корабль:</b> ${cruise.ship_name || ''}</div>
        <div><b>Маршрут:</b></div>
        <ol id="cruise-stops-list"></ol>
      `;
      document.body.appendChild(popup);
      const closePopup = () => {
        popup.remove();
        window.removeEventListener('keydown', escListener);
      };
      document.getElementById('close-cruise-popup').onclick = closePopup;
      // Закрытие по Esc
      function escListener(e) {
        if (e.key === 'Escape') closePopup();
      }
      window.addEventListener('keydown', escListener);
      // Заполняем список остановок с учетом дней в море
      const stopsList = document.getElementById('cruise-stops-list');
      let prevDate = null;
      cruise.stops.forEach((stop, i) => {
        const date = new Date(stop.date);
        const dateStr = date.toLocaleDateString();
        if (prevDate) {
          const prev = new Date(prevDate);
          const diff = Math.round((date - prev) / (1000*60*60*24));
          if (diff > 1) {
            const li = document.createElement('li');
            li.style.color = '#888';
            li.textContent = `Дней в море: ${diff-1}`;
            stopsList.appendChild(li);
          }
        }
        const li = document.createElement('li');
        li.innerHTML = `<b>${dateStr}</b>: ${stop.point_name || '(в море)'} (${stop.country || ''})`;
        stopsList.appendChild(li);
        prevDate = stop.date;
      });
    });
}

let lastIntersected = null;
window.addEventListener('mousedown', (event) => {
  if (!lastIntersected) return;
  if (lastIntersected.object.onClick) {
    lastIntersected.object.onClick();
  }
});
