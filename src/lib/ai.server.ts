import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider, requireLovableApiKey } from "./ai-gateway.server";
import { SCORING_CONFIG } from "./scoring";

const MODEL = "google/gemini-3.7-flash";

function model() {
  const gateway = createLovableAiGatewayProvider(requireLovableApiKey());
  return gateway(MODEL);
}

async function generateStructured<T extends z.ZodTypeAny>(
  schema: T,
  system: string,
  prompt: string,
): Promise<z.infer<T>> {
  try {
    const result = streamText({
      model: model(),
      system,
      prompt,
      output: Output.object({ schema }),
    });
    return (await result.output) as z.infer<T>;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error("The AI response could not be read. Please try again.");
    }
    throw error;
  }
}

/* ------------------------------- Word analysis ------------------------------ */

export const wordAnalysisSchema = z.object({
  isEnglishWord: z.boolean(),
  word: z.string(),
  pronunciation: z.string(),
  partOfSpeech: z.string(),
  simpleMeaning: z.string(),
  detailedMeaning: z.string(),
  breakdownAvailable: z.boolean(),
  prefix: z.string().nullable(),
  root: z.string().nullable(),
  suffix: z.string().nullable(),
  example: z.string(),
  synonyms: z.array(z.string()),
  antonyms: z.array(z.string()),
  difficulty: z.string(),
});
export type WordAnalysis = z.infer<typeof wordAnalysisSchema>;

export function analyzeWordWithAI(word: string) {
  return generateStructured(
    wordAnalysisSchema,
    [
      "You are a precise English lexicographer for a vocabulary learning app.",
      "Return structured data only. Never invent morphology: set breakdownAvailable to false and prefix/root/suffix to null unless the word has a genuinely reliable prefix/root/suffix analysis.",
      "pronunciation must be a simple readable respelling like 'meh-TIK-yuh-lus'.",
      "difficulty must be exactly one of: beginner, intermediate, advanced.",
      "If the input is not a real English word (gibberish, misspelling, or not English), set isEnglishWord to false and leave the other fields as empty strings or empty arrays.",
    ].join(" "),
    `Analyze this word: "${word}"`,
  );
}

/* ---------------------------- Sentence evaluation --------------------------- */

export const sentenceEvalSchema = z.object({
  results: z.array(
    z.object({
      sentenceNumber: z.number(),
      targetWordDetected: z.boolean(),
      grammarScore: z.number(),
      usageScore: z.number(),
      contextScore: z.number(),
      structureScore: z.number(),
      naturalnessScore: z.number(),
      overallScore: z.number(),
      passed: z.boolean(),
      feedback: z.string(),
      errors: z.array(z.string()),
    }),
  ),
  overallScore: z.number(),
  passed: z.boolean(),
  summary: z.string(),
});
export type SentenceEvaluation = z.infer<typeof sentenceEvalSchema>;

export function evaluateSentencesWithAI(input: {
  word: string;
  aiExample: string;
  sentences: string[];
}) {
  const w = SCORING_CONFIG.sentenceWeights;
  return generateStructured(
    sentenceEvalSchema,
    [
      "You are a supportive but rigorous English writing evaluator.",
      `Score each sentence 0-100 using these weights: vocabulary usage ${w.usage * 100}%, grammar ${w.grammar * 100}%, context ${w.context * 100}%, sentence structure ${w.structure * 100}%, naturalness ${w.naturalness * 100}%.`,
      `A sentence passes when it contains the target word, is grammatically meaningful, and scores at least ${SCORING_CONFIG.writingPassScore}.`,
      "Accept correct sentences even if you would phrase them differently — style preferences are not errors.",
      "Penalise a sentence heavily only if the target word is missing, misused, or the sentence copies the AI example almost word for word.",
      "Feedback must teach: name the issue and how to think about fixing it, but never rewrite the sentence for the learner.",
      "overallScore is the average of the sentence scores. passed is true only when every sentence passes.",
    ].join(" "),
    JSON.stringify({
      targetWord: input.word,
      aiExampleToAvoidCopying: input.aiExample,
      sentences: input.sentences.map((text, i) => ({ sentenceNumber: i + 1, text })),
    }),
  );
}

/* ------------------------------ Recall evaluation --------------------------- */

export const recallEvalSchema = z.object({
  synonymCorrect: z.boolean(),
  antonymCorrect: z.boolean(),
  score: z.number(),
  synonymFeedback: z.string(),
  antonymFeedback: z.string(),
});
export type RecallEvaluation = z.infer<typeof recallEvalSchema>;

export function evaluateRecallWithAI(input: { word: string; synonym: string; antonym: string }) {
  return generateStructured(
    recallEvalSchema,
    [
      "You semantically validate synonym and antonym answers for a vocabulary app.",
      "Accept any legitimate answer, including uncommon ones and near-synonyms — never require one exact expected word.",
      "score is 100 when both are correct, 50 when one is correct, 0 when neither is.",
      "When an answer is wrong, explain briefly why it does not fit, WITHOUT revealing a correct answer.",
    ].join(" "),
    JSON.stringify(input),
  );
}

/* ------------------------------ Speech analysis ----------------------------- */

export const speechEvalSchema = z.object({
  targetWordDetected: z.boolean(),
  pronunciationScore: z.number(),
  grammarScore: z.number(),
  usageScore: z.number(),
  fluencyScore: z.number(),
  overallScore: z.number(),
  feedback: z.string(),
});
export type SpeechEvaluation = z.infer<typeof speechEvalSchema>;

export async function transcribeAudio(audio: {
  base64: string;
  mimeType: string;
}): Promise<string> {
  const key = requireLovableApiKey();
  const bytes = Uint8Array.from(atob(audio.base64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("model", "openai/gpt-4o-transcribe");
  form.append("file", new Blob([bytes], { type: audio.mimeType }), "recording.wav");
  form.append("stream", "true");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) throw new Error("Too many requests right now. Please retry shortly.");
    if (response.status === 402)
      throw new Error("AI credits are exhausted for this workspace. Please add credits to continue.");
    throw new Error(`We couldn't process that recording. ${detail.slice(0, 160)}`);
  }

  const raw = await response.text();
  let text = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event = JSON.parse(payload) as { type?: string; delta?: string; text?: string };
      if (event.type === "transcript.text.delta" && event.delta) text += event.delta;
      if (event.type === "transcript.text.done" && event.text) text = event.text;
    } catch {
      /* ignore malformed event */
    }
  }
  return text.trim();
}

export function evaluateSpeechWithAI(input: {
  word: string;
  transcript: string;
  durationSeconds: number;
}) {
  return generateStructured(
    speechEvalSchema,
    [
      "You evaluate a learner's spoken sentence from its transcript for a vocabulary app.",
      "targetWordDetected: whether the target word (or an inflected form of it) appears in the transcript.",
      "pronunciationScore is an ESTIMATE based on transcription clarity — be moderate and never claim certainty.",
      "fluencyScore considers sentence length relative to the recording duration, hesitation markers and repetitions.",
      "overallScore weights pronunciation, grammar, usage and fluency roughly equally.",
      "If the target word is missing, keep usageScore low and say so plainly in the feedback.",
      "Feedback is one or two encouraging, concrete sentences.",
    ].join(" "),
    JSON.stringify(input),
  );
}
