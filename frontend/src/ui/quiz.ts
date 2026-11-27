// Owner: Fhil
import { showModal } from './modal';
export function startQuiz(): void { showModal('Blackboard', 'Quiz topics will appear here. Pick a challenge to earn points.'); }
// The quiz students play: pick a topic (or a mix of all topics), answer the questions, submit, and see the
// results with explanations. The server grades the answers and adds the points, so the browser never knows
// the correct answers until after submitting.
import { ApiError, getMixedQuestions, getQuestions, getTopics, submitQuiz } from '../api';
import type { QuizQuestion, SubmitRequest, SubmitResponse, Topic } from '../types';

export type QuizOptions = {
  /** Called with the student's new points total after a quiz, so the points HUD can refresh. */
  onPointsChange?: (totalPoints: number) => void;
};

type Source = { kind: 'topic'; topic: Topic } | { kind: 'mixed' };

const QUIZ_SIZE = 20;
const POINTS_PER_CORRECT = 10;
const LETTERS = 'ABCDEF';

// ---------- Small DOM helpers (text is always set with textContent, never innerHTML) ----------
const BTN = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-left hover:bg-slate-50 disabled:opacity-50';
const BTN_SELECTED = 'w-full rounded-lg border-2 border-blue-600 bg-blue-50 px-4 py-2 text-left font-medium';
const BTN_PRIMARY = 'w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
const BTN_QUIET = 'rounded-lg border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50 disabled:opacity-50';

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

function messageOf(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) return 'Please log in to play the quiz.';
  return err instanceof Error ? err.message : String(err);
}

// ---------- The quiz ----------
export function startQuiz(options: QuizOptions = {}): void {
  if (document.getElementById('quiz-overlay')) return; // already open

  const overlay = h('div', 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4');
  overlay.id = 'quiz-overlay';
  const panel = h('div', 'max-h-full w-full max-w-xl space-y-4 overflow-y-auto rounded-xl bg-white p-5 text-slate-900 shadow-xl');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Blackboard quiz');
  overlay.append(panel);
  document.body.append(overlay);

  // While the quiz is open, keep key presses away from the game so the character doesn't walk around behind it.
  const blockGameKeys = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
    event.stopPropagation();
  };
  window.addEventListener('keydown', blockGameKeys, true);

  function close(): void {
    window.removeEventListener('keydown', blockGameKeys, true);
    overlay.remove();
  }

  const render = (...nodes: Node[]) => { panel.replaceChildren(...nodes); };
  const titleRow = (title: string): HTMLElement =>
    h('div', 'flex items-center justify-between gap-2',
      h('h2', 'text-lg font-bold', title),
      button('✕', close, BTN_QUIET));
  const showError = (err: unknown, retry: () => void, retryLabel = 'Try again') =>
    render(
      titleRow('Blackboard'),
      h('p', 'text-red-600', messageOf(err)),
      button(retryLabel, retry, BTN_PRIMARY),
      button('Back to topics', () => { void showTopics(); }),
    );

  // ----- Screen 1: topic list and Start Quiz -----
  async function showTopics(): Promise<void> {
    render(titleRow('Blackboard'), h('p', 'text-slate-500', 'Loading topics…'));
    try {
      const topics = await getTopics();
      let selected: Source | null = null;
      const list = h('div', 'space-y-2');
      const start = button('Start Quiz', () => { if (selected) void begin(selected); }, BTN_PRIMARY);
      start.disabled = true;

      const choices: Array<{ label: string; source: Source }> = [
        { label: 'Mix of all topics', source: { kind: 'mixed' } },
        ...topics.map((t) => ({
          label: t.ownerId === null ? t.title : `${t.title} (my quiz)`,
          source: { kind: 'topic', topic: t } as Source,
        })),
      ];
      const buttons = choices.map((choice) => {
        const b = button(choice.label, () => {
          selected = choice.source;
          buttons.forEach((other) => { other.className = other === b ? BTN_SELECTED : BTN; });
          start.disabled = false;
        });
        list.append(b);
        return b;
      });

      render(
        titleRow('Blackboard'),
        h('p', 'text-sm text-slate-600',
          `Choose a topic, then press Start Quiz. A quiz has up to ${QUIZ_SIZE} questions. ` +
          `Each correct answer earns ${POINTS_PER_CORRECT} points, once per question. ` +
          'You will see the right answers and explanations after you submit.'),
        list,
        start,
      );
    } catch (err) {
      showError(err, () => { void showTopics(); });
    }
  }

  // ----- Load the questions -----
  async function begin(source: Source): Promise<void> {
    render(titleRow('Blackboard'), h('p', 'text-slate-500', 'Getting your questions…'));
    try {
      const questions = source.kind === 'mixed' ? await getMixedQuestions() : await getQuestions(source.topic.id);
      if (questions.length === 0) {
        render(
          titleRow('Blackboard'),
          h('p', '', 'There are no questions in this topic yet. Try another topic.'),
          button('Back to topics', () => { void showTopics(); }, BTN_PRIMARY),
        );
        return;
      }
      const answers: Array<number | null> = questions.map(() => null);
      showQuestion(source, questions, answers, 0);
    } catch (err) {
      showError(err, () => { void begin(source); });
    }
  }

  // ----- Screen 2: one question at a time -----
  function showQuestion(source: Source, questions: QuizQuestion[], answers: Array<number | null>, index: number): void {
    const q = questions[index];
    const last = index === questions.length - 1;
    const next = button(last ? 'Submit answers' : 'Next', () => {
      if (last) void submit(source, questions, answers);
      else showQuestion(source, questions, answers, index + 1);
    }, BTN_PRIMARY);
    next.disabled = answers[index] === null;

    const optionButtons = q.options.map((text, i) =>
      button(`${LETTERS[i]}. ${text}`, () => {
        answers[index] = i;
        optionButtons.forEach((other, j) => { other.className = j === i ? BTN_SELECTED : BTN; });
        next.disabled = false;
      }, answers[index] === i ? BTN_SELECTED : BTN));

    const progress = h('div', 'h-full rounded bg-blue-600 transition-all');
    progress.style.width = `${(index / questions.length) * 100}%`;
    const short = questions.length < QUIZ_SIZE
      ? [h('p', 'text-sm text-amber-700', `This quiz has ${questions.length} questions because there are not ${QUIZ_SIZE} yet.`)]
      : [];

    render(
      titleRow('Blackboard'),
      h('div', 'h-2 w-full rounded bg-slate-200', progress),
      h('p', 'text-sm text-slate-600', `Question ${index + 1} of ${questions.length}`),
      ...(index === 0 ? short : []),
      h('p', 'text-lg font-semibold', q.text),
      h('div', 'space-y-2', ...optionButtons),
      h('div', 'flex gap-2',
        ...(index > 0 ? [button('Back', () => showQuestion(source, questions, answers, index - 1), BTN_QUIET)] : []),
        next),
    );
  }

  // ----- Submit: the server checks the answers and adds the points -----
  async function submit(source: Source, questions: QuizQuestion[], answers: Array<number | null>): Promise<void> {
    render(titleRow('Blackboard'), h('p', 'text-slate-500', 'Checking your answers…'));
    const body: SubmitRequest = {
      ...(source.kind === 'mixed' ? { mixed: true } : { topicId: source.topic.id }),
      answers: questions.map((q, i) => ({ questionId: q.id, answerIndex: answers[i] ?? 0 })),
    };
    try {
      const result = await submitQuiz(body);
      options.onPointsChange?.(result.totalPoints);
      window.dispatchEvent(new CustomEvent('points-changed', { detail: { points: result.totalPoints } }));
      showResults(questions, answers, result);
    } catch (err) {
      // Safe to retry: the server never pays a question twice.
      showError(err, () => { void submit(source, questions, answers); }, 'Try submitting again');
    }
  }

  // ----- Screen 3: results with explanations -----
  function showResults(questions: QuizQuestion[], answers: Array<number | null>, result: SubmitResponse): void {
    const byId = new Map(result.results.map((r) => [r.questionId, r]));
    const review = questions.map((q, i) => {
      const r = byId.get(q.id);
      const mine = answers[i] ?? 0;
      const correct = r?.correct === true;
      const card = h('div', `rounded-lg border p-3 text-sm ${correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`,
        h('p', 'font-semibold', `${correct ? '✓' : '✗'} ${i + 1}. ${q.text}`),
        h('p', '', `Your answer: ${q.options[mine]}`),
      );
      if (r && !correct) card.append(h('p', 'font-medium', `Correct answer: ${q.options[r.correctIndex]}`));
      if (r) card.append(h('p', 'mt-1 italic text-slate-600', r.explanation));
      return card;
    });

    const pointsLine = result.pointsEnabled
      ? `+${result.pointsEarned} points. Your total is ${result.totalPoints}.`
      : 'Practice quiz: your own quizzes do not earn points.';
    const repeatNote = result.pointsEnabled && result.correctCount * POINTS_PER_CORRECT > result.pointsEarned
      ? [h('p', 'text-sm text-slate-600', 'You only earn points the first time you answer each question correctly.')]
      : [];

    render(
      titleRow('Results'),
      h('p', 'text-3xl font-bold text-blue-700', `${result.correctCount} of ${result.totalQuestions} correct`),
      h('p', 'font-medium', pointsLine),
      ...repeatNote,
      h('div', 'space-y-2', ...review),
      h('div', 'flex gap-2',
        button('Try another topic', () => { void showTopics(); }, BTN_QUIET),
        button('Back to classroom', close, BTN_PRIMARY)),
    );
  }

  void showTopics();
}
