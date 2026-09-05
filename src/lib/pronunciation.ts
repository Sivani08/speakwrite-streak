export const PRONUNCIATION_PASS_THRESHOLD = 80;
export const MAX_SPEAKING_SECONDS = 30;
export type SpeakingState = "READY" | "RECORDING" | "RECORDED" | "ANALYZING" | "FAILED" | "PASSED";
export function containsTarget(text: string, word: string) {
  const tokens: string[] =
    text
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .match(/[a-z]+(?:['-][a-z]+)*/g) ?? [];
  return tokens.includes(word.trim().toLowerCase().replace(/[’‘]/g, "'"));
}
export function pronunciationPassed(detected: boolean, score: number) {
  return (
    detected && Number.isFinite(score) && score >= PRONUNCIATION_PASS_THRESHOLD && score <= 100
  );
}
export type SpeechAttempt = {
  id: string;
  transcript: string;
  sentence: string;
  pronunciation_score: number;
  target_word_detected: boolean;
  passed: boolean;
  feedback: string;
  created_at: string;
};
export type Assessment = {
  transcript: string;
  targetWordDetected: boolean;
  pronunciationScore: number;
  passed: boolean;
  feedback: string;
};

// Accept both REST's flat word scores and the SDK-compatible nested form.
export function parseAssessment(raw: unknown, word: string): Assessment {
  const body = raw as {
    RecognitionStatus?: string;
    DisplayText?: string;
    NBest?: {
      Display?: string;
      Lexical?: string;
      Words?: {
        Word?: string;
        AccuracyScore?: number;
        ErrorType?: string;
        PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string };
      }[];
    }[];
  };
  if (body?.RecognitionStatus !== "Success")
    throw new Error("We couldn't hear a clear sentence. Please record again.");
  const best = body.NBest?.[0];
  const transcript = best?.Display ?? body.DisplayText ?? best?.Lexical ?? "";
  const matches = (best?.Words ?? []).filter(
    (entry) =>
      containsTarget(entry.Word ?? "", word) &&
      (entry.PronunciationAssessment?.ErrorType ?? entry.ErrorType) !== "Omission",
  );
  const targetWordDetected = containsTarget(transcript, word) && matches.length > 0;
  if (!containsTarget(transcript, word))
    return {
      transcript,
      targetWordDetected: false,
      pronunciationScore: 0,
      passed: false,
      feedback:
        "We couldn't detect today's word in your speech. Try speaking the sentence again and pronounce the target word clearly.",
    };
  const scores = matches.map(
    (entry) => entry.PronunciationAssessment?.AccuracyScore ?? entry.AccuracyScore,
  );
  if (
    !scores.length ||
    scores.some(
      (score) => typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100,
    )
  )
    throw new Error(
      "The speech service did not return a pronunciation assessment. Please retry; a transcript alone cannot unlock Continue.",
    );
  // Require every spoken occurrence to reach the threshold; never use the
  // whole-sentence score or round 79.9 up into a pass.
  const pronunciationScore = Math.min(...(scores as number[]));
  const passed = pronunciationPassed(targetWordDetected, pronunciationScore);
  return {
    transcript,
    targetWordDetected,
    pronunciationScore,
    passed,
    feedback: passed
      ? "Great job! Your pronunciation of today's word is clear."
      : "The target word was detected, but its pronunciation score is below the practice goal. Try saying the word slowly, then record your sentence again.",
  };
}

export function validateWav(base64: string): Uint8Array {
  if (base64.length > 1_300_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))
    throw new Error("That recording could not be read. Please record again.");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch {
    throw new Error("That recording could not be read. Please record again.");
  }
  const view = new DataView(bytes.buffer);
  if (
    bytes.length < 32044 ||
    (bytes.length - 44) % 2 ||
    view.getUint32(4, true) !== bytes.length - 8 ||
    view.getUint32(28, true) !== 32000 ||
    view.getUint16(32, true) !== 2
  )
    throw new Error("Please record between one and 30 seconds of audio using the recorder.");
  const label = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length));
  if (
    bytes.length < 4096 ||
    label(0, 4) !== "RIFF" ||
    label(8, 4) !== "WAVE" ||
    label(12, 4) !== "fmt " ||
    label(36, 4) !== "data" ||
    view.getUint32(16, true) !== 16 ||
    view.getUint16(20, true) !== 1 ||
    view.getUint16(22, true) !== 1 ||
    view.getUint32(24, true) !== 16000 ||
    view.getUint16(34, true) !== 16 ||
    view.getUint32(40, true) !== bytes.length - 44 ||
    bytes.length - 44 > MAX_SPEAKING_SECONDS * 32000
  )
    throw new Error("Please record between one and 30 seconds of audio using the recorder.");
  return bytes;
}
