# Additional Development Prompt: Improve the AI MCQ Generation Engine

Now focus exclusively on improving the AI MCQ generation engine.

I want this to be the strongest module in the entire platform.

Analyze the existing implementation and improve it so that:

1. It retrieves relevant content from all selected PDFs.
2. It understands the distinction between previous question papers, answer keys, and subject materials.
3. It learns question patterns from previous examinations.
4. It uses subject materials as factual references.
5. It generates original, meaningful, examination-standard MCQs.
6. Every correct answer is supported by extracted source content.
7. Every question contains a source document and page reference.
8. It avoids duplicate questions.
9. It identifies contradictory information.
10. It flags unsupported or uncertain questions instead of guessing.
11. It generates questions in Bangla and English.
12. It supports configurable difficulty distributions.
13. It supports batch generation without losing previously generated questions.
14. It validates the AI response before saving questions.

Test the engine using multiple real PDF resources.

Do not simply improve the appearance of the generation interface. Improve the actual retrieval, prompting, generation, and validation pipeline.

Show me examples of generated questions alongside their original supporting source passages so I can evaluate their factual accuracy.

Do not claim that the engine is accurate without testing it.

## Additional technical requirements

- Use structured JSON output with a strict schema.
- Validate all AI output server-side before database insertion.
- Keep source chunk IDs, document IDs, and page numbers attached to each generated question.
- Distinguish source evidence from AI-generated explanations.
- Never treat a previous question paper's answer key as unquestionably correct if it conflicts with authoritative subject material.
- Record generation model, prompt version, selected resource IDs, and generation timestamp for traceability.
- Make generation idempotent where practical, so retries do not create duplicate question sets.
- Respect API rate limits and retry only transient failures.
- Preserve successfully generated batches when another batch fails.
- Require administrator review before publication.

Deliver a short test report containing:
- Number of questions generated.
- Number passing structural validation.
- Number with traceable source evidence.
- Number flagged as uncertain.
- Duplicate detection results.
- Any unresolved limitations.
