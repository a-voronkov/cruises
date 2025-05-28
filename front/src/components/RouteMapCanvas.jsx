import React, { useRef, useEffect } from 'react';

// Преобразование координат в equirectangular-проекцию с учётом bbox
function makeProjector(routePoints, width, height) {
  if (!routePoints || routePoints.length < 2) {
    // Вся карта
    return ([lon, lat]) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      return [x, y];
    };
  }
  // bbox маршрута
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  routePoints.forEach(pt => {
    if (typeof pt.lat === 'number' && typeof pt.lng === 'number') {
      minLat = Math.min(minLat, pt.lat);
      maxLat = Math.max(maxLat, pt.lat);
      minLng = Math.min(minLng, pt.lng);
      maxLng = Math.max(maxLng, pt.lng);
    }
  });
  // Добавляем зазор 10%
  const latPad = (maxLat - minLat) * 0.1 || 2;
  const lngPad = (maxLng - minLng) * 0.1 || 2;
  minLat = Math.max(-90, minLat - latPad);
  maxLat = Math.min(90, maxLat + latPad);
  minLng = Math.max(-180, minLng - lngPad);
  maxLng = Math.min(180, maxLng + lngPad);
  return ([lon, lat]) => {
    const x = ((lon - minLng) / (maxLng - minLng)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;
    return [x, y];
  };
}

/**
 * @param {Object} props
 * @param {Array} props.routePoints - [{ lat, lng, name }]
 * @param {Object} [props.geojson] - GeoJSON FeatureCollection
 * @param {number} [props.width] - ширина canvas
 * @param {number} [props.height] - высота canvas
 */
function RouteMapCanvas({ routePoints = [], geojson, width = 300, height = 300 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Фон
    ctx.fillStyle = '#eaf6fb';
    ctx.fillRect(0, 0, width, height);

    const project = makeProjector(routePoints, width, height);

    // Рисуем страны
    if (geojson && geojson.features) {
      ctx.save();
      ctx.strokeStyle = '#b0b8c2';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
      geojson.features.forEach(feature => {
        const { geometry } = feature;
        if (!geometry) return;
        if (geometry.type === 'Polygon') {
          geometry.coordinates.forEach(ring => {
            ctx.beginPath();
            ring.forEach(([lon, lat], i) => {
              const [x, y] = project([lon, lat]);
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fillStyle = '#f5f5f7';
            ctx.fill();
            ctx.stroke();
          });
        } else if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => {
              ctx.beginPath();
              ring.forEach(([lon, lat], i) => {
                const [x, y] = project([lon, lat]);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
              });
              ctx.closePath();
              ctx.fillStyle = '#f5f5f7';
              ctx.fill();
              ctx.stroke();
            });
          });
        }
      });
      ctx.restore();
    }

    // Рисуем маршрут
    if (routePoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      routePoints.forEach((pt, i) => {
        const [x, y] = project([pt.lng, pt.lat]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();

      // Рисуем стрелочки направления на каждом сегменте
      ctx.save();
      ctx.strokeStyle = '#1976d2';
      ctx.fillStyle = '#1976d2';
      ctx.globalAlpha = 0.85;
      for (let i = 1; i < routePoints.length; i++) {
        const [x1, y1] = project([routePoints[i-1].lng, routePoints[i-1].lat]);
        const [x2, y2] = project([routePoints[i].lng, routePoints[i].lat]);
        // Центр сегмента
        const cx = x1 + (x2 - x1) * 0.5;
        const cy = y1 + (y2 - y1) * 0.5;
        // Вектор направления
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len < 18) continue; // слишком короткий сегмент
        // Нормализованный вектор
        const nx = dx / len;
        const ny = dy / len;
        // Засечка-стрелка (короткая)
        const arrowLen = 16, arrowW = 6;
        // Точка конца стрелки
        const ax = cx + nx * arrowLen * 0.5;
        const ay = cy + ny * arrowLen * 0.5;
        // Две боковые точки
        const perpX = -ny, perpY = nx;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - nx * arrowLen + perpX * arrowW, ay - ny * arrowLen + perpY * arrowW);
        ctx.lineTo(ax - nx * arrowLen - perpX * arrowW, ay - ny * arrowLen - perpY * arrowW);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Рисуем точки и подписи
    ctx.save();
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const labelBoxes = [];
    const seenPoints = new Set();
    let firstDrawnKey = null;
    routePoints.forEach((pt, i) => {
      const [x, y] = project([pt.lng, pt.lat]);
      // Точка
      const key = `${pt.lat},${pt.lng}`;
      let radius = 5;
      if (!firstDrawnKey) {
        firstDrawnKey = key;
        radius = 6.5;
      }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1976d2';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Подпись только для первой уникальной точки
      if (seenPoints.has(key)) return;
      seenPoints.add(key);
      let label = pt.name || `Stop ${i+1}`;
      let lx = x + 8, ly = y - 2;
      const metrics = ctx.measureText(label);
      const lw = metrics.width, lh = 16;
      // Проверяем пересечения с уже размещёнными подписями
      let tryCount = 0;
      let found = false;
      while (tryCount < 8 && !found) {
        found = true;
        for (const box of labelBoxes) {
          if (
            lx < box.x + box.w && lx + lw > box.x &&
            ly < box.y + box.h && ly + lh > box.y
          ) {
            found = false;
            break;
          }
        }
        // Проверяем выход за границы canvas
        if (lx < 0) { lx = 0; found = false; }
        if (lx + lw > width) { lx = width - lw; found = false; }
        if (ly < 0) { ly = y + 10; found = false; }
        if (ly + lh > height) { ly = y - lh - 2; found = false; }
        if (!found) {
          // Смещаем подпись по очереди: вниз, вверх, вправо, влево
          if (tryCount === 0) ly = y + 10;
          else if (tryCount === 1) ly = y - lh - 2;
          else if (tryCount === 2) lx = x - lw - 8;
          else if (tryCount === 3) { lx = x + 8; ly = y + 18; }
          else if (tryCount === 4) { lx = x - lw - 8; ly = y + 18; }
          else if (tryCount === 5) { lx = x + 8; ly = y - 18; }
          else if (tryCount === 6) { lx = x - lw - 8; ly = y - 18; }
        }
        tryCount++;
      }
      labelBoxes.push({ x: lx, y: ly, w: lw, h: lh });
      ctx.fillStyle = '#222';
      ctx.fillText(label, lx, ly);
    });
    ctx.restore();
  }, [geojson, routePoints, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height, borderRadius: 12, boxShadow: '0 2px 12px #0001', background: '#e3eaf2', display: 'block' }}
    />
  );
}

export default RouteMapCanvas; 