import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchHistory } from "@/lib/challenge.functions";
import { formatDay } from "@/lib/date";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "My Vocabulary — AI Vocabulary Streak" },
      { name: "description", content: "Every word you've learned, with your writing, speaking and recall scores." },
      { property: "og:title", content: "My Vocabulary — AI Vocabulary Streak" },
      { property: "og:description", content: "Browse and search your vocabulary history." },
    ],
  }),
  component: History,
});

function History() {
  const load = useServerFn(fetchHistory);
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: () => load() });
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);

  const rows = useMemo(() => {
    const items = (data ?? []).filter((item) => {
      if (search && !item.word.toLowerCase().includes(search.toLowerCase())) return false;
      if (minScore && (item.overall_score ?? 0) < Number(minScore)) return false;
      return true;
    });
    return items.sort((a, b) =>
      newestFirst
        ? b.challenge_date.localeCompare(a.challenge_date)
        : a.challenge_date.localeCompare(b.challenge_date),
    );
  }, [data, search, minScore, newestFirst]);

  return (
    <AppShell title="My Vocabulary" subtitle="Every word you've practiced and how you scored.">
      <Card className="shadow-card">
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="search">Search word</Label>
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. meticulous"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minScore">Minimum score</Label>
              <Input
                id="minScore"
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => setNewestFirst((value) => !value)}>
                Sort: {newestFirst ? "Newest first" : "Oldest first"}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No words match yet. Complete a daily challenge to fill this in.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Word</TableHead>
                    <TableHead>Writing</TableHead>
                    <TableHead>Speaking</TableHead>
                    <TableHead>Recall</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDay(row.challenge_date)}</TableCell>
                      <TableCell className="font-medium capitalize">
                        <Link to="/history/$id" params={{ id: row.id }} className="hover:underline">
                          {row.word}
                        </Link>
                      </TableCell>
                      <TableCell>{row.writing_score ?? "—"}</TableCell>
                      <TableCell>{row.speaking_score ?? "—"}</TableCell>
                      <TableCell>{row.recall_score ?? "—"}</TableCell>
                      <TableCell>{row.overall_score ?? "—"}</TableCell>
                      <TableCell className="capitalize">
                        {row.status === "completed" ? "Completed" : "In progress"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
