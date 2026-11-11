/**
 * Tracks the keyboard's pitch as it is scheduled, so a new note can glide from the pitch that is
 * actually sounding, even partway through an earlier glide. Pitch is in octaves, so a straight line
 * here is the even, musical slide of a portamento.
 */
export class GlideTracker {
  constructor(value = 0) {
    this.from = value; this.to = value; this.t0 = 0; this.t1 = 0;
  }

  /** The pitch at time t. */
  valueAt(t) {
    if (t >= this.t1) return this.to;
    if (t <= this.t0) return this.from;
    return this.from + (this.to - this.from) * (t - this.t0) / (this.t1 - this.t0);
  }

  /**
   * Head for `target`, arriving `seconds` after `now` (0 = at once). Schedules it on `param` if given.
   * @returns the pitch the move starts from
   */
  moveTo(target, now, seconds, param = null) {
    const start = seconds > 0 ? this.valueAt(now) : target;
    this.from = start; this.to = target; this.t0 = now; this.t1 = now + Math.max(seconds, 0);
    if (param) {
      param.cancelScheduledValues(now);
      param.setValueAtTime(start, now);
      if (seconds > 0) param.linearRampToValueAtTime(target, now + seconds);
    }
    return start;
  }
}
