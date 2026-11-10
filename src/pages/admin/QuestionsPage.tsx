import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  approveQuestion,
  listQuestions,
  rejectQuestion,
  type QuestionWithSources,
} from "@/services/questions";

export function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithSources[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setQuestions(await listQuestions());
  }

  useEffect(() => {
    refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Question bank"
        description="Review source-grounded drafts. Approve before they can be snapshotted into an examination."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {questions.length === 0 ? (
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
              <p className="break-words font-medium">{question.question_text}</p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                <li className="break-words">A. {question.option_a}</li>
                <li className="break-words">B. {question.option_b}</li>
                <li className="break-words">C. {question.option_c}</li>
                <li className="break-words">D. {question.option_d}</li>
              </ul>
              <p className="mt-2 text-xs">Correct: {question.correct_option}</p>
              {question.explanation ? (
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {question.explanation}
                </p>
              ) : null}
              {question.sources?.map((source) => (
                <p key={source.id} className="mt-2 break-words text-xs text-muted-foreground">
                  Source page {source.page_number}: {source.supporting_text}
                </p>
              ))}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    approveQuestion(question.id).then(() => refresh())
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    rejectQuestion(question.id).then(() => refresh())
                  }
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
