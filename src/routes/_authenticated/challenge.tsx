import { AppShell } from "@/components/AppShell";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SpeakingStep } from "@/components/SpeakingStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  advanceStage,
  evaluateCreatedWord,
  evaluateSentences,
  fetchTodayChallenge,
  finishLearningChallenge,
  proceedToWordTask,
  startTodayChallenge,
} from "@/lib/challenge.functions";
import { localToday } from "@/lib/date";
import {
  CHALLENGE_STEPS,
  passesLearningChallenge,
  SCORING_CONFIG,
  STEP_LABELS,
} from "@/lib/scoring";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2, CircleX, Flame, Loader2, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/challenge")({
  head: () => ({
    meta: [
      { title: "Daily Challenge — AI Vocabulary Streak" },
      {
        name: "description",
        content: "Learn today's word, write two sentences, and create a related English word.",
      },
      { property: "og:title", content: "Daily Challenge — AI Vocabulary Streak" },
      { property: "og:description", content: "Complete today's two-task vocabulary challenge." },
    ],
  }),
  component: ChallengePage,
});

type Stage = (typeof CHALLENGE_STEPS)[number];

function ChallengePage() {
  const today = localToday();
  const [selectedId, setSelectedId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();
  const load = useServerFn(fetchTodayChallenge);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["today", today, selectedId],
    queryFn: () => load({ data: { today, challengeId: selectedId } }),
  });
  useEffect(() => {
    if (!selectedId && data?.challenge.id) setSelectedId(data.challenge.id);
  }, [selectedId, data?.challenge.id]);

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

  if (error)
    return (
      <AppShell title="Today's Challenge">
        <p role="alert">{error.message}</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </AppShell>
    );

  const openWord = (id: string) => {
    setSelectedId(id);
    setAdding(false);
    invalidate();
  };
  if (!data || adding) {
    return (
      <AppShell title="Today's Challenge" subtitle="Pick the word you want to master today.">
        {data && (
          <Button variant="outline" onClick={() => setAdding(false)}>
            Return to my words
          </Button>
        )}
        <PickWord today={today} onStarted={openWord} />
      </AppShell>
    );
  }

  const rawStage = data.challenge.stage ?? "learn";
  const stage = (rawStage === "recall" ? "speak" : rawStage) as Stage;
  const index = CHALLENGE_STEPS.indexOf(stage);

  return (
    <AppShell
      title={data.challenge.word.toUpperCase()}
      subtitle={`Step ${Math.max(1, index + 1)} of ${CHALLENGE_STEPS.length} · ${STEP_LABELS[stage]}`}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {data.choices.map(
          (choice: { id: string; word: string; status: string; score: number | null }) => (
            <Button
              key={choice.id}
              variant={choice.id === data.challenge.id ? "default" : "outline"}
              onClick={() => setSelectedId(choice.id)}
            >
              {choice.word}
              {choice.status === "completed" ? ` · ${choice.score}%` : ""}
            </Button>
          ),
        )}
        <Button variant="outline" onClick={() => setAdding(true)}>
          Add more words
        </Button>
      </div>
      <div className="mb-6">
        <Progress
          value={(Math.max(index, 0) / (CHALLENGE_STEPS.length - 1)) * 100}
          aria-label="Challenge progress"
        />
        <ol className="text-muted-foreground mt-3 flex flex-wrap gap-4 text-xs font-semibold">
          {CHALLENGE_STEPS.map((step, i) => (
            <li key={step} className={i <= index ? "text-foreground" : undefined}>
              {i < index ? "✓ " : ""}
              {STEP_LABELS[step]}
            </li>
          ))}
        </ol>
      </div>

      {stage === "learn" && <LearnStep key={data.challenge.id} data={data} onNext={invalidate} />}
      {stage === "write" && <WriteStep key={data.challenge.id} data={data} onDone={invalidate} />}
      {stage === "pronounce" && (
        <SpeakingStep
          key={data.challenge.id}
          challengeId={data.challenge.id}
          word={data.challenge.word}
          initialAttempts={data.speechAttempts}
          onContinue={invalidate}
        />
      )}
      {stage === "speak" && (
        <WordCreationStep key={data.challenge.id} data={data} today={today} onDone={invalidate} />
      )}
      {stage === "complete" && <CompleteStep data={data} />}
    </AppShell>
  );
}

/* --------------------------------- step 0 --------------------------------- */

function PickWord({ today, onStarted }: { today: string; onStarted: (id: string) => void }) {
  const [word, setWord] = useState("");
  const [prepared, setPrepared] = useState<
    { word: string; challengeId?: string; error?: string }[]
  >([]);
  const start = useServerFn(startTodayChallenge);
  const mutation = useMutation({
    mutationFn: (value: string) => start({ data: { word: value, today } }),
    onSuccess: (response) => {
      setPrepared(response.results);
    },
    onError: (error: Error) => toast.error(error.message || "We couldn't start the challenge."),
  });

  const suggestions = ["meticulous", "resilient", "candid", "eloquent", "pragmatic", "tenacious"];

  return (
    <Card className="shadow-card mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="size-5 text-streak" aria-hidden />
          Choose your words
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
            <Label htmlFor="word">English words (up to 10, separated by commas)</Label>
            <Input
              id="word"
              value={word}
              disabled={mutation.isPending}
              onChange={(event) => setWord(event.target.value)}
              placeholder="e.g. tenacious, resilient, pragmatic"
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
                Check words <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </Button>
        </form>
        {mutation.error && (
          <p role="alert" className="text-destructive text-sm">
            {mutation.error.message}
          </p>
        )}
        <div aria-live="polite" className="space-y-3">
          {prepared.map((item) => (
            <div key={item.word} className="rounded-xl border p-3">
              <p className={item.error ? "text-destructive" : "text-success"}>
                {item.word}: {item.error ?? "Ready to learn"}
              </p>
              {item.challengeId && (
                <Button className="mt-2" onClick={() => onStarted(item.challengeId!)}>
                  Proceed <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
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

function WordPartCard({
  label,
  value,
  meaning,
  exampleWord,
  exampleMeaning,
  className,
}: {
  label: "Prefix" | "Root" | "Suffix";
  value: string | null | undefined;
  meaning: string | null | undefined;
  exampleWord: string | null | undefined;
  exampleMeaning: string | null | undefined;
  className: string;
}) {
  if (!value || !meaning) return null;
  return (
    <div className={`space-y-2 rounded-xl border-l-4 p-3 ${className}`}>
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
      <p className="text-base">
        <span className="font-display font-semibold">{value}</span> — {meaning}
      </p>
      {exampleWord && exampleMeaning && (
        <p>
          <span className="text-muted-foreground">Related real word: </span>
          <span className="font-medium">{exampleWord}</span> — {exampleMeaning}
        </p>
      )}
    </div>
  );
}

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
        <p>
          <span className="text-muted-foreground">Part of speech: </span>
          {word?.part_of_speech}
        </p>
        <p className="text-muted-foreground text-xs tracking-wide uppercase">Word breakdown</p>
        {!word?.prefix && !word?.root && !word?.suffix && (
          <p>
            No reusable word part could be verified in the dictionary. You can study this meaning,
            then use “Add more words” to choose a word for the word-part task.
          </p>
        )}
        <WordPartCard
          label="Prefix"
          value={word?.prefix}
          meaning={word?.prefix_meaning}
          exampleWord={word?.prefix_example_word}
          exampleMeaning={word?.prefix_example_meaning}
          className="border-primary bg-primary/5"
        />
        <WordPartCard
          label="Root"
          value={word?.root}
          meaning={word?.root_meaning}
          exampleWord={word?.root_example_word}
          exampleMeaning={word?.root_example_meaning}
          className="border-streak bg-streak/5"
        />
        <WordPartCard
          label="Suffix"
          value={word?.suffix}
          meaning={word?.suffix_meaning}
          exampleWord={word?.suffix_example_word}
          exampleMeaning={word?.suffix_example_meaning}
          className="border-accent bg-accent/10"
        />
        <p className="text-base">
          <span className="text-muted-foreground">Full meaning: </span>
          {word?.detailed_meaning || word?.simple_meaning}
        </p>
        <p>
          <span className="text-muted-foreground">Example: </span>
          <span className="italic">{word?.example}</span>
        </p>
        <DictionarySources
          urls={(word?.dictionary_sources ?? []).map((source: { url: string }) => source.url)}
        />
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
          Proceed <ArrowRight className="size-4" aria-hidden />
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
  const found = errors
    .map((error) => ({ error, index: text.indexOf(error.phrase) }))
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
            title={`Error: ${part.error.phrase}\nCorrection: ${part.error.correction}\n${part.error.explanation}`}
            className="group text-destructive relative cursor-help decoration-wavy decoration-2 underline-offset-4"
            style={{ textDecorationLine: "underline", textDecorationColor: "currentColor" }}
          >
            {part.text}
            <span className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden w-64 rounded-lg border p-2 text-xs shadow-lg group-hover:block group-focus:block">
              <strong>Error:</strong> “{part.error.phrase}”
              <br />
              <strong>Correction:</strong> {part.error.correction}
              <br />
              <strong>Why:</strong> {part.error.explanation}
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
  const [values, setValues] = useDraft<string[]>(`sentences:${data.challenge.id}`, () => {
    if (data.challenge.writing_result?.sentences) return data.challenge.writing_result.sentences;
    const previous = [...(data.sentences ?? [])]
      .slice(-count)
      .sort((a, b) => a.sentence_number - b.sentence_number);
    return Array.from({ length: count }, (_, index) => previous[index]?.sentence_text ?? "");
  });
  const startedAt = useRef<number[]>(Array.from({ length: count }, () => 0));
  const evaluate = useServerFn(evaluateSentences);
  const proceed = useServerFn(proceedToWordTask);
  const [submitted, setSubmitted] = useState<string[]>(
    data.challenge.writing_result?.sentences ?? [],
  );
  const [results, setResults] = useState<
    {
      sentenceNumber: number;
      overallScore: number;
      passed: boolean;
      correct: boolean;
      feedback: string;
      errors?: SentenceError[];
      suggestions?: string[];
    }[]
  >(data.challenge.writing_result?.results ?? []);
  const [summary, setSummary] = useState<string | null>(
    data.challenge.writing_result?.summary ?? null,
  );
  const [validationComplete, setValidationComplete] = useState(
    Boolean(data.challenge.writing_result),
  );

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
        },
      }),
    onSuccess: (result) => {
      setSubmitted(values.map((v) => v.trim()));
      setResults(result.results as never);
      setSummary(result.summary);
      setValidationComplete(true);
      toast.success(`Review complete — Task 1 scored ${result.overallScore}%.`);
    },
    onError: (error: Error) => toast.error(error.message || "Evaluation failed. Try again."),
  });

  const proceedMutation = useMutation({
    mutationFn: () => proceed({ data: { challengeId: data.challenge.id } }),
    onSuccess: onDone,
    onError: (error: Error) => toast.error(error.message || "Could not continue."),
  });

  const inputsComplete = values.every((value) => value.trim().length > 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>
          Write {count} original sentences using "{data.challenge.word}"
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Simple sentences are welcome. Only genuine grammar, spelling, punctuation, structure,
          usage, or meaning errors reduce the score.
        </p>
        {values.map((value, index) => {
          const result =
            value.trim() === submitted[index]
              ? results.find((r) => r.sentenceNumber === index + 1)
              : undefined;
          const errors = result?.errors ?? [];
          return (
            <div key={index} className="space-y-1.5">
              <Label htmlFor={`sentence-${index}`}>Sentence {index + 1}</Label>
              <Textarea
                id={`sentence-${index}`}
                value={value}
                disabled={mutation.isPending || proceedMutation.isPending}
                rows={2}
                onFocus={() => {
                  if (!startedAt.current[index]) startedAt.current[index] = Date.now();
                }}
                onChange={(event) => {
                  const next = [...values];
                  next[index] = event.target.value;
                  setValues(next);
                  setValidationComplete(false);
                  setResults([]);
                  setSummary(null);
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
                <p className={result.correct ? "text-success text-sm" : "text-destructive text-sm"}>
                  {result.correct
                    ? `✓ Correct — ${result.overallScore}%`
                    : `⚠️ ${result.overallScore}% — ${result.feedback}`}
                </p>
              )}
              {result?.suggestions?.length ? (
                <p className="text-muted-foreground text-xs">
                  Optional ideas: {result.suggestions.join(" ")}
                </p>
              ) : null}
            </div>
          );
        })}

        {summary && <p className="bg-secondary rounded-xl p-3 text-sm">{summary}</p>}
        {summary && (
          <DictionarySources
            urls={(data.word?.dictionary_sources ?? []).map(
              (source: { url: string }) => source.url,
            )}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || proceedMutation.isPending || !inputsComplete}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> AI is reviewing…
              </>
            ) : (
              "Check sentences"
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => proceedMutation.mutate()}
            disabled={
              !validationComplete ||
              values.some((value, index) => value.trim() !== submitted[index]) ||
              mutation.isPending ||
              proceedMutation.isPending
            }
          >
            {proceedMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <>
                Proceed <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ word creation ------------------------------ */

type WordPartOption = {
  type: "prefix" | "root" | "suffix";
  value: string;
  meaning: string;
};

type WordCreationResult = {
  isRealWord: boolean;
  usesSelectedPart: boolean;
  relationshipValid: boolean;
  meaningCorrect: boolean;
  passed: boolean;
  score: number;
  feedback: string;
  sources?: string[];
};

function WordCreationStep({
  data,
  today,
  onDone,
}: {
  data: ChallengeData;
  today: string;
  onDone: () => void;
}) {
  const word = data.word ?? {};
  const parts = (["prefix", "root", "suffix"] as const).flatMap((type) => {
    const value = word[type];
    const meaning = word[`${type}_meaning`];
    return value && meaning ? [{ type, value, meaning } as WordPartOption] : [];
  });
  const storedPart = parts.find(
    (part) =>
      part.type === data.challenge.created_word_part_type &&
      part.value === data.challenge.created_word_part,
  );
  const [selected, setSelected] = useDraft<WordPartOption | null>(
    `part:${data.challenge.id}`,
    () => storedPart ?? parts[0] ?? null,
  );
  const [createdWord, setCreatedWord] = useDraft<string>(
    `word:${data.challenge.id}`,
    () => data.challenge.created_word ?? "",
  );
  const [meaning, setMeaning] = useDraft<string>(
    `meaning:${data.challenge.id}`,
    () => data.challenge.created_word_meaning ?? "",
  );
  const [result, setResult] = useState<WordCreationResult | null>(() => {
    const stored = data.challenge.word_creation_result;
    return stored && typeof stored === "object" ? (stored as WordCreationResult) : null;
  });
  const [validationComplete, setValidationComplete] = useState(
    data.challenge.word_creation_score != null,
  );
  const fingerprint = JSON.stringify([
    selected?.type,
    selected?.value,
    createdWord.trim(),
    meaning.trim(),
  ]);
  const [validatedFingerprint, setValidatedFingerprint] = useState(
    JSON.stringify([
      data.challenge.created_word_part_type,
      data.challenge.created_word_part,
      data.challenge.created_word,
      data.challenge.created_word_meaning,
    ]),
  );
  const evaluate = useServerFn(evaluateCreatedWord);
  const finish = useServerFn(finishLearningChallenge);

  const clearValidation = () => {
    setResult(null);
    setValidationComplete(false);
  };

  const mutation = useMutation({
    mutationFn: () =>
      evaluate({
        data: {
          challengeId: data.challenge.id,
          partType: selected!.type,
          part: selected!.value,
          word: createdWord.trim(),
          meaning: meaning.trim(),
        },
      }),
    onSuccess: (value) => {
      setResult(value as WordCreationResult);
      setValidatedFingerprint(fingerprint);
      setValidationComplete(true);
      toast.success(`Review complete — Task 2 scored ${value.score}%.`);
    },
    onError: (error: Error) => toast.error(error.message || "Could not validate that word."),
  });

  const finishMutation = useMutation({
    mutationFn: () => finish({ data: { challengeId: data.challenge.id, today } }),
    onSuccess: onDone,
    onError: (error: Error) => toast.error(error.message || "Could not finish the challenge."),
  });

  const inputsComplete = Boolean(
    selected && createdWord.trim().length >= 2 && meaning.trim().length >= 3,
  );

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Task 2: Create one real English word</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Choose a genuine word part from “{data.challenge.word}”, then enter a different real
          English word using that same part and explain its meaning.
        </p>

        <div className="space-y-2">
          <Label>Word part</Label>
          <div className="flex flex-wrap gap-2">
            {parts.map((part) => (
              <Button
                key={`${part.type}-${part.value}`}
                type="button"
                disabled={mutation.isPending || finishMutation.isPending}
                size="sm"
                variant={selected?.type === part.type ? "default" : "outline"}
                onClick={() => {
                  setSelected(part);
                  clearValidation();
                }}
              >
                <span className="capitalize">{part.type}</span>: {part.value}
              </Button>
            ))}
          </div>
          {selected && (
            <p className="text-muted-foreground text-xs">
              {selected.value} — {selected.meaning}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="created-word">New real English word</Label>
            <Input
              id="created-word"
              disabled={mutation.isPending || finishMutation.isPending}
              value={createdWord}
              onChange={(event) => {
                setCreatedWord(event.target.value);
                clearValidation();
              }}
              onPaste={blockClipboard}
              onCopy={blockClipboard}
              onCut={blockClipboard}
              placeholder="Enter a different word"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="created-word-meaning">Its meaning</Label>
            <Input
              id="created-word-meaning"
              disabled={mutation.isPending || finishMutation.isPending}
              value={meaning}
              onChange={(event) => {
                setMeaning(event.target.value);
                clearValidation();
              }}
              onPaste={blockClipboard}
              onCopy={blockClipboard}
              onCut={blockClipboard}
              placeholder="What does it mean?"
              autoComplete="off"
            />
          </div>
        </div>

        {result && fingerprint === validatedFingerprint && (
          <div className="bg-secondary space-y-2 rounded-xl p-3 text-sm">
            <p
              className={
                result.passed ? "text-success font-medium" : "text-destructive font-medium"
              }
            >
              {result.passed ? "✓ Correct" : "⚠️ Not valid"} — {result.score}%
            </p>
            <p>{result.feedback}</p>
            <DictionarySources urls={result.sources ?? []} />
            <div className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-2">
              <span>{result.isRealWord ? "✓" : "✕"} Real English word</span>
              <span>{result.usesSelectedPart ? "✓" : "✕"} Uses the selected part</span>
              <span>{result.relationshipValid ? "✓" : "✕"} Linguistically valid relationship</span>
              <span>{result.meaningCorrect ? "✓" : "✕"} Meaning is correct</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            onClick={() => mutation.mutate()}
            disabled={!inputsComplete || mutation.isPending || finishMutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> AI is validating…
              </>
            ) : (
              "Validate word"
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => finishMutation.mutate()}
            disabled={
              !validationComplete ||
              fingerprint !== validatedFingerprint ||
              mutation.isPending ||
              finishMutation.isPending
            }
          >
            {finishMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <>
                Proceed <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- complete -------------------------------- */

function CompleteStep({ data }: { data: ChallengeData }) {
  const overallScore = data.challenge.overall_score ?? 0;
  const passed = passesLearningChallenge(overallScore);

  return (
    <Card className="shadow-card mx-auto max-w-2xl text-center">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          {passed ? (
            <CheckCircle2 className="text-success size-6" aria-hidden />
          ) : (
            <CircleX className="text-destructive size-6" aria-hidden />
          )}
          {passed ? "Challenge passed" : "Challenge complete — not passed"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="font-display text-5xl font-bold">{overallScore}%</p>
        <p className={passed ? "text-success font-medium" : "text-destructive font-medium"}>
          {passed
            ? `Pass — you reached the ${SCORING_CONFIG.passScore}% pass mark.`
            : `A score of ${SCORING_CONFIG.passScore}% is required to pass.`}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreBadge label="Task 1 · Sentences" value={data.challenge.writing_score} />
          <ScoreBadge label="Task 2 · New word" value={data.challenge.word_creation_score} />
        </div>
        <p className="text-muted-foreground text-sm">
          {passed
            ? `You passed the challenge for “${data.challenge.word}”. Choose another word or add more words to keep practising.`
            : `You completed both tasks for “${data.challenge.word}”. Review the feedback and keep practising.`}
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
        {data.challenge.writing_result && (
          <div className="space-y-3 text-left">
            <p className="font-medium">Sentence results</p>
            {data.challenge.writing_result.results.map(
              (
                row: { sentenceNumber: number; errors: SentenceError[]; feedback: string },
                i: number,
              ) => (
                <div key={row.sentenceNumber}>
                  <AnnotatedSentence
                    text={data.challenge.writing_result.sentences[i]}
                    errors={row.errors}
                  />
                  <p>{row.feedback}</p>
                </div>
              ),
            )}
          </div>
        )}
        {data.challenge.word_creation_result && (
          <p>
            {data.challenge.created_word}: {data.challenge.word_creation_result.feedback}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DictionarySources({ urls }: { urls: string[] }) {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
      {[...new Set(urls)]
        .filter((url) => url.startsWith("https://en.wiktionary.org/wiki/"))
        .map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="underline">
            Wiktionary: {decodeURIComponent(url.split("/wiki/")[1]!.split("#")[0]!)}
          </a>
        ))}
      {urls.length > 0 && <span>Definitions and etymology · CC BY-SA</span>}
    </div>
  );
}

function useDraft<T>(key: string, initial: () => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved =
        typeof window !== "undefined" ? sessionStorage.getItem(`learning:${key}`) : null;
      return saved ? (JSON.parse(saved) as T) : initial();
    } catch {
      return initial();
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(`learning:${key}`, JSON.stringify(value));
    } catch {
      /* Storage may be disabled. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
