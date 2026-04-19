-- Run this script to check the geometry status in your database
-- Connect to your database and run these queries

-- 1. Check total features and their geometry status
SELECT 
  COUNT(*) as total_features,
  COUNT(CASE WHEN geometry IS NOT NULL THEN 1 END) as features_with_geometry,
  COUNT(CASE WHEN geometry IS NULL THEN 1 END) as features_without_geometry
FROM "Feature";

-- 2. Show first 10 features with their geometry details
SELECT 
  id, 
  name, 
  geometry IS NULL as geom_is_null,
  CASE 
    WHEN geometry IS NOT NULL THEN ST_GeometryType(geometry)
    ELSE 'NULL'
  END as geom_type,
  "parentId",
  "createdAt"
FROM "Feature"
ORDER BY "createdAt" DESC
LIMIT 10;

-- 3. Check if geometry is stored in details JSON field
SELECT 
  COUNT(*) as features_with_geom_in_details
FROM "Feature"
WHERE details->'geometry' IS NOT NULL;

-- 4. Show examples of geometry in details field
SELECT 
  id,
  name,
  (details->>'geometry') as geometry_in_details
FROM "Feature"
WHERE details->'geometry' IS NOT NULL
LIMIT 3;

-- 5. Check Feature table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Feature'
ORDER BY ordinal_position;

-- 6. Check if PostGIS extension is loaded
SELECT extname FROM pg_extension WHERE extname = 'postgis';

-- 7. Count features by project
SELECT 
  "projectId",
  COUNT(*) as total,
  COUNT(CASE WHEN geometry IS NOT NULL THEN 1 END) as with_geometry,
  COUNT(CASE WHEN geometry IS NULL THEN 1 END) as without_geometry
FROM "Feature"
GROUP BY "projectId"
ORDER BY total DESC;
