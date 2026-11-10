import { z } from "zod";

export const generatedMcqSchema = z.object({
  question_text: z.string().min(5),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_option: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(5),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topic: z.string().min(1),
  source_resource_id: z.string().min(1),
  source_chunk_id: z.string().min(1),
  source_page_number: z.number().int().positive(),
  supporting_text: z.string().min(10),
  is_uncertain: z.boolean(),
  uncertainty_reason: z.string().nullable(),
});

export const generatedMcqBatchSchema = z.object({
  questions: z.array(generatedMcqSchema).min(1),
});

export type ValidatedMcq = z.infer<typeof generatedMcqSchema>;

export type ValidationResult = {
  valid: ValidatedMcq[];
  rejected: Array<{ index: number; reasons: string[] }>;
};

export function validateGeneratedBatch(payload: unknown): ValidationResult {
  const parsed = generatedMcqBatchSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      valid: [],
      rejected: [{ index: -1, reasons: parsed.error.issues.map((i) => i.message) }],
    };
  }

  const valid: ValidatedMcq[] = [];
  const rejected: ValidationResult["rejected"] = [];

  parsed.data.questions.forEach((question, index) => {
    const reasons: string[] = [];
    const options = [
      question.option_a,
      question.option_b,
      question.option_c,
      question.option_d,
    ];
    if (new Set(options.map((item) => item.trim().toLowerCase())).size < 4) {
      reasons.push("Options must be unique");
    }
    if (
      !question.supporting_text
        .toLowerCase()
        .includes(question.question_text.slice(0, 12).toLowerCase()) &&
      question.supporting_text.length < 20
    ) {
      reasons.push("Supporting text is too weak");
    }
    if (reasons.length > 0) {
      rejected.push({ index, reasons });
    } else {
      valid.push(question);
    }
  });

  return { valid, rejected };
}
