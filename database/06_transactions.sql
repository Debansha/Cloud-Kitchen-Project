-- ==============================================================================
-- FILE 6: 06_transactions.sql
-- DESCRIPTION: Demonstrative transaction examples for ACID properties.
-- DBMS CONCEPTS: Transactions, ACID (Atomicity, Consistency, Isolation, Durability),
--                SAVEPOINT, Isolation Levels.
-- ==============================================================================

USE cloud_kitchen;

-- ==============================================================================
-- 1. SUCCESSFUL ORDER PLACEMENT (ATOMICITY & DURABILITY)
-- ==============================================================================
-- Either all parts of the order (order record, items, inventory deduction) 
-- succeed, or none do.
START TRANSACTION;

INSERT INTO orders (customer_name, priority, total_amount) VALUES ('Test User', 3, 25.00);
SET @new_order_id = LAST_INSERT_ID();

INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (@new_order_id, 1, 1);
-- Assuming ingredient id 1 is buns, we deduct one
UPDATE inventory SET quantity = quantity - 1 WHERE id = 1;

COMMIT;
-- Changes are now permanently saved (Durability).

-- ==============================================================================
-- 2. FAILED ORDER (CONSISTENCY)
-- ==============================================================================
-- Ensures database remains in a consistent state. If we try to deduct inventory
-- that doesn't exist, we roll back to prevent negative stock.
START TRANSACTION;

INSERT INTO orders (customer_name, priority) VALUES ('Fail User', 2);
SET @fail_order_id = LAST_INSERT_ID();

-- Simulate checking inventory and finding it insufficient
-- If an error occurs, we rollback:
ROLLBACK;
-- Order is not saved, preserving consistent inventory state.

-- ==============================================================================
-- 3. SAVEPOINT EXAMPLE
-- ==============================================================================
START TRANSACTION;
INSERT INTO orders (customer_name, priority) VALUES ('Savepoint User', 3);
SET @sp_order = LAST_INSERT_ID();

INSERT INTO order_items (order_id, menu_item_id) VALUES (@sp_order, 1);

SAVEPOINT item_one_added;

-- Attempt adding second item
INSERT INTO order_items (order_id, menu_item_id) VALUES (@sp_order, 2);
-- Imagine second item fails inventory check, we can rollback just that part:
ROLLBACK TO SAVEPOINT item_one_added;

COMMIT;

-- ==============================================================================
-- 4. SET TRANSACTION ISOLATION LEVEL EXAMPLES (ISOLATION)
-- ==============================================================================

-- READ UNCOMMITTED: Lowest level, allows dirty reads.
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
START TRANSACTION;
SELECT * FROM inventory WHERE id = 1; 
COMMIT;

-- READ COMMITTED: Prevents dirty reads, allows non-repeatable reads.
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT * FROM inventory WHERE id = 1;
COMMIT;

-- REPEATABLE READ (InnoDB Default): Prevents dirty and non-repeatable reads.
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT * FROM inventory WHERE id = 1;
COMMIT;

-- SERIALIZABLE: Highest level, completely isolates by placing locks, prevents phantom reads.
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
START TRANSACTION;
SELECT * FROM inventory WHERE id = 1;
COMMIT;
