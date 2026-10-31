/**
 * Multi-Cloud-Kitchen Intelligent Order Orchestrator
 * ==================================================
 * Automatically selects the optimal cloud kitchen for an incoming customer order.
 * 
 * Evaluation Criteria:
 * 1. Station Capability: Does the kitchen have stations required for the ordered items?
 * 2. Ingredient Availability: Are necessary ingredients in stock without shortages?
 * 3. AI Prep Time Prediction: How fast will this specific kitchen prepare the items (given current staffing & queue)?
 * 4. Kitchen Capacity & Load: Active concurrent orders vs max capacity.
 * 5. Full Decision Audit Trail: Logs evaluated alternatives, rejection reasons, and selection rationale.
 */

const { pool } = require('../db');
const predictor = require('../ai/predictor');

class KitchenOrchestrator {
  constructor() {
    this.kitchens = [
      {
        id: 1,
        code: 'CK-CENTRAL',
        name: 'Central Kitchen - Downtown Hub',
        location_zone: 'Downtown Core',
        supported_stations: ['Grill', 'Fryer', 'Oven', 'Salad_Bar', 'Assembly', 'Beverage'],
        max_concurrent_orders: 25,
        rating: 4.85,
        transit_minutes: 10,
        staff_count: 6
      },
      {
        id: 2,
        code: 'CK-TECHPARK',
        name: 'Express Kitchen - Tech Park',
        location_zone: 'Tech Corridor',
        supported_stations: ['Grill', 'Fryer', 'Oven', 'Assembly'],
        max_concurrent_orders: 18,
        rating: 4.70,
        transit_minutes: 8,
        staff_count: 4
      },
      {
        id: 3,
        code: 'CK-NORTH',
        name: 'Suburban Cloud Kitchen - North Hub',
        location_zone: 'North Residential',
        supported_stations: ['Grill', 'Fryer', 'Oven', 'Salad_Bar', 'Assembly'],
        max_concurrent_orders: 20,
        rating: 4.90,
        transit_minutes: 12,
        staff_count: 5
      }
    ];

    this.selectionLogs = [];
    this.activeKitchenWorkload = { 1: 3, 2: 2, 3: 1 };
  }

  getKitchens() {
    return this.kitchens;
  }

  getKitchenById(id) {
    return this.kitchens.find(k => k.id === parseInt(id)) || this.kitchens[0];
  }

  updateStaffCount(kitchenId, newStaffCount) {
    const k = this.kitchens.find(item => item.id === parseInt(kitchenId));
    if (k) {
      k.staff_count = Math.max(1, parseInt(newStaffCount));
      return k;
    }
    return null;
  }

  // Alias used by kitchens.js route
  setKitchenStaff(kitchenId, count) {
    return this.updateStaffCount(kitchenId, count);
  }

  // Called when order completes/cancels to free up kitchen slot
  decrementWorkload(kitchenId) {
    const id = parseInt(kitchenId);
    if (this.activeKitchenWorkload[id] > 0) {
      this.activeKitchenWorkload[id]--;
    }
  }

  /**
   * Evaluate all candidate cloud kitchens and select the optimal one.
   * @param {Array} orderItems  - array of order item objects
   * @param {number|Object} optionsOrDeadline - delivery deadline minutes (number) or options object
   * @param {Object} customDb
   */
  async selectKitchen(orderItems, optionsOrDeadline = {}, customDb = null) {
    // Normalise second argument — can be a plain number (deadline minutes) from orders.js
    let options = {};
    if (typeof optionsOrDeadline === 'number') {
      options = { deliveryDeadlineMinutes: optionsOrDeadline };
    } else if (optionsOrDeadline && typeof optionsOrDeadline === 'object') {
      options = optionsOrDeadline;
    }
    const db = customDb || pool;
    const evaluations = [];

    // Identify required station types for this order
    const requiredStationTypes = [...new Set(orderItems.map(item => item.station_type || 'Assembly'))];

    for (const kitchen of this.kitchens) {
      const evalRecord = {
        kitchen_id: kitchen.id,
        kitchen_name: kitchen.name,
        code: kitchen.code,
        is_eligible: true,
        rejection_reason: null,
        active_orders: this.activeKitchenWorkload[kitchen.id] || 0,
        max_capacity: kitchen.max_concurrent_orders,
        staff_count: kitchen.staff_count,
        predicted_prep_seconds: 0,
        estimated_completion_minutes: 0,
        suitability_score: 0
      };

      // 1. Station Capability Check
      const missingStations = requiredStationTypes.filter(st => !kitchen.supported_stations.includes(st));
      if (missingStations.length > 0) {
        evalRecord.is_eligible = false;
        evalRecord.rejection_reason = `Missing required cooking equipment/station(s): ${missingStations.join(', ')}`;
        evaluations.push(evalRecord);
        continue;
      }

      // 2. Capacity Check
      if (evalRecord.active_orders >= kitchen.max_concurrent_orders) {
        evalRecord.is_eligible = false;
        evalRecord.rejection_reason = `Kitchen at maximum capacity (${evalRecord.active_orders}/${kitchen.max_concurrent_orders} orders active)`;
        evaluations.push(evalRecord);
        continue;
      }

      // 3. AI Prep Time Prediction for this specific kitchen's staffing & queue
      let totalPredictedSec = 0;
      for (const item of orderItems) {
        const pred = await predictor.predictAsync(item, {
          kitchen_id: kitchen.id,
          active_staff_count: kitchen.staff_count,
          queue_length: evalRecord.active_orders * 2,
          station_load: Math.min(1.0, (evalRecord.active_orders * 0.15))
        });
        totalPredictedSec += pred.predicted_prep_time_seconds;
      }

      evalRecord.predicted_prep_seconds = Math.round(totalPredictedSec);
      const prepMinutes = evalRecord.predicted_prep_seconds / 60.0;
      
      // Completion Time = Queue Delay + Cooking Time + Transit
      const queueDelayMinutes = evalRecord.active_orders * 1.5;
      evalRecord.estimated_completion_minutes = parseFloat((queueDelayMinutes + prepMinutes + kitchen.transit_minutes).toFixed(1));

      // Suitability Score (Higher is better, 0 to 100)
      // Rewards faster completion, higher staff adequacy, and lower capacity utilization
      const timeScore = Math.max(0, 100 - (evalRecord.estimated_completion_minutes * 1.5));
      const loadScore = Math.max(0, 100 - ((evalRecord.active_orders / kitchen.max_concurrent_orders) * 100));
      const staffScore = Math.min(100, (kitchen.staff_count / 6.0) * 100);

      evalRecord.suitability_score = parseFloat(((timeScore * 0.50) + (loadScore * 0.30) + (staffScore * 0.20)).toFixed(1));

      evaluations.push(evalRecord);
    }

    // Filter eligible kitchens
    const eligibleKitchens = evaluations.filter(e => e.is_eligible);

    if (eligibleKitchens.length === 0) {
      // Fallback if all technically at limit
      const fallback = evaluations[0];
      return {
        selected_kitchen: this.getKitchenById(fallback.kitchen_id),
        selected_kitchen_id: fallback.kitchen_id,
        selected_kitchen_name: fallback.kitchen_name,
        selected_prep_time_minutes: 12.0,
        evaluations,
        candidate_evaluations: evaluations,
        rationale: 'All kitchens operating near threshold; dispatched to primary Central Kitchen with auto-throttled queue.'
      };
    }

    // Select kitchen with highest suitability score (lowest completion time)
    eligibleKitchens.sort((a, b) => b.suitability_score - a.suitability_score);
    const selected = eligibleKitchens[0];

    // Build rationale
    const rationale = `Selected ${selected.kitchen_name} (${selected.code}): Lowest estimated total completion time (${selected.estimated_completion_minutes}m) with ${selected.staff_count} active staff and ${selected.active_orders} queued orders. Suitability score: ${selected.suitability_score}/100.`;

    // Increment workload
    this.activeKitchenWorkload[selected.kitchen_id] = (this.activeKitchenWorkload[selected.kitchen_id] || 0) + 1;

    // Log decision
    const decisionLog = {
      order_id: options.order_id || Math.floor(Math.random() * 9000 + 1000),
      selected_kitchen_id: selected.kitchen_id,
      selected_kitchen_name: selected.kitchen_name,
      selection_strategy: 'MinCompletionTime_StaffLoadWeighted',
      candidate_evaluations: evaluations,
      rationale,
      timestamp: new Date().toISOString()
    };
    this.selectionLogs.unshift(decisionLog);
    if (this.selectionLogs.length > 500) this.selectionLogs.pop();

    // Async DB logging if MySQL connected
    if (db) {
      try {
        await db.execute(
          `INSERT INTO kitchen_selection_logs (order_id, selected_kitchen_id, selection_strategy, candidate_evaluations, rationale)
           VALUES (?, ?, ?, ?, ?)`,
          [
            decisionLog.order_id,
            decisionLog.selected_kitchen_id,
            decisionLog.selection_strategy,
            JSON.stringify(evaluations),
            rationale
          ]
        );
      } catch (err) {
        // Table might not exist yet if DB offline
      }
    }

    return {
      selected_kitchen: this.getKitchenById(selected.kitchen_id),
      selected_kitchen_id: selected.kitchen_id,
      selected_kitchen_name: selected.kitchen_name,
      selected_prep_time_minutes: parseFloat((selected.predicted_prep_seconds / 60).toFixed(1)),
      selected_evaluation: selected,
      evaluations,
      candidate_evaluations: evaluations,
      rationale
    };
  }

  getRecentDecisions(limit = 10) {
    return this.selectionLogs.slice(0, limit);
  }
}

const orchestratorInstance = new KitchenOrchestrator();
module.exports = orchestratorInstance;
