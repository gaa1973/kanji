export class AudioGenerator {
  private audioContext: AudioContext;
  private audioBuffers: { [key: string]: AudioBuffer } = {};

  constructor() {
    this.audioContext = new AudioContext();
  }

  async generateOpeningSound(): Promise<AudioBuffer> {
    const duration = 1;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = 440 * Math.pow(2, (t * 12) / 12);
        data[i] = Math.sin(2 * Math.PI * freq * t) * 0.3 * (1 - t);
      }
    }

    this.audioBuffers.opening = buffer;
    return buffer;
  }

  async generateStrokeSound(): Promise<AudioBuffer> {
    const duration = 0.15;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 15);
        data[i] = (Math.random() * 2 - 1) * 0.2 * envelope +
                  Math.sin(2 * Math.PI * 800 * t) * 0.15 * envelope;
      }
    }

    this.audioBuffers.stroke = buffer;
    return buffer;
  }

  async generateTransitionSound(): Promise<AudioBuffer> {
    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = 523 + t * 200;
        const envelope = Math.sin((t / duration) * Math.PI);
        data[i] = Math.sin(2 * Math.PI * freq * t) * 0.2 * envelope;
      }
    }

    this.audioBuffers.transition = buffer;
    return buffer;
  }

  async generateConclusionSound(): Promise<AudioBuffer> {
    const duration = 3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    const melodyNotes = [
      { freq: 523.25, start: 0.0, length: 0.15 },
      { freq: 659.25, start: 0.15, length: 0.15 },
      { freq: 783.99, start: 0.3, length: 0.15 },
      { freq: 1046.50, start: 0.45, length: 0.4 }
    ];

    const chordFreqs = [523.25, 659.25, 783.99, 1046.50];

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);

      for (const note of melodyNotes) {
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          if (t >= note.start && t < note.start + note.length) {
            const localT = t - note.start;
            const envelope = Math.sin((localT / note.length) * Math.PI) *
                           Math.exp(-localT * 3);
            data[i] += Math.sin(2 * Math.PI * note.freq * localT) * 0.3 * envelope;
          }
        }
      }

      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        if (t >= 0.9) {
          const chordT = t - 0.9;
          const envelope = (1 - Math.pow(chordT / (duration - 0.9), 1.5)) *
                          Math.exp(-chordT * 0.5);
          let chordValue = 0;
          for (const freq of chordFreqs) {
            chordValue += Math.sin(2 * Math.PI * freq * chordT);
          }
          data[i] += (chordValue / chordFreqs.length) * 0.25 * envelope;
        }
      }
    }

    this.audioBuffers.conclusion = buffer;
    return buffer;
  }

  async createMasterAudioTrack(totalDuration: number, strokeCount: number): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, totalDuration * sampleRate, sampleRate);

    await this.generateOpeningSound();
    await this.generateStrokeSound();
    await this.generateTransitionSound();
    await this.generateConclusionSound();

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);

      this.copyBufferAtTime(data, this.audioBuffers.opening, 0, sampleRate, channel);

      this.copyBufferAtTime(data, this.audioBuffers.transition, 1, sampleRate, channel);

      const strokeDuration = 10 / strokeCount;
      for (let i = 0; i < strokeCount; i++) {
        const time = 4 + i * strokeDuration;
        this.copyBufferAtTime(data, this.audioBuffers.stroke, time, sampleRate, channel);
      }

      this.copyBufferAtTime(data, this.audioBuffers.conclusion, 6, sampleRate, channel);

      this.copyBufferAtTime(data, this.audioBuffers.transition, 14, sampleRate, channel);
    }

    return buffer;
  }

  private copyBufferAtTime(
    targetData: Float32Array,
    sourceBuffer: AudioBuffer,
    startTime: number,
    sampleRate: number,
    channel: number
  ) {
    const startSample = Math.floor(startTime * sampleRate);
    const sourceData = sourceBuffer.getChannelData(channel);

    for (let i = 0; i < sourceData.length && startSample + i < targetData.length; i++) {
      targetData[startSample + i] += sourceData[i];
    }
  }

  async audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }
}

export async function mergeVideoAndAudio(videoBlob: Blob, audioBlob: Blob): Promise<Blob> {
  const videoEl = document.createElement('video');
  const audioEl = document.createElement('audio');

  videoEl.src = URL.createObjectURL(videoBlob);
  audioEl.src = URL.createObjectURL(audioBlob);

  await Promise.all([
    new Promise(resolve => { videoEl.onloadeddata = resolve; }),
    new Promise(resolve => { audioEl.onloadeddata = resolve; })
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth || 1080;
  canvas.height = videoEl.videoHeight || 1920;
  const ctx = canvas.getContext('2d')!;

  const audioContext = new AudioContext();
  const audioSource = audioContext.createMediaElementSource(audioEl);
  const dest = audioContext.createMediaStreamDestination();
  audioSource.connect(dest);

  const videoStream = canvas.captureStream(30);
  const audioStream = dest.stream;

  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...audioStream.getAudioTracks()
  ]);

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm;codecs=vp8,opus',
    videoBitsPerSecond: 2500000,
    audioBitsPerSecond: 128000
  });

  const chunks: Blob[] = [];

  const recordingPromise = new Promise<Blob>((resolve) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });

  mediaRecorder.start();
  videoEl.play();
  audioEl.play();

  const drawFrame = () => {
    if (!videoEl.paused && !videoEl.ended) {
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    } else {
      mediaRecorder.stop();
      audioContext.close();
    }
  };

  drawFrame();

  return await recordingPromise;
}
