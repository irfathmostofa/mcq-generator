# Testing instructions

Do not treat the app as complete until this workflow works with real database rows.

## Admin

1. Sign in.
2. Create a subject and topics.
3. Upload multiple text-based PDFs (papers, keys, subject material).
4. Confirm chunks and page numbers are stored.
5. Confirm scanned PDFs are marked `ocr_required`, not `processed`.

## Generation

1. Select mixed resources and generate 20 questions.
2. Confirm each question has four options, one correct answer, explanation, source document, page, and supporting text.
3. Confirm drafts are not auto-published.
4. Approve questions, then publish an exam.

## Public exam

1. Open `/exam/:slug` without an account.
2. Enter name, email, phone.
3. Confirm the client payload has no `correct_option`.
4. Submit. Confirm server-side score, including negative marking.
5. Export Excel from the admin results page.

## Security checks

- Anon key cannot read `question_bank.correct_option`.
- Anon key cannot read other participants.
- Service role is never in frontend source.
