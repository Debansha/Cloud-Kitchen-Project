/**
 * Scheduler Engine (Main Orchestrator)
 * 
 * OS Concept Mapping:
 * - CPU Scheduler: Decides which process in the ready queue gets the CPU next.
 * - Dispatcher: Gives control of the CPU to the process selected by the short-term scheduler (assigning job to station).
 * - Multi-Queue System: Here we compare three different scheduling algorithms (FCFS, SJF, Priority)
 *   simultaneously on the same workload.
 */

const ProcessQueue = require('./processQueue');
const FCFSScheduler = require('./fcfs');
const SJFScheduler = require('./sjf');
const PriorityScheduler = require('./priority');
const PrepTimePredictor = require('../ai/predictor');

const { pool } = require('../db');

class SchedulerEngine {
  constructor() {
    this.activeQueue = new ProcessQueue();
    this.fcfsScheduler = new FCFSScheduler();
    this.sjfScheduler = new SJFScheduler();
    this.priorityScheduler = new PriorityScheduler();
    this.predictor = new PrepTimePredictor();
    this.comparisonResults = null;
    this.ganttData = null;
    this.stations = [];
  }

  async init(customDb) {
    const db = customDb || pool;
    try {
      const [rows] = await db.execute("SELECT * FROM stations WHERE status != ?", ['Offline']);
      this.stations = rows.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        availableAt: 0
      }));
    } catch (err) {
      console.warn("Could not load stations from DB. Initializing with empty list.", err.message);
    }
  }

  async processNewOrder(orderItems, orderPriority, io, customDb) {
    const db = customDb || pool;

    for (const item of orderItems) {
      const currentState = {
        queueLength: this.activeQueue.size(),
        stationLoad: 0.5,
        hourOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };
      
      const menuItem = {
        base_prep_time_minutes: item.base_prep_time_minutes || item.preparation_time || 5, 
        category: item.category || 'Standard',
        station_type: item.station_type || 'Assembly'
      };

      const burstTimeSeconds = this.predictor.predict(menuItem, currentState);

      const job = {
        id: item.order_item_id || item.id,
        orderId: item.order_id,
        name: item.menu_item_name || item.name || 'Food Item',
        arrivalTime: Date.now() / 1000, 
        burstTime: burstTimeSeconds,
        priority: orderPriority || 3,
        stationType: menuItem.station_type
      };
      
      this.activeQueue.enqueue(job);
    }

    if (!this.stations.length && db) {
      try {
        const [rows] = await db.execute("SELECT * FROM stations WHERE status != ?", ['Offline']);
        this.stations = rows.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          availableAt: 0
        }));
      } catch (err) {
        console.warn("DB not ready", err.message);
      }
    }

    const queueData = this.activeQueue.getAll();
    
    const fcfsResult = this.fcfsScheduler.schedule(
      JSON.parse(JSON.stringify(queueData)),
      JSON.parse(JSON.stringify(this.stations))
    );
    
    const sjfResult = this.sjfScheduler.schedule(
      JSON.parse(JSON.stringify(queueData)),
      JSON.parse(JSON.stringify(this.stations))
    );
    
    const priorityResult = this.priorityScheduler.schedule(
      JSON.parse(JSON.stringify(queueData)),
      JSON.parse(JSON.stringify(this.stations))
    );

    const activeAssignments = sjfResult.scheduledJobs;
    
    if (db) {
      try {
        for (const job of activeAssignments) {
          await db.execute(
            'UPDATE order_items SET predicted_prep_time = ?, status = ? WHERE id = ?',
            [job.burstTime, 'Queued', job.id]
          );
        }
        
        for (const job of fcfsResult.scheduledJobs) {
          await db.execute(
            `INSERT INTO scheduling_metrics 
            (algorithm_type, order_id, order_item_id, wait_time_seconds, turnaround_time_seconds, response_time_seconds) 
            VALUES ('FCFS', ?, ?, ?, ?, ?)`,
            [job.orderId, job.id, job.waitTime, job.turnaroundTime, job.responseTime]
          );
        }

        for (const job of sjfResult.scheduledJobs) {
          await db.execute(
            `INSERT INTO scheduling_metrics 
            (algorithm_type, order_id, order_item_id, wait_time_seconds, turnaround_time_seconds, response_time_seconds) 
            VALUES ('SJF', ?, ?, ?, ?, ?)`,
            [job.orderId, job.id, job.waitTime, job.turnaroundTime, job.responseTime]
          );
        }

        for (const job of priorityResult.scheduledJobs) {
          await db.execute(
            `INSERT INTO scheduling_metrics 
            (algorithm_type, order_id, order_item_id, wait_time_seconds, turnaround_time_seconds, response_time_seconds) 
            VALUES ('Priority', ?, ?, ?, ?, ?)`,
            [job.orderId, job.id, job.waitTime, job.turnaroundTime, job.responseTime]
          );
        }
      } catch (err) {
        console.error("DB Update failed:", err.message);
      }
    }

    this.comparisonResults = {
      FCFS: fcfsResult.metrics,
      SJF: sjfResult.metrics,
      Priority: priorityResult.metrics
    };

    this.ganttData = {
      FCFS: fcfsResult.ganttChart,
      SJF: sjfResult.ganttChart,
      Priority: priorityResult.ganttChart
    };

    if (io) {
      io.emit('scheduling-update', {
        comparison: this.comparisonResults,
        ganttData: this.ganttData
      });
    }

    return activeAssignments;
  }

  getComparison() {
    return this.comparisonResults;
  }

  getGanttData() {
    return this.ganttData;
  }
}

const engineInstance = new SchedulerEngine();
module.exports = engineInstance;

