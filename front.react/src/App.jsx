import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import CruiseGlobe from './components/CruiseGlobe'
import ShipFilter from './components/ShipFilter'
import CruisePopup from './components/CruisePopup'
import CircularProgress from '@mui/material/CircularProgress';

const SHIP_FILTER_KEY = 'selected_ship_ids';

async function fetchCompanies() {
  const res = await fetch('/api/companies');
  if (!res.ok) return [];
  return await res.json();
}

async function fetchShips() {
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

function saveShipFilterState({ selectedShipIds, selectedCompanyIds }) {
  localStorage.setItem(SHIP_FILTER_KEY, JSON.stringify({ selectedShipIds, selectedCompanyIds }));
}
function loadShipFilterState() {
  try {
    const val = localStorage.getItem(SHIP_FILTER_KEY);
    if (!val) return { selectedShipIds: [], selectedCompanyIds: [] };
    const parsed = JSON.parse(val);
    return {
      selectedShipIds: parsed.selectedShipIds || [],
      selectedCompanyIds: parsed.selectedCompanyIds || []
    };
  } catch {
    return { selectedShipIds: [], selectedCompanyIds: [] };
  }
}

function App() {
  const [ships, setShips] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [{ selectedShipIds, selectedCompanyIds }, setFilterState] = useState(() => loadShipFilterState());
  const [popupCruiseId, setPopupCruiseId] = useState(null);

  // Загрузка компаний и кораблей
  useEffect(() => {
    fetchCompanies().then(setCompanies);
    fetchShips().then(ships => {
      setShips(ships);
      // После загрузки ships фильтруем только невалидные id
      const validIds = ships.map(s => String(s.ship_id));
      setFilterState(prev => ({
        ...prev,
        selectedShipIds: prev.selectedShipIds.filter(id => validIds.includes(String(id)))
      }));
    });
  }, []);

  // Сохраняем фильтр при изменении
  useEffect(() => {
    saveShipFilterState({ selectedShipIds, selectedCompanyIds });
  }, [selectedShipIds, selectedCompanyIds]);

  return (
    <div className="app-root">
      <div className="main-layout">
        <aside className="sidebar">
          <ShipFilter
            ships={ships}
            companies={companies}
            selectedShipIds={selectedShipIds}
            selectedCompanyIds={selectedCompanyIds}
            onChange={({ selectedShipIds, selectedCompanyIds }) => setFilterState({ selectedShipIds, selectedCompanyIds })}
          />
        </aside>
        <section className="globe-area">
          <CruiseGlobe
            selectedShipIds={selectedShipIds}
            onCruiseClick={cruise => setPopupCruiseId(cruise.cruise_id)}
          />
        </section>
      </div>
      <CruisePopup cruiseId={popupCruiseId} onClose={() => setPopupCruiseId(null)} />
    </div>
  )
}

export default App
