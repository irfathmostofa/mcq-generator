import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveAnswers, submitExam, type PublicQuestion } from "@/services/public-exam";
import type { CorrectOption } from "@/types";

type AttemptState = {
  accessToken: string;
  deadlineAt: string | null;
  questions: PublicQuestion[];
};

function remainingLabel(deadlineAt: string | null): string {
  if (!deadlineAt) return "No time limit";
  const ms = new Date(deadlineAt).getTime() - Date.now();
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ExamTakePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CorrectOption>>({});
  const [review, setReview] = useState<Record<string, boolean>>({});
  const [clock, setClock] = useState("00:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const finishingRef = useRef(false);
  const answersRef = useRef(answers);
  const reviewRef = useRef(review);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    reviewRef.current = review;
  }, [review]);

  useEffect(() => {
    if (!slug) return;
    const raw = sessionStorage.getItem(`attempt:${slug}`);
    if (!raw) {
      navigate(`/exam/${slug}`, { replace: true });
      return;
    }
    try {
      setAttempt(JSON.parse(raw) as AttemptState);
    } catch {
      navigate(`/exam/${slug}`, { replace: true });
    }
  }, [navigate, slug]);

  const questions = useMemo(() => attempt?.questions ?? [], [attempt]);
  const current = questions[index];
  const optionText = current
    ? {
        A: current.option_a,
        B: current.option_b,
        C: current.option_c,
        D: current.option_d,
      }
    : null;
  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]).length,
    [answers, questions],
  );

  const payload = useCallback(() => {
    const currentAnswers = answersRef.current;
    const currentReview = reviewRef.current;
    return questions.map((question) => ({
      examination_question_id: question.id,
      selected_option: currentAnswers[question.id] ?? null,
      marked_for_review: Boolean(currentReview[question.id]),
    }));
  }, [questions]);

  const persist = useCallback(async () => {
    if (!attempt) return;
    await saveAnswers(attempt.accessToken, payload());
  }, [attempt, payload]);

  const finish = useCallback(async () => {
    if (!attempt || !slug || finishingRef.current) return;
    finishingRef.current = true;
    setPending(true);
    try {
      const submitted = await submitExam(attempt.accessToken, payload());
      sessionStorage.setItem(`resultToken:${slug}`, attempt.accessToken);
      if (submitted.result) {
        sessionStorage.setItem(`result:${slug}`, JSON.stringify(submitted.result));
      }
      sessionStorage.removeItem(`attempt:${slug}`);
      navigate(`/exam/${slug}/result`, { replace: true });
    } catch (err) {
      finishingRef.current = false;
      setError(err instanceof Error ? err.message : "Submit failed");
      setPending(false);
    }
  }, [attempt, navigate, payload, slug]);

  useEffect(() => {
    if (!attempt) return;
    const tick = () => {
      setClock(remainingLabel(attempt.deadlineAt));
      if (
        attempt.deadlineAt &&
        new Date(attempt.deadlineAt).getTime() <= Date.now() &&
        !finishingRef.current
      ) {
        void finish();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, finish]);

  if (!attempt) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Loading examination...
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          This examination has no questions yet.
        </CardContent>
      </Card>
    );
  }

  if (!current) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Loading examination...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base sm:text-lg">
          Question {index + 1} / {questions.length}
        </CardTitle>
        <span className="text-sm font-medium tabular-nums">{clock}</span>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <p className="mb-2 text-xs text-muted-foreground">
          Answered {answeredCount}/{questions.length}. Correct answers are not
          sent to this page.
        </p>
        <div className="mb-4 flex flex-wrap gap-1">
          {questions.map((question, questionIndex) => (
            <button
              key={question.id}
              type="button"
              className={`h-8 w-8 rounded border text-xs ${
                questionIndex === index
                  ? "border-primary bg-primary text-primary-foreground"
                  : answers[question.id]
                    ? "border-primary/40 bg-primary/10"
                    : "border-input"
              }`}
              onClick={() => setIndex(questionIndex)}
            >
              {questionIndex + 1}
            </button>
          ))}
        </div>
        <p className="break-words font-medium">{current.question_text}</p>
        {(["A", "B", "C", "D"] as const).map((option) => (
          <label key={option} className="mt-2 flex items-start gap-2 text-sm">
            <input
              className="mt-1 shrink-0"
              type="radio"
              name={current.id}
              checked={answers[current.id] === option}
              onChange={() =>
                setAnswers((prev) => ({ ...prev, [current.id]: option }))
              }
            />
            <span className="break-words">
              {option}. {optionText?.[option]}
            </span>
          </label>
        ))}
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(review[current.id])}
            onChange={(event) =>
              setReview((prev) => ({
                ...prev,
                [current.id]: event.target.checked,
              }))
            }
          />
          Mark for review
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            variant="outline"
            disabled={index === 0}
            onClick={() => setIndex((value) => value - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={index >= questions.length - 1}
            onClick={() => setIndex((value) => value + 1)}
          >
            Next
          </Button>
          <Button variant="outline" onClick={() => void persist()}>
            Save
          </Button>
          <Button disabled={pending} onClick={() => void finish()}>
            {pending ? "Submitting..." : "Submit"}
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
