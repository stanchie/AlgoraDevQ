import type { ApiEnvelope, BuyResponse, Item, Lesson, Question, SubmitRequest, SubmitResponse, Topic, User, AdminQuestion } from './types';
import type { ApiEnvelope, BuyResponse, Item, Lesson, Question, QuizQuestion, SubmitRequest, SubmitResponse, Topic, User, AdminQuestion } from './types';

export class ApiError extends Error {
constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiError'; }
@@ -23,7 +23,8 @@ export const logout = (): Promise<{ message: string }> => request('POST', '/api/
export const getMe = (): Promise<User> => request('GET', '/api/me');
export const getTopics = (): Promise<Topic[]> => request('GET', '/api/topics');
export const getLessons = (topicId: number): Promise<Lesson[]> => request('GET', `/api/topics/${topicId}/lessons`);
export const getQuestions = (topicId: number): Promise<Question[]> => request('GET', `/api/topics/${topicId}/questions`);
export const getQuestions = (topicId: number): Promise<QuizQuestion[]> => request('GET', `/api/topics/${topicId}/questions`); // CHANGED: QuizQuestion[]
export const getMixedQuestions = (): Promise<QuizQuestion[]> => request('GET', '/api/quiz/mixed/questions'); // NEW
export const submitQuiz = (body: SubmitRequest): Promise<SubmitResponse> => request('POST', '/api/quiz/submit', body);
export const getItems = (): Promise<Item[]> => request('GET', '/api/canteen/items');
export const buyItem = (itemId: number): Promise<BuyResponse> => request('POST', '/api/canteen/buy', { itemId });
