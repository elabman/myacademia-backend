const crypto = require('crypto');
const { query, withTransaction } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { buildTemplate } = require('../data/formTemplates');

const QUESTION_TYPES = [
  'short_text', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown',
  'yes_no', 'email', 'phone', 'number', 'date', 'consent',
];
const CHOICE_TYPES = ['multiple_choice', 'checkboxes', 'dropdown'];

const MAX_SECTIONS = 30;
const MAX_QUESTIONS = 300;
const MAX_OPTIONS = 200;

// draft / closed are set by the admin; open / scheduled / expired come from the dates (UTC).
const STATE_SQL = `CASE
  WHEN f.status = 'draft' THEN 'draft'
  WHEN f.status = 'closed' THEN 'closed'
  WHEN f.opens_at IS NOT NULL AND f.opens_at > UTC_TIMESTAMP() THEN 'scheduled'
  WHEN f.closes_at IS NOT NULL AND f.closes_at <= UTC_TIMESTAMP() THEN 'expired'
  ELSE 'open' END`;

const placeholders = (items) => items.map(() => '?').join(', ');

// Every form read also brings the title of its short course.
const FORM_FROM = `FROM forms f LEFT JOIN short_courses sc ON sc.course_id = f.short_course_id`;
const toIso = (value) => (value ? `${String(value).replace(' ', 'T')}Z` : null);

/** ISO / datetime-local string -> 'YYYY-MM-DD HH:MM:SS' in UTC, or null. */
function toUtcSql(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest(`${field} is not a valid date`);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function slugify(title) {
  const base = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '') || 'form';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

// ---------------------------------------------------------------
// Reading forms
// ---------------------------------------------------------------
function shapeForm(row) {
  return {
    form_id: row.form_id,
    short_course_id: row.short_course_id ?? null,
    course_title: row.course_title ?? null,
    title: row.title,
    slug: row.slug,
    description: row.description,
    application_type: row.application_type,
    status: row.status,
    state: row.state,
    opens_at: toIso(row.opens_at),
    closes_at: toIso(row.closes_at),
    limit_one_per_email: Boolean(row.limit_one_per_email),
    confirmation_message: row.confirmation_message,
    published_at: toIso(row.published_at),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadStructure(formId) {
  const sections = await query(
    'SELECT section_id, title, description, position FROM form_sections WHERE form_id = ? ORDER BY position, section_id',
    [formId]
  );
  const questions = await query(
    `SELECT question_id, section_id, label, help_text, question_type, is_required, options, position
     FROM form_questions WHERE form_id = ? ORDER BY position, question_id`,
    [formId]
  );

  return sections.map((section) => ({
    section_id: section.section_id,
    title: section.title,
    description: section.description,
    questions: questions
      .filter((question) => question.section_id === section.section_id)
      .map((question) => ({
        question_id: question.question_id,
        label: question.label,
        help_text: question.help_text,
        question_type: question.question_type,
        is_required: Boolean(question.is_required),
        options: question.options ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options) : null,
      })),
  }));
}

async function getFormById(formId) {
  const rows = await query(
    `SELECT f.*, ${STATE_SQL} AS state, sc.course_title ${FORM_FROM} WHERE f.form_id = ? LIMIT 1`,
    [formId]
  );
  if (!rows[0]) return null;
  return { ...shapeForm(rows[0]), sections: await loadStructure(formId) };
}

async function listForms({ shortCourseId } = {}) {
  const course = Number(shortCourseId) || null;
  const rows = await query(
    `SELECT f.*, ${STATE_SQL} AS state, sc.course_title,
       (SELECT COUNT(*) FROM form_responses r WHERE r.form_id = f.form_id) AS response_count,
       (SELECT COUNT(*) FROM form_questions q WHERE q.form_id = f.form_id) AS question_count
     ${FORM_FROM} ${course ? 'WHERE f.short_course_id = ?' : ''} ORDER BY f.form_id DESC`,
    course ? [course] : []
  );
  return rows.map((row) => ({
    ...shapeForm(row),
    response_count: Number(row.response_count),
    question_count: Number(row.question_count),
  }));
}

// ---------------------------------------------------------------
// Saving a form (create or update the whole definition)
// ---------------------------------------------------------------
const clean = (value, max) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
};

function normalizeDefinition(body) {
  const title = clean(body.title, 200);
  if (!title) throw ApiError.unprocessable('The form needs a title.');
  if (!Array.isArray(body.sections) || body.sections.length === 0) {
    throw ApiError.unprocessable('Add at least one section.');
  }
  if (body.sections.length > MAX_SECTIONS) throw ApiError.unprocessable(`A form can have at most ${MAX_SECTIONS} sections.`);

  const opensAt = toUtcSql(body.opens_at, 'opens_at');
  const closesAt = toUtcSql(body.closes_at, 'closes_at');
  if (opensAt && closesAt && closesAt <= opensAt) {
    throw ApiError.unprocessable('The expiry date must be after the opening date.');
  }

  let questionTotal = 0;
  const sections = body.sections.map((section, sectionIndex) => {
    const sectionTitle = clean(section.title, 200);
    if (!sectionTitle) throw ApiError.unprocessable(`Section ${sectionIndex + 1} needs a title.`);
    const questions = (Array.isArray(section.questions) ? section.questions : []).map((question) => {
      questionTotal += 1;
      const label = clean(question.label, 500);
      if (!label) throw ApiError.unprocessable(`Every question needs a label (section "${sectionTitle}").`);
      if (!QUESTION_TYPES.includes(question.question_type)) {
        throw ApiError.unprocessable(`"${label}" has an unknown question type.`);
      }

      let options = null;
      if (CHOICE_TYPES.includes(question.question_type)) {
        options = [...new Set((Array.isArray(question.options) ? question.options : [])
          .map((option) => clean(option, 200)).filter(Boolean))];
        if (options.length === 0) throw ApiError.unprocessable(`"${label}" needs at least one choice.`);
        if (options.length > MAX_OPTIONS) throw ApiError.unprocessable(`"${label}" has too many choices.`);
      }

      return {
        question_id: Number(question.question_id) || null,
        label,
        help_text: clean(question.help_text, 5000),
        question_type: question.question_type,
        is_required: Boolean(question.is_required),
        options,
      };
    });
    return {
      section_id: Number(section.section_id) || null,
      title: sectionTitle,
      description: clean(section.description, 2000),
      questions,
    };
  });
  if (questionTotal > MAX_QUESTIONS) throw ApiError.unprocessable(`A form can have at most ${MAX_QUESTIONS} questions.`);

  return {
    title,
    description: clean(body.description, 5000),
    application_type: clean(body.application_type, 100),
    opens_at: opensAt,
    closes_at: closesAt,
    limit_one_per_email: body.limit_one_per_email === undefined ? true : Boolean(body.limit_one_per_email),
    confirmation_message: clean(body.confirmation_message, 5000),
    sections,
  };
}

/** Creates (formId null) or replaces the structure of a form, keeping ids so answers survive edits. */
async function saveForm(formId, body, userId, shortCourseId = null) {
  const definition = normalizeDefinition(body);

  const savedId = await withTransaction(async (tx) => {
    let id = formId;

    if (!id) {
      const result = await tx.query(
        `INSERT INTO forms (short_course_id, title, slug, description, application_type, opens_at, closes_at,
                            limit_one_per_email, confirmation_message, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [shortCourseId, definition.title, slugify(definition.title), definition.description, definition.application_type,
          definition.opens_at, definition.closes_at, definition.limit_one_per_email ? 1 : 0,
          definition.confirmation_message, userId || null]
      );
      id = result.insertId;
    } else {
      const existing = await tx.query('SELECT form_id FROM forms WHERE form_id = ?', [id]);
      if (!existing[0]) throw ApiError.notFound('Form not found');
      await tx.query(
        `UPDATE forms SET title = ?, description = ?, application_type = ?, opens_at = ?, closes_at = ?,
                limit_one_per_email = ?, confirmation_message = ? WHERE form_id = ?`,
        [definition.title, definition.description, definition.application_type, definition.opens_at,
          definition.closes_at, definition.limit_one_per_email ? 1 : 0, definition.confirmation_message, id]
      );
    }

    const existingSections = new Set((await tx.query('SELECT section_id FROM form_sections WHERE form_id = ?', [id])).map((r) => r.section_id));
    const existingQuestions = new Set((await tx.query('SELECT question_id FROM form_questions WHERE form_id = ?', [id])).map((r) => r.question_id));
    const keptSections = new Set();
    const keptQuestions = new Set();

    for (const [sectionIndex, section] of definition.sections.entries()) {
      let sectionId = section.section_id && existingSections.has(section.section_id) && !keptSections.has(section.section_id)
        ? section.section_id : null;

      if (sectionId) {
        await tx.query('UPDATE form_sections SET title = ?, description = ?, position = ? WHERE section_id = ?',
          [section.title, section.description, sectionIndex, sectionId]);
      } else {
        const result = await tx.query('INSERT INTO form_sections (form_id, title, description, position) VALUES (?, ?, ?, ?)',
          [id, section.title, section.description, sectionIndex]);
        sectionId = result.insertId;
      }
      keptSections.add(sectionId);

      for (const [questionIndex, question] of section.questions.entries()) {
        let questionId = question.question_id && existingQuestions.has(question.question_id) && !keptQuestions.has(question.question_id)
          ? question.question_id : null;
        const optionsJson = question.options ? JSON.stringify(question.options) : null;

        if (questionId) {
          await tx.query(
            `UPDATE form_questions SET section_id = ?, label = ?, help_text = ?, question_type = ?,
                    is_required = ?, options = ?, position = ? WHERE question_id = ?`,
            [sectionId, question.label, question.help_text, question.question_type, question.is_required ? 1 : 0,
              optionsJson, questionIndex, questionId]
          );
        } else {
          const result = await tx.query(
            `INSERT INTO form_questions (form_id, section_id, label, help_text, question_type, is_required, options, position)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, sectionId, question.label, question.help_text, question.question_type, question.is_required ? 1 : 0,
              optionsJson, questionIndex]
          );
          questionId = result.insertId;
        }
        keptQuestions.add(questionId);
      }
    }

    const removedQuestions = [...existingQuestions].filter((qid) => !keptQuestions.has(qid));
    if (removedQuestions.length) {
      await tx.query(`DELETE FROM form_questions WHERE question_id IN (${placeholders(removedQuestions)})`, removedQuestions);
    }
    const removedSections = [...existingSections].filter((sid) => !keptSections.has(sid));
    if (removedSections.length) {
      await tx.query(`DELETE FROM form_sections WHERE section_id IN (${placeholders(removedSections)})`, removedSections);
    }

    return id;
  });

  return getFormById(savedId);
}

/**
 * Creates the application form of a short course, from a full definition or from a template:
 *   { short_course_id, template?: 'graphic-design-packaging', title?, ...definition }
 * A short course has at most one form.
 */
async function createForm(body, userId) {
  const courseId = Number(body.short_course_id);
  if (!courseId) throw ApiError.badRequest('short_course_id is required: a form belongs to a short course.');

  const [course] = await query('SELECT course_id, course_title FROM short_courses WHERE course_id = ?', [courseId]);
  if (!course) throw ApiError.badRequest('Invalid short_course_id: no matching short course.');

  const [existing] = await query('SELECT form_id FROM forms WHERE short_course_id = ?', [courseId]);
  if (existing) throw ApiError.conflict('This short course already has an application form.');

  let definition = body;
  if (body.template) {
    definition = buildTemplate(body.template);
    if (!definition) throw ApiError.badRequest('Unknown form template');
  }

  const title = clean(body.title, 200) || `${course.course_title} - Application form`.slice(0, 200);

  try {
    return await saveForm(null, { ...definition, title }, userId, courseId);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw ApiError.conflict('This short course already has an application form.');
    throw error;
  }
}

// ---------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------
async function publishForm(formId) {
  const form = await getFormById(formId);
  if (!form) throw ApiError.notFound('Form not found');

  const questions = form.sections.flatMap((section) => section.questions);
  if (questions.length === 0) throw ApiError.badRequest('Add at least one question before publishing.');
  if (form.limit_one_per_email && !questions.some((question) => question.question_type === 'email')) {
    throw ApiError.badRequest('Add an email question, or turn off "one application per email address", before publishing.');
  }
  if (form.closes_at && new Date(form.closes_at) <= new Date()) {
    throw ApiError.badRequest('The expiry date has already passed. Set a new expiry date first.');
  }

  await query("UPDATE forms SET status = 'published', published_at = COALESCE(published_at, UTC_TIMESTAMP()) WHERE form_id = ?", [formId]);
  return getFormById(formId);
}

async function setFormStatus(formId, status) {
  const result = await query('UPDATE forms SET status = ? WHERE form_id = ?', [status, formId]);
  if (!result.affectedRows) throw ApiError.notFound('Form not found');
  return getFormById(formId);
}

async function deleteForm(formId) {
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM form_responses WHERE form_id = ?', [formId]);
  if (Number(total) > 0) {
    throw ApiError.conflict('This form already has responses and cannot be deleted. Close it instead.');
  }
  const result = await query('DELETE FROM forms WHERE form_id = ?', [formId]);
  if (!result.affectedRows) throw ApiError.notFound('Form not found');
}

// ---------------------------------------------------------------
// Public form + submissions
// ---------------------------------------------------------------
const NOT_OPEN_MESSAGES = {
  scheduled: 'This form is not open yet.',
  closed: 'This form is no longer accepting responses.',
  expired: 'This form has expired and no longer accepts responses.',
};

async function getFormBySlug(slug) {
  const rows = await query(
    `SELECT f.*, ${STATE_SQL} AS state, sc.course_title ${FORM_FROM} WHERE f.slug = ? LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

/** What the public page may see. Questions are only sent while the form is open. */
async function getPublicForm(slug) {
  const row = await getFormBySlug(slug);
  if (!row || row.state === 'draft') throw ApiError.notFound('This form is not available.');

  const form = shapeForm(row);
  return {
    title: form.title,
    description: form.description,
    application_type: form.application_type,
    course_title: form.course_title,
    state: form.state,
    closes_at: form.closes_at,
    opens_at: form.opens_at,
    message: NOT_OPEN_MESSAGES[form.state] || null,
    sections: form.state === 'open' ? await loadStructure(row.form_id) : [],
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

/** Returns the value to store (string) or null when blank; throws a plain Error message on bad input. */
function normalizeAnswer(question, raw) {
  const { question_type: type, label, options } = question;
  const isBlank =
    raw === undefined || raw === null || raw === false ||
    (typeof raw === 'string' && raw.trim() === '') ||
    (Array.isArray(raw) && raw.length === 0);

  if (isBlank) {
    if (question.is_required) {
      throw new Error(type === 'consent' ? 'Please tick the declaration box to continue.' : `Please answer: ${label}`);
    }
    return null;
  }

  const text = typeof raw === 'string' ? raw.trim() : raw;
  const bad = (reason) => new Error(`${reason}: ${label}`);

  switch (type) {
    case 'short_text':
      if (typeof text !== 'string' || text.length > 500) throw bad('Answer is too long');
      return text;
    case 'paragraph':
      if (typeof text !== 'string' || text.length > 5000) throw bad('Answer is too long');
      return text;
    case 'email':
      if (typeof text !== 'string' || text.length > 190 || !EMAIL_PATTERN.test(text)) throw bad('Enter a valid email address');
      return text.toLowerCase();
    case 'phone':
      if (typeof text !== 'string' || !PHONE_PATTERN.test(text)) throw bad('Enter a valid phone number');
      return text;
    case 'number':
      if (!Number.isFinite(Number(text))) throw bad('Enter a number');
      return String(Number(text));
    case 'date':
      if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(text).getTime())) {
        throw bad('Enter a valid date');
      }
      return text;
    case 'yes_no':
      if (text !== 'Yes' && text !== 'No') throw bad('Choose Yes or No');
      return text;
    case 'multiple_choice':
    case 'dropdown':
      if (typeof text !== 'string' || !(options || []).includes(text)) throw bad('Choose one of the listed options');
      return text;
    case 'checkboxes': {
      const values = Array.isArray(text) ? [...new Set(text.map(String))] : null;
      if (!values || values.some((value) => !(options || []).includes(value))) throw bad('Choose from the listed options');
      return JSON.stringify(values);
    }
    case 'consent':
      if (text !== true && text !== 'true' && text !== 'Yes') throw bad('Please tick the declaration box');
      return 'Yes';
    default:
      throw bad('Unsupported question');
  }
}

async function submitResponse(slug, answers, req) {
  const row = await getFormBySlug(slug);
  if (!row || row.state === 'draft') throw ApiError.notFound('This form is not available.');
  if (row.state !== 'open') throw ApiError.forbidden(NOT_OPEN_MESSAGES[row.state]);

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw ApiError.badRequest('answers must be an object keyed by question id');
  }

  const structure = await loadStructure(row.form_id);
  const questions = structure.flatMap((section) => section.questions);
  const stored = [];
  const errors = [];

  for (const question of questions) {
    try {
      const value = normalizeAnswer(question, answers[question.question_id]);
      stored.push({ question, value });
    } catch (error) {
      errors.push({ field: String(question.question_id), message: error.message });
    }
  }
  if (errors.length) throw ApiError.unprocessable(errors[0].message, errors);

  const emailQuestion = questions.find((question) => question.question_type === 'email');
  const email = emailQuestion ? stored.find((entry) => entry.question === emailQuestion).value : null;

  if (row.limit_one_per_email && email) {
    const existing = await query('SELECT response_id FROM form_responses WHERE form_id = ? AND respondent_email = ? LIMIT 1', [row.form_id, email]);
    if (existing.length) throw ApiError.conflict('An application with this email address has already been submitted.');
  }

  try {
    await withTransaction(async (tx) => {
      const result = await tx.query(
        'INSERT INTO form_responses (form_id, respondent_email, client_hash) VALUES (?, ?, ?)',
        [row.form_id, row.limit_one_per_email ? email : null, crypto.createHash('sha256').update(String(req.ip)).digest('hex')]
      );
      const answered = stored.filter((entry) => entry.value !== null);
      if (answered.length) {
        await tx.query(
          `INSERT INTO form_answers (response_id, question_id, value) VALUES ${answered.map(() => '(?, ?, ?)').join(', ')}`,
          answered.flatMap((entry) => [result.insertId, entry.question.question_id, entry.value])
        );
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw ApiError.conflict('An application with this email address has already been submitted.');
    }
    throw error;
  }

  return (
    row.confirmation_message ||
    'Thank you! Your application has been received.'
  );
}

// ---------------------------------------------------------------
// Responses (admin)
// ---------------------------------------------------------------
async function listResponses(formId, { from, to, limit } = {}) {
  const form = await getFormById(formId);
  if (!form) throw ApiError.notFound('Form not found');

  const where = ['form_id = ?'];
  const params = [formId];
  if (/^\d{4}-\d{2}-\d{2}$/.test(from || '')) { where.push('submitted_at >= ?'); params.push(from); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to || '')) { where.push('submitted_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(to); }
  const max = Math.min(Math.max(parseInt(limit, 10) || 1000, 1), 5000);

  const responses = await query(
    `SELECT response_id, respondent_email, submitted_at FROM form_responses
     WHERE ${where.join(' AND ')} ORDER BY response_id DESC LIMIT ${max}`,
    params
  );
  const types = new Map(form.sections.flatMap((section) => section.questions).map((q) => [q.question_id, q.question_type]));
  const answerRows = responses.length
    ? await query(
        `SELECT response_id, question_id, value FROM form_answers WHERE response_id IN (${placeholders(responses)})`,
        responses.map((response) => response.response_id)
      )
    : [];

  const byResponse = new Map();
  answerRows.forEach((answer) => {
    const bucket = byResponse.get(answer.response_id) || {};
    let value = answer.value;
    if (types.get(answer.question_id) === 'checkboxes') {
      try { value = JSON.parse(value); } catch { /* keep text */ }
    }
    bucket[answer.question_id] = value;
    byResponse.set(answer.response_id, bucket);
  });

  return responses.map((response) => ({
    response_id: response.response_id,
    submitted_at: response.submitted_at,
    email: response.respondent_email,
    answers: byResponse.get(response.response_id) || {},
  }));
}

async function deleteResponse(formId, responseId) {
  const result = await query('DELETE FROM form_responses WHERE form_id = ? AND response_id = ?', [formId, responseId]);
  if (!result.affectedRows) throw ApiError.notFound('Response not found');
}

module.exports = {
  QUESTION_TYPES,
  listForms,
  getFormById,
  createForm,
  saveForm,
  publishForm,
  setFormStatus,
  deleteForm,
  getPublicForm,
  submitResponse,
  listResponses,
  deleteResponse,
};
