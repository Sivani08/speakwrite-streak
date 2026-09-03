import { AppShell } from "@/components/AppShell";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useRecorder } from "@/hooks/useRecorder";
import {
  advanceStage,
  analyzeSpeech,
  evaluateRecall,
  evaluateSentences,
  fetchTodayChallenge,
  startTodayChallenge,
} from "@/lib/challenge.functions";
import { localToday } from "@/lib/date";
import { CHALLENGE_STEPS, STEP_LABELS, SCORING_CONFIG } from "@/lib/scoring";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Loader2,
  Mic,
  Square,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/challenge")({
  head: () => ({
    meta: [
      { title: "Daily Challenge — AI Vocabulary Streak" },
      {
        name: "description",
        content: "Learn, write, speak and recall today's word to earn your streak.",
      },
      { property: "og:title", content: "Daily Challenge — AI Vocabulary Streak" },
      { property: "og:description", content: "Complete today's 5-step vocabulary challenge." },
    ],
  }),
  component: ChallengePage,
});

type Stage = (typeof CHALLENGE_STEPS)[number];

function ChallengePage() {
  const today = localToday();
  const queryClient = useQueryClient();
  const load = useServerFn(fetchTodayChallenge);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["today", today],
    queryFn: () => load({ data: { today } }),
  });

  const invalidate = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["overview"] });
    queryClient.invalidateQueries({ queryKey: ["history"] });
  };

  if (isLoading) {
    return (
      <AppShell title="Today's Challenge">
        <Skeleton className="h-72 w-full rounded-2xl" />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Today's Challenge" subtitle="Pick the word you want to master today.">
        <PickWord today={today} onStarted={invalidate} />
      </AppShell>
    );
  }

  const stage = (data.challenge.stage ?? "learn") as Stage;
  const index = CHALLENGE_STEPS.indexOf(stage);

  return (
    <AppShell
      title={data.challenge.word.toUpperCase()}
      subtitle={`Step ${Math.min(index + 1, 4)} of 4 · ${STEP_LABELS[stage]}`}
    >
      <div className="mb-6">
        <Progress value={(Math.min(index, 4) / 4) * 100} aria-label="Challenge progress" />
        <ol className="text-muted-foreground mt-3 flex flex-wrap gap-4 text-xs font-semibold">
          {CHALLENGE_STEPS.slice(0, 5).map((step, i) => (
            <li key={step} className={i <= index ? "text-foreground" : undefined}>
              {i < index ? "✓ " : ""}
              {STEP_LABELS[step]}
            </li>
          ))}
        </ol>
      </div>

      {stage === "learn" && <LearnStep data={data} onNext={invalidate} />}
      {stage === "write" && <WriteStep data={data} onDone={invalidate} />}
      {stage === "speak" && <SpeakStep data={data} onDone={invalidate} />}
      {stage === "recall" && <RecallStep data={data} today={today} onDone={invalidate} />}
      {stage === "complete" && <CompleteStep data={data} />}
    </AppShell>
  );
}

/* --------------------------------- step 0 --------------------------------- */

function PickWord({ today, onStarted }: { today: string; onStarted: () => void }) {
  const [word, setWord] = useState("");
  const start = useServerFn(startTodayChallenge);
  const mutation = useMutation({
    mutationFn: (value: string) => start({ data: { word: value, today } }),
    onSuccess: () => {
      toast.success("Word ready — time to learn it.");
      onStarted();
    },
    onError: (error: Error) => toast.error(error.message || "We couldn't start the challenge."),
  });

  const suggestions = ["meticulous", "resilient", "candid", "eloquent", "pragmatic", "tenacious"];

  return (
    <Card className="shadow-card mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="size-5 text-streak" aria-hidden />
          Choose today's word
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!word.trim()) {
              toast.error("Please enter a word.");
              return;
            }
            mutation.mutate(word.trim());
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="word">English word</Label>
            <Input
              id="word"
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="e.g. meticulous"
              autoComplete="off"
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Preparing your word…
              </>
            ) : (
              <>
                Start today's challenge <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </Button>
        </form>
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Need inspiration?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <Button key={item} variant="outline" size="sm" onClick={() => setWord(item)}>
                {item}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type ChallengeData = any;

/** Blocks copy/paste/cut so learners type answers themselves. */
function blockClipboard(event: React.ClipboardEvent<HTMLElement>) {
  event.preventDefault();
  toast.error("Copy and paste are disabled — type it yourself.");
}


/* --------------------------------- learn --------------------------------- */

function LearnStep({ data, onNext }: { data: ChallengeData; onNext: () => void }) {
  const word = data.word;
  const advance = useServerFn(advanceStage);
  const mutation = useMutation({
    mutationFn: () => advance({ data: { challengeId: data.challenge.id, stage: "write" } }),
    onSuccess: onNext,
    onError: (error: Error) => toast.error(error.message || "Could not continue."),
  });

  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Your browser can't play pronunciation audio.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(data.challenge.word);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3">
          <span className="font-display text-2xl">{data.challenge.word}</span>
          <span className="text-muted-foreground text-sm font-normal">{word?.pronunciation}</span>
          <Button variant="outline" size="sm" onClick={speak}>
            <Volume2 className="size-4" aria-hidden /> Hear it
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-base">
          <span className="text-muted-foreground">Meaning: </span>
          {word?.simple_meaning}
        </p>
        <p>
          <span className="text-muted-foreground">Part of speech: </span>
          {word?.part_of_speech}
        </p>
        <p>
          <span className="text-muted-foreground">Example: </span>
          <span className="italic">{word?.example}</span>
        </p>
        {word?.prefix && (
          <div className="border-primary bg-primary/5 space-y-2 rounded-xl border-l-4 p-3">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Prefix</p>
            <p className="text-base">
              <span className="font-display font-semibold">{word.prefix}</span>
              {word.prefix_meaning ? ` — ${word.prefix_meaning}` : ""}
            </p>
            {word.prefix_example_word && (
              <p>
                <span className="text-muted-foreground">Another word with {word.prefix} </span>
                <span className="font-medium">{word.prefix_example_word}</span>
                {word.prefix_example_meaning ? ` — ${word.prefix_example_meaning}` : ""}
              </p>
            )}
          </div>
        )}
        {word?.suffix && (
          <div className="border-accent bg-accent/10 space-y-2 rounded-xl border-l-4 p-3">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Suffix</p>
            <p className="text-base">
              <span className="font-display font-semibold">{word.suffix}</span>
              {word.suffix_meaning ? ` — ${word.suffix_meaning}` : ""}
            </p>
            {word.suffix_example_word && (
              <p>
                <span className="text-muted-foreground">Another word with {word.suffix} </span>
                <span className="font-medium">{word.suffix_example_word}</span>
                {word.suffix_example_meaning ? ` — ${word.suffix_example_meaning}` : ""}
              </p>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-muted-foreground text-xs uppercase">Synonyms</p>
            <p className="mt-1">{(word?.synonyms ?? []).join(", ")}</p>
          </div>
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-muted-foreground text-xs uppercase">Antonyms</p>
            <p className="mt-1">{(word?.antonyms ?? []).join(", ")}</p>
          </div>
        </div>
        {word?.usage_tip && (
          <p className="border-primary bg-primary/5 rounded-xl border-l-4 p-3">
            💡 {word.usage_tip}
          </p>
        )}
        <Button size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          I've learned it — start writing <ArrowRight className="size-4" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- write --------------------------------- */

type SentenceError = {
  phrase: string;
  correction: string;
  explanation: string;
  type: string;
};

/** Renders the learner's sentence, wavy-underlining only the flagged phrases. */
function AnnotatedSentence({ text, errors }: { text: string; errors: SentenceError[] }) {
  const parts: Array<{ text: string; error?: SentenceError }> = [];
  let cursor = 0;
  const lower = text.toLowerCase();
  const found = errors
    .map((error) => ({ error, index: lower.indexOf(error.phrase.trim().toLowerCase()) }))
    .filter((item) => item.index >= 0 && item.error.phrase.trim().length > 0)
    .sort((a, b) => a.index - b.index);

  for (const { error, index } of found) {
    if (index < cursor) continue;
    if (index > cursor) parts.push({ text: text.slice(cursor, index) });
    const end = index + error.phrase.trim().length;
    parts.push({ text: text.slice(index, end), error });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });

  return (
    <p className="bg-secondary rounded-xl p-3 text-sm leading-7">
      {parts.map((part, i) =>
        part.error ? (
          <span
            key={i}
            tabIndex={0}
            role="button"
            title={`${part.error.type}: ${part.error.correction} — ${part.error.explanation}`}
            className="group text-destructive relative cursor-help decoration-wavy decoration-2 underline-offset-4"
            style={{ textDecorationLine: "underline", textDecorationColor: "currentColor" }}
          >
            {part.text}
            <span className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden w-64 rounded-lg border p-2 text-xs shadow-lg group-hover:block group-focus:block">
              <strong className="capitalize">{part.error.type}</strong>: “{part.error.phrase}” →{" "}
              <strong>{part.error.correction}</strong>
              <br />
              {part.error.explanation}
            </span>
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}

function WriteStep({ data, onDone }: { data: ChallengeData; onDone: () => void }) {
  const count = SCORING_CONFIG.sentenceCount;
  const prefix = data.word?.prefix as string | null;
  const [values, setValues] = useState<string[]>(() => Array.from({ length: count }, () => ""));
  const [prefixWord, setPrefixWord] = useState("");
  const [prefixWordMeaning, setPrefixWordMeaning] = useState("");
  const startedAt = useRef<number[]>(Array.from({ length: count }, () => 0));
  const evaluate = useServerFn(evaluateSentences);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [results, setResults] = useState<
    {
      sentenceNumber: number;
      overallScore: number;
      passed: boolean;
      feedback: string;
      errors?: SentenceError[];
      suggestions?: string[];
    }[]
  >([]);
  const [prefixResult, setPrefixResult] = useState<null | {
    passed: boolean;
    score: number;
    feedback: string;
  }>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      evaluate({
        data: {
          challengeId: data.challenge.id,
          sentences: values.map((text, index) => ({
            text: text.trim(),
            typingDurationMs: startedAt.current[index]
              ? Date.now() - (startedAt.current[index] ?? 0)
              : 0,
          })),
          prefixWord: prefixWord.trim(),
          prefixWordMeaning: prefixWordMeaning.trim(),
        },
      }),
    onSuccess: (result) => {
      setSubmitted(values.map((v) => v.trim()));
      setResults(result.results as never);
      setPrefixResult((result.prefixResult ?? null) as never);
      setSummary(result.summary);
      if (result.passed) {
        toast.success(`Writing passed with ${result.overallScore}% — time to speak!`);
        onDone();
      } else {
        toast.error("Some answers need work. Read the feedback and retry.");
      }
    },
    onError: (error: Error) => toast.error(error.message || "Evaluation failed. Try again."),
  });

  const prefixIncomplete = Boolean(
    prefix && (prefixWord.trim().length < 3 || prefixWordMeaning.trim().length < 3),
  );

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>
          Write {count} original sentences using "{data.challenge.word}"
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Each sentence needs at least {SCORING_CONFIG.writingPassScore}% to pass. Simple sentences
          are fine — only real grammar, spelling and usage mistakes cost points.
        </p>
        {values.map((value, index) => {
          const result = results.find((r) => r.sentenceNumber === index + 1);
          const errors = result?.errors ?? [];
          return (
            <div key={index} className="space-y-1.5">
              <Label htmlFor={`sentence-${index}`}>Sentence {index + 1}</Label>
              <Textarea
                id={`sentence-${index}`}
                value={value}
                rows={2}
                onFocus={() => {
                  if (!startedAt.current[index]) startedAt.current[index] = Date.now();
                }}
                onChange={(event) => {
                  const next = [...values];
                  next[index] = event.target.value;
                  setValues(next);
                }}
                onPaste={blockClipboard}
                onCopy={blockClipboard}
                onCut={blockClipboard}
                onDrop={(event) => event.preventDefault()}
                placeholder={`Use "${data.challenge.word}" naturally…`}
              />

              {result && errors.length > 0 && (
                <AnnotatedSentence text={submitted[index] ?? value} errors={errors} />
              )}
              {result && (
                <p className={result.passed ? "text-success text-sm" : "text-destructive text-sm"}>
                  {result.passed ? `✓ Correct — ${result.overallScore}%` : `⚠️ ${result.overallScore}% — ${result.feedback}`}
                </p>
              )}
              {result?.suggestions?.length ? (
                <p className="text-muted-foreground text-xs">
                  Optional idea: {result.suggestions[0]}
                </p>
              ) : null}
            </div>
          );
        })}

        {prefix && (
          <div className="border-primary bg-primary/5 space-y-3 rounded-xl border-l-4 p-3">
            <p className="text-sm font-medium">
              Now create ONE new real English word using the prefix "{prefix}" and give its meaning.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prefix-word">New word</Label>
                <Input
                  id="prefix-word"
                  value={prefixWord}
                  onChange={(event) => setPrefixWord(event.target.value)}
                  onPaste={blockClipboard}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  placeholder={`${prefix}…`}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prefix-meaning">Its meaning</Label>
                <Input
                  id="prefix-meaning"
                  value={prefixWordMeaning}
                  onChange={(event) => setPrefixWordMeaning(event.target.value)}
                  onPaste={blockClipboard}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  placeholder="What does it mean?"
                  autoComplete="off"
                />
              </div>
            </div>
            {prefixResult && (
              <p
                className={prefixResult.passed ? "text-success text-sm" : "text-destructive text-sm"}
              >
                {prefixResult.passed ? "✓ Correct" : "⚠️"} {prefixResult.feedback}
              </p>
            )}
          </div>
        )}

        {summary && <p className="bg-secondary rounded-xl p-3 text-sm">{summary}</p>}
        <Button
          size="lg"
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending || values.some((v) => v.trim().length < 8) || prefixIncomplete
          }
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> AI is reviewing…
            </>
          ) : (
            "Submit sentences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- speak --------------------------------- */

function SpeakStep({ data, onDone }: { data: ChallengeData; onDone: () => void }) {
  const recorder = useRecorder();
  const analyze = useServerFn(analyzeSpeech);
  const [result, setResult] = useState<null | {
    transcript: string;
    targetWordDetected: boolean;
    overallScore: number;
    passed: boolean;
    feedback: string;
    pronunciationScore: number;
    grammarScore: number;
    usageScore: number;
    fluencyScore: number;
  }>(null);

  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error]);

  const mutation = useMutation({
    mutationFn: (audio: { base64: string; mimeType: string; durationSeconds: number }) =>
      analyze({
        data: {
          challengeId: data.challenge.id,
          audioBase64: audio.base64,
          mimeType: audio.mimeType,
          durationSeconds: audio.durationSeconds,
        },
      }),
    onSuccess: (value) => {
      setResult(value as never);
      if (value.passed) {
        toast.success(`Speaking passed with ${value.overallScore}%!`);
        onDone();
      } else {
        toast.error("Not quite — read the feedback and record again.");
      }
    },
    onError: (error: Error) => toast.error(error.message || "We couldn't analyze that recording."),
  });

  async function toggle() {
    if (recorder.recording) {
      const audio = await recorder.stop();
      if (audio) mutation.mutate(audio);
      return;
    }
    await recorder.start();
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Speak one sentence using "{data.challenge.word}"</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground text-sm">
          Press record, say a full sentence out loud, then stop. AI checks pronunciation, grammar,
          usage and fluency.
        </p>

        <div className="flex flex-col items-center gap-3 py-4">
          <Button
            size="lg"
            variant={recorder.recording ? "destructive" : "default"}
            className="size-20 rounded-full"
            onClick={toggle}
            disabled={mutation.isPending}
            aria-label={recorder.recording ? "Stop recording" : "Start recording"}
          >
            {recorder.recording ? (
              <Square className="size-7" aria-hidden />
            ) : (
              <Mic className="size-7" aria-hidden />
            )}
          </Button>
          <p className="text-muted-foreground text-sm">
            {mutation.isPending
              ? "Transcribing and scoring…"
              : recorder.recording
                ? `Recording… ${recorder.seconds}s`
                : "Tap to record"}
          </p>
        </div>

        {result && (
          <div className="space-y-3">
            <p className="bg-secondary rounded-xl p-3 text-sm italic">"{result.transcript}"</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ScoreBadge label="Pronunciation" value={result.pronunciationScore} />
              <ScoreBadge label="Grammar" value={result.grammarScore} />
              <ScoreBadge label="Usage" value={result.usageScore} />
              <ScoreBadge label="Fluency" value={result.fluencyScore} />
            </div>
            <p className="text-sm">
              {result.passed ? "✓ " : "⚠️ "}
              {result.feedback}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------- recall --------------------------------- */

function RecallStep({
  data,
  today,
  onDone,
}: {
  data: ChallengeData;
  today: string;
  onDone: () => void;
}) {
  const [meaning, setMeaning] = useState("");
  const submit = useServerFn(evaluateRecall);
  const [feedback, setFeedback] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => submit({ data: { challengeId: data.challenge.id, meaning: meaning.trim(), today } }),
    onSuccess: (result) => {
      setFeedback(result.feedback);
      if (result.passed) {
        toast.success("Challenge complete — streak earned! 🔥");
        onDone();
      } else {
        toast.error("Not quite right — try explaining it again.");
      }
    },
    onError: (error: Error) => toast.error(error.message || "Could not check your answer."),
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Recall from memory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Without scrolling back: write the meaning of "{data.challenge.word}" in your own words.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="meaning">Meaning</Label>
          <Textarea
            id="meaning"
            rows={3}
            value={meaning}
            onChange={(event) => setMeaning(event.target.value)}
            onPaste={blockClipboard}
            onCopy={blockClipboard}
            onCut={blockClipboard}
            placeholder="It means…"
            autoComplete="off"
          />
        </div>
        {feedback && <p className="bg-secondary rounded-xl p-3 text-sm">{feedback}</p>}
        <Button
          size="lg"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || meaning.trim().length < 3}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Checking…
            </>
          ) : (
            "Submit meaning"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}


/* -------------------------------- complete -------------------------------- */

function CompleteStep({ data }: { data: ChallengeData }) {
  return (
    <Card className="shadow-card mx-auto max-w-2xl text-center">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <CheckCircle2 className="text-success size-6" aria-hidden />
          Today's challenge is complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="font-display text-5xl font-bold">{data.challenge.overall_score}%</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <ScoreBadge label="Writing" value={data.challenge.writing_score} />
          <ScoreBadge label="Speaking" value={data.challenge.speaking_score} />
          <ScoreBadge label="Recall" value={data.challenge.recall_score} />
        </div>
        <p className="text-muted-foreground text-sm">
          You mastered "{data.challenge.word}". Come back tomorrow to keep your streak alive.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/history/$id" params={{ id: data.challenge.id }}>
              View details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
