import { AppShell } from "@/components/AppShell";
import { ScoreBadge, StatTile } from "@/components/ScoreBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOverview } from "@/lib/challenge.functions";
import { formatDay, localToday, shortWeekday } from "@/lib/date";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — AI Vocabulary Streak" },
      { name: "description", content: "Your writing, speaking and recall averages over time." },
      { property: "og:title", content: "Progress — AI Vocabulary Streak" },
      { property: "og:description", content: "Analytics for your daily vocabulary practice." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const today = localToday();
  const load = useServerFn(fetchOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["overview", today],
    queryFn: () => load({ data: { today } }),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Progress">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Progress" subtitle="How your skills are trending across the four stages.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Challenges completed" value={data.challengesCompleted} />
        <StatTile label="Words learned" value={data.wordsLearned} />
        <StatTile label="Words mastered" value={data.wordsMastered} />
        <StatTile label="Current streak" value={`🔥 ${data.streak.current_streak}`} accent />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreBadge label="Avg writing" value={data.averageWriting} className="bg-card shadow-card" />
        <ScoreBadge label="Avg speaking" value={data.averageSpeaking} className="bg-card shadow-card" />
        <ScoreBadge label="Avg recall" value={data.averageRecall} className="bg-card shadow-card" />
        <ScoreBadge label="Avg overall" value={data.averageScore} className="bg-card shadow-card" />
      </div>

      <Card className="shadow-card mt-6">
        <CardHeader>
          <CardTitle className="text-base">Last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            {data.weekly.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-muted-foreground text-xs">{day.score || ""}</span>
                <div className="bg-secondary flex h-32 w-full items-end rounded-lg">
                  <div
                    className="gradient-hero w-full rounded-lg"
                    style={{ height: `${day.score}%` }}
                    aria-hidden
                  />
                </div>
                <span className="text-muted-foreground text-xs">{shortWeekday(day.date)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recent challenges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.recent.length === 0 && (
            <p className="text-muted-foreground">No challenges completed yet.</p>
          )}
          {data.recent.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <span className="font-medium capitalize">{item.word}</span>
              <span className="text-muted-foreground">
                {formatDay(item.challenge_date)} · W {item.writing_score ?? "—"} · S{" "}
                {item.speaking_score ?? "—"} · R {item.recall_score ?? "—"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
