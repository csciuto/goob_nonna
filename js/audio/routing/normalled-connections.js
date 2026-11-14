import { PATCH_POINTS } from '../../utils/constants.js';

/**
 * The hardware's normalled connections: what feeds an input jack while nothing is plugged into it.
 * Patching a cable into the destination replaces the normal; pulling the cable restores it.
 *
 * Connections the hardware makes without a jack in between are not here, because a cable can't break
 * them: the keyboard's pitch to both oscillators and to the filter's keyboard tracking, the envelope
 * to the VCA and to the filter's ENVELOPE AMT, and the mod-wheel routings. The engine wires those.
 */
export const NORMALLED_CONNECTIONS = [
  { source: PATCH_POINTS.OSC1_WAVE_OUT, destination: PATCH_POINTS.MIXER_OSC1_IN },
  { source: PATCH_POINTS.OSC2_WAVE_OUT, destination: PATCH_POINTS.MIXER_OSC2_IN },
  { source: PATCH_POINTS.NOISE_OUT, destination: PATCH_POINTS.MIXER_NOISE_IN },
  { source: PATCH_POINTS.MIXER_OUT, destination: PATCH_POINTS.FILTER_IN },
  { source: PATCH_POINTS.KB_GATE, destination: PATCH_POINTS.ENV_GATE_IN },
  { source: PATCH_POINTS.FILTER_OUT, destination: PATCH_POINTS.VCA_IN },
  { source: PATCH_POINTS.VCA_OUT, destination: PATCH_POINTS.REVERB_IN },
  { source: PATCH_POINTS.ATTEN_DC, destination: PATCH_POINTS.ATTEN_IN },
];
