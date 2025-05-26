import React, { useState } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

function groupShipsByCompany(ships, companies) {
  // Возвращает [{ company_id, company_name, ships: [...] }]
  const companyMap = {};
  companies.forEach(c => {
    companyMap[c.company_id] = { ...c, ships: [] };
  });
  ships.forEach(ship => {
    const cid = ship.company_id;
    if (!companyMap[cid]) {
      companyMap[cid] = { company_id: cid, company_name: ship.company_name || 'Other', ships: [] };
    }
    companyMap[cid].ships.push(ship);
  });
  // Сортировка компаний и кораблей
  return Object.values(companyMap)
    .sort((a, b) => (a.company_name || '').localeCompare(b.company_name || '', undefined, { sensitivity: 'base' }))
    .map(group => ({
      ...group,
      ships: group.ships.slice().sort((a, b) => (a.ship_name || '').localeCompare(b.ship_name || '', undefined, { sensitivity: 'base' }))
    }));
}

const ShipFilter = ({ ships, companies, selectedShipIds, selectedCompanyIds, onChange }) => {
  const grouped = groupShipsByCompany(ships, companies);
  const allShipIds = ships.map(s => String(s.ship_id));
  // Состояние раскрытия компаний
  const [expandedCompanies, setExpandedCompanies] = useState([]);

  const handleToggleShip = (shipId) => {
    const id = String(shipId);
    let newSelected = selectedShipIds.includes(id)
      ? selectedShipIds.filter(sid => sid !== id)
      : [...selectedShipIds, id];
    onChange({ selectedShipIds: newSelected, selectedCompanyIds });
  };
  const handleToggleCompany = (company_id, shipIds) => {
    const allSelected = shipIds.every(id => selectedShipIds.includes(id));
    let newSelectedShips;
    let newSelectedCompanies;
    if (allSelected) {
      // Снять все корабли компании
      newSelectedShips = selectedShipIds.filter(id => !shipIds.includes(id));
      newSelectedCompanies = selectedCompanyIds.filter(cid => cid !== String(company_id));
    } else {
      // Выделить все корабли компании
      newSelectedShips = Array.from(new Set([...selectedShipIds, ...shipIds]));
      newSelectedCompanies = Array.from(new Set([...selectedCompanyIds, String(company_id)]));
    }
    onChange({ selectedShipIds: newSelectedShips, selectedCompanyIds: newSelectedCompanies });
  };
  const handleReset = () => {
    onChange({ selectedShipIds: [], selectedCompanyIds: [] });
  };
  const handleExpand = (company_id) => {
    setExpandedCompanies(expanded =>
      expanded.includes(company_id)
        ? expanded.filter(id => id !== company_id)
        : [...expanded, company_id]
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', bgcolor: '#23272f', color: '#fff', p: 0, m: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', m: 0, p: 0 }}>
        <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 400, fontSize: '1.05rem', m: 0, p: 0 }}>Ship filter</Typography>
        <Button size="small" onClick={handleReset} sx={{ color: '#2196f3', textTransform: 'none', fontSize: '0.85rem', minWidth: 0, p: '4px', m: '0 16px 0 0' }}>Reset</Button>
      </Box>
      <Typography sx={{ color: '#aaa', fontSize: '0.85rem', m: 0, p: 0 }}>
        Selected: {selectedShipIds.length} / {ships.length}
      </Typography>
      <List sx={{ overflowY: 'auto', flex: 1, bgcolor: 'transparent', p: 0, m: 0 }}>
        {grouped.filter(group => group.ships.length > 0).map(group => {
          const shipIds = group.ships.map(s => String(s.ship_id));
          const allSelected = shipIds.length > 0 && shipIds.every(id => selectedShipIds.includes(id));
          const someSelected = shipIds.some(id => selectedShipIds.includes(id));
          const expanded = expandedCompanies.includes(group.company_id);
          return (
            <React.Fragment key={group.company_id}>
              <ListItem disablePadding sx={{ bgcolor: '#23272f', p: 0, m: 0 }}>
                <Checkbox
                  edge="start"
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  tabIndex={-1}
                  disableRipple
                  sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0, m: '0 8px 0 0' }}
                  onClick={() => handleToggleCompany(group.company_id, shipIds)}
                />
                <ListItemText
                  primary={<span style={{ color: '#90caf9', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}>{group.company_name || 'Other'}</span>}
                  onClick={() => handleExpand(group.company_id)}
                  sx={{ m: 0, p: 0 }}
                />
                {expanded ? (
                  <ExpandLessIcon sx={{ color: '#2196f3', cursor: 'pointer', m: 0, p: 0 }} onClick={() => handleExpand(group.company_id)} />
                ) : (
                  <ExpandMoreIcon sx={{ color: '#2196f3', cursor: 'pointer', m: 0, p: 0 }} onClick={() => handleExpand(group.company_id)} />
                )}
              </ListItem>
              {expanded && group.ships.map(ship => (
                <ListItem key={ship.ship_id} disablePadding button onClick={() => handleToggleShip(ship.ship_id)} sx={{ pl: 3, p: 0, m: '0 0 0 30px' }}>
                  <Checkbox
                    edge="start"
                    checked={selectedShipIds.includes(String(ship.ship_id))}
                    tabIndex={-1}
                    disableRipple
                    sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0, m: '0 8px 0 0' }}
                  />
                  <ListItemText
                    primary={
                      <span style={{ color: '#fff', fontSize: '12px' }}>
                        {ship.ship_name}
                      </span>
                    }
                    sx={{ m: 0, p: 0 }}
                  />
                </ListItem>
              ))}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
};

export default ShipFilter; 