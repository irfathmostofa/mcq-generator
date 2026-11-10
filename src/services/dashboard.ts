import { api } from "@/lib/api";
import type { DashboardStats, Examination } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const data = await api<{ stats: DashboardStats }>("/api/dashboard");
  return data.stats;
}

export async function getRecentExams(): Promise<Examination[]> {
  const data = await api<{ recent_exams: Examination[] }>("/api/dashboard");
  return data.recent_exams;
}
