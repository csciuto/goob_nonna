import { describe, it, expect, beforeEach } from 'vitest';
import { Arpeggiator } from '../../js/arp-seq/arpeggiator.js';
import { ARP_MODES } from '../../js/utils/constants.js';

describe('Arpeggiator', () => {
  let arp;

  beforeEach(() => {
    arp = new Arpeggiator();
  });

  it('returns null when no notes are held', () => {
    expect(arp.nextNote()).toBeNull();
    expect(arp.hasNotes()).toBe(false);
  });

  it('plays single note repeatedly', () => {
    arp.addNote(60);
    expect(arp.hasNotes()).toBe(true);
    expect(arp.nextNote()).toBe(60);
    expect(arp.nextNote()).toBe(60);
  });

  it('ORDER mode plays notes as added', () => {
    arp.setMode(ARP_MODES.ORDER);
    arp.addNote(64);
    arp.addNote(60);
    arp.addNote(67);

    expect(arp.nextNote()).toBe(64);
    expect(arp.nextNote()).toBe(60);
    expect(arp.nextNote()).toBe(67);
    expect(arp.nextNote()).toBe(64); // wraps around
  });

  it('FORWARD mode plays notes low to high', () => {
    arp.setMode(ARP_MODES.FORWARD);
    arp.addNote(67);
    arp.addNote(60);
    arp.addNote(64);

    expect(arp.nextNote()).toBe(60);
    expect(arp.nextNote()).toBe(64);
    expect(arp.nextNote()).toBe(67);
  });

  it('BACKWARD mode plays notes high to low', () => {
    arp.setMode(ARP_MODES.BACKWARD);
    arp.addNote(60);
    arp.addNote(67);
    arp.addNote(64);

    expect(arp.nextNote()).toBe(67);
    expect(arp.nextNote()).toBe(64);
    expect(arp.nextNote()).toBe(60);
  });

  it('expands across octave range', () => {
    arp.setMode(ARP_MODES.FORWARD);
    arp.setOctaveRange(2);
    arp.addNote(60);

    expect(arp.nextNote()).toBe(60);
    expect(arp.nextNote()).toBe(72); // 60 + 12
    expect(arp.nextNote()).toBe(60); // wraps
  });

  it('removes notes correctly', () => {
    arp.addNote(60);
    arp.addNote(64);
    arp.removeNote(60);

    expect(arp.nextNote()).toBe(64);
    expect(arp.nextNote()).toBe(64);
  });

  it('hold mode locks notes', () => {
    arp.setMode(ARP_MODES.FORWARD);
    arp.addNote(60);
    arp.addNote(64);
    arp.setHold(true);

    // Remove notes - they should still play due to hold
    arp.removeNote(60);
    arp.removeNote(64);

    expect(arp.hasNotes()).toBe(true);
    expect(arp.nextNote()).toBe(60);
    expect(arp.nextNote()).toBe(64);
  });

  it('reset resets step index', () => {
    arp.setMode(ARP_MODES.FORWARD);
    arp.addNote(60);
    arp.addNote(64);
    arp.addNote(67);

    arp.nextNote(); // 60
    arp.nextNote(); // 64
    arp.reset();
    expect(arp.nextNote()).toBe(60); // back to start
  });
});
