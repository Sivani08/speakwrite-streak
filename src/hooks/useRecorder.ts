import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_SPEAKING_SECONDS } from "@/lib/pronunciation";

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
  const outLength = Math.min(Math.floor(merged.length / ratio), MAX_SPEAKING_SECONDS * targetRate);
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
  const mounted = useRef(true);
  const starting = useRef(false);
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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const current = state.current;
      if (current.timer) clearInterval(current.timer);
      current.stream?.getTracks().forEach((track) => track.stop());
      current.node?.disconnect();
      current.source?.disconnect();
      void current.ctx?.close().catch(() => {});
    };
  }, []);

  const start = useCallback(async () => {
    if (starting.current || state.current.stream) return false;
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      setError(
        "This browser does not support recording. Use a current browser on HTTPS with a microphone.",
      );
      return false;
    }
    starting.current = true;
    setError(null);
    let stream: MediaStream | undefined;
    let ctx: AudioContext | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      ctx = new AudioContext();
      await ctx.resume();
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        await ctx.close();
        return false;
      }
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
        timer: setInterval(
          () => setSeconds(Math.floor((Date.now() - state.current.startedAt) / 1000)),
          500,
        ),
      };
      setSeconds(0);
      setRecording(true);
      return true;
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      void ctx?.close().catch(() => {});
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Microphone access is required for the speaking practice. Please allow microphone access and try again."
          : "We couldn't access a working microphone. Check that it is connected and try again.",
      );
      return false;
    } finally {
      starting.current = false;
    }
  }, []);

  const stop = useCallback(async (): Promise<Recording | null> => {
    const current = state.current;
    if (!current.ctx || !current.stream) return null;
    state.current = { chunks: [], startedAt: 0 };
    if (current.timer) clearInterval(current.timer);
    current.stream.getTracks().forEach((track) => track.stop());
    current.node?.disconnect();
    current.source?.disconnect();
    const sampleRate = current.ctx.sampleRate;
    const durationSeconds = Math.min(
      current.chunks.reduce((sum, chunk) => sum + chunk.length, 0) / sampleRate,
      MAX_SPEAKING_SECONDS,
    );
    setRecording(false);
    await current.ctx.close().catch(() => {});

    const blob = encodeWav(current.chunks, sampleRate);
    state.current = { chunks: [], startedAt: 0 };
    if (durationSeconds < 1 || blob.size < 32044) {
      setError("That recording was empty — please try again.");
      return null;
    }
    return { base64: await blobToBase64(blob), mimeType: "audio/wav", durationSeconds };
  }, []);

  return { recording, seconds, error, start, stop, setError };
}
