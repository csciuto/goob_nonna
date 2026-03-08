import { describe, it, expect, beforeEach } from 'vitest';
import { Sequencer } from '../../js/arp-seq/sequencer.js';

describe('Sequencer - Transposition', () => {
  let seq;

  beforeEach(() => {
    seq = new Sequencer();
    seq.startRecording();
    seq.recordStep(60); // C4
    seq.recordStep(64); // E4
    seq.recordStep(67); // G4
    seq.stopRecording();
  });

  it('plays back at original pitch with no transposition', () => {
    expect(seq.nextStep().note).toBe(60);
    expect(seq.nextStep().note).toBe(64);
    expect(seq.nextStep().note).toBe(67);
  });

  it('transposes relative to first note', () => {
    // Pressing E4 (64) transposes up 4 semitones from C4 (60)
    seq.setTranspose(64);

    expect(seq.nextStep().note).toBe(64); // 60 + 4
    expect(seq.nextStep().note).toBe(68); // 64 + 4
    expect(seq.nextStep().note).toBe(71); // 67 + 4
  });

  it('transposes down', () => {
    // Pressing A3 (57) transposes down 3 semitones from C4 (60)
    seq.setTranspose(57);

    expect(seq.nextStep().note).toBe(57); // 60 - 3
    expect(seq.nextStep().note).toBe(61); // 64 - 3
    expect(seq.nextStep().note).toBe(64); // 67 - 3
  });

  it('clearTranspose resets to original pitch', () => {
    seq.setTranspose(64);
    seq.clearTranspose();

    expect(seq.nextStep().note).toBe(60);
    expect(seq.nextStep().note).toBe(64);
    expect(seq.nextStep().note).toBe(67);
  });

  it('rest steps are not transposed', () => {
    const seq2 = new Sequencer();
    seq2.startRecording();
    seq2.recordStep(60);
    seq2.recordStep(0, { rest: true });
    seq2.recordStep(67);
    seq2.stopRecording();

    seq2.setTranspose(64); // +4

    const step1 = seq2.nextStep();
    expect(step1.note).toBe(64);

    const step2 = seq2.nextStep();
    expect(step2.rest).toBe(true);

    const step3 = seq2.nextStep();
    expect(step3.note).toBe(71);
  });

  it('getBaseNote finds first non-rest note', () => {
    const seq2 = new Sequencer();
    seq2.startRecording();
    seq2.recordStep(0, { rest: true });
    seq2.recordStep(64);
    seq2.stopRecording();

    seq2.setTranspose(72); // Transpose to C5
    // Base note is 64 (first non-rest), so offset = 72 - 64 = 8

    seq2.nextStep(); // rest — returned as-is
    const step2 = seq2.nextStep();
    expect(step2.note).toBe(72); // 64 + 8
  });

  it('transposition preserves accent flag', () => {
    const seq2 = new Sequencer();
    seq2.startRecording();
    seq2.recordStep(60, { accent: true });
    seq2.stopRecording();

    seq2.setTranspose(64);
    const step = seq2.nextStep();
    expect(step.note).toBe(64);
    expect(step.accent).toBe(true);
  });
});
