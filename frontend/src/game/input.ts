const held = new Set<string>();

export function startInput(onInteract: () => void, onEscape: () => void, onDebug: () => void): void {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    held.add(event.key.toLowerCase());
    if (event.repeat) return;
    if (event.key.toLowerCase() === 'e') onInteract();
    if (event.key === 'Escape') onEscape();
    if (event.key === 'F1') {
      event.preventDefault();
      onDebug();
    }
  });
  window.addEventListener('keyup', (event) => held.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => held.clear());
}

export function getMovement(): { x: number; y: number } {
  return {
    x: Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft')),
    y: Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup')),
  };
}
