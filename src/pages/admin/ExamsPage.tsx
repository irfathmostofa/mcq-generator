import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  closeExamination,
  createExamination,
  listExaminations,
  publishExamination,
  unpublishExamination,
} from "@/services/exams";
import { listSubjects } from "@/services/subjects";
import type { Examination, Subject } from "@/types";

export function ExamsPage() {
  const [exams, setExams] = useState<Examination[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const [nextExams, nextSubjects] = await Promise.all([
      listExaminations(),
      listSubjects(),
    ]);
    setExams(nextExams);
    setSubjects(nextSubjects);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load exams");
      })
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(null);
    setSaving(true);
    try {
      const exam = await createExamination({
        title: String(data.get("title") ?? ""),
        subject_id: String(data.get("subject_id") ?? ""),
        marks_per_question: Number(data.get("marks_per_question") ?? 1),
        negative_marking: Number(data.get("negative_marking") ?? 0),
        max_attempts: 1,
        randomize_questions: false,
        randomize_options: false,
        result_visibility: "immediate",
        show_correct_answers: false,
        show_explanations: false,
      });
      form.reset();
      setExams((prev) => [exam, ...prev.filter((item) => item.id !== exam.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exam");
    } finally {
      setSaving(false);
    }
  }

  async function runExamAction(
    examId: string,
    action: (id: string) => Promise<Examination | void>,
  ) {
    setError(null);
    setBusyId(examId);
    try {
      const next = await action(examId);
      if (next) {
        setExams((prev) =>
          prev.map((item) => (item.id === next.id ? next : item)),
        );
      } else {
        setExams(await listExaminations());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Examinations"
        description="Publish creates an immutable question snapshot and a public slug. Answer keys stay server-side."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create draft exam</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject_id">Subject</Label>
              <select
                id="subject_id"
                name="subject_id"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                required
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marks_per_question">Marks per question</Label>
              <Input
                id="marks_per_question"
                name="marks_per_question"
                type="number"
                defaultValue={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="negative_marking">Negative marking</Label>
              <Input
                id="negative_marking"
                name="negative_marking"
                type="number"
                step="0.01"
                defaultValue={0.25}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                {saving ? "Creating..." : "Create draft"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title="No examinations"
          description="Attach approved questions, then publish to get /exam/:slug."
        />
      ) : (
        <ul className="space-y-2">
          {exams.map((exam) => (
            <li
              key={exam.id}
              className="flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
            >
              <div className="min-w-0">
                <p className="break-words font-medium">{exam.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /exam/{exam.public_slug}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{exam.status}</Badge>
                <Button
                  size="sm"
                  disabled={busyId === exam.id}
                  onClick={() => void runExamAction(exam.id, publishExamination)}
                >
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard.writeText(`/exam/${exam.public_slug}`)
                  }
                >
                  Copy link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === exam.id}
                  onClick={() =>
                    void runExamAction(exam.id, unpublishExamination)
                  }
                >
                  Unpublish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === exam.id}
                  onClick={() => void runExamAction(exam.id, closeExamination)}
                >
                  Close
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
