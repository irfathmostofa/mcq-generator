import { api } from "@/lib/api";
import type { GenerationConfig, GenerationJob } from "@/types";

export function startGeneration(
  config: GenerationConfig,
  idempotencyKey: string,
) {
  return api<GenerationJob>("/api/generate", {
    method: "POST",
    body: JSON.stringify({ config, idempotency_key: idempotencyKey }),
  });
}
