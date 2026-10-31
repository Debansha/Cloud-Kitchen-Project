-- ==============================================================================
-- FILE 7: 07_concurrency.sql
-- DESCRIPTION: Concurrency and locking examples.
-- DBMS CONCEPTS: Race Conditions, Pessimistic Locking, Deadlocks, Optimistic Locking.
-- ==============================================================================

USE cloud_kitchen;

-- ==============================================================================
-- 1. RACE CONDITION DEMO (Conceptual)
-- ==============================================================================
-- Session A and Session B both read inventory = 10.
-- Session A wants to deduct 1. Session B wants to deduct 2.
-- Both calculate new value in app logic and UPDATE. 
-- Whoever writes last overwrites the other, causing lost updates.

-- ==============================================================================
-- 2. SOLUTION: PESSIMISTIC LOCKING (SELECT ... FOR UPDATE)
-- ==============================================================================
-- Session A
START TRANSACTION;
-- Locks the row so Session B must wait
SELECT quantity FROM inventory WHERE id = 1 FOR UPDATE;
UPDATE inventory SET quantity = quantity - 1 WHERE id = 1;
COMMIT;

-- ==============================================================================
-- 3. DEADLOCK SCENARIO (Conceptual)
-- ==============================================================================
-- Session A locks row 1
-- Session B locks row 2
-- Session A tries to lock row 2 (waits for B)
-- Session B tries to lock row 1 (waits for A)
-- MySQL detects this and aborts one transaction.

-- ==============================================================================
-- 4. DEADLOCK RESOLUTION
-- ==============================================================================
-- Always acquire locks in a consistent order (e.g., sort by ID before locking).
-- If updating ingredients 1 and 2, always lock 1 then 2.
START TRANSACTION;
SELECT * FROM inventory WHERE id = 1 FOR UPDATE;
SELECT * FROM inventory WHERE id = 2 FOR UPDATE;
COMMIT;

-- ==============================================================================
-- 5. OPTIMISTIC LOCKING (Conceptual Note)
-- ==============================================================================
-- Instead of locking, add a `version` column to the table.
-- SELECT quantity, version FROM inventory WHERE id = 1;
-- UPDATE inventory SET quantity = new_qty, version = version + 1 
-- WHERE id = 1 AND version = old_version;
-- If 0 rows affected, another session updated it, so retry.
