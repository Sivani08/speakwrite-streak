export type GrammarError = {
  phrase: string;
  correction: string;
  explanation: string;
  type: string;
};

export function normalizeSentenceFeedback<T extends { errors: GrammarError[] }>(
  text: string,
  word: string,
  result: T,
) {
  const seen = new Set<string>();
  const errors = result.errors.filter((error) => {
    if (
      !error.phrase ||
      !text.includes(error.phrase) ||
      error.phrase === text ||
      error.phrase === error.correction ||
      seen.has(error.phrase)
    )
      return false;
    seen.add(error.phrase);
    return true;
  });
  const targetWordDetected = new RegExp(
    `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  ).test(text);
  const overallScore = !targetWordDetected
    ? 0
    : errors.some((error) => error.type === "usage")
      ? Math.max(0, 45 - (errors.length - 1) * 15)
      : Math.max(0, 100 - errors.length * 15);
  return { ...result, errors, targetWordDetected, overallScore };
}
