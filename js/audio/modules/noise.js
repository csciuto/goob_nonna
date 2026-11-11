import { mulberry } from '../worklets.js';

/** White noise: a looping four-second buffer, the same on every load. */
export class NoiseModule {
  constructor(audioContext) {
    this.ctx = audioContext;
    const length = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0), rand = mulberry(1977);
    for (let i = 0; i < length; i++) data[i] = rand() * 2 - 1;

    this.source = this.ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.output = this.ctx.createGain();
    this.source.connect(this.output);
    this.source.start();
  }

  destroy() {
    this.source.stop();
    this.source.disconnect();
    this.output.disconnect();
  }
}
