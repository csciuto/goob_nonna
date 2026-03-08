import { PanelController } from './panels/panel-controller.js';
import { PanelOscillators } from './panels/panel-oscillators.js';
import { PanelMixer } from './panels/panel-mixer.js';
import { PanelFilter } from './panels/panel-filter.js';
import { PanelEnvelope } from './panels/panel-envelope.js';
import { PanelOutput } from './panels/panel-output.js';
import { PanelModulation } from './panels/panel-modulation.js';
import { PanelUtilities } from './panels/panel-utilities.js';
import { PanelArpSeq } from './panels/panel-arp-seq.js';
import { PanelBack } from './panels/panel-back.js';
import { Keyboard } from './keyboard.js';
import { PatchCableRenderer } from './patch-cables.js';
import { Knob } from './components/knob.js';
import { Button } from './components/button.js';
import { SwitchControl } from './components/switch-control.js';

/**
 * Layout - Assembles all panels, keyboard, and patch cable system.
 */
export class Layout {
  constructor() {
    this.panels = {};
    this.keyboard = null;
    this.patchCables = null;
    this._jackElements = new Map(); // jackId → DOM element
    this._toastEl = null;
    this._toastTimer = null;
  }

  /**
   * Build the complete UI.
   * @param {HTMLElement} container - Root container element
   * @returns {object} All UI references for wiring
   */
  build(container) {
    // Main panel area (relative positioned for SVG overlay)
    const panelArea = document.createElement('div');
    panelArea.className = 'panel-area';
    container.appendChild(panelArea);

    const onJackClick = (id, type, element) => {
      this._jackElements.set(id, element);
      if (this.patchCables) {
        this.patchCables.handleJackClick(id, type, element);
      }
    };

    // Create all panels
    this.panels.controller = new PanelController();
    this.panels.oscillators = new PanelOscillators({ onJackClick });
    this.panels.mixer = new PanelMixer({ onJackClick });
    this.panels.filter = new PanelFilter({ onJackClick });
    this.panels.envelope = new PanelEnvelope({ onJackClick });
    this.panels.output = new PanelOutput({ onJackClick });
    this.panels.modulation = new PanelModulation({ onJackClick });
    this.panels.utilities = new PanelUtilities({ onJackClick });
    this.panels.arpSeq = new PanelArpSeq({ onJackClick });
    this.panels.back = new PanelBack({ onJackClick });

    // Assemble panels left-to-right matching real Grandmother
    const panelRow = document.createElement('div');
    panelRow.className = 'panel-row';

    panelRow.appendChild(this.panels.arpSeq.getElement());
    panelRow.appendChild(this.panels.modulation.getElement());
    panelRow.appendChild(this.panels.oscillators.getElement());
    panelRow.appendChild(this.panels.mixer.getElement());
    panelRow.appendChild(this.panels.utilities.getElement());
    panelRow.appendChild(this.panels.filter.getElement());
    panelRow.appendChild(this.panels.envelope.getElement());
    panelRow.appendChild(this.panels.output.getElement());

    panelArea.appendChild(panelRow);

    // Patch cable SVG overlay
    this.patchCables = new PatchCableRenderer({
      container: panelArea,
      onConnect: null, // Will be set by main.js
      onDisconnect: null,
    });

    // Title strip between panels and keyboard (like real Grandmother)
    const titleStrip = document.createElement('div');
    titleStrip.className = 'synth-title-strip';
    titleStrip.innerHTML = '<div class="title-left"><span class="title-goob">GOOB</span><span class="title-nonna">NONNA</span><span class="title-subtitle">SEMI-MODULAR ANALOG SYNTHESIZER</span></div><div class="title-right"><div class="preset-selector"><select id="preset-select"><option value="">-- Select Preset --</option></select></div><button class="kebab-btn" id="kebab-btn" title="More">&#8942;</button></div>';

    // Back panel popover
    const backPopover = document.createElement('div');
    backPopover.className = 'back-popover hidden';
    backPopover.id = 'back-popover';

    const guideLink = document.createElement('a');
    guideLink.href = 'docs/getting-started.html';
    guideLink.className = 'guide-link';
    guideLink.textContent = 'Guide';
    backPopover.appendChild(guideLink);

    // Key label toggle: none / key / note
    this._keyLabelSwitch = new SwitchControl({
      label: 'KEYS',
      positions: [
        { value: 'none', label: 'OFF' },
        { value: 'key', label: 'KEY' },
        { value: 'note', label: 'NOTE' },
      ],
      selectedIndex: 1,
    });
    this._keyLabelSwitch.onChange = (v) => {
      if (this.keyboard) this.keyboard.setLabelMode(v);
    };
    this._keyLabelSwitch.getElement().classList.add('popover-switch');
    backPopover.appendChild(this._keyLabelSwitch.getElement());

    backPopover.appendChild(this.panels.back.getElement());

    const versionLabel = document.createElement('div');
    versionLabel.className = 'version-label';
    versionLabel.textContent = 'v0.1';
    backPopover.appendChild(versionLabel);
    titleStrip.querySelector('.title-right').appendChild(backPopover);

    // Kebab menu toggle
    titleStrip.querySelector('#kebab-btn').addEventListener('click', () => {
      backPopover.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.kebab-btn') && !e.target.closest('.back-popover')) {
        backPopover.classList.add('hidden');
      }
    });
    container.appendChild(titleStrip);

    // Keyboard area with controls alongside
    this.keyboard = new Keyboard({});
    const keyboardArea = document.createElement('div');
    keyboardArea.className = 'keyboard-area';

    // Left controls: top row (glide + buttons), bottom row (wheels)
    const leftControls = document.createElement('div');
    leftControls.className = 'keyboard-left-controls';

    // Top row: glide knob + buttons
    const topRow = document.createElement('div');
    topRow.className = 'keyboard-top-row';

    // Glide knob (blue label)
    this.glideKnob = new Knob({ label: 'GLIDE', min: 0, max: 10, value: 0 });
    this.glideKnob.getElement().classList.add('glide-knob');
    this.glideKnob.getElement().dataset.tooltip = 'Portamento time between notes';
    topRow.appendChild(this.glideKnob.getElement());

    // Triple-label buttons: PLAY, HOLD, TAP
    const buttonsSection = document.createElement('div');
    buttonsSection.className = 'kb-buttons-section';

    this.playBtn = new Button({ label: 'PLAY', toggle: true });
    this.holdBtn = new Button({ label: 'HOLD', toggle: true });
    this.tapBtn = new Button({ label: 'TAP', toggle: false });

    this.playBtn.getElement().classList.add('light-green');
    this.holdBtn.getElement().classList.add('light-blue');
    this.tapBtn.getElement().classList.add('light-yellow');

    this.playBtn.getElement().dataset.tooltip = 'Start/stop arp/seq. Alt: < KB shifts keyboard down. Rec: TIE extends note.';
    this.holdBtn.getElement().dataset.tooltip = 'Latch arp notes. Alt: SHIFT modifier. Rec: REST inserts silence.';
    this.tapBtn.getElement().dataset.tooltip = 'Tap to set tempo. Alt: KB > shifts keyboard up. Rec: ACCENT marks step louder.';

    // Build triple-label button wrappers
    buttonsSection.appendChild(this._makeTripleButton(this.playBtn, '< KB', 'TIE'));
    buttonsSection.appendChild(this._makeTripleButton(this.holdBtn, 'SHIFT', 'REST'));
    buttonsSection.appendChild(this._makeTripleButton(this.tapBtn, 'KB >', 'ACCENT'));

    topRow.appendChild(buttonsSection);
    leftControls.appendChild(topRow);

    // Bottom row: wheels
    const wheelsSection = document.createElement('div');
    wheelsSection.className = 'keyboard-wheels';
    wheelsSection.appendChild(this.panels.controller.pitchWheel.getElement());
    wheelsSection.appendChild(this.panels.controller.modWheel.getElement());
    leftControls.appendChild(wheelsSection);

    keyboardArea.appendChild(leftControls);
    keyboardArea.appendChild(this.keyboard.getElement());
    container.appendChild(keyboardArea);

    // Handle window resize to update cable positions
    window.addEventListener('resize', () => {
      if (this.patchCables) {
        this.patchCables.updatePositions();
      }
    });

    // Store jack elements from all panels
    this._collectJackElements();

    // Toast notification element
    this._toastEl = document.createElement('div');
    this._toastEl.className = 'synth-toast';
    document.body.appendChild(this._toastEl);

    return this;
  }

  _showToast(msg) {
    clearTimeout(this._toastTimer);
    this._toastEl.textContent = msg;
    this._toastEl.classList.add('visible');
    this._toastTimer = setTimeout(() => this._toastEl.classList.remove('visible'), 1500);
  }

  _shiftKeyboard(dir) {
    const kb = this.keyboard;
    const newOffset = kb.getNoteOffset() + dir * 12;
    // Clamp so lowest visual key (F2=41) + offset stays >= 0
    // and highest visual key (C5=72) + offset stays <= 127
    if (41 + newOffset < 0 || 72 + newOffset > 127) return;
    kb.setNoteOffset(newOffset);
    // Show current range in toast
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const lowNote = 41 + newOffset;
    const lowName = NOTE_NAMES[lowNote % 12];
    const lowOct = Math.floor(lowNote / 12) - 1;
    const hiNote = 72 + newOffset;
    const hiName = NOTE_NAMES[hiNote % 12];
    const hiOct = Math.floor(hiNote / 12) - 1;
    this._showToast(`KEYBOARD: ${lowName}${lowOct} – ${hiName}${hiOct}`);
  }

  _makeTripleButton(button, aboveLabel, belowLabel) {
    const wrapper = document.createElement('div');
    wrapper.className = 'triple-button';

    const above = document.createElement('div');
    above.className = 'triple-label triple-label-above';
    above.textContent = aboveLabel;

    const below = document.createElement('div');
    below.className = 'triple-label triple-label-below';
    below.textContent = belowLabel;

    wrapper.appendChild(above);
    wrapper.appendChild(button.getElement());
    wrapper.appendChild(below);
    return wrapper;
  }

  _collectJackElements() {
    // Collect all jack DOM elements and wire right-click removal
    for (const panel of Object.values(this.panels)) {
      if (panel.jacks) {
        for (const jack of Object.values(panel.jacks)) {
          this._jackElements.set(jack.id, jack._jack);
          jack.onRightClick = (id) => {
            if (this.patchCables) this.patchCables.removeJackCables(id);
          };
        }
      }
    }
  }

  getJackElement(jackId) {
    return this._jackElements.get(jackId);
  }

  /**
   * Wire all UI controls to the audio engine.
   */
  wireToEngine(engine) {
    for (const panel of Object.values(this.panels)) {
      if (panel.wire) panel.wire(engine);
    }
    // Wire glide knob
    // Shift + glide knob: legato glide on (right) / off (left)
    this._lastGlideValue = this.glideKnob.value;
    this.glideKnob.onChange = (v) => {
      engine.setGlide(v);
      if (this._shiftHeld) {
        const turningRight = v > this._lastGlideValue;
        engine.setLegatoGlide(turningRight);
        this._showToast(turningRight ? 'LEGATO GLIDE ON' : 'LEGATO GLIDE OFF');
      }
      this._lastGlideValue = v;
    };

    // Wire arp/seq controls
    const arpSeq = engine.getArpSeq();

    // Arp/seq panel controls
    this.panels.arpSeq.mode.onChange = (v) => {
      arpSeq.setMode(v);
      if (v === 'rec') {
        this.playBtn.setActive(false);
        this.holdBtn.setActive(false);
      }
    };
    this.panels.arpSeq.direction.onChange = (v) => arpSeq.setDirection(v);
    this.panels.arpSeq.octSeq.onChange = (v) => arpSeq.setOctSeq(v);
    this.panels.arpSeq.rate.onChange = (v) => arpSeq.setRate(v);

    // LED blink on arp/seq step
    arpSeq.onStep = () => {
      this.panels.arpSeq.led.setOn(true);
      setTimeout(() => this.panels.arpSeq.led.setOn(false), 50);
    };


    // Wire buttons
    // Shift + PLAY = octave down (< KB), Shift + TAP = octave up (KB >)
    this.playBtn.onChange = (active) => {
      if (this._shiftHeld) {
        // < KB: shift keyboard down one octave
        this._shiftKeyboard(-1);
        // Undo the toggle
        this.playBtn.setActive(arpSeq.isPlaying());
        return;
      }
      arpSeq.pressPlay();
      // Sync button state with arp/seq state
      if (!arpSeq.isPlaying() && active) this.playBtn.setActive(false);
      if (arpSeq.isPlaying() && !active) this.playBtn.setActive(true);
    };

    this.holdBtn.onChange = (active) => {
      if (this._shiftHeld) {
        // SHIFT is already the modifier key — HOLD click while shift held does nothing
        this.holdBtn.setActive(arpSeq.isHolding());
        return;
      }
      arpSeq.pressHold();
      const holding = arpSeq.isHolding();
      if (active !== holding) this.holdBtn.setActive(holding);
      this._showToast(holding ? 'HOLD ON' : 'HOLD OFF');
    };

    // Shift key acts as HOLD-modifier for combo functions
    // (on real hardware you'd hold the HOLD button, but mouse can't do two things at once)
    this._shiftHeld = false;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        this._shiftHeld = true;
        this.holdBtn.setActive(true);
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this._shiftHeld = false;
        this.holdBtn.setActive(arpSeq.isHolding());
      }
    });

    this.tapBtn.onPress = () => {
      if (this._shiftHeld) {
        // KB >: shift keyboard up one octave
        this._shiftKeyboard(1);
        return;
      }
      arpSeq.pressTap();
    };
    this.tapBtn.onRelease = () => {
      if (this._shiftHeld) return;
      arpSeq.releaseTap();
    };

    // TAP LED: lights when tap tempo is active
    arpSeq.onTapTempoChange = (active) => {
      this.tapBtn.setActive(active);
      this._showToast(active ? 'TAP TEMPO ON' : 'TAP TEMPO OFF');
    };

    // Feed keyboard notes into arp/seq OR engine depending on mode
    const origNoteOn = this.keyboard.onNoteOn;
    const origNoteOff = this.keyboard.onNoteOff;
    this.keyboard.onNoteOn = (note, vel) => {
      arpSeq.noteOn(note, vel);
      // When arp/seq is playing, don't send notes directly to engine
      if (!arpSeq.isPlaying()) {
        if (origNoteOn) origNoteOn(note, vel);
      }
    };
    this.keyboard.onNoteOff = (note) => {
      arpSeq.noteOff(note);
      if (!arpSeq.isPlaying()) {
        if (origNoteOff) origNoteOff(note);
      }
    };
  }
}
