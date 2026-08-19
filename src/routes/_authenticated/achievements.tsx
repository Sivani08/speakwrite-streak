import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAchievements } from "@/lib/challenge.functions";
import { formatDay, localToday } from "@/lib/date";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — AI Vocabulary Streak" },
      { name: "description", content: "Badges you've earned for streaks, mastery and consistency." },
      { property: "og:title", content: "Achievements — AI Vocabulary Streak" },
      { property: "og:description", content: "Track your vocabulary badges and progress." },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const today = localToday();
  const load = useServerFn(fetchAchievements);
  const { data, isLoading } = useQuery({
    queryKey: ["achievements", today],
    queryFn: () => load({ data: { today } }),
  });

  const earned = (data ?? []).filter((item) => item.earned_at).length;

  return (
    <AppShell
      title="Achievements"
      subtitle={isLoading ? "Loading your badges…" : `${earned} of ${data?.length ?? 0} badges earned`}
    >
      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((badge) => {
            const unlocked = Boolean(badge.earned_at);
            return (
              <Card
                key={badge.id}
                className={unlocked ? "shadow-card border-streak/40" : "shadow-card opacity-70"}
              >
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl" aria-hidden>
                      {badge.icon}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {unlocked ? formatDay(String(badge.earned_at).slice(0, 10)) : "Locked"}
                    </span>
                  </div>
                  <p className="font-display text-lg font-semibold">{badge.name}</p>
                  <p className="text-muted-foreground text-sm">{badge.description}</p>
                  <Progress
                    value={(badge.progress / badge.criteria_value) * 100}
                    aria-label={`${badge.name} progress`}
                  />
                  <p className="text-muted-foreground text-xs">
                    {badge.progress} / {badge.criteria_value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
