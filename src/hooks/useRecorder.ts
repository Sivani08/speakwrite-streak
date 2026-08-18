import { useCallback, useRef, useState } from "react";

type Recording = { base64: string; mimeType: string; durationSeconds: number };

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const targetRate = 16_000;
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const ratio = sampleRate / targetRate;
  const outLength = Math.floor(merged.length / ratio);
  const samples = new Int16Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const value = merged[Math.floor(i * ratio)] ?? 0;
    const clamped = Math.max(-1, Math.min(1, value));
    samples[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(pos + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);

  return new Blob([buffer], { type: "audio/wav" });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const state = useRef<{
    stream?: MediaStream;
    ctx?: AudioContext;
    node?: ScriptProcessorNode;
    source?: MediaStreamAudioSourceNode;
    chunks: Float32Array[];
    startedAt: number;
    timer?: ReturnType<typeof setInterval>;
  }>({ chunks: [], startedAt: 0 });

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      node.onaudioprocess = (event) => {
        chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(node);
      node.connect(ctx.destination);
      state.current = {
        stream,
        ctx,
        node,
        source,
        chunks,
        startedAt: Date.now(),
        timer: setInterval(() => setSeconds(Math.floor((Date.now() - state.current.startedAt) / 1000)), 500),
      };
      setSeconds(0);
      setRecording(true);
      return true;
    } catch {
      setError("We couldn't access your microphone. Check the browser permission and try again.");
      return false;
    }
  }, []);

  const stop = useCallback(async (): Promise<Recording | null> => {
    const current = state.current;
    if (!current.ctx || !current.stream) return null;
    if (current.timer) clearInterval(current.timer);
    current.stream.getTracks().forEach((track) => track.stop());
    current.node?.disconnect();
    current.source?.disconnect();
    const sampleRate = current.ctx.sampleRate;
    const durationSeconds = (Date.now() - current.startedAt) / 1000;
    await current.ctx.close();
    setRecording(false);

    const blob = encodeWav(current.chunks, sampleRate);
    state.current = { chunks: [], startedAt: 0 };
    if (blob.size < 4096) {
      setError("That recording was empty — please try again.");
      return null;
    }
    return { base64: await blobToBase64(blob), mimeType: "audio/wav", durationSeconds };
  }, []);

  return { recording, seconds, error, start, stop, setError };
}
