import { describe, it, expect, beforeEach } from 'vitest';
import { Arpeggiator } from '../../js/arp-seq/arpeggiator.js';
import { ARP_MODES } from '../../js/utils/constants.js';

describe('Arpeggiator - Hold mode', () => {
  let arp;

  beforeEach(() => {
    arp = new Arpeggiator();
    arp.setMode(ARP_MODES.FORWARD);
  });

  it('hold keeps notes after key release', () => {
    arp.addNote(60);
    arp.addNote(64);
    arp.setHold(true);
    arp.removeNote(60);
    arp.removeNote(64);

    expect(arp.hasNotes()).toBe(true);
    expect(arp.nextNote()).toBe(60);
    expect(arp.nextNote()).toBe(64);
  });

  it('hold adds new notes to locked pattern', () => {
    arp.addNote(60);
    arp.setHold(true);
    arp.addNote(64);
    arp.removeNote(60);
    arp.removeNote(64);

    expect(arp.nextNote()).toBe(60);
    expect(arp.nextNote()).toBe(64);
  });

  it('all fingers lift + new note = fresh pattern', () => {
    arp.addNote(60);
    arp.addNote(64);
    arp.setHold(true);

    // Release all
    arp.removeNote(60);
    arp.removeNote(64);

    // Play new note — should replace pattern
    arp.addNote(72);
    arp.removeNote(72);

    expect(arp.nextNote()).toBe(72);
    // Should only be one note, not the old 60/64
    expect(arp.nextNote()).toBe(72);
  });

  it('partial release + new note = adds to pattern', () => {
    arp.addNote(60);
    arp.addNote(64);
    arp.setHold(true);

    // Release only one
    arp.removeNote(64);

    // Play new note while 60 still held — adds to pattern
    arp.addNote(67);
    arp.removeNote(67);

    const notes = [arp.nextNote(), arp.nextNote(), arp.nextNote()];
    expect(notes).toContain(60);
    expect(notes).toContain(64);
    expect(notes).toContain(67);
  });

  it('turning hold off clears locked notes', () => {
    arp.addNote(60);
    arp.setHold(true);
    arp.removeNote(60);

    // Notes still play due to hold
    expect(arp.hasNotes()).toBe(true);

    // Turn off hold — locked notes clear, held notes empty
    arp.setHold(false);
    expect(arp.hasNotes()).toBe(false);
  });

  it('hold with octave expansion', () => {
    arp.setOctaveRange(2);
    arp.addNote(60);
    arp.setHold(true);
    arp.removeNote(60);

    expect(arp.nextNote()).toBe(60);
    expect(arp.nextNote()).toBe(72);
    expect(arp.nextNote()).toBe(60);
  });
});
