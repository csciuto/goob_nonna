# Goob Nonna

A web-based clone of the Moog Grandmother analog synthesizer, built with vanilla JavaScript and the Web Audio API. No build tools, no frameworks — just static files you can serve from anywhere.

## Demo

Open `index.html` in a modern browser (Chrome/Firefox/Edge) or deploy to GitHub Pages. The UI loads immediately; audio initializes on your first note.

## Features

### Audio Engine
- **2 Oscillators** — Saw, Triangle, Square, Narrow Pulse waveforms; 5 octave ranges (32' to 2'); fine tune detune
- **3-Channel Mixer** — Independent level controls for OSC 1, OSC 2, and Noise
- **Moog Ladder Filter** — -24dB/oct low-pass (two cascaded BiquadFilters); cutoff, resonance (with self-oscillation), keyboard tracking, bipolar envelope amount
- **ADSR Envelope** — Attack, Decay, Sustain, Release with logarithmic time scaling via ConstantSourceNode automation
- **VCA** — Three modes: ENV (full ADSR), KB RLS (instant attack, envelope release), DRONE (always on)
- **LFO** — Triangle, Square, Sawtooth, Ramp, Sample & Hold; routable to pitch, cutoff, and pulse width via mod wheel
- **Spring Reverb** — ConvolverNode with procedurally generated spring-like impulse response; dry/wet mix control
- **White Noise Generator** — Looping AudioBuffer with random samples

### Semi-Modular Patch System
- **41 patch points** (inputs and outputs) matching the Grandmother's patch bay
- **14 normalled (default) connections** — the synth works without any cables patched
- **Click-to-connect** patch cable system with SVG rendering
- **Automatic normalling** — patching into an input breaks the default connection; removing the cable restores it
- Color-coded cables cycling through red, blue, yellow, green, orange, purple

### Utility Modules
- **Mult** — 4-jack passive multiple (signal splitter)
- **High-Pass Filter** — -6dB/oct utility HPF with adjustable cutoff
- **Attenuator** — Bipolar attenuator (-1 to +1), normalled to DC source

### Arpeggiator / Sequencer
- **Arpeggiator** — Order, Forward, Backward, Forward-Backward, Random modes; 1-3 octave range; Hold
- **Sequencer** — 256 steps, 3 slots, record/play with tie/rest/accent per step
- **Clock** — Adjustable rate with tap tempo

### 14 Factory Presets (TODO)
Funky Robot, Showdown Guitar, Dynasty Plucks, Haunted Cave, Ultra Sub Bass, Cavern Strings, J-Bass, Auto Zap Bass, Stepped Drone, Cyclical Patterns, Bag Pipes, Piano Bass, Lift Off, 3 Saws

> **Note:** Preset values were OCR'd from documentation and do not sound correct. They need to be rebuilt by ear against actual Grandmother behavior.

### UI
- **32-note keyboard** (F2 to C5) with mouse and QWERTY input
- **Rotary knobs** with vertical drag control
- **Multi-position switches** for waveform/mode selection
- **Vertical sliders** for ADSR
- **Pitch wheel** (spring-return) and **Mod wheel** (stays in position)
- **Hover tooltips** on every control and patch point
- Flat CSS visuals, charcoal case with cream panels and colorful module accents, desktop-first (1280px minimum)

## Architecture

```
UI Components (DOM/CSS)  →  Controller (main.js)  →  Audio Engine (Web Audio API)
```

### File Structure

```
├── index.html                          # Entry point
├── style.css                           # All styles
├── SYNTH_SPEC.md                       # Full synthesizer specification
├── js/
│   ├── main.js                         # Bootstrap, AudioContext init, wiring
│   ├── presets.js                      # 14 factory presets
│   ├── audio/
│   │   ├── audio-context.js            # AudioContext singleton
│   │   ├── engine.js                   # Creates all modules + routing
│   │   ├── modules/
│   │   │   ├── oscillator.js           # OSC1/OSC2
│   │   │   ├── mixer.js               # 3-channel mixer
│   │   │   ├── filter.js              # -24dB/oct ladder filter
│   │   │   ├── envelope.js            # ADSR envelope
│   │   │   ├── vca.js                 # Voltage controlled amplifier
│   │   │   ├── lfo.js                 # Low frequency oscillator
│   │   │   ├── noise.js               # White noise generator
│   │   │   ├── reverb.js              # Spring reverb (ConvolverNode)
│   │   │   ├── high-pass-filter.js    # Utility HPF
│   │   │   └── attenuator.js          # Bipolar attenuator
│   │   └── routing/
│   │       ├── patch-manager.js        # Patch cable connections + normalling
│   │       ├── normalled-connections.js # Default wiring table
│   │       └── signal-bus.js           # Jack registry
│   ├── ui/
│   │   ├── components/                 # Knob, Switch, Slider, Jack, Button, LED, Wheel
│   │   ├── panels/                     # Controller, Oscillators, Mixer, Filter, Envelope,
│   │   │                               # Output, Modulation, Utilities, Arp/Seq
│   │   ├── keyboard.js                # 32-note visual keyboard
│   │   ├── patch-cables.js            # SVG cable rendering
│   │   └── layout.js                  # Assembles all panels
│   ├── arp-seq/
│   │   ├── arpeggiator.js
│   │   ├── sequencer.js
│   │   └── clock.js
│   └── utils/
│       ├── math.js                     # V/oct, frequency math, range mapping
│       └── constants.js                # All constants, patch point IDs
├── tests/
│   ├── unit/                           # Vitest unit tests
│   └── e2e/                            # Playwright E2E tests
├── package.json
├── vitest.config.js
└── playwright.config.js
```

## Getting Started

### Run Locally

No build step required. Just serve the static files:

```bash
npx serve . -p 8080
```

Then open http://localhost:8080 in your browser.

### Install Dev Dependencies (for testing)

```bash
npm install
```

### Run Unit Tests

```bash
npm test
```

### Run E2E Tests

```bash
npx playwright install  # first time only
npx playwright test
```

## How to Play

1. **Play notes** — click the keyboard or use your computer keyboard
2. **QWERTY mapping** — bottom row `Z S X D C V G B H N J M` and top row `Q 2 W 3 E R 5 T 6 Y 7 U` (two octaves, chromatic)
3. **Octave shift** — Hold Shift, then click PLAY (down) or TAP (up)
4. **Glide** — Turn GLIDE knob for portamento. Shift + turn right for legato glide.
5. **Hover tooltips** — hover over any control or patch jack to see what it does
6. **Drag knobs vertically** to adjust parameters (up = increase, down = decrease)
7. **Click switches** to change waveforms, modes, etc.
8. **Patch cables**: Click an output jack, then click an input jack to connect. Click a cable to disconnect.
9. **Pitch wheel**: Drag vertically, springs back to center
10. **Mod wheel**: Drag vertically, stays in position. Controls LFO modulation depth.
11. **Presets**: Select from the dropdown menu to load a factory preset
12. **Reset**: Click the Reset button to return everything to defaults

## Signal Flow (Default)

```
Keyboard ──→ OSC 1 ──→ Mixer ──→ Filter ──→ VCA ──→ Reverb ──→ Output
         ──→ OSC 2 ──↗         ↑          ↑
              Noise ──↗    Envelope ──→ VCA gain
                           Envelope ──→ Cutoff mod
                       LFO × Mod wheel ──→ Pitch / Cutoff / PWM
```

## TODO

- **Presets**: Current values were OCR'd and are wrong — need to be rebuilt by ear
- **Patch cable testing**: Many patch point combinations are untested and may not route correctly
- **Glide**: Mostly works but has minor Web Audio timing issues
- **Hard Sync**: OSC2-to-OSC1 hard sync is a placeholder (requires AudioWorklet)
- **Continuous PWM**: Pulse width modulation via LFO requires AudioWorklet for smooth operation
- **Sequencer editing**: Live step editing while playing is not fully implemented
- **MIDI support**: Currently mouse and QWERTY keyboard only
- **Mobile/responsive**: Desktop only (1280px+ screens)

## Known Limitations

- **Ladder Filter**: Approximated with cascaded BiquadFilters rather than true OTA modeling
- **Spring Reverb**: Procedural impulse response, not a physical model

## Technologies

- Vanilla JavaScript (ES modules)
- Web Audio API
- SVG (patch cable rendering)
- CSS (flat design, no images)
- Vitest (unit testing)
- Playwright (E2E testing)

## License

MIT
