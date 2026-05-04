import { v4 as uuid } from 'uuid';
import { all, get, run } from '../db/database.js';
import { issueCertificate } from './certificates.js';

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeCode(value) {
  return String(value ?? '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function toKeywords(value) {
  return normalizeText(value)
    .split(/[^a-z0-9_]+/g)
    .filter((entry) => entry.length > 2);
}

function includesAny(haystack, keywords) {
  return keywords.some((keyword) => haystack.includes(keyword));
}

function computeScore(correct, maxScore = 100) {
  return correct ? maxScore : 0;
}

function normalizeQuestionType(type) {
  const value = String(type || '').toLowerCase();
  const map = {
    short_answer: 'fill_blank',
    fill_in_blank: 'fill_blank',
    fill_blank: 'fill_blank',
    debugging: 'debug',
    debug: 'debug',
    code: 'debug',
    prediction_based: 'prediction',
    prediction: 'prediction',
    scenario_based: 'challenge',
    challenge: 'challenge',
    multiple_choice: 'multiple_choice',
    true_false: 'true_false'
  };
  return map[value] || value || 'multiple_choice';
}

function normalizeOptions(options) {
  if (!options) return [];
  if (Array.isArray(options)) return options;

  try {
    const parsed = typeof options === 'string' ? JSON.parse(options) : options;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildFeedback(questionType, isCorrect, expected, submitted) {
  if (isCorrect) {
    return 'Correct answer. Your submission has been saved and your progress was updated.';
  }

  const expectedText = String(expected ?? '').trim();
  const submittedText = String(submitted ?? '').trim();

  switch (questionType) {
    case 'multiple_choice':
    case 'true_false':
      return `Incorrect. Expected: ${expectedText}. You submitted: ${submittedText}.`;
    case 'fill_blank':
      return `Incorrect. Check spelling and spacing. Expected answer contains: ${expectedText}.`;
    case 'debug':
      return 'Incorrect. The fix should correct the broken code and preserve the intended behavior.';
    case 'prediction':
      return 'Partially matched. Include the key outcome or behavior described by the lesson.';
    case 'challenge':
      return 'Partially matched. Include the key implementation idea and relevant solution keywords.';
    default:
      return 'Incorrect submission.';
  }
}

export function gradeSubmission(question, submittedAnswer) {
  const questionType = normalizeQuestionType(question.question_type || question.type || 'multiple_choice');
  const correctAnswer = question.correct_answer ?? question.answer ?? '';
  const submitted = submittedAnswer ?? '';

  let isCorrect = false;
  let score = 0;

  if (['multiple_choice', 'true_false'].includes(questionType)) {
    isCorrect = normalizeText(submitted) === normalizeText(correctAnswer);
    score = computeScore(isCorrect);
  } else if (questionType === 'fill_blank') {
    isCorrect = normalizeText(submitted) === normalizeText(correctAnswer);
    score = computeScore(isCorrect);
  } else if (questionType === 'debug') {
    const expected = normalizeCode(correctAnswer);
    const actual = normalizeCode(submitted);
    const expectedKeywords = toKeywords(correctAnswer);

    isCorrect = actual === expected || includesAny(actual, expectedKeywords);
    score = computeScore(isCorrect);
  } else if (questionType === 'prediction') {
    const expectedKeywords = toKeywords(correctAnswer);
    const actual = normalizeText(submitted);
    const matched = includesAny(actual, expectedKeywords);

    isCorrect = matched || actual.includes(normalizeText(correctAnswer));
    score = isCorrect ? 100 : matched ? 70 : 0;
  } else if (questionType === 'challenge') {
    const expectedKeywords = toKeywords(correctAnswer);
    const actual = normalizeText(submitted);
    const matchedCount = expectedKeywords.filter((keyword) => actual.includes(keyword)).length;

    isCorrect = matchedCount >= Math.max(2, Math.ceil(expectedKeywords.length / 2));
    score = isCorrect ? 100 : Math.min(80, matchedCount * 20);
  } else {
    isCorrect = normalizeText(submitted) === normalizeText(correctAnswer);
    score = computeScore(isCorrect);
  }

  return {
    correct: isCorrect,
    score,
    feedback: buildFeedback(questionType, isCorrect, correctAnswer, submitted)
  };
}

async function ensureProgressRow(userId) {
  const existing = await get('SELECT * FROM user_progress WHERE user_id = $1', [userId]);
  if (existing) return existing;

  await run(
    `INSERT INTO user_progress (user_id, total_questions, completed_questions, correct_answers, progress_percent)
     VALUES ($1, 0, 0, 0, 0)`,
    [userId]
  );

  return get('SELECT * FROM user_progress WHERE user_id = $1', [userId]);
}

export async function saveSubmission(userId, question, submittedAnswer, grading) {
  const answer = String(submittedAnswer ?? '').trim();

  await run(
    `INSERT INTO user_answers (user_id, question_id, answer, is_correct, score, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id, question_id)
     DO UPDATE SET
       answer = EXCLUDED.answer,
       is_correct = EXCLUDED.is_correct,
       score = EXCLUDED.score,
       created_at = NOW()`,
    [userId, question.id, answer, grading.correct, grading.score]
  );

  const totalQuestionsRow = await get('SELECT COUNT(*)::int AS count FROM quiz_questions', []);
  const completedRow = await get('SELECT COUNT(*)::int AS count FROM user_answers WHERE user_id = $1', [userId]);
  const correctRow = await get('SELECT COUNT(*)::int AS count FROM user_answers WHERE user_id = $1 AND is_correct = true', [userId]);

  const totalQuestions = totalQuestionsRow?.count || 0;
  const completedQuestions = completedRow?.count || 0;
  const correctAnswers = correctRow?.count || 0;
  const progressPercent = totalQuestions > 0 ? Math.min(100, Math.round((completedQuestions / totalQuestions) * 100)) : 0;

  await ensureProgressRow(userId);

  await run(
    `UPDATE user_progress
     SET total_questions = $2,
         completed_questions = $3,
         correct_answers = $4,
         progress_percent = $5,
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId, totalQuestions, completedQuestions, correctAnswers, progressPercent]
  );

  return {
    totalQuestions,
    completedQuestions,
    correctAnswers,
    progressPercent
  };
}

export async function getProgress(userId) {
  const progress = await ensureProgressRow(userId);
  return {
    id: progress.id,
    user_id: progress.user_id,
    total_questions: progress.total_questions || 0,
    completed_questions: progress.completed_questions || 0,
    correct_answers: progress.correct_answers || 0,
    progress_percent: progress.progress_percent || 0
  };
}

export async function maybeIssueCertificate(userId, courseName, details = {}) {
  const progress = await getProgress(userId);
  const accuracy = progress.completed_questions > 0 ? Math.round((progress.correct_answers / progress.completed_questions) * 100) : 0;
  const qualifiesByCompletion = progress.progress_percent >= 100;
  const qualifiesByThreshold = progress.progress_percent >= 80 && accuracy >= 70;

  if (!qualifiesByCompletion && !qualifiesByThreshold) {
    return null;
  }

  const existing = await get('SELECT * FROM certificates WHERE user_id = $1 AND course_name = $2 ORDER BY issued_at DESC LIMIT 1', [userId, courseName]);
  if (existing) {
    return {
      id: existing.id,
      certificateId: existing.certificate_id,
      certificateUrl: existing.certificate_url,
      issuedAt: existing.issued_at,
      alreadyIssued: true
    };
  }

  const generated = await issueCertificate(userId, courseName, details.completionDate || new Date());
  const certificateId = generated?.certificateId || `CERT-${uuid()}`;

  const record = await run(
    `INSERT INTO certificates (user_id, course_name, certificate_url, issued_at, certificate_id, is_custom)
     VALUES ($1, $2, $3, NOW(), $4, false)
     RETURNING id`,
    [userId, courseName, generated?.pdfUrl || null, certificateId]
  );

  return {
    id: record.id,
    certificateId,
    certificateUrl: generated?.pdfUrl || null,
    downloadUrl: generated?.downloadUrl || `/api/certifications/${record.id}/download`,
    issuedAt: new Date().toISOString(),
    alreadyIssued: false
  };
}

function normalizeLearningRow(row) {
  return {
    ...row,
    question_type: normalizeQuestionType(row.question_type),
    options: normalizeOptions(row.options)
  };
}

export async function loadQuestions() {
  const quizQuestions = await all(`
    SELECT
      qq.id,
      qq.quiz_id,
      qq.question_text,
      qq.question_type,
      qq.options,
      qq.correct_answer,
      qq.explanation,
      qq.points,
      qq.order_index,
      q.title AS quiz_title,
      q.lesson_id,
      q.description AS quiz_description,
      q.created_by,
      q.created_at,
      'quiz' AS source_type
    FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
  `);

  const challengeRows = await all(`
    SELECT
      c.id AS id,
      NULL::int AS quiz_id,
      c.title AS question_text,
      'challenge'::text AS question_type,
      NULL::jsonb AS options,
      c.solution AS correct_answer,
      c.explanation,
      1 AS points,
      1 AS order_index,
      c.title AS quiz_title,
      NULL::int AS lesson_id,
      c.description AS quiz_description,
      NULL::int AS created_by,
      c.created_at,
      'challenge' AS source_type
    FROM challenges c
  `);

  return [...quizQuestions, ...challengeRows]
    .map(normalizeLearningRow)
    .sort((left, right) => {
      const leftDate = new Date(left.created_at || 0).getTime();
      const rightDate = new Date(right.created_at || 0).getTime();
      if (leftDate !== rightDate) return rightDate - leftDate;
      return (left.order_index || 0) - (right.order_index || 0);
    });
}
