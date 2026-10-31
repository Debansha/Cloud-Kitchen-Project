/**
 * Priority Scheduler with Aging
 * 
 * OS Concept Mapping:
 * - Non-preemptive: Highest priority process from the ready queue is allocated the CPU.
 * - Priority: An integer value associated with each process. (Lower number = higher priority).
 * - Problem: Starvation (indefinite blocking). A stream of high-priority processes can prevent a low-priority process from ever running.
 * - Solution: Aging. Gradually increase the priority of processes that wait in the system for a long time.
 */

class PriorityScheduler {
  schedule(jobs, stations) {
    const scheduledJobs = [];
    const ganttChart = [];
    const stationState = stations.map(s => ({ ...s, availableAt: 0 }));
    
    // Deep copy to manipulate priorities for aging
    let pendingJobs = jobs.map(j => ({ ...j, originalPriority: j.priority || 5 }));
    
    let totalWaitTime = 0;
    let totalTurnaroundTime = 0;
    let totalResponseTime = 0;
    
    let currentTime = 0;
    if (pendingJobs.length > 0) {
      currentTime = Math.min(...pendingJobs.map(j => j.arrivalTime));
    }
    const minArrival = currentTime;

    while (pendingJobs.length > 0) {
      let arrivedJobs = pendingJobs.filter(j => j.arrivalTime <= currentTime);
      
      if (arrivedJobs.length === 0) {
        currentTime = Math.min(...pendingJobs.map(j => j.arrivalTime));
        arrivedJobs = pendingJobs.filter(j => j.arrivalTime <= currentTime);
      }
      
      // AGING: increase priority (decrease priority number) if waited > 60 seconds
      arrivedJobs.forEach(job => {
        const waitSoFar = currentTime - job.arrivalTime;
        if (waitSoFar > 60) {
          // Boost priority by 1 for every 60s, up to 1 (highest)
          const boosts = Math.floor(waitSoFar / 60);
          job.priority = Math.max(1, job.originalPriority - boosts);
        }
      });
      
      // Sort by Priority (lowest number first), then arrival time
      arrivedJobs.sort((a, b) => {
        if (a.priority === b.priority) return a.arrivalTime - b.arrivalTime;
        return a.priority - b.priority;
      });

      let jobScheduled = false;

      for (const job of arrivedJobs) {
        const eligibleStations = stationState.filter(s => s.type === job.stationType);
        if (eligibleStations.length === 0) continue;
        
        eligibleStations.sort((a, b) => a.availableAt - b.availableAt);
        const selectedStation = eligibleStations[0];
        
        if (selectedStation.availableAt <= currentTime) {
          const start = currentTime;
          const completion = start + job.burstTime;
          
          job.startTime = start;
          job.completionTime = completion;
          job.waitTime = start - job.arrivalTime;
          job.turnaroundTime = completion - job.arrivalTime;
          job.responseTime = start - job.arrivalTime;
          job.status = 'Completed';
          
          selectedStation.availableAt = completion;
          
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
          
          pendingJobs = pendingJobs.filter(j => j.id !== job.id);
          jobScheduled = true;
          break;
        }
      }

      if (!jobScheduled) {
        const nextAvailableTimes = stationState
          .filter(s => arrivedJobs.some(j => j.stationType === s.type))
          .map(s => s.availableAt)
          .filter(t => t > currentTime);
          
        if (nextAvailableTimes.length > 0) {
          currentTime = Math.min(...nextAvailableTimes);
        } else {
          currentTime++;
        }
      }
    }

    const maxCompletion = Math.max(...stationState.map(s => s.availableAt), minArrival);
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

module.exports = PriorityScheduler;
