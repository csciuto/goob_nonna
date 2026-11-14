# Goob Nonna - Synthesizer Specification

## Overview
Web-based clone of Moog Grandmother. Semi-modular analog synth emulation using Web Audio API. Vanilla JS, no frameworks.

**Hardware source.** Module, knob and jack behavior follows the Moog *Grandmother User's Manual* (Version 2),
including its Patch Point Index (voltages, which inputs are normalled and which are summed). Where the manual
gives no number, this spec picks one and marks it **model value**; those are the places to correct if the
hardware is measured.

## Signal Flow
Default signal path: Keyboard → Oscillators → Mixer → Filter → VCA → Reverb → VOLUME → Output
Modulation: LFO → (via mod wheel) → OSC pitch, Filter cutoff, PWM

## Signal levels (CV standards)
Signals between modules are numbers in units of 5 volts, so the hardware's voltages carry over:

| Signal | Hardware | In the engine |
|---|---|---|
| Audio (oscillators, noise, filter, VCA) | 10 V peak to peak | -1 to +1 |
| LFO WAVE OUT, S/H OUT | -5 to +5 V | -1 to +1 |
| Envelope (+ENV OUT), gate (GATE OUT) | 0 to +8 V | 0 to 1.6 |
| -ENV OUT | 0 to -8 V | 0 to -1.6 |
| KB OUT | 1 V per octave, -5 to +5 V | 0.2 per octave; 0 V at the lowest key of the unshifted keyboard (F2) (**model value**) |
| KB VEL OUT | 0 to +5 V | 0 to 1 |
| Attenuator with nothing patched in | -8 to +8 V | -1.6 to +1.6 |
| CLOCK OUT | 0 to +5 V pulses | 0 or 1 |

Pitch-style inputs (OSC PITCH IN, CUTOFF IN, RATE IN) are 1 volt per octave: a full-scale signal moves them
five octaves. A trigger is any signal over 1.2 V (0.24). Clock, ON/OFF and RESET inputs switch at 2.5 V (0.5).

## Modules

### Oscillators (OSC 1 & OSC 2)
- Waveforms: Triangle, Saw, Square (50% duty), Narrow Pulse (25% duty). Edges are band-limited (no aliasing).
- OSC 1: Octave 32', 16', 8', 4'. SYNC button. Jacks: WAVE OUT, PITCH IN, PWM IN.
- OSC 2: Octave 16', 8', 4', 2'. FREQUENCY ±7 semitones (steps of 0.05). Jacks: WAVE OUT, PITCH IN, LIN FM IN.
- The keyboard's pitch is wired to both oscillators inside the synth. **PITCH IN is added to it** (1 V per octave);
  a cable there does not disconnect the keyboard.
- **SYNC**: when lit, oscillator 2 restarts its cycle at each rising zero crossing of oscillator 1, so its pitch
  locks to oscillator 1 and FREQUENCY changes its tone instead. Set below oscillator 1 it can't finish a cycle
  and has little output, as on the hardware.
- **PWM IN** (OSC 1, 0 to +5 V) moves the pulse width of Square and Narrow Pulse. Full scale moves it by 45% of
  the cycle (**model value**); the width is limited to 5%–95%. Triangle and Saw ignore it.
- **LIN FM IN** (OSC 2) shifts the frequency by Hz, not by ratio: 400 Hz per volt (**model value**).
- Each oscillator's pitch wanders slowly by a few cents (about ±2.5, **model value**), independently, like two
  analog oscillators. There is no control for it.
- WAVE OUT is AC coupled: the pulse waves carry no DC.

### Mixer
- 3 channels: OSC 1, OSC 2, Noise, each 0-10. Each input jack replaces its normalled source.
- Above about 1 o'clock (6 of 10) a level starts to overdrive gently, and harder as levels rise (a soft
  saturation on the sum). OUTPUT is the saturated sum.

### Filter (Moog Ladder -24dB/oct Low-Pass)
- Cutoff: 10 Hz - 20 kHz (logarithmic)
- Resonance: 0-4. It lifts the cutoff and thins the bass; all the way up the filter self-oscillates as a sine at
  the cutoff frequency (playable from the keys with KBD TRACK 1:1). Just below the top it rings but doesn't sing.
- KBD TRACK: OFF, 1:2, 1:1 (1 V per octave at 1:1), from the keyboard's pitch including glide
- ENVELOPE AMT: -5 to +5 (bipolar). At either end a full envelope moves the cutoff 8 octaves (**model value**).
- Everything that moves the cutoff is summed in octaves: the knob, keyboard tracking, envelope × ENVELOPE AMT,
  the mod-wheel LFO, and CUTOFF IN.
- **CUTOFF IN**: summed with the above, 1 V per octave. Nothing is normalled to it.
- **ENV AMT IN**: summed with the ENVELOPE AMT knob (it varies the amount, it is not another cutoff input);
  ±8 V equals the knob's full travel.
- Implementation: four one-pole stages in a feedback loop, solved without a sample of delay in the loop so the
  peak sits at the cutoff (AudioWorklet `gn-ladder`). Every stage saturates, as the transistor ladder does,
  which bounds self-oscillation, thickens notes near the cutoff and softens resonance when driven. It runs at
  twice the sample rate. How hard the mixer drives the filter is a **model value**.

### Envelope (ADSR)
- Attack, Decay, Release: 1 ms - 10 s, each knob step multiplying the time by the same amount (noon = 100 ms)
  (**model value**: the manual gives no times or curve). Sustain: 0-10 (0-100%).
- Attack is linear; decay and release are exponential (95% of the way in the time set) (**model value**).
- Driven by a gate: the keyboard's GATE (also arpeggiator and sequencer) unless a cable is in **TRIGGER IN**,
  where any signal over 1.2 V starts the envelope and holds it while high.
- A new gate starts the attack **from the current level**, not from zero (no click when a note is played while
  the last one fades).
- A new note while another is held restarts the envelope: the gate drops for 3 ms between them. With legato
  glide on, overlapping notes do not restart it.
- +ENV OUT is the envelope (0 to +8 V); -ENV OUT is its inverse. (The Patch Point Index gives these outputs as
  "10 Volts Peak-to-Peak"; 0 to +8 V matches the other control levels. Unresolved.)
- The envelope reaches the VCA and the filter's ENVELOPE AMT inside the synth; no cable can disconnect it.

### VCA (Voltage Controlled Amplifier)
- Mode switch: ENV / KB RLS / DRONE
  - ENV: follows the envelope
  - KB RLS: full level at once while a note is held, then the envelope's release time. The envelope itself
    still runs its full ADSR for the filter.
  - DRONE: always open
- **VCA AMT IN** (the manual disagrees with itself: page 22 says *multiplied* with the current settings, the
  Patch Point Index says *summed*; this follows the index for now): in ENV and KB RLS it is summed with the mode's control (+8 V alone opens the VCA fully). In
  DRONE a cable here takes over completely: 0 V or below is silence, +8 V is full.
- The control is limited to 0..full: a negative voltage closes the VCA, it never inverts the sound.

### LFO (Modulation Oscillator)
- Rate: 0.07 Hz - 1.3 kHz. Waveform switch: Sine, Sawtooth, Ramp, Square. The LED follows the selected wave.
- Mod wheel × the AMT knobs sets how much reaches each destination; with the wheel down, nothing does.
  - PITCH AMT: both oscillators, up to ±1 octave (**model value**)
  - CUTOFF AMT: the filter, up to ±5 octaves (the LFO's 5 V at 1 V per octave; **model value**)
  - PULSE WIDTH AMT: both oscillators' Square and Narrow Pulse width, up to ±45% of the cycle (**model value**)
- WAVE OUT: the selected waveform, -5 to +5 V
- **S/H OUT**: a new random value at the start of every LFO cycle, held until the next. It has no internal
  routing; it must be patched.
- **RATE IN**: added to the RATE knob, 1 V per octave (KB OUT into it makes the LFO track the keyboard)
- **SYNC IN**: a rising edge restarts the cycle, which also steps the S/H (GATE OUT into it steps the S/H with
  each key).

### Noise Generator
- White noise, normalled to the mixer's NOISE IN. The same noise on every load.

### Spring Reverb
- MIX: 0-10. At 0 there is no reverb; at 10 only reverb.
- A model of a three-spring tank: each spring is a delay loop whose echoes arrive as short rising chirps (the
  "boing") that smear further with each trip, decaying over about 2 seconds, with nothing above about 4 kHz.
  The impulse response is computed once at start-up and is identical on every load (ConvolverNode).
- REVERB IN replaces the VCA as the reverb's source.

### Output
- VOLUME: 0-10, after the reverb.
- A soft limiter follows it: clean up to about 70% of full scale, then an increasingly soft ceiling. The output
  never clips, whatever the resonance and levels.

### High-Pass Filter (Utility)
- Static -6 dB/oct (one pole), 20 Hz - 20 kHz. Not in the signal path until patched (INPUT, OUTPUT).

### Attenuator (Utility)
- Bipolar: center is fully attenuated, clockwise passes the signal, counterclockwise passes it inverted.
- The INPUT is normalled to +8 V: with nothing patched, OUTPUT is a steady voltage from -8 V to +8 V. A cable
  into INPUT replaces that voltage.

### Mult (Utility)
- Four jacks wired together. Any of them can take a signal in or send it on: patch a source into one and take
  it from the others. A cable must have an ordinary output or input at its other end (not Mult to Mult).

## MIDI keyboard
- MIDI IN (title strip) turns Web MIDI on and off; once on it reconnects on later visits (Chrome, Edge, Firefox).
- Notes play like the synth's own keys, including through the arpeggiator and sequencer, at any pitch (not just
  the 32 keys on screen). Velocity goes to KB VEL OUT only, as on the hardware.
- The pitch wheel and mod wheel (controller 1) move the panel's wheels.
- MIDI clock drives the arpeggiator and sequencer (see Clock).
- The code is the shared `midi-in` module, vendored in `js/vendor/` at the version `package.json` pins.

## Presets and share links
- A preset sets **every** control: anything it doesn't mention goes to its default, the mod wheel to zero, and
  the cables to the preset's own. Switches on the panel move with it.
- The address bar always holds the current patch (`#patch=…`): every knob and switch that differs from the
  default, the mod wheel, and the cables. Opening the link restores it. The default patch has a clean address.
- A link is untrusted input: unknown settings, wrong types, out-of-range values and unknown jacks are dropped.

## Keyboard
- 32 notes: F2 to C5 (default range, shifts with octave offset)
- Outputs: KB OUT (pitch, 1 V per octave), GATE OUT (+8 V while a note is held), KB VEL OUT (velocity, 0 to +5 V)
- Mouse, computer keys and the arpeggiator can't sense velocity; they send 100 of 127. A MIDI keyboard sends its own.
- Visual piano keys, mouse-click to play
- QWERTY input: two rows (Z-; bottom, Q-P top), polyphonic for arpeggiator
- Mouse input: monophonic (dragging releases previous note)
- Pitch wheel: ±2 semitones, spring-return to center
- Mod wheel: 0-1, stays where positioned
- Octave shift: Shift+PLAY (< KB) shifts down, Shift+TAP (KB >) shifts up. Both visual keys and QWERTY keys shift together. Range clamped to MIDI 0-127.

### Glide (Portamento)
- GLIDE knob (0-10): controls pitch slide time between notes
- Time range: 5ms (min) to 2s (max), logarithmic mapping
- No glide on the very first note played (no previous pitch to slide from)
- After first note, glide always works — even between non-overlapping notes (oscillator sits at last frequency)
- A note played partway through a glide starts from the pitch sounding at that moment
- Glide moves the keyboard's pitch itself, so the filter's keyboard tracking and KB OUT glide with it
- Glide knob at 0 = instant pitch change (no portamento)

### Legato Glide
- Activated via Shift + turn GLIDE knob right (toast: "LEGATO GLIDE ON")
- Deactivated via Shift + turn GLIDE knob left (toast: "LEGATO GLIDE OFF")
- In legato mode: glide ONLY occurs between overlapping notes (key held while pressing another)
- Non-overlapping notes: no glide, envelope retriggers normally
- Overlapping notes: pitch slides, envelope does NOT retrigger (smooth legato)

### SHIFT Key (Modifier)
- The keyboard Shift key acts as the hardware HOLD button modifier
- Holding Shift lights up the HOLD button
- Shift combos:
  - Shift + PLAY = keyboard octave down (< KB)
  - Shift + TAP = keyboard octave up (KB >)
  - Shift + GLIDE knob right = legato glide on
  - Shift + GLIDE knob left = legato glide off

## Arpeggiator / Sequencer

### Controls (ARP/SEQ panel)
- **RATE knob**: 20-280 BPM. LED flashes at current rate.
- **MODE switch**: ARP / SEQ / REC
- **DIRECTION switch**: ORDR / FWD-BKWD / RNDM (applies to both arp and seq)
- **OCT/SEQ switch**: In ARP mode = 1/2/3 octave range. In SEQ/REC mode = sequence slot 1/2/3.
- **Patch points**: KB OUT (pitch CV), GATE OUT, KB VEL OUT

### Arpeggiator
- Press PLAY to activate, then hold notes on keyboard
- Notes play one at a time in a repeating rhythmic pattern
- DIRECTION controls order: ORDR (as played), FWD/BKWD (forward then reverse), RNDM (random)
- OCT range: 1 = notes as played, 2 = pattern + 1 octave up, 3 = pattern + 1 and 2 octaves up

### HOLD
- Arp/seq continues playing after lifting fingers from keyboard
- While keys are still held, new notes played are ADDED to the pattern
- After ALL fingers are lifted, playing new notes starts a NEW pattern

### Sequencer
- 256 steps max, 3 sequence slots
- **Recording**: Set MODE→REC, select slot with OCT/SEQ (1/2/3), play notes on keyboard. First note erases existing sequence data for that slot.
- **Playback**: Set MODE→SEQ, press PLAY, press a note to transpose (offset = pressed note minus first recorded note). Transpose resets on stop/start.
- **Editing**: While seq is playing in SEQ mode, switch to REC — edits overwrite current step in real time. Switch back to SEQ to stop editing.
- WARNING: If MODE=REC and seq is stopped, pressing a note erases the sequence.

### Dual-Function Buttons (Left-Hand Controller)
Normal (ARP/SEQ mode):
- **PLAY** (green): Start/stop arpeggiator or sequencer
- **HOLD** (blue): Latch arp/seq notes
- **TAP** (yellow): Tap tempo (3+ taps to set rate, overrides RATE knob). Hold TAP ~1s to exit tap tempo.

REC mode (below labels):
- **TIE**: Ties two steps together (legato). Same note tied = held continuously.
- **REST**: Inserts a silent step.
- **ACCENT**: Adds accent envelope to step. Output at KB VEL OUT jack.

Alt functions (above labels, via SHIFT button):
- **< KB**: Shift keyboard down one octave
- **KB >**: Shift keyboard up one octave

### Clock
- Rate: 20-280 BPM
- TAP tempo: at least 3 taps to override knob. Hold TAP ~1s to exit and return control to knob.
- With a cable in CLOCK IN, each rising edge is one step and the RATE knob does nothing
- While MIDI clock is arriving (24 ticks per quarter note), the RATE knob picks the note value of a step: half notes at the bottom, then quarter, quarter triplet, 8th, 8th triplet, 16th, 16th triplet, 32nd at the top. A second after the clock stops, the knob sets the tempo again. MIDI Start restarts the pattern.

## Patch Points

Every jack on the panel, as in the manual's Patch Point Index.

| Module | Jack | Direction | Behavior |
|---|---|---|---|
| Arp/Seq | KB OUT | out | Pitch of the note played (keyboard, arpeggiator, sequencer, MIDI), 1 V/oct |
| Arp/Seq | GATE OUT | out | +8 V while a note is held |
| Arp/Seq | KB VEL OUT | out | Velocity, 0 to +5 V |
| Modulation | RATE IN | in | Added to RATE, 1 V/oct |
| Modulation | SYNC IN | in | Rising edge restarts the LFO |
| Modulation | WAVE OUT | out | Selected LFO waveform |
| Modulation | S/H OUT | out | Sample and hold |
| Oscillators | OSC 1 WAVE OUT, OSC 2 WAVE OUT | out | Selected waveform |
| Oscillators | OSC 1 PITCH IN, OSC 2 PITCH IN | in | Added to the keyboard's pitch, 1 V/oct |
| Oscillators | OSC 1 PWM IN | in | Pulse width |
| Oscillators | OSC 2 LIN FM IN | in | Linear FM |
| Mixer | OSC 1 IN, OSC 2 IN, NOISE IN | in | Replace the normalled source |
| Mixer | OUTPUT | out | The mix |
| Utilities | MULT ×4 | either | Wired together |
| Utilities | HIGH PASS INPUT / OUTPUT | in / out | The high-pass filter |
| Utilities | ATTENUATOR INPUT / OUTPUT | in / out | Input normalled to +8 V |
| Filter | INPUT | in | Replaces the mixer |
| Filter | OUTPUT | out | Filtered signal |
| Filter | ENV AMT IN | in | Added to the ENVELOPE AMT knob |
| Filter | CUTOFF IN | in | Added to the cutoff, 1 V/oct |
| Envelope | TRIGGER IN | in | Over 1.2 V starts the envelope; replaces the keyboard gate |
| Envelope | +ENV OUT, -ENV OUT | out | The envelope and its inverse |
| Output | VCA AMT IN | in | See VCA |
| Output | VCA IN | in | Replaces the filter |
| Output | REVERB IN | in | Replaces the VCA |
| Rear | CLOCK IN | in | Each rising edge is one arpeggiator / sequencer step |
| Rear | ON/OFF IN | in | Over 2.5 V runs the arpeggiator / sequencer, under stops it |
| Rear | RESET IN | in | Over 2.5 V returns to the start of the pattern |
| Rear | CLOCK OUT | out | A pulse on every step while the arpeggiator / sequencer runs |

Not modeled: the rear panel's audio jacks (INSTRUMENT IN, EURORACK OUT, REVERB OUT) and MIDI DIN.

## Normalled Connections

What feeds an input while nothing is plugged into it. A cable into the input replaces it; pulling the cable
restores it.

| Source | Destination |
|---|---|
| OSC 1 WAVE OUT | Mixer OSC 1 IN |
| OSC 2 WAVE OUT | Mixer OSC 2 IN |
| Noise | Mixer NOISE IN |
| Mixer OUTPUT | Filter INPUT |
| GATE (keyboard, arpeggiator, sequencer) | Envelope TRIGGER IN |
| Filter OUTPUT | VCA IN |
| VCA | REVERB IN |
| +8 V | ATTENUATOR INPUT |

Wired inside the synth, with no jack in between, so no cable disconnects them: keyboard pitch → both
oscillators and the filter's KBD TRACK; envelope → VCA and the filter's ENVELOPE AMT; LFO × mod wheel × the
three AMT knobs → pitch, cutoff and pulse width; oscillator 1 → oscillator 2's sync (when SYNC is lit).

## Simplifications from Original
- The analog parts are modeled, not circuit-simulated: a ladder-filter model, band-limited oscillators and a
  spring model stand in for transistors, capacitors and a spring tank.
- Values the manual doesn't give are marked **model value** above.
- The envelope outputs are taken as 0 to ±8 V (the manual's index says 10 V peak to peak).
- VCA AMT IN is summed in ENV and KB RLS (the manual's index says summed; its Output chapter says multiplied).
- CLOCK OUT pulses once per step while the arpeggiator or sequencer is running.
- No audio input, Eurorack output or MIDI output.
