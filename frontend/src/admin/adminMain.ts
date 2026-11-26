import '../style.css';
import { renderLessonsAdmin } from './lessonsAdmin';
const root = document.querySelector<HTMLDivElement>('#admin-app');
if (root) renderLessonsAdmin(root);
