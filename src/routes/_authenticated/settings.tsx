import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { fetchOverview, saveProfile } from "@/lib/challenge.functions";
import { localToday } from "@/lib/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Vocabulary Streak" },
      { name: "description", content: "Theme, reminders and account controls for your learning app." },
      { property: "og:title", content: "Settings — AI Vocabulary Streak" },
      { property: "og:description", content: "Control your theme and daily reminders." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const today = localToday();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const load = useServerFn(fetchOverview);
  const save = useServerFn(saveProfile);
  const { data } = useQuery({
    queryKey: ["overview", today],
    queryFn: () => load({ data: { today } }),
  });

  const [dark, setDark] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (data?.profile) {
      setDark(data.profile.theme === "dark");
      setNotifications(data.profile.notifications_enabled ?? true);
    }
  }, [data?.profile]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const mutation = useMutation({
    mutationFn: (input: { theme: string; notificationsEnabled: boolean }) => save({ data: input }),
    onSuccess: () => {
      toast.success("Settings saved.");
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not save settings."),
  });

  return (
    <AppShell title="Settings" subtitle="Personalize how the app looks and reminds you.">
      <Card className="shadow-card max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="theme">Dark mode</Label>
              <p className="text-muted-foreground text-sm">Easier on the eyes at night.</p>
            </div>
            <Switch
              id="theme"
              checked={dark}
              onCheckedChange={(value) => {
                setDark(value);
                mutation.mutate({
                  theme: value ? "dark" : "light",
                  notificationsEnabled: notifications,
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="notifications">Daily reminder</Label>
              <p className="text-muted-foreground text-sm">
                Nudge me to complete today's challenge.
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notifications}
              onCheckedChange={(value) => {
                setNotifications(value);
                mutation.mutate({ theme: dark ? "dark" : "light", notificationsEnabled: value });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card mt-6 max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              queryClient.clear();
              navigate({ to: "/auth", search: { mode: "login" } });
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
