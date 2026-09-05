const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the real server handlers with isolated database/provider boundaries.
function harness({
  challenge = { id: "c", word: "eloquent", stage: "pronounce", status: "in_progress" },
  passes = [],
  providerError = false,
} = {}) {
  const updates = [];
  const filters = [];
  const writes = [];
  const client = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          filters.push([table, key, value]);
          return query;
        },
        gte(key, value) {
          filters.push([table, key, value]);
          return query;
        },
        update(value) {
          updates.push(value);
          return query;
        },
        async single() {
          return { data: challenge, error: null };
        },
        async limit() {
          return { data: passes, error: null };
        },
        async maybeSingle() {
          return { data: null, error: null };
        },
      };
      return query;
    },
    async rpc(name, args) {
      writes.push(args);
      return {
        data: { id: args.p_id, passed: args.p_detected && args.p_score >= args.p_threshold },
        error: null,
      };
    },
  };
  const exports = {};
  const source = fs.readFileSync(
    require("node:path").join(__dirname, "../src/lib/speaking.server.ts"),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "./pronunciation")
        return {
          PRONUNCIATION_PASS_THRESHOLD: 80,
          containsTarget: (sentence, word) => sentence.toLowerCase().split(/\W+/).includes(word),
        };
      if (name === "./pronunciation.server")
        return {
          speakingAdmin: () => client,
          pronunciationProvider: {
            async assess() {
              if (providerError) throw new Error("Network unavailable");
              return {
                transcript: "She is eloquent.",
                targetWordDetected: true,
                pronunciationScore: 79,
                feedback: "Try again",
              };
            },
          },
        };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { api: exports, ctx: { supabase: client, userId: "owner" }, updates, filters, writes };
}
test("server refuses Continue without a verified pass and makes no progress write", async () => {
  const h = harness();
  await assert.rejects(h.api.proceedSpeaking(h.ctx, "c"), /Pass the pronunciation/);
  assert.equal(h.updates.length, 0);
  assert.ok(h.filters.some((f) => f[1] === "user_id" && f[2] === "owner"));
  assert.ok(h.filters.some((f) => f[1] === "pronunciation_score" && f[2] === 80));
});
test("server continues only on separate Continue after saved pass (including refresh)", async () => {
  const h = harness({ passes: [{ id: "verified" }] });
  await h.api.proceedSpeaking(h.ctx, "c");
  assert.equal(h.updates[0].stage, "speak");
});
test("server ignores forged client scores and analyzing never advances", async () => {
  const h = harness();
  const result = await h.api.assessSpeaking(h.ctx, {
    challengeId: "c",
    attemptId: "a",
    sentence: "She is eloquent.",
    audioBase64: "audio",
    pronunciationScore: 100,
    passed: true,
  });
  assert.equal(result.passed, false);
  assert.equal(h.writes[0].p_score, 79);
  assert.equal(h.updates.length, 0);
});
test("API failure and missing typed word preserve challenge progress", async () => {
  const h = harness({ providerError: true });
  await assert.rejects(
    h.api.assessSpeaking(h.ctx, { challengeId: "c", sentence: "She is eloquent." }),
    /Network unavailable/,
  );
  await assert.rejects(
    h.api.assessSpeaking(h.ctx, { challengeId: "c", sentence: "She is kind." }),
    /Please use/,
  );
  assert.equal(h.writes.length, 0);
  assert.equal(h.updates.length, 0);
});
test("missing or wrong-stage challenge cannot be assessed or advanced", async () => {
  for (const challenge of [null, { stage: "write", status: "in_progress" }]) {
    const h = harness({ challenge });
    await assert.rejects(h.api.proceedSpeaking(h.ctx, "c"));
    await assert.rejects(
      h.api.assessSpeaking(h.ctx, { challengeId: "c", sentence: "She is eloquent." }),
    );
    assert.equal(h.updates.length, 0);
    assert.equal(h.writes.length, 0);
  }
});
