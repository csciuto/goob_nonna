/**
 * White noise generator using an AudioBufferSourceNode.
 * Generates a buffer of random samples and loops it.
 */
export class NoiseModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    // Create a 2-second buffer of white noise
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Create buffer source
    this.source = this.ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;

    // Output gain node (junction point)
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    this.source.connect(this.output);
    this.source.start();
  }

  destroy() {
    this.source.stop();
    this.source.disconnect();
    this.output.disconnect();
  }
}
