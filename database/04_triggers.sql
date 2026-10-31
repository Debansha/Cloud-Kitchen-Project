-- ==============================================================================
-- FILE 4: 04_triggers.sql
-- DESCRIPTION: Database triggers for automated actions and validation.
-- DBMS CONCEPTS: Triggers (AFTER UPDATE, BEFORE INSERT).
-- ==============================================================================

USE cloud_kitchen;

DELIMITER //

-- 1. trg_after_order_item_status_update
CREATE TRIGGER trg_after_order_item_status_update
AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        -- Check if status is a valid event_type for preparation_logs
        IF NEW.status IN ('Queued','Assigned','Started','Completed','Cancelled') THEN
            INSERT INTO preparation_logs (order_item_id, station_id, event_type, details)
            VALUES (NEW.id, NEW.assigned_station_id, NEW.status, CONCAT('Status changed to ', NEW.status));
        ELSEIF NEW.status = 'Ready' THEN
            -- Map Ready to Completed
            INSERT INTO preparation_logs (order_item_id, station_id, event_type, details)
            VALUES (NEW.id, NEW.assigned_station_id, 'Completed', CONCAT('Status changed to ', NEW.status));
        ELSEIF NEW.status = 'Preparing' THEN
            -- Map Preparing to Started
            INSERT INTO preparation_logs (order_item_id, station_id, event_type, details)
            VALUES (NEW.id, NEW.assigned_station_id, 'Started', CONCAT('Status changed to ', NEW.status));
        END IF;
    END IF;
END //

-- 2. trg_after_inventory_update
CREATE TRIGGER trg_after_inventory_update
AFTER UPDATE ON inventory
FOR EACH ROW
BEGIN
    IF NEW.quantity < NEW.reorder_level AND OLD.quantity >= NEW.reorder_level THEN
        INSERT INTO alerts (message)
        VALUES (CONCAT('Low inventory alert for ', NEW.ingredient_name, '. Current quantity: ', NEW.quantity));
    END IF;
END //

-- 3. trg_before_order_insert
CREATE TRIGGER trg_before_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.priority < 1 OR NEW.priority > 5 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Priority must be between 1 and 5';
    END IF;
END //

DELIMITER ;
