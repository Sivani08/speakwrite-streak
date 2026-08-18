import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Mic, PenLine, Brain, BookOpen, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Vocabulary Streak — One Word a Day" },
      {
        name: "description",
        content:
          "Learn a new English word every day, write three sentences, speak it aloud and recall it. AI scores you and your streak grows.",
      },
      { property: "og:title", content: "AI Vocabulary Streak — One Word a Day" },
      {
        property: "og:description",
        content: "Learn it. Write it. Speak it. Remember it. Build your daily streak.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    number: "01",
    title: "Learn",
    body: "Understand a new word with AI — meaning, pronunciation and real usage.",
    icon: BookOpen,
  },
  {
    number: "02",
    title: "Write",
    body: "Create 3 original sentences. AI grades grammar, context and naturalness.",
    icon: PenLine,
  },
  {
    number: "03",
    title: "Speak",
    body: "Use the word in your own spoken sentence and get speech feedback.",
    icon: Mic,
  },
  {
    number: "04",
    title: "Recall",
    body: "Give a synonym and an antonym. Semantic checking accepts real alternatives.",
    icon: Brain,
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <Flame className="size-5 text-streak" aria-hidden />
          AI Vocabulary Streak
        </span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Sign up
            </Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-10 pb-16 md:pt-16">
        <div className="gradient-hero shadow-lift relative overflow-hidden rounded-3xl px-6 py-14 text-center md:px-16 md:py-20">
          <p className="text-primary-foreground/80 text-sm font-medium tracking-widest uppercase">
            Don't just learn a word. Prove you can use it.
          </p>
          <h1 className="text-primary-foreground mx-auto mt-5 max-w-3xl text-4xl leading-tight font-extrabold md:text-6xl">
            One Word a Day. Build Better Communication.
          </h1>
          <p className="text-primary-foreground/85 mx-auto mt-5 max-w-xl text-lg">
            Learn it. Write it. Speak it. Remember it.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start Your Streak
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground w-full bg-transparent sm:w-auto"
            >
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-10 px-5 pb-16">
        <h2 className="text-center text-3xl font-bold md:text-4xl">The daily cycle</h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-center">
          Four active stages. No passive reading, no dictionary scrolling.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <Card key={step.number} className="shadow-card gap-3 p-6">
              <div className="bg-secondary text-secondary-foreground flex size-10 items-center justify-center rounded-xl">
                <step.icon className="size-5" aria-hidden />
              </div>
              <p className="text-muted-foreground font-display text-sm font-semibold">
                {step.number} — {step.title}
              </p>
              <p className="text-sm leading-relaxed">{step.body}</p>
            </Card>
          ))}
        </div>

        <Card className="shadow-card mt-10 items-center gap-4 p-8 text-center">
          <span className="gradient-streak text-streak-foreground inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
            <Flame className="size-4" aria-hidden /> Complete the challenge → Earn your streak
          </span>
          <h3 className="text-2xl font-bold">
            LEARN → WRITE → SPEAK → RECALL → SCORE → STREAK
          </h3>
          <p className="text-muted-foreground max-w-xl text-sm">
            Your streak grows only when you finish every stage — writing, speaking and recall. Retries
            are always free, so keep going until it clicks.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start Your Streak
            </Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t py-8 text-center">
        <p className="text-muted-foreground text-sm">
          AI Vocabulary Streak — learn, write, speak, recall.
        </p>
      </footer>
    </main>
  );
}
