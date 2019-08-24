interface Timeout {
  key: string;
  expiry: number;
}

interface Job {
  expiry: number;
  runner: () => void;
  /**
   * Original delay value
   */
  delay: number;
}

function sortByTimestamp(a: { expiry: number }, b: { expiry: number }) {
  return a.expiry - b.expiry;
}

/**
 * Schedules function run after specified delay using just one timeout at time
 */
export class Scheduler extends Map<string, Job> {
  private timeouts: Timeout[] = [];
  private timeoutsList: {
    next?: NodeJS.Timeout;
    expiry?: number;
    plannedTriggerTime: number;
  } = {
    plannedTriggerTime: 0
  };

  private sortTimeouts() {
    if (this.timeouts.length > 0) {
      this.timeouts = this.timeouts
        .filter(tm => {
          // prune removed or invalid items
          const i = this.get(tm.key);
          if (!i) return false;
          return i.expiry === tm.expiry;
        })
        .sort(sortByTimestamp);
      // only re-schedule the timeout if the new one is later (ie. don't fire for nothing)
      if (this.timeouts.length === 0) this.cleanup();
      else if (this.timeouts[0].expiry > this.timeoutsList.plannedTriggerTime) {
        this.rescheduleNextTimeout(this.timeouts[0].expiry);
      }
    }
  }
  private rescheduleNextTimeout(expiry: number) {
    if (this.timeoutsList.next) {
      clearTimeout(this.timeoutsList.next);
    }
    const delay = Math.min(expiry - Date.now(), 1000);
    this.timeoutsList.expiry = expiry;
    this.timeoutsList.next = setTimeout(() => {
      this.timeoutsList.next = undefined;
      this.timeout();
    }, delay);
  }
  private timeoutItem(item: Timeout) {
    const i = this.get(item.key);
    if (!i || i.expiry !== item.expiry) return;
    this.delete(item.key);
    if (typeof i.runner === 'function') setImmediate(i.runner);
  }
  private timeout() {
    const now = Date.now();
    while (this.timeouts.length > 0) {
      if (this.timeouts[0].expiry <= now) {
        const tm = this.timeouts.shift() as Timeout;
        this.timeoutItem(tm);
      } else {
        break;
      }
    }
    if (this.timeouts.length > 0) {
      this.rescheduleNextTimeout(this.timeouts[0].expiry);
    }
  }

  private cleanup() {
    if (this.timeoutsList.next) {
      clearTimeout(this.timeoutsList.next);
      this.timeoutsList.next = undefined;
    }
    this.timeoutsList.plannedTriggerTime = 0;
    this.timeouts = [];
  }

  /**
   * Schedules `runner` function to run after `ms` milliseconds delay
   *
   * @param {string} key - reference name for the function
   * @param {() => void} runner - function to call
   * @param {number} delay - delay, in ms
   */
  schedule(key: string, runner: () => void, delay: number) {
    const expiry = Date.now() + delay;
    this.set(key, { expiry, runner, delay });
    this.timeouts.push({ key, expiry });
    setImmediate(() => {
      this.sortTimeouts();
    });
  }

  /**
   * Executes first function waiting to be executed now
   */
  runNext() {
    // it will revalidate all timeouts
    this.sortTimeouts();
    switch (this.timeouts.length) {
      case 0:
        break;
      case 1:
        this.flush();
        break;
      default:
        this.timeoutItem(this.timeouts.shift() as Timeout);
        this.rescheduleNextTimeout(this.timeouts[0].expiry);
    }
  }

  delete(key: string) {
    const res = super.delete(key);
    if (this.size === 0) this.cleanup();
    else this.sortTimeouts();
    return res;
  }

  // immediately consider all items in the queue to have timed out and process them
  flush() {
    while (this.timeouts.length > 0) {
      const tm = this.timeouts.shift() as Timeout;
      this.timeoutItem(tm);
    }
    this.cleanup();
  }
}
