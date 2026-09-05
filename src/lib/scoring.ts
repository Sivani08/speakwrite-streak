// Configurable scoring / passing rules (shared by client and server).
export const SCORING_CONFIG = {
  passScore: 60,
  writingPassScore: 60,
  sentenceCount: 2,
  weights: { writing: 0.4, speaking: 0.4, recall: 0.2 },
  sentenceWeights: {
    usage: 0.3,
    grammar: 0.25,
    context: 0.2,
    structure: 0.15,
    naturalness: 0.1,
  },
  masteryScore: 85,
  revisionIntervalDays: [3, 7, 16, 30],
  fastTypingThresholdMs: 2500,
} as const;

export function overallDailyScore(writing: number, speaking: number, recall: number) {
  const w = SCORING_CONFIG.weights;
  return Math.round(writing * w.writing + speaking * w.speaking + recall * w.recall);
}

export function learningChallengeScore(sentenceScore: number, wordCreationScore: number) {
  return Math.round((sentenceScore + wordCreationScore) / 2);
}

export function passesLearningChallenge(score: number) {
  return score >= SCORING_CONFIG.passScore;
}

export const CHALLENGE_STEPS = ["learn", "write", "pronounce", "speak", "complete"] as const;
export type ChallengeStage = (typeof CHALLENGE_STEPS)[number];

export const STEP_LABELS: Record<ChallengeStage, string> = {
  learn: "Learn",
  write: "Sentences",
  pronounce: "Speaking",
  speak: "New word",
  complete: "Score",
};
