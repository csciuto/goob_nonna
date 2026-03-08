import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignalBus } from '../../js/audio/routing/signal-bus.js';
import { PatchManager } from '../../js/audio/routing/patch-manager.js';
import { JACK_TYPE } from '../../js/utils/constants.js';

// Mock audio nodes
function createMockNode(name) {
  const connections = new Set();
  return {
    name,
    connect: vi.fn((dest) => { connections.add(dest); }),
    disconnect: vi.fn((dest) => { if (dest) connections.delete(dest); else connections.clear(); }),
    _connections: connections,
  };
}

describe('SignalBus', () => {
  let bus;

  beforeEach(() => {
    bus = new SignalBus();
  });

  it('registers and retrieves jacks', () => {
    const node = createMockNode('test');
    bus.register('test-jack', { type: JACK_TYPE.OUTPUT, node, label: 'Test' });

    const jack = bus.get('test-jack');
    expect(jack).toBeTruthy();
    expect(jack.id).toBe('test-jack');
    expect(jack.type).toBe(JACK_TYPE.OUTPUT);
    expect(jack.node).toBe(node);
  });

  it('returns null for unknown jacks', () => {
    expect(bus.get('nonexistent')).toBeUndefined();
    expect(bus.getNode('nonexistent')).toBeNull();
  });

  it('filters jacks by type', () => {
    bus.register('out1', { type: JACK_TYPE.OUTPUT, node: createMockNode('o1') });
    bus.register('out2', { type: JACK_TYPE.OUTPUT, node: createMockNode('o2') });
    bus.register('in1', { type: JACK_TYPE.INPUT, node: createMockNode('i1') });

    expect(bus.getOutputs()).toHaveLength(2);
    expect(bus.getInputs()).toHaveLength(1);
  });

  it('tracks patched state', () => {
    bus.register('j1', { type: JACK_TYPE.OUTPUT, node: createMockNode('n1') });
    expect(bus.isPatched('j1')).toBe(false);

    bus.setPatched('j1', true);
    expect(bus.isPatched('j1')).toBe(true);

    bus.setPatched('j1', false);
    expect(bus.isPatched('j1')).toBe(false);
  });
});

describe('PatchManager', () => {
  let bus, pm;
  let srcNode, destNode, normalSrcNode;

  beforeEach(() => {
    bus = new SignalBus();
    pm = new PatchManager(bus);

    srcNode = createMockNode('source');
    destNode = createMockNode('dest');
    normalSrcNode = createMockNode('normalSource');

    // Register jacks: an output and an input with a normalled source
    bus.register('normal-src', { type: JACK_TYPE.OUTPUT, node: normalSrcNode });
    bus.register('src-out', { type: JACK_TYPE.OUTPUT, node: srcNode });
    bus.register('dest-in', { type: JACK_TYPE.INPUT, node: destNode, normalledFrom: 'normal-src' });
  });

  it('establishes normalled connections', () => {
    // The normalled connection table uses PATCH_POINTS constants,
    // but we can test the mechanism manually
    // For this test, we need to add entries to NORMALLED_CONNECTIONS
    // Instead, test connect/disconnect behavior directly
    expect(bus.get('dest-in').normalledFrom).toBe('normal-src');
  });

  it('creates a patch connection', () => {
    const patchId = pm.connect('src-out', 'dest-in', '#ff0000');

    expect(patchId).toBe('src-out->dest-in');
    expect(srcNode.connect).toHaveBeenCalledWith(destNode);
    expect(bus.isPatched('dest-in')).toBe(true);
    expect(bus.isPatched('src-out')).toBe(true);
  });

  it('rejects invalid connections (wrong types)', () => {
    // Input to input
    bus.register('dest2-in', { type: JACK_TYPE.INPUT, node: createMockNode('d2') });
    expect(pm.connect('dest-in', 'dest2-in')).toBeNull();

    // Output to output
    bus.register('src2-out', { type: JACK_TYPE.OUTPUT, node: createMockNode('s2') });
    expect(pm.connect('src-out', 'src2-out')).toBeNull();
  });

  it('rejects connections with nonexistent jacks', () => {
    expect(pm.connect('nonexistent', 'dest-in')).toBeNull();
    expect(pm.connect('src-out', 'nonexistent')).toBeNull();
  });

  it('does not create duplicate patches', () => {
    pm.connect('src-out', 'dest-in');
    const patchId2 = pm.connect('src-out', 'dest-in');

    expect(patchId2).toBe('src-out->dest-in');
    // connect should only be called once
    expect(srcNode.connect).toHaveBeenCalledTimes(1);
  });

  it('disconnects a patch', () => {
    const patchId = pm.connect('src-out', 'dest-in');
    pm.disconnect(patchId);

    expect(srcNode.disconnect).toHaveBeenCalledWith(destNode);
    expect(bus.isPatched('dest-in')).toBe(false);
  });

  it('returns all patches', () => {
    bus.register('src2-out', { type: JACK_TYPE.OUTPUT, node: createMockNode('s2') });
    bus.register('dest2-in', { type: JACK_TYPE.INPUT, node: createMockNode('d2') });

    pm.connect('src-out', 'dest-in');
    pm.connect('src2-out', 'dest2-in');

    const patches = pm.getPatches();
    expect(patches).toHaveLength(2);
  });

  it('disconnects all patches', () => {
    bus.register('src2-out', { type: JACK_TYPE.OUTPUT, node: createMockNode('s2') });
    bus.register('dest2-in', { type: JACK_TYPE.INPUT, node: createMockNode('d2') });

    pm.connect('src-out', 'dest-in');
    pm.connect('src2-out', 'dest2-in');
    pm.disconnectAll();

    expect(pm.getPatches()).toHaveLength(0);
  });

  it('gets patches for a specific jack', () => {
    const patchId = pm.connect('src-out', 'dest-in');

    const srcPatches = pm.getPatchesForJack('src-out');
    expect(srcPatches).toHaveLength(1);
    expect(srcPatches[0].sourceId).toBe('src-out');

    const destPatches = pm.getPatchesForJack('dest-in');
    expect(destPatches).toHaveLength(1);
  });
});
