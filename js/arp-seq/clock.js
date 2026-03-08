/**
 * Clock module - provides tempo-based scheduling.
 * Uses AudioContext.currentTime for accurate timing.
 */
export class Clock {
  constructor(audioContext) {
    this.ctx = audioContext;
    this._bpm = 120;
    this._running = false;
    this._callback = null;
    this._intervalId = null;
    this._tapTimes = [];
  }

  setBPM(bpm) {
    this._bpm = Math.max(30, Math.min(300, bpm));
    if (this._running) {
      this.stop();
      this.start(this._callback);
    }
  }

  /**
   * Set rate from knob value (0-10).
   * Maps to roughly 30-300 BPM range (as note divisions).
   */
  setRate(knobValue) {
    // Map 0-10 to ~1-30 Hz step rate
    const rate = 0.5 + (knobValue / 10) * 29.5;
    this._bpm = rate * 60; // Convert Hz to BPM equivalent
    if (this._running) {
      this.stop();
      this.start(this._callback);
    }
  }

  getBPM() {
    return this._bpm;
  }

  getIntervalMs() {
    return 60000 / this._bpm;
  }

  start(callback) {
    this._callback = callback;
    this._running = true;
    const intervalMs = this.getIntervalMs();

    let step = 0;
    this._intervalId = setInterval(() => {
      if (this._callback) {
        this._callback(step, this.ctx.currentTime);
      }
      step++;
    }, intervalMs);
  }

  stop() {
    this._running = false;
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  isRunning() {
    return this._running;
  }

  /**
   * Tap tempo - call this on each tap.
   */
  tap() {
    const now = performance.now();
    this._tapTimes.push(now);

    // Keep last 4 taps
    if (this._tapTimes.length > 4) {
      this._tapTimes.shift();
    }

    if (this._tapTimes.length >= 2) {
      // Calculate average interval
      let totalInterval = 0;
      for (let i = 1; i < this._tapTimes.length; i++) {
        totalInterval += this._tapTimes[i] - this._tapTimes[i - 1];
      }
      const avgInterval = totalInterval / (this._tapTimes.length - 1);
      this.setBPM(60000 / avgInterval);
    }
  }

  destroy() {
    this.stop();
  }
}
