/**
 * Process Queue (Ready Queue)
 * 
 * OS Concept Mapping:
 * - Ready Queue: A queue of processes (jobs) residing in main memory that are ready and waiting to execute.
 * - Process Control Block (PCB): Represented by the properties of each job object (id, state, CPU scheduling info, etc.).
 * - Burst Time: The amount of time the process needs on the CPU (prep time).
 * - Priority: For priority scheduling, a number indicating importance.
 * - Wait Time: Time spent waiting in the ready queue.
 * - Turnaround Time: Total time from submission to completion.
 * - Response Time: Time from submission to first response (same as wait time for non-preemptive).
 */

class ProcessQueue {
  constructor(jobs = []) {
    this.queue = [...jobs];
  }

  enqueue(job) {
    // Ensure all required fields exist to mimic a PCB
    const newJob = {
      id: job.id,
      orderId: job.orderId,
      name: job.name,
      arrivalTime: job.arrivalTime || Date.now(),
      burstTime: job.burstTime || 0,
      priority: job.priority || 5, // 1 is highest, 5 is lowest
      stationType: job.stationType,
      status: job.status || 'Queued',
      startTime: null,
      completionTime: null,
      waitTime: 0,
      turnaroundTime: 0,
      responseTime: 0,
      ...job
    };
    this.queue.push(newJob);
  }

  dequeue() {
    return this.queue.shift();
  }

  peek() {
    return this.queue[0];
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  size() {
    return this.queue.length;
  }

  getAll() {
    return [...this.queue];
  }

  sortByArrival() {
    this.queue.sort((a, b) => a.arrivalTime - b.arrivalTime);
    return this;
  }

  sortByBurstTime() {
    this.queue.sort((a, b) => {
      if (a.burstTime === b.burstTime) {
        return a.arrivalTime - b.arrivalTime; // FCFS tie breaker
      }
      return a.burstTime - b.burstTime;
    });
    return this;
  }

  sortByPriority() {
    this.queue.sort((a, b) => {
      if (a.priority === b.priority) {
        return a.arrivalTime - b.arrivalTime; // FCFS tie breaker
      }
      return a.priority - b.priority; // 1 is highest priority
    });
    return this;
  }

  clone() {
    // Deep copy the queue for parallel simulations
    return new ProcessQueue(JSON.parse(JSON.stringify(this.queue)));
  }
}

module.exports = ProcessQueue;
