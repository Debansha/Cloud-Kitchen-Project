-- ==============================================================================
-- FILE: 10_multi_kitchen_seed.sql
-- DESCRIPTION: Seed data for Multiple Cloud Kitchens, Staffing Allocations,
--              Feature Registry, and Initial Model Version Metadata.
-- ==============================================================================

USE cloud_kitchen;

-- 1. Insert 3 Cloud Kitchen Locations
INSERT INTO kitchens (id, name, code, location_zone, status, max_concurrent_orders, delivery_radius_km, rating)
VALUES 
(1, 'Central Kitchen - Downtown Hub', 'CK-CENTRAL', 'Downtown Core', 'Active', 25, 8.00, 4.85),
(2, 'Express Kitchen - Tech Park', 'CK-TECHPARK', 'Tech Corridor', 'Active', 18, 6.50, 4.70),
(3, 'Suburban Cloud Kitchen - North Hub', 'CK-NORTH', 'North Residential', 'Active', 20, 7.50, 4.90)
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status);

-- 2. Insert Staff Members with Operational Roles and Skill Levels
INSERT INTO kitchen_staff (id, kitchen_id, name, role, assigned_station_type, skill_level, status, active_tasks)
VALUES
-- Kitchen 1 (Downtown Hub - 6 Staff)
(1, 1, 'Chef Rajesh Kumar', 'Head_Chef', 'Grill', 1.25, 'On_Shift', 1),
(2, 1, 'Pooja Verma', 'Line_Cook', 'Fryer', 1.10, 'On_Shift', 2),
(3, 1, 'Amitabh Roy', 'Line_Cook', 'Oven', 1.15, 'On_Shift', 1),
(4, 1, 'Deepak Soni', 'Prep_Cook', 'Salad_Bar', 1.00, 'On_Shift', 0),
(5, 1, 'Neha Sharma', 'Assembler', 'Assembly', 1.20, 'On_Shift', 1),
(6, 1, 'Vikram Malhotra', 'Assembler', 'Beverage', 1.05, 'On_Shift', 0),

-- Kitchen 2 (Tech Park - 4 Staff, leaner staffing under peak pressure)
(7, 2, 'Chef Suresh Nair', 'Head_Chef', 'Grill', 1.30, 'On_Shift', 2),
(8, 2, 'Karan Patel', 'Line_Cook', 'Fryer', 1.00, 'On_Shift', 1),
(9, 2, 'Sunita Rao', 'Line_Cook', 'Oven', 1.05, 'On_Shift', 2),
(10, 2, 'Manish Tiwari', 'Assembler', 'Assembly', 1.10, 'On_Shift', 1),

-- Kitchen 3 (North Hub - 5 Staff)
(11, 3, 'Chef Ananya Sen', 'Head_Chef', 'Oven', 1.20, 'On_Shift', 1),
(12, 3, 'Gaurav Joshi', 'Line_Cook', 'Grill', 1.15, 'On_Shift', 1),
(13, 3, 'Rohan Das', 'Line_Cook', 'Fryer', 1.05, 'On_Shift', 0),
(14, 3, 'Simran Kaur', 'Prep_Cook', 'Salad_Bar', 1.00, 'On_Shift', 0),
(15, 3, 'Arun Mehta', 'Assembler', 'Assembly', 1.10, 'On_Shift', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), skill_level=VALUES(skill_level);

-- 3. Register Validated Features in Feature Registry
INSERT INTO feature_registry (feature_name, category, data_type, description, is_active, importance_score)
VALUES
('base_prep_time_minutes', 'Item', 'float', 'Nominal culinary benchmark preparation time in minutes', TRUE, 0.4250),
('quantity', 'Item', 'int', 'Quantity of items ordered in the line item', TRUE, 0.1650),
('item_complexity_score', 'Item', 'float', 'Complexity weight based on recipe steps and equipment (e.g., Pizza=1.3, Beverage=0.7)', TRUE, 0.1120),
('active_staff_count', 'Staffing', 'int', 'Number of staff members currently on active shift in the kitchen', TRUE, 0.1080),
('station_staff_ratio', 'Staffing', 'float', 'Ratio of active staff assigned to the specific station category', TRUE, 0.0650),
('queue_length', 'Operational', 'int', 'Total order items currently queued in the kitchen ready queue', TRUE, 0.0520),
('station_load', 'Operational', 'float', 'Active workload ratio on the assigned station (0.0 to 1.0)', TRUE, 0.0380),
('is_peak_hour', 'Temporal', 'int', 'Binary indicator for lunch (12-14) or dinner (19-21) peak rushes', TRUE, 0.0220),
('hour_of_day', 'Temporal', 'int', 'Hour of the day (0 to 23) capturing diurnal velocity trends', TRUE, 0.0130),
('equipment_condition', 'Equipment', 'float', 'Health score of the cooking station equipment (0.8 to 1.0)', FALSE, 0.0000)
ON DUPLICATE KEY UPDATE description=VALUES(description), is_active=VALUES(is_active);

-- 4. Seed Production & Candidate Models into Model Registry
INSERT INTO model_registry (model_version, algorithm, hyperparameters, features_used, train_mae, train_rmse, val_mae, val_rmse, val_r2, model_path, status, evaluation_notes, trained_at, promoted_at)
VALUES
(
    'v1.0-baseline',
    'HeuristicLinearBaseline',
    '{"type": "rule_based"}',
    '["base_prep_time_minutes", "quantity", "queue_length"]',
    185.400,
    240.200,
    192.150,
    248.800,
    0.4120,
    'server/ai/models/v1.0-baseline.json',
    'archived',
    'Initial heuristic baseline predictor (high variance during peak hours)',
    DATE_SUB(NOW(), INTERVAL 7 DAY),
    NULL
),
(
    'v2.0-rf-prod',
    'RandomForestRegressor',
    '{"n_estimators": 100, "max_depth": 12, "min_samples_split": 4, "random_state": 42}',
    '["base_prep_time_minutes", "quantity", "item_complexity_score", "active_staff_count", "station_staff_ratio", "queue_length", "station_load", "is_peak_hour", "hour_of_day"]',
    34.250,
    48.110,
    38.800,
    52.450,
    0.8840,
    'server/ai/models/v2.0-rf-prod.joblib',
    'production',
    'Current production model trained on 1,450 historical validated orders across 3 kitchens with measurable staffing features.',
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    NOW()
)
ON DUPLICATE KEY UPDATE status=VALUES(status), evaluation_notes=VALUES(evaluation_notes);
