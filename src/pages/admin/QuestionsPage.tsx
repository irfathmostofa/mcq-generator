import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  approveQuestion,
  listQuestions,
  rejectQuestion,
  type QuestionWithSources,
} from "@/services/questions";

export function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithSources[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setQuestions(await listQuestions());
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to load questions",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function onApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await approveQuestion(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await rejectQuestion(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Question bank"
        description="Review source-grounded drafts. Approve before they can be snapshotted into an examination."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          title="No questions"
          description="Generate MCQs from processed PDFs. Uncertain items stay flagged until reviewed."
        />
      ) : (
        <ul className="space-y-3">
          {questions.map((question) => (
            <li key={question.id} className="rounded-lg border p-3 sm:p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge>{question.status}</Badge>
                <Badge variant="secondary">{question.difficulty}</Badge>
                {question.is_uncertain ? (
                  <Badge variant="destructive">uncertain</Badge>
                ) : null}
              </div>
              <p className="bn font-medium">{question.question_text}</p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                <li className="bn">A. {question.option_a}</li>
                <li className="bn">B. {question.option_b}</li>
                <li className="bn">C. {question.option_c}</li>
                <li className="bn">D. {question.option_d}</li>
              </ul>
              <p className="mt-2 text-xs">Correct: {question.correct_option}</p>
              {question.explanation ? (
                <p className="bn mt-1 text-xs text-muted-foreground">
                  {question.explanation}
                </p>
              ) : null}
              {question.sources?.map((source) => (
                <p
                  key={source.id}
                  className="bn mt-2 text-xs text-muted-foreground"
                >
                  {source.supporting_text}
                </p>
              ))}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busyId === question.id}
                  onClick={() => void onApprove(question.id)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === question.id}
                  onClick={() => void onReject(question.id)}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
