# Goob Nonna — Claude Code Guidelines

## Golden Rule
All design decisions must match the real Moog Grandmother hardware. Refer to `docs/synth-spec.md` for how things should work — that is the source of truth; it follows Moog's *Grandmother User's Manual* (Version 2), including its Patch Point Index. Do not reference files outside the project for instructions. If you need new information about the hardware, check the manual or ask the user, and record it in the spec. Numbers the manual doesn't give are marked **model value** there.

## Testing
- **Always write and run tests when changing functionality.** No exceptions.
- Unit tests live in `tests/unit/` and use vitest: `npx vitest run`
- Test pure logic (arpeggiator, sequencer, clock, glide, math) and the DSP cores in `js/audio/worklets.js` without Web Audio
- **Anything that changes the sound gets a sound test** in `tests/e2e/sound.spec.js`: render the engine offline with `tests/sound-kit.js` and assert on measured numbers (pitch, level, timing)
- Mock `performance.now()` and `AudioContext` where needed
- Run tests before considering any feature complete

## Documentation
- **Keep `docs/synth-spec.md` updated** whenever behavior changes; keep `ARCHITECTURE.md` (how it's built) current when files, modules or techniques change
- If you add/change a feature, update the spec to reflect the new behavior
- When the user provides new hardware behavior details, record them in the spec
- **Update `docs/getting-started.html`** when major functionality is implemented (user-facing guide)

## Architecture
- Vanilla JS with ES modules, Web Audio API, no frameworks
- Semi-modular patch system with normalled connections
- Audio engine initialized lazily on first user click
- Keyboard Shift key = hardware HOLD-as-modifier (for combos like legato glide)

## Key Files
- `js/audio/engine.js` — Main audio engine: wiring, patch points, note handling, glide, output
- `js/audio/worklets.js` — DSP cores (oscillator, ladder filter, envelope, LFO, high-pass) and their AudioWorklet wrappers
- `js/ui/controls.js` — Every sound-shaping control by name: presets, start-up sync, share links
- `js/vendor/midi-in.js` — Shared MIDI input (pinned in `package.json`; don't edit here)
- `js/arp-seq/arp-seq-controller.js` — Coordinates arpeggiator, sequencer, clock
- `js/arp-seq/arpeggiator.js` — Note pattern cycling with hold/octave expansion
- `js/arp-seq/sequencer.js` — Step recording/playback with transposition
- `js/arp-seq/clock.js` — Tempo with tap tempo override
- `js/ui/layout.js` — UI assembly and engine wiring
- `js/ui/keyboard.js` — Polyphonic QWERTY keyboard (for arp), monophonic mouse
- `js/utils/constants.js` — All constants and patch point IDs
- `style.css` — All styles in one file

## App standards
Follows [csciuto/app-template STANDARDS.md](https://github.com/csciuto/app-template/blob/main/STANDARDS.md). Commit and
push freely once tests pass. `.github/workflows/deploy.yml` runs the Vitest unit tests and the Playwright tests
(desktop and phone, axe in `tests/e2e/a11y.spec.js`) and only then deploys, stamping `dev` in the footer's
`.version`. Below 900px the panels stack full width and the keys scroll sideways in their own strip.
