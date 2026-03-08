import { ensureAudioContextRunning, getAudioContext } from './audio/audio-context.js';
import { AudioEngine } from './audio/engine.js';
import { Layout } from './ui/layout.js';
import { CABLE_COLORS } from './utils/constants.js';

/**
 * Main entry point - bootstraps the synth application.
 */

let engine = null;
let layout = null;
let initialized = false;

async function init() {
  if (initialized) return;
  initialized = true;

  const ctx = await ensureAudioContextRunning();
  engine = new AudioEngine(ctx);

  // Build UI
  const container = document.getElementById('synth');
  layout = new Layout();
  layout.build(container);

  // Wire UI to engine
  layout.wireToEngine(engine);

  // Wire keyboard
  layout.keyboard.onNoteOn = (note, vel) => {
    ensureAudioContextRunning();
    engine.noteOn(note, vel);
  };
  layout.keyboard.onNoteOff = (note) => {
    engine.noteOff(note);
  };

  // Wire patch cables
  layout.patchCables.onConnect = (sourceId, destId, color) => {
    const patchId = engine.createPatch(sourceId, destId, color);
    if (patchId) {
      const sourceEl = layout.getJackElement(sourceId);
      const destEl = layout.getJackElement(destId);
      if (sourceEl && destEl) {
        layout.patchCables.addCable(patchId, sourceEl, destEl, color);
      }
    }
  };

  layout.patchCables.onDisconnect = (patchId) => {
    engine.removePatch(patchId);
    layout.patchCables.removeCable(patchId);
  };

  // Load presets into selector
  loadPresetSelector();

  console.log('Goob Nonna initialized');
}

async function loadPresetSelector() {
  const select = document.getElementById('preset-select');
  if (!select) return;

  try {
    const { PRESETS } = await import('./presets.js');
    for (const preset of PRESETS) {
      const option = document.createElement('option');
      option.value = preset.name;
      option.textContent = preset.name;
      select.appendChild(option);
    }

    select.addEventListener('change', (e) => {
      const presetName = e.target.value;
      if (!presetName) return;
      const preset = PRESETS.find(p => p.name === presetName);
      if (preset) applyPreset(preset);
    });
  } catch (err) {
    console.warn('Presets not yet available:', err);
  }
}

function applyPreset(preset) {
  if (!engine || !layout) return;

  // Remove all existing patches
  engine.removeAllPatches();
  layout.patchCables.removeAllCables();

  // Apply knob/switch settings
  if (preset.settings) {
    const s = preset.settings;

    // Oscillators
    if (s.osc1Waveform !== undefined) {
      engine.setOsc1Waveform(s.osc1Waveform);
      // Update UI switch would require panel reference
    }
    if (s.osc1Octave !== undefined) engine.setOsc1Octave(s.osc1Octave);
    if (s.osc1Detune !== undefined) engine.setOsc1Detune(s.osc1Detune);
    if (s.osc2Waveform !== undefined) engine.setOsc2Waveform(s.osc2Waveform);
    if (s.osc2Octave !== undefined) engine.setOsc2Octave(s.osc2Octave);
    if (s.osc2Detune !== undefined) engine.setOsc2Detune(s.osc2Detune);
    if (s.osc2Sync !== undefined) engine.setOsc2Sync(s.osc2Sync);

    // Mixer
    if (s.osc1Level !== undefined) engine.setMixerOsc1Level(s.osc1Level);
    if (s.osc2Level !== undefined) engine.setMixerOsc2Level(s.osc2Level);
    if (s.noiseLevel !== undefined) engine.setMixerNoiseLevel(s.noiseLevel);

    // Filter
    if (s.cutoff !== undefined) engine.setFilterCutoff(s.cutoff / 10);
    if (s.resonance !== undefined) engine.setFilterResonance(s.resonance);
    if (s.envAmt !== undefined) engine.setFilterEnvAmount(s.envAmt / 5);
    if (s.kbTrack !== undefined) engine.setFilterKbTrack(s.kbTrack);

    // Envelope
    if (s.attack !== undefined) engine.setEnvAttack(s.attack);
    if (s.decay !== undefined) engine.setEnvDecay(s.decay);
    if (s.sustain !== undefined) engine.setEnvSustain(s.sustain);
    if (s.release !== undefined) engine.setEnvRelease(s.release);

    // VCA
    if (s.vcaMode !== undefined) engine.setVCAMode(s.vcaMode);
    if (s.volume !== undefined) engine.setOutputLevel(s.volume);

    // Reverb
    if (s.reverbMix !== undefined) engine.setReverbMix(s.reverbMix);

    // LFO
    if (s.lfoRate !== undefined) engine.setLFORate(s.lfoRate);
    if (s.lfoWaveform !== undefined) engine.setLFOWaveform(s.lfoWaveform);
    if (s.pitchAmt !== undefined) engine.setPitchAmount(s.pitchAmt / 10);
    if (s.cutoffAmt !== undefined) engine.setCutoffAmount(s.cutoffAmt / 10);
    if (s.pwAmt !== undefined) engine.setPWAmount(s.pwAmt / 10);
  }

  // Apply patch cables
  if (preset.patches) {
    for (const patch of preset.patches) {
      const color = CABLE_COLORS[Math.floor(Math.random() * CABLE_COLORS.length)];
      const patchId = engine.createPatch(patch.source, patch.dest, color);
      if (patchId) {
        const sourceEl = layout.getJackElement(patch.source);
        const destEl = layout.getJackElement(patch.dest);
        if (sourceEl && destEl) {
          layout.patchCables.addCable(patchId, sourceEl, destEl, color);
        }
      }
    }
  }
}

// Initialize on first user interaction (required for AudioContext)
document.addEventListener('click', () => init(), { once: true });

// Also try to init on DOMContentLoaded (UI will render, audio waits for click)
document.addEventListener('DOMContentLoaded', () => {
  // Create a start overlay
  const overlay = document.createElement('div');
  overlay.id = 'start-overlay';
  overlay.innerHTML = '<div class="start-message"><h2>GOOB NONNA</h2><p>Click anywhere to start</p></div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', async () => {
    await init();
    overlay.remove();
  });
});
