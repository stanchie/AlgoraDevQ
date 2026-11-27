import '../style.css';
import { mountQuizAdmin } from './quizAdmin';

const root = document.querySelector<HTMLElement>('#admin-app');
if (root) mountQuizAdmin(root);
