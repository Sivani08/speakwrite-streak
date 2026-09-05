import assert from "node:assert/strict";
import test from "node:test";
import { englishEvidence, lookupEnglishWord } from "../src/lib/dictionary.server.ts";
import { normalizeSentenceFeedback } from "../src/lib/sentence-feedback.ts";

test("extracts English etymology and definitions without another language or quotations", () => {
  const evidence = englishEvidence(
    "==French==\n===Noun===\n# French meaning\n==English==\n===Etymology===\nFrom Latin tenax.\n===Adjective===\n# Unwilling to give up.\n#* a long quotation\n====Translations====\n* French translation\n==German==\n===Noun===\n# German meaning",
  );
  assert.match(evidence!, /Latin tenax/);
  assert.match(evidence!, /Unwilling/);
  assert.doesNotMatch(evidence!, /French|German|quotation/);
  assert.equal(englishEvidence("==French==\n===Noun===\n# example"), null);
});

test("optional grammar improvements do not reduce scores", () => {
  for (const text of [
    "She took a pragmatic approach to solve a problem.",
    "The manager can take a pragmatic approach.",
  ]) {
    assert.equal(
      normalizeSentenceFeedback(text, "pragmatic", {
        errors: [],
        suggestions: ["Try approach to solving"],
      }).overallScore,
      100,
    );
  }
});

test("retains exact genuine errors and rejects invented or whole-sentence highlights", () => {
  for (const [text, phrase, correction] of [
    ["She has show more resilience.", "show", "shown"],
    ["She is able to shown more resilience.", "shown", "show"],
  ]) {
    const error = {
      phrase,
      correction,
      explanation: "Use the correct verb form.",
      type: "grammar",
    };
    const result = normalizeSentenceFeedback(text!, "resilience", {
      errors: [
        error,
        error,
        { ...error, phrase: "not in this sentence" },
        { ...error, phrase: text! },
      ],
    });
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0]?.phrase, phrase);
    assert.equal(result.overallScore, 85);
  }
  assert.equal(
    normalizeSentenceFeedback("She is meticulous to her work.", "meticulous", {
      errors: [
        {
          phrase: "meticulous to",
          correction: "meticulous about",
          explanation: "Use about.",
          type: "usage",
        },
      ],
    }).overallScore,
    45,
  );
  assert.equal(
    normalizeSentenceFeedback("This is a sentence.", "pragmatic", { errors: [] }).overallScore,
    0,
  );
});

test("dictionary distinguishes missing words from a service outage", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { code: "missingtitle" } }));
    assert.equal(await lookupEnglishWord("xyznotaword"), null);
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(lookupEnglishWord("outagetest"), /temporarily unavailable/);
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ parse: { wikitext: "==English==\n===Adjective===\n# Holding fast." } }),
      );
    const entry = await lookupEnglishWord("tenacious");
    assert.equal(entry?.url, "https://en.wiktionary.org/wiki/tenacious#English");
    assert.match(entry?.evidence ?? "", /Holding fast/);
  } finally {
    globalThis.fetch = original;
  }
});
