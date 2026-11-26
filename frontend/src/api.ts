import type { ApiEnvelope, BuyResponse, Item, Lesson, Question, SubmitRequest, SubmitResponse, Topic, User, AdminQuestion } from './types';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiError'; }
}

export async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload: ApiEnvelope<T>;
  try { payload = await response.json() as ApiEnvelope<T>; }
  catch { throw new ApiError('Invalid server response', response.status); }
  if (!response.ok || payload.success === false) throw new ApiError(payload.message ?? 'Request failed', response.status);
  return (payload.data ?? payload) as T;
}

export const login = (username: string, password: string): Promise<User> => request('POST', '/api/login', { username, password });
export const logout = (): Promise<{ message: string }> => request('POST', '/api/logout');
export const getMe = (): Promise<User> => request('GET', '/api/me');
export const getTopics = (): Promise<Topic[]> => request('GET', '/api/topics');
export const getLessons = (topicId: number): Promise<Lesson[]> => request('GET', `/api/topics/${topicId}/lessons`);
export const getQuestions = (topicId: number): Promise<Question[]> => request('GET', `/api/topics/${topicId}/questions`);
export const submitQuiz = (body: SubmitRequest): Promise<SubmitResponse> => request('POST', '/api/quiz/submit', body);
export const getItems = (): Promise<Item[]> => request('GET', '/api/canteen/items');
export const buyItem = (itemId: number): Promise<BuyResponse> => request('POST', '/api/canteen/buy', { itemId });
export const getPoints = (): Promise<{ points: number }> => request('GET', '/api/points');
export const createTopic = (body: Pick<Topic, 'title' | 'ownerId' | 'isPublic'>): Promise<Topic> => request('POST', '/api/admin/topics', body);
export const updateTopic = (id: number, body: Partial<Topic>): Promise<Topic> => request('PUT', `/api/admin/topics/${id}`, body);
export const deleteTopic = (id: number): Promise<void> => request('DELETE', `/api/admin/topics/${id}`);
export const createLesson = (body: Omit<Lesson, 'id'>): Promise<Lesson> => request('POST', '/api/admin/lessons', body);
export const updateLesson = (id: number, body: Partial<Lesson>): Promise<Lesson> => request('PUT', `/api/admin/lessons/${id}`, body);
export const deleteLesson = (id: number): Promise<void> => request('DELETE', `/api/admin/lessons/${id}`);
export const createQuestion = (body: AdminQuestion): Promise<AdminQuestion> => request('POST', '/api/admin/questions', body);
export const updateQuestion = (id: number, body: Partial<AdminQuestion>): Promise<AdminQuestion> => request('PUT', `/api/admin/questions/${id}`, body);
export const deleteQuestion = (id: number): Promise<void> => request('DELETE', `/api/admin/questions/${id}`);
export const createItem = (body: Omit<Item, 'id'>): Promise<Item> => request('POST', '/api/admin/items', body);
export const updateItem = (id: number, body: Partial<Item>): Promise<Item> => request('PUT', `/api/admin/items/${id}`, body);
export const deleteItem = (id: number): Promise<void> => request('DELETE', `/api/admin/items/${id}`);
