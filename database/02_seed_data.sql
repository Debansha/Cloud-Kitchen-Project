-- ==============================================================================
-- FILE 2: 02_seed_data.sql
-- DESCRIPTION: Seed data for the AI-Driven Cloud Kitchen.
-- DBMS CONCEPTS: DML, INSERT, Multi-row Inserts.
-- ==============================================================================

USE cloud_kitchen;

-- 1. Insert Stations
INSERT INTO stations (name, type, status, capacity) VALUES
('Grill Station A', 'Grill', 'Available', 2),
('Grill Station B', 'Grill', 'Available', 2),
('Deep Fryer', 'Fryer', 'Available', 4),
('Pizza Oven', 'Oven', 'Available', 3),
('Salad Bar', 'Salad_Bar', 'Available', 2),
('Assembly Line', 'Assembly', 'Available', 5);

-- 2. Insert Inventory
INSERT INTO inventory (ingredient_name, quantity, unit, reorder_level) VALUES
('Buns', 500, 'pcs', 100),
('Beef Patties', 300, 'pcs', 50),
('Lettuce', 20, 'kg', 5),
('Tomato', 30, 'kg', 5),
('Cheese Slices', 400, 'pcs', 100),
('Pizza Dough', 200, 'pcs', 30),
('Mozzarella', 50, 'kg', 10),
('Pepperoni', 30, 'kg', 5),
('Fries', 150, 'kg', 20),
('Frying Oil', 100, 'L', 20),
('Chicken Breast', 100, 'kg', 15),
('Bread', 200, 'pcs', 40),
('Mayo', 20, 'kg', 5),
('Tomato Sauce', 40, 'L', 10),
('Onions', 30, 'kg', 10),
('Mushrooms', 15, 'kg', 5),
('Croutons', 10, 'kg', 2),
('Caesar Dressing', 15, 'L', 3),
('Bacon', 20, 'kg', 5),
('Ice Cream', 50, 'L', 10);

-- 3. Insert Menu Items
INSERT INTO menu_items (name, category, base_prep_time_minutes, station_type, price, is_available) VALUES
('Classic Burger', 'Burger', 8.50, 'Grill', 12.99, TRUE),
('Cheeseburger', 'Burger', 9.00, 'Grill', 14.50, TRUE),
('Chicken Sandwich', 'Burger', 10.00, 'Grill', 13.99, TRUE),
('Pepperoni Pizza', 'Pizza', 15.00, 'Oven', 18.99, TRUE),
('Margherita Pizza', 'Pizza', 14.00, 'Oven', 16.99, TRUE),
('French Fries', 'Sides', 5.00, 'Fryer', 4.99, TRUE),
('Onion Rings', 'Sides', 6.00, 'Fryer', 5.99, TRUE),
('Caesar Salad', 'Salad', 4.00, 'Salad_Bar', 9.99, TRUE),
('Garden Salad', 'Salad', 3.50, 'Salad_Bar', 8.99, TRUE),
('Vanilla Sundae', 'Dessert', 3.00, 'Assembly', 5.50, TRUE),
('Chocolate Shake', 'Beverage', 4.00, 'Beverage', 6.00, TRUE),
('Cola', 'Beverage', 1.00, 'Beverage', 2.50, TRUE),
('BBQ Bacon Burger', 'Burger', 11.00, 'Grill', 16.50, TRUE),
('Mushroom Swiss Burger', 'Burger', 10.50, 'Grill', 15.99, TRUE),
('Veggie Pizza', 'Pizza', 16.00, 'Oven', 17.50, TRUE);

-- 4. Insert Menu Item Ingredients (Mappings)
-- Classic Burger
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed) VALUES
(1, 1, 1), (1, 2, 1), (1, 3, 0.05), (1, 4, 0.05), (1, 13, 0.02);
-- Cheeseburger
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed) VALUES
(2, 1, 1), (2, 2, 1), (2, 5, 1), (2, 3, 0.05), (2, 4, 0.05);
-- Pepperoni Pizza
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed) VALUES
(4, 6, 1), (4, 14, 0.2), (4, 7, 0.25), (4, 8, 0.1);
-- French Fries
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed) VALUES
(6, 9, 0.3), (6, 10, 0.05);

-- 5. Insert Sample Orders
INSERT INTO orders (customer_name, priority, status, total_amount, created_at) VALUES
('John Doe', 3, 'Delivered', 27.97, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Jane Smith', 5, 'Ready', 18.99, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('Alice Johnson', 1, 'Preparing', 35.50, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('Bob Brown', 3, 'Pending', 12.99, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
('Charlie Davis', 4, 'Queued', 42.00, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
('Eve Wilson', 2, 'Cancelled', 14.50, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('Frank Thomas', 3, 'Preparing', 25.00, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
('Grace Lee', 3, 'Queued', 30.00, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
('Henry White', 5, 'Pending', 45.99, DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
('Ivy Green', 1, 'Delivered', 16.99, DATE_SUB(NOW(), INTERVAL 4 HOUR));

-- 6. Insert Order Items
INSERT INTO order_items (order_id, menu_item_id, quantity, status, assigned_station_id) VALUES
(1, 1, 1, 'Ready', 1), (1, 6, 1, 'Ready', 3), (1, 12, 1, 'Ready', NULL),
(2, 4, 1, 'Ready', 4),
(3, 2, 2, 'Preparing', 2), (3, 7, 1, 'Assigned', 3),
(4, 1, 1, 'Queued', NULL),
(5, 4, 1, 'Queued', NULL), (5, 5, 1, 'Queued', NULL), (5, 12, 2, 'Queued', NULL),
(6, 2, 1, 'Cancelled', NULL),
(7, 13, 1, 'Preparing', 1), (7, 8, 1, 'Preparing', 5),
(8, 14, 1, 'Queued', NULL), (8, 6, 2, 'Queued', NULL),
(9, 4, 2, 'Queued', NULL), (9, 9, 1, 'Queued', NULL),
(10, 5, 1, 'Ready', 4);
