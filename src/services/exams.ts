import { api } from "@/lib/api";
import type { Examination } from "@/types";
import type { ExaminationInput } from "@/lib/validations";

export function listExaminations() {
  return api<Examination[]>("/api/exams");
}

export function createExamination(input: ExaminationInput) {
  return api<Examination>("/api/exams", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function publishExamination(id: string) {
  return api<Examination>(`/api/exams/${id}/publish`, { method: "POST" });
}

export function unpublishExamination(id: string) {
  return api<Examination>(`/api/exams/${id}/unpublish`, { method: "POST" });
}

export function closeExamination(id: string) {
  return api<Examination>(`/api/exams/${id}/close`, { method: "POST" });
}
