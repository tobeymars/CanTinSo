-- CanTinSo: read-only data profiling before meal supply-chain redesign
-- Run from cantinso-backend with the DATABASE_URL pointing to the intended DB:
--   psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\docs\sql\meal-supply-chain-data-profile.sql
-- This script performs SELECT only. It does not create temp tables or modify data.

BEGIN TRANSACTION READ ONLY;

\echo '=== 0. Database identity ==='
SELECT current_database() AS database_name,
       current_schema() AS schema_name,
       current_user AS database_user,
       now() AS profiled_at;

\echo '=== 1. Core row counts ==='
SELECT 'wards' AS table_name, count(*) AS row_count FROM wards
UNION ALL SELECT 'schools', count(*) FROM schools
UNION ALL SELECT 'kitchens', count(*) FROM kitchens
UNION ALL SELECT 'kitchen_school_assignments', count(*) FROM kitchen_school_assignments
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'suppliers', count(*) FROM suppliers
UNION ALL SELECT 'ingredients', count(*) FROM ingredients
UNION ALL SELECT 'inventory_lots', count(*) FROM inventory_lots
UNION ALL SELECT 'dishes', count(*) FROM dishes
UNION ALL SELECT 'meal_plans', count(*) FROM meal_plans
UNION ALL SELECT 'meal_plan_items', count(*) FROM meal_plan_items
UNION ALL SELECT 'trace_events', count(*) FROM trace_events
UNION ALL SELECT 'food_safety_checks', count(*) FROM food_safety_checks
ORDER BY table_name;

\echo '=== 2. Organization and role/scope distribution ==='
SELECT k.id, k.code, k.name, k.type, k.school_id, k.ward_id, k.is_active
FROM kitchens k
ORDER BY k.code;

SELECT role, count(*) AS users,
       count(*) FILTER (WHERE school_id IS NOT NULL) AS with_school_scope,
       count(*) FILTER (WHERE kitchen_id IS NOT NULL) AS with_kitchen_scope,
       count(*) FILTER (WHERE ward_id IS NOT NULL) AS with_ward_scope
FROM users
GROUP BY role
ORDER BY role;

\echo '=== 3. Kitchen assignment validity and overlaps ==='
SELECT id, kitchen_id, school_id, is_active, starts_at, ends_at
FROM kitchen_school_assignments
WHERE ends_at IS NOT NULL AND ends_at <= starts_at
ORDER BY school_id, starts_at;

SELECT a.school_id, a.id AS assignment_a, b.id AS assignment_b,
       a.kitchen_id AS kitchen_a, b.kitchen_id AS kitchen_b,
       a.starts_at AS a_start, a.ends_at AS a_end,
       b.starts_at AS b_start, b.ends_at AS b_end
FROM kitchen_school_assignments a
JOIN kitchen_school_assignments b
  ON a.school_id = b.school_id
 AND a.id < b.id
 AND tstzrange(a.starts_at, COALESCE(a.ends_at, 'infinity'::timestamptz), '[)')
     && tstzrange(b.starts_at, COALESCE(b.ends_at, 'infinity'::timestamptz), '[)')
WHERE a.is_active OR b.is_active
ORDER BY a.school_id, a.starts_at;

\echo '=== 4. Supplier profile and candidate kitchen mapping ==='
SELECT s.id, s.code, s.name, s.school_id,
       count(l.id) AS linked_lot_count,
       count(DISTINCT l.supplier_id) AS supplier_reference_count
FROM suppliers s
LEFT JOIN inventory_lots l ON l.supplier_id = s.id
GROUP BY s.id, s.code, s.name, s.school_id
ORDER BY s.school_id, s.code;

-- Candidate only: assignment covering lot.received_at.
-- More than one candidate or zero candidates requires manual investigation.
SELECT l.id AS lot_id, l.school_id, l.supplier_id, l.received_at,
       count(a.id) AS candidate_assignment_count,
       array_agg(a.kitchen_id) FILTER (WHERE a.id IS NOT NULL) AS candidate_kitchen_ids
FROM inventory_lots l
LEFT JOIN kitchen_school_assignments a
  ON a.school_id = l.school_id
 AND a.starts_at <= l.received_at
 AND (a.ends_at IS NULL OR a.ends_at > l.received_at)
 AND a.is_active = true
GROUP BY l.id, l.school_id, l.supplier_id, l.received_at
ORDER BY l.received_at, l.id;

\echo '=== 5. Ingredient units/categories ==='
SELECT unit, count(*) AS ingredient_count
FROM ingredients
GROUP BY unit
ORDER BY ingredient_count DESC, unit;

SELECT category, count(*) AS ingredient_count
FROM ingredients
GROUP BY category
ORDER BY ingredient_count DESC, category;

\echo '=== 6. Inventory lot integrity and balances ==='
SELECT count(*) AS total_lots,
       count(*) FILTER (WHERE quantity < 0) AS negative_quantity,
       count(*) FILTER (WHERE remaining_qty < 0) AS negative_remaining,
       count(*) FILTER (WHERE remaining_qty > quantity) AS remaining_gt_received,
       count(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < received_at::date) AS expiry_before_received,
       count(*) FILTER (WHERE school_id IS NULL) AS missing_school
FROM inventory_lots;

SELECT l.id, l.lot_code, l.school_id, l.ingredient_id, l.supplier_id,
       l.quantity, l.remaining_qty, l.unit, l.received_at, l.expiry_date,
       s.school_id AS supplier_school_id
FROM inventory_lots l
LEFT JOIN suppliers s ON s.id = l.supplier_id
WHERE s.id IS NULL OR s.school_id <> l.school_id
   OR l.quantity < 0 OR l.remaining_qty < 0 OR l.remaining_qty > l.quantity
ORDER BY l.received_at, l.id;

SELECT school_id, ingredient_id, unit,
       sum(quantity) AS received_quantity,
       sum(remaining_qty) AS remaining_quantity,
       count(*) AS lot_count
FROM inventory_lots
GROUP BY school_id, ingredient_id, unit
ORDER BY school_id, ingredient_id, unit;

\echo '=== 7. Dish recipe JSON shape ==='
SELECT jsonb_typeof(recipe) AS recipe_json_type, count(*) AS dish_count
FROM dishes
GROUP BY jsonb_typeof(recipe)
ORDER BY recipe_json_type;

SELECT id, code, name, jsonb_typeof(recipe) AS recipe_json_type,
       CASE
         WHEN recipe IS NULL THEN NULL
         WHEN jsonb_typeof(recipe) = 'object' THEN (SELECT string_agg(key, ', ' ORDER BY key) FROM jsonb_object_keys(recipe) AS key)
         WHEN jsonb_typeof(recipe) = 'array' THEN 'array_length=' || jsonb_array_length(recipe)::text
         ELSE left(recipe::text, 300)
       END AS recipe_shape
FROM dishes
WHERE recipe IS NOT NULL
ORDER BY code;

\echo '=== 8. Meal plan and item consistency ==='
SELECT meal_type, status, count(*) AS plan_count
FROM meal_plans
GROUP BY meal_type, status
ORDER BY meal_type, status;

SELECT mp.id, mp.school_id, mp.service_date, mp.meal_type, mp.servings,
       count(mpi.id) AS item_count,
       COALESCE(sum(mpi.servings), 0) AS sum_item_servings,
       COALESCE(sum(mpi.servings), 0) - mp.servings AS servings_delta
FROM meal_plans mp
LEFT JOIN meal_plan_items mpi ON mpi.meal_plan_id = mp.id
GROUP BY mp.id, mp.school_id, mp.service_date, mp.meal_type, mp.servings
ORDER BY mp.service_date, mp.school_id, mp.meal_type;

SELECT mp.id AS meal_plan_id, mpi.id AS item_id, mpi.dish_id
FROM meal_plan_items mpi
JOIN meal_plans mp ON mp.id = mpi.meal_plan_id
LEFT JOIN dishes d ON d.id = mpi.dish_id
WHERE d.id IS NULL
ORDER BY mp.service_date, mpi.id;

\echo '=== 9. Trace and food-safety coverage ==='
SELECT event_type, count(*) AS event_count
FROM trace_events
GROUP BY event_type
ORDER BY event_type;

SELECT count(*) AS trace_event_count,
       count(*) FILTER (WHERE lot_id IS NULL) AS missing_lot_id
FROM trace_events;

SELECT status, category, count(*) AS check_count
FROM food_safety_checks
GROUP BY status, category
ORDER BY status, category;

\echo '=== 10. Existing foreign-key definitions for target tables ==='
SELECT tc.table_name, kcu.column_name, ccu.table_name AS referenced_table,
       ccu.column_name AS referenced_column, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.constraint_schema = kcu.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.constraint_schema = tc.constraint_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
 AND rc.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = current_schema()
  AND tc.table_name IN (
    'suppliers', 'inventory_lots', 'dishes', 'meal_plans',
    'meal_plan_items', 'trace_events', 'kitchen_school_assignments'
  )
ORDER BY tc.table_name, kcu.ordinal_position;

ROLLBACK;
