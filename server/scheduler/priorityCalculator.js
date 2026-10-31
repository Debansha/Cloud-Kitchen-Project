/**
 * Automated Operational Priority & Urgency Calculator
 * ====================================================
 * Implements Operating System Least-Slack-Time (LST) and Dynamic Urgency
 * scheduling for kitchen orders.
 * 
 * Core Formula:
 *   Slack Time = (Promised Deadline - Current Time) - Total Predicted Prep Time
 *   Urgency Score = f(Slack Time, Wait Time Aging, Kitchen Congestion)
 * 
 * Features:
 * - Customers CANNOT choose priority; computed entirely by backend.
 * - Recognizes imminent delay risk (negative or minimal slack).
 * - Implements automated aging (+3 urgency points per minute waiting) to prevent starvation.
 * - Generates clear, human-readable rationale for each order's priority class.
 */

class PriorityCalculator {
  constructor(config = {}) {
    this.config = {
      defaultLeadTimeMinutes: config.defaultLeadTimeMinutes || 35, // default delivery promise
      agingBoostPerMinute: config.agingBoostPerMinute || 3.0,
      criticalSlackMinutes: config.criticalSlackMinutes || 5.0,
      moderateSlackMinutes: config.moderateSlackMinutes || 15.0
    };
  }

  /**
   * Calculate automated priority based on deadline, prep time estimate, and wait time
   * @param {Object} orderData { created_at, promised_deadline }
   * @param {Number} totalPredictedPrepSeconds Total cooking burst time needed
   * @param {Object} context { queueLength, stationLoad }
   * @returns {Object} Priority decision payload with rationale
   */
  calculatePriority(orderData, totalPredictedPrepSeconds, context = {}) {
    const now = Date.now();
    const createdAt = orderData.created_at ? new Date(orderData.created_at).getTime() : now;
    
    // Determine promised deadline (if not provided, default to order creation + 35 mins)
    let deadline;
    if (orderData.promised_deadline) {
      deadline = new Date(orderData.promised_deadline).getTime();
    } else {
      deadline = createdAt + (this.config.defaultLeadTimeMinutes * 60 * 1000);
    }

    const remainingTimeSeconds = Math.max(0, (deadline - now) / 1000);
    const remainingTimeMinutes = parseFloat((remainingTimeSeconds / 60).toFixed(1));
    const predictedPrepMinutes = parseFloat((totalPredictedPrepSeconds / 60).toFixed(1));

    // Slack time = Time Remaining - Predicted Prep Duration
    const slackSeconds = remainingTimeSeconds - totalPredictedPrepSeconds;
    const slackMinutes = parseFloat((slackSeconds / 60).toFixed(1));

    // Wait time so far
    const waitTimeSeconds = Math.max(0, (now - createdAt) / 1000);
    const waitMinutes = Math.floor(waitTimeSeconds / 60);
    const agingBoost = parseFloat((waitMinutes * this.config.agingBoostPerMinute).toFixed(1));

    // Base Urgency Score calculation (0 to 100 scale)
    let baseUrgency = 50;
    let rationale = '';

    if (slackMinutes <= 0) {
      // Imminent delay risk: Prep time exceeds or equals remaining deadline time!
      baseUrgency = Math.min(95, 88 + Math.abs(slackMinutes) * 1.5);
      rationale = `Critical: Prep duration (${predictedPrepMinutes}m) exceeds remaining deadline window (${remainingTimeMinutes}m). High risk of late delivery.`;
    } else if (slackMinutes <= this.config.criticalSlackMinutes) {
      // Very tight buffer (0 to 5 mins)
      const ratio = 1.0 - (slackMinutes / this.config.criticalSlackMinutes);
      baseUrgency = 75 + (ratio * 12);
      rationale = `Urgent: Tight slack buffer of only ${slackMinutes}m remaining before deadline commitment (${remainingTimeMinutes}m window).`;
    } else if (slackMinutes <= this.config.moderateSlackMinutes) {
      // Moderate buffer (5 to 15 mins)
      const ratio = 1.0 - ((slackMinutes - 5.0) / 10.0);
      baseUrgency = 55 + (ratio * 18);
      rationale = `Moderate: ${slackMinutes}m slack available against ${predictedPrepMinutes}m predicted prep duration.`;
    } else {
      // Comfortable buffer (>15 mins)
      baseUrgency = Math.max(15, 45 - (slackMinutes - 15.0) * 1.2);
      rationale = `Standard: Comfortable slack time of ${slackMinutes}m. Order is well ahead of deadline.`;
    }

    // Apply Aging to prevent process starvation
    let totalUrgency = Math.min(100, baseUrgency + agingBoost);
    if (agingBoost > 0) {
      rationale += ` (Aging boost +${agingBoost} pts applied for ${waitMinutes}m queue wait).`;
    }

    // Map Urgency Score to Discrete Priority Levels (P1 = Highest, P5 = Lowest)
    let priorityClass = 3;
    let priorityLabel = 'P3 - Standard';

    if (totalUrgency >= 85) {
      priorityClass = 1;
      priorityLabel = 'P1 - Critical (Imminent Delay)';
    } else if (totalUrgency >= 70) {
      priorityClass = 2;
      priorityLabel = 'P2 - High Urgency';
    } else if (totalUrgency >= 50) {
      priorityClass = 3;
      priorityLabel = 'P3 - Standard Normal';
    } else if (totalUrgency >= 35) {
      priorityClass = 4;
      priorityLabel = 'P4 - Flexible Window';
    } else {
      priorityClass = 5;
      priorityLabel = 'P5 - Advance Pre-order';
    }

    return {
      priority: priorityClass,
      priorityLabel,
      urgencyScore: parseFloat(totalUrgency.toFixed(1)),
      baseUrgency: parseFloat(baseUrgency.toFixed(1)),
      agingBoost,
      slackMinutes,
      remainingMinutes: remainingTimeMinutes,
      predictedPrepMinutes,
      deadlineISO: new Date(deadline).toISOString(),
      rationale
    };
  }
}

const priorityCalculatorInstance = new PriorityCalculator();
module.exports = priorityCalculatorInstance;
