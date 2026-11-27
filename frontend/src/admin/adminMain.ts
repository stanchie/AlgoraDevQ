import '../style.css';
import { ApiError, getMe, login, logout, registerFirstAdmin } from '../api';
import type { User } from '../types';
import { mountQuizAdmin } from './quizAdmin';

const root = document.querySelector<HTMLElement>('#admin-app');

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderAdmin(user: User): void {
  if (!root) return;
  const header = el('header', 'mx-auto flex max-w-3xl items-center justify-between p-4');
  header.append(el('p', 'text-sm text-slate-600', `Signed in as admin: ${user.username}`));
  const signOut = el('button', 'rounded-md border border-slate-300 px-3 py-1.5 text-sm', 'Sign out');
  signOut.type = 'button';
  signOut.addEventListener('click', async () => { await logout(); showAccess(); });
  header.append(signOut);
  root.replaceChildren(header);
  const adminRoot = el('div');
  root.append(adminRoot);
  mountQuizAdmin(adminRoot);
}

function showAccess(message = ''): void {
  if (!root) return;
  const card = el('main', 'mx-auto mt-10 max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm');
  card.append(el('h1', 'text-2xl font-bold', 'Admin access'));
  card.append(el('p', 'text-sm text-slate-600', 'Sign in with an existing admin account, or register the first admin using the server setup key.'));
  const status = el('p', 'text-sm text-red-600', message);

  const loginForm = el('form', 'space-y-3');
  const loginTitle = el('h2', 'font-semibold', 'Admin sign in');
  const loginUser = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  loginUser.placeholder = 'Username'; loginUser.autocomplete = 'username'; loginUser.required = true;
  const loginPass = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  loginPass.placeholder = 'Password'; loginPass.type = 'password'; loginPass.autocomplete = 'current-password'; loginPass.required = true;
  const loginButton = el('button', 'rounded-md bg-blue-600 px-4 py-2 font-medium text-white', 'Sign in');
  loginButton.type = 'submit';
  loginForm.append(loginTitle, loginUser, loginPass, loginButton);
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); status.textContent = '';
    try {
      const user = await login(loginUser.value.trim(), loginPass.value);
      if (user.role !== 'admin') {
        await logout();
        status.textContent = 'This account is not an administrator.';
        return;
      }
      renderAdmin(user);
    } catch (err) { status.textContent = err instanceof Error ? err.message : String(err); }
  });

  const registerForm = el('form', 'space-y-3 border-t border-slate-200 pt-4');
  const registerTitle = el('h2', 'font-semibold', 'Register the first admin');
  const note = el('p', 'text-xs text-slate-500', 'One-time setup: set ADMIN_SETUP_KEY in the Flask terminal before starting the server. Registration closes after the first admin is created.');
  const setupKey = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  setupKey.placeholder = 'Server setup key'; setupKey.type = 'password'; setupKey.required = true; setupKey.autocomplete = 'off';
  const adminUser = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  adminUser.placeholder = 'New admin username (3–32 characters)'; adminUser.minLength = 3; adminUser.maxLength = 32; adminUser.required = true; adminUser.autocomplete = 'username';
  const adminPass = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  adminPass.placeholder = 'New admin password (at least 12 characters)'; adminPass.type = 'password'; adminPass.minLength = 12; adminPass.required = true; adminPass.autocomplete = 'new-password';
  const registerButton = el('button', 'rounded-md border border-blue-600 px-4 py-2 font-medium text-blue-700', 'Register first admin');
  registerButton.type = 'submit';
  registerForm.append(registerTitle, note, setupKey, adminUser, adminPass, registerButton);
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault(); status.textContent = '';
    try {
      const user = await registerFirstAdmin(adminUser.value.trim(), adminPass.value, setupKey.value);
      renderAdmin(user);
    } catch (err) { status.textContent = err instanceof Error ? err.message : String(err); }
  });

  card.append(status, loginForm, registerForm);
  root.replaceChildren(card);
}

async function start(): Promise<void> {
  if (!root) return;
  try {
    const user = await getMe();
    if (user.role === 'admin') renderAdmin(user);
    else { await logout(); showAccess('This account is not an administrator.'); }
  } catch (err) {
    showAccess(err instanceof ApiError && err.status !== 401 ? err.message : '');
  }
}

void start();
