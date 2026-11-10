const DEFAULT_MODEL = "gemini-2.0-flash";

export type GeminiConfig = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
};

export async function generateJson(
  config: GeminiConfig,
  prompt: string,
): Promise<unknown> {
  const model = config.model ?? Deno.env.get("USER_LLM_MODEL") ?? DEFAULT_MODEL;
  const baseUrl =
    config.baseUrl ??
    Deno.env.get("USER_LLM_BASE_URL") ??
    "https://generativelanguage.googleapis.com/v1beta";

  const url = `${baseUrl}/models/${model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error ${response.status}: ${text}`);
  }

  const payload = await response.json();
  const text: string =
    payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return JSON.parse(text);
}
