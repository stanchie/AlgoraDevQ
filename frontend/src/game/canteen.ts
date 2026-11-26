// Owner: Hazel
export class CanteenScene {
  render(canvas: HTMLCanvasElement): void {
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#fff7d7';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#172b45';
    context.font = '24px sans-serif';
    context.fillText('Canteen scene stub', 24, 48);
  }
}
