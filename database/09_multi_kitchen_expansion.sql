-- ==============================================================================
-- FILE: 09_multi_kitchen_expansion.sql
-- DESCRIPTION: Schema expansion for Multi-Cloud-Kitchen Orchestration, Staffing,
--              Automated Priority Scheduling, Machine Learning Model Registry,
--              Feature Discovery, and Audited Decision Logging.
-- ==============================================================================

USE cloud_kitchen;

-- 1. Multi-Kitchen Management Entity
CREATE TABLE IF NOT EXISTS kitchens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    location_zone VARCHAR(100) NOT NULL,
    status ENUM('Active', 'Busy', 'Offline') DEFAULT 'Active',
    max_concurrent_orders INT DEFAULT 20,
    delivery_radius_km DECIMAL(4,2) DEFAULT 7.50,
    rating DECIMAL(3,2) DEFAULT 4.80,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Staffing Entity (Measurable Operational Staffing Data)
CREATE TABLE IF NOT EXISTS kitchen_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kitchen_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('Head_Chef', 'Line_Cook', 'Prep_Cook', 'Assembler') NOT NULL,
    assigned_station_type ENUM('Grill','Fryer','Oven','Salad_Bar','Assembly','Beverage') NOT NULL,
    skill_level DECIMAL(3,2) DEFAULT 1.00,
    status ENUM('On_Shift', 'On_Break', 'Off_Duty') DEFAULT 'On_Shift',
    active_tasks INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Staff Shifts & Operational Availability
CREATE TABLE IF NOT EXISTS staff_shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kitchen_id INT NOT NULL,
    staff_id INT NOT NULL,
    shift_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES kitchen_staff(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Dynamic Feature Discovery Registry
CREATE TABLE IF NOT EXISTS feature_registry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Item', 'Operational', 'Staffing', 'Temporal', 'Equipment'
    data_type VARCHAR(30) NOT NULL, -- 'float', 'int', 'categorical'
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    importance_score DECIMAL(5,4) DEFAULT 0.0000,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Machine Learning Model Registry & Lifecycle Management
CREATE TABLE IF NOT EXISTS model_registry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_version VARCHAR(50) UNIQUE NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    hyperparameters JSON NULL,
    features_used JSON NOT NULL,
    train_mae DECIMAL(6,3) NOT NULL,
    train_rmse DECIMAL(6,3) NOT NULL,
    val_mae DECIMAL(6,3) NOT NULL,
    val_rmse DECIMAL(6,3) NOT NULL,
    val_r2 DECIMAL(5,4) NOT NULL,
    model_path VARCHAR(255) NOT NULL,
    status ENUM('production', 'candidate', 'rejected', 'archived') DEFAULT 'candidate',
    evaluation_notes TEXT NULL,
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    promoted_at TIMESTAMP NULL
) ENGINE=InnoDB;

-- 6. Historical Prediction & Actual Outcome Audit Logs (For Online Learning & Drift Detection)
CREATE TABLE IF NOT EXISTS prediction_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NULL,
    order_item_id INT NULL,
    kitchen_id INT NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    features_snapshot JSON NOT NULL,
    predicted_duration_seconds DECIMAL(8,2) NOT NULL,
    actual_duration_seconds DECIMAL(8,2) NULL,
    absolute_error_seconds DECIMAL(8,2) NULL,
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_pred_model (model_version),
    INDEX idx_pred_kitchen (kitchen_id)
) ENGINE=InnoDB;

-- 7. Multi-Kitchen Selection Decision Records (Explainability & Grounding)
CREATE TABLE IF NOT EXISTS kitchen_selection_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    selected_kitchen_id INT NOT NULL,
    selection_strategy VARCHAR(100) NOT NULL,
    candidate_evaluations JSON NOT NULL,
    rationale TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (selected_kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Alter Existing Tables to Support Multi-Kitchen & Automated Priority
-- Add kitchen_id and operational fields if they don't already exist

DELIMITER $$
CREATE PROCEDURE sp_MigrateMultiKitchenColumns()
BEGIN
    -- stations: add kitchen_id
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='cloud_kitchen' AND TABLE_NAME='stations' AND COLUMN_NAME='kitchen_id') THEN
        ALTER TABLE stations ADD COLUMN kitchen_id INT DEFAULT 1;
    END IF;

    -- inventory: add kitchen_id
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='cloud_kitchen' AND TABLE_NAME='inventory' AND COLUMN_NAME='kitchen_id') THEN
        ALTER TABLE inventory ADD COLUMN kitchen_id INT DEFAULT 1;
    END IF;

    -- orders: add kitchen_id, promised_deadline, urgency_score, priority_rationale
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='cloud_kitchen' AND TABLE_NAME='orders' AND COLUMN_NAME='kitchen_id') THEN
        ALTER TABLE orders ADD COLUMN kitchen_id INT DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='cloud_kitchen' AND TABLE_NAME='orders' AND COLUMN_NAME='promised_deadline') THEN
        ALTER TABLE orders ADD COLUMN promised_deadline TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='cloud_kitchen' AND TABLE_NAME='orders' AND COLUMN_NAME='urgency_score') THEN
        ALTER TABLE orders ADD COLUMN urgency_score DECIMAL(5,2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='cloud_kitchen' AND TABLE_NAME='orders' AND COLUMN_NAME='priority_rationale') THEN
        ALTER TABLE orders ADD COLUMN priority_rationale VARCHAR(255) NULL;
    END IF;

    -- order_items: add model_version
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='cloud_kitchen' AND TABLE_NAME='order_items' AND COLUMN_NAME='model_version') THEN
        ALTER TABLE order_items ADD COLUMN model_version VARCHAR(50) DEFAULT 'v1.0-rf';
    END IF;
END $$
DELIMITER ;

CALL sp_MigrateMultiKitchenColumns();
DROP PROCEDURE sp_MigrateMultiKitchenColumns;
