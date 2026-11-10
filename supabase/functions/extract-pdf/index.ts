import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return jsonResponse({
    status: "not_implemented",
    message:
      "Phase 2: validate PDF, extract text with page numbers, chunk, store document_chunks. Mark ocr_required when no extractable text.",
  });
});
