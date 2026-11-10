import type { Question } from "@/types";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isDuplicateQuestion(
  candidate: string,
  existing: Pick<Question, "question_text">[],
): boolean {
  const needle = normalize(candidate);
  return existing.some((question) => normalize(question.question_text) === needle);
}

export function similarQuestions(
  candidate: string,
  existing: Pick<Question, "id" | "question_text">[],
  threshold = 0.86,
): Array<{ id: string; score: number }> {
  const needle = tokenize(candidate);
  return existing
    .map((question) => ({
      id: question.id,
      score: jaccard(needle, tokenize(question.question_text)),
    }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

function tokenize(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter((token) => token.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
