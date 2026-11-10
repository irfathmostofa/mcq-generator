export function createIdempotencyKey(parts: string[]): string {
  return parts.join(":");
}
