import type { CanteenShop, Rect, Zone } from './types';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

// Coordinates are in 960 × 540 canvas units, mapped from the Figma room.
export const zones: Zone[] = [
  { id: 'bookshelf', label: 'Bookshelf', x: 84, y: 167, w: 172, h: 180, color: '#238265' },
  { id: 'blackboard', label: 'Blackboard', x: 293, y: 37, w: 393, h: 120, color: '#b45b1d' },
  { id: 'door', label: 'Canteen', x: 716, y: 170, w: 192, h: 179, color: '#826018' },
];
export const zoneLabels: Array<Rect & { id: Zone['id']; number: string; label: string; color: string }> = [
  { id: 'bookshelf', number: '01', label: 'Bookshelf', x: 18, y: 339, w: 190, h: 42, color: '#238265' },
  { id: 'blackboard', number: '02', label: 'Blackboard', x: 357, y: 152, w: 205, h: 42, color: '#b45b1d' },
  { id: 'door', number: '03', label: 'Canteen', x: 745, y: 339, w: 185, h: 42, color: '#826018' },
];

export const obstacles: Rect[] = [
  { x: 346, y: 285, w: 119, h: 90 },
  { x: 548, y: 285, w: 119, h: 90 },
  { x: 346, y: 398, w: 119, h: 90 },
  { x: 548, y: 398, w: 119, h: 90 },
];

export const roomBounds: Rect = { x: 24, y: 14, w: 912, h: 511 };
export const sceneArt: Record<'room' | 'plantUpperLeft' | 'plantUpperRight', Rect> = {
  room: { x: 0, y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT },
  plantUpperLeft: { x: 105, y: 47, w: 67, h: 91 },
  plantUpperRight: { x: 788, y: 47, w: 67, h: 91 },
};
export const deskAssets = ['desk-upper-left.svg', 'desk-upper-right.svg', 'desk-lower-left.svg', 'desk-lower-right.svg'];
export const playerStart = { x: 477, y: 180 };
export const playerSize = { w: 60, h: 95 };
export const playerSpeed = 180;
export const interactionDistance = 28;

export const canteenBounds: Rect = { x: 24, y: 14, w: 912, h: 511 };
export const canteenPlayerStart = { x: 454, y: 418 };
export const canteenPlayerSize = { w: 52, h: 70 };
export const canteenExit = {
  door: { x: 335, y: 490, w: 72, h: 35 },
  interaction: { x: 326, y: 473, w: 90, h: 52 },
};
export const canteenShops: CanteenShop[] = [
  { id: 'juice', name: 'Juice bar', item: 'Orange juice', price: 30, color: '#238265', image: 'juice.svg', x: 74, y: 61, w: 218, h: 207, interaction: { x: 101, y: 281, w: 163, h: 41 } },
  { id: 'sandwich', name: 'Sandwich stall', item: 'Toasted sandwich', price: 60, color: '#b45b1d', image: 'sandwich.svg', x: 371, y: 61, w: 218, h: 207, interaction: { x: 398, y: 281, w: 163, h: 41 } },
  { id: 'cookies', name: 'Cookie cart', item: 'Cookies', price: 120, color: '#826018', image: 'cookies.svg', x: 668, y: 61, w: 218, h: 207, interaction: { x: 695, y: 281, w: 163, h: 41 } },
];
export const canteenTables: Rect[] = [
  { x: 76, y: 390, w: 180, h: 70 },
  { x: 704, y: 390, w: 180, h: 70 },
];
export const canteenObstacles: Rect[] = [...canteenShops, ...canteenTables];
export const canteenArt: Record<'room' | 'plantLeft' | 'plantRight', Rect> = {
  room: { x: 0, y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT },
  plantLeft: { x: 36, y: 43, w: 39, h: 70 },
  plantRight: { x: 885, y: 43, w: 39, h: 70 },
};
