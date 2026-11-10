export type ResourceCategory =
  | "previous_question_paper"
  | "previous_answer_sheet"
  | "subject_content"
  | "topic_content"
  | "study_material"
  | "notes"
  | "other";

export type ProcessingStatus =
  | "pending"
  | "processing"
  | "processed"
  | "ocr_required"
  | "failed";

export type QuestionStatus = "draft" | "uncertain" | "approved" | "rejected";
export type DifficultyLevel = "easy" | "medium" | "hard";
export type QuestionLanguage = "en" | "bn";
export type ExamStatus = "draft" | "published" | "unpublished" | "closed";
export type AttemptStatus =
  | "in_progress"
  | "submitted"
  | "auto_submitted"
  | "expired";
export type ResultVisibility = "immediate" | "after_close" | "hidden";
export type CorrectOption = "A" | "B" | "C" | "D";

export type AdminProfile = {
  id: string;
  full_name: string;
  role: "admin" | "super_admin";
  created_at: string;
  updated_at: string;
};

export type Subject = {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Topic = {
  id: string;
  subject_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Resource = {
  id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  topic_id: string | null;
  category: ResourceCategory;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number | null;
  page_count: number | null;
  chunk_count: number;
  processing_status: ProcessingStatus;
  extraction_error: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentChunk = {
  id: string;
  resource_id: string;
  subject_id: string | null;
  topic_id: string | null;
  page_number: number;
  chunk_index: number;
  content: string;
  token_estimate: number | null;
  created_at: string;
};

export type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: CorrectOption;
  explanation: string | null;
  difficulty: DifficultyLevel;
  language: QuestionLanguage;
  subject_id: string | null;
  topic_id: string | null;
  status: QuestionStatus;
  is_uncertain: boolean;
  uncertainty_reason: string | null;
  generation_model: string | null;
  prompt_version: string | null;
  generation_batch_id: string | null;
  generated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionSource = {
  id: string;
  question_id: string;
  resource_id: string;
  chunk_id: string | null;
  page_number: number | null;
  supporting_text: string | null;
  is_conflicting: boolean;
  created_at: string;
};

export type Examination = {
  id: string;
  public_slug: string;
  title: string;
  description: string | null;
  instructions: string | null;
  subject_id: string | null;
  status: ExamStatus;
  total_questions: number;
  total_marks: number;
  marks_per_question: number;
  negative_marking: number;
  time_limit_minutes: number | null;
  starts_at: string | null;
  ends_at: string | null;
  max_attempts: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  result_visibility: ResultVisibility;
  show_correct_answers: boolean;
  show_explanations: boolean;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExaminationQuestion = {
  id: string;
  examination_id: string;
  source_question_id: string | null;
  sort_order: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: CorrectOption;
  explanation: string | null;
  marks: number;
  created_at: string;
};

export type PublicExamQuestion = Omit<
  ExaminationQuestion,
  "correct_option" | "explanation" | "source_question_id"
>;

export type Participant = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
};

export type ExamAttempt = {
  id: string;
  examination_id: string;
  participant_id: string;
  access_token: string;
  status: AttemptStatus;
  started_at: string;
  deadline_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ParticipantAnswer = {
  id: string;
  attempt_id: string;
  examination_question_id: string;
  selected_option: CorrectOption | null;
  marked_for_review: boolean;
  answered_at: string | null;
};

export type ExamResult = {
  id: string;
  attempt_id: string;
  examination_id: string;
  participant_id: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  obtained_marks: number;
  total_marks: number;
  percentage: number;
  rank: number | null;
  created_at: string;
};

export type GenerationJob = {
  id: string;
  idempotency_key: string | null;
  examination_title: string | null;
  subject_id: string | null;
  config: GenerationConfig;
  selected_resource_ids: string[];
  model: string | null;
  prompt_version: string | null;
  status: string;
  generated_count: number;
  validated_count: number;
  uncertain_count: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GenerationConfig = {
  examination_title: string;
  subject_id: string;
  topic_ids: string[];
  resource_ids: string[];
  number_of_questions: number;
  total_marks: number;
  marks_per_question: number;
  negative_marking: number;
  difficulty_distribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  language: QuestionLanguage;
  options_per_question: 4;
  additional_instructions?: string;
};

export type DashboardStats = {
  total_resources: number;
  total_subjects: number;
  total_topics: number;
  total_questions: number;
  total_published_exams: number;
  total_participants: number;
  total_completed_exams: number;
};
