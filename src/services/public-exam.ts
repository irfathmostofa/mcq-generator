import { api } from "@/lib/api";
import type { ParticipantInput } from "@/lib/validations";
import type { ExamResult, Examination } from "@/types";

export type PublicQuestion = {
  id: string;
  examination_id: string;
  sort_order: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
};

export type PublicExam = Pick<
  Examination,
  | "id"
  | "public_slug"
  | "title"
  | "description"
  | "instructions"
  | "total_questions"
  | "total_marks"
  | "time_limit_minutes"
  | "starts_at"
  | "ends_at"
  | "result_visibility"
  | "status"
>;

export function fetchPublicExam(slug: string) {
  return api<{ exam: PublicExam; questions: PublicQuestion[] }>(
    `/api/public/exams/${slug}`,
  );
}

export function startExam(slug: string, participant: ParticipantInput) {
  return api<{
    access_token: string;
    attempt_id: string;
    deadline_at: string | null;
    exam: PublicExam;
    questions: PublicQuestion[];
  }>(`/api/public/exams/${slug}/start`, {
    method: "POST",
    body: JSON.stringify(participant),
  });
}

export function saveAnswers(
  accessToken: string,
  answers: Array<{
    examination_question_id: string;
    selected_option: string | null;
    marked_for_review: boolean;
  }>,
) {
  return api("/api/public/attempts/save", {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken, answers }),
  });
}

export function submitExam(
  accessToken: string,
  answers: Array<{
    examination_question_id: string;
    selected_option: string | null;
    marked_for_review: boolean;
  }>,
) {
  return api<{ result: ExamResult; already_submitted?: boolean }>(
    "/api/public/attempts/submit",
    {
      method: "POST",
      body: JSON.stringify({ access_token: accessToken, answers }),
    },
  );
}

export function fetchAttemptResult(token: string) {
  return api<{ result?: ExamResult; hidden?: boolean; exam: PublicExam }>(
    `/api/public/attempts/${token}/result`,
  );
}
