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
  prefixMeaning: z.string().nullable(),
  prefixExampleWord: z.string().nullable(),
  prefixExampleMeaning: z.string().nullable(),
  suffix: z.string().nullable(),
  suffixMeaning: z.string().nullable(),
  suffixExampleWord: z.string().nullable(),
  suffixExampleMeaning: z.string().nullable(),
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
      "Teach PREFIXES AND SUFFIXES ONLY. Never analyse roots.",
      "If the word begins with a genuine, standard English prefix (e.g. re-, un-, pre-, dis-, mis-, sub-, inter-, trans-, over-, under-, non-, anti-, co-, ex-, semi-, micro-, mono-, bi-, auto-, tele-), set breakdownAvailable true, prefix to that prefix (written like 'pre-'), prefixMeaning to its accurate linguistic meaning (e.g. 'before, in advance'), prefixExampleWord to a DIFFERENT real English word using the same prefix, and prefixExampleMeaning to that word's short meaning.",
      "If the word ends with a genuine derivational English suffix (e.g. -ful, -less, -ness, -ment, -able, -ous, -tion, -ity, -ize), set suffix to that suffix, suffixMeaning to its accurate linguistic function or meaning, suffixExampleWord to a DIFFERENT real English word using it, and suffixExampleMeaning to that word's short meaning.",
      "Use null for every prefix or suffix field when that affix is not genuinely present. Set breakdownAvailable true when a genuine prefix or suffix exists. Never invent an affix or meaning, and do not treat an ordinary ending as a suffix.",
      "pronunciation must be a simple readable respelling like 'meh-TIK-yuh-lus'.",
      "difficulty must be exactly one of: beginner, intermediate, advanced.",
      "If the input is not a real English word (gibberish, misspelling, or not English), set isEnglishWord to false and leave the other fields as empty strings, empty arrays or null.",
    ].join(" "),
    `Analyze this word: "${word}"`,
  );
}

/* --------------------------- Prefix word validation ------------------------- */

export const prefixWordSchema = z.object({
  isRealWord: z.boolean(),
  usesPrefix: z.boolean(),
  meaningCorrect: z.boolean(),
  score: z.number(),
  feedback: z.string(),
});
export type PrefixWordEvaluation = z.infer<typeof prefixWordSchema>;

export function evaluatePrefixWordWithAI(input: {
  prefix: string;
  prefixMeaning: string;
  learnedWord: string;
  candidateWord: string;
  candidateMeaning: string;
}) {
  return generateStructured(
    prefixWordSchema,
    [
      "You validate a learner's new word built from a taught English prefix.",
      "isRealWord: true only if candidateWord is a real, standard English word found in dictionaries. Reject invented, misspelled or nonsense words.",
      "usesPrefix: true only if candidateWord genuinely begins with the given prefix used as that prefix, and is different from the learned word.",
      "meaningCorrect: true if the learner's meaning captures the real meaning of candidateWord; accept simple wording.",
      "score is 100 when all three are true, 50 when the word is real and uses the prefix but the meaning is off, and 0 otherwise.",
      "feedback is one short, encouraging sentence naming exactly what is wrong when something is wrong.",
    ].join(" "),
    JSON.stringify(input),
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
      errors: z.array(
        z.object({
          phrase: z.string(),
          correction: z.string(),
          explanation: z.string(),
          type: z.string(),
        }),
      ),
      suggestions: z.array(z.string()),
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
  return generateStructured(
    sentenceEvalSchema,
    [
      "You are an accurate English grammar checker for a vocabulary app.",
      "Check ONLY genuine errors: grammar, spelling, punctuation, broken sentence structure, and incorrect use of the target vocabulary word.",
      "NEVER penalise a sentence for being short, simple, generic, unsophisticated, or different from the example sentence. Simple correct sentences must score 100.",
      "Style or 'more natural' rewrites are optional suggestions only: put them in suggestions and NEVER let them reduce the score or appear in errors.",
      "errors contains ONE entry per genuine mistake: phrase must be the EXACT substring of the learner's sentence that is wrong (copied character for character, no added words), correction is the fixed form of just that phrase, explanation is one short sentence, type is one of grammar, spelling, punctuation, structure, usage.",
      "If a sentence has no genuine errors, errors must be an empty array and overallScore must be 100.",
      "Deduct roughly 15 points per genuine error, and score 30 or lower only when the target word is missing or clearly misused.",
      `A sentence passes when it contains the target word and scores at least ${SCORING_CONFIG.writingPassScore}.`,
      "Never rewrite the whole sentence for the learner.",
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

export const meaningEvalSchema = z.object({
  correct: z.boolean(),
  score: z.number(),
  feedback: z.string(),
});
export type MeaningEvaluation = z.infer<typeof meaningEvalSchema>;

export function evaluateMeaningWithAI(input: { word: string; meaning: string }) {
  return generateStructured(
    meaningEvalSchema,
    [
      "You check whether a learner correctly explained the meaning of an English word from memory.",
      "Accept any wording that captures the core sense, including informal or partial-but-accurate definitions.",
      "Reject vague, empty, circular, or wrong explanations.",
      "score is 0-100 based on accuracy and clarity; 70+ means correct.",
      "feedback is one short encouraging sentence; if wrong, hint at the sense without giving the full definition.",
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
