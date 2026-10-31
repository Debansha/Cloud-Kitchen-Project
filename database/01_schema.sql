-- ==============================================================================
-- FILE 1: 01_schema.sql
-- DESCRIPTION: Database schema for the AI-Driven Cloud Kitchen.
-- DBMS CONCEPTS: DDL, Tables, Data Types, Constraints (PK, FK, UNIQUE, CHECK), 
--                Enums, Default Values, Indexes.
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS cloud_kitchen
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE cloud_kitchen;

-- Create alerts table for triggers
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 1. stations
CREATE TABLE IF NOT EXISTS stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('Grill','Fryer','Oven','Salad_Bar','Assembly','Beverage') NOT NULL,
    status ENUM('Available','Busy','Offline') DEFAULT 'Available',
    capacity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. menu_items
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category ENUM('Burger','Pizza','Sides','Salad','Dessert','Beverage') NOT NULL,
    base_prep_time_minutes DECIMAL(5,2) NOT NULL,
    station_type ENUM('Grill','Fryer','Oven','Salad_Bar','Assembly','Beverage') NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. inventory
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name VARCHAR(150) UNIQUE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    reorder_level DECIMAL(10,2) DEFAULT 10,
    last_restocked TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. menu_item_ingredients
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_needed DECIMAL(8,2) NOT NULL,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES inventory(id) ON DELETE CASCADE,
    UNIQUE (menu_item_id, ingredient_id)
) ENGINE=InnoDB;

-- 5. orders
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(200) NOT NULL,
    priority INT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status ENUM('Pending','Queued','Preparing','Ready','Delivered','Cancelled') DEFAULT 'Pending',
    total_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB;

-- 6. order_items
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT DEFAULT 1,
    predicted_prep_time DECIMAL(5,2) NULL,
    actual_prep_time DECIMAL(5,2) NULL,
    status ENUM('Queued','Assigned','Preparing','Ready','Cancelled') DEFAULT 'Queued',
    assigned_station_id INT NULL,
    started_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
    FOREIGN KEY (assigned_station_id) REFERENCES stations(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. preparation_logs
CREATE TABLE IF NOT EXISTS preparation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id INT NOT NULL,
    station_id INT NULL,
    event_type ENUM('Created','Queued','Assigned','Started','Completed','Cancelled') NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8. scheduling_metrics
CREATE TABLE IF NOT EXISTS scheduling_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    algorithm_type ENUM('FCFS','SJF','Priority') NOT NULL,
    order_id INT NOT NULL,
    order_item_id INT NULL,
    wait_time_seconds DECIMAL(10,2) NOT NULL,
    turnaround_time_seconds DECIMAL(10,2) NOT NULL,
    response_time_seconds DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_status ON order_items(status);
CREATE INDEX idx_order_items_assigned_station ON order_items(assigned_station_id);
CREATE INDEX idx_scheduling_metrics_algo ON scheduling_metrics(algorithm_type);
CREATE INDEX idx_preparation_logs_order_item ON preparation_logs(order_item_id);
