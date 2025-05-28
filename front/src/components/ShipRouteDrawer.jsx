import React, { useState, useEffect, useRef } from 'react';
import { formatDate } from '../utils/format';
import RouteMapCanvas from './RouteMapCanvas';

const CRUISE_COLORS = [
  0xff0000, 0x00aaff, 0x00cc44, 0xff9900, 0x9900ff, 0x00ffcc, 0xff00aa, 0xaaaa00, 0x0088ff, 0xff6600
];

function CruiseLineTooltip({ cruise, ship, days, left, top, geojson, routePoints }) {
  if (!cruise) return null;
  const company = ship?.company;
  const travelDiffers = cruise.travelDateFrom !== cruise.cruiseDateFrom || cruise.travelDateTo !== cruise.cruiseDateTo;
  const fromDate = new Date(cruise.cruiseDateFrom);
  const toDate = new Date(cruise.cruiseDateTo);
  const daysCount = Math.round((toDate - fromDate) / (1000*60*60*24)) + 1;
  const nightsCount = daysCount - 1;
  // Считаем дни в море для этого круиза
  let atSeaCount = 0;
  if (days && days.length > 0) {
    const cruiseDays = days.filter(d => d.date >= cruise.cruiseDateFrom && d.date <= cruise.cruiseDateTo);
    atSeaCount = cruiseDays.filter(d => d.atSea).length;
  }
  // Смещаем тултип еще левее и не даем выйти за пределы контейнера
  const tooltipLeft = Math.max(left - 470, -470);
  // Позиционируем тултип относительно контейнера (position: absolute)
  return (
    <div style={{
      position: 'absolute',
      left: tooltipLeft,
      top: Math.max(top, 0),
      minWidth: 400,
      maxWidth: 400,
      background: 'rgba(30,40,60,0.98)',
      color: '#fff',
      borderRadius: 10,
      boxShadow: '0 4px 24px #0006',
      padding: '18px 22px 18px 18px',
      zIndex: 4000,
      fontSize: 15,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      pointerEvents: 'auto',
    }}>
      <div style={{ color: '#90caf9', fontWeight: 600, fontSize: 17 }}>{cruise.description || cruise.name || 'Cruise'}</div>
      {travelDiffers && (
        <div style={{ color: '#ffa726', fontSize: 14 }}>
          Travel: {formatDate(cruise.travelDateFrom)} — {formatDate(cruise.travelDateTo)}
        </div>
      )}
      <div style={{ color: '#fff', fontSize: 14 }}>
        Cruise: {formatDate(cruise.cruiseDateFrom)} — {formatDate(cruise.cruiseDateTo)}
      </div>
      <div style={{ color: '#fff', fontSize: 14 }}>
        Ship: <b>{ship?.name}</b>
      </div>
      <div style={{ color: '#fff', fontSize: 14 }}>
        {daysCount} days, {nightsCount} nights | Days at sea: {atSeaCount}
      </div>
      {/* Мини-карта маршрута */}
      {geojson && routePoints && routePoints.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <RouteMapCanvas
            geojson={geojson}
            width={400}
            height={280}
            routePoints={routePoints}
          />
        </div>
      )}
    </div>
  );
}

function ShipRouteDrawer({ open, onClose, ship, stops, onLoadMore }) {
  if (!open || !ship) return null;
  const [cruises, setCruises] = useState([]);
  const [hoveredCruise, setHoveredCruise] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [geojson, setGeojson] = useState(null);
  const linesContainerRef = useRef(null);

  // Загружаем geojson стран один раз
  useEffect(() => {
    fetch('/countries.geo.json')
      .then(res => res.json())
      .then(setGeojson);
  }, []);

  useEffect(() => {
    if (!open || !ship || !stops || stops.length === 0) return;
    const sorted = stops.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const dateFrom = sorted[0].date;
    const dateTo = sorted[sorted.length - 1].date;
    fetch(`/api/cruise?ship_id=${ship.id}&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(res => res.json())
      .then(data => setCruises(data));
  }, [open, ship, stops]);
  // Формируем список дней с учётом пропущенных (at sea)
  const days = [];
  if (stops.length > 0) {
    const sorted = stops.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    let prevDate = new Date(sorted[0].date);
    prevDate.setHours(0,0,0,0);
    days.push({
      date: sorted[0].date,
      port: sorted[0].point?.name,
      country: sorted[0].point?.country,
      atSea: false,
      id: sorted[0].id
    });
    for (let i = 1; i < sorted.length; i++) {
      const currDate = new Date(sorted[i].date);
      currDate.setHours(0,0,0,0);
      let diff = Math.round((currDate - prevDate) / (1000*60*60*24));
      for (let j = 1; j < diff; j++) {
        const atSeaDate = new Date(prevDate);
        atSeaDate.setDate(prevDate.getDate() + j + 1);
        days.push({
          date: atSeaDate.toISOString().split('T')[0],
          port: '🌊 At sea',
          country: '',
          atSea: true,
          id: `atsea-${atSeaDate.toISOString().split('T')[0]}`
        });
      }
      days.push({
        date: sorted[i].date,
        port: sorted[i].point?.name,
        country: sorted[i].point?.country,
        atSea: false,
        id: sorted[i].id
      });
      prevDate = currDate;
    }
  }
  // Определяем ширину панели
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
  const width = isMobile ? '100vw' : '60vw';
  // Обработка Esc для закрытия панели
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  return (
    <>
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.32)',
        zIndex: 2999,
        transition: 'opacity 0.5s cubic-bezier(.4,1.3,.5,1)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
      }} onClick={onClose} />
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        width,
        background: '#23272f',
        color: '#fff',
        borderRadius: isMobile ? 0 : '16px 0 0 16px',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.25)',
        zIndex: 3000,
        padding: isMobile ? 16 : 32,
        overflowY: 'auto',
        transition: 'transform 0.5s cubic-bezier(.4,1.3,.5,1)',
        transform: open ? 'translateX(0)' : `translateX(${width})`,
        maxWidth: '100vw',
        paddingTop: 0,
      }} onClick={e => e.stopPropagation()}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            width: '100%',
            background: '#23272f',
            zIndex: 20,
            paddingBottom: 8,
            paddingLeft: 0,
            paddingRight: isMobile ? 16 : 32,
            paddingTop: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, marginBottom: 10, fontWeight: 600, fontSize: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
                {ship.company?.logoUrl && (
                  <img src={ship.company.logoUrl} alt={ship.company.name} style={{ height: 32, borderRadius: 4, background: '#fff', boxShadow: '0 1px 4px #0002' }} />
                )}
                {ship.name}
              </h2>
              {ship.company?.name && (
                <div style={{ marginBottom: 10, color: '#90caf9', fontSize: 16 }}>
                  Company: {ship.company.name}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', zIndex: 30, marginLeft: 16, marginTop: 2, height: 40, width: 40, minWidth: 40, minHeight: 40 }}>&times;</button>
          </div>
        </div>
        {/* Таблица и линии — скроллятся под шапкой */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
          <table style={{
            width: '100%',
            fontSize: 15,
            borderCollapse: 'collapse',
            flex: 1,
            marginTop: 0
          }}>
            <thead>
              <tr style={{ color: '#90caf9', fontWeight: 600, position: 'sticky', top: 0, background: '#23272f', zIndex: 10 }}>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Port</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Country</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Arrival</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Departure</th>
              </tr>
            </thead>
            <tbody>
              {days.map((row, idx) => (
                <tr key={row.id}
                  style={{ background: idx % 2 === 0 ? '#262b34' : '#23272f' }}
                >
                  <td style={{ padding: '4px 8px', color: '#fff' }}>{formatDate(row.date)}</td>
                  <td style={{ padding: '4px 8px', color: row.atSea ? '#90caf9' : '#fff', fontStyle: row.atSea ? 'italic' : 'normal' }}>{row.port}</td>
                  <td style={{ padding: '4px 8px', color: '#fff' }}>{row.country}</td>
                  <td style={{ padding: '4px 8px', color: '#fff' }}>—</td>
                  <td style={{ padding: '4px 8px', color: '#fff' }}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Cruise coverage lines */}
          {cruises.length > 0 && (
            <div ref={linesContainerRef} style={{ position: 'relative', width: 32, marginLeft: 8, height: days.length * 30.5 }}>
              {cruises.map((cruise, i) => {
                // Индексы для travelDateFrom/travelDateTo
                const travelFrom = days.findIndex(d => d.date >= cruise.travelDateFrom);
                const travelTo = (() => {
                  let last = -1;
                  for (let j = 0; j < days.length; j++) {
                    if (days[j].date >= cruise.travelDateFrom && days[j].date <= cruise.travelDateTo) last = j;
                  }
                  return last;
                })();
                if (travelFrom === -1 || travelTo === -1) return null;
                const color = CRUISE_COLORS[i % CRUISE_COLORS.length];
                // Индексы для cruiseDateFrom/cruiseDateTo
                const cruiseFrom = days.findIndex(d => d.date >= cruise.cruiseDateFrom && d.date <= cruise.cruiseDateTo);
                const cruiseTo = (() => {
                  let last = -1;
                  for (let j = 0; j < days.length; j++) {
                    if (days[j].date >= cruise.cruiseDateFrom && days[j].date <= cruise.cruiseDateTo) last = j;
                  }
                  return last;
                })();
                // Проверяем, нужно ли рисовать многоточие сверху
                const showTopDots = cruise.travelDateFrom < days[0].date;
                // Проверяем, нужно ли рисовать многоточие снизу
                const showBottomDots = cruise.travelDateTo > days[days.length-1].date;
                // Лесенка: позиции по X для линий круизов
                const stepPattern = [0, 8, 16, 8];
                const offsetX = stepPattern[i % 4];
                // top линии (верх)
                const lineTop = travelFrom * 30.5 + 30.5;
                const lineBottom = (travelTo + 1) * 30.5 + 30.5 - 8;
                return (
                  <React.Fragment key={cruise.id}>
                    {/* Travel (весь диапазон, 50% прозрачности) */}
                    <div
                      style={{
                        position: 'absolute',
                        left: offsetX,
                        width: 6,
                        top: lineTop,
                        height: (travelTo - travelFrom + 1) * 30.5 - 8,
                        background: `#${color.toString(16).padStart(6, '0')}`,
                        borderRadius: 3,
                        opacity: 0.5,
                        zIndex: 1,
                        cursor: 'pointer',
                      }}
                      onClick={e => {
                        if (linesContainerRef.current) {
                          const lineRect = e.target.getBoundingClientRect();
                          const containerRect = linesContainerRef.current.getBoundingClientRect();
                          setTooltipPos({
                            left: lineRect.left - containerRect.left + 18,
                            top: lineRect.top - containerRect.top - 18
                          });
                        }
                        setHoveredCruise(prev =>
                          prev && prev.cruise.id === cruise.id ? null : { cruise, ship }
                        );
                      }}
                    />
                    {/* Cruise (поверх, 85% opacity) */}
                    {cruiseFrom !== -1 && cruiseTo !== -1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: offsetX,
                          width: 6,
                          top: cruiseFrom * 30.5 + 30.5,
                          height: (cruiseTo - cruiseFrom + 1) * 30.5 - 8,
                          background: `#${color.toString(16).padStart(6, '0')}`,
                          borderRadius: 3,
                          opacity: 0.85,
                          zIndex: 2,
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          if (linesContainerRef.current) {
                            const lineRect = e.target.getBoundingClientRect();
                            const containerRect = linesContainerRef.current.getBoundingClientRect();
                            setTooltipPos({
                              left: lineRect.left - containerRect.left + 18,
                              top: lineRect.top - containerRect.top + 18
                            });
                          }
                          setHoveredCruise(prev =>
                            prev && prev.cruise.id === cruise.id ? null : { cruise, ship }
                          );
                        }}
                      />
                    )}
                    {/* Многоточие сверху */}
                    {showTopDots && (
                      <div style={{ position: 'absolute', left: offsetX - 1.5, top: lineTop - 28, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: `#${color.toString(16).padStart(6, '0')}`, opacity: 0.7, margin: 1 }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: `#${color.toString(16).padStart(6, '0')}`, opacity: 0.7, margin: 1 }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: `#${color.toString(16).padStart(6, '0')}`, opacity: 0.7, margin: 1 }} />
                      </div>
                    )}
                    {/* Многоточие снизу */}
                    {showBottomDots && (
                      <div style={{ position: 'absolute', left: offsetX - 1.5, top: lineBottom + 2, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: `#${color.toString(16).padStart(6, '0')}`, opacity: 0.7, margin: 1 }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: `#${color.toString(16).padStart(6, '0')}`, opacity: 0.7, margin: 1 }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: `#${color.toString(16).padStart(6, '0')}`, opacity: 0.7, margin: 1 }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              {/* Tooltip для круиза — теперь внутри контейнера с линиями */}
              {hoveredCruise && (
                <CruiseLineTooltip
                  cruise={hoveredCruise.cruise}
                  ship={hoveredCruise.ship}
                  days={days}
                  left={tooltipPos.left}
                  top={tooltipPos.top}
                  geojson={geojson}
                  routePoints={(() => {
                    const { cruise } = hoveredCruise;
                    if (!cruise) return [];
                    return stops
                      .filter(s => s.date >= cruise.cruiseDateFrom && s.date <= cruise.cruiseDateTo)
                      .map(s => ({
                        lat: typeof s.point?.lat === 'string' ? parseFloat(s.point.lat) : s.point?.lat,
                        lng: typeof s.point?.lng === 'string' ? parseFloat(s.point.lng) : s.point?.lng,
                        name: s.point?.name || ''
                      }));
                  })()}
                />
              )}
            </div>
          )}
        </div>
        {/* Отступ под таблицей */}
        <div style={{ height: 20 }} />
        {/* Кнопка Load more */}
        {ship && stops.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <button
              onClick={async () => {
                if (loadingMore) return;
                setLoadingMore(true);
                // Определяем следующий период
                const sorted = stops.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
                const lastDate = new Date(sorted[sorted.length - 1].date);
                lastDate.setDate(lastDate.getDate() + 1);
                const nextFrom = lastDate.toISOString().split('T')[0];
                const nextToDate = new Date(lastDate);
                nextToDate.setMonth(nextToDate.getMonth() + 1);
                const nextTo = nextToDate.toISOString().split('T')[0];
                // Параллельно запрашиваем новые маршруты и круизы
                const [routesRes, cruisesRes] = await Promise.all([
                  fetch(`/api/route?ship_id=${ship.id}&date_from=${nextFrom}&date_to=${nextTo}`),
                  fetch(`/api/cruise?ship_id=${ship.id}&date_from=${nextFrom}&date_to=${nextTo}`)
                ]);
                const newRoutes = await routesRes.json();
                const newCruises = await cruisesRes.json();
                // Объединяем stops с новыми точками (без дубликатов по id)
                let allStops = stops;
                if (newRoutes && newRoutes.length > 0) {
                  allStops = [...stops, ...newRoutes.filter(r => !stops.some(s => s.id === r.id))];
                  onLoadMore && onLoadMore(allStops);
                }
                // Объединяем cruises с новыми (без дубликатов по id)
                if (newCruises && newCruises.length > 0) {
                  setCruises(prev => {
                    const ids = new Set(prev.map(c => c.id));
                    return [...prev, ...newCruises.filter(c => !ids.has(c.id))];
                  });
                }
                setLoadingMore(false);
              }}
              style={{
                background: '#90caf9',
                color: '#222',
                border: 'none',
                borderRadius: 6,
                padding: '10px 28px',
                fontSize: 16,
                fontWeight: 600,
                cursor: loadingMore ? 'wait' : 'pointer',
                opacity: loadingMore ? 0.6 : 1,
                boxShadow: '0 2px 8px #0002',
                transition: 'opacity 0.2s',
              }}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default ShipRouteDrawer; 