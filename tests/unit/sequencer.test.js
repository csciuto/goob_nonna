import { describe, it, expect, beforeEach } from 'vitest';
import { Sequencer } from '../../js/arp-seq/sequencer.js';

describe('Sequencer', () => {
  let seq;

  beforeEach(() => {
    seq = new Sequencer();
  });

  it('starts with no steps', () => {
    expect(seq.hasSteps()).toBe(false);
    expect(seq.getLength()).toBe(0);
    expect(seq.nextStep()).toBeNull();
  });

  it('records and plays back steps', () => {
    seq.startRecording();
    seq.recordStep(60);
    seq.recordStep(64);
    seq.recordStep(67);
    seq.stopRecording();

    expect(seq.hasSteps()).toBe(true);
    expect(seq.getLength()).toBe(3);

    const step1 = seq.nextStep();
    expect(step1.note).toBe(60);

    const step2 = seq.nextStep();
    expect(step2.note).toBe(64);

    const step3 = seq.nextStep();
    expect(step3.note).toBe(67);

    // Wraps around
    const step4 = seq.nextStep();
    expect(step4.note).toBe(60);
  });

  it('does not record when not in recording mode', () => {
    seq.recordStep(60);
    expect(seq.getLength()).toBe(0);
  });

  it('records steps with tie, rest, accent', () => {
    seq.startRecording();
    seq.recordStep(60, { tie: true });
    seq.recordStep(0, { rest: true });
    seq.recordStep(67, { accent: true });
    seq.stopRecording();

    const step1 = seq.nextStep();
    expect(step1.tie).toBe(true);

    const step2 = seq.nextStep();
    expect(step2.rest).toBe(true);

    const step3 = seq.nextStep();
    expect(step3.accent).toBe(true);
  });

  it('supports multiple slots', () => {
    seq.startRecording();
    seq.recordStep(60);
    seq.stopRecording();

    seq.setSlot(1);
    seq.startRecording();
    seq.recordStep(72);
    seq.stopRecording();

    // Slot 1 has different content
    expect(seq.nextStep().note).toBe(72);

    // Switch back to slot 0
    seq.setSlot(0);
    expect(seq.nextStep().note).toBe(60);
  });

  it('clears current slot', () => {
    seq.startRecording();
    seq.recordStep(60);
    seq.stopRecording();

    seq.clear();
    expect(seq.hasSteps()).toBe(false);
  });

  it('resets playback position', () => {
    seq.startRecording();
    seq.recordStep(60);
    seq.recordStep(64);
    seq.stopRecording();

    seq.nextStep(); // 60
    seq.reset();
    expect(seq.nextStep().note).toBe(60);
  });

  it('limits to 256 steps', () => {
    seq.startRecording();
    for (let i = 0; i < 260; i++) {
      seq.recordStep(60 + (i % 12));
    }
    seq.stopRecording();

    expect(seq.getLength()).toBe(256);
  });
});
