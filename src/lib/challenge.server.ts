import type { SupabaseClient } from "@supabase/supabase-js";

import {
  analyzeWordWithAI,
  evaluateRecallWithAI,
  evaluateMeaningWithAI,
  evaluateSentencesWithAI,
  evaluateSpeechWithAI,
  evaluateWordCreationWithAI,
  transcribeAudio,
} from "./ai.server";
import {
  learningChallengeScore,
  overallDailyScore,
  passesLearningChallenge,
  SCORING_CONFIG,
} from "./scoring";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, "public", any>;

type Ctx = { supabase: DB; userId: string };

function fail(message: string): never {
  throw new Error(message);
}

function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("Invalid date.");
  return date;
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function normalizeScore(value: unknown) {
  const n = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(100, n));
}

type WordPartType = "prefix" | "root" | "suffix";
type WordPart = { type: WordPartType; value: string; meaning: string };

function availableWordParts(word: Record<string, unknown>): WordPart[] {
  return (["prefix", "root", "suffix"] as const).flatMap((type) => {
    const value = word[type];
    const meaning = word[`${type}_meaning`];
    return typeof value === "string" &&
      value.trim() &&
      typeof meaning === "string" &&
      meaning.trim()
      ? [{ type, value: value.trim(), meaning: meaning.trim() }]
      : [];
  });
}

function analysisFields(analysis: Awaited<ReturnType<typeof analyzeWordWithAI>>) {
  const complete = (part: "prefix" | "root" | "suffix") => {
    const value = analysis[part];
    const meaning = analysis[`${part}Meaning`];
    const exampleWord = analysis[`${part}ExampleWord`];
    const exampleMeaning = analysis[`${part}ExampleMeaning`];
    return value && meaning && exampleWord && exampleMeaning
      ? { value, meaning, exampleWord, exampleMeaning }
      : null;
  };
  const prefix = complete("prefix");
  const root = complete("root");
  const suffix = complete("suffix");

  return {
    pronunciation: analysis.pronunciation,
    part_of_speech: analysis.partOfSpeech,
    simple_meaning: analysis.simpleMeaning,
    detailed_meaning: analysis.detailedMeaning,
    breakdown_available: Boolean(prefix || root || suffix),
    prefix: prefix?.value ?? null,
    prefix_meaning: prefix?.meaning ?? null,
    prefix_example_word: prefix?.exampleWord ?? null,
    prefix_example_meaning: prefix?.exampleMeaning ?? null,
    root: root?.value ?? null,
    root_meaning: root?.meaning ?? null,
    root_example_word: root?.exampleWord ?? null,
    root_example_meaning: root?.exampleMeaning ?? null,
    suffix: suffix?.value ?? null,
    suffix_meaning: suffix?.meaning ?? null,
    suffix_example_word: suffix?.exampleWord ?? null,
    suffix_example_meaning: suffix?.exampleMeaning ?? null,
    example: analysis.example,
    synonyms: analysis.synonyms,
    antonyms: analysis.antonyms,
    difficulty: analysis.difficulty,
    analysis_version: 2,
    dictionary_sources: analysis.dictionarySources,
  };
}

/* --------------------------------- reading --------------------------------- */

export async function getOverview({ supabase, userId }: Ctx, today: string) {
  assertDate(today);
  const [profileRes, streakRes, challengesRes, revisionRes, achievementsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("daily_challenges")
      .select("*")
      .eq("user_id", userId)
      .order("challenge_date", { ascending: false })
      .limit(120),
    supabase
      .from("revision_items")
      .select("*")
      .eq("user_id", userId)
      .lte("next_review_date", today)
      .order("next_review_date", { ascending: true }),
    supabase
      .from("user_achievements")
      .select("earned_at, achievements(code, name, description, icon)")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false }),
  ]);

  const challenges = challengesRes.data ?? [];
  const completed = challenges.filter((c) => c.status === "completed");
  const avg = (key: "overall_score" | "writing_score" | "speaking_score" | "recall_score") =>
    completed.length
      ? Math.round(completed.reduce((sum, c) => sum + (c[key] ?? 0), 0) / completed.length)
      : 0;

  const todayChallenge = challenges.find((c) => c.challenge_date === today) ?? null;
  const mastered = completed.filter((c) => (c.overall_score ?? 0) >= SCORING_CONFIG.masteryScore);

  return {
    profile: profileRes.data,
    streak: streakRes.data ?? { current_streak: 0, longest_streak: 0, last_completed_date: null },
    todayChallenge,
    wordsLearned: challenges.length,
    wordsMastered: mastered.length,
    challengesCompleted: completed.length,
    averageScore: avg("overall_score"),
    averageWriting: avg("writing_score"),
    averageSpeaking: avg("speaking_score"),
    averageRecall: avg("recall_score"),
    recent: challenges.slice(0, 6),
    weekly: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      const match = challenges.find((c) => c.challenge_date === date);
      return { date, score: match?.overall_score ?? 0, completed: match?.status === "completed" };
    }),
    revisionDue: revisionRes.data ?? [],
    achievements: achievementsRes.data ?? [],
  };
}

export async function getHistory({ supabase, userId }: Ctx) {
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("user_id", userId)
    .order("challenge_date", { ascending: false });
  if (error) fail("We couldn't load your vocabulary history.");
  return data ?? [];
}

export async function getChallengeDetail({ supabase, userId }: Ctx, challengeId: string) {
  const { data: challenge } = await supabase
    .from("daily_challenges")
    .select("*, vocabulary_words(*)")
    .eq("id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!challenge) fail("That challenge could not be found.");

  const [sentences, speech, recall] = await Promise.all([
    supabase
      .from("sentence_submissions")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: true }),
    supabase
      .from("speech_submissions")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("recall_submissions")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  return {
    challenge,
    sentences: sentences.data ?? [],
    speech: speech.data?.[0] ?? null,
    speechAttempts: (speech.data ?? []).filter(
      (attempt) => attempt.assessment_provider === "azure",
    ),
    recall: recall.data?.[0] ?? null,
  };
}

export async function getAchievements({ supabase, userId }: Ctx, today: string) {
  const [all, earned, overview] = await Promise.all([
    supabase.from("achievements").select("*").order("sort_order"),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
    getOverview({ supabase, userId }, today),
  ]);

  const earnedMap = new Map((earned.data ?? []).map((r) => [r.achievement_id, r.earned_at]));
  const progressFor = (type: string) => {
    switch (type) {
      case "challenges_completed":
        return overview.challengesCompleted;
      case "streak":
        return overview.streak.current_streak;
      case "words_learned":
        return overview.wordsLearned;
      case "words_mastered":
        return overview.wordsMastered;
      case "avg_speaking":
        return overview.averageSpeaking;
      case "avg_writing":
        return overview.averageWriting;
      default:
        return 0;
    }
  };

  return (all.data ?? []).map((a) => ({
    ...a,
    earned_at: earnedMap.get(a.id) ?? null,
    progress: Math.min(progressFor(a.criteria_type), a.criteria_value),
  }));
}

export async function getRevision({ supabase, userId }: Ctx, today: string) {
  assertDate(today);
  const { data } = await supabase
    .from("revision_items")
    .select("*, vocabulary_words(*)")
    .eq("user_id", userId)
    .order("next_review_date", { ascending: true });
  const items = data ?? [];
  return {
    due: items.filter((i) => i.next_review_date <= today),
    upcoming: items.filter((i) => i.next_review_date > today),
  };
}

/* --------------------------------- writing --------------------------------- */

export async function startChallenge(ctx: Ctx, input: { word: string; today: string }) {
  const { supabase, userId } = ctx;
  const today = assertDate(input.today);
  const word = input.word.trim().toLowerCase();

  if (!word) fail("Please enter a word.");
  if (!/^[a-z][a-z'-]{1,29}$/.test(word))
    fail("We couldn't recognize that as a valid English word. Try another word.");

  const { data: existing } = await supabase
    .from("daily_challenges")
    .select("id")
    .eq("user_id", userId)
    .eq("challenge_date", today)
    .eq("word", word)
    .maybeSingle();
  if (existing) return { challenge: existing, word: null };

  const { data: recent } = await supabase
    .from("daily_challenges")
    .select("challenge_date")
    .eq("user_id", userId)
    .eq("word", word)
    .gte("challenge_date", addDays(today, -30))
    .limit(1)
    .maybeSingle();
  if (recent) fail("You've practiced this word recently. Try a different word.");

  // Cache lookup avoids re-analyzing the same word.
  const { data: cached } = await supabase
    .from("vocabulary_words")
    .select("*")
    .eq("word", word)
    .maybeSingle();

  let vocab = cached;
  if (
    !vocab ||
    !vocab.dictionary_sources ||
    Date.now() - Date.parse(vocab.dictionary_sources[0]?.retrievedAt ?? "") > 86400000
  ) {
    const analysis = await analyzeWordWithAI(word);
    if (!analysis.isEnglishWord)
      fail("We couldn't recognize that as a valid English word. Try another word.");
    const fields = analysisFields(analysis);
    if (vocab) {
      // Store a per-challenge snapshot below; refreshing a shared cache must not
      // block learning when its UPDATE policy is absent or restricted.
      vocab = { ...vocab, ...fields };
    } else {
      const { data: inserted, error } = await supabase
        .from("vocabulary_words")
        .insert({ word, ...fields })
        .select("*")
        .single();
      if (error) {
        const { data: raced } = await supabase
          .from("vocabulary_words")
          .select("*")
          .eq("word", word)
          .maybeSingle();
        if (!raced) databaseFailure(error);
        vocab = { ...raced, ...fields };
      } else {
        vocab = inserted;
      }
    }
  }

  const { data: challenge, error: challengeError } = await supabase
    .from("daily_challenges")
    .insert({
      user_id: userId,
      vocabulary_word_id: vocab.id,
      word,
      challenge_date: today,
      stage: "learn",
      learning_result: vocab,
    })
    .select("*")
    .single();
  if (challengeError) databaseFailure(challengeError);

  return { challenge, word: vocab };
}

function databaseFailure(error: { code?: string; message?: string }): never {
  console.error("Learning persistence failed", error.code, error.message);
  if (["42703", "PGRST204", "23505"].includes(error.code ?? "")) {
    fail(
      "The learning database update has not been applied yet. Please apply the pending learning migrations in Lovable, then retry.",
    );
  }
  fail("We couldn't save your result. Please retry; your answers have been kept.");
}

export async function startWords(ctx: Ctx, input: { word: string; today: string }) {
  const { error: schemaError } = await ctx.supabase
    .from("daily_challenges")
    .select("learning_result,writing_result,word_creation_result")
    .limit(0);
  if (schemaError) databaseFailure(schemaError);
  const words = [
    ...new Set(
      input.word
        .split(/[,;\n]+/)
        .map((word) => word.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (!words.length || words.length > 10)
    fail("Enter between 1 and 10 words, separated by commas.");
  const results: { word: string; challengeId?: string; error?: string }[] = [];
  for (const word of words) {
    try {
      const ready = await startChallenge(ctx, { word, today: input.today });
      results.push({ word, challengeId: ready.challenge.id });
    } catch (error) {
      results.push({
        word,
        error: error instanceof Error ? error.message : "Could not prepare this word.",
      });
    }
  }
  return { results };
}

export async function getTodayChallenge(ctx: Ctx, today: string, challengeId?: string) {
  assertDate(today);
  const { data: choices, error } = await ctx.supabase
    .from("daily_challenges")
    .select("*, vocabulary_words(*)")
    .eq("user_id", ctx.userId)
    .eq("challenge_date", today)
    .order("created_at", { ascending: false });
  if (error) databaseFailure(error);
  const data =
    choices?.find((row) => row.id === challengeId) ??
    choices?.find((row) => row.status !== "completed") ??
    choices?.[0];
  if (!data) return null;
  const detail = await getChallengeDetail(ctx, data.id);
  return {
    ...detail,
    word: data.learning_result ?? data.vocabulary_words,
    choices:
      choices?.map((row) => ({
        id: row.id,
        word: row.word,
        stage: row.stage,
        status: row.status,
        score: row.overall_score,
      })) ?? [],
  };
}

export async function setStage(ctx: Ctx, input: { challengeId: string; stage: string }) {
  if (input.stage !== "write") fail("Use Proceed to move through the challenge.");
  const { error } = await ctx.supabase
    .from("daily_challenges")
    .update({ stage: input.stage })
    .eq("id", input.challengeId)
    .eq("user_id", ctx.userId)
    .eq("stage", "learn")
    .eq("status", "in_progress");
  if (error) fail("We couldn't save your progress.");
  return { ok: true };
}

async function loadOwnedChallenge(ctx: Ctx, challengeId: string) {
  const { data } = await ctx.supabase
    .from("daily_challenges")
    .select("*, vocabulary_words(*)")
    .eq("id", challengeId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!data) fail("That challenge could not be found.");
  return { ...data, vocabulary_words: data.learning_result ?? data.vocabulary_words };
}

export async function submitSentences(
  ctx: Ctx,
  input: {
    challengeId: string;
    sentences: { text: string; typingDurationMs: number }[];
  },
) {
  const challenge = await loadOwnedChallenge(ctx, input.challengeId);
  if (challenge.stage !== "write" || challenge.status !== "in_progress")
    fail("This challenge is not ready for sentence checking.");
  const texts = input.sentences.map((s) => s.text.trim());
  if (texts.length !== SCORING_CONFIG.sentenceCount || texts.some((t) => t.length === 0))
    fail(`Please write all ${SCORING_CONFIG.sentenceCount} sentences before submitting.`);

  const normalized = texts.map((t) =>
    t
      .toLowerCase()
      .replace(/[^a-z ]/g, "")
      .trim(),
  );
  if (new Set(normalized).size !== normalized.length)
    fail("Your sentences must be different from one another.");

  const aiExample = (challenge.vocabulary_words?.example ?? "").toLowerCase();
  if (aiExample && normalized.some((t) => t === aiExample.replace(/[^a-z ]/g, "").trim()))
    fail("Write your own sentence instead of reusing the example sentence.");

  const suspiciouslyFast = input.sentences.some(
    (s) => s.typingDurationMs > 0 && s.typingDurationMs < SCORING_CONFIG.fastTypingThresholdMs,
  );

  const evaluation = await evaluateSentencesWithAI({
    word: challenge.word,
    aiExample: challenge.vocabulary_words?.example ?? "",
    sentences: texts,
  });

  const results = evaluation.results.map((r, index) => ({
    ...r,
    sentenceNumber: index + 1,
    overallScore: normalizeScore(r.overallScore),
    correct: r.targetWordDetected && r.errors.length === 0,
    passed:
      r.targetWordDetected && normalizeScore(r.overallScore) >= SCORING_CONFIG.writingPassScore,
  }));
  const overall = Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length);

  const { error: submissionError } = await ctx.supabase.from("sentence_submissions").insert(
    results.map((r, i) => ({
      user_id: ctx.userId,
      challenge_id: challenge.id,
      sentence_number: r.sentenceNumber,
      sentence_text: texts[i],
      typing_duration: Math.round((input.sentences[i]?.typingDurationMs ?? 0) / 1000),
      score: r.overallScore,
      feedback: r.feedback,
      passed: r.passed,
    })),
  );
  if (submissionError) databaseFailure(submissionError);

  const { error: saveError } = await ctx.supabase
    .from("daily_challenges")
    .update({
      writing_score: overall,
      writing_result: { ...evaluation, results, sentences: texts },
    })
    .eq("id", challenge.id)
    .eq("user_id", ctx.userId)
    .eq("stage", "write")
    .eq("status", "in_progress");
  if (saveError) databaseFailure(saveError);

  return {
    results,
    overallScore: overall,
    passed: overall >= SCORING_CONFIG.writingPassScore,
    summary: evaluation.summary,
    needsAuthorshipCheck: suspiciouslyFast,
  };
}

export async function advanceToWordTask(ctx: Ctx, challengeId: string) {
  const challenge = await loadOwnedChallenge(ctx, challengeId);
  if (challenge.stage !== "write" || challenge.writing_score == null) {
    fail("Validate both sentences before proceeding.");
  }
  const { error } = await ctx.supabase
    .from("daily_challenges")
    .update({ stage: challenge.pronunciation_required ? "pronounce" : "speak" })
    .eq("id", challenge.id)
    .eq("user_id", ctx.userId)
    .eq("stage", "write")
    .eq("status", "in_progress");
  if (error) fail("We couldn't save your progress.");
  return { ok: true };
}

export async function submitCreatedWord(
  ctx: Ctx,
  input: {
    challengeId: string;
    partType: WordPartType;
    part: string;
    word: string;
    meaning: string;
  },
) {
  const challenge = await loadOwnedChallenge(ctx, input.challengeId);
  if (challenge.status === "completed" || !["speak", "recall"].includes(challenge.stage)) {
    fail("That challenge is not ready for this step.");
  }

  const parts = availableWordParts(challenge.vocabulary_words ?? {});
  const selected = parts.find(
    (part) => part.type === input.partType && part.value === input.part.trim(),
  );
  if (!selected) fail("Choose one of the word parts shown in the learning step.");

  const candidateWord = input.word.trim().toLowerCase();
  const candidateMeaning = input.meaning.trim();
  if (candidateWord === challenge.word.toLowerCase()) {
    fail("The new word must be different from the word you learned.");
  }

  const evaluation = await evaluateWordCreationWithAI({
    partType: selected.type,
    part: selected.value,
    partMeaning: selected.meaning,
    learnedWord: challenge.word,
    candidateWord,
    candidateMeaning,
  });
  const passed =
    evaluation.isRealWord &&
    evaluation.usesSelectedPart &&
    evaluation.relationshipValid &&
    evaluation.meaningCorrect;
  const score = passed
    ? 100
    : evaluation.isRealWord && evaluation.usesSelectedPart && evaluation.relationshipValid
      ? 50
      : 0;
  const result = { ...evaluation, passed, score };

  const { error } = await ctx.supabase
    .from("daily_challenges")
    .update({
      created_word: candidateWord,
      created_word_meaning: candidateMeaning,
      created_word_part_type: selected.type,
      created_word_part: selected.value,
      word_creation_score: score,
      word_creation_result: result,
      ...(!challenge.pronunciation_required ? { speaking_score: score } : {}),
    })
    .eq("id", challenge.id)
    .eq("user_id", ctx.userId)
    .in("stage", ["speak", "recall"])
    .eq("status", "in_progress");
  if (error) fail("We couldn't save that result.");

  return result;
}

export async function finishChallenge(ctx: Ctx, input: { challengeId: string; today: string }) {
  const today = assertDate(input.today);
  let challenge = await loadOwnedChallenge(ctx, input.challengeId);
  if (challenge.status === "completed") return { alreadyCompleted: true };
  if (!["speak", "recall"].includes(challenge.stage)) {
    fail("That challenge is not ready to finish.");
  }
  if (challenge.writing_score == null || challenge.word_creation_score == null) {
    fail("Validate both tasks before proceeding.");
  }

  const wordCreation = normalizeScore(challenge.word_creation_score);
  const overall = learningChallengeScore(normalizeScore(challenge.writing_score), wordCreation);

  if (challenge.stage === "speak") {
    const { error } = await ctx.supabase
      .from("daily_challenges")
      .update({ stage: "recall" })
      .eq("id", challenge.id)
      .eq("user_id", ctx.userId)
      .eq("stage", "speak")
      .eq("status", "in_progress");
    if (error) fail("We couldn't save your progress.");
    challenge = { ...challenge, stage: "recall" };
  }

  if (!passesLearningChallenge(overall)) {
    const { error } = await ctx.supabase
      .from("daily_challenges")
      .update({
        recall_score: wordCreation,
        overall_score: overall,
        status: "completed",
        stage: "complete",
        completed_at: new Date().toISOString(),
        streak_awarded: false,
      })
      .eq("id", challenge.id)
      .eq("user_id", ctx.userId);
    if (error) fail("We couldn't complete your challenge.");
    return { passed: false, overallScore: overall };
  }

  const completion = await completeChallenge(ctx, {
    challenge,
    recallScore: wordCreation,
    today,
    overallScore: overall,
  });
  return { passed: true, ...completion };
}

/* --------------------------------- speaking -------------------------------- */

export async function submitSpeech(
  ctx: Ctx,
  input: {
    challengeId: string;
    audioBase64: string;
    mimeType: string;
    durationSeconds: number;
  },
) {
  const challenge = await loadOwnedChallenge(ctx, input.challengeId);
  if (input.audioBase64.length < 2048) fail("That recording was empty — please record again.");

  const transcript = await transcribeAudio({
    base64: input.audioBase64,
    mimeType: input.mimeType,
  });
  if (!transcript) fail("We couldn't hear anything in that recording. Please try again.");

  const evaluation = await evaluateSpeechWithAI({
    word: challenge.word,
    transcript,
    durationSeconds: Math.max(1, Math.round(input.durationSeconds)),
  });

  const detected =
    evaluation.targetWordDetected ||
    new RegExp(`\\b${challenge.word.slice(0, Math.max(4, challenge.word.length - 2))}`, "i").test(
      transcript,
    );

  const scores = {
    pronunciation: normalizeScore(evaluation.pronunciationScore),
    grammar: normalizeScore(evaluation.grammarScore),
    usage: detected ? normalizeScore(evaluation.usageScore) : 0,
    fluency: normalizeScore(evaluation.fluencyScore),
  };
  const overall = detected
    ? Math.round((scores.pronunciation + scores.grammar + scores.usage + scores.fluency) / 4)
    : 0;
  const passed = detected && overall >= SCORING_CONFIG.writingPassScore - 20;

  await ctx.supabase.from("speech_submissions").insert({
    user_id: ctx.userId,
    challenge_id: challenge.id,
    transcript,
    target_word_detected: detected,
    pronunciation_score: scores.pronunciation,
    grammar_score: scores.grammar,
    usage_score: scores.usage,
    fluency_score: scores.fluency,
    overall_score: overall,
    feedback: evaluation.feedback,
  });

  if (passed) {
    await ctx.supabase
      .from("daily_challenges")
      .update({ speaking_score: overall, stage: "recall" })
      .eq("id", challenge.id)
      .eq("user_id", ctx.userId);
  }

  return {
    transcript,
    targetWordDetected: detected,
    ...scores,
    overallScore: overall,
    passed,
    feedback: detected
      ? evaluation.feedback
      : `We didn't hear "${challenge.word}" in your sentence. Try again and use the word aloud.`,
  };
}

/* ---------------------------------- recall --------------------------------- */

export async function submitRecall(
  ctx: Ctx,
  input: { challengeId: string; meaning: string; today: string },
) {
  const today = assertDate(input.today);
  const challenge = await loadOwnedChallenge(ctx, input.challengeId);
  const meaning = input.meaning.trim();
  if (meaning.length < 3) fail("Please write the meaning of the word.");

  const evaluation = await evaluateMeaningWithAI({ word: challenge.word, meaning });
  const score = Math.max(0, Math.min(100, Math.round(evaluation.score)));
  const passed = evaluation.correct && score >= 70;

  await ctx.supabase.from("recall_submissions").insert({
    user_id: ctx.userId,
    challenge_id: challenge.id,
    synonym: meaning,
    antonym: null,
    synonym_correct: passed,
    antonym_correct: passed,
    score,
    feedback: evaluation.feedback,
  });

  if (!passed) {
    return {
      passed: false,
      score,
      feedback: evaluation.feedback,
      completion: null,
    };
  }

  const completion = await completeChallenge(ctx, {
    challenge,
    recallScore: score,
    today,
  });

  return {
    passed: true,
    score,
    feedback: evaluation.feedback,
    completion,
  };
}

/* -------------------------------- completion -------------------------------- */

async function completeChallenge(
  ctx: Ctx,
  args: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    challenge: any;
    recallScore: number;
    today: string;
    overallScore?: number;
  },
) {
  const { supabase, userId } = ctx;
  const { challenge, recallScore, today, overallScore } = args;

  const writing = normalizeScore(challenge.writing_score);
  const speaking = normalizeScore(challenge.speaking_score);
  if (challenge.writing_score == null || challenge.speaking_score == null)
    fail("Finish the writing and speaking stages first.");

  const overall = overallScore ?? overallDailyScore(writing, speaking, recallScore);
  const alreadyCompleted = challenge.status === "completed";

  const { data: completed, error: completionError } = await supabase
    .from("daily_challenges")
    .update({
      recall_score: recallScore,
      overall_score: overall,
      status: "completed",
      stage: "complete",
      streak_awarded: true,
      completed_at: challenge.completed_at ?? new Date().toISOString(),
    })
    .eq("id", challenge.id)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();
  if (completionError) databaseFailure(completionError);
  if (!completed) return { alreadyCompleted: true };

  // Streak: counts every word mastered (multiple words in one day each count).
  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let current = streak?.current_streak ?? 0;
  let longest = streak?.longest_streak ?? 0;
  let streakIncreased = false;

  if (!alreadyCompleted) {
    current = current + 1;
    longest = Math.max(longest, current);
    streakIncreased = true;
    await supabase.from("streaks").upsert(
      {
        user_id: userId,
        current_streak: current,
        longest_streak: longest,
        last_completed_date: today,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  // Spaced repetition scheduling.
  if (challenge.vocabulary_word_id) {
    const mastered = overall >= SCORING_CONFIG.masteryScore;
    const interval = mastered
      ? SCORING_CONFIG.revisionIntervalDays[1]
      : SCORING_CONFIG.revisionIntervalDays[0];
    await supabase.from("revision_items").upsert(
      {
        user_id: userId,
        vocabulary_word_id: challenge.vocabulary_word_id,
        word: challenge.word,
        next_review_date: addDays(today, interval),
        mastery_status: mastered ? "mastered" : "needs_revision",
        last_score: overall,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,vocabulary_word_id" },
    );
  }

  const newAchievements = await evaluateAchievements(ctx, today);
  const overview = await getOverview(ctx, today);

  return {
    word: challenge.word,
    writingScore: writing,
    speakingScore: speaking,
    recallScore,
    overallScore: overall,
    streakIncreased,
    currentStreak: overview.streak.current_streak,
    longestStreak: overview.streak.longest_streak,
    wordsLearned: overview.wordsLearned,
    newAchievements,
  };
}

async function evaluateAchievements(ctx: Ctx, today: string) {
  const { supabase, userId } = ctx;
  const [{ data: all }, { data: earned }, overview] = await Promise.all([
    supabase.from("achievements").select("*"),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
    getOverview(ctx, today),
  ]);
  const earnedIds = new Set((earned ?? []).map((r) => r.achievement_id));
  const value = (type: string) =>
    ({
      challenges_completed: overview.challengesCompleted,
      streak: overview.streak.current_streak,
      words_learned: overview.wordsLearned,
      words_mastered: overview.wordsMastered,
      avg_speaking: overview.averageSpeaking,
      avg_writing: overview.averageWriting,
    })[type] ?? 0;

  const newly = (all ?? []).filter(
    (a) => !earnedIds.has(a.id) && value(a.criteria_type) >= a.criteria_value,
  );
  if (newly.length) {
    await supabase
      .from("user_achievements")
      .insert(newly.map((a) => ({ user_id: userId, achievement_id: a.id })));
  }
  return newly.map((a) => ({
    code: a.code,
    name: a.name,
    icon: a.icon,
    description: a.description,
  }));
}

/* --------------------------------- revision -------------------------------- */

export async function submitRevisionReview(
  ctx: Ctx,
  input: { itemId: string; sentence: string; synonym: string; today: string },
) {
  const today = assertDate(input.today);
  const { data: item } = await ctx.supabase
    .from("revision_items")
    .select("*")
    .eq("id", input.itemId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!item) fail("That revision word could not be found.");

  const [sentenceEval, recallEval] = await Promise.all([
    evaluateSentencesWithAI({ word: item.word, aiExample: "", sentences: [input.sentence.trim()] }),
    evaluateRecallWithAI({ word: item.word, synonym: input.synonym.trim(), antonym: "n/a" }),
  ]);

  const sentenceScore = normalizeScore(sentenceEval.results[0]?.overallScore);
  const passed = sentenceScore >= SCORING_CONFIG.writingPassScore && recallEval.synonymCorrect;
  const reviewCount = item.review_count + 1;
  const interval =
    SCORING_CONFIG.revisionIntervalDays[
      Math.min(reviewCount, SCORING_CONFIG.revisionIntervalDays.length - 1)
    ] ?? 7;

  await ctx.supabase
    .from("revision_items")
    .update({
      review_count: reviewCount,
      next_review_date: addDays(today, passed ? interval : 1),
      mastery_status: passed ? "mastered" : "needs_revision",
      last_score: sentenceScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("user_id", ctx.userId);

  return {
    passed,
    sentenceScore,
    synonymCorrect: recallEval.synonymCorrect,
    feedback: `${sentenceEval.results[0]?.feedback ?? ""} ${recallEval.synonymFeedback}`.trim(),
  };
}

/* --------------------------------- profile --------------------------------- */

export async function updateProfile(
  ctx: Ctx,
  input: {
    fullName?: string | undefined;
    timezone?: string | undefined;
    theme?: string | undefined;
    notificationsEnabled?: boolean | undefined;
  },
) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.fullName !== undefined) patch["full_name"] = input.fullName.trim().slice(0, 80);
  if (input.timezone !== undefined) patch["timezone"] = input.timezone.slice(0, 64);
  if (input.theme !== undefined) patch["theme"] = input.theme === "dark" ? "dark" : "light";
  if (input.notificationsEnabled !== undefined)
    patch["notifications_enabled"] = input.notificationsEnabled;

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update(patch)
    .eq("id", ctx.userId)
    .select("*")
    .maybeSingle();
  if (error) fail("We couldn't save your profile.");
  return data;
}
