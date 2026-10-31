-- ==============================================================================
-- FILE 8: 08_queries.sql
-- DESCRIPTION: Analytical and reporting queries.
-- DBMS CONCEPTS: Joins, Aggregations, Group By, Subqueries, Window Functions.
-- ==============================================================================

USE cloud_kitchen;

-- 1. All orders with their items (INNER JOIN)
SELECT o.id AS order_id, o.customer_name, oi.menu_item_id, mi.name AS item_name
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id;

-- 2. Orders with station assignments (LEFT JOIN)
SELECT o.id, o.status, oi.id AS item_id, s.name AS station_name
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN stations s ON oi.assigned_station_id = s.id;

-- 3. Most popular menu items (GROUP BY + COUNT + ORDER BY)
SELECT mi.name, COUNT(oi.id) AS times_ordered
FROM menu_items mi
JOIN order_items oi ON mi.id = oi.menu_item_id
GROUP BY mi.id, mi.name
ORDER BY times_ordered DESC;

-- 4. Average prep time per station (GROUP BY station)
SELECT s.name, AVG(oi.actual_prep_time) AS avg_prep
FROM stations s
JOIN order_items oi ON s.id = oi.assigned_station_id
WHERE oi.actual_prep_time IS NOT NULL
GROUP BY s.id, s.name;

-- 5. Orders that took longer than average (subquery)
SELECT id, total_amount, (TIMESTAMPDIFF(MINUTE, created_at, completed_at)) AS duration
FROM orders
WHERE completed_at IS NOT NULL
  AND TIMESTAMPDIFF(MINUTE, created_at, completed_at) > (
      SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at))
      FROM orders
      WHERE completed_at IS NOT NULL
  );

-- 6. Peak order hours (EXTRACT HOUR, GROUP BY)
SELECT EXTRACT(HOUR FROM created_at) AS order_hour, COUNT(*) AS total_orders
FROM orders
GROUP BY order_hour
ORDER BY total_orders DESC;

-- 7. Revenue per day (GROUP BY DATE)
SELECT DATE(created_at) AS order_date, SUM(total_amount) AS daily_revenue
FROM orders
GROUP BY order_date;

-- 8. Station that processed the most orders (subquery / window function)
SELECT station_name, total_processed
FROM (
    SELECT s.name AS station_name, COUNT(oi.id) AS total_processed,
           RANK() OVER (ORDER BY COUNT(oi.id) DESC) as rnk
    FROM stations s
    JOIN order_items oi ON s.id = oi.assigned_station_id
    GROUP BY s.id, s.name
) ranked
WHERE rnk = 1;

-- 9. Menu items never ordered (LEFT JOIN + IS NULL / NOT EXISTS)
SELECT mi.name
FROM menu_items mi
LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
WHERE oi.id IS NULL;

-- 10. Order items with wait time > 10 minutes (TIMESTAMPDIFF)
SELECT oi.id, TIMESTAMPDIFF(MINUTE, oi.created_at, oi.started_at) AS wait_time_mins
FROM order_items oi
WHERE oi.started_at IS NOT NULL 
  AND TIMESTAMPDIFF(MINUTE, oi.created_at, oi.started_at) > 10;

-- 11. Running average prep time using window functions (AVG OVER)
SELECT id, actual_prep_time,
       AVG(actual_prep_time) OVER (ORDER BY completed_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_avg
FROM order_items
WHERE actual_prep_time IS NOT NULL;

-- 12. Rank stations by utilization (RANK / DENSE_RANK)
SELECT s.name, COUNT(oi.id) as items_processed,
       DENSE_RANK() OVER (ORDER BY COUNT(oi.id) DESC) as utilization_rank
FROM stations s
LEFT JOIN order_items oi ON s.id = oi.assigned_station_id
GROUP BY s.id, s.name;

-- 13. Inventory items below reorder level (WHERE + comparison)
SELECT ingredient_name, quantity, reorder_level
FROM inventory
WHERE quantity < reorder_level;

-- 14. Orders by priority distribution (GROUP BY priority)
SELECT priority, COUNT(*) AS order_count
FROM orders
GROUP BY priority
ORDER BY priority;

-- 15. HAVING clause: stations with avg prep time > 15 min
SELECT s.name, AVG(oi.actual_prep_time) AS avg_time
FROM stations s
JOIN order_items oi ON s.id = oi.assigned_station_id
WHERE oi.actual_prep_time IS NOT NULL
GROUP BY s.id, s.name
HAVING AVG(oi.actual_prep_time) > 15;
