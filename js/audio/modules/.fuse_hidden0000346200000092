import { envTimeKnobToMs, msToSeconds } from '../../utils/math.js';

/**
 * ADSR Envelope module.
 * Uses ConstantSourceNode with offset AudioParam automation.
 * Output range: 0 to 1.
 */
export class EnvelopeModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    // ADSR parameters (knob values 0-10)
    this._attack = 0.5;
    this._decay = 2;
    this._sustain = 7;
    this._release = 3;

    // ConstantSourceNode for envelope output
    this.source = this.ctx.createConstantSource();
    this.source.offset.value = 0;
    this.source.start();

    // Output gain node (junction point)
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    // Gate input (for external triggering)
    this.gateInput = this.ctx.createGain();
    this.gateInput.gain.value = 0;

    this.source.connect(this.output);

    this._gateOpen = false;
  }

  setAttack(value) { this._attack = value; }
  setDecay(value) { this._decay = value; }
  setSustain(value) { this._sustain = value; }
  setRelease(value) { this._release = value; }

  getAttackTime() { return msToSeconds(envTimeKnobToMs(this._attack)); }
  getDecayTime() { return msToSeconds(envTimeKnobToMs(this._decay)); }
  getSustainLevel() { return this._sustain / 10; }
  getReleaseTime() { return msToSeconds(envTimeKnobToMs(this._release)); }

  /**
   * Trigger the envelope (gate on).
   */
  trigger(time) {
    const now = time || this.ctx.currentTime;
    const attackTime = this.getAttackTime();
    const decayTime = this.getDecayTime();
    const sustainLevel = this.getSustainLevel();

    const param = this.source.offset;

    // Cancel any scheduled changes
    param.cancelScheduledValues(now);

    // Start from current value (or 0)
    param.setValueAtTime(0, now);

    // Attack: ramp to 1
    param.linearRampToValueAtTime(1.0, now + attackTime);

    // Decay: exponential ramp to sustain level
    // Use setTargetAtTime for exponential decay
    // Time constant = decayTime / 3 (reaches ~95% in 3 time constants)
    const sustainTarget = Math.max(sustainLevel, 0.001); // avoid 0 for exponential
    param.setTargetAtTime(sustainTarget, now + attackTime, decayTime / 3);

    this._gateOpen = true;
  }

  /**
   * Release the envelope (gate off).
   */
  release(time) {
    const now = time || this.ctx.currentTime;
    const releaseTime = this.getReleaseTime();

    const param = this.source.offset;

    // Cancel scheduled and ramp from current value to 0
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.setTargetAtTime(0, now, releaseTime / 3);

    this._gateOpen = false;
  }

  /**
   * For KB RLS mode: instant attack, then use release time on gate off.
   */
  triggerInstant(time) {
    const now = time || this.ctx.currentTime;
    const param = this.source.offset;

    param.cancelScheduledValues(now);
    param.setValueAtTime(1.0, now);

    this._gateOpen = true;
  }

  isActive() {
    return this._gateOpen || this.source.offset.value > 0.001;
  }

  destroy() {
    this.source.stop();
    this.source.disconnect();
    this.output.disconnect();
  }
}
