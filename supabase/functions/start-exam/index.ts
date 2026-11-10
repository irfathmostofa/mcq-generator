import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return jsonResponse({
    status: "not_implemented",
    message:
      "Validate participant fields, enforce max attempts, create attempt with server deadline, return access_token.",
  });
});
