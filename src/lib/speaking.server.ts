import type { SupabaseClient } from "@supabase/supabase-js";
import { containsTarget, PRONUNCIATION_PASS_THRESHOLD } from "./pronunciation";
import { pronunciationProvider, speakingAdmin } from "./pronunciation.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Context = { supabase: SupabaseClient<any>; userId: string };
async function owned(ctx: Context, id: string) {
  const { data, error } = await ctx.supabase
    .from("daily_challenges")
    .select("*")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .single();
  if (error || !data) throw new Error("That challenge could not be found.");
  return data;
}
export async function assessSpeaking(
  ctx: Context,
  input: { challengeId: string; sentence: string; audioBase64: string; attemptId: string },
) {
  const challenge = await owned(ctx, input.challengeId);
  if (challenge.stage !== "pronounce" || challenge.status !== "in_progress")
    throw new Error("That challenge is not ready for speaking practice.");
  const sentence = input.sentence.trim();
  if (!sentence || !containsTarget(sentence, challenge.word))
    throw new Error("Please use today's word in your sentence.");
  const admin = speakingAdmin();
  const { data: existing, error: lookupError } = await admin
    .from("speech_submissions")
    .select("*")
    .eq("id", input.attemptId)
    .eq("user_id", ctx.userId)
    .eq("challenge_id", challenge.id)
    .maybeSingle();
  if (lookupError) throw new Error("We couldn't load your attempts. Please retry.");
  if (existing) return existing;
  const assessment = await pronunciationProvider.assess({
    audioBase64: input.audioBase64,
    sentence,
    word: challenge.word,
  });
  const { data, error } = await admin.rpc("record_pronunciation_attempt", {
    p_id: input.attemptId,
    p_user: ctx.userId,
    p_challenge: challenge.id,
    p_sentence: sentence,
    p_transcript: assessment.transcript,
    p_detected: assessment.targetWordDetected,
    p_score: Math.floor(assessment.pronunciationScore),
    p_feedback: assessment.feedback,
    p_threshold: PRONUNCIATION_PASS_THRESHOLD,
  });
  if (error || !data)
    throw new Error(
      "We couldn't save the speaking result. Retry Analyze to save this attempt; your recording is unchanged.",
    );
  return data;
}
export async function proceedSpeaking(ctx: Context, id: string) {
  const challenge = await owned(ctx, id);
  if (challenge.stage !== "pronounce" || challenge.status !== "in_progress")
    throw new Error("That challenge is not on the speaking step.");
  const { data: pass, error } = await ctx.supabase
    .from("speech_submissions")
    .select("id")
    .eq("challenge_id", id)
    .eq("user_id", ctx.userId)
    .eq("assessment_provider", "azure")
    .eq("passed", true)
    .gte("pronunciation_score", PRONUNCIATION_PASS_THRESHOLD)
    .eq("target_word_detected", true)
    .limit(1);
  if (error || !pass?.length)
    throw new Error("Pass the pronunciation assessment before continuing.");
  const { data, error: saveError } = await ctx.supabase
    .from("daily_challenges")
    .update({ stage: "speak" })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .eq("stage", "pronounce")
    .eq("status", "in_progress")
    .select("id")
    .single();
  if (saveError || !data) throw new Error("We couldn't save your progress. Please retry Continue.");
  return { ok: true };
}
