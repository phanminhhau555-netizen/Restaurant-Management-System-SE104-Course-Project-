-- =====================================================
-- SAMPLE AREAS + TABLES DATA
-- Run this after schema.sql and after selecting your DB:
-- USE your_database_name;
-- =====================================================

START TRANSACTION;

-- Areas
INSERT INTO areas (name)
SELECT name
FROM (
  SELECT 'Tầng trệt' AS name UNION ALL
  SELECT 'Lầu 1' UNION ALL
  SELECT 'Sân vườn' UNION ALL
  SELECT 'Phòng VIP'
) AS seed_areas
WHERE NOT EXISTS (
  SELECT 1 FROM areas a WHERE a.name = seed_areas.name
);

-- Tables
-- Since we need correct area_id, we fetch it dynamically during insert
INSERT INTO tables (name, area_id, status)
SELECT t.name, a.id, 'trong'
FROM (
  -- Tầng trệt
  SELECT 'Bàn 1' AS name, 'Tầng trệt' AS area_name UNION ALL
  SELECT 'Bàn 2', 'Tầng trệt' UNION ALL
  SELECT 'Bàn 3', 'Tầng trệt' UNION ALL
  SELECT 'Bàn 4', 'Tầng trệt' UNION ALL
  SELECT 'Bàn 5', 'Tầng trệt' UNION ALL
  SELECT 'Bàn 6', 'Tầng trệt' UNION ALL
  SELECT 'Bàn 7', 'Tầng trệt' UNION ALL
  SELECT 'Bàn 8', 'Tầng trệt' UNION ALL
  -- Lầu 1
  SELECT 'Bàn 9', 'Lầu 1' UNION ALL
  SELECT 'Bàn 10', 'Lầu 1' UNION ALL
  SELECT 'Bàn 11', 'Lầu 1' UNION ALL
  SELECT 'Bàn 12', 'Lầu 1' UNION ALL
  SELECT 'Bàn 13', 'Lầu 1' UNION ALL
  SELECT 'Bàn 14', 'Lầu 1' UNION ALL
  SELECT 'Bàn 15', 'Lầu 1' UNION ALL
  SELECT 'Bàn 16', 'Lầu 1' UNION ALL
  -- Sân vườn
  SELECT 'Bàn SV1', 'Sân vườn' UNION ALL
  SELECT 'Bàn SV2', 'Sân vườn' UNION ALL
  SELECT 'Bàn SV3', 'Sân vườn' UNION ALL
  SELECT 'Bàn SV4', 'Sân vườn' UNION ALL
  -- Phòng VIP
  SELECT 'Bàn VIP1', 'Phòng VIP' UNION ALL
  SELECT 'Bàn VIP2', 'Phòng VIP' UNION ALL
  SELECT 'Bàn VIP3', 'Phòng VIP'
) AS t
JOIN areas a ON a.name = t.area_name
WHERE NOT EXISTS (
  SELECT 1 FROM tables tbl WHERE tbl.name = t.name AND tbl.area_id = a.id
);

COMMIT;
