import { startQuiz as openQuiz } from '../ui/quiz';
import type { GameState } from './types';

let modalRoot: HTMLElement | null = null;
let appRoot: HTMLElement | null = null;
let state: GameState | null = null;

export function bindUi(root: HTMLElement, gameState: GameState): void {
  appRoot = root;
  state = gameState;
}

export function showModal(title: string, content: HTMLElement): void {
  if (!appRoot || !state) return;
  closeModal();
  state.modalOpen = true;
  modalRoot = document.createElement('div');
  modalRoot.className = 'fixed inset-0 z-50 flex items-center justify-center bg-[#172b45]/45 p-4';
  const card = document.createElement('section');
  card.className = 'max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#dfe6ee] bg-white p-6 shadow-2xl';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', title);
  const heading = document.createElement('h2');
  heading.className = 'text-2xl font-bold text-[#172b45]';
  heading.textContent = title;
  content.classList.add('mt-3', 'text-base', 'leading-7', 'text-[#61738b]');
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'mt-6 rounded-xl bg-[#3375cb] px-5 py-3 font-semibold text-white hover:bg-[#2865b2]';
  close.textContent = 'Close'; close.addEventListener('click', closeModal);
  card.append(heading, content, close);
  modalRoot.append(card);
  modalRoot.addEventListener('click', (event) => { if (event.target === modalRoot) closeModal(); });
  appRoot.append(modalRoot);
  close.focus();
}

export function closeModal(): void {
  modalRoot?.remove(); modalRoot = null;
  if (state) state.modalOpen = false;
}

function placeholder(title: string, message: string): void {
  const content = document.createElement('p'); content.textContent = message; showModal(title, content);
}
export function openLessons(): void { placeholder('Bookshelf', 'Lessons will appear here. Choose a topic to begin learning.'); }
export function startQuiz(): void {
  if (!state) return;
  state.modalOpen = true;
  openQuiz({ onClose: () => { if (state) state.modalOpen = false; } });
}
export function goToCanteen(): void {
  if (!state) return;
  state.scene = 'canteen'; window.dispatchEvent(new Event('game-scene-change'));
}
export function updateHud(points: number): void {
  const score = document.querySelector<HTMLElement>('[data-points]');
  if (score) score.textContent = `Points: ${points}`;
}
