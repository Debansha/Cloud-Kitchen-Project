-- ==============================================================================
-- FILE 5: 05_views.sql
-- DESCRIPTION: Database views for reporting and real-time monitoring.
-- DBMS CONCEPTS: Views, JOINs, Aggregations.
-- ==============================================================================

USE cloud_kitchen;

-- 1. vw_active_orders
CREATE OR REPLACE VIEW vw_active_orders AS
SELECT 
    o.id AS order_id,
    o.customer_name,
    o.status AS order_status,
    o.priority,
    oi.id AS order_item_id,
    mi.name AS menu_item_name,
    oi.status AS item_status,
    s.name AS station_name,
    oi.predicted_prep_time,
    oi.actual_prep_time
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN menu_items mi ON oi.menu_item_id = mi.id
LEFT JOIN stations s ON oi.assigned_station_id = s.id
WHERE o.status NOT IN ('Delivered', 'Cancelled');

-- 2. vw_dashboard_metrics
CREATE OR REPLACE VIEW vw_dashboard_metrics AS
SELECT 
    COUNT(o.id) AS total_orders_today,
    COALESCE(SUM(o.total_amount), 0) AS total_revenue_today,
    SUM(CASE WHEN o.status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders,
    SUM(CASE WHEN o.status = 'Ready' THEN 1 ELSE 0 END) AS ready_orders,
    COALESCE((SELECT AVG(wait_time_seconds) FROM scheduling_metrics WHERE algorithm_type = 'SJF'), 0) AS avg_wait_time,
    COALESCE((SELECT AVG(turnaround_time_seconds) FROM scheduling_metrics WHERE algorithm_type = 'SJF'), 0) AS avg_turnaround_time
FROM orders o
WHERE DATE(o.created_at) = CURDATE();

-- 3. vw_station_utilization
CREATE OR REPLACE VIEW vw_station_utilization AS
SELECT 
    s.id AS station_id,
    s.name AS station_name,
    COUNT(oi.id) AS total_items_processed,
    COALESCE(AVG(oi.actual_prep_time), 0) AS avg_prep_time
FROM stations s
LEFT JOIN order_items oi ON s.id = oi.assigned_station_id AND oi.status = 'Ready'
GROUP BY s.id, s.name;

-- 4. vw_algorithm_comparison
CREATE OR REPLACE VIEW vw_algorithm_comparison AS
SELECT 
    algorithm_type,
    COALESCE(AVG(wait_time_seconds), 0) AS avg_wait_time,
    COALESCE(AVG(turnaround_time_seconds), 0) AS avg_turnaround_time,
    COALESCE(AVG(response_time_seconds), 0) AS avg_response_time
FROM scheduling_metrics
GROUP BY algorithm_type;
