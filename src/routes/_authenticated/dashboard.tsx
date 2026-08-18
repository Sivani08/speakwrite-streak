import { AppShell } from "@/components/AppShell";
import { StatTile } from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOverview } from "@/lib/challenge.functions";
import { formatDay, localToday, shortWeekday } from "@/lib/date";
import { CHALLENGE_STEPS, STEP_LABELS } from "@/lib/scoring";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Vocabulary Streak" },
      { name: "description", content: "Your streak, today's word and your daily vocabulary progress." },
      { property: "og:title", content: "Dashboard — AI Vocabulary Streak" },
      { property: "og:description", content: "Track your streak and today's challenge progress." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const today = localToday();
  const load = useServerFn(fetchOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["overview", today],
    queryFn: () => load({ data: { today } }),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Dashboard">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  const challenge = data.todayChallenge;
  const stageIndex = challenge ? CHALLENGE_STEPS.indexOf(challenge.stage as never) : -1;
  const stagesDone = challenge ? Math.max(0, Math.min(4, stageIndex)) : 0;
  const completed = challenge?.status === "completed";

  return (
    <AppShell
      title={`Hi ${data.profile?.full_name?.split(" ")[0] || "there"} 👋`}
      subtitle="One word a day. Learn it, write it, speak it, remember it."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Current streak" value={`🔥 ${data.streak.current_streak} days`} accent />
        <StatTile label="Longest streak" value={`🔥 ${data.streak.longest_streak} days`} />
        <StatTile label="Words learned" value={data.wordsLearned} />
        <StatTile
          label="Words mastered"
          value={data.wordsMastered}
          hint={`Average score ${data.averageScore}%`}
        />
      </div>

      <Card className="shadow-card mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="size-5 text-streak" aria-hidden />
            {completed ? "Today's challenge is complete" : "Today's challenge"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Today's word</p>
              <p className="font-display text-3xl font-bold">
                {challenge ? challenge.word.toUpperCase() : "Not chosen yet"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Today's progress</p>
              <p className="font-display text-3xl font-bold">{stagesDone} / 4</p>
            </div>
            {completed && (
              <div className="text-right">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">Today's score</p>
                <p className="font-display text-3xl font-bold">{challenge?.overall_score}%</p>
              </div>
            )}
          </div>

          <div>
            <Progress value={(stagesDone / 4) * 100} aria-label="Today's challenge progress" />
            <ul className="text-muted-foreground mt-3 flex flex-wrap gap-3 text-xs font-medium">
              {CHALLENGE_STEPS.map((step, index) => (
                <li
                  key={step}
                  className={index <= stagesDone && challenge ? "text-foreground" : undefined}
                >
                  {index + 1} {STEP_LABELS[step]}
                </li>
              ))}
            </ul>
          </div>

          <ul className="text-muted-foreground grid gap-1 text-sm">
            <li>🎯 Learn 1 word</li>
            <li>✍️ Write 3 sentences</li>
            <li>🎙 Speak 1 sentence</li>
            <li>🧠 Recall 2 relationships</li>
            <li>🔥 Earn today's streak</li>
          </ul>

          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/challenge">
              {completed
                ? "Review today's challenge"
                : challenge
                  ? "Continue Today's Challenge"
                  : "Start Today's Challenge"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Weekly activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2">
              {data.weekly.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="bg-secondary flex h-24 w-full items-end rounded-lg">
                    <div
                      className={day.completed ? "gradient-streak w-full rounded-lg" : "w-full"}
                      style={{ height: `${Math.max(day.score, day.completed ? 12 : 0)}%` }}
                      aria-hidden
                    />
                  </div>
                  <span className="text-muted-foreground text-xs">{shortWeekday(day.date)}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Bars show your daily overall score for the last 7 days.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Recent words</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent.length === 0 && (
              <p className="text-muted-foreground text-sm">No words yet — start today's challenge.</p>
            )}
            {data.recent.map((item) => (
              <Link
                key={item.id}
                to="/history/$id"
                params={{ id: item.id }}
                className="hover:bg-secondary flex items-center justify-between rounded-lg px-2 py-1.5 text-sm"
              >
                <span className="font-medium capitalize">{item.word}</span>
                <span className="text-muted-foreground">
                  {formatDay(item.challenge_date)} · {item.overall_score ?? "—"}%
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Revision & badges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Due for revision</p>
              {data.revisionDue.length === 0 ? (
                <p className="text-muted-foreground mt-1 text-sm">Nothing due right now.</p>
              ) : (
                <p className="mt-1 text-sm capitalize">
                  {data.revisionDue.map((item) => item.word).join(", ")}
                </p>
              )}
              <Button asChild variant="link" className="h-auto p-0 text-sm">
                <Link to="/revision">Open revision</Link>
              </Button>
            </div>
            <div>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Recent achievements</p>
              {data.achievements.length === 0 ? (
                <p className="text-muted-foreground mt-1 text-sm">Complete a challenge to earn your first badge.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {data.achievements.slice(0, 3).map((item, index) => (
                    <li key={index}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(item as any).achievements?.icon} {(item as any).achievements?.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
