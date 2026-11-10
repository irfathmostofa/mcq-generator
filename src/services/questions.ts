import { api } from "@/lib/api";
import type { Question, QuestionSource } from "@/types";
import type { QuestionEditInput } from "@/lib/validations";

export type QuestionWithSources = Question & { sources?: QuestionSource[] };

export function listQuestions(filters?: {
  subject_id?: string;
  topic_id?: string;
  difficulty?: string;
  status?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.subject_id) params.set("subject_id", filters.subject_id);
  if (filters?.topic_id) params.set("topic_id", filters.topic_id);
  if (filters?.difficulty) params.set("difficulty", filters.difficulty);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  const query = params.toString();
  return api<QuestionWithSources[]>(`/api/questions${query ? `?${query}` : ""}`);
}

export function updateQuestion(id: string, input: QuestionEditInput) {
  return api<Question>(`/api/questions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function approveQuestion(id: string) {
  return api<Question>(`/api/questions/${id}/approve`, { method: "POST" });
}

export function rejectQuestion(id: string) {
  return api<Question>(`/api/questions/${id}/reject`, { method: "POST" });
}
