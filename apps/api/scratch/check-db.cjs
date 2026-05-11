const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), 'apps/api/.env') });

async function checkDatabase() {
  console.log("Connecting to Neon...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // More permissive for Neon debugging
  });

  try {
    const client = await pool.connect();
    console.log("✓ Successfully connected to PostgreSQL");

    // 1. Test Simple Query
    const projectCount = await client.query('SELECT count(*) FROM "Project"');
    console.log("✓ Simple Query Success! Project count:", projectCount.rows[0].count);

    // 2. Test PostGIS existence
    try {
      const postgisCheck = await client.query("SELECT PostGIS_Full_Version();");
      console.log("✓ PostGIS is enabled:", postgisCheck.rows[0].postgis_full_version);
    } catch (e) {
      console.error("✗ PostGIS is NOT enabled or missing.");
      console.error("Error:", e.message);
    }

    // 3. Test ST_AsGeoJSON specifically
    try {
      const geojsonTest = await client.query("SELECT ST_AsGeoJSON(ST_MakePoint(0,0));");
      console.log("✓ ST_AsGeoJSON is functional");
    } catch (e) {
      console.error("✗ ST_AsGeoJSON test failed!");
      console.error("Error:", e.message);
    }

    client.release();
  } catch (err) {
    console.error("✗ Database Check Failed:");
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
