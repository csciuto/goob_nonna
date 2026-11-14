import { WAVEFORMS, VCA_MODES, KB_TRACK, LFO_WAVEFORMS, PATCH_POINTS, ARP_MODES } from './utils/constants.js';

/**
 * Factory presets for the Goob Nonna synthesizer: the hardware's factory patch sheets, read off the drawings.
 * Switches, waveforms, octaves and cables are as drawn; knobs are to about the nearest half step.
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
    name: 'Funky Robot',   // mod wheel up adds a robot voice
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 16, osc2Detune: 0,
      osc1Level: 5, osc2Level: 3.5, noiseLevel: 0,
      cutoff: 1, resonance: 2.0, envAmt: 4, kbTrack: KB_TRACK.HALF,
      attack: 0.5, decay: 2, sustain: 4.5, release: 0.5,
      vcaMode: VCA_MODES.DRONE, volume: 5, reverbMix: 1,
      lfoRate: 9.5, lfoWaveform: LFO_WAVEFORMS.RAMP,
      pitchAmt: 0.5, cutoffAmt: 9, pwAmt: 0,
      highPass: 0.5, attenuator: 0,
      arpRate: 2.5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.KB_PITCH_CV, dest: PATCH_POINTS.LFO_RATE_IN },
    ],
  },
  {
    name: 'Showdown Guitar',   // mod wheel adds motion; ATTENUATOR sets the tremolo
    settings: {
      osc1Waveform: WAVEFORMS.NARROW_PULSE, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.NARROW_PULSE, osc2Octave: 8, osc2Detune: 0,
      osc1Level: 5, osc2Level: 3.5, noiseLevel: 0.5,
      cutoff: 4.8, resonance: 0.2, envAmt: 2, kbTrack: KB_TRACK.OFF,
      attack: 0.5, decay: 4, sustain: 3, release: 9,
      vcaMode: VCA_MODES.KB_RELEASE, volume: 5, reverbMix: 2,
      lfoRate: 5, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0.5, cutoffAmt: 0.5, pwAmt: 1,
      highPass: 0.5, attenuator: 2,
      arpRate: 2.5, arpDirection: ARP_MODES.ORDER, arpOctave: 2,
    },
    patches: [
      { source: PATCH_POINTS.LFO_WAVE_OUT, dest: PATCH_POINTS.ATTEN_IN },
      { source: PATCH_POINTS.ATTEN_OUT, dest: PATCH_POINTS.VCA_CV_IN },
    ],
  },
  {
    name: 'Dynasty Plucks',
    settings: {
      osc1Waveform: WAVEFORMS.NARROW_PULSE, osc1Octave: 4,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 4, osc2Detune: 0,
      osc1Level: 5, osc2Level: 0.5, noiseLevel: 5,
      cutoff: 2, resonance: 0.8, envAmt: 3, kbTrack: KB_TRACK.HALF,
      attack: 0.5, decay: 3, sustain: 0, release: 8,
      vcaMode: VCA_MODES.KB_RELEASE, volume: 5, reverbMix: 6,
      lfoRate: 5, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0.5, cutoffAmt: 0.5, pwAmt: 9,
      highPass: 0.5, attenuator: 0,
      arpRate: 4, arpDirection: ARP_MODES.ORDER, arpOctave: 2,
    },
    patches: [],
  },
  {
    name: 'Haunted Cave',
    settings: {
      osc1Waveform: WAVEFORMS.SQUARE, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 8, osc2Detune: 0,
      osc1Level: 0.5, osc2Level: 1, noiseLevel: 9.5,
      cutoff: 3, resonance: 3.2, envAmt: 0, kbTrack: KB_TRACK.FULL,
      attack: 0.5, decay: 1, sustain: 0, release: 6,
      vcaMode: VCA_MODES.KB_RELEASE, volume: 5, reverbMix: 3,
      lfoRate: 9.5, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0.5, cutoffAmt: 9, pwAmt: 0.5,
      highPass: 0.5, attenuator: 0,
      arpRate: 0, arpDirection: ARP_MODES.RANDOM, arpOctave: 2,
    },
    patches: [
      { source: PATCH_POINTS.KB_PITCH_CV, dest: PATCH_POINTS.LFO_RATE_IN },
    ],
  },
  {
    name: 'Ultra Sub Bass',   // mod wheel adds gentle motion
    settings: {
      osc1Waveform: WAVEFORMS.TRIANGLE, osc1Octave: 32,
      osc2Waveform: WAVEFORMS.TRIANGLE, osc2Octave: 8, osc2Detune: 0,
      osc1Level: 9.5, osc2Level: 0.5, noiseLevel: 0.5,
      cutoff: 5, resonance: 0.2, envAmt: 0, kbTrack: KB_TRACK.HALF,
      attack: 1, decay: 1.5, sustain: 1.5, release: 6,
      vcaMode: VCA_MODES.KB_RELEASE, volume: 5, reverbMix: 0,
      lfoRate: 2, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0.5, cutoffAmt: 5, pwAmt: 0.5,
      highPass: 0.5, attenuator: 0,
      arpRate: 0.5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [],
  },
  {
    name: 'Cavern Strings',
    settings: {
      osc1Waveform: WAVEFORMS.NARROW_PULSE, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 4, osc2Detune: 0,
      osc1Level: 7, osc2Level: 2, noiseLevel: 0.5,
      cutoff: 3, resonance: 0.4, envAmt: 1.5, kbTrack: KB_TRACK.HALF,
      attack: 6.5, decay: 4, sustain: 4, release: 7.5,
      vcaMode: VCA_MODES.ENV, volume: 5, reverbMix: 9.5,
      lfoRate: 4, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 1.5, cutoffAmt: 0.5, pwAmt: 5,
      highPass: 2, attenuator: 0,
      arpRate: 5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.OSC1_WAVE_OUT, dest: PATCH_POINTS.FILTER_IN },
      { source: PATCH_POINTS.FILTER_OUT, dest: PATCH_POINTS.MIXER_OSC1_IN },
      { source: PATCH_POINTS.OSC2_WAVE_OUT, dest: PATCH_POINTS.HPF_IN },
      { source: PATCH_POINTS.HPF_OUT, dest: PATCH_POINTS.MIXER_OSC2_IN },
      { source: PATCH_POINTS.MIXER_OUT, dest: PATCH_POINTS.VCA_IN },
    ],
  },
  {
    name: 'J-Bass',
    settings: {
      osc1Waveform: WAVEFORMS.SQUARE, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 8, osc2Detune: 0,
      osc1Level: 9, osc2Level: 9.5, noiseLevel: 5,
      cutoff: 3.5, resonance: 0.2, envAmt: 0.5, kbTrack: KB_TRACK.OFF,
      attack: 0.5, decay: 3, sustain: 0, release: 2.5,
      vcaMode: VCA_MODES.ENV, volume: 5, reverbMix: 2,
      lfoRate: 5, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 1.5, cutoffAmt: 0.5, pwAmt: 0.5,
      highPass: 4.8, attenuator: 0,
      arpRate: 5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.MIXER_OUT, dest: PATCH_POINTS.HPF_IN },
      { source: PATCH_POINTS.HPF_OUT, dest: PATCH_POINTS.FILTER_IN },
    ],
  },
  {
    name: 'Auto Zap Bass',   // turn the ATTENUATOR
    settings: {
      osc1Waveform: WAVEFORMS.SQUARE, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 16, osc2Detune: 5.6,
      osc1Level: 9.5, osc2Level: 7.5, noiseLevel: 0.5,
      cutoff: 3.5, resonance: 2.0, envAmt: 2, kbTrack: KB_TRACK.FULL,
      attack: 0.5, decay: 2.5, sustain: 0, release: 2,
      vcaMode: VCA_MODES.KB_RELEASE, volume: 5, reverbMix: 1,
      lfoRate: 4.5, lfoWaveform: LFO_WAVEFORMS.SAWTOOTH,
      pitchAmt: 0.5, cutoffAmt: 9, pwAmt: 0.5,
      highPass: 4.8, attenuator: 4,
      arpRate: 5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.OSC2_WAVE_OUT, dest: PATCH_POINTS.ATTEN_IN },
      { source: PATCH_POINTS.ATTEN_OUT, dest: PATCH_POINTS.ENV_AMT_IN },
    ],
  },
  {
    name: 'Stepped Drone',   // mod wheel up!
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 4, osc2Detune: -2.8, osc2Sync: true,
      osc1Level: 3, osc2Level: 3, noiseLevel: 0.5,
      cutoff: 7.5, resonance: 0.2, envAmt: 1, kbTrack: KB_TRACK.OFF,
      attack: 0.5, decay: 6.5, sustain: 0, release: 5.5,
      vcaMode: VCA_MODES.DRONE, volume: 5, reverbMix: 3,
      lfoRate: 5, lfoWaveform: LFO_WAVEFORMS.SAWTOOTH,
      pitchAmt: 1.5, cutoffAmt: 6.5, pwAmt: 5,
      highPass: 5, attenuator: 0.7,
      arpRate: 5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.LFO_SH_OUT, dest: PATCH_POINTS.ATTEN_IN },
      { source: PATCH_POINTS.ATTEN_OUT, dest: PATCH_POINTS.MULT_1 },
      { source: PATCH_POINTS.MULT_3, dest: PATCH_POINTS.OSC2_PITCH_IN },
      { source: PATCH_POINTS.MULT_4, dest: PATCH_POINTS.CUTOFF_IN },
    ],
  },
  {
    name: 'Cyclical Patterns',   // turn HIGH PASS and NOISE
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 8, osc2Detune: 0,
      osc1Level: 5, osc2Level: 5, noiseLevel: 9,
      cutoff: 3.5, resonance: 0.2, envAmt: 2, kbTrack: KB_TRACK.HALF,
      attack: 0.5, decay: 1, sustain: 5, release: 2.5,
      vcaMode: VCA_MODES.KB_RELEASE, volume: 5, reverbMix: 1,
      lfoRate: 5, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0.5, cutoffAmt: 0.5, pwAmt: 0.5,
      highPass: 5, attenuator: 0,
      arpRate: 5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.MIXER_OUT, dest: PATCH_POINTS.HPF_IN },
      { source: PATCH_POINTS.HPF_OUT, dest: PATCH_POINTS.MIXER_NOISE_IN },
    ],
  },
  {
    name: 'Bag Pipes',
    settings: {
      osc1Waveform: WAVEFORMS.NARROW_PULSE, osc1Octave: 8,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 4, osc2Detune: 0,
      osc1Level: 4.5, osc2Level: 9, noiseLevel: 9,
      cutoff: 7, resonance: 2.4, envAmt: 0, kbTrack: KB_TRACK.FULL,
      attack: 0.5, decay: 2.5, sustain: 0, release: 2,
      vcaMode: VCA_MODES.KB_RELEASE, volume: 5, reverbMix: 3,
      lfoRate: 5, lfoWaveform: LFO_WAVEFORMS.SQUARE,
      pitchAmt: 1.5, cutoffAmt: 5, pwAmt: 5,
      highPass: 4.8, attenuator: 8,
      arpRate: 5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.MIXER_OUT, dest: PATCH_POINTS.MULT_1 },
      { source: PATCH_POINTS.MULT_2, dest: PATCH_POINTS.FILTER_IN },
      { source: PATCH_POINTS.MULT_3, dest: PATCH_POINTS.HPF_IN },
      { source: PATCH_POINTS.HPF_OUT, dest: PATCH_POINTS.ATTEN_IN },
      { source: PATCH_POINTS.ATTEN_OUT, dest: PATCH_POINTS.MIXER_NOISE_IN },
    ],
  },
  {
    name: 'Piano Bass',   // turn HIGH PASS
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 8, osc2Detune: 0,
      osc1Level: 5, osc2Level: 5, noiseLevel: 9.5,
      cutoff: 2.5, resonance: 0.2, envAmt: 2, kbTrack: KB_TRACK.OFF,
      attack: 0.5, decay: 2.5, sustain: 4.5, release: 2.5,
      vcaMode: VCA_MODES.KB_RELEASE, volume: 5, reverbMix: 1,
      lfoRate: 4, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0.5, cutoffAmt: 0.5, pwAmt: 5,
      highPass: 5.5, attenuator: 0,
      arpRate: 5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.MIXER_OUT, dest: PATCH_POINTS.HPF_IN },
      { source: PATCH_POINTS.HPF_OUT, dest: PATCH_POINTS.MIXER_NOISE_IN },
    ],
  },
  {
    name: 'Lift Off',
    settings: {
      osc1Waveform: WAVEFORMS.SQUARE, osc1Octave: 32,
      osc2Waveform: WAVEFORMS.SQUARE, osc2Octave: 4, osc2Detune: 0, osc2Sync: true,
      osc1Level: 3.5, osc2Level: 5, noiseLevel: 6,
      cutoff: 2, resonance: 0.2, envAmt: 4, kbTrack: KB_TRACK.FULL,
      attack: 7.5, decay: 8, sustain: 0.5, release: 9.5,
      vcaMode: VCA_MODES.ENV, volume: 5, reverbMix: 5,
      lfoRate: 3.5, lfoWaveform: LFO_WAVEFORMS.SINE,
      pitchAmt: 0.5, cutoffAmt: 0.5, pwAmt: 6.5,
      highPass: 5, attenuator: 3,
      arpRate: 0.5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.ENV_NEG_OUT, dest: PATCH_POINTS.ATTEN_IN },
      { source: PATCH_POINTS.ATTEN_OUT, dest: PATCH_POINTS.OSC2_PITCH_IN },
    ],
  },
  {
    name: '3 Saws',   // the LFO, played from the keys, is the third saw
    settings: {
      osc1Waveform: WAVEFORMS.SAW, osc1Octave: 16,
      osc2Waveform: WAVEFORMS.SAW, osc2Octave: 16, osc2Detune: 0,
      osc1Level: 3.5, osc2Level: 3, noiseLevel: 5,
      cutoff: 9, resonance: 0.2, envAmt: 0, kbTrack: KB_TRACK.OFF,
      attack: 0.5, decay: 0.5, sustain: 10, release: 0.5,
      vcaMode: VCA_MODES.ENV, volume: 5, reverbMix: 0.5,
      lfoRate: 8, lfoWaveform: LFO_WAVEFORMS.SAWTOOTH,
      pitchAmt: 0.5, cutoffAmt: 0.5, pwAmt: 0.5,
      highPass: 5, attenuator: 0,
      arpRate: 5, arpDirection: ARP_MODES.ORDER, arpOctave: 1,
    },
    patches: [
      { source: PATCH_POINTS.KB_PITCH_CV, dest: PATCH_POINTS.LFO_RATE_IN },
      { source: PATCH_POINTS.LFO_WAVE_OUT, dest: PATCH_POINTS.MIXER_NOISE_IN },
    ],
  },
];
