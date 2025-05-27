import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { formatDate } from '../utils/format';

function getCruiseDays(stops) {
  if (!stops || stops.length === 0) return [];
  // Sort stops by date
  const sorted = stops.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const days = [];
  let dayNum = 1;
  for (let i = 0; i < sorted.length; i++) {
    const stop = sorted[i];
    const date = stop.date;
    if (i > 0) {
      // Check for missing days between previous and current stop
      let prevDate = new Date(sorted[i - 1].date);
      let currDate = new Date(date);
      prevDate.setHours(0,0,0,0);
      currDate.setHours(0,0,0,0);
      let diff = Math.round((currDate - prevDate) / (1000*60*60*24));
      for (let j = 1; j < diff; j++) {
        const atSeaDate = new Date(prevDate);
        atSeaDate.setDate(prevDate.getDate() + j + 1);
        days.push({
          day: dayNum++,
          date: atSeaDate.toISOString().split('T')[0],
          atSea: true
        });
      }
    }
    // Add only if this is not a duplicate date of the previous stop
    if (days.length === 0 || days[days.length - 1].date !== date) {
      days.push({
        day: dayNum++,
        date: date,
        port: stop.point_name,
        country: stop.country,
        atSea: false
      });
    }
  }
  return days;
}

const CruisePopup = ({ cruiseId, onClose }) => {
  const [cruise, setCruise] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!cruiseId) return;
    setLoading(true);
    setCruise(null);
    fetch(`/api/cruise/${cruiseId}`)
      .then(res => res.json())
      .then(data => {
        setCruise(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cruiseId]);
  if (!cruiseId) return null;
  return (
    <Dialog open={!!cruiseId} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: '#23272f', color: '#fff' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', bgcolor: '#23272f', color: '#fff', pb: 1 }}>
        <Typography variant="h5" component="span" sx={{ flex: 1, fontWeight: 600 }}>{cruise ? (cruise.cruise_name || 'Cruise') : 'Loading...'}</Typography>
        {cruise && cruise.company_name && cruise.logo_url && (
          <img src={cruise.logo_url} alt={cruise.company_name} style={{ height: 36, marginLeft: 16, borderRadius: 6, background: '#fff' }} />
        )}
        <IconButton onClick={onClose} sx={{ color: '#fff', ml: 2 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#23272f', color: '#fff', minHeight: 200 }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
            <CircularProgress color="info" />
          </div>
        )}
        {!loading && cruise && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              <b>Ship:</b> {cruise.ship_name || '-'}<br/>
              <b>Company:</b> {cruise.company_name || '-'}
            </Typography>
            <TableContainer component={Paper} sx={{ bgcolor: '#23272f', color: '#fff', boxShadow: 'none' }}>
              <Table size="small" sx={{ bgcolor: '#23272f', color: '#fff' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#90caf9', fontWeight: 600 }}>Day</TableCell>
                    <TableCell sx={{ color: '#90caf9', fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ color: '#90caf9', fontWeight: 600 }}>Port</TableCell>
                    <TableCell sx={{ color: '#90caf9', fontWeight: 600 }}>Country</TableCell>
                    <TableCell sx={{ color: '#90caf9', fontWeight: 600 }}>Arrival</TableCell>
                    <TableCell sx={{ color: '#90caf9', fontWeight: 600 }}>Departure</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getCruiseDays(cruise.stops).map(row => (
                    <TableRow key={row.day}>
                      <TableCell sx={{ color: '#fff' }}>{row.day}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{formatDate(row.date)}</TableCell>
                      <TableCell sx={{ color: row.atSea ? '#aaa' : '#fff', fontStyle: row.atSea ? 'italic' : 'normal' }}>{row.atSea ? '🌊 At sea' : row.port}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{row.country || ''}</TableCell>
                      <TableCell sx={{ color: '#aaa' }}>—</TableCell>
                      <TableCell sx={{ color: '#aaa' }}>—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CruisePopup; 