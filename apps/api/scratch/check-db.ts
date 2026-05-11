import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the API directory
dotenv.config({ path: path.join(process.cwd(), 'apps/api/.env') });

async function checkDatabase() {
  console.log("Checking Database URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    console.log("✓ Successfully connected to PostgreSQL");

    const postgisCheck = await client.query("SELECT PostGIS_Version();");
    console.log("✓ PostGIS is enabled:", postgisCheck.rows[0].postgis_version);

    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Feature', 'Issue', 'Project');
    `);
    console.log("✓ Found tables:", tablesCheck.rows.map(r => r.table_name).join(', '));

    client.release();
  } catch (err) {
    console.error("✗ Database Check Failed:");
    console.error(err.message);
    if (err.message.includes('ST_AsGeoJSON')) {
      console.error("HINT: PostGIS function ST_AsGeoJSON is missing. Run 'CREATE EXTENSION postgis;' in your database.");
    }
  } finally {
    await pool.end();
  }
}

checkDatabase();
