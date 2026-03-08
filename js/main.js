import { ensureAudioContextRunning } from './audio/audio-context.js';
import { AudioEngine } from './audio/engine.js';
import { Layout } from './ui/layout.js';
import { CABLE_COLORS } from './utils/constants.js';

/**
 * Main entry point - bootstraps the synth application.
 */

let engine = null;
let layout = null;
let uiBuilt = false;
let initPromise = null;

function buildUI() {
  if (uiBuilt) return;
  uiBuilt = true;

  const container = document.getElementById('synth');
  layout = new Layout();
  layout.build(container);

  // Wire keyboard — audio engine starts lazily on first interaction.
  // After engine exists, calls are synchronous (no microtask delay).
  // During init, all calls wait on the same shared promise.
  layout.keyboard.onNoteOn = (note, vel) => {
    if (engine) {
      engine.noteOn(note, vel);
    } else {
      initAudio().then(() => engine.noteOn(note, vel));
    }
  };
  layout.keyboard.onNoteOff = (note) => {
    if (engine) {
      engine.noteOff(note);
    } else {
      initAudio().then(() => engine.noteOff(note));
    }
  };

  // Initialize audio on any click in the synth (so arp buttons work without playing a note first)
  document.getElementById('synth').addEventListener('click', () => initAudio(), { once: true });

  // Wire patch cables
  layout.patchCables.onConnect = (sourceId, destId, color) => {
    if (!engine) return;
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
    if (!engine) return;
    engine.removePatch(patchId);
    layout.patchCables.removeCable(patchId);
  };

  loadPresetSelector();

  console.log('Goob Nonna UI ready');
}

function initAudio() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const ctx = await ensureAudioContextRunning();
    engine = new AudioEngine(ctx);
    layout.wireToEngine(engine);
    console.log('Goob Nonna audio initialized');
  })();
  return initPromise;
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
      // Blur so keyboard input goes back to the synth
      select.blur();
    });

    // Prevent select from capturing keyboard when focused
    select.addEventListener('keydown', (e) => {
      // Allow Enter/Space for normal select interaction, block everything else
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        select.blur();
      }
    });
  } catch (err) {
    console.warn('Presets not yet available:', err);
  }
}

async function applyPreset(preset) {
  if (!layout) return;
  await initAudio();
  if (!engine) return;

  // Remove all existing patches
  engine.removeAllPatches();
  layout.patchCables.removeAllCables();

  // Apply knob/switch settings to BOTH engine AND UI controls.
  // Setting UI controls via setValue() fires onChange which sets the engine,
  // so we only need to call engine directly for controls without UI counterparts.
  if (preset.settings) {
    const s = preset.settings;
    const p = layout.panels;

    // Oscillators — UI switches + knobs
    if (s.osc1Waveform !== undefined) {
      engine.setOsc1Waveform(s.osc1Waveform);
    }
    if (s.osc1Octave !== undefined) engine.setOsc1Octave(s.osc1Octave);
    if (s.osc1Detune !== undefined) engine.setOsc1Detune(s.osc1Detune);
    if (s.osc2Waveform !== undefined) engine.setOsc2Waveform(s.osc2Waveform);
    if (s.osc2Octave !== undefined) engine.setOsc2Octave(s.osc2Octave);
    if (s.osc2Detune !== undefined) p.oscillators.osc2Freq.setValue(s.osc2Detune);
    if (s.osc2Sync !== undefined) engine.setOsc2Sync(s.osc2Sync);

    // Mixer
    if (s.osc1Level !== undefined) p.mixer.osc1Level.setValue(s.osc1Level);
    if (s.osc2Level !== undefined) p.mixer.osc2Level.setValue(s.osc2Level);
    if (s.noiseLevel !== undefined) p.mixer.noiseLevel.setValue(s.noiseLevel);

    // Filter
    if (s.cutoff !== undefined) p.filter.cutoff.setValue(s.cutoff);
    if (s.resonance !== undefined) p.filter.resonance.setValue(s.resonance);
    if (s.envAmt !== undefined) p.filter.envAmt.setValue(s.envAmt);
    if (s.kbTrack !== undefined) engine.setFilterKbTrack(s.kbTrack);

    // Envelope
    if (s.attack !== undefined) p.envelope.attack.setValue(s.attack);
    if (s.decay !== undefined) p.envelope.decay.setValue(s.decay);
    if (s.sustain !== undefined) p.envelope.sustain.setValue(s.sustain);
    if (s.release !== undefined) p.envelope.release.setValue(s.release);

    // VCA
    if (s.vcaMode !== undefined) engine.setVCAMode(s.vcaMode);
    if (s.volume !== undefined) p.output.volume.setValue(s.volume);

    // Reverb
    if (s.reverbMix !== undefined) p.output.reverbMix.setValue(s.reverbMix);

    // LFO
    if (s.lfoRate !== undefined) p.modulation.lfoRate.setValue(s.lfoRate);
    if (s.lfoWaveform !== undefined) engine.setLFOWaveform(s.lfoWaveform);
    if (s.pitchAmt !== undefined) p.modulation.pitchAmt.setValue(s.pitchAmt);
    if (s.cutoffAmt !== undefined) p.modulation.cutoffAmt.setValue(s.cutoffAmt);
    if (s.pwAmt !== undefined) p.modulation.pwAmt.setValue(s.pwAmt);
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

// Build UI immediately on load — audio deferred to first user interaction
document.addEventListener('DOMContentLoaded', () => buildUI());
