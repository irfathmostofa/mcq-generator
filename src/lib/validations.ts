import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const subjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
});

export const topicSchema = z.object({
  subject_id: z.string().min(1),
  parent_id: z.string().min(1).nullable().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
});

export const resourceUploadSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  subject_id: z.string().min(1),
  topic_id: z.string().min(1).optional(),
  category: z.enum([
    "previous_question_paper",
    "previous_answer_sheet",
    "subject_content",
    "topic_content",
    "study_material",
    "notes",
    "other",
  ]),
});

export const generationConfigSchema = z
  .object({
    examination_title: z.string().min(3).max(200),
    subject_id: z.string().min(1),
    topic_ids: z.array(z.string().min(1)).min(1),
    resource_ids: z.array(z.string().min(1)).min(1),
    number_of_questions: z.number().int().min(1).max(200),
    total_marks: z.number().positive(),
    marks_per_question: z.number().positive(),
    negative_marking: z.number().min(0),
    difficulty_distribution: z.object({
      easy: z.number().min(0).max(100),
      medium: z.number().min(0).max(100),
      hard: z.number().min(0).max(100),
    }),
    language: z.enum(["en", "bn"]),
    options_per_question: z.literal(4),
    additional_instructions: z.string().max(2000).optional(),
  })
  .refine(
    (value) =>
      value.difficulty_distribution.easy +
        value.difficulty_distribution.medium +
        value.difficulty_distribution.hard ===
      100,
    { message: "Difficulty distribution must total 100%" },
  )
  .refine(
    (value) =>
      Math.abs(
        value.number_of_questions * value.marks_per_question - value.total_marks,
      ) < 1e-9,
    { message: "Number of questions must equal total marks ÷ marks per question" },
  );

export const participantSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
});

export const examinationSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(4000).optional(),
  subject_id: z.string().min(1),
  marks_per_question: z.number().positive(),
  negative_marking: z.number().min(0),
  time_limit_minutes: z.number().int().positive().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  max_attempts: z.number().int().min(1).max(10),
  randomize_questions: z.boolean(),
  randomize_options: z.boolean(),
  result_visibility: z.enum(["immediate", "after_close", "hidden"]),
  show_correct_answers: z.boolean(),
  show_explanations: z.boolean(),
});

export const questionEditSchema = z.object({
  question_text: z.string().min(5),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_option: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(5),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type TopicInput = z.infer<typeof topicSchema>;
export type ResourceUploadInput = z.infer<typeof resourceUploadSchema>;
export type GenerationConfigInput = z.infer<typeof generationConfigSchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
export type ExaminationInput = z.infer<typeof examinationSchema>;
export type QuestionEditInput = z.infer<typeof questionEditSchema>;
