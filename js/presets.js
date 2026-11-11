import { WAVEFORMS, VCA_MODES, KB_TRACK, LFO_WAVEFORMS, PATCH_POINTS } from './utils/constants.js';

/**
 * Factory presets for the Goob Nonna synthesizer.
 *
 * `settings` uses the control names in ui/controls.js, with each control's own range (knobs 0 to 10,
 * RESONANCE 0 to 4, ENVELOPE AMT -5 to +5, FREQUENCY in semitones). Loading a preset sets every
 * control: anything a preset leaves out goes to its default, so a preset sounds the same whatever
 * was loaded before it. The mod wheel returns to zero; the AMT knobs only take effect as it is raised.
 */
export const PRESETS = [
  {
    name: 'Default',
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 8, osc2Detune: 0,
      osc1Level: 8, osc2Level: 0, noiseLevel: 0,
      cutoff: 7, resonance: 0, envAmt: 0, kbTrack: KB_TRACK.FULL,
      attack: 0.5, decay: 2, sustain: 7, release: 3,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 3,
      lfoRate: 5, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0, cutoffAmt: 0, pwAmt: 0,
    },
    patches: [],
  },
  {
    name: 'Funky Robot',
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 8, osc2Detune: 0,
      osc1Level: 8, osc2Level: 6, noiseLevel: 0,
      cutoff: 5, resonance: 1.5, envAmt: 3, kbTrack: KB_TRACK.OFF,
      attack: 0.2, decay: 2, sustain: 2, release: 1,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 1,
      lfoRate: 0, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0, cutoffAmt: 0, pwAmt: 0,
    },
    patches: [],
  },
  {
    name: 'Showdown Guitar',
    settings: {
      osc1Waveform: WAVEFORMS.SQUARE, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 4, osc2Detune: 0, osc2Sync: true,
      osc1Level: 7, osc2Level: 7, noiseLevel: 0,
      cutoff: 6, resonance: 1, envAmt: 2, kbTrack: KB_TRACK.FULL,
      attack: 0.3, decay: 3, sustain: 5, release: 3,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 2,
      lfoRate: 4, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 2, cutoffAmt: 0, pwAmt: 0,
    },
    patches: [],
  },
  {
    name: 'Dynasty Plucks',
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 8, osc2Detune: 0.3,
      osc1Level: 7, osc2Level: 7, noiseLevel: 0,
      cutoff: 6, resonance: 0.5, envAmt: 3, kbTrack: KB_TRACK.FULL,
      attack: 0.1, decay: 1.5, sustain: 0, release: 1,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 3,
    },
    patches: [],
  },
  {
    name: 'Haunted Cave',
    settings: {
      osc1Waveform: WAVEFORMS.TRIANGLE, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.TRIANGLE, osc2Octave: 8, osc2Detune: 0.2,
      osc1Level: 8, osc2Level: 6, noiseLevel: 2,
      cutoff: 3, resonance: 2, envAmt: 1, kbTrack: KB_TRACK.HALF,
      attack: 5, decay: 4, sustain: 6, release: 6,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 8,
      lfoRate: 2, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0, cutoffAmt: 3, pwAmt: 0,
    },
    patches: [],
  },
  {
    name: 'Ultra Sub Bass',
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 32,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 16, osc2Detune: 0,
      osc1Level: 8, osc2Level: 6, noiseLevel: 0,
      cutoff: 3, resonance: 1, envAmt: 2, kbTrack: KB_TRACK.OFF,
      attack: 0.2, decay: 2, sustain: 8, release: 2,
      vcaMode: VCA_MODES.ENV, volume: 8, reverbMix: 0,
    },
    patches: [],
  },
  {
    name: 'Cavern Strings',
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.NARROW_PULSE, osc2Octave: 8, osc2Detune: 0.1,
      osc1Level: 7, osc2Level: 7, noiseLevel: 0,
      cutoff: 3, resonance: 0.5, envAmt: 1, kbTrack: KB_TRACK.FULL,
      attack: 4, decay: 3, sustain: 8, release: 5,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 7,
      lfoRate: 3, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0, cutoffAmt: 0, pwAmt: 3,
    },
    patches: [
      { source: PATCH_POINTS.KB_VEL, dest: PATCH_POINTS.CUTOFF_IN },
    ],
  },
  {
    name: 'J-Bass',
    settings: {
      osc1Waveform: WAVEFORMS.TRIANGLE, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 8, osc2Detune: 0.2,
      osc1Level: 8, osc2Level: 5, noiseLevel: 0,
      cutoff: 4, resonance: 1, envAmt: 3, kbTrack: KB_TRACK.FULL,
      attack: 0.2, decay: 2.5, sustain: 3, release: 2,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 1,
    },
    patches: [],
  },
  {
    name: 'Auto Zap Bass',
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.NARROW_PULSE, osc2Octave: 8, osc2Detune: 0, osc2Sync: true,
      osc1Level: 5, osc2Level: 8, noiseLevel: 0,
      cutoff: 4, resonance: 2, envAmt: 3, kbTrack: KB_TRACK.FULL,
      attack: 0.1, decay: 1.5, sustain: 2, release: 1.5,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 1,
      lfoRate: 5, lfoWaveform: LFO_WAVEFORMS.SINE,
    },
    patches: [
      { source: PATCH_POINTS.LFO_SH_OUT, dest: PATCH_POINTS.CUTOFF_IN },
    ],
  },
  {
    name: 'Stepped Drone',
    settings: {
      osc1Waveform: WAVEFORMS.SQUARE, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 4, osc2Detune: 0, osc2Sync: true,
      osc1Level: 7, osc2Level: 7, noiseLevel: 0,
      cutoff: 5, resonance: 2, envAmt: 0, kbTrack: KB_TRACK.FULL,
      attack: 0.5, decay: 3, sustain: 7, release: 4,
      vcaMode: VCA_MODES.DRONE, volume: 6, reverbMix: 4,
      lfoRate: 3, lfoWaveform: LFO_WAVEFORMS.SINE,
    },
    patches: [
      { source: PATCH_POINTS.LFO_SH_OUT, dest: PATCH_POINTS.CUTOFF_IN },
    ],
  },
  {
    name: 'Cyclical Patterns',
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 8, osc2Detune: 0.15,
      osc1Level: 7, osc2Level: 7, noiseLevel: 0,
      cutoff: 5, resonance: 1.5, envAmt: 2, kbTrack: KB_TRACK.FULL,
      attack: 0.3, decay: 3, sustain: 5, release: 3,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 3,
      lfoRate: 4, lfoWaveform: LFO_WAVEFORMS.SAWTOOTH,
      pitchAmt: 3, cutoffAmt: 4, pwAmt: 0,
    },
    patches: [],
  },
  {
    name: 'Bag Pipes',
    settings: {
      osc1Waveform: WAVEFORMS.NARROW_PULSE, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.NARROW_PULSE, osc2Octave: 4, osc2Detune: 0, osc2Sync: true,
      osc1Level: 7, osc2Level: 7, noiseLevel: 1,
      cutoff: 6, resonance: 1, envAmt: 1, kbTrack: KB_TRACK.FULL,
      attack: 2, decay: 2, sustain: 8, release: 3,
      vcaMode: VCA_MODES.ENV, volume: 6, reverbMix: 4,
      lfoRate: 4, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 1, cutoffAmt: 1, pwAmt: 2,
    },
    patches: [],
  },
  {
    name: 'Piano Bass',
    settings: {
      osc1Waveform: WAVEFORMS.TRIANGLE, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 8, osc2Detune: 0.1,
      osc1Level: 8, osc2Level: 5, noiseLevel: 0,
      cutoff: 4, resonance: 0.5, envAmt: 3, kbTrack: KB_TRACK.FULL,
      attack: 0.1, decay: 1.5, sustain: 0, release: 1,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 2,
    },
    patches: [],
  },
  {
    name: 'Lift Off',
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 4, osc2Detune: 0.1,
      osc1Level: 7, osc2Level: 7, noiseLevel: 1,
      cutoff: 4, resonance: 1, envAmt: 4, kbTrack: KB_TRACK.FULL,
      attack: 5, decay: 3, sustain: 6, release: 7,
      vcaMode: VCA_MODES.KB_RELEASE, volume: 7, reverbMix: 5,
      lfoRate: 2, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0, cutoffAmt: 2, pwAmt: 0,
    },
    patches: [],
  },
  {
    name: '3 Saws',
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 8, osc2Detune: 0.15,
      osc1Level: 7, osc2Level: 7, noiseLevel: 0,
      cutoff: 7, resonance: 0, envAmt: 0, kbTrack: KB_TRACK.FULL,
      attack: 0.5, decay: 2, sustain: 10, release: 3,
      vcaMode: VCA_MODES.ENV, volume: 7, reverbMix: 2,
    },
    patches: [],
  },
];
