# Goob Nonna

**Live:** [corey.sciu.to/goob_nonna](https://corey.sciu.to/goob_nonna/)

How it's built: [ARCHITECTURE.md](ARCHITECTURE.md).

Built with [Claude Code](https://claude.com/claude-code).

A browser tribute to a legendary semi-modular analog synthesizer (every nonna is legendary), built with vanilla JavaScript and the Web Audio API. No build tools, no frameworks — just static files you can serve from anywhere.

## Demo

Open `index.html` in a modern browser (Chrome/Firefox/Edge) or deploy to GitHub Pages. The UI loads immediately; audio initializes on your first note.

## Features

### Audio Engine
- **2 Oscillators** — Triangle, Saw, Square, Narrow Pulse, band-limited; four octave ranges each; hard sync; pulse-width modulation; linear FM; a few cents of analog-style drift
- **3-Channel Mixer** — OSC 1, OSC 2 and Noise, overdriving gently as levels rise
- **Ladder Filter** — a four-pole ladder model (-24dB/oct): resonance that thins the bass and self-oscillates in tune at the top, keyboard tracking, bipolar envelope amount
- **ADSR Envelope** — gate-driven, retriggers from the current level, triggerable from any signal over 1.2 V
- **VCA** — Three modes: ENV (full ADSR), KB RLS (instant attack, envelope release), DRONE (always on)
- **LFO** — Sine, Sawtooth, Ramp, Square, plus Sample & Hold; 0.07 Hz to 1.3 kHz; to pitch, cutoff and pulse width via the mod wheel
- **Spring Reverb** — a three-spring model with the chirp of a real tank, the same on every load
- **Output** — a soft limiter, so resonance and hot levels never clip

The oscillators, filter, envelope and LFO run in an AudioWorklet (`js/audio/worklets.js`).

### Semi-Modular Patch System
- **Every jack on the panel works**, following the hardware manual's patch point index: signals are in volts, pitch inputs are 1 V per octave
- **8 normalled connections** a cable replaces; control inputs add to what the knobs are doing
- **Click-to-connect** patch cable system with SVG rendering
- Color-coded cables cycling through red, blue, yellow, green, orange, purple

### MIDI, presets and sharing
- **MIDI IN** — play from a MIDI keyboard (Chrome, Edge, Firefox): velocity at KB VEL OUT, pitch and mod wheels, MIDI clock for the arpeggiator
- **Share links** — the address bar holds the whole patch (knobs, switches, cables)

### Utility Modules
- **Mult** — four jacks wired together, each usable as an input or an output
- **High-Pass Filter** — -6dB/oct utility HPF with adjustable cutoff
- **Attenuator** — Bipolar; with nothing patched in it is a -8 V to +8 V voltage source

### Arpeggiator / Sequencer
- **Arpeggiator** — Order, Forward, Backward, Forward-Backward, Random modes; 1-3 octave range; Hold
- **Sequencer** — 256 steps, 3 slots, record/play with tie/rest/accent per step
- **Clock** — Adjustable rate with tap tempo; CLOCK IN, ON/OFF IN, RESET IN and CLOCK OUT jacks; follows MIDI clock

### 14 Factory Presets
Funky Robot, Showdown Guitar, Dynasty Plucks, Haunted Cave, Ultra Sub Bass, Cavern Strings, J-Bass, Auto Zap Bass, Stepped Drone, Cyclical Patterns, Bag Pipes, Piano Bass, Lift Off, 3 Saws

> **Note:** Each preset sets the whole panel. They are read from the hardware's factory patch sheets: switches, waveforms and cables as drawn, knobs to about the nearest half step. They haven't been checked by ear against the hardware.

### UI
- **32-note keyboard** (F2 to C5) with mouse and QWERTY input
- **Rotary knobs** with vertical drag control
- **Multi-position switches** for waveform/mode selection
- **Vertical sliders** for ADSR
- **Pitch wheel** (spring-return) and **Mod wheel** (stays in position)
- **Hover tooltips** on every control and patch point
- Flat CSS visuals, charcoal case with cream panels and colorful module accents, desktop-first (1280px minimum)

## Architecture

Files, signal flow and techniques are in [ARCHITECTURE.md](ARCHITECTURE.md); what each control and jack should do is in [docs/synth-spec.md](docs/synth-spec.md).

## TODO

- **Presets**: values were OCR'd; check them by ear against the hardware
- **Sequencer editing**: Live step editing while playing is not fully implemented
- **Sequences in links**: a share link carries the patch, not the recorded sequences

## Known Limitations

- The filter, oscillators and reverb are models, not circuit simulations; numbers the manual doesn't give are marked **model value** in `docs/synth-spec.md`
- No audio input, Eurorack output or MIDI output

## Technologies

- Vanilla JavaScript (ES modules)
- Web Audio API (AudioWorklet), Web MIDI API
- SVG (patch cable rendering)
- CSS (flat design, no images)
- Vitest (unit testing)
- Playwright (E2E testing)

## License

MIT

## Preview image

`npm run screenshot` runs the Playwright smoke test and refreshes `preview.png`, used for link previews. `npm run test:e2e` runs the browser tests.
