import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { fetchRevision, submitRevision } from "@/lib/challenge.functions";
import { formatDay, localToday } from "@/lib/date";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/revision")({
  head: () => ({
    meta: [
      { title: "Revision — AI Vocabulary Streak" },
      { name: "description", content: "Spaced-repetition practice for words you've already learned." },
      { property: "og:title", content: "Revision — AI Vocabulary Streak" },
      { property: "og:description", content: "Revisit past words on a 3/7/16/30-day schedule." },
    ],
  }),
  component: RevisionPage,
});

function RevisionPage() {
  const today = localToday();
  const load = useServerFn(fetchRevision);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["revision", today],
    queryFn: () => load({ data: { today } }),
  });

  return (
    <AppShell title="Revision" subtitle="Words come back on day 3, 7, 16 and 30 until they stick.">
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <div className="space-y-6">
          {data.due.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-10 text-center">
                <RefreshCw className="text-muted-foreground mx-auto size-8" aria-hidden />
                <p className="mt-3 font-medium">Nothing due today</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Complete daily challenges and words will return here automatically.
                </p>
              </CardContent>
            </Card>
          ) : (
            data.due.map((item) => (
              <RevisionCard key={item.id} item={item} today={today} onDone={() => refetch()} />
            ))
          )}

          {data.upcoming.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Coming up</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {data.upcoming.map((item) => (
                  <p key={item.id} className="flex justify-between">
                    <span className="font-medium capitalize">{item.word}</span>
                    <span className="text-muted-foreground">
                      {formatDay(item.next_review_date)}
                    </span>
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevisionCard({ item, today, onDone }: { item: any; today: string; onDone: () => void }) {
  const [sentence, setSentence] = useState("");
  const [synonym, setSynonym] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const submit = useServerFn(submitRevision);

  const mutation = useMutation({
    mutationFn: () =>
      submit({ data: { itemId: item.id, sentence: sentence.trim(), synonym: synonym.trim(), today } }),
    onSuccess: (result) => {
      setFeedback(result.feedback);
      if (result.passed) {
        toast.success(`Nice — ${item.word} scheduled further out.`);
        onDone();
      } else {
        toast.error("We'll bring this word back tomorrow.");
        onDone();
      }
    },
    onError: (error: Error) => toast.error(error.message || "Could not submit revision."),
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="capitalize">{item.word}</span>
          <span className="text-muted-foreground text-sm font-normal">
            Review #{item.review_count + 1} · last score {item.last_score ?? "—"}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`sentence-${item.id}`}>Write a new sentence using it</Label>
          <Textarea
            id={`sentence-${item.id}`}
            rows={2}
            value={sentence}
            onChange={(event) => setSentence(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`synonym-${item.id}`}>One synonym</Label>
          <Input
            id={`synonym-${item.id}`}
            value={synonym}
            onChange={(event) => setSynonym(event.target.value)}
            autoComplete="off"
          />
        </div>
        {feedback && <p className="bg-secondary rounded-xl p-3 text-sm">{feedback}</p>}
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || sentence.trim().length < 8 || !synonym.trim()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Checking…
            </>
          ) : (
            "Submit revision"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
