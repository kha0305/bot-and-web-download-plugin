class LoadBalancer {
  constructor(workerCount = 2, maxPerWorker = 5) {
    this.workers = [];
    for (let i = 1; i <= workerCount; i++) {
      this.workers.push({
        id: i,
        active_requests: 0,
        max_capacity: maxPerWorker,
      });
    }
    this.queue = [];
  }

  getBestWorker() {
    // Find worker with least load but strictly < max_capacity
    // Or strictly strictly "fill first then next"?
    // User said: "full then switch to empty". So fill Worker 1, then Worker 2.

    for (const worker of this.workers) {
      if (worker.active_requests < worker.max_capacity) {
        return worker;
      }
    }
    return null; // All full
  }

  startRequest() {
    const worker = this.getBestWorker();
    if (worker) {
      worker.active_requests++;
      return worker.id;
    }
    return null; // Busy
  }

  endRequest(workerId) {
    const worker = this.workers.find((w) => w.id === workerId);
    if (worker && worker.active_requests > 0) {
      worker.active_requests--;
    }
    // Check queue? (Not implemented simple queue for now, just reject or retry)
  }

  getStatus() {
    return this.workers
      .map((w) => `🔹 Line ${w.id}: ${w.active_requests}/${w.max_capacity}`)
      .join("\n");
  }
}

module.exports = new LoadBalancer(3, 10); // 3 Lines, 10 users each = 30 potential concurrent (but RAM limited)
