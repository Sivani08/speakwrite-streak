const API = "https://en.wiktionary.org/w/api.php";
export type DictionaryEntry = {
  word: string;
  evidence: string;
  url: string;
  retrievedAt: string;
};
const cache = new Map<string, { entry: DictionaryEntry | null; expires: number }>();

export function englishEvidence(wikitext: string): string | null {
  const english = wikitext.match(/^==\s*English\s*==\s*\n([\s\S]*?)(?=^==[^=]|$(?![\s\S]))/m)?.[1];
  if (!english) return null;
  // Keep definitions and etymologies, not long quotations or translation lists.
  return (
    english
      .split(/(?=^={3,}[^=])/m)
      .filter((section) =>
        /^={3,}\s*(Etymology(?: \d+)?|Noun|Verb|Adjective|Adverb|Prefix|Suffix|Root|Interjection|Preposition|Conjunction|Pronoun|Determiner)\s*={3,}/.test(
          section,
        ),
      )
      .map((section) =>
        section
          .split("\n")
          .filter((line) => !/^#[:*]|^\*.*quote|^\{\{quote/.test(line))
          .join("\n"),
      )
      .join("\n")
      .slice(0, 14000) || null
  );
}

export async function lookupEnglishWord(input: string): Promise<DictionaryEntry | null> {
  const word = input.trim().toLowerCase();
  if (!/^[a-z][a-z'-]{0,59}$/.test(word)) return null;
  const cached = cache.get(word);
  if (cached && cached.expires > Date.now()) return cached.entry;
  const query = new URLSearchParams({
    action: "parse",
    page: word,
    prop: "wikitext",
    format: "json",
    formatversion: "2",
  });
  let response: Response;
  try {
    response = await fetch(`${API}?${query}`, {
      headers: { "User-Agent": "SpeakWrite/1.0 (https://github.com/Sivani08/speakwrite-streak)" },
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new Error(
      "The live dictionary is temporarily unavailable. Please retry; your answers are preserved.",
    );
  }
  if (!response.ok)
    throw new Error("The live dictionary is temporarily unavailable. Please retry shortly.");
  const body = (await response.json()) as {
    parse?: { wikitext?: string };
    error?: { code?: string };
  };
  if (body.error && body.error.code !== "missingtitle")
    throw new Error("The dictionary could not check this word. Please retry.");
  const evidence = body.parse?.wikitext ? englishEvidence(body.parse.wikitext) : null;
  const entry = evidence
    ? {
        word,
        evidence,
        url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#English`,
        retrievedAt: new Date().toISOString(),
      }
    : null;
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(word, { entry, expires: Date.now() + 15 * 60 * 1000 });
  return entry;
}

export async function requireEnglishWord(word: string) {
  const entry = await lookupEnglishWord(word);
  if (!entry)
    throw new Error(
      `No English dictionary entry was found for “${word}”. Check the spelling or choose another word.`,
    );
  return entry;
}
