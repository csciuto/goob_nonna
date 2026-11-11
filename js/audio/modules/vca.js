import { VCA_MODES } from '../../utils/constants.js';

/**
 * VCA. What opens it depends on the mode switch:
 *   ENV     the envelope
 *   KB RLS  full level while a key is held, then the envelope's release
 *   DRONE   always open
 * VCA AMT IN is summed with that. In DRONE, a cable there takes over completely (0 V silent, +8 V full).
 * The summed control is limited to 0..1, so a negative voltage closes the VCA and never inverts it.
 */
export class VCAModule {
  constructor(audioContext) {
    this.ctx = audioContext;
    this._mode = VCA_MODES.ENV;
    this._cvPatched = false;

    this.input = this.ctx.createGain();
    this.vca = this.ctx.createGain();
    this.vca.gain.value = 0;
    this.output = this.ctx.createGain();
    this.input.connect(this.vca);
    this.vca.connect(this.output);

    // control: sources -> sum -> limit to 0..1 -> gain
    this.control = this.ctx.createGain();
    this.limit = this.ctx.createWaveShaper();
    this.limit.curve = new Float32Array([0, 0, 1]);
    this.control.connect(this.limit);
    this.limit.connect(this.vca.gain);

    // The engine connects the envelope's two outputs to these
    this.envInput = this.ctx.createGain();
    this.kbReleaseInput = this.ctx.createGain();
    this.drone = this.ctx.createConstantSource();
    this.drone.offset.value = 1;
    this.drone.start();
    this.droneGain = this.ctx.createGain();
    this.drone.connect(this.droneGain);
    this.kbReleaseInput.gain.value = 0;
    this.droneGain.gain.value = 0;
    for (const n of [this.envInput, this.kbReleaseInput, this.droneGain]) n.connect(this.control);

    // VCA AMT IN: +8 V (1.6 units) is fully open
    this.cvInput = this.ctx.createGain();
    this.cvInput.gain.value = 1 / 1.6;
    this.cvInput.connect(this.control);

    this._route();
  }

  setMode(mode) { this._mode = mode; this._route(); }

  /** Called by the patch bay when a cable goes into or comes out of VCA AMT IN. */
  setCvPatched(patched) { this._cvPatched = patched; this._route(); }

  _route() {
    const t = this.ctx.currentTime, on = (node, yes) => node.gain.setTargetAtTime(yes ? 1 : 0, t, 0.003);
    on(this.envInput, this._mode === VCA_MODES.ENV);
    on(this.kbReleaseInput, this._mode === VCA_MODES.KB_RELEASE);
    on(this.droneGain, this._mode === VCA_MODES.DRONE && !this._cvPatched);
  }

  destroy() {
    this.drone.stop();
    for (const n of [this.input, this.vca, this.output, this.control, this.limit, this.envInput, this.kbReleaseInput, this.drone, this.droneGain, this.cvInput]) n.disconnect();
  }
}
