let modal: HTMLElement | null = null;
let previousFocus: HTMLElement | null = null;
let previousOverflow = '';
let keyHandler: ((event: KeyboardEvent) => void) | null = null;

export function showModal(title: string, content: string | HTMLElement): void {
  closeModal();
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  previousOverflow = document.body.style.overflow;
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5';
  const dialog = document.createElement('section');
  dialog.className = 'max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7';
  dialog.tabIndex = -1;
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
  const heading = document.createElement('h2'); heading.className = 'text-2xl font-bold'; heading.textContent = title;
  const body = typeof content === 'string' ? document.createElement('p') : content;
  if (typeof content === 'string') body.textContent = content;
  const close = document.createElement('button'); close.type = 'button';
  close.className = 'mt-6 rounded bg-blue-600 px-4 py-2 text-white'; close.textContent = 'Close';
  close.addEventListener('click', closeModal);
  dialog.append(heading, body, close); backdrop.append(dialog);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(); });
  keyHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); }
    else if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')];
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  window.addEventListener('keydown', keyHandler, true);
  document.body.style.overflow = 'hidden'; document.body.append(backdrop); modal = backdrop; close.focus();
}

export function closeModal(): void {
  if (!modal) return;
  modal.remove(); modal = null;
  if (keyHandler) window.removeEventListener('keydown', keyHandler, true);
  keyHandler = null; document.body.style.overflow = previousOverflow;
  previousFocus?.focus(); previousFocus = null;
}
