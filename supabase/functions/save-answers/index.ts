import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return jsonResponse({
    status: "not_implemented",
    message:
      "Persist answers for in-progress attempts only. Reject after deadline or submission.",
  });
});
