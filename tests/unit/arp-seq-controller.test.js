import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ArpSeqController } from '../../js/arp-seq/arp-seq-controller.js';

// Minimal AudioContext mock
function mockAudioContext() {
  return { currentTime: 0 };
}

describe('ArpSeqController', () => {
  let ctrl;
  let notesPlayed;
  let notesOff;
  let mockTime;

  beforeEach(() => {
    mockTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => mockTime);
    vi.useFakeTimers();
    ctrl = new ArpSeqController(mockAudioContext());
    notesPlayed = [];
    notesOff = [];
    ctrl.onNoteOn = (note, vel) => notesPlayed.push({ note, vel });
    ctrl.onNoteOff = (note) => notesOff.push(note);
  });

  describe('mode switching', () => {
    it('starts in arp mode', () => {
      expect(ctrl._mode).toBe('arp');
    });

    it('stops playback when switching modes', () => {
      ctrl.noteOn(60, 1.0);
      ctrl.pressPlay();
      expect(ctrl.isPlaying()).toBe(true);

      ctrl.setMode('seq');
      expect(ctrl.isPlaying()).toBe(false);
    });

    it('starts recording when switching to rec', () => {
      ctrl.setMode('rec');
      expect(ctrl.seq.isRecording()).toBe(true);
    });

    it('stops recording when leaving rec', () => {
      ctrl.setMode('rec');
      ctrl.setMode('arp');
      expect(ctrl.seq.isRecording()).toBe(false);
    });
  });

  describe('arp mode', () => {
    it('adds notes to arpeggiator', () => {
      ctrl.noteOn(60, 1.0);
      ctrl.noteOn(64, 1.0);
      expect(ctrl.arp._heldNotes).toEqual([60, 64]);
    });

    it('removes notes from arpeggiator', () => {
      ctrl.noteOn(60, 1.0);
      ctrl.noteOn(64, 1.0);
      ctrl.noteOff(60);
      expect(ctrl.arp._heldNotes).toEqual([64]);
    });

    it('plays notes on clock steps', () => {
      ctrl.noteOn(60, 1.0);
      ctrl.noteOn(64, 1.0);
      ctrl.pressPlay();

      // Advance enough for several steps
      vi.advanceTimersByTime(2000);
      ctrl.stop();

      expect(notesPlayed.length).toBeGreaterThan(0);
      const playedNotes = notesPlayed.map(n => n.note);
      expect(playedNotes).toContain(60);
      expect(playedNotes).toContain(64);
    });

    it('releases previous note before playing next', () => {
      ctrl.noteOn(60, 1.0);
      ctrl.noteOn(64, 1.0);
      ctrl.pressPlay();

      vi.advanceTimersByTime(2000);
      ctrl.stop();

      // Each noteOn (except the first) should be preceded by a noteOff
      expect(notesOff.length).toBeGreaterThan(0);
    });
  });

  describe('seq mode', () => {
    it('transposes sequence on note input while playing', () => {
      // Record a simple sequence
      ctrl.setMode('rec');
      ctrl.noteOn(60, 1.0); // C4
      ctrl.noteOn(64, 1.0); // E4
      ctrl.setMode('seq');

      // Must be playing for transpose to work
      ctrl.pressPlay();

      // Transpose by pressing E4 (offset = 64 - 60 = 4)
      ctrl.noteOn(64, 1.0);
      expect(ctrl.seq._transpose).toBe(4);
      ctrl.stop();
    });

    it('clears transpose on start', () => {
      ctrl.setMode('rec');
      ctrl.noteOn(60, 1.0);
      ctrl.setMode('seq');
      ctrl.noteOn(64, 1.0); // set transpose
      ctrl.pressPlay();

      expect(ctrl.seq._transpose).toBe(0);
    });
  });

  describe('rec mode buttons', () => {
    beforeEach(() => {
      ctrl.setMode('rec');
    });

    it('PLAY sets tie flag', () => {
      ctrl.pressPlay();
      expect(ctrl._tieNext).toBe(true);
    });

    it('HOLD inserts rest', () => {
      ctrl.pressHold();
      expect(ctrl.seq.sequence.length).toBe(1);
      expect(ctrl.seq.sequence[0].rest).toBe(true);
    });

    it('TAP sets accent flag', () => {
      ctrl.pressTap();
      expect(ctrl._accentNext).toBe(true);
    });

    it('flags are cleared after recording a step', () => {
      ctrl.pressTap();
      ctrl.pressPlay();
      ctrl.noteOn(60, 1.0);

      expect(ctrl._accentNext).toBe(false);
      expect(ctrl._tieNext).toBe(false);
    });
  });

  describe('play/stop toggle', () => {
    it('pressPlay toggles play state', () => {
      ctrl.noteOn(60, 1.0);
      expect(ctrl.isPlaying()).toBe(false);
      ctrl.pressPlay();
      expect(ctrl.isPlaying()).toBe(true);
      ctrl.pressPlay();
      expect(ctrl.isPlaying()).toBe(false);
    });

    it('stop releases last note', () => {
      ctrl.noteOn(60, 1.0);
      ctrl.pressPlay();
      vi.advanceTimersByTime(600);
      ctrl.stop();

      // Should have released the last note
      expect(notesOff.length).toBeGreaterThan(0);
    });
  });

  describe('hold toggle', () => {
    it('pressHold toggles hold state', () => {
      expect(ctrl.isHolding()).toBe(false);
      ctrl.pressHold();
      expect(ctrl.isHolding()).toBe(true);
      ctrl.pressHold();
      expect(ctrl.isHolding()).toBe(false);
    });
  });

  describe('tap tempo', () => {
    it('tap tempo activates after 3 taps', () => {
      expect(ctrl.isTapTempoActive()).toBe(false);

      mockTime = 0;
      ctrl.pressTap();
      mockTime = 500;
      ctrl.pressTap();
      mockTime = 1000;
      ctrl.pressTap();

      expect(ctrl.isTapTempoActive()).toBe(true);
    });

    it('holding tap for 1s deactivates', () => {
      // Activate tap tempo
      mockTime = 0;
      ctrl.pressTap();
      mockTime = 500;
      ctrl.pressTap();
      mockTime = 1000;
      ctrl.pressTap();
      expect(ctrl.isTapTempoActive()).toBe(true);

      // Press and hold TAP for >1s, then release
      mockTime = 2000;
      ctrl.pressTap(); // sets _tapPressTime = 2000
      mockTime = 3100; // 1100ms later
      ctrl.releaseTap(); // checks 3100 - 2000 > 1000 = true
      expect(ctrl.isTapTempoActive()).toBe(false);
    });
  });

  describe('octave/seq switch', () => {
    it('setOctSeq sets arp octave range in arp mode', () => {
      ctrl.setOctSeq(3);
      expect(ctrl.arp._octaveRange).toBe(3);
    });

    it('setOctSeq sets seq slot in seq mode', () => {
      ctrl.setMode('seq');
      ctrl.setOctSeq(2);
      expect(ctrl.seq._currentSlot).toBe(1); // 0-indexed
    });
  });
});
