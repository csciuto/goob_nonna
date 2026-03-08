import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Clock } from '../../js/arp-seq/clock.js';

// Minimal AudioContext mock
function mockAudioContext() {
  return { currentTime: 0 };
}

describe('Clock', () => {
  let clock;
  let mockTime;

  beforeEach(() => {
    clock = new Clock(mockAudioContext());
    mockTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => mockTime);
    vi.useFakeTimers();
  });

  it('starts at 120 BPM', () => {
    expect(clock.getBPM()).toBe(120);
  });

  it('setRate maps 0-10 knob to 20-280 BPM', () => {
    clock.setRate(0);
    expect(clock.getBPM()).toBe(20);

    clock.setRate(10);
    expect(clock.getBPM()).toBe(280);

    clock.setRate(5);
    expect(clock.getBPM()).toBe(150);
  });

  it('setBPM clamps to 20-280', () => {
    clock.setBPM(10);
    expect(clock.getBPM()).toBe(20);

    clock.setBPM(300);
    expect(clock.getBPM()).toBe(280);
  });

  it('start fires callback on interval', () => {
    const steps = [];
    clock.setBPM(120); // 500ms per beat
    clock.start((step) => steps.push(step));

    vi.advanceTimersByTime(1600); // ~3 beats
    clock.stop();

    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[0]).toBe(0);
    expect(steps[1]).toBe(1);
    expect(steps[2]).toBe(2);
  });

  it('stop stops firing', () => {
    const steps = [];
    clock.setBPM(120);
    clock.start((step) => steps.push(step));

    vi.advanceTimersByTime(600);
    clock.stop();
    const count = steps.length;

    vi.advanceTimersByTime(2000);
    expect(steps.length).toBe(count);
  });

  it('tap tempo requires 3+ taps', () => {
    expect(clock.isTapOverride()).toBe(false);

    mockTime = 0;
    clock.tap();
    mockTime = 500;
    clock.tap();
    expect(clock.isTapOverride()).toBe(false);

    mockTime = 1000;
    clock.tap();
    expect(clock.isTapOverride()).toBe(true);
    expect(clock.getBPM()).toBeCloseTo(120, 0);
  });

  it('tap tempo resets if gap > 2 seconds', () => {
    mockTime = 0;
    clock.tap();
    mockTime = 500;
    clock.tap();
    mockTime = 1000;
    clock.tap();
    expect(clock.isTapOverride()).toBe(true);

    // Gap > 2s resets tap history
    mockTime = 3500;
    clock.tap(); // only 1 tap after reset
    mockTime = 4000;
    clock.tap(); // 2 taps
    // Still override from before but BPM changed
    // The key behavior: needs 3 fresh taps
    expect(clock._tapTimes.length).toBe(2);
  });

  it('setRate is ignored during tap override', () => {
    // Activate tap tempo at ~100 BPM (600ms intervals)
    clock.tap();
    vi.advanceTimersByTime(600);
    clock.tap();
    vi.advanceTimersByTime(600);
    clock.tap();
    expect(clock.isTapOverride()).toBe(true);
    const tapBPM = clock.getBPM();

    // setRate should be ignored
    clock.setRate(0); // Would normally set to 20 BPM
    expect(clock.getBPM()).toBe(tapBPM);
  });

  it('clearTapOverride allows knob control again', () => {
    clock.tap();
    vi.advanceTimersByTime(500);
    clock.tap();
    vi.advanceTimersByTime(500);
    clock.tap();
    expect(clock.isTapOverride()).toBe(true);

    clock.clearTapOverride();
    expect(clock.isTapOverride()).toBe(false);

    clock.setRate(0);
    expect(clock.getBPM()).toBe(20);
  });
});
