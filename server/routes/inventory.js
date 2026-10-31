const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * @route GET /
 * @description List all inventory items
 */
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT *, 
            (quantity <= reorder_level) as needs_reorder 
            FROM inventory 
            ORDER BY ingredient_name ASC
        `);
        res.json({ success: true, data: rows, message: 'Inventory fetched successfully.' });
    } catch (error) {
        next(error);
    }
});

/**
 * @route PATCH /:id/restock
 * @description Restock inventory item
 */
router.patch('/:id/restock', async (req, res, next) => {
    try {
        const { quantity } = req.body;
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid quantity.' });
        }

        const [result] = await pool.execute(
            'UPDATE inventory SET quantity = quantity + ?, last_restocked = CURRENT_TIMESTAMP WHERE id = ?',
            [quantity, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }

        const io = req.app.get('io');
        if (io) io.emit('inventory-updated', { inventoryId: req.params.id, added: quantity });

        res.json({ success: true, data: null, message: 'Inventory restocked successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
