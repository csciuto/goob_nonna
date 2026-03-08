# Goob Nonna - Synthesizer Specification

## Overview
Web-based clone of Moog Grandmother. Semi-modular analog synth emulation using Web Audio API. Vanilla JS, no frameworks.

## Signal Flow
Default signal path: Keyboard → Oscillators → Mixer → Filter → VCA → Reverb → Output
Modulation: LFO → (via mod wheel) → OSC pitch, Filter cutoff, PWM

## Modules

### Oscillators (OSC 1 & OSC 2)
- OSC 1: Waveforms (Saw, Triangle, Square, Narrow Pulse), Octave (32', 16', 8', 4'), Frequency (-7 to +7 semitones fine tune)
- OSC 2: Same waveforms, Octave (16', 8', 4', 2'), Frequency (wider detune range), SYNC button (hard sync OSC2 to OSC1)
- Both receive 1V/oct pitch CV from keyboard by default

### Mixer
- 3 channels: OSC 1 Level, OSC 2 Level, Noise Level
- Each 0-10 range, all summed to single output
- Master output to filter

### Filter (Moog Ladder -24dB/oct Low-Pass)
- Cutoff: 20Hz - 20kHz (logarithmic)
- Resonance: 0-4 (self-oscillation at max)
- KB TRACK: 0, 1/2, 1:1 (keyboard tracking amount)
- ENV AMT: -5 to +5 (bipolar envelope amount to cutoff)
- Implementation: Two cascaded BiquadFilterNode("lowpass") for -24dB/oct

### Envelope (ADSR)
- Attack: 0ms - 10s (logarithmic slider)
- Decay: 0ms - 10s (logarithmic slider)
- Sustain: 0 - 10 (linear slider, 0-100%)
- Release: 0ms - 10s (logarithmic slider)
- Implementation: ConstantSourceNode with param automation

### VCA (Voltage Controlled Amplifier)
- Mode switch: ENV / KB RLS / DRONE
  - ENV: VCA gain follows full ADSR envelope
  - KB RLS: Instant attack on gate-on, uses envelope release time on gate-off
  - DRONE: Constant gain of 1.0, always audible
- Output Level knob: 0-10

### LFO (Low Frequency Oscillator)
- Rate: 0.1Hz - 50Hz
- Waveforms: Triangle, Square, Sawtooth, Ramp (reverse saw), S/H (sample & hold)
- Destinations (via mod wheel scaling):
  - PITCH AMT: 0-10 (modulates oscillator pitch)
  - CUTOFF AMT: 0-10 (modulates filter cutoff)
  - PW AMT: 0-10 (modulates pulse width)

### Noise Generator
- White noise (AudioBuffer with random samples)
- Output normalled to mixer noise input

### Spring Reverb
- MIX: 0-10 (dry/wet crossfade)
- Implementation: ConvolverNode with procedurally generated spring-like impulse response

### High-Pass Filter (Utility)
- Fixed -6dB/oct HPF
- Cutoff knob
- Used as utility module in patch bay

### Attenuator (Utility)
- Bipolar attenuator (-1 to +1)
- Input normalled to +8V DC constant
- Useful for generating static CV

### Mult (Utility)
- 1-in, 3-out passive multiple
- 4 jacks, all connected together

## Keyboard
- 32 notes: F2 to C5 (default range, shifts with octave offset)
- Outputs: Pitch CV (1V/oct), Gate (on/off), Velocity (if supported)
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
- When synced to external clock/MIDI, RATE knob selects musical subdivisions

## Patch Points (41 total)

### Outputs (active sources):
1. KB PITCH CV OUT - Keyboard pitch (1V/oct)
2. KB GATE OUT - Keyboard gate
3. KB VEL OUT - Keyboard velocity
4. OSC 1 WAVE OUT - Oscillator 1 waveform
5. OSC 2 WAVE OUT - Oscillator 2 waveform
6. NOISE OUT - White noise
7. MIXER OUT - Mixer sum output
8. FILTER OUT - Filter output
9. ENV OUT - Envelope output (0 to +8V)
10. VCA OUT - VCA output
11. LFO TRI OUT - LFO triangle wave
12. LFO SQ OUT - LFO square wave
13. LFO SAW OUT - LFO sawtooth wave
14. LFO S/H OUT - LFO sample & hold
15. ARP/SEQ CV OUT - Arp/Seq pitch CV
16. ARP/SEQ GATE OUT - Arp/Seq gate
17. CLOCK OUT - Clock output

### Inputs (destinations):
18. OSC 1 PITCH IN - Pitch CV input for OSC1
19. OSC 2 PITCH IN - Pitch CV input for OSC2
20. OSC 1 PWM IN - Pulse width modulation input
21. OSC 2 PWM IN - Pulse width modulation input
22. SYNC IN - Hard sync trigger input
23. MIXER OSC1 IN - Mixer channel 1 audio input
24. MIXER OSC2 IN - Mixer channel 2 audio input
25. MIXER NOISE IN - Mixer channel 3 audio input
26. FILTER IN - Filter audio input
27. CUTOFF IN - Filter cutoff CV input
28. RESONANCE IN - Filter resonance CV input
29. ENV GATE IN - Envelope gate/trigger input
30. VCA IN - VCA audio input
31. VCA CV IN - VCA control voltage input
32. REVERB IN - Reverb audio input
33. VOLUME IN - Main volume CV input
34. LFO RATE IN - LFO rate CV input
35. LFO SYNC IN - LFO sync/reset input
36. ARP/SEQ IN - Arp/seq clock input
37. HPF IN - High-pass filter input
38. HPF OUT - High-pass filter output (also acts as output)
39. ATTEN IN - Attenuator input
40. ATTEN OUT - Attenuator output
41. MULT (x4) - Four jacks all connected

## Normalled Connections (14 default connections)

These are the default internal connections. Patching a cable into an INPUT jack breaks its normalled connection.

| # | Source | Destination | Broken by patching into |
|---|--------|-------------|------------------------|
| 1 | KB PITCH CV | OSC 1 PITCH IN | OSC 1 PITCH IN |
| 2 | KB PITCH CV | OSC 2 PITCH IN | OSC 2 PITCH IN |
| 3 | OSC 1 WAVE OUT | MIXER OSC1 IN | MIXER OSC1 IN |
| 4 | OSC 2 WAVE OUT | MIXER OSC2 IN | MIXER OSC2 IN |
| 5 | NOISE OUT | MIXER NOISE IN | MIXER NOISE IN |
| 6 | MIXER OUT | FILTER IN | FILTER IN |
| 7 | KB GATE | ENV GATE IN | ENV GATE IN |
| 8 | FILTER OUT | VCA IN | VCA IN |
| 9 | ENV OUT | VCA CV IN | VCA CV IN (when mode=ENV) |
| 10 | ENV × ENV AMT | CUTOFF IN | CUTOFF IN |
| 11 | VCA OUT | REVERB IN | REVERB IN |
| 12 | LFO × MOD × PITCH AMT | OSC PITCH | (modulation routing) |
| 13 | LFO × MOD × CUTOFF AMT | FILTER CUTOFF | (modulation routing) |
| 14 | LFO × MOD × PW AMT | OSC PWM | (modulation routing) |

## CV Standards
- Pitch: 1V/oct (Web Audio: frequency values directly)
- Gate: 0V = off, +5V = on (Web Audio: 0 or 1)
- Envelope: 0 to +8V (Web Audio: 0 to 1 normalized)
- LFO: Bipolar ±5V (Web Audio: -1 to +1)

## VCA Modes Detail
- ENV: VCA gain = envelope output × output level
- KB RLS: gate on → instant attack to full, gate off → follows envelope release curve
- DRONE: VCA gain = output level constant

## Simplifications from Original
- No true analog component modeling (using Web Audio nodes)
- Hard sync via AudioWorklet (may be deferred)
- PWM via PeriodicWave coefficients (continuous modulation may need AudioWorklet)
- Spring reverb approximated with procedural impulse response
- No MIDI support (mouse/keyboard only)
- Ladder filter approximated with cascaded BiquadFilters (not true OTA model)
