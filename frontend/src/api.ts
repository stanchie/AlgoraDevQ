import type { ApiEnvelope, BuyResponse, Item, Lesson, QuizQuestion, SubmitRequest, SubmitResponse, Topic, User, AdminQuestion } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload: ApiEnvelope<T> & Record<string, unknown>;
  try {
    payload = await response.json() as ApiEnvelope<T> & Record<string, unknown>;
  } catch {
    throw new ApiError(`Server returned an invalid response (${response.status})`, response.status);
  }
  if (!response.ok || payload.success === false) {
    throw new ApiError(typeof payload.message === 'string' ? payload.message : `Request failed (${response.status})`, response.status);
  }
  if ('data' in payload) return payload.data as T;
  // Compatibility with endpoints that return named fields alongside success.
  const { success: _success, ...data } = payload;
  return data as T;
}

export const login = (username: string, password: string): Promise<User> => request('POST', '/api/login', { username, password });
export const logout = (): Promise<{ message: string }> => request('POST', '/api/logout');
export const getMe = (): Promise<User> => request('GET', '/api/me');
export const getTopics = (): Promise<Topic[]> => request('GET', '/api/topics');
export const getLessons = (topicId: number): Promise<Lesson[]> => request('GET', `/api/topics/${topicId}/lessons`);
export const getQuestions = (topicId: number): Promise<QuizQuestion[]> => request('GET', `/api/topics/${topicId}/questions`);
export const getMixedQuestions = (): Promise<QuizQuestion[]> => request('GET', '/api/quiz/mixed/questions');
export const submitQuiz = (body: SubmitRequest): Promise<SubmitResponse> => request('POST', '/api/quiz/submit', body);
export const getItems = (): Promise<Item[]> => request('GET', '/api/canteen/items');
export const buyItem = (itemId: number): Promise<BuyResponse> => request('POST', '/api/canteen/buy', { itemId });

export type { AdminQuestion };
