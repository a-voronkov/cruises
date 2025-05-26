import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Используем те же параметры, что и в index.js
const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'cruises',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function main() {
  // 1. Найти все точки, у которых point_name заканчивается на ', <country>'
  const [points] = await pool.query(
    "SELECT point_id, point_name, country FROM points WHERE country IS NOT NULL AND country != ''"
  );

  let updated = 0;
  for (const point of points) {
    const country = point.country.trim();
    const suffix = ' ' + country;
    if (point.point_name.endsWith(suffix)) {
      const newName = point.point_name.slice(0, -suffix.length);
      await pool.query(
        "UPDATE points SET point_name = ? WHERE point_id = ?",
        [newName, point.point_id]
      );
      console.log(`Renamed: '${point.point_name}' → '${newName}'`);
      updated++;
    }
  }
  console.log(`Total renamed: ${updated}`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
}); 