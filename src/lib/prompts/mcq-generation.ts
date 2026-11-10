import { PROMPT_VERSION } from "@/lib/constants";
import type { GenerationConfig } from "@/types";

export { PROMPT_VERSION };

export type ChunkContext = {
  resource_id: string;
  chunk_id: string;
  page_number: number;
  category: string;
  title: string;
  content: string;
};

export function buildMcqPrompt(
  config: GenerationConfig,
  chunks: ChunkContext[],
): string {
  const materials = chunks
    .filter((chunk) =>
      ["subject_content", "topic_content", "study_material", "notes"].includes(
        chunk.category,
      ),
    )
    .map(formatChunk)
    .join("\n\n");

  const previousPapers = chunks
    .filter((chunk) => chunk.category === "previous_question_paper")
    .map(formatChunk)
    .join("\n\n");

  const answerKeys = chunks
    .filter((chunk) => chunk.category === "previous_answer_sheet")
    .map(formatChunk)
    .join("\n\n");

  return [
    `Prompt version: ${PROMPT_VERSION}`,
    "You generate original examination-standard MCQs.",
    "Subject materials are the only factual source.",
    "Previous papers teach style and topic frequency. Do not copy them.",
    "If an answer key conflicts with subject material, flag is_uncertain and record both sources.",
    "Never invent facts. If evidence is missing, set is_uncertain=true.",
    "Every question must cite source_resource_id, source_chunk_id, source_page_number, and supporting_text copied from a chunk.",
    `Language: ${config.language}`,
    `Count: ${config.number_of_questions}`,
    `Difficulty: easy ${config.difficulty_distribution.easy}%, medium ${config.difficulty_distribution.medium}%, hard ${config.difficulty_distribution.hard}%`,
    config.additional_instructions
      ? `Extra instructions: ${config.additional_instructions}`
      : "",
    "Return JSON: { questions: GeneratedMcq[] }",
    "## Subject materials",
    materials || "(none)",
    "## Previous question papers (pattern only)",
    previousPapers || "(none)",
    "## Answer keys (not authoritative if they conflict)",
    answerKeys || "(none)",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatChunk(chunk: ChunkContext): string {
  return [
    `[resource=${chunk.resource_id} chunk=${chunk.chunk_id} page=${chunk.page_number} title=${chunk.title}]`,
    chunk.content,
  ].join("\n");
}
