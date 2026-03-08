import { JACK_TYPE } from '../../utils/constants.js';

/**
 * Signal Bus - Registry for all patch points (jacks).
 * Each jack has an ID, type (input/output), associated audio node,
 * and optionally a normalled source.
 */
export class SignalBus {
  constructor() {
    /** @type {Map<string, JackInfo>} */
    this.jacks = new Map();
  }

  /**
   * Register a patch point.
   * @param {string} id - Unique jack ID from PATCH_POINTS
   * @param {object} options
   * @param {string} options.type - 'input' or 'output'
   * @param {AudioNode} options.node - The audio node this jack connects to
   * @param {string|null} options.normalledFrom - ID of the default source jack (inputs only)
   * @param {string} options.label - Display label
   * @param {string} options.module - Module this jack belongs to
   */
  register(id, { type, node, normalledFrom = null, label = '', module = '' }) {
    this.jacks.set(id, {
      id,
      type,
      node,
      normalledFrom,
      label,
      module,
      patched: false,
    });
  }

  /**
   * Get a jack by ID.
   */
  get(id) {
    return this.jacks.get(id);
  }

  /**
   * Get the audio node for a jack.
   */
  getNode(id) {
    const jack = this.jacks.get(id);
    return jack ? jack.node : null;
  }

  /**
   * Get all jacks of a given type.
   */
  getByType(type) {
    const result = [];
    for (const jack of this.jacks.values()) {
      if (jack.type === type) {
        result.push(jack);
      }
    }
    return result;
  }

  /**
   * Get all output jacks.
   */
  getOutputs() {
    return this.getByType(JACK_TYPE.OUTPUT);
  }

  /**
   * Get all input jacks.
   */
  getInputs() {
    return this.getByType(JACK_TYPE.INPUT);
  }

  /**
   * Mark a jack as patched or unpatched.
   */
  setPatched(id, patched) {
    const jack = this.jacks.get(id);
    if (jack) {
      jack.patched = patched;
    }
  }

  /**
   * Check if a jack is currently patched.
   */
  isPatched(id) {
    const jack = this.jacks.get(id);
    return jack ? jack.patched : false;
  }
}
