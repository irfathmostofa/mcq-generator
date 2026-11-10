export const MCQ_PROMPT_VERSION = "v1";

export type GeneratedMcq = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  source_resource_id: string;
  source_chunk_id: string;
  source_page_number: number;
  supporting_text: string;
  is_uncertain: boolean;
  uncertainty_reason: string | null;
};

export const generatedMcqKeys = [
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
  "explanation",
  "difficulty",
  "topic",
  "source_resource_id",
  "source_chunk_id",
  "source_page_number",
  "supporting_text",
  "is_uncertain",
  "uncertainty_reason",
] as const;
