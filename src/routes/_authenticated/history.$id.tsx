import { AppShell } from "@/components/AppShell";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChallengeDetail } from "@/lib/challenge.functions";
import { formatDay } from "@/lib/date";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/history/$id")({
  head: () => ({
    meta: [
      { title: "Word details — AI Vocabulary Streak" },
      { name: "description", content: "The full record of one daily challenge: word, sentences, speech and recall." },
      { property: "og:title", content: "Word details — AI Vocabulary Streak" },
      { property: "og:description", content: "Review one completed vocabulary challenge in detail." },
    ],
  }),
  component: WordDetails,
});

function WordDetails() {
  const { id } = Route.useParams();
  const load = useServerFn(fetchChallengeDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["challenge", id],
    queryFn: () => load({ data: { id } }),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Word details">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AppShell>
    );
  }

  const { challenge, sentences, speech, recall } = data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const word = (challenge as any).vocabulary_words;

  return (
    <AppShell
      title={challenge.word.toUpperCase()}
      subtitle={`${formatDay(challenge.challenge_date)} · ${challenge.status === "completed" ? "Completed" : "In progress"}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreBadge label="Writing" value={challenge.writing_score} className="bg-card shadow-card" />
        <ScoreBadge label="Speaking" value={challenge.speaking_score} className="bg-card shadow-card" />
        <ScoreBadge label="Recall" value={challenge.recall_score} className="bg-card shadow-card" />
        <ScoreBadge label="Overall" value={challenge.overall_score} className="bg-card shadow-card" />
      </div>

      {word && (
        <Card className="shadow-card mt-6">
          <CardHeader>
            <CardTitle className="text-base">Word card</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Pronunciation:</span> {word.pronunciation}
            </p>
            <p>
              <span className="text-muted-foreground">Part of speech:</span> {word.part_of_speech}
            </p>
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Meaning:</span> {word.simple_meaning}
            </p>
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Example:</span> {word.example}
            </p>
            <p>
              <span className="text-muted-foreground">Synonyms:</span>{" "}
              {(word.synonyms ?? []).join(", ")}
            </p>
            <p>
              <span className="text-muted-foreground">Antonyms:</span>{" "}
              {(word.antonyms ?? []).join(", ")}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card mt-6">
        <CardHeader>
          <CardTitle className="text-base">Sentences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sentences.length === 0 && <p className="text-muted-foreground text-sm">No sentences yet.</p>}
          {sentences.map((sentence) => (
            <div key={sentence.id} className="rounded-xl border p-3 text-sm">
              <p className="font-medium">
                Sentence {sentence.sentence_number} — {sentence.score}%{" "}
                {sentence.passed ? "✓" : "⚠️"}
              </p>
              <p className="mt-1">{sentence.sentence_text}</p>
              {sentence.feedback && (
                <p className="text-muted-foreground mt-1">{sentence.feedback}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Speaking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {speech ? (
              <>
                <p className="italic">"{speech.transcript}"</p>
                <p>Target word: {speech.target_word_detected ? "✓ Detected" : "Not detected"}</p>
                <p>
                  Estimated pronunciation {speech.pronunciation_score}% · Grammar{" "}
                  {speech.grammar_score}% · Usage {speech.usage_score}% · Fluency{" "}
                  {speech.fluency_score}%
                </p>
                {speech.feedback && <p className="text-muted-foreground">{speech.feedback}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">No speech submission yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Recall</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recall ? (
              <>
                <p>
                  Synonym: {recall.synonym} {recall.synonym_correct ? "✓" : "✗"}
                </p>
                <p>
                  Antonym: {recall.antonym} {recall.antonym_correct ? "✓" : "✗"}
                </p>
                {recall.feedback && <p className="text-muted-foreground">{recall.feedback}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">No recall submission yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
