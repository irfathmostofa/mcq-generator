import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { MCQ_PROMPT_VERSION } from "../_shared/mcq-schema.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  return jsonResponse({
    status: "not_implemented",
    prompt_version: MCQ_PROMPT_VERSION,
    message:
      "Phase 3: retrieve chunks, call Gemini with structured JSON, validate, persist draft questions.",
  });
});
