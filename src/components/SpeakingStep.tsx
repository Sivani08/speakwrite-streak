import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRecorder } from "@/hooks/useRecorder";
import { analyzePronunciation, continueSpeaking } from "@/lib/challenge.functions";
import {
  containsTarget,
  MAX_SPEAKING_SECONDS,
  PRONUNCIATION_PASS_THRESHOLD,
  pronunciationPassed,
  type SpeechAttempt,
  type SpeakingState,
} from "@/lib/pronunciation";

export function SpeakingStep({
  challengeId,
  word,
  initialAttempts,
  onContinue,
}: {
  challengeId: string;
  word: string;
  initialAttempts: SpeechAttempt[];
  onContinue: () => void;
}) {
  const [attempts, setAttempts] = useState<SpeechAttempt[]>([...(initialAttempts ?? [])].reverse());
  const savedPass = attempts.find(
    (attempt) =>
      attempt.passed &&
      pronunciationPassed(attempt.target_word_detected, attempt.pronunciation_score),
  );
  const [sentence, setSentence] = useState(attempts.at(-1)?.sentence ?? "");
  const [phase, setPhase] = useState<SpeakingState>(
    savedPass ? "PASSED" : attempts.length ? "FAILED" : "READY",
  );
  const [clip, setClip] = useState<{
    base64: string;
    mimeType: "audio/wav";
    attemptId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const recorder = useRecorder();
  const analyze = useServerFn(analyzePronunciation);
  const proceed = useServerFn(continueSpeaking);
  const valid = sentence.trim().length > 0 && containsTarget(sentence, word);
  const result = phase === "PASSED" ? savedPass : attempts.at(-1);
  const speakingPassed = Boolean(savedPass);

  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(`speaking:${challengeId}`);
      if (draft) setSentence(draft);
    } catch {
      /* Optional draft storage. */
    }
  }, [challengeId]);
  useEffect(() => {
    try {
      if (sentence) sessionStorage.setItem(`speaking:${challengeId}`, sentence);
    } catch {
      /* Optional draft storage. */
    }
  }, [sentence, challengeId]);

  async function stop() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const recording = await recorder.stop();
      if (recording) {
        setClip({
          base64: recording.base64,
          mimeType: "audio/wav",
          attemptId: crypto.randomUUID(),
        });
        setPhase("RECORDED");
      } else setPhase("READY");
    } catch {
      setError("Recording failed. Please record again; your sentence and attempts are kept.");
      setPhase("READY");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (phase === "RECORDING" && recorder.seconds >= MAX_SPEAKING_SECONDS) void stop();
  });

  async function record() {
    if (!valid) {
      setError("Please use today's word in your sentence.");
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (await recorder.start()) {
        setSentence(sentence.trim());
        setClip(null);
        setPhase("RECORDING");
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function assess() {
    if (!clip || lock.current || phase !== "RECORDED") return;
    lock.current = true;
    setPhase("ANALYZING");
    setError(null);
    try {
      const attempt = (await analyze({
        data: { challengeId, sentence: sentence.trim(), ...clip },
      })) as SpeechAttempt;
      setAttempts((previous) =>
        previous.some((row) => row.id === attempt.id) ? previous : [...previous, attempt],
      );
      setPhase(
        attempt.passed &&
          pronunciationPassed(attempt.target_word_detected, attempt.pronunciation_score)
          ? "PASSED"
          : "FAILED",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't analyze this recording. Please retry.",
      );
      setPhase("RECORDED");
    } finally {
      lock.current = false;
    }
  }

  async function next() {
    if (!speakingPassed || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await proceed({ data: { challengeId } });
      onContinue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not continue. Please retry.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Speak using today's word</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-display text-3xl font-bold">{word}</p>
        <p>Create a sentence using this word and speak it aloud.</p>
        <Label htmlFor="speaking-sentence">Your sentence</Label>
        <Textarea
          id="speaking-sentence"
          value={sentence}
          maxLength={400}
          disabled={busy || ["RECORDING", "ANALYZING", "PASSED"].includes(phase)}
          onChange={(event) => {
            setSentence(event.target.value);
            setClip(null);
            setPhase("READY");
            setError(null);
          }}
        />
        {sentence.trim() && !valid && (
          <p role="alert" className="text-destructive text-sm">
            Please use today's word in your sentence.
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          Record 1–{MAX_SPEAKING_SECONDS} seconds. Audio and your sentence are sent to Azure Speech
          when you choose Analyze My Speech.
        </p>
        <div aria-live="polite" className="space-y-3">
          {phase === "RECORDING" && (
            <>
              <p className="text-destructive">● Recording… {recorder.seconds}s</p>
              <Button onClick={() => void stop()} disabled={busy}>
                Stop Recording
              </Button>
            </>
          )}
          {phase === "ANALYZING" && <p role="status">Analyzing your speech…</p>}
          {!["RECORDING", "ANALYZING", "PASSED"].includes(phase) && (
            <Button onClick={() => void record()} disabled={!valid || busy}>
              {phase === "FAILED" ? "Try Again" : clip ? "Record Again" : "Start Recording"}
            </Button>
          )}
          {clip && phase !== "RECORDING" && (
            <audio
              aria-label="Play Recording"
              controls
              src={`data:audio/wav;base64,${clip.base64}`}
            />
          )}
          {phase === "RECORDED" && (
            <Button onClick={() => void assess()} disabled={busy}>
              Analyze My Speech
            </Button>
          )}
          {(error || recorder.error) && (
            <p role="alert" className="text-destructive">
              {error ?? recorder.error}
            </p>
          )}
          {result && ["FAILED", "PASSED"].includes(phase) && (
            <div className="bg-secondary space-y-2 rounded-xl p-4">
              <p className="font-semibold">
                {speakingPassed ? "Pronunciation Passed!" : "Needs More Practice"}
              </p>
              <p>Your speech: {result.transcript}</p>
              <p>
                {result.target_word_detected
                  ? "✓ Target word detected"
                  : "✗ Target word not detected"}
              </p>
              <p>
                Target-word pronunciation: {result.pronunciation_score}% · Pass mark:{" "}
                {PRONUNCIATION_PASS_THRESHOLD}%
              </p>
              <p>{result.feedback}</p>
            </div>
          )}
        </div>
        {attempts.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold">Your Attempts</p>
            <ol>
              {attempts.map((attempt, index) => (
                <li key={attempt.id}>
                  Attempt {index + 1} — {attempt.pronunciation_score}% —{" "}
                  {attempt.passed ? "✓ Passed" : "Needs practice"}
                </li>
              ))}
            </ol>
          </div>
        )}
        <Button
          onClick={() => void next()}
          disabled={!speakingPassed || busy || phase !== "PASSED"}
        >
          Continue →
        </Button>
      </CardContent>
    </Card>
  );
}
