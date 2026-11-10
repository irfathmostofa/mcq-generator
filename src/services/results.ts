import { api } from "@/lib/api";
import type { ExamResult } from "@/types";

export type ResultRow = ExamResult & {
  full_name?: string;
  email?: string;
  phone?: string;
  examination_title?: string;
};

export function listResults(filters?: { examination_id?: string }) {
  const params = new URLSearchParams();
  if (filters?.examination_id) params.set("examination_id", filters.examination_id);
  const query = params.toString();
  return api<ResultRow[]>(`/api/results${query ? `?${query}` : ""}`);
}
