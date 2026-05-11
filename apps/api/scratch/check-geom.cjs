const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), 'apps/api/.env') });

async function checkInvalidGeometries() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    const projectId = 'cmok02h9t0001z8uh9pnw45bj';
    
    console.log(`Checking features for project: ${projectId}`);

    const result = await client.query(`
      SELECT 
        id, 
        name, 
        ST_IsValid(geometry) as is_valid,
        ST_Summary(geometry) as summary
      FROM "Feature"
      WHERE "projectId" = $1
    `, [projectId]);

    console.log(`Found ${result.rows.length} features.`);
    
    const invalid = result.rows.filter(r => r.is_valid === false);
    if (invalid.length > 0) {
      console.warn(`✗ Found ${invalid.length} INVALID geometries:`);
      invalid.forEach(r => console.log(`  - [${r.id}] ${r.name}: ${r.summary}`));
    } else {
      console.log("✓ All geometries are valid.");
    }

    client.release();
  } catch (err) {
    console.error("✗ Query failed:", err.message);
  } finally {
    await pool.end();
  }
}

checkInvalidGeometries();
