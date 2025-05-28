import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import CruiseGlobe from './components/CruiseGlobe'
import ShipFilter from './components/ShipFilter'
import CircularProgress from '@mui/material/CircularProgress';

const SHIP_FILTER_KEY = 'selected_ship_ids';

async function fetchCompanies() {
  const res = await fetch('/api/company');
  if (!res.ok) return [];
  return await res.json();
}

async function fetchShips() {
  const res = await fetch(`/api/ship`);
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
  const [{ selectedShipIds, selectedCompanyIds }, setFilterState] = useState(() => loadShipFilterState());

  // Load ships
  useEffect(() => {
    fetchShips().then(ships => {
      setShips(ships);
      // After loading ships, filter only valid ids
      const validIds = ships.map(s => String(s.id));
      setFilterState(prev => ({
        ...prev,
        selectedShipIds: prev.selectedShipIds.filter(id => validIds.includes(String(id)))
      }));
    });
  }, []);

  // Save filter on change
  useEffect(() => {
    saveShipFilterState({ selectedShipIds, selectedCompanyIds });
  }, [selectedShipIds, selectedCompanyIds]);

  return (
    <div className="app-root">
      <div className="main-layout">
        <aside className="sidebar">
          <ShipFilter
            ships={ships}
            selectedShipIds={selectedShipIds}
            selectedCompanyIds={selectedCompanyIds}
            onChange={({ selectedShipIds, selectedCompanyIds }) => setFilterState({ selectedShipIds, selectedCompanyIds })}
          />
        </aside>
        <section className="globe-area">
          <CruiseGlobe
            selectedShipIds={selectedShipIds}
          />
        </section>
      </div>
    </div>
  )
}

export default App
