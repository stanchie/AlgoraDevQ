export type Question = { id: number; topicId: number; text: string; options: string[]; explanation: string };
export type AdminQuestion = Question & { answerIndex: number };
export type Item = { id: number; name: string; cost: number };
export type SubmitRequest = { topicId: number; answers: number[] };
export type SubmitResponse = { pointsEarned: number; totalPoints: number; results: Array<{ correct: boolean; explanation: string }> };
// NEW: what students receive when a quiz starts. No answerIndex and no explanation: those only come back after submitting.
export type QuizQuestion = Pick<Question, 'id' | 'topicId' | 'text' | 'options'>;
// CHANGED: a quiz is now 20 random questions out of a bigger bank, so each answer names its question.
// Send topicId for a topic quiz, or mixed: true for the mix of all topics.
export type SubmitRequest = { topicId?: number; mixed?: boolean; answers: Array<{ questionId: number; answerIndex: number }> };
// NEW
export type QuestionResult = { questionId: number; correct: boolean; pointsAwarded: number; correctIndex: number; explanation: string };
// CHANGED: same pointsEarned / totalPoints / results as before, plus a few extra fields. pointsEnabled is false for a student's own quiz.
export type SubmitResponse = { pointsEarned: number; totalPoints: number; pointsEnabled: boolean; correctCount: number; totalQuestions: number; results: QuestionResult[] };
export type BuyResponse = { success: boolean; message: string; totalPoints: number };
export type ApiEnvelope<T> = { success: boolean; data?: T; message?: string };
