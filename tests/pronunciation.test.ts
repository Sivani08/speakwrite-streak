import assert from "node:assert/strict";
import test from "node:test";
import {
  containsTarget,
  parseAssessment,
  pronunciationPassed,
  validateWav,
} from "../src/lib/pronunciation.ts";

const response = (score: number) => ({
  RecognitionStatus: "Success",
  NBest: [
    {
      Display: "She is eloquent.",
      Words: [
        { Word: "eloquent", PronunciationAssessment: { AccuracyScore: score, ErrorType: "None" } },
      ],
    },
  ],
});
test("own sentence matching accepts case and punctuation, rejects missing or partial words", () => {
  assert.equal(containsTarget("  She is ELOQUENT!  ", "eloquent"), true);
  for (const text of ["", "She is kind.", "She speaks eloquently."])
    assert.equal(containsTarget(text, "eloquent"), false);
});
test("79 and 79.9 fail; 80 passes only with target detection", () => {
  assert.equal(parseAssessment(response(79), "eloquent").passed, false);
  assert.equal(parseAssessment(response(79.9), "eloquent").passed, false);
  assert.equal(parseAssessment(response(80), "eloquent").passed, true);
  assert.equal(pronunciationPassed(false, 90), false);
});
test("retry sequence evaluates each attempt independently", () => {
  assert.deepEqual(
    [61, 72, 78, 86].map((score) => parseAssessment(response(score), "eloquent").passed),
    [false, false, false, true],
  );
});
test("missing spoken target fails even if provider word score is high", () => {
  const raw = response(95);
  raw.NBest[0]!.Display = "She is kind.";
  const result = parseAssessment(raw, "eloquent");
  assert.equal(result.targetWordDetected, false);
  assert.equal(result.passed, false);
});
test("transcript alone and invalid provider scores never unlock Continue", () => {
  assert.throws(
    () =>
      parseAssessment(
        { RecognitionStatus: "Success", DisplayText: "She is eloquent." },
        "eloquent",
      ),
    /transcript alone/,
  );
  for (const score of [NaN, Infinity, -1, 101])
    assert.throws(() => parseAssessment(response(score), "eloquent"));
  assert.throws(
    () => parseAssessment({ RecognitionStatus: "NoMatch" }, "eloquent"),
    /record again/,
  );
});
test("omitted target cannot pass; repeated words use weakest actual target score", () => {
  const raw = response(90);
  raw.NBest[0]!.Words[0]!.PronunciationAssessment.ErrorType = "Omission";
  assert.throws(() => parseAssessment(raw, "eloquent"));
  raw.NBest[0]!.Words[0]!.PronunciationAssessment.ErrorType = "None";
  raw.NBest[0]!.Words.push({
    Word: "eloquent",
    PronunciationAssessment: { AccuracyScore: 70, ErrorType: "Mispronunciation" },
  });
  assert.equal(parseAssessment(raw, "eloquent").pronunciationScore, 70);
});
test("recorder WAV validates format, duration and header integrity", () => {
  const wav = Buffer.alloc(32044);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(32000, 40);
  assert.equal(validateWav(wav.toString("base64")).length, 32044);
  wav.writeUInt16LE(2, 22);
  assert.throws(() => validateWav(wav.toString("base64")));
  assert.throws(() => validateWav(Buffer.alloc(4096).toString("base64")));
  assert.throws(() => validateWav("invalid!"));
});
