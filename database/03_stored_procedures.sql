-- ==============================================================================
-- FILE 3: 03_stored_procedures.sql
-- DESCRIPTION: Stored procedures with robust error handling for operations.
-- DBMS CONCEPTS: Stored Procedures, Error Handling, Transactions, JSON parsing.
-- ==============================================================================

USE cloud_kitchen;

DELIMITER //

-- 1. sp_CheckInventory
CREATE PROCEDURE sp_CheckInventory(
    IN p_menu_item_id INT, 
    IN p_quantity INT, 
    OUT p_available BOOLEAN
)
BEGIN
    DECLARE v_insufficient INT DEFAULT 0;
    
    SELECT COUNT(*) INTO v_insufficient
    FROM menu_item_ingredients mii
    JOIN inventory i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = p_menu_item_id 
      AND i.quantity < (mii.quantity_needed * p_quantity);
      
    IF v_insufficient > 0 THEN
        SET p_available = FALSE;
    ELSE
        SET p_available = TRUE;
    END IF;
END //

-- 2. sp_PlaceOrder
CREATE PROCEDURE sp_PlaceOrder(
    IN p_customer_name VARCHAR(200), 
    IN p_priority INT, 
    IN p_items JSON
)
BEGIN
    DECLARE v_order_id INT;
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_items_count INT;
    DECLARE v_menu_item_id INT;
    DECLARE v_quantity INT;
    DECLARE v_price DECIMAL(8,2);
    DECLARE v_total_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_available BOOLEAN;
    
    -- Error handling
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction failed, rolled back.';
    END;
    
    START TRANSACTION;
    
    -- Create order
    INSERT INTO orders (customer_name, priority, status)
    VALUES (p_customer_name, p_priority, 'Pending');
    
    SET v_order_id = LAST_INSERT_ID();
    SET v_items_count = JSON_LENGTH(p_items);
    
    -- Loop through JSON items
    WHILE v_i < v_items_count DO
        SET v_menu_item_id = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].menu_item_id')));
        SET v_quantity = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].quantity')));
        
        -- Check inventory
        CALL sp_CheckInventory(v_menu_item_id, v_quantity, v_available);
        IF NOT v_available THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient inventory for one or more items';
        END IF;
        
        -- Deduct inventory
        UPDATE inventory i
        JOIN menu_item_ingredients mii ON i.id = mii.ingredient_id
        SET i.quantity = i.quantity - (mii.quantity_needed * v_quantity)
        WHERE mii.menu_item_id = v_menu_item_id;
        
        -- Get price
        SELECT price INTO v_price FROM menu_items WHERE id = v_menu_item_id;
        
        -- Insert order_item
        INSERT INTO order_items (order_id, menu_item_id, quantity)
        VALUES (v_order_id, v_menu_item_id, v_quantity);
        
        SET v_total_amount = v_total_amount + (v_price * v_quantity);
        SET v_i = v_i + 1;
    END WHILE;
    
    -- Update total amount
    UPDATE orders SET total_amount = v_total_amount WHERE id = v_order_id;
    
    COMMIT;
END //

-- 3. sp_AssignToStation
CREATE PROCEDURE sp_AssignToStation(
    IN p_order_item_id INT, 
    IN p_station_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    UPDATE order_items 
    SET status = 'Assigned', assigned_station_id = p_station_id 
    WHERE id = p_order_item_id;
    
    UPDATE stations 
    SET status = 'Busy' 
    WHERE id = p_station_id;
    
    INSERT INTO preparation_logs (order_item_id, station_id, event_type)
    VALUES (p_order_item_id, p_station_id, 'Assigned');
    
    COMMIT;
END //

-- 4. sp_StartPreparation
CREATE PROCEDURE sp_StartPreparation(
    IN p_order_item_id INT
)
BEGIN
    DECLARE v_station_id INT;
    
    SELECT assigned_station_id INTO v_station_id FROM order_items WHERE id = p_order_item_id;
    
    UPDATE order_items 
    SET status = 'Preparing', started_at = CURRENT_TIMESTAMP 
    WHERE id = p_order_item_id;
    
    INSERT INTO preparation_logs (order_item_id, station_id, event_type)
    VALUES (p_order_item_id, v_station_id, 'Started');
END //

-- 5. sp_CompleteOrderItem
CREATE PROCEDURE sp_CompleteOrderItem(
    IN p_order_item_id INT, 
    IN p_actual_prep_time DECIMAL(5,2)
)
BEGIN
    DECLARE v_station_id INT;
    DECLARE v_order_id INT;
    DECLARE v_pending_items INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    SELECT assigned_station_id, order_id INTO v_station_id, v_order_id 
    FROM order_items WHERE id = p_order_item_id;
    
    UPDATE order_items 
    SET status = 'Ready', 
        actual_prep_time = p_actual_prep_time, 
        completed_at = CURRENT_TIMESTAMP 
    WHERE id = p_order_item_id;
    
    IF v_station_id IS NOT NULL THEN
        UPDATE stations SET status = 'Available' WHERE id = v_station_id;
    END IF;
    
    INSERT INTO preparation_logs (order_item_id, station_id, event_type)
    VALUES (p_order_item_id, v_station_id, 'Completed');
    
    -- Check if all items in order are ready
    SELECT COUNT(*) INTO v_pending_items 
    FROM order_items 
    WHERE order_id = v_order_id AND status != 'Ready' AND status != 'Cancelled';
    
    IF v_pending_items = 0 THEN
        UPDATE orders 
        SET status = 'Ready', completed_at = CURRENT_TIMESTAMP 
        WHERE id = v_order_id;
    END IF;
    
    COMMIT;
END //

-- 6. sp_RestockInventory
CREATE PROCEDURE sp_RestockInventory(
    IN p_ingredient_id INT, 
    IN p_quantity DECIMAL(10,2)
)
BEGIN
    UPDATE inventory 
    SET quantity = quantity + p_quantity, 
        last_restocked = CURRENT_TIMESTAMP 
    WHERE id = p_ingredient_id;
END //

DELIMITER ;
