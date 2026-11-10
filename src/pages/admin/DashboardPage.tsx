import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { getDashboardStats, getRecentExams } from "@/services/dashboard";
import type { DashboardStats, Examination } from "@/types";

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exams, setExams] = useState<Examination[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDashboardStats(), getRecentExams()])
      .then(([nextStats, nextExams]) => {
        setStats(nextStats);
        setExams(nextExams);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      });
  }, []);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Resource, question, examination, and participant totals."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title="Resources" value={stats?.total_resources ?? 0} />
        <StatCard title="Subjects" value={stats?.total_subjects ?? 0} />
        <StatCard title="Topics" value={stats?.total_topics ?? 0} />
        <StatCard title="Questions" value={stats?.total_questions ?? 0} />
        <StatCard
          title="Published exams"
          value={stats?.total_published_exams ?? 0}
        />
        <StatCard title="Participants" value={stats?.total_participants ?? 0} />
        <StatCard
          title="Completed exams"
          value={stats?.total_completed_exams ?? 0}
        />
      </div>
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent examinations</h2>
        {exams.length === 0 ? (
          <EmptyState
            title="No examinations yet"
            description="Create subjects, upload PDFs, generate MCQs, then publish an exam."
          />
        ) : (
          <ul className="space-y-2">
            {exams.map((exam) => (
              <li
                key={exam.id}
                className="flex flex-col gap-1 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="break-words font-medium">{exam.title}</span>
                <span className="text-muted-foreground">{exam.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
