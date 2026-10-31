const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * @route GET /
 * @description List all stations with current assigned items count
 */
router.get('/', async (req, res, next) => {
    try {
        const query = `
            SELECT s.id, s.name, s.type, s.status, COUNT(oi.id) as assigned_items_count
            FROM stations s
            LEFT JOIN preparation_logs pl ON s.id = pl.station_id
            LEFT JOIN order_items oi ON pl.order_item_id = oi.id AND oi.status IN ('Assigned', 'Preparing')
            GROUP BY s.id
        `;
        const [rows] = await pool.execute(query);
        res.json({ success: true, data: rows, message: 'Stations fetched successfully.' });
    } catch (error) {
        next(error);
    }
});

/**
 * @route PATCH /:id/status
 * @description Toggle station status (Available/Offline)
 */
router.patch('/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Available', 'Offline'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        if (status === 'Available') {
            const [station] = await pool.execute('SELECT status FROM stations WHERE id = ?', [req.params.id]);
            if (station.length > 0 && station[0].status === 'Busy') {
                return res.status(400).json({ success: false, message: 'Cannot set a busy station to Available.' });
            }
        }

        const [result] = await pool.execute('UPDATE stations SET status = ? WHERE id = ?', [status, req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Station not found.' });
        }

        const io = req.app.get('io');
        if (io) io.emit('station-updated', { stationId: req.params.id, status });

        res.json({ success: true, data: null, message: 'Station status updated.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
