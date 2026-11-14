import { ensureAudioContextRunning } from './audio/audio-context.js';
import { AudioEngine } from './audio/engine.js';
import { Layout } from './ui/layout.js';
import { buildControls, readState, applyState, sendAll, encodePatch, decodePatch } from './ui/controls.js';
import { initMidiIn } from './vendor/midi-in.js';
import { MidiClockFollower, ticksPerStep } from './arp-seq/midi-clock.js';
import { CABLE_COLORS } from './utils/constants.js';

/**
 * Main entry point - bootstraps the synth application.
 */

let engine = null;
let layout = null;
let uiBuilt = false;
let initPromise = null;
let controls = null;        // every sound-shaping control, by name (ui/controls.js)
let defaults = null;        // their values on a fresh page
const cables = new Map();   // patchId -> [sourceId, destId]: the cables on the panel

function buildUI() {
  if (uiBuilt) return;
  uiBuilt = true;

  const container = document.getElementById('synth');
  layout = new Layout();
  layout.build(container);
  controls = buildControls(layout);
  defaults = readState(controls);

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

  // Start the audio on the first press anywhere, mouse or touch (so arp buttons work without playing a note
  // first). Not 'click': iPhone Safari only sends clicks to elements it thinks are clickable.
  for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => initAudio(), { once: true });

  // Wire patch cables
  layout.patchCables.onConnect = (sourceId, destId, color) => { addCable(sourceId, destId, color); saveToLink(); };
  layout.patchCables.onDisconnect = (patchId) => { removeCable(patchId); saveToLink(); };

  loadPresetSelector();
  setupMidi();

  // A share link carries a patch: set the panel from it now; the engine picks it up when audio starts
  const shared = location.hash.startsWith('#patch=') && decodePatch(location.hash.slice(7), defaults, id => !!layout.getJackElement(id));
  if (shared) requestAnimationFrame(() => loadPatch(shared.state, shared.cables));

  // Keep the address in step with the panel, so the page can be reloaded or shared as it stands
  let timer = null;
  for (const type of ['pointerup', 'keyup', 'click', 'wheel']) {
    document.addEventListener(type, () => { clearTimeout(timer); timer = setTimeout(saveToLink, 250); }, { passive: true });
  }
}

// ── MIDI keyboard ────────────────────────────────────────────────

/**
 * MIDI IN: a keyboard plays the synth like its own keys (through the arpeggiator and sequencer too),
 * with velocity at KB VEL OUT, both wheels moving the panel's wheels, and MIDI clock driving the
 * arpeggiator while it runs.
 */
function setupMidi() {
  const button = document.getElementById('midi-btn');
  const wheels = layout.panels.controller;
  const follower = new MidiClockFollower();
  let clockTimer = null;
  const midi = initMidiIn(button, {
    noteOn: (note, velocity) => layout.keyboard.externalNoteOn(note, velocity),
    noteOff: note => layout.keyboard.externalNoteOff(note),
    bend: value => wheels.pitchWheel.setValue(value),
    mod: value => wheels.modWheel.setValue(value),
    clock() {
      if (!engine) return;
      const arpSeq = engine.getArpSeq();
      arpSeq.setExternalClock(true, 'midi');
      if (follower.tick(ticksPerStep(controls.arpRate.get()))) arpSeq.externalClockTick();
      clearTimeout(clockTimer);        // the clock stopped coming: hand the tempo back to the RATE knob
      clockTimer = setTimeout(() => arpSeq.setExternalClock(false, 'midi'), 1000);
    },
    start() { follower.start(); if (engine) engine.getArpSeq().externalReset(); },
    allOff() { layout.keyboard.externalAllOff(); wheels.pitchWheel.setValue(0); },
    status: text => layout._showToast((text + (text.endsWith('connected') && !engine ? ' · click once for sound' : '')).toUpperCase()),
    active: on => button.setAttribute('aria-pressed', String(on)),
  }, { storageKey: 'goobNonna.midiIn' });
  window.__midiIn = midi.feed;       // test hook: bytes as if a keyboard sent them
}

// ── Cables ───────────────────────────────────────────────────────

/** Put a cable on the panel and, once the audio is running, in the engine. */
function addCable(sourceId, destId, color = CABLE_COLORS[cables.size % CABLE_COLORS.length]) {
  const sourceEl = layout.getJackElement(sourceId), destEl = layout.getJackElement(destId);
  if (!sourceEl || !destEl) return;
  const patchId = `${sourceId}->${destId}`;
  if (cables.has(patchId)) return;
  if (engine && !engine.createPatch(sourceId, destId, color)) return;     // not a connection the synth can make
  cables.set(patchId, [sourceId, destId]);
  layout.patchCables.addCable(patchId, sourceEl, destEl, color);
}

function removeCable(patchId) {
  if (!cables.delete(patchId)) return;
  if (engine) engine.removePatch(patchId);
  layout.patchCables.removeCable(patchId);
}

/** Replace the whole patch: every control (defaults where `state` is silent) and every cable. */
function loadPatch(state, cableList = []) {
  for (const id of [...cables.keys()]) removeCable(id);
  applyState(controls, state, defaults);
  for (const [sourceId, destId] of cableList) addCable(sourceId, destId);
}

function saveToLink() {
  if (!controls) return;
  const text = encodePatch(readState(controls), defaults, [...cables.values()]);
  const hash = text ? '#patch=' + text : '';
  if (hash !== location.hash) history.replaceState(null, '', hash || location.pathname + location.search);
}

function initAudio() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const ctx = await ensureAudioContextRunning();
    engine = await AudioEngine.create(ctx);
    layout.wireToEngine(engine);
    sendAll(controls);                 // the engine starts from its own defaults: give it the panel's settings
    for (const [patchId, [sourceId, destId]] of [...cables]) {
      if (!engine.createPatch(sourceId, destId)) { cables.delete(patchId); layout.patchCables.removeCable(patchId); }
    }
    window.__synth = { engine, layout, controls };     // for the browser tests and for poking at it from the console
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

function applyPreset(preset) {
  loadPatch(preset.settings || {}, (preset.patches || []).map(p => [p.source, p.dest]));
  saveToLink();
  initAudio();
}

// Build UI immediately on load — audio deferred to first user interaction
document.addEventListener('DOMContentLoaded', () => buildUI());
