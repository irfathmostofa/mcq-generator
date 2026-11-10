import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return jsonResponse({
    status: "not_implemented",
    message:
      "Return published exam metadata and questions WITHOUT correct_option or explanation.",
  });
});
