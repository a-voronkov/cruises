import React from 'react';

const CruisePopup = ({ cruise, onClose }) => {
  if (!cruise) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
        <button onClick={onClose} style={{ float: 'right' }}>Close</button>
        <h2>Cruise details</h2>
        {/* TODO: render cruise details */}
        <pre>{JSON.stringify(cruise, null, 2)}</pre>
      </div>
    </div>
  );
};

export default CruisePopup; 