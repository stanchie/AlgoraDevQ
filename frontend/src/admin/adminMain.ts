import '../style.css';
import { ApiError, changeAdminAccount, getMe, login, logout } from '../api';
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
  if (user.mustChangePassword) { showAccount(user, true); return; }
  const header = el('header', 'mx-auto flex max-w-3xl items-center justify-between gap-3 p-4');
  header.append(el('p', 'text-sm text-slate-600', `Signed in as admin: ${user.username}`));
  const actions = el('div', 'flex gap-2');
  const settings = el('button', 'rounded-md border border-slate-300 px-3 py-1.5 text-sm', 'Account settings');
  settings.type = 'button'; settings.addEventListener('click', () => showAccount(user, false));
  const signOut = el('button', 'rounded-md border border-slate-300 px-3 py-1.5 text-sm', 'Sign out');
  signOut.type = 'button';
  signOut.addEventListener('click', async () => { await logout(); showAccess(); });
  actions.append(settings, signOut); header.append(actions);
  root.replaceChildren(header);
  const adminRoot = el('div'); root.append(adminRoot); mountQuizAdmin(adminRoot);
}

function showAccount(user: User, required: boolean): void {
  if (!root) return;
  const card = el('main', 'mx-auto mt-10 max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm');
  card.append(el('h1', 'text-2xl font-bold', required ? 'Change your initial admin credentials' : 'Admin account settings'));
  card.append(el('p', 'text-sm text-slate-600', required
    ? 'For security, replace the initial username and password before continuing.'
    : 'Enter your current password to update your admin username and password.'));
  const form = el('form', 'space-y-3');
  const currentPassword = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  currentPassword.type = 'password'; currentPassword.autocomplete = 'current-password'; currentPassword.placeholder = 'Current password'; currentPassword.required = true;
  const username = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  username.autocomplete = 'username'; username.placeholder = 'New username (3–32 letters, numbers, underscores)'; username.minLength = 3; username.maxLength = 32; username.pattern = '[A-Za-z0-9_]+'; username.value = user.username; username.required = true;
  const password = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  password.type = 'password'; password.autocomplete = 'new-password'; password.placeholder = 'New password (at least 12 characters)'; password.minLength = 12; password.required = true;
  const confirm = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  confirm.type = 'password'; confirm.autocomplete = 'new-password'; confirm.placeholder = 'Confirm new password'; confirm.minLength = 12; confirm.required = true;
  const status = el('p', 'text-sm text-red-600');
  const save = el('button', 'rounded-md bg-blue-600 px-4 py-2 font-medium text-white', 'Save new credentials'); save.type = 'submit';
  form.append(currentPassword, username, password, confirm, status, save);
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); status.textContent = '';
    if (password.value !== confirm.value) { status.textContent = 'The new passwords do not match.'; return; }
    save.disabled = true;
    try {
      const updated = await changeAdminAccount(currentPassword.value, username.value.trim(), password.value);
      renderAdmin(updated);
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : String(err); save.disabled = false;
    }
  });
  const signOut = el('button', 'rounded-md border border-slate-300 px-3 py-1.5 text-sm', 'Sign out');
  signOut.type = 'button'; signOut.addEventListener('click', async () => { await logout(); showAccess(); });
  card.append(form, signOut); root.replaceChildren(card);
}

function showAccess(message = ''): void {
  if (!root) return;
  const card = el('main', 'mx-auto mt-10 max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm');
  card.append(el('h1', 'text-2xl font-bold', 'Admin access'));
  card.append(el('p', 'text-sm text-slate-600', 'Sign in with the seeded admin account. The initial account must change its username and password on first login.'));
  const status = el('p', 'text-sm text-red-600', message);
  const form = el('form', 'space-y-3');
  const username = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  username.placeholder = 'Username'; username.autocomplete = 'username'; username.required = true;
  const password = el('input', 'w-full rounded-md border border-slate-300 px-3 py-2');
  password.placeholder = 'Password'; password.type = 'password'; password.autocomplete = 'current-password'; password.required = true;
  const submit = el('button', 'rounded-md bg-blue-600 px-4 py-2 font-medium text-white', 'Sign in'); submit.type = 'submit';
  form.append(username, password, submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); status.textContent = '';
    try {
      const user = await login(username.value.trim(), password.value);
      if (user.role !== 'admin') { await logout(); status.textContent = 'This account is not an administrator.'; return; }
      renderAdmin(user);
    } catch (err) { status.textContent = err instanceof Error ? err.message : String(err); }
  });
  card.append(status, form); root.replaceChildren(card);
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
