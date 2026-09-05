import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO calendar date.");
const dateInput = z.object({ today: isoDate });

export const analyzePronunciation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challengeId: z.string().uuid(),
        attemptId: z.string().uuid(),
        sentence: z.string().trim().min(1).max(400),
        audioBase64: z.string().min(1).max(1_300_000),
        mimeType: z.literal("audio/wav"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assessSpeaking } = await import("./speaking.server");
    return assessSpeaking(context, data);
  });

export const continueSpeaking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ challengeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { proceedSpeaking } = await import("./speaking.server");
    return proceedSpeaking(context, data.challengeId);
  });

export const fetchOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => dateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getOverview } = await import("./challenge.server");
    return getOverview(context, data.today);
  });

export const fetchTodayChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    dateInput.extend({ challengeId: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getTodayChallenge } = await import("./challenge.server");
    return getTodayChallenge(context, data.today, data.challengeId);
  });

export const startTodayChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ word: z.string().min(1).max(600), today: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { startWords } = await import("./challenge.server");
    return startWords(context, data);
  });

export const advanceStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challengeId: z.string().uuid(),
        stage: z.literal("write"),
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
          .array(
            z.object({
              text: z.string().min(1).max(400),
              typingDurationMs: z.number().finite().min(0).max(86_400_000),
            }),
          )
          .length(2),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitSentences } = await import("./challenge.server");
    return submitSentences(context, data);
  });

export const proceedToWordTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ challengeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { advanceToWordTask } = await import("./challenge.server");
    return advanceToWordTask(context, data.challengeId);
  });

export const evaluateCreatedWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challengeId: z.string().uuid(),
        partType: z.enum(["prefix", "root", "suffix"]),
        part: z.string().min(1).max(60),
        word: z.string().min(2).max(60),
        meaning: z.string().min(3).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitCreatedWord } = await import("./challenge.server");
    return submitCreatedWord(context, data);
  });

export const finishLearningChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ challengeId: z.string().uuid(), today: isoDate }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { finishChallenge } = await import("./challenge.server");
    return finishChallenge(context, data);
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
