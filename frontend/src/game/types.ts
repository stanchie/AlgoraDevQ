export type Rect = { x: number; y: number; w: number; h: number };

export type Zone = Rect & {
  id: 'bookshelf' | 'blackboard' | 'door';
  label: string;
  color: string;
};

export type CanteenShop = Rect & {
  id: 'juice' | 'sandwich' | 'cookies';
  name: string;
  item: string;
  price: number;
  color: string;
  image: string;
  interaction: Rect;
};

export type GameState = {
  scene: 'home' | 'canteen';
  points: number;
  modalOpen: boolean;
};

export type Role = 'student' | 'admin';
export type User = { id: number; username: string; role: Role; points: number; avatarColor: string };
export type Topic = { id: number; title: string; ownerId: number | null; isPublic: boolean };
export type Lesson = { id: number; topicId: number; title: string; content: string; orderNo: number };
export type Question = { id: number; topicId: number; text: string; options: string[]; explanation: string };
export type AdminQuestion = Question & { answerIndex: number };
export type Item = { id: number; name: string; cost: number };
export type SubmitRequest = { topicId: number; answers: number[] };
export type SubmitResponse = { pointsEarned: number; totalPoints: number; results: Array<{ correct: boolean; explanation: string }> };
export type BuyResponse = { success: boolean; message: string; totalPoints: number };
