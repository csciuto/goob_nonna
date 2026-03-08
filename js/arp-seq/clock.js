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
    this._tapOverride = false; // true when tap tempo has taken over
  }

  setBPM(bpm) {
    this._bpm = Math.max(20, Math.min(280, bpm));
    if (this._running) {
      this.stop();
      this.start(this._callback);
    }
  }

  /**
   * Set rate from knob value (0-10).
   * Maps to 20-280 BPM.
   * Ignored if tap tempo has overridden.
   */
  setRate(knobValue) {
    if (this._tapOverride) return;
    this._bpm = 20 + (knobValue / 10) * 260;
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

    // Reset if last tap was more than 2 seconds ago
    if (this._tapTimes.length > 0 && now - this._tapTimes[this._tapTimes.length - 1] > 2000) {
      this._tapTimes = [];
    }

    this._tapTimes.push(now);

    // Keep last 5 taps
    if (this._tapTimes.length > 5) {
      this._tapTimes.shift();
    }

    // Need at least 3 taps to override
    if (this._tapTimes.length >= 3) {
      let totalInterval = 0;
      for (let i = 1; i < this._tapTimes.length; i++) {
        totalInterval += this._tapTimes[i] - this._tapTimes[i - 1];
      }
      const avgInterval = totalInterval / (this._tapTimes.length - 1);
      this._tapOverride = true;
      this.setBPM(60000 / avgInterval);
    }
  }

  /** Clear tap override so knob controls rate again. */
  clearTapOverride() {
    this._tapOverride = false;
  }

  destroy() {
    this.stop();
  }
}
