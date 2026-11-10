import { repairBengaliSpacing } from "./extract.js";

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(text) {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((token) => token.length > 2),
  );
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function isSimilar(candidate, existing, threshold = 0.86) {
  const needle = tokenize(candidate);
  return existing.some(
    (text) => jaccard(needle, tokenize(text)) >= threshold,
  );
}

function splitSentences(text, minLength = 32) {
  return text
    .split(/(?<=[।.!?])\s+/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= minLength && item.length <= 420);
}

function truncate(text, max = 110) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function uniqueOptions(options) {
  const seen = new Set();
  const result = [];
  for (const option of options) {
    const key = normalize(option);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(option);
  }
  return result;
}

function yearFrom(text) {
  const match = text.match(/\b(1[6-9]\d{2}|20\d{2})\b/);
  return match ? match[1] : null;
}

function definitionParts(text) {
  const match = text.match(/^(.{8,80}?)\s+(is|are|was|were|refers to|means)\s+(.{8,200})/i);
  if (!match) return null;
  return { subject: match[1].trim(), rest: match[3].replace(/[।.]$/, "").trim() };
}

function distractorPool(sentences, exclude) {
  const excluded = normalize(exclude);
  return sentences
    .map((item) => truncate(item.text, 90))
    .filter((item) => normalize(item) !== excluded);
}

function assignDifficulty(index, total, dist) {
  const easyCount = Math.round((dist.easy / 100) * total);
  const mediumCount = Math.round((dist.medium / 100) * total);
  if (index < easyCount) return "easy";
  if (index < easyCount + mediumCount) return "medium";
  return "hard";
}

function hasBengali(text) {
  return /[\u0980-\u09FF]/.test(text);
}

export function rewriteQuestionStem(text) {
  let next = String(text || "");
  next = next.replace(/^According to the source material,\s*/i, "");
  next = next.replace(/^According to the source,\s*/i, "");
  next = next.replace(/^উৎস অনুসারে\s*/u, "");
  next = next.replace(/সম্পর্কে উৎস কী বলে\?$/u, "সম্পর্কে নিচের কোন তথ্যটি সঠিক?");
  if (next && /^[a-z]/.test(next)) {
    next = next.charAt(0).toUpperCase() + next.slice(1);
  }
  return next;
}

function buildQuestion(sentence, pool, language) {
  const text = repairBengaliSpacing(sentence.text);
  const year = yearFrom(text);
  const definition = definitionParts(text);
  const useBn = language === "bn" || hasBengali(text);
  let questionText;
  let correct;
  let explanation;

  if (year) {
    questionText = useBn
      ? `${truncate(text.replace(year, "____"), 140)} কোন সালে ঘটে?`
      : `Which year is associated with: ${truncate(text.replace(year, "____"), 140)}`;
    correct = year;
    explanation = text;
  } else if (definition) {
    questionText = useBn
      ? `${truncate(definition.subject, 80)} সম্পর্কে নিচের কোন তথ্যটি সঠিক?`
      : `Which statement about "${truncate(definition.subject, 80)}" is correct?`;
    correct = truncate(definition.rest, 110);
    explanation = text;
  } else {
    const lead = text.split(/\s+/).slice(0, 6).join(" ");
    questionText = useBn
      ? `"${lead}…" সম্পর্কে নিচের কোন তথ্যটি সঠিক?`
      : `Which statement about "${lead}…" is correct?`;
    correct = truncate(text, 110);
    explanation = text;
  }

  const distractors = uniqueOptions(
    distractorPool(pool, correct).filter((item) => item !== correct),
  ).slice(0, 8);

  if (year) {
    const extras = ["1971", "1952", "1947", "1991", "2000", "1965", "1930"].filter(
      (item) => item !== year,
    );
    distractors.unshift(...extras);
  }

  const options = uniqueOptions([correct, ...distractors]).slice(0, 4);
  if (options.length < 4) return null;

  const shuffled = shuffle(options);
  const letters = ["A", "B", "C", "D"];
  const correctIndex = shuffled.findIndex((item) => item === correct);

  return {
    question_text: rewriteQuestionStem(questionText),
    option_a: shuffled[0],
    option_b: shuffled[1],
    option_c: shuffled[2],
    option_d: shuffled[3],
    correct_option: letters[correctIndex],
    explanation,
    supporting_text: sentence.text,
    source_resource_id: sentence.resource_id,
    source_chunk_id: sentence.chunk_id,
    source_page_number: sentence.page_number,
    is_uncertain: false,
    uncertainty_reason: null,
  };
}

export function generateFromChunks(chunks, config, existingTexts) {
  const materialCategories = new Set([
    "subject_content",
    "topic_content",
    "study_material",
    "notes",
    "other",
  ]);

  const preferred = chunks.filter((chunk) =>
    materialCategories.has(chunk.category),
  );
  const sourceChunks = preferred.length > 0 ? preferred : chunks;

  const target = config.number_of_questions;
  const generated = [];
  const used = [...existingTexts];

  // Pass 1 uses strict filters. If that cannot reach the target (short sources),
  // pass 2 relaxes sentence length and the similarity threshold.
  const passes = [
    { minLength: 32, threshold: 0.86 },
    { minLength: 18, threshold: 0.95 },
  ];

  for (const pass of passes) {
    if (generated.length >= target) break;
    const sentences = [];
    for (const chunk of sourceChunks) {
      for (const text of splitSentences(chunk.content, pass.minLength)) {
        sentences.push({
          text,
          resource_id: chunk.resource_id,
          chunk_id: chunk.id,
          page_number: chunk.page_number,
        });
      }
    }
    const doneSources = new Set(generated.map((q) => q.supporting_text));

    for (const sentence of sentences) {
      if (generated.length >= target) break;
      if (doneSources.has(sentence.text)) continue;
      const draft = buildQuestion(
        sentence,
        sentences,
        hasBengali(sentence.text) ? "bn" : config.language,
      );
      if (!draft) continue;
      if (isSimilar(draft.question_text, used, pass.threshold)) continue;
      const options = [draft.option_a, draft.option_b, draft.option_c, draft.option_d];
      if (new Set(options.map(normalize)).size < 4) continue;
      draft.topic = "source";
      generated.push(draft);
      used.push(draft.question_text);
    }
  }

  generated.forEach((draft, index) => {
    draft.difficulty = assignDifficulty(
      index,
      generated.length,
      config.difficulty_distribution,
    );
  });

  return generated;
}

export function calculateScore(input) {
  const totalMarks = input.totalQuestions * input.marksPerQuestion;
  const obtainedMarks =
    input.correctCount * input.marksPerQuestion -
    input.incorrectCount * input.negativeMarking;
  const percentage = totalMarks === 0 ? 0 : (obtainedMarks / totalMarks) * 100;
  return {
    obtainedMarks: Number(obtainedMarks.toFixed(2)),
    totalMarks: Number(totalMarks.toFixed(2)),
    percentage: Number(percentage.toFixed(2)),
  };
}
