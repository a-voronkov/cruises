import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'cruises',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}); 

// Test database connection
try {
  const connection = await pool.getConnection();
  console.log('Successfully connected to database');
  connection.release();
} catch (err) {
  console.error('Error connecting to database:', err);
}

// API endpoints
app.get('/api/cruises', async (req, res) => {
  try {
    const { date_from, date_to, ship_id } = req.query;
    console.log('Received ship_id filter:', ship_id);
    let params = [];
    let where = [];
    if (date_from && date_to) {
      where.push('st.date BETWEEN ? AND ?');
      params.push(date_from, date_to);
    } else if (date_from) {
      where.push('st.date >= ?');
      params.push(date_from);
    } else if (date_to) {
      where.push('st.date <= ?');
      params.push(date_to);
    }
    // Фильтрация по дате начала круиза (stop_order=1)
    if (date_from) {
//      where.push(`st.stop_order != 1 OR (st.stop_order = 1 AND st.date >= ?)`);
//      params.push(date_from);
    }
    let shipIds = [];
    if (ship_id) {
      if (Array.isArray(ship_id)) {
        shipIds = ship_id.map(Number).filter(Boolean);
      } else if (typeof ship_id === 'string' && ship_id.includes(',')) {
        shipIds = ship_id.split(',').map(Number).filter(Boolean);
      } else {
        shipIds = [Number(ship_id)];
      }
      if (shipIds.length > 0) {
        where.push(`st.ship_id IN (${shipIds.map(() => '?').join(',')})`);
        params.push(...shipIds);
      }
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    // 1. Получаем cruise_id с остановками в диапазоне и по кораблям
    const [idRows] = await pool.query(`
      SELECT DISTINCT st.cruise_id
      FROM stops st
      ${whereClause}
      
    `, params);
    const cruiseIds = idRows.map(row => row.cruise_id);
    if (cruiseIds.length === 0) {
      return res.json([]);
    }
    // 2. Получаем данные по этим cruise_id (фильтр по ship_id в WHERE)
    let cruiseWhere = `c.cruise_id IN (${cruiseIds.map(() => '?').join(',')})`;
    let cruiseParams = [...cruiseIds];
    if (shipIds.length > 0) {
      cruiseWhere += ` AND s.ship_id IN (${shipIds.map(() => '?').join(',')})`;
      cruiseParams.push(...shipIds);
    }
    const [rows] = await pool.query(`
      SELECT 
        c.cruise_id,
        c.cruise_code,
        c.cruise_name,
        c.date,
        c.days,
        c.nights,
        s.ship_name,
        comp.company_name,
        comp.logo_url,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'point_id', p.point_id,
            'point_name', p.point_name,
            'country', p.country,
            'lat', p.lat,
            'lng', p.lng,
            'date', st.date
          )
        ) as stops
      FROM cruises c
      LEFT JOIN ships s ON s.ship_id = (
        SELECT ship_id 
        FROM stops 
        WHERE cruise_id = c.cruise_id 
        LIMIT 1
      )
      LEFT JOIN companies comp ON comp.company_id = s.company_id
      LEFT JOIN stops st ON st.cruise_id = c.cruise_id
      LEFT JOIN points p ON p.point_id = st.point_id
      WHERE ${cruiseWhere}
      GROUP BY c.cruise_id
    `, cruiseParams);

    // Преобразуем stops в массив объектов
    const cruises = rows.map(cruise => ({
      ...cruise,
      stops: cruise.stops ? JSON.parse(cruise.stops) : []
    }));
    
    res.json(cruises);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/points', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.point_id,
        p.point_name,
        p.country,
        p.lat,
        p.lng,
        COUNT(DISTINCT s.cruise_id) as cruise_count
      FROM points p
      LEFT JOIN stops s ON s.point_id = p.point_id
      GROUP BY p.point_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/ships', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    // Если нет фильтра по датам, не возвращаем ничего
    if (!date_from && !date_to) {
      return res.json([]);
    }
    let where = [];
    let params = [];
    if (date_from && date_to) {
      where.push('EXISTS (SELECT 1 FROM cruises c2 JOIN stops st2 ON st2.cruise_id = c2.cruise_id WHERE st2.ship_id = s.ship_id AND st2.date BETWEEN ? AND ?)');
      params.push(date_from, date_to);
    } else if (date_from) {
      where.push('EXISTS (SELECT 1 FROM cruises c2 JOIN stops st2 ON st2.cruise_id = c2.cruise_id WHERE st2.ship_id = s.ship_id AND st2.date >= ?)');
      params.push(date_from);
    } else if (date_to) {
      where.push('EXISTS (SELECT 1 FROM cruises c2 JOIN stops st2 ON st2.cruise_id = c2.cruise_id WHERE st2.ship_id = s.ship_id AND st2.date <= ?)');
      params.push(date_to);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const [rows] = await pool.query(`
      SELECT 
        s.ship_id,
        s.ship_name,
        s.company_id,
        comp.company_name,
        comp.logo_url,
        COUNT(DISTINCT st.cruise_id) as cruise_count
      FROM ships s
      LEFT JOIN companies comp ON comp.company_id = s.company_id
      LEFT JOIN stops st ON st.ship_id = s.ship_id
      ${whereClause}
      GROUP BY s.ship_id
    `, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Новый endpoint для получения списка компаний
app.get('/api/companies', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT company_id, company_name FROM companies ORDER BY company_name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint to check coordinates
app.get('/api/debug/points', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        point_id,
        point_name,
        country,
        lat,
        lng,
        COUNT(DISTINCT s.cruise_id) as cruise_count
      FROM points p
      LEFT JOIN stops s ON s.point_id = p.point_id
      GROUP BY p.point_id
      ORDER BY cruise_count DESC
    `);
    
    // Проверяем наличие координат
    const pointsWithCoords = rows.filter(p => p.lat != null && p.lng != null);
    const pointsWithoutCoords = rows.filter(p => p.lat == null || p.lng == null);
    
    res.json({
      total: rows.length,
      with_coordinates: pointsWithCoords.length,
      without_coordinates: pointsWithoutCoords.length,
      points_without_coords: pointsWithoutCoords.map(p => ({
        point_id: p.point_id,
        point_name: p.point_name,
        country: p.country
      })),
      sample_points: pointsWithCoords.slice(0, 5) // Показываем первые 5 точек с координатами
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Новый endpoint для получения информации о конкретном круизе
app.get('/api/cruise/:id', async (req, res) => {
  try {
    const cruiseId = req.params.id;
    const [rows] = await pool.query(`
      SELECT 
        c.cruise_id,
        c.cruise_code,
        c.cruise_name,
        c.date,
        c.days,
        c.nights,
        s.ship_id,
        s.ship_name,
        comp.company_id,
        comp.company_name,
        comp.logo_url,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'point_id', p.point_id,
            'point_name', p.point_name,
            'country', p.country,
            'lat', p.lat,
            'lng', p.lng,
            'date', st.date
          )
          ORDER BY st.date, st.stop_order
        ) as stops
      FROM cruises c
      LEFT JOIN ships s ON s.ship_id = (
        SELECT ship_id FROM stops WHERE cruise_id = c.cruise_id LIMIT 1
      )
      LEFT JOIN companies comp ON comp.company_id = s.company_id
      LEFT JOIN stops st ON st.cruise_id = c.cruise_id
      LEFT JOIN points p ON p.point_id = st.point_id
      WHERE c.cruise_id = ?
      GROUP BY c.cruise_id
      LIMIT 1
    `, [cruiseId]);
    if (!rows.length) return res.status(404).json({ error: 'Cruise not found' });
    const cruise = rows[0];
    cruise.stops = cruise.stops ? JSON.parse(cruise.stops) : [];
    res.json(cruise);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 