// Owner: Fhil
export function renderQuizAdmin(root: HTMLElement): void { root.innerHTML = '<main class="p-8"><h1 class="text-3xl font-bold">Quiz Admin</h1></main>'; }
/**
 * frontend/src/admin/quizAdmin.ts
 * Admin page for the quiz questions: choose a topic, see its questions, then add, change or delete questions.
 * Each topic shows how many questions it has, and how many more it needs for a full quiz.
 *
 * Framework-free (plain DOM, Tailwind classes). Talks to the Flask routes in backend/routes/quiz_routes.py
 * through the shared request() helper in api.ts, so errors and the data envelope work like the rest of the app.
 * The admin-only calls live here in the `api` object. They can move into api.ts later without changes.
 *
 * Usage, from the admin page that Hazel connects to the admin menu:
 *   import { mountQuizAdmin } from './quizAdmin';
 *   mountQuizAdmin(document.getElementById('quiz-admin-root')!);
 */

import { request } from '../api';
import type { AdminQuestion } from '../types';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

// ---------- Types (match the responses in quiz_routes.py) ----------
interface TopicSummary { id: number; title: string; questionCount: number }
interface QuestionDraft { text: string; options: string[]; answerIndex: number; explanation: string }
interface TopicsResponse { topics: TopicSummary[]; quizSize: number }
interface TopicQuestionsResponse { topic: TopicSummary; questions: AdminQuestion[]; quizSize: number }

// ---------- API ----------
const api = {
  listTopics: () => request<TopicsResponse>('GET', '/api/admin/quiz/topics'),
  listQuestions: (topicId: number) => request<TopicQuestionsResponse>('GET', `/api/admin/topics/${topicId}/questions`),
  createQuestion: (topicId: number, d: QuestionDraft) =>
    request<AdminQuestion>('POST', '/api/admin/questions', { topicId, ...d }),
  updateQuestion: (id: number, d: QuestionDraft) => request<AdminQuestion>('PUT', `/api/admin/questions/${id}`, d),
  deleteQuestion: (id: number) => request<{ message: string }>('DELETE', `/api/admin/questions/${id}`),
};

// ---------- Small DOM helpers (text is always set with textContent, never innerHTML) ----------
const BTN = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50';
const BTN_PRIMARY = 'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50';
const BTN_DANGER = 'rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50';
const CARD = 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm';
const FIELD = 'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm';

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

function button(label: string, onClick: () => void | Promise<void>, className = BTN): HTMLButtonElement {
  const b = h('button', className, label);
  b.type = 'button';
  b.addEventListener('click', () => { void onClick(); });
  return b;
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** "12 of 20" style status for a topic: green when it can fill a quiz, amber when it needs more. */
function countStatus(count: number, quizSize: number): { text: string; ok: boolean } {
  if (count >= quizSize) {
    return { text: `${count} questions. Ready: each quiz uses ${quizSize} at random.`, ok: true };
  }
  const missing = quizSize - count;
  return { text: `${count} of ${quizSize} questions. Add ${missing} more for a full quiz.`, ok: false };
}

function statusLine(count: number, quizSize: number): HTMLElement {
  const s = countStatus(count, quizSize);
  return h('p', `text-sm ${s.ok ? 'text-green-700' : 'text-amber-700'}`, s.text);
}

const emptyDraft = (): QuestionDraft => ({ text: '', options: ['', ''], answerIndex: 0, explanation: '' });
const toDraft = (q: AdminQuestion): QuestionDraft => ({
  text: q.text, options: [...q.options], answerIndex: q.answerIndex, explanation: q.explanation,
});

/** Returns a message for the first problem found, or null. The server checks everything again. */
function validate(d: QuestionDraft): string | null {
  if (!d.text) return 'Write the question.';
  if (d.options.some((o) => !o)) return 'Fill in every option, or remove the empty ones.';
  if (d.options.length < MIN_OPTIONS) return `A question needs at least ${MIN_OPTIONS} options.`;
  if (new Set(d.options.map((o) => o.toLowerCase())).size !== d.options.length) return 'Each option must be different.';
  if (d.answerIndex < 0 || d.answerIndex >= d.options.length) return 'Choose the correct option.';
  if (!d.explanation) return 'Write a short explanation. Students see it after they submit.';
  return null;
}

// ---------- Add / edit form ----------
function questionForm(
  initial: QuestionDraft,
  saveLabel: string,
  onSave: (draft: QuestionDraft) => Promise<void>,
  onCancel: () => void,
): HTMLElement {
  const options = [...initial.options];
  let correct = initial.answerIndex;
  const group = `correct-${Math.random().toString(36).slice(2)}`; // radio group name, unique per form

  const text = h('textarea', FIELD);
  text.value = initial.text;
  text.rows = 2;
  text.maxLength = 500;
  text.placeholder = 'Question';

  const explanation = h('textarea', FIELD);
  explanation.value = initial.explanation;
  explanation.rows = 2;
  explanation.maxLength = 1000;
  explanation.placeholder = 'Explanation shown after the student submits';

  const optionsBox = h('div', 'space-y-2');
  const error = h('p', 'text-sm text-red-600');
  const addOption = button('+ Add option', () => { options.push(''); renderOptions(); });

  function renderOptions(): void {
    optionsBox.replaceChildren(
      ...options.map((value, i) => {
        const radio = h('input');
        radio.type = 'radio';
        radio.name = group;
        radio.checked = i === correct;
        radio.title = 'Mark as the correct answer';
        radio.addEventListener('change', () => { correct = i; });

        const field = h('input', FIELD);
        field.type = 'text';
        field.value = value;
        field.maxLength = 200;
        field.placeholder = `Option ${i + 1}`;
        field.addEventListener('input', () => { options[i] = field.value; });

        const remove = button('Remove', () => {
          options.splice(i, 1);
          if (correct === i) correct = 0;
          else if (correct > i) correct -= 1;
          renderOptions();
        });
        remove.disabled = options.length <= MIN_OPTIONS;
        return h('div', 'flex items-center gap-2', radio, field, remove);
      }),
    );
    addOption.disabled = options.length >= MAX_OPTIONS;
  }
  renderOptions();

  const save = button(saveLabel, async () => {
    error.textContent = '';
    const draft: QuestionDraft = {
      text: text.value.trim(),
      options: options.map((o) => o.trim()),
      answerIndex: correct,
      explanation: explanation.value.trim(),
    };
    const problem = validate(draft);
    if (problem) { error.textContent = problem; return; }
    save.disabled = true;
    try {
      await onSave(draft);
    } catch (err) {
      error.textContent = messageOf(err);
      save.disabled = false;
    }
  }, BTN_PRIMARY);

  return h('div', `${CARD} space-y-3 border-blue-300`,
    h('label', 'block text-sm font-medium', 'Question'), text,
    h('p', 'text-sm font-medium', 'Options (select the correct one)'), optionsBox, addOption,
    h('label', 'block text-sm font-medium', 'Explanation'), explanation,
    error,
    h('div', 'flex gap-2', save, button('Cancel', onCancel)),
  );
}

// ---------- Question card ----------
function questionCard(q: AdminQuestion, number: number, onEdit: () => void, onDelete: () => void): HTMLElement {
  const options = h('ul', 'mt-2 space-y-1 text-sm');
  q.options.forEach((o, i) => {
    const isCorrect = i === q.answerIndex;
    options.append(h('li', isCorrect ? 'font-medium text-green-700' : 'text-slate-700', `${isCorrect ? '✓' : '•'} ${o}`));
  });
  return h('div', CARD,
    h('p', 'font-medium', `${number}. ${q.text}`),
    options,
    h('p', 'mt-2 text-sm italic text-slate-500', `Explanation: ${q.explanation}`),
    h('div', 'mt-3 flex gap-2', button('Edit', onEdit), button('Delete', onDelete, BTN_DANGER)),
  );
}

// ---------- The page ----------
export function mountQuizAdmin(root: HTMLElement): void {
  const page = h('div', 'mx-auto max-w-3xl space-y-4 p-4');
  root.replaceChildren(page);
  const show = (...nodes: Node[]) => page.replaceChildren(...nodes);

  const showError = (err: unknown, retry: () => void) =>
    show(
      h('p', 'text-red-600', messageOf(err)),
      button('Try again', retry, BTN_PRIMARY),
    );

  // Step 1: choose a topic (with question counts)
  async function showTopics(): Promise<void> {
    show(h('p', 'text-slate-500', 'Loading topics…'));
    try {
      const { topics, quizSize } = await api.listTopics();
      show(
        h('h1', 'text-xl font-semibold', 'Quiz questions'),
        h('p', 'text-sm text-slate-600', 'Choose a topic to see and manage its questions.'),
        ...(topics.length === 0 ? [h('p', 'text-slate-500', 'There are no topics yet.')] : []),
        ...topics.map((t) =>
          h('div', `${CARD} flex items-center justify-between gap-4`,
            h('div', '', h('p', 'font-medium', t.title), statusLine(t.questionCount, quizSize)),
            button('Manage', () => showTopic(t.id), BTN_PRIMARY),
          ),
        ),
      );
    } catch (err) {
      showError(err, showTopics);
    }
  }

  // Step 2: one topic's questions
  async function showTopic(topicId: number): Promise<void> {
    show(h('p', 'text-slate-500', 'Loading questions…'));
    try {
      renderTopic(await api.listQuestions(topicId));
    } catch (err) {
      showError(err, () => showTopic(topicId));
    }
  }

  function renderTopic({ topic, questions, quizSize }: TopicQuestionsResponse): void {
    const formSlot = h('div');
    const addButton = button('+ Add question', () => {
      addButton.disabled = true;
      formSlot.replaceChildren(
        questionForm(
          emptyDraft(),
          'Save question',
          async (draft) => { await api.createQuestion(topic.id, draft); await showTopic(topic.id); },
          () => { formSlot.replaceChildren(); addButton.disabled = false; },
        ),
      );
    }, BTN_PRIMARY);

    const makeCard = (q: AdminQuestion, number: number): HTMLElement => {
      const card = questionCard(
        q,
        number,
        () => {
          const form = questionForm(
            toDraft(q),
            'Save changes',
            async (draft) => { await api.updateQuestion(q.id, draft); await showTopic(topic.id); },
            () => form.replaceWith(card),
          );
          card.replaceWith(form);
        },
        async () => {
          if (!window.confirm('Delete this question? This cannot be undone.')) return;
          try {
            await api.deleteQuestion(q.id);
            await showTopic(topic.id);
          } catch (err) {
            window.alert(messageOf(err));
          }
        },
      );
      return card;
    };

    show(
      button('← All topics', showTopics),
      h('h1', 'text-xl font-semibold', topic.title),
      statusLine(questions.length, quizSize),
      addButton,
      formSlot,
      ...(questions.length === 0 ? [h('p', 'text-slate-500', 'No questions yet. Add the first one.')] : []),
      ...questions.map((q, i) => makeCard(q, i + 1)),
    );
  }

  void showTopics();
}
