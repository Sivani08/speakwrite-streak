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
  root: z.string().nullable(),
  rootMeaning: z.string().nullable(),
  rootExampleWord: z.string().nullable(),
  rootExampleMeaning: z.string().nullable(),
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
      "Give a conservative, linguistically and etymologically accurate analysis of genuine prefixes, roots, and suffixes.",
      "A visible substring is not automatically a morpheme. Never split a word merely because its first or last letters resemble an affix, and never invent a historical relationship.",
      "Use a prefix only when it is a genuine English derivational prefix in this word. Write it like 're-'.",
      "Use a suffix only when it is a genuine English derivational suffix in this word. Write it like '-ness'.",
      "Use a root only when a defensible lexical or classical bound root carries meaning in this word. Write the conventional root form and explain its relevant meaning, not a guessed substring.",
      "For every non-null part, provide exactly one DIFFERENT real English related word that genuinely uses the same morpheme with the same linguistic relationship, plus that related word's short meaning.",
      "Use null for the part, its meaning, its example word, and its example meaning whenever the analysis is uncertain or the part is not genuinely present.",
      "Set breakdownAvailable true only when at least one complete, defensible prefix/root/suffix analysis is present. Accuracy is more important than producing a breakdown.",
      "simpleMeaning is a concise definition. detailedMeaning is the full learner-friendly meaning, including the word's relevant sense without unnecessary complexity.",
      "pronunciation must be a simple readable respelling like 'meh-TIK-yuh-lus'.",
      "difficulty must be exactly one of: beginner, intermediate, advanced.",
      "If the input is not a real English word (gibberish, misspelling, or not English), set isEnglishWord to false and leave the other fields as empty strings, empty arrays or null.",
    ].join(" "),
    `Analyze this word: "${word}"`,
  );
}

/* --------------------------- Created word validation ------------------------ */

export const wordCreationSchema = z.object({
  isRealWord: z.boolean(),
  usesSelectedPart: z.boolean(),
  relationshipValid: z.boolean(),
  meaningCorrect: z.boolean(),
  feedback: z.string(),
});
export type WordCreationEvaluation = z.infer<typeof wordCreationSchema>;

export function evaluateWordCreationWithAI(input: {
  partType: "prefix" | "root" | "suffix";
  part: string;
  partMeaning: string;
  learnedWord: string;
  candidateWord: string;
  candidateMeaning: string;
}) {
  return generateStructured(
    wordCreationSchema,
    [
      "You are a conservative English lexicographer validating a learner's morphology task.",
      "isRealWord: true only if candidateWord is a real, standard English word found in reputable dictionaries. Reject invented, misspelled, obsolete-only, proper-name-only, or nonsense forms.",
      "usesSelectedPart: true only if candidateWord genuinely contains the selected prefix, root, or suffix as a meaningful morpheme and is different from learnedWord.",
      "relationshipValid: true only if the selected part has the same relevant linguistic origin, function, and sense in both words. Shared spelling alone is not enough.",
      "meaningCorrect: true if the learner's meaning captures the real meaning of candidateWord; accept simple wording.",
      "feedback is one short, encouraging sentence naming exactly what is wrong when something is wrong.",
    ].join(" "),
    JSON.stringify(input),
  );
}

/* ---------------------------- Sentence evaluation --------------------------- */

export const sentenceEvalSchema = z.object({
  results: z
    .array(
      z.object({
        sentenceNumber: z.number(),
        targetWordDetected: z.boolean(),
        grammarScore: z.number(),
        spellingScore: z.number(),
        punctuationScore: z.number(),
        usageScore: z.number(),
        meaningScore: z.number(),
        structureScore: z.number(),
        overallScore: z.number(),
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
    )
    .length(SCORING_CONFIG.sentenceCount),
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
      "Evaluate grammar, spelling, punctuation, sentence structure, correct vocabulary usage, and whether the target word is used with its correct meaning.",
      "Check ONLY genuine errors. Do not turn matters of taste, register, detail, or style into errors.",
      "NEVER penalise a sentence for being short, simple, generic, unsophisticated, or different from the example sentence. Simple correct sentences must score 100.",
      "Style or 'more natural' rewrites are optional suggestions only: put them in suggestions and NEVER let them reduce the score or appear in errors.",
      "errors contains ONE entry per genuine mistake: phrase must be the EXACT substring of the learner's sentence that is wrong (copied character for character, no added words), correction is the fixed form of just that phrase, explanation is one short sentence, type is one of grammar, spelling, punctuation, structure, usage.",
      "If a sentence has no genuine errors, errors must be an empty array and overallScore must be 100.",
      "Score grammar, spelling, punctuation, structure, usage, and meaning from 0 to 100, then set each sentence overallScore to their rounded average. Optional suggestions must not affect any score.",
      "Deduct only in the relevant categories for genuine errors. Score usage and meaning 0 when the target word is missing or clearly misused.",
      "Accept 'She took a pragmatic approach to solve a problem.' as grammatically understandable; 'approach to solving' may be an optional suggestion but must not reduce the score.",
      "Accept 'The manager can take a pragmatic approach.' as a complete grammatical sentence.",
      "In 'She has show more resilience.', flag only 'show' and correct it to 'shown'.",
      "In 'She is able to shown more resilience.', flag only 'shown' and correct it to 'show'.",
      "In 'She is meticulous to her work.', flag only 'meticulous to' and correct it to 'meticulous about'.",
      `The task-level passing threshold is ${SCORING_CONFIG.writingPassScore}%.`,
      "Never rewrite the whole sentence for the learner.",
      "overallScore is the rounded average of the two sentence overallScore values. passed is true when that task average reaches the configured threshold.",
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
    if (response.status === 429)
      throw new Error("Too many requests right now. Please retry shortly.");
    if (response.status === 402)
      throw new Error(
        "AI credits are exhausted for this workspace. Please add credits to continue.",
      );
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
