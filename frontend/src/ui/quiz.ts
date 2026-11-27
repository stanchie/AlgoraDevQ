import { ApiError, getMixedQuestions, getQuestions, getTopics, login, submitQuiz } from '../api';
import type { QuizQuestion, SubmitRequest, SubmitResponse, Topic, User } from '../types';

export type QuizOptions = {
  onPointsChange?: (totalPoints: number) => void;
  onClose?: () => void;
};

type Source = { kind: 'topic'; topic: Topic } | { kind: 'mixed' };
const QUIZ_SIZE = 20;
const POINTS_PER_CORRECT = 10;
const LETTERS = 'ABCDEF';
const BTN = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-left hover:bg-slate-50 disabled:opacity-50';
const BTN_SELECTED = 'w-full rounded-lg border-2 border-blue-600 bg-blue-50 px-4 py-2 text-left font-medium';
const BTN_PRIMARY = 'w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
const BTN_QUIET = 'rounded-lg border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50 disabled:opacity-50';

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}
function button(label: string, onClick: () => void | Promise<void>, className = BTN): HTMLButtonElement {
  const node = h('button', className, label);
  node.type = 'button';
  node.addEventListener('click', () => { void onClick(); });
  return node;
}
function messageOf(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) return 'Please log in to play the quiz.';
  return err instanceof Error ? err.message : String(err);
}

export function startQuiz(options: QuizOptions = {}): void {
  if (document.getElementById('quiz-overlay')) return;
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const oldOverflow = document.body.style.overflow;
  const overlay = h('div', 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5');
  overlay.id = 'quiz-overlay';
  const panel = h('section', 'max-h-[92dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-xl bg-white p-4 text-slate-900 shadow-xl sm:p-6');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'quiz-title');
  panel.tabIndex = -1;
  overlay.append(panel);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';
  let closed = false;

  function close(): void {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKeyDown, true);
    document.body.style.overflow = oldOverflow;
    overlay.remove();
    previousFocus?.focus();
    options.onClose?.();
  }
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') {
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')];
      if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    event.stopPropagation();
  }
  window.addEventListener('keydown', onKeyDown, true);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  const render = (...nodes: Node[]) => panel.replaceChildren(...nodes);
  const titleRow = (title: string): HTMLElement => {
    const heading = h('h2', 'text-lg font-bold', title);
    heading.id = 'quiz-title';
    return h('div', 'flex items-center justify-between gap-2', heading, button('Close', close, BTN_QUIET));
  };
  const showError = (err: unknown, retry: () => void, retryLabel = 'Try again') => {
    if (err instanceof ApiError && err.status === 401) { showLogin(); return; }
    render(titleRow('Blackboard'), h('p', 'text-red-600', messageOf(err)), button(retryLabel, retry, BTN_PRIMARY), button('Back to topics', () => { void showTopics(); }));
  };

  function showLogin(): void {
    const username = h('input', 'w-full rounded-lg border border-slate-300 px-3 py-2');
    username.name = 'username'; username.autocomplete = 'username'; username.required = true; username.minLength = 3; username.maxLength = 20; username.placeholder = 'Username';
    const password = h('input', 'w-full rounded-lg border border-slate-300 px-3 py-2');
    password.type = 'password'; password.name = 'password'; password.autocomplete = 'current-password'; password.required = true; password.placeholder = 'Password';
    const error = h('p', 'text-sm text-red-600');
    const submit = button('Log in / create account', async () => {
      if (!username.reportValidity() || !password.reportValidity()) return;
      submit.disabled = true; error.textContent = '';
      try { await login(username.value.trim(), password.value); await showTopics(); }
      catch (err) { error.textContent = messageOf(err); submit.disabled = false; }
    }, BTN_PRIMARY);
    render(titleRow('Log in to play'), h('p', 'text-sm text-slate-600', 'Use your classroom username and password. A new username creates an account.'), username, password, error, submit);
    username.focus();
  }

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
        ...topics.map((topic) => ({ label: topic.ownerId === null ? topic.title : `${topic.title} (my quiz)`, source: { kind: 'topic', topic } as Source })),
      ];
      choices.forEach((choice) => {
        const item = button(choice.label, () => {
          selected = choice.source;
          list.querySelectorAll('button').forEach((other) => { other.className = other.textContent === choice.label ? BTN_SELECTED : BTN; });
          start.disabled = false;
        });
        list.append(item);
      });
      render(titleRow('Blackboard'), h('p', 'text-sm text-slate-600', `Choose a topic. A quiz has up to ${QUIZ_SIZE} questions; correct answers earn ${POINTS_PER_CORRECT} points once. Answers and explanations appear after submission.`), list, start);
      if (!topics.length) list.append(h('p', 'text-sm text-slate-500', 'No topics available yet.'));
    } catch (err) { showError(err, () => { void showTopics(); }); }
  }

  async function begin(source: Source): Promise<void> {
    render(titleRow('Blackboard'), h('p', 'text-slate-500', 'Getting your questions…'));
    try {
      const questions = source.kind === 'mixed' ? await getMixedQuestions() : await getQuestions(source.topic.id);
      if (!questions.length) {
        render(titleRow('Blackboard'), h('p', '', 'There are no questions in this topic yet.'), button('Back to topics', () => { void showTopics(); }, BTN_PRIMARY));
        return;
      }
      showQuestion(source, questions, questions.map(() => null), 0);
    } catch (err) { showError(err, () => { void begin(source); }); }
  }

  function showQuestion(source: Source, questions: QuizQuestion[], answers: Array<number | null>, index: number): void {
    const question = questions[index];
    const last = index === questions.length - 1;
    const next = button(last ? 'Submit answers' : 'Next', () => {
      if (last) void submit(source, questions, answers);
      else showQuestion(source, questions, answers, index + 1);
    }, BTN_PRIMARY);
    next.disabled = answers[index] === null;
    const choices = question.options.map((text, optionIndex) => button(`${LETTERS[optionIndex] ?? `${optionIndex + 1}`}. ${text}`, () => {
      answers[index] = optionIndex;
      choices.forEach((item, i) => { item.className = i === optionIndex ? BTN_SELECTED : BTN; });
      next.disabled = false;
    }, answers[index] === optionIndex ? BTN_SELECTED : BTN));
    const progress = h('div', 'h-2 rounded bg-blue-600');
    progress.style.width = `${((index + 1) / questions.length) * 100}%`;
    render(titleRow('Blackboard'), h('div', 'h-2 rounded bg-slate-200', progress), h('p', 'text-sm text-slate-600', `Question ${index + 1} of ${questions.length}`),
      ...(questions.length < QUIZ_SIZE ? [h('p', 'text-sm text-amber-700', `This quiz has ${questions.length} available questions.`)] : []),
      h('p', 'text-lg font-semibold', question.text), h('div', 'space-y-2', ...choices),
      h('div', 'flex gap-2', ...(index ? [button('Back', () => showQuestion(source, questions, answers, index - 1), BTN_QUIET)] : []), next));
  }

  async function submit(source: Source, questions: QuizQuestion[], answers: Array<number | null>): Promise<void> {
    if (answers.some((answer) => answer === null)) return;
    render(titleRow('Blackboard'), h('p', 'text-slate-500', 'Checking your answers…'));
    const body: SubmitRequest = { ...(source.kind === 'mixed' ? { mixed: true } : { topicId: source.topic.id }),
      answers: questions.map((question, index) => ({ questionId: question.id, answerIndex: answers[index] as number })) };
    try {
      const result = await submitQuiz(body);
      options.onPointsChange?.(result.totalPoints);
      window.dispatchEvent(new CustomEvent('points-changed', { detail: { points: result.totalPoints } }));
      showResults(questions, answers, result);
    } catch (err) { showError(err, () => { void submit(source, questions, answers); }, 'Try submitting again'); }
  }

  function showResults(questions: QuizQuestion[], answers: Array<number | null>, result: SubmitResponse): void {
    const byId = new Map(result.results.map((item) => [item.questionId, item]));
    const cards = questions.map((question, index) => {
      const graded = byId.get(question.id);
      const mine = answers[index] as number;
      const correct = graded?.correct === true;
      const card = h('div', `rounded-lg border p-3 text-sm ${correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`,
        h('p', 'font-semibold', `${correct ? '✓' : '✗'} ${index + 1}. ${question.text}`), h('p', '', `Your answer: ${question.options[mine] ?? '—'}`));
      if (graded && !correct) card.append(h('p', 'font-medium', `Correct answer: ${question.options[graded.correctIndex] ?? '—'}`));
      if (graded) card.append(h('p', 'mt-1 italic text-slate-600', graded.explanation));
      return card;
    });
    render(titleRow('Results'), h('p', 'text-3xl font-bold text-blue-700', `${result.correctCount} of ${result.totalQuestions} correct`),
      h('p', 'font-medium', result.pointsEnabled ? `+${result.pointsEarned} points. Your total is ${result.totalPoints}.` : 'Practice quiz: your own quizzes do not earn points.'),
      ...(result.pointsEnabled && result.correctCount * POINTS_PER_CORRECT > result.pointsEarned ? [h('p', 'text-sm text-slate-600', 'Points are awarded only the first time you answer each question correctly.')] : []),
      h('div', 'space-y-2', ...cards), h('div', 'flex gap-2', button('Try another topic', () => { void showTopics(); }, BTN_QUIET), button('Back to classroom', close, BTN_PRIMARY)));
  }

  void showTopics();
}
