/**
 * Multi-Cloud-Kitchen Management & Orchestration Routes
 * =====================================================
 * Manages kitchen nodes, dynamic staffing levels, shift allocations,
 * and traceable routing audit logs.
 */

const express = require('express');
const router = express.Router();
const kitchenOrchestrator = require('../orchestrator/kitchenSelector');

/**
 * @route GET /api/kitchens
 * @description List all cloud kitchens with operational stats & active staff
 */
router.get('/', (req, res) => {
  try {
    const kitchens = kitchenOrchestrator.getKitchens().map(k => ({
      ...k,
      active_orders: kitchenOrchestrator.activeKitchenWorkload[k.id] || 0
    }));

    res.json({
      success: true,
      data: kitchens,
      message: 'Cloud kitchens retrieved successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route PATCH /api/kitchens/:id/staff
 * @description Adjust active kitchen staff count dynamically (demonstrates staffing effect)
 */
router.patch('/:id/staff', (req, res) => {
  try {
    const kitchenId = parseInt(req.params.id);
    const count = parseInt(req.body.count || req.body.active_staff_count);

    if (isNaN(count) || count < 1 || count > 20) {
      return res.status(400).json({
        success: false,
        message: 'Active staff count must be an integer between 1 and 20.'
      });
    }

    const updatedKitchen = kitchenOrchestrator.setKitchenStaff(kitchenId, count);
    if (!updatedKitchen) {
      return res.status(404).json({ success: false, message: 'Kitchen not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('kitchen-updated', {
        kitchenId,
        staffCount: count,
        kitchen: updatedKitchen
      });
    }

    res.json({
      success: true,
      data: updatedKitchen,
      message: `Updated ${updatedKitchen.name} staffing to ${count} active personnel.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/kitchens/decisions
 * @description Retrieve recent multi-kitchen routing decisions with evaluation scores
 */
router.get('/decisions', (req, res) => {
  try {
    const decisions = kitchenOrchestrator.getRecentDecisions();
    res.json({
      success: true,
      data: decisions,
      message: 'Kitchen routing decisions retrieved.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/kitchens/evaluate
 * @description Simulate kitchen selection for given items and target delivery deadline
 */
router.post('/evaluate', async (req, res) => {
  try {
    const items = req.body.items || [];
    const targetDeadlineMinutes = parseInt(req.body.targetDeadlineMinutes || 35);
    const decision = await kitchenOrchestrator.selectKitchen(items, targetDeadlineMinutes);

    res.json({
      success: true,
      data: decision,
      message: 'Kitchen routing evaluation completed.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
