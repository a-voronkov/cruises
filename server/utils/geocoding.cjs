const mysql = require('mysql2/promise');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Create database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'database',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'cruises',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Clean location name for better geocoding results
function cleanLocationName(name) {
  return name
    .replace(/,.*$/, '') // Remove everything after comma
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\b(hotels?|resorts?|islands?)\b/gi, '') // Remove common irrelevant words
    .trim();
}

// Get coordinates from Nominatim
async function getCoordinates(locationName, country) {
  try {
    const searchQuery = `${cleanLocationName(locationName)}, ${country}`;
    console.log(`Searching for: ${searchQuery}`);
    
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: searchQuery,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'CruiseMapGeocoding/1.0' // Required by Nominatim
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocoding ${locationName}:`, error.message);
    return null;
  }
}

// Get coordinates from Nominatim with multiple attempts
async function getCoordinatesSmart(point_name, country) {
  // 1. Оригинальное название
  let attempts = [
    { name: point_name, label: 'original' },
    // 2. Очищенное название (убрать Island, hotels, всё после запятой)
    { name: cleanLocationName(point_name), label: 'cleaned' },
    // 3. Только первая часть названия (до пробела или запятой)
    { name: point_name.split(',')[0].split(' ')[0], label: 'first word' },
    // 4. Только страна
    { name: '', label: 'country only' }
  ];
  for (const attempt of attempts) {
    if (!attempt.name && attempt.label !== 'country only') continue;
    const coords = await getCoordinates(attempt.name, country);
    if (coords) {
      console.log(`Found coordinates (${attempt.label}): ${coords.lat}, ${coords.lng}`);
      return coords;
    } else {
      console.log(`No coordinates found (${attempt.label})`);
    }
    // Wait 1 second between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
}

// Update coordinates in database
async function updateCoordinates(pointId, lat, lng) {
  try {
    const [result] = await pool.execute(
      'UPDATE points SET lat = ?, lng = ? WHERE point_id = ?',
      [lat, lng, pointId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(`Error updating coordinates for point ${pointId}:`, error.message);
    return false;
  }
}

// Get all points without coordinates
async function getPointsWithoutCoordinates() {
  try {
    const [rows] = await pool.execute(
      'SELECT point_id, point_name, country FROM points WHERE lat IS NULL OR lng IS NULL'
    );
    return rows;
  } catch (error) {
    console.error('Error fetching points:', error.message);
    return [];
  }
}

// Main function to process all points
async function processAllPoints() {
  const points = await getPointsWithoutCoordinates();
  console.log(`Found ${points.length} points without coordinates`);

  for (const point of points) {
    console.log(`\nProcessing point: ${point.point_name} (${point.country})`);
    
    const coords = await getCoordinatesSmart(point.point_name, point.country);
    
    if (coords) {
      const updated = await updateCoordinates(point.point_id, coords.lat, coords.lng);
      console.log(`Update ${updated ? 'successful' : 'failed'}`);
    } else {
      console.log('No coordinates found for this point after all attempts');
    }
  }

  await pool.end();
}

// Export functions for use in other files
module.exports = {
  processAllPoints,
  getCoordinates,
  updateCoordinates,
  cleanLocationName
};

// If this file is run directly, process all points
if (require.main === module) {
  processAllPoints().catch(console.error);
} 