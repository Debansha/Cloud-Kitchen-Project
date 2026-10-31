/**
 * First-Come, First-Served (FCFS) Scheduler
 * 
 * OS Concept Mapping:
 * - FCFS is the simplest CPU scheduling algorithm.
 * - Non-preemptive: Once a CPU has been allocated to a process, that process keeps the CPU until it releases it.
 * - Processes are placed in the ready queue based on their arrival time.
 * - Disadvantage: Convoy effect where short processes wait for long processes, leading to high average wait times.
 */

class FCFSScheduler {
  schedule(jobs, stations) {
    // Clone jobs to avoid mutating original
    const scheduledJobs = [];
    const ganttChart = [];
    
    // Make a copy of stations with availableAt tracking
    const stationState = stations.map(s => ({ ...s, availableAt: 0 }));
    
    // Sort jobs by arrival time
    const sortedJobs = [...jobs].sort((a, b) => a.arrivalTime - b.arrivalTime);

    let totalWaitTime = 0;
    let totalTurnaroundTime = 0;
    let totalResponseTime = 0;
    
    // Find earliest arrival to calculate total simulation time
    const minArrival = sortedJobs.length > 0 ? sortedJobs[0].arrivalTime : 0;
    let maxCompletion = 0;

    for (const job of sortedJobs) {
      // Find matching stations
      const eligibleStations = stationState.filter(s => s.type === job.stationType);
      
      if (eligibleStations.length === 0) {
        // Skip or throw. For simulation, let's assume valid types.
        continue;
      }
      
      // Find the station that becomes available the earliest
      eligibleStations.sort((a, b) => a.availableAt - b.availableAt);
      const selectedStation = eligibleStations[0];
      
      const arrival = job.arrivalTime;
      const start = Math.max(arrival, selectedStation.availableAt);
      const completion = start + job.burstTime;
      
      job.startTime = start;
      job.completionTime = completion;
      job.waitTime = start - arrival;
      job.turnaroundTime = completion - arrival;
      job.responseTime = start - arrival; // non-preemptive
      job.status = 'Completed';
      
      selectedStation.availableAt = completion;
      if (completion > maxCompletion) maxCompletion = completion;
      
      scheduledJobs.push(job);
      
      ganttChart.push({
        stationId: selectedStation.id,
        stationName: selectedStation.name,
        jobId: job.id,
        jobName: job.name,
        start: start,
        end: completion
      });

      totalWaitTime += job.waitTime;
      totalTurnaroundTime += job.turnaroundTime;
      totalResponseTime += job.responseTime;
    }

    const n = scheduledJobs.length;
    const totalTime = maxCompletion - minArrival;
    
    return {
      scheduledJobs,
      ganttChart,
      metrics: {
        avgWaitTime: n ? totalWaitTime / n : 0,
        avgTurnaroundTime: n ? totalTurnaroundTime / n : 0,
        avgResponseTime: n ? totalResponseTime / n : 0,
        totalTime,
        throughput: totalTime > 0 ? n / totalTime : 0
      }
    };
  }
}

module.exports = FCFSScheduler;
