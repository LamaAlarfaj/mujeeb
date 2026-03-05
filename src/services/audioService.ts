/**
 * Audio processing utilities for PCM audio used by Gemini Live API.
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  async startRecording(onAudioData: (base64Data: string) => void) {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // Using ScriptProcessorNode for simplicity in this environment
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64Data = this.arrayBufferToBase64(pcmData);
      onAudioData(base64Data);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stopRecording() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Playback logic
  private audioQueue: Int16Array[] = [];
  private isPlaying = false;
  private playbackContext: AudioContext | null = null;

  playAudioChunk(base64Data: string) {
    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate: 24000 });
    }
    
    const binary = window.atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const pcmData = new Int16Array(bytes.buffer);
    this.audioQueue.push(pcmData);
    
    if (!this.isPlaying) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.audioQueue.length === 0 || !this.playbackContext) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const pcmData = this.audioQueue.shift()!;
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    const buffer = this.playbackContext.createBuffer(1, floatData.length, 24000);
    buffer.getChannelData(0).set(floatData);
    
    const source = this.playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext.destination);
    source.onended = () => this.processQueue();
    source.start();
  }

  stopPlayback() {
    this.audioQueue = [];
    this.isPlaying = false;
    // In a real app, we'd track the current source and stop it
  }
}
