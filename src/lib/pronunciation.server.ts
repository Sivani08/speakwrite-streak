import { createClient } from "@supabase/supabase-js";
import { parseAssessment, validateWav, type Assessment } from "./pronunciation";

export interface PronunciationProvider {
  assess(input: { audioBase64: string; sentence: string; word: string }): Promise<Assessment>;
}

export function speakingAdmin() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key)
    throw new Error(
      "Speaking practice is awaiting secure server configuration. Your challenge progress has been preserved.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_secret_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const pronunciationProvider: PronunciationProvider = {
  async assess({ audioBase64, sentence, word }) {
    const key = process.env["AZURE_SPEECH_KEY"];
    const region = process.env["AZURE_SPEECH_REGION"];
    const endpoint =
      process.env["AZURE_SPEECH_ENDPOINT"] ??
      (region && /^[a-z0-9-]+$/.test(region)
        ? `https://${region}.stt.speech.microsoft.com`
        : undefined);
    if (!key || !endpoint)
      throw new Error(
        "Pronunciation assessment is not configured yet. Your sentence and attempts are preserved; a transcript alone cannot receive a pronunciation score.",
      );
    const url = new URL(endpoint);
    if (
      url.protocol !== "https:" ||
      !/^[a-z0-9-]+\.(cognitiveservices\.azure\.com|stt\.speech\.microsoft\.com)$/.test(
        url.hostname,
      ) ||
      url.username ||
      url.password
    )
      throw new Error(
        "The pronunciation service endpoint needs to be configured by the app owner.",
      );
    url.pathname = `${url.hostname.endsWith(".cognitiveservices.azure.com") ? "/stt" : ""}/speech/recognition/conversation/cognitiveservices/v1`;
    url.search = "?language=en-US&format=detailed";
    const bytes = validateWav(audioBase64);
    const config = JSON.stringify({
      ReferenceText: sentence,
      GradingSystem: "HundredMark",
      Granularity: "Word",
      Dimension: "Comprehensive",
      EnableMiscue: true,
    });
    const header = btoa(String.fromCharCode(...new TextEncoder().encode(config)));
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Pronunciation-Assessment": header,
          "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
          Accept: "application/json",
        },
        body: bytes as BodyInit,
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      throw new Error(
        "Speech analysis timed out or the network was unavailable. Try analyzing again; your recording has been kept.",
      );
    }
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "The speech service is busy. Please retry shortly."
          : "The pronunciation service could not analyze this recording. Please retry or contact the app owner if this continues.",
      );
    return parseAssessment(await response.json(), word);
  },
};
