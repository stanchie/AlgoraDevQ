export function updateHud(points: number): void {
  const score = document.querySelector<HTMLElement>('[data-points]');
  if (score) score.textContent = `Points: ${points}`;
}
