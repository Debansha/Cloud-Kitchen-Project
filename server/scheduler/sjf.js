/**
 * Shortest Job First (SJF) Scheduler
 * 
 * OS Concept Mapping:
 * - Non-preemptive SJF selects the process with the smallest burst time from the ready queue.
 * - Optimal for minimizing average wait time.
 * - Difficult to implement in reality because burst time is rarely known in advance.
 *   (In our Cloud Kitchen, we use AI to predict this burst time!).
 * - Disadvantage: Starvation of long jobs if short jobs keep arriving.
 */

class SJFScheduler {
  schedule(jobs, stations) {
    const scheduledJobs = [];
    const ganttChart = [];
    const stationState = stations.map(s => ({ ...s, availableAt: 0 }));
    
    // Unscheduled jobs
    let pendingJobs = [...jobs];
    
    let totalWaitTime = 0;
    let totalTurnaroundTime = 0;
    let totalResponseTime = 0;
    
    let currentTime = 0;
    if (pendingJobs.length > 0) {
      currentTime = Math.min(...pendingJobs.map(j => j.arrivalTime));
    }
    const minArrival = currentTime;

    while (pendingJobs.length > 0) {
      // Find all jobs that have arrived by currentTime
      let arrivedJobs = pendingJobs.filter(j => j.arrivalTime <= currentTime);
      
      if (arrivedJobs.length === 0) {
        // Advance time to next arrival
        currentTime = Math.min(...pendingJobs.map(j => j.arrivalTime));
        arrivedJobs = pendingJobs.filter(j => j.arrivalTime <= currentTime);
      }
      
      // Sort arrived jobs by burst time (SJF)
      arrivedJobs.sort((a, b) => {
        if (a.burstTime === b.burstTime) return a.arrivalTime - b.arrivalTime;
        return a.burstTime - b.burstTime;
      });

      let jobScheduled = false;

      for (const job of arrivedJobs) {
        const eligibleStations = stationState.filter(s => s.type === job.stationType);
        if (eligibleStations.length === 0) continue;
        
        // Find earliest available station
        eligibleStations.sort((a, b) => a.availableAt - b.availableAt);
        const selectedStation = eligibleStations[0];
        
        if (selectedStation.availableAt <= currentTime) {
          // Schedule this job
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
          
          // Remove job from pending
          pendingJobs = pendingJobs.filter(j => j.id !== job.id);
          jobScheduled = true;
          break; // Break and re-evaluate with new state
        }
      }

      if (!jobScheduled) {
        // No station was available for any arrived job at currentTime.
        // Advance time to the earliest time a relevant station becomes available
        const nextAvailableTimes = stationState
          .filter(s => arrivedJobs.some(j => j.stationType === s.type))
          .map(s => s.availableAt)
          .filter(t => t > currentTime);
          
        if (nextAvailableTimes.length > 0) {
          currentTime = Math.min(...nextAvailableTimes);
        } else {
          currentTime++; // Fallback
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

module.exports = SJFScheduler;
