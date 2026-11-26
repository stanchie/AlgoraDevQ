let modal: HTMLElement | null = null;

export function showModal(title: string, content: string | HTMLElement): void {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4';
  const dialog = document.createElement('section');
  dialog.className = 'w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const heading = document.createElement('h2');
  heading.className = 'text-2xl font-bold';
  heading.textContent = title;
  const body = typeof content === 'string' ? document.createElement('p') : content;
  if (typeof content === 'string') body.textContent = content;
  const close = document.createElement('button');
  close.className = 'mt-6 rounded bg-blue-600 px-4 py-2 text-white';
  close.textContent = 'Close';
  close.addEventListener('click', closeModal);
  dialog.append(heading, body, close);
  backdrop.append(dialog);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(); });
  document.body.append(backdrop);
  modal = backdrop;
}

export function closeModal(): void { modal?.remove(); modal = null; }
