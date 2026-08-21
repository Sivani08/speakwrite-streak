import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dateInput = z.object({ today: z.string() });

export const fetchOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => dateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getOverview } = await import("./challenge.server");
    return getOverview(context, data.today);
  });

export const fetchTodayChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => dateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getTodayChallenge } = await import("./challenge.server");
    return getTodayChallenge(context, data.today);
  });

export const startTodayChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ word: z.string().min(1).max(40), today: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { startChallenge } = await import("./challenge.server");
    return startChallenge(context, data);
  });

export const advanceStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challengeId: z.string().uuid(),
        stage: z.enum(["learn", "write", "speak", "recall", "complete"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { setStage } = await import("./challenge.server");
    return setStage(context, data);
  });

export const evaluateSentences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challengeId: z.string().uuid(),
        sentences: z
          .array(z.object({ text: z.string().min(1).max(400), typingDurationMs: z.number() }))
          .length(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitSentences } = await import("./challenge.server");
    return submitSentences(context, data);
  });

export const analyzeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challengeId: z.string().uuid(),
        audioBase64: z.string().min(100).max(12_000_000),
        mimeType: z.string().max(60),
        durationSeconds: z.number().min(0).max(180),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitSpeech } = await import("./challenge.server");
    return submitSpeech(context, data);
  });

export const evaluateRecall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challengeId: z.string().uuid(),
        meaning: z.string().min(3).max(300),

        today: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitRecall } = await import("./challenge.server");
    return submitRecall(context, data);
  });

export const fetchHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getHistory } = await import("./challenge.server");
    return getHistory(context);
  });

export const fetchChallengeDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getChallengeDetail } = await import("./challenge.server");
    return getChallengeDetail(context, data.id);
  });

export const fetchAchievements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => dateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getAchievements } = await import("./challenge.server");
    return getAchievements(context, data.today);
  });

export const fetchRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => dateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getRevision } = await import("./challenge.server");
    return getRevision(context, data.today);
  });

export const submitRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        sentence: z.string().min(8).max(400),
        synonym: z.string().min(1).max(60),
        today: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitRevisionReview } = await import("./challenge.server");
    return submitRevisionReview(context, data);
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().max(80).optional(),
        timezone: z.string().max(64).optional(),
        theme: z.string().max(10).optional(),
        notificationsEnabled: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { updateProfile } = await import("./challenge.server");
    return updateProfile(context, data);
  });
