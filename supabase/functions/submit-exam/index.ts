import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return jsonResponse({
    status: "not_implemented",
    message:
      "Idempotent submit. Reject after deadline. Trigger server-side evaluation.",
  });
});
