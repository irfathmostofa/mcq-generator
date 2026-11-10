import type { ResourceCategory } from "@/types";

export const APP_NAME = "AI MCQ Exam Platform";

export const RESOURCE_CATEGORIES: { value: ResourceCategory; label: string }[] =
  [
    { value: "previous_question_paper", label: "Previous question papers" },
    { value: "previous_answer_sheet", label: "Previous answer sheets" },
    { value: "subject_content", label: "Subject-wise educational content" },
    { value: "topic_content", label: "Topic-wise educational content" },
    { value: "study_material", label: "Study materials" },
    { value: "notes", label: "Notes and reference documents" },
    { value: "other", label: "Other educational resources" },
  ];

export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_PDF_TYPE = "application/pdf";
export const STORAGE_BUCKET = "resources";
export const DEFAULT_CHUNK_SIZE = 1200;
export const PROMPT_VERSION = "v1";

export const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { to: "/admin/subjects", label: "Subjects", icon: "BookOpen" },
  { to: "/admin/resources", label: "Resources", icon: "FileText" },
  { to: "/admin/generate", label: "Generate MCQs", icon: "Sparkles" },
  { to: "/admin/questions", label: "Question Bank", icon: "Library" },
  { to: "/admin/exams", label: "Examinations", icon: "ClipboardList" },
  { to: "/admin/results", label: "Results", icon: "BarChart3" },
] as const;
