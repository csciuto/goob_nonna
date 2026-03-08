# Goob Nonna — Claude Code Guidelines

## Golden Rule
All design decisions must match the real Moog Grandmother hardware. Refer to `docs/synth-spec.md` for how things should work — that is the source of truth. Do not reference files outside the project for instructions. If you need new information about the hardware, ask the user, and record what they tell you in the spec.

## Testing
- **Always write and run tests when changing functionality.** No exceptions.
- Unit tests live in `tests/unit/` and use vitest: `npx vitest run`
- Test pure logic (arpeggiator, sequencer, clock, glide, math) without Web Audio
- Mock `performance.now()` and `AudioContext` where needed
- Run tests before considering any feature complete

## Documentation
- **Keep `docs/synth-spec.md` updated** whenever behavior changes
- If you add/change a feature, update the spec to reflect the new behavior
- When the user provides new hardware behavior details, record them in the spec
- **Update `docs/getting-started.html`** when major functionality is implemented (user-facing guide)

## Architecture
- Vanilla JS with ES modules, Web Audio API, no frameworks
- Semi-modular patch system with normalled connections
- Audio engine initialized lazily on first user click
- Keyboard Shift key = hardware HOLD-as-modifier (for combos like legato glide)

## Key Files
- `js/audio/engine.js` — Main audio engine, note handling, glide
- `js/arp-seq/arp-seq-controller.js` — Coordinates arpeggiator, sequencer, clock
- `js/arp-seq/arpeggiator.js` — Note pattern cycling with hold/octave expansion
- `js/arp-seq/sequencer.js` — Step recording/playback with transposition
- `js/arp-seq/clock.js` — Tempo with tap tempo override
- `js/ui/layout.js` — UI assembly and engine wiring
- `js/ui/keyboard.js` — Polyphonic QWERTY keyboard (for arp), monophonic mouse
- `js/utils/constants.js` — All constants and patch point IDs
- `style.css` — All styles in one file
