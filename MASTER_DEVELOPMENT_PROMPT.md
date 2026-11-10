# Project: AI-Powered MCQ Generation & Online Examination Platform

Act as a Senior Full-Stack Software Architect, AI Engineer, Database Engineer, UI/UX Designer, and Security Engineer.

Your task is to design and develop a complete, responsive, AI-powered MCQ generation and online examination platform.

This must be a functional application, not merely a frontend demonstration or UI prototype.

The primary objective is to allow administrators to upload educational resources (PDF documents), use AI to generate high-quality MCQs from selected resources, review and publish examinations, and allow participants to take examinations through public links.

The system must automatically calculate results, store participant information, and allow administrators to export examination results into Excel files.

## 1. Most Important Requirements

Prioritize the following:

1. Accurate AI-powered MCQ generation from uploaded educational resources.
2. Proper PDF processing and resource organization.
3. Source-grounded questions with verifiable answers.
4. Reliable examination and automatic evaluation.
5. Secure participant information and examination management.
6. Excel-compatible result export.
7. Zero-cost architecture using available free tiers.

Do not compromise question accuracy for generation speed.
Do not invent unsupported facts or answers.
Do not expose API keys, correct answers, or confidential admin data to public users.

## 2. Technology Stack

### Frontend
- React.js
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide icons
- React Router
- React Hook Form
- Zod validation

### Backend and Database
- Supabase PostgreSQL
- Supabase Authentication
- Supabase Storage
- Supabase Edge Functions

### AI Integration
- Google Gemini API
- Use a currently available Gemini model with free-tier API access.
- Keep model selection configurable.
- Store the Gemini API key securely in server-side environment variables.
- Never expose the API key in frontend code.

### PDF Processing
- PDF.js for PDF text extraction.
- Support text-based PDF documents.
- Preserve page numbers and document references.
- Provide an extensible OCR integration point for scanned PDFs.
- Do not pretend that scanned PDFs have been successfully processed when text extraction fails.

### Excel Export
- SheetJS (xlsx).

### Deployment
- Cloudflare Pages for frontend hosting.
- Supabase for backend services.
- Supabase Edge Functions for secure AI processing.

Prefer services with free plans. Check actual current quotas and compatibility before implementation. Do not assume unlimited free usage.

Avoid unnecessary paid services, proprietary dependencies, and complicated infrastructure.

## 3. Application Architecture

Create three main application areas:

A. Admin Dashboard  
B. AI MCQ Generation Engine  
C. Public Examination Portal

The admin dashboard must be protected by authentication.

Participants must not need to create accounts. They should access examinations using unique public examination links.

The application must use a proper database-driven architecture.

## 4. Admin Dashboard

### 4.1 Dashboard Overview

Display:
- Total uploaded resources.
- Total subjects.
- Total topics.
- Total generated questions.
- Total published examinations.
- Total participants.
- Total completed examinations.
- Recent examinations.
- Recent participant activity.

Include useful statistics and charts.

### 4.2 Subject Management

Administrators can:
- Create, edit, view, and delete subjects.
- Create topics under each subject.
- Organize topics hierarchically if necessary.

Example:

Bangladesh Affairs
- Liberation War
- Language Movement
- Constitution
- Geography
- Economy

English
- Grammar
- Vocabulary
- Literature
- Reading Comprehension

General Mathematics
- Algebra
- Geometry
- Arithmetic
- Percentage

Allow subjects and topics to be created dynamically. Do not hardcode subjects.

### 4.3 Resource Management

Administrators can upload different educational resources.

Supported initial format:
- PDF

Resource categories:
1. Previous question papers.
2. Previous question answer sheets.
3. Subject-wise educational content.
4. Topic-wise educational content.
5. Study materials.
6. Notes and reference documents.
7. Other educational resources.

Every uploaded document should contain:
- Document title.
- Description.
- Subject.
- Topic.
- Resource category.
- Uploaded file.
- Upload date.
- Processing status.
- Number of extracted pages.
- Extraction status.

Allow administrators to:
- Upload multiple PDFs.
- Preview uploaded documents.
- Download documents.
- Delete documents.
- Replace documents.
- Search resources.
- Filter by subject, topic, and category.

Store original files in Supabase Storage. Store document metadata and extracted text in Supabase PostgreSQL.

### 4.4 PDF Processing Engine

When an administrator uploads a PDF:
1. Validate file type and size.
2. Upload the original PDF to Supabase Storage.
3. Extract text using PDF.js.
4. Preserve page numbers.
5. Divide extracted content into manageable chunks.
6. Store chunks in the database.
7. Associate every chunk with its original document, subject, topic, and page number.
8. Display processing progress.
9. Mark the document as successfully processed only when extraction is complete.

Important:
- Avoid sending entire large PDFs to Gemini in one request.
- Implement chunk-based processing.
- Prevent duplicate document processing.
- Handle empty, corrupted, encrypted, and unsupported PDFs.
- Allow administrators to retry failed processing.
- Display meaningful error messages.

For scanned PDFs, show an OCR-required status instead of silently treating them as successfully processed.

## 5. AI-Powered MCQ Generation Engine

THIS IS THE CORE FEATURE OF THE ENTIRE APPLICATION.

Give this module the highest development priority.

Administrators must be able to generate questions using multiple selected resources.

### 5.1 Generation Interface

Create a dedicated MCQ generation page.

Fields:
- Examination title.
- Subject.
- Selected topics.
- Selected resources.
- Number of questions.
- Total marks.
- Marks per question.
- Negative marking.
- Difficulty distribution.
- Question language.
- Question type.
- Additional AI instructions.

Allow selecting multiple PDFs from different resource categories.

Example selection:

Subject: Bangladesh Affairs

Topics:
- Liberation War
- Language Movement
- Constitution

Selected resources:
- Previous Questions 2020.pdf
- Previous Questions 2022.pdf
- Bangladesh History.pdf
- Liberation War Notes.pdf

Generation configuration:
- Number of questions: 30
- Total marks: 30
- Marks per question: 1
- Negative marking: 0.25
- Easy: 30%
- Medium: 50%
- Hard: 20%
- Language: Bangla
- Options per question: 4

Validate the configuration before generation.

### 5.2 AI Generation Workflow

The generation engine must follow these steps:

1. Receive administrator configuration.
2. Retrieve extracted text chunks from all selected resources.
3. Prioritize relevant content according to selected subjects and topics.
4. Identify important facts, concepts, definitions, dates, events, and relationships.
5. Analyze previous question papers to understand question structure, examination patterns, common question styles, difficulty levels, and frequently tested topics.
6. Generate MCQs using subject materials as the primary factual source.
7. Use previous examination papers to learn question patterns, not as an excuse to copy existing questions.
8. Validate all generated questions.
9. Save the generated question set as a draft.
10. Present the questions to the administrator for review.
11. Allow administrators to edit, delete, regenerate, approve, and publish questions.

Do not automatically publish AI-generated questions without administrator approval.

### 5.3 Required MCQ Structure

Every question must contain:
- Unique question ID.
- Question text.
- Four answer options.
- Correct answer.
- Explanation.
- Difficulty level.
- Subject.
- Topic.
- Source document.
- Source page number.
- Supporting source text.

Example:

Question: বাংলাদেশের স্বাধীনতা দিবস কবে?

Options:
A. ২১ ফেব্রুয়ারি
B. ২৬ মার্চ
C. ১৬ ডিসেম্বর
D. ৭ মার্চ

Correct answer: B

Explanation: ১৯৭১ সালের ২৬ মার্চ বাংলাদেশের স্বাধীনতা ঘোষণা করা হয়।

Difficulty: Easy

Source: Bangladesh History.pdf  
Page: 12

Supporting text: The relevant extracted passage from the source document.

This is an illustrative example. AI must derive actual questions and supporting answers from selected resources.

### 5.4 AI Accuracy and Validation

Implement these validation rules:
1. Every question must have exactly four options.
2. Every question must have exactly one correct answer.
3. All options must be meaningful.
4. The correct answer must be supported by the source.
5. Explanations must not contradict the correct answer.
6. Reject incomplete questions.
7. Detect duplicate or highly similar questions.
8. Check for contradictory source information.
9. Detect questions with insufficient supporting evidence.
10. Maintain source document and page references.

Do not allow AI to silently guess when information is missing.

Mark uncertain questions for administrator review.

If the source materials contain contradictory answers, flag the question and show the conflicting sources.

### 5.5 Question Generation Controls

Allow administrators to:
- Generate all questions at once when feasible.
- Generate questions in smaller batches.
- Regenerate individual questions.
- Regenerate incorrect or unsupported questions.
- Edit questions manually.
- Change options.
- Change correct answers.
- Change difficulty.
- Delete questions.
- Add manual questions.
- Save drafts.
- Preview the complete question paper.

Implement batching to handle API rate limits and large source documents.

Show generation progress and useful error messages.

Preserve successfully generated questions if a later batch fails.

Never lose already generated questions because of one failed batch.

### 5.6 Question Bank

Create a reusable question bank.

Administrators can:
- Save approved MCQs.
- Search questions.
- Filter by subject.
- Filter by topic.
- Filter by difficulty.
- Filter by source.
- Reuse questions in multiple examinations.
- Create examinations from existing questions.

Maintain question versions or examination snapshots so editing a reusable question later does not change an already published examination.

## 6. Examination Management

Create an examination management module.

Administrators can:
- Create examinations.
- Edit draft examinations.
- Preview examinations.
- Publish examinations.
- Unpublish examinations.
- Close examinations.
- Duplicate examinations.
- Delete draft examinations.

Each examination should support:
- Examination title.
- Description.
- Subject.
- Question set.
- Total marks.
- Marks per question.
- Negative marking.
- Time limit.
- Start date and time.
- End date and time.
- Maximum attempts per participant.
- Random question order.
- Random option order.
- Result visibility.
- Correct answer visibility.
- Explanation visibility.
- Examination instructions.

After publishing, generate a unique public examination URL.

Example: `https://example.com/exam/abc123`

Allow administrators to copy and share this link.

Published examinations must use an immutable snapshot of their approved questions and answer keys.

## 7. Public Participant Portal

The participant experience should be simple, fast, and mobile-friendly.

Participants must not need an account.

### 7.1 Examination Landing Page

Display:
- Examination title.
- Description.
- Total questions.
- Total marks.
- Time limit.
- Examination rules.
- Start and end dates.
- Important instructions.

Before starting, collect:
- Full name.
- Email address.
- Phone number.

Validate the fields. Store participant details securely. Do not expose participant information to other participants.

### 7.2 Examination Interface

Create a professional examination interface.

Features:
- One question at a time or configurable question layout.
- Four answer options.
- Previous and next buttons.
- Question navigation panel.
- Answered question indicators.
- Unanswered question indicators.
- Countdown timer.
- Mark for review.
- Save selected answers.
- Submit confirmation.

Make it responsive for mobile phones, tablets, and desktops.

### 7.3 Examination Timer

The timer must be enforced on the server. Do not rely exclusively on JavaScript countdown timers.

Requirements:
- Record the actual examination start time.
- Calculate the deadline on the backend.
- Persist answers periodically.
- Restore the remaining time after page refresh.
- Automatically submit when time expires.
- Reject submissions after the deadline.
- Prevent changing answers after submission.

### 7.4 Submission Security

Correct answers must never be sent to the public examination frontend before submission.

The frontend must only receive:
- Question text.
- Answer options.
- Public examination information.

The backend must retain:
- Correct answers.
- Explanations.
- Marking rules.
- Result calculation logic.

Validate every submitted answer on the server.

Prevent duplicate submissions and unauthorized examination access.

Do not rely on hiding answer keys using CSS or JavaScript.

## 8. Automatic Evaluation System

After submission:
1. Retrieve the examination snapshot.
2. Compare submitted answers with the correct answers.
3. Calculate correct answers.
4. Calculate incorrect answers.
5. Calculate unanswered questions.
6. Apply positive marks.
7. Apply negative marking.
8. Calculate final marks.
9. Calculate percentage.
10. Save the result.
11. Update examination statistics.

Example:

Total questions: 30  
Correct answers: 24  
Incorrect answers: 4  
Unanswered: 2  
Marks per correct answer: 1  
Negative marking: 0.25

Final score: `24 - (4 × 0.25) = 23`

Percentage: `23 / 30 × 100 = 76.67%`

Support configurable result-release settings.

## 9. Result Management and Excel Export

Create a complete admin result management dashboard.

Display:
- Participant name.
- Email.
- Phone.
- Examination title.
- Start time.
- Submission time.
- Total questions.
- Correct answers.
- Incorrect answers.
- Unanswered questions.
- Obtained marks.
- Percentage.
- Rank.
- Submission status.

Provide filters:
- Examination.
- Participant name.
- Email.
- Phone.
- Date range.
- Marks range.

### Excel Export

Use SheetJS to generate real Excel (.xlsx) files.

Provide:
1. Export all examination results.
2. Export results for a selected examination.
3. Export filtered results.
4. Export participant details.
5. Export detailed question-wise answers.
6. Export ranking and statistics.

Include a professional spreadsheet format with appropriate column headings.

Do not use an Excel file as the main database. The database must remain the single source of truth.

## 10. Database Design

Design a normalized PostgreSQL database in Supabase.

Create appropriate tables for:
- admin_profiles
- subjects
- topics
- resources
- document_chunks
- question_bank
- question_sources
- examinations
- examination_questions
- participants
- exam_attempts
- participant_answers
- exam_results

Include:
- Primary keys.
- Foreign keys.
- Unique constraints.
- Appropriate indexes.
- Created and updated timestamps.
- Necessary status fields.
- Appropriate cascading behavior.

Use UUID identifiers.

Create database migrations or SQL schema files.

### Row Level Security

Implement Supabase Row Level Security policies.

Requirements:
- Only authorized administrators can manage resources.
- Only authorized administrators can create and manage questions.
- Only authorized administrators can publish examinations.
- Participants can access only published examination content.
- Participants can access only their own attempts and results through authorized access mechanisms.
- Participants must never access other participants' private information.
- Correct answers must remain inaccessible through public queries.
- Service role credentials must never appear in frontend code.

Test the policies with both authorized and unauthorized users.

## 11. User Interface and Design

Design a modern, professional educational technology platform.

Visual direction:
- Clean dashboard layout.
- Professional typography.
- Consistent spacing.
- Modern cards.
- Clear data tables.
- Useful charts.
- Smooth interactions.
- Accessible colors and contrast.
- Responsive navigation.
- Mobile-friendly examination interface.

Use shadcn/ui components.

Provide:
- Sidebar navigation.
- Dashboard header.
- Breadcrumbs.
- Search functionality.
- Loading skeletons.
- Empty states.
- Error states.
- Success notifications.
- Confirmation dialogs.
- Form validation.

Support both light and dark themes.

Avoid unnecessary animations and visual clutter.

The UI should feel like a professional SaaS examination platform.

## 12. Security Requirements

Security is mandatory.

Implement:
- Secure admin authentication.
- Role-based authorization.
- Supabase RLS.
- Server-side Gemini API requests.
- Input validation.
- File type and file size validation.
- Secure file access.
- Examination access validation.
- Server-side result calculation.
- Duplicate submission protection.
- Rate limiting where feasible.
- Protection against unauthorized answer-key access.
- Protection against common injection attacks.
- Safe error handling.

Never hardcode API keys. Never store passwords in plain text. Never trust marks or correct answers submitted by the frontend.

Collect participant information only for legitimate examination purposes and restrict its access.

## 13. Free-Tier Optimization

The project must target zero monthly infrastructure cost within the limits of free plans.

Use:
- Supabase free tier.
- Gemini API free-tier models where available.
- Cloudflare Pages.
- Supabase Edge Functions.
- Open-source libraries.

Important restrictions:
- Do not assume unlimited API requests.
- Do not make unnecessary AI calls.
- Use document chunking.
- Use batch generation.
- Cache extracted document content.
- Reuse approved questions.
- Avoid repeatedly processing the same PDF.
- Monitor storage and database usage.
- Handle API quota errors gracefully.

If a free service cannot support a particular feature, explain the limitation and suggest a free alternative.

Do not silently introduce paid APIs or services. Do not bypass provider usage limits.

## 14. Error Handling and Reliability

The system must handle:
- Invalid PDFs.
- Corrupted PDFs.
- Empty PDFs.
- Large PDFs.
- Gemini API quota errors.
- Gemini API timeouts.
- Malformed AI responses.
- Duplicate questions.
- Database connection failures.
- Network interruptions.
- Failed file uploads.
- Expired examinations.
- Duplicate submissions.

Show clear and actionable error messages.

Preserve user work whenever possible.

Implement retry mechanisms only for operations that are safe to retry.

Do not create duplicate examination attempts or question records during retries.

## 15. Required Development Deliverables

Build the actual application with:
1. Complete frontend.
2. Complete backend integration.
3. Supabase database schema.
4. SQL migrations.
5. Supabase RLS policies.
6. Supabase Storage configuration instructions.
7. Gemini API integration.
8. PDF extraction system.
9. AI MCQ generation engine.
10. Question review interface.
11. Question bank.
12. Examination publishing system.
13. Participant portal.
14. Automatic evaluation engine.
15. Admin result dashboard.
16. Excel export.
17. Environment variable example file.
18. Installation documentation.
19. Deployment documentation.
20. Testing instructions.

Create a clean and maintainable folder structure.

Use reusable components and modular services.

Avoid writing the entire application in one giant component.

## 16. Development Instructions

Follow this implementation sequence:

### Phase 1: Project Foundation
- Initialize the project.
- Configure TypeScript.
- Install dependencies.
- Set up routing.
- Create the design system.
- Configure Supabase.
- Create database migrations.
- Implement authentication.
- Build the admin dashboard layout.

### Phase 2: Resource Management
- Implement subject and topic management.
- Implement PDF upload.
- Implement Supabase Storage integration.
- Implement PDF text extraction.
- Implement chunking.
- Store extracted content.
- Implement resource search and selection.

### Phase 3: AI MCQ Engine
This phase has the highest priority.
- Integrate Gemini API.
- Implement resource retrieval.
- Implement generation prompts.
- Implement structured JSON output.
- Implement answer validation.
- Implement duplicate detection.
- Implement source references.
- Implement batch generation.
- Implement question editing and approval.
- Implement question bank.

### Phase 4: Examination System
- Implement examination creation.
- Implement question selection.
- Implement examination snapshots.
- Implement public examination URLs.
- Implement participant registration.
- Implement the examination interface.
- Implement server-enforced timers.
- Implement answer persistence.
- Implement secure submission.

### Phase 5: Results
- Implement server-side evaluation.
- Implement negative marking.
- Implement result storage.
- Implement participant result pages.
- Implement admin result management.
- Implement Excel export.

### Phase 6: Testing and Deployment
- Test all workflows.
- Test security.
- Test database permissions.
- Test AI generation.
- Test PDF extraction.
- Test examination submission.
- Test Excel export.
- Optimize performance.
- Prepare deployment instructions.

## 17. Acceptance Criteria

Do not consider the application complete until the following workflow works end-to-end:

1. Admin logs in.
2. Admin creates a subject.
3. Admin creates topics.
4. Admin uploads multiple educational PDFs.
5. The application extracts and stores PDF content.
6. Admin selects multiple resources.
7. Admin configures an examination with 20 questions.
8. AI generates 20 MCQs with four options each.
9. Every question has a correct answer, explanation, and source reference.
10. Admin reviews and approves the generated questions.
11. Admin publishes the examination.
12. The system generates a public examination link.
13. A participant opens the link.
14. Participant enters their name, email, and phone number.
15. Participant takes the examination.
16. The timer works correctly.
17. Participant submits answers.
18. The backend calculates the result.
19. The participant sees the result according to the examination settings.
20. Admin views the participant's result.
21. Admin exports the results into a valid Excel file.

All of these workflows must work with real database records, not mock data.

## 18. Critical Instructions to the AI Coding Agent

- Do not generate only a design or prototype.
- Do not use mock data as a substitute for backend functionality.
- Do not leave major buttons nonfunctional.
- Do not hardcode sample questions into production features.
- Do not expose API keys.
- Do not expose answer keys to participants.
- Do not skip database security.
- Do not automatically publish unreviewed AI questions.
- Do not claim OCR support without implementing it.
- Do not assume every PDF contains extractable text.
- Do not introduce paid dependencies without explicit approval.

Before implementing each phase:
1. Inspect the existing project.
2. Understand the architecture.
3. Identify dependencies.
4. Implement the required functionality.
5. Test the functionality.
6. Fix errors before moving forward.
7. Document completed work.

If the development environment has limitations, explain them and provide a practical workaround.

If a task is too large for one execution, divide it into smaller implementation tasks and continue from the existing codebase. Never unnecessarily recreate working modules.

At the end of each phase, provide:
- Completed features.
- Files created or modified.
- Database changes.
- Environment variables required.
- Tests performed.
- Remaining issues.

## FINAL OBJECTIVE

Deliver a fully functional, secure, responsive, AI-powered MCQ generation and online examination platform with a strong source-grounded question generation engine, reliable automatic evaluation, and Excel result management.

Prioritize correctness, maintainability, and real functionality over unnecessary complexity.
