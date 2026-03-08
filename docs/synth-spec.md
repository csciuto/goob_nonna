# Goob Nonna - Synthesizer Specification

## Overview
Web-based clone of Moog Grandmother. Semi-modular analog synth emulation using Web Audio API. Vanilla JS, no frameworks.

## Signal Flow
Default signal path: Keyboard → Oscillators → Mixer → Filter → VCA → Reverb → Output
Modulation: LFO → (via mod wheel) → OSC pitch, Filter cutoff, PWM

## Modules

### Oscillators (OSC 1 & OSC 2)
- OSC 1: Waveforms (Saw, Triangle, Square, Narrow Pulse), Octave (32', 16', 8', 4', 2'), Frequency (-7 to +7 semitones fine tune)
- OSC 2: Same waveforms, same octave range, Frequency (wider detune range), SYNC switch (off/on - hard sync OSC2 to OSC1)
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
- 32 notes: F2 to C5
- Outputs: Pitch CV (1V/oct), Gate (on/off), Velocity (if supported)
- Visual piano keys, mouse-click to play
- Pitch wheel: ±2 semitones, spring-return to center
- Mod wheel: 0-1, stays where positioned

## Arpeggiator / Sequencer

### Arpeggiator
- Modes: ORDER (as played), FWD (low→high), BWD (high→low), FWD-BWD, RANDOM
- Range: 1, 2, or 3 octaves
- Rate: controlled by clock (RATE knob or TAP tempo)
- HOLD: Latches current notes

### Sequencer
- 256 steps max, 3 sequence slots
- Record: Press REC, play notes, press REC to stop
- Playback: Press PLAY
- Features: Tie, Rest, Accent per step
- Glide: Portamento between notes

### Clock
- Rate: 0.5 - 30 Hz (BPM display)
- TAP tempo button
- Internal/External sync

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
