import { AppShell } from "@/components/AppShell";
import { StatTile } from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOverview, saveProfile } from "@/lib/challenge.functions";
import { localTimezone, localToday } from "@/lib/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AI Vocabulary Streak" },
      { name: "description", content: "Your account details and lifetime learning stats." },
      { property: "og:title", content: "Profile — AI Vocabulary Streak" },
      { property: "og:description", content: "Manage your name, timezone and learning stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const today = localToday();
  const queryClient = useQueryClient();
  const load = useServerFn(fetchOverview);
  const save = useServerFn(saveProfile);
  const { data, isLoading } = useQuery({
    queryKey: ["overview", today],
    queryFn: () => load({ data: { today } }),
  });

  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState(localTimezone());

  useEffect(() => {
    if (data?.profile) {
      setFullName(data.profile.full_name ?? "");
      setTimezone(data.profile.timezone ?? localTimezone());
    }
  }, [data?.profile]);

  const mutation = useMutation({
    mutationFn: () => save({ data: { fullName, timezone } }),
    onSuccess: () => {
      toast.success("Profile saved.");
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not save your profile."),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Profile">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Profile" subtitle="Your account and lifetime learning stats.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Current streak" value={`🔥 ${data.streak.current_streak}`} accent />
        <StatTile label="Longest streak" value={`🔥 ${data.streak.longest_streak}`} />
        <StatTile label="Words learned" value={data.wordsLearned} />
        <StatTile label="Average score" value={`${data.averageScore}%`} />
      </div>

      <Card className="shadow-card mt-6 max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={data.profile?.email ?? ""} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone (used for streak days)</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
