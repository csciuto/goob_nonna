import { PATCH_POINTS } from '../../utils/constants.js';

/**
 * Default normalled connections for the Grandmother.
 * Each entry: { source: outputJackId, destination: inputJackId }
 *
 * When a cable is patched into the destination input,
 * the normalled connection is broken.
 * When the cable is removed, it is restored.
 */
export const NORMALLED_CONNECTIONS = [
  // 1. KB pitch CV → OSC 1 pitch input
  { source: PATCH_POINTS.KB_PITCH_CV, destination: PATCH_POINTS.OSC1_PITCH_IN },

  // 2. KB pitch CV → OSC 2 pitch input
  { source: PATCH_POINTS.KB_PITCH_CV, destination: PATCH_POINTS.OSC2_PITCH_IN },

  // 3. OSC 1 wave out → Mixer OSC1 input
  { source: PATCH_POINTS.OSC1_WAVE_OUT, destination: PATCH_POINTS.MIXER_OSC1_IN },

  // 4. OSC 2 wave out → Mixer OSC2 input
  { source: PATCH_POINTS.OSC2_WAVE_OUT, destination: PATCH_POINTS.MIXER_OSC2_IN },

  // 5. Noise out → Mixer noise input
  { source: PATCH_POINTS.NOISE_OUT, destination: PATCH_POINTS.MIXER_NOISE_IN },

  // 6. Mixer out → Filter input
  { source: PATCH_POINTS.MIXER_OUT, destination: PATCH_POINTS.FILTER_IN },

  // 7. KB gate → Envelope gate input
  { source: PATCH_POINTS.KB_GATE, destination: PATCH_POINTS.ENV_GATE_IN },

  // 8. Filter out → VCA input
  { source: PATCH_POINTS.FILTER_OUT, destination: PATCH_POINTS.VCA_IN },

  // 9. Envelope out → VCA CV input (when VCA mode = ENV)
  { source: PATCH_POINTS.ENV_OUT, destination: PATCH_POINTS.VCA_CV_IN },

  // 10. Envelope out → Filter cutoff modulation (via ENV AMT)
  { source: PATCH_POINTS.ENV_OUT, destination: PATCH_POINTS.CUTOFF_IN },

  // 11. VCA out → Reverb input
  { source: PATCH_POINTS.VCA_OUT, destination: PATCH_POINTS.REVERB_IN },
];

/**
 * Modulation routing connections.
 * These are handled differently - they go through mod wheel and amount knobs.
 * Listed here for reference but managed by the engine's modulation routing.
 */
export const MODULATION_ROUTES = [
  // 12. LFO × MOD wheel × PITCH AMT → OSC pitch
  { lfoOutput: 'selected', destination: 'osc-pitch', amountKnob: 'pitch-amt' },

  // 13. LFO × MOD wheel × CUTOFF AMT → Filter cutoff
  { lfoOutput: 'selected', destination: 'filter-cutoff', amountKnob: 'cutoff-amt' },

  // 14. LFO × MOD wheel × PW AMT → OSC PWM
  { lfoOutput: 'selected', destination: 'osc-pwm', amountKnob: 'pw-amt' },
];
