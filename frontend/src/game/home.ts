import { CANVAS_HEIGHT, CANVAS_WIDTH, canteenArt, canteenBounds, canteenExit, canteenObstacles, canteenPlayerSize, canteenPlayerStart, canteenShops, canteenTables, deskAssets, interactionDistance, obstacles, playerSize, playerSpeed, playerStart, roomBounds, sceneArt, zoneLabels, zones } from './config';
import { getMovement, startInput } from './input';
import type { CanteenShop, GameState, Rect, Zone } from './types';
import { closeModal, goToCanteen, openLessons, startQuiz } from './ui';

const assetFiles = [
  'classroom.svg', 'bookshelf.svg', 'blackboard.svg', 'canteen.svg', 'desk-upper-left.svg',
  'desk-upper-right.svg', 'desk-lower-left.svg', 'desk-lower-right.svg', 'player.svg',
  'plant-upper-left.svg', 'plant-upper-right.svg', 'canteen-room.svg', 'juice-shop.svg',
  'sandwich-shop.svg', 'cookie-shop.svg', 'canteen-table-left.svg', 'canteen-table-right.svg',
  'canteen-plant-left.svg', 'canteen-plant-right.svg', 'canteen-player-legs.svg',
  'canteen-player-sweater.svg', 'canteen-player-head.svg', 'boy-legs.svg', 'boy-sweater.svg', 'boy-head.svg',
  'juice.svg', 'sandwich.svg', 'cookies.svg',
];
const images = new Map<string, HTMLImageElement>();
let activeZone: Zone | null = null;
let activeShop: CanteenShop | null = null;
let selectedShop: CanteenShop | null = null;
let activeExit = false;
let selectedAvatar: 'boy' | 'girl' = 'girl';
let debugEnabled = false;

export function initHome(canvas: HTMLCanvasElement, state: GameState, badge: HTMLElement): void {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  for (const file of assetFiles) {
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}assets/${file}`;
    images.set(file, image);
  }
  window.addEventListener('avatar-change', (event: Event) => {
    selectedAvatar = (event as CustomEvent<'boy' | 'girl'>).detail;
  });
  const player = { x: playerStart.x, y: playerStart.y };
  let lastScene = state.scene;
  let previous = 0;
  const draw = (time: number): void => {
    const delta = previous === 0 ? 0 : Math.min((time - previous) / 1000, 0.05);
    previous = time;
    if (state.scene !== lastScene) {
      const start = state.scene === 'canteen' ? canteenPlayerStart : playerStart;
      player.x = start.x;
      player.y = start.y;
      lastScene = state.scene;
      activeZone = null;
      activeShop = null;
      selectedShop = null;
      window.dispatchEvent(new CustomEvent('shop-selected', { detail: null }));
    }
    if (!state.modalOpen) {
      const direction = getMovement();
      const length = Math.hypot(direction.x, direction.y) || 1;
      const dx = direction.x / length * playerSpeed * delta;
      const dy = direction.y / length * playerSpeed * delta;
      const bounds = state.scene === 'canteen' ? canteenBounds : roomBounds;
      const size = state.scene === 'canteen' ? canteenPlayerSize : playerSize;
      const blockers = state.scene === 'canteen' ? canteenObstacles : obstacles;
      moveAxis(player, dx, 0, bounds, blockers, size);
      moveAxis(player, 0, dy, bounds, blockers, size);
    }
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (state.scene === 'canteen') {
      drawCanteen(context, player);
      activeZone = null;
      activeShop = findShop(player);
      drawShopHighlight(context, activeShop);
    } else {
      drawScene(context, player);
      activeZone = findZone(player);
      activeShop = null;
      drawZoneEffects(context, activeZone);
    }
    if (debugEnabled) drawDebug(context, player, state.scene === 'canteen');
    activeExit = state.scene === 'canteen' && intersects({ x: player.x, y: player.y, ...canteenPlayerSize }, canteenExit.interaction);
    const nearby = state.scene === 'canteen' ? activeShop ?? (activeExit ? { label: 'Classroom exit' } : null) : activeZone;
    badge.classList.toggle('hidden', !nearby || state.modalOpen);
    badge.innerHTML = nearby ? `<span class="rounded-md bg-[#fff7d7] px-2 py-1 font-bold text-[#826018]">Press E</span><span>${state.scene === 'canteen' ? activeShop?.name ?? 'Classroom exit' : activeZone?.label ?? ''}</span>` : '';
    requestAnimationFrame(draw);
  };
  startInput(
    () => {
      if (state.modalOpen) return;
      if (state.scene === 'home') {
        if (!activeZone) return;
        if (activeZone.id === 'bookshelf') openLessons();
        if (activeZone.id === 'blackboard') startQuiz();
        if (activeZone.id === 'door') goToCanteen();
      } else if (activeExit) {
        state.scene = 'home';
        window.dispatchEvent(new Event('game-scene-change'));
      } else if (activeShop) {
        selectedShop = activeShop;
        window.dispatchEvent(new CustomEvent('shop-selected', { detail: selectedShop }));
      }
    },
    () => {
      if (state.modalOpen) closeModal();
      else if (selectedShop) {
        selectedShop = null;
        window.dispatchEvent(new CustomEvent('shop-selected', { detail: null }));
      }
    },
    () => { debugEnabled = !debugEnabled; },
  );
  requestAnimationFrame(draw);
}

function moveAxis(player: { x: number; y: number }, dx: number, dy: number, bounds: Rect, blockers: Rect[], size: { w: number; h: number }): void {
  const next = { x: player.x + dx, y: player.y + dy, ...size };
  if (next.x < bounds.x || next.y < bounds.y || next.x + next.w > bounds.x + bounds.w || next.y + next.h > bounds.y + bounds.h) return;
  if (blockers.some((obstacle) => intersects(next, obstacle))) return;
  player.x += dx;
  player.y += dy;
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findZone(player: { x: number; y: number }): Zone | null {
  const center = { x: player.x + playerSize.w / 2, y: player.y + playerSize.h / 2 };
  let closest: Zone | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const zone of zones) {
    const px = Math.max(zone.x, Math.min(center.x, zone.x + zone.w));
    const py = Math.max(zone.y, Math.min(center.y, zone.y + zone.h));
    const distance = Math.hypot(center.x - px, center.y - py);
    if ((intersects({ x: player.x, y: player.y, ...playerSize }, zone) || distance <= interactionDistance) && distance < closestDistance) {
      closest = zone;
      closestDistance = distance;
    }
  }
  return closest;
}

function drawImage(context: CanvasRenderingContext2D, file: string, rect: Rect): void {
  const image = images.get(file);
  if (image?.complete && image.naturalWidth > 0) context.drawImage(image, rect.x, rect.y, rect.w, rect.h);
}

function drawScene(context: CanvasRenderingContext2D, player: { x: number; y: number }): void {
  drawImage(context, 'classroom.svg', sceneArt.room);
  zones.forEach((zone) => drawImage(context, `${zone.id === 'door' ? 'canteen' : zone.id}.svg`, zone));
  drawImage(context, 'plant-upper-left.svg', sceneArt.plantUpperLeft);
  drawImage(context, 'plant-upper-right.svg', sceneArt.plantUpperRight);
  obstacles.forEach((obstacle, index) => drawImage(context, deskAssets[index], obstacle));
  drawImage(context, 'player.svg', { ...player, ...playerSize });
  drawZoneLabels(context);
}

function findShop(player: { x: number; y: number }): CanteenShop | null {
  const body = { x: player.x, y: player.y, ...canteenPlayerSize };
  const center = { x: player.x + canteenPlayerSize.w / 2, y: player.y + canteenPlayerSize.h / 2 };
  return canteenShops.find((shop) => intersects(body, shop.interaction) || Math.hypot(center.x - shop.interaction.x - shop.interaction.w / 2, center.y - shop.interaction.y - shop.interaction.h / 2) < interactionDistance) ?? null;
}

function drawCanteen(context: CanvasRenderingContext2D, player: { x: number; y: number }): void {
  drawImage(context, 'canteen-room.svg', canteenArt.room);
  canteenShops.forEach((shop) => drawImage(context, `${shop.id === 'juice' ? 'juice' : shop.id === 'sandwich' ? 'sandwich' : 'cookie'}-shop.svg`, shop));
  drawImage(context, 'canteen-plant-left.svg', canteenArt.plantLeft);
  drawImage(context, 'canteen-plant-right.svg', canteenArt.plantRight);
  drawImage(context, 'canteen-table-left.svg', canteenTables[0]);
  drawImage(context, 'canteen-table-right.svg', canteenTables[1]);
  drawCanteenExit(context, activeExit);
  drawCanteenPlayer(context, player);
  for (const shop of canteenShops) {
    drawCanteenLabel(context, shop.name, `${shop.price} points`, shop.x + shop.w / 2);
  }
}

function drawCanteenLabel(context: CanvasRenderingContext2D, title: string, price: string, centerX: number): void {
  const pill = (x: number, y: number, w: number, text: string, color: string, font: string): void => {
    context.save();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.roundRect(x, y, w, 34, 9);
    context.fill();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.font = font;
    context.fillText(text, centerX, y + 17);
    context.restore();
  };
  pill(centerX - 90, 104, 180, title, '#172b45', '600 15px Inter, ui-sans-serif, system-ui, sans-serif');
  pill(centerX - 65, 217, 130, price, '#826018', '700 16px Inter, ui-sans-serif, system-ui, sans-serif');
}

function drawCanteenPlayer(context: CanvasRenderingContext2D, player: { x: number; y: number }): void {
  const prefix = selectedAvatar === 'boy' ? 'boy' : 'canteen-player';
  drawImage(context, `${prefix}-head.svg`, { x: player.x + 5, y: player.y, w: 42, h: 34 });
  drawImage(context, `${prefix}-sweater.svg`, { x: player.x + 7, y: player.y + 29, w: 36, h: 23 });
  drawImage(context, `${prefix}-legs.svg`, { x: player.x + 13, y: player.y + 48, w: 26, h: 20 });
  context.save();
  context.fillStyle = '#172b45';
  context.font = '600 12px Inter, ui-sans-serif, system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText('alex', player.x + canteenPlayerSize.w / 2, player.y + canteenPlayerSize.h + 12);
  context.restore();
}

function drawCanteenExit(context: CanvasRenderingContext2D, highlighted: boolean): void {
  const { x, y, w, h } = canteenExit.door;
  context.save();
  context.fillStyle = '#435c72';
  context.beginPath();
  context.roundRect(x - 4, y - 5, w + 8, h + 7, 8);
  context.fill();
  context.fillStyle = '#b4cfdc';
  context.beginPath();
  context.roundRect(x, y, w, h, 5);
  context.fill();
  context.fillStyle = '#f7fafc';
  context.fillRect(x + 7, y + 6, w - 14, h - 6);
  context.fillStyle = '#826018';
  context.beginPath();
  context.arc(x + w - 14, y + h / 2, 2.5, 0, Math.PI * 2);
  context.fill();
  context.font = '700 11px Inter, ui-sans-serif, system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillStyle = '#172b45';
  context.fillText('CLASSROOM', x + w / 2, y - 9);
  if (highlighted) {
    context.setLineDash([5, 4]);
    context.lineWidth = 2;
    context.strokeStyle = '#3375cb';
    context.strokeRect(canteenExit.interaction.x, canteenExit.interaction.y, canteenExit.interaction.w, canteenExit.interaction.h);
  }
  context.restore();
}

function drawShopHighlight(context: CanvasRenderingContext2D, shop: CanteenShop | null): void {
  if (!shop) return;
  context.save();
  context.fillStyle = `${shop.color}18`;
  context.strokeStyle = shop.color;
  context.lineWidth = 3;
  context.setLineDash([8, 5]);
  context.fillRect(shop.interaction.x, shop.interaction.y, shop.interaction.w, shop.interaction.h);
  context.strokeRect(shop.interaction.x, shop.interaction.y, shop.interaction.w, shop.interaction.h);
  context.restore();
}

function drawZoneLabels(context: CanvasRenderingContext2D): void {
  for (const tag of zoneLabels) {
    context.save();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.roundRect(tag.x, tag.y, tag.w, tag.h, 9);
    context.fill();
    context.fillStyle = tag.color;
    context.font = '600 16px Inter, ui-sans-serif, system-ui, sans-serif';
    context.textBaseline = 'middle';
    context.fillText(`${tag.number}  ${tag.label}`, tag.x + 14, tag.y + tag.h / 2);
    context.restore();
  }
}

function drawZoneEffects(context: CanvasRenderingContext2D, zone: Zone | null): void {
  if (!zone) return;
  context.save();
  context.fillStyle = `${zone.color}30`;
  context.strokeStyle = zone.color;
  context.lineWidth = 3;
  context.setLineDash([8, 5]);
  context.fillRect(zone.x, zone.y, zone.w, zone.h);
  context.strokeRect(zone.x, zone.y, zone.w, zone.h);
  context.restore();
}

function drawDebug(context: CanvasRenderingContext2D, player: { x: number; y: number }, canteen: boolean): void {
  const blockers = canteen ? canteenObstacles : obstacles;
  const currentZones: Rect[] = canteen ? canteenShops.map((shop) => shop.interaction) : zones;
  const size = canteen ? canteenPlayerSize : playerSize;
  context.save();
  context.lineWidth = 2;
  context.strokeStyle = '#ef4444';
  for (const obstacle of blockers) context.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  context.strokeStyle = '#2563eb';
  for (const zone of currentZones) context.strokeRect(zone.x, zone.y, zone.w, zone.h);
  context.strokeStyle = '#111827';
  context.strokeRect(player.x, player.y, size.w, size.h);
  context.restore();
}
