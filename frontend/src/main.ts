import './style.css';
import { initHome } from './game/home';
import type { CanteenShop, GameState } from './game/types';
import { bindUi, updateHud } from './game/ui';

const asset = (name: string): string => `${import.meta.env.BASE_URL}assets/${name}`;
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root was not found.');

const state: GameState = { scene: 'home', points: 100, modalOpen: false };
bindUi(app, state);

app.innerHTML = `
  <header class="flex h-20 items-center justify-between border-b border-[#dfe6ee] bg-white px-5 sm:px-8">
    <div class="flex items-center gap-3"><div class="grid size-10 place-items-center rounded-xl bg-[#eaf2ff] text-xl font-bold text-[#3375cb]">[ ]</div><strong class="text-lg sm:text-2xl">DSA Classroom</strong></div>
    <span id="nav-step" class="hidden rounded-full bg-[#eaf2ff] px-4 py-2 text-sm font-semibold tracking-wide text-[#3375cb] sm:inline-flex">WELCOME</span>
    <div id="avatar-selector" class="hidden flex shrink-0 items-center gap-2">
      <span class="hidden text-[11px] font-semibold tracking-wide text-[#61738b] lg:inline">AVATAR</span>
      <button type="button" data-avatar="boy" aria-pressed="false" class="flex h-12 items-center gap-1 rounded-xl border border-[#dfe6ee] bg-white px-2 text-xs font-medium text-[#61738b]">
        <span class="relative h-10 w-8"><img class="absolute left-2 top-0 h-5 w-5" src="${asset('boy-head.svg')}" alt="" /><img class="absolute left-1 top-4 h-5 w-6" src="${asset('boy-sweater.svg')}" alt="" /><img class="absolute left-2 top-7 h-3 w-5" src="${asset('boy-legs.svg')}" alt="" /></span><span>Boy</span>
      </button>
      <button type="button" data-avatar="girl" aria-pressed="true" class="flex h-12 items-center gap-1 rounded-xl border border-[#3375cb] bg-[#eaf2ff] px-2 text-xs font-semibold text-[#3375cb]">
        <span class="relative h-10 w-8"><img class="absolute left-2 top-0 h-5 w-5" src="${asset('canteen-player-head.svg')}" alt="" /><img class="absolute left-1 top-4 h-5 w-6" src="${asset('canteen-player-sweater.svg')}" alt="" /><img class="absolute left-2 top-7 h-3 w-5" src="${asset('canteen-player-legs.svg')}" alt="" /></span><span>Girl</span>
      </button>
    </div>
    <p data-points class="rounded-full bg-[#fff7d7] px-2 py-2 text-xs font-semibold text-[#826018] sm:px-4 sm:text-sm">Points: 100</p>
  </header>
  <main>
    <section id="welcome" class="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center lg:py-16">
      <div class="rounded-[28px] bg-[#eaf2ff] p-7 sm:p-10">
        <span class="rounded-lg bg-white px-3 py-2 text-xs font-bold tracking-wide text-[#3375cb]">LEARN BY PLAYING</span>
        <h1 class="mt-7 text-4xl font-bold leading-tight sm:text-5xl">Big ideas.<br />Small adventures.</h1>
        <p class="mt-5 max-w-xl text-lg leading-8 text-[#61738b]">Your next DSA breakthrough starts with a walk around the classroom.</p>
        <div class="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
          <span class="rounded-lg bg-white px-4 py-2 text-[#3375cb]">Explore</span><span class="rounded-lg bg-white px-4 py-2 text-[#b45b1d]">Practice</span><span class="rounded-lg bg-white px-4 py-2 text-[#826018]">Earn rewards</span>
        </div>
        <div class="relative mt-8 aspect-[5/3] w-full overflow-hidden rounded-xl" aria-label="Classroom preview">
          <img class="absolute inset-0 size-full" src="${asset('classroom.svg')}" alt="" />
          <img class="absolute left-[8.73%] top-[31.06%] h-[33.33%] w-[17.91%]" src="${asset('bookshelf.svg')}" alt="" />
          <img class="absolute left-[30.55%] top-[6.82%] h-[22.12%] w-[38.9%]" src="${asset('blackboard.svg')}" alt="" />
          <img class="absolute left-[74.55%] top-[31.36%] h-[32.88%] w-[20%]" src="${asset('canteen.svg')}" alt="" />
          <img class="absolute left-[31.82%] top-[52.73%] h-[16.66%] w-[12.36%]" src="${asset('desk-upper-left.svg')}" alt="" />
          <img class="absolute left-[57.09%] top-[52.73%] h-[16.66%] w-[12.36%]" src="${asset('desk-upper-right.svg')}" alt="" />
          <img class="absolute left-[31.82%] top-[73.48%] h-[16.67%] w-[12.36%]" src="${asset('desk-lower-left.svg')}" alt="" />
          <img class="absolute left-[57.09%] top-[73.48%] h-[16.67%] w-[12.36%]" src="${asset('desk-lower-right.svg')}" alt="" />
          <img class="absolute left-[12%] top-[8.94%] h-[16.14%] w-[5.82%]" src="${asset('plant-upper-left.svg')}" alt="" />
          <img class="absolute left-[83.09%] top-[8.79%] h-[16.29%] w-[6.09%]" src="${asset('plant-upper-right.svg')}" alt="" />
          <img class="absolute left-[47.75%] top-[51.28%] h-[17.81%] w-[6.32%]" src="${asset('player.svg')}" alt="" />
        </div>
      </div>
      <div class="rounded-[24px] border border-[#dfe6ee] bg-white p-7 shadow-sm sm:p-10">
        <h2 class="text-3xl font-bold">Welcome, explorer.</h2>
        <p class="mt-3 text-[#61738b]">Pick a username and make yourself at home.</p>
        <label class="mt-9 block text-sm font-semibold" for="username">Username</label>
        <input id="username" class="mt-3 w-full rounded-xl border border-[#3375cb] bg-[#f7fafc] px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-[#3375cb]/30" value="alex" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" />
        <p class="mt-2 text-sm text-[#61738b]">3–20 characters · letters, numbers and underscores</p>
        <button id="enter" class="mt-7 w-full rounded-xl bg-[#3375cb] px-5 py-4 font-semibold text-white hover:bg-[#2865b2]">Enter classroom →</button>
        <p class="mt-5 text-sm leading-6 text-[#61738b]">No password needed. Use the same username to return to your saved progress.</p>
      </div>
    </section>
    <section id="home" class="hidden px-4 pb-10 pt-7 sm:px-6 lg:px-10">
      <div class="mx-auto max-w-[1440px]">
        <p id="section-eyebrow" class="text-xs font-bold tracking-wide text-[#3375cb]">YOUR LEARNING SPACE</p>
        <div class="mt-2 flex items-center justify-between gap-3">
          <h1 id="scene-title" class="text-3xl font-bold sm:text-4xl">Welcome back, alex.</h1>
          <button id="back-to-classroom" class="hidden shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#61738b]">← Classroom</button>
        </div>
        <p id="scene-subtitle" class="mt-2 text-lg text-[#61738b]">Pick a corner. Learn something new.</p>
        <div class="mt-6 grid gap-5 min-[1404px]:grid-cols-[minmax(0,960px)_328px] min-[1404px]:justify-center">
          <div class="relative mx-auto w-full max-w-[960px] rounded-[22px] bg-[#172b45] p-2">
            <canvas id="game" class="block w-full max-w-[960px] aspect-video rounded-[16px] border border-[#dfe6ee] bg-white shadow-sm" aria-label="Walkable DSA classroom"></canvas>
            <div id="zone-badge" class="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-xl border border-[#dfe6ee] bg-white px-4 py-3 text-sm font-semibold text-[#172b45] shadow-lg"></div>
          </div>
          <aside id="home-panel" class="rounded-[22px] border border-[#dfe6ee] bg-white p-5 sm:p-6">
            <h2 class="text-xl font-bold">Make your next move</h2>
            <div class="mt-5 space-y-3">
              <article class="rounded-[14px] bg-[#eaf6ef] p-4"><div class="flex items-center gap-3"><b class="text-sm text-[#238265]">01</b><h3 class="text-lg font-semibold">Bookshelf</h3></div><p class="mt-2 text-sm text-[#61738b]">Read at your own pace.</p></article>
              <article class="rounded-[14px] bg-[#fff1e7] p-4"><div class="flex items-center gap-3"><b class="text-sm text-[#b45b1d]">02</b><h3 class="text-lg font-semibold">Blackboard</h3></div><p class="mt-2 text-sm text-[#61738b]">Test yourself. Earn points.</p></article>
              <article class="rounded-[14px] bg-[#fff7d7] p-4"><div class="flex items-center gap-3"><b class="text-sm text-[#826018]">03</b><h3 class="text-lg font-semibold">Canteen</h3></div><p class="mt-2 text-sm text-[#61738b]">Trade points for a treat.</p></article>
            </div>
            <p class="mt-5 text-sm text-[#61738b]">Correct answer = +10 points</p>
          </aside>
          <aside id="canteen-panel" class="hidden rounded-[22px] border border-[#dfe6ee] bg-white p-5 sm:p-6">
            <p id="shop-status" class="rounded-[10px] bg-[#fff7d7] px-3 py-2 text-[11px] font-bold tracking-wide text-[#826018]">A SMALL BREAK, WELL EARNED</p>
            <h2 id="shop-title" class="mt-4 text-2xl font-bold">Find your next treat.</h2>
            <p id="shop-instructions" class="mt-2 text-sm leading-6 text-[#61738b]">Walk to a counter.<br />Press E to trade points.</p>
            <div class="mt-5 space-y-3">
              <article data-shop-id="juice" class="flex min-h-24 items-center gap-3 rounded-[14px] bg-[#eaf6ef] p-3"><img class="size-14 object-contain" src="${asset('juice.svg')}" alt="Orange juice" /><div><h3 class="font-semibold">Juice bar</h3><p class="text-xs text-[#61738b]">Orange juice</p><b class="text-sm text-[#826018]">30 points</b></div></article>
              <article data-shop-id="sandwich" class="flex min-h-24 items-center gap-3 rounded-[14px] bg-[#fff1e7] p-3"><img class="size-14 object-contain" src="${asset('sandwich.svg')}" alt="Toasted sandwich" /><div><h3 class="font-semibold">Sandwich stall</h3><p class="text-xs text-[#61738b]">Toasted sandwich</p><b class="text-sm text-[#826018]">60 points</b></div></article>
              <article data-shop-id="cookies" class="flex min-h-24 items-center gap-3 rounded-[14px] bg-[#fff7d7] p-3"><img class="size-14 object-contain" src="${asset('cookies.svg')}" alt="Cookies" /><div><h3 class="font-semibold">Cookie cart</h3><p class="text-xs text-[#61738b]">Cookies</p><b class="text-sm text-[#826018]">120 points</b></div></article>
            </div>
            <p id="exchange-summary" class="mt-4 hidden rounded-xl bg-[#f7fafc] p-3 text-sm leading-6 text-[#61738b]"></p>
            <button id="exchange-action" class="mt-4 hidden w-full rounded-xl bg-[#826018] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"></button>
            <button id="back-classroom" class="mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold text-[#61738b] hover:bg-[#f7fafc]">Back to classroom</button>
          </aside>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold">
          <span class="rounded-lg bg-white px-3 py-2">↑ ↓ ← → &nbsp; Move</span><span class="rounded-lg bg-[#eaf2ff] px-3 py-2 text-[#3375cb]">E &nbsp; Interact with a zone</span><span class="ml-auto text-xs font-normal text-[#61738b]">F1 toggles debug view</span>
        </div>
      </div>
    </section>
  </main>`;

updateHud(state.points);
const enter = document.querySelector<HTMLButtonElement>('#enter');
enter?.addEventListener('click', () => {
  const input = document.querySelector<HTMLInputElement>('#username');
  if (!input?.reportValidity()) return;
  const name = input.value.trim();
  document.querySelector<HTMLElement>('#scene-title')!.textContent = `Welcome back, ${name}.`;
  document.querySelector<HTMLElement>('#welcome')!.classList.add('hidden');
  document.querySelector<HTMLElement>('#home')!.classList.remove('hidden');
  document.querySelector<HTMLElement>('#nav-step')!.textContent = 'CLASSROOM';
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  const badge = document.querySelector<HTMLElement>('#zone-badge');
  if (canvas && badge) initHome(canvas, state, badge);
});

const syncScene = (): void => {
  const canteen = state.scene === 'canteen';
  document.querySelector<HTMLElement>('#nav-step')!.textContent = canteen ? 'CANTEEN' : 'CLASSROOM';
  document.querySelector<HTMLElement>('#nav-step')!.classList.toggle('bg-[#fff7d7]', canteen);
  document.querySelector<HTMLElement>('#nav-step')!.classList.toggle('text-[#826018]', canteen);
  document.querySelector<HTMLElement>('#nav-step')!.classList.toggle('bg-[#eaf2ff]', !canteen);
  document.querySelector<HTMLElement>('#nav-step')!.classList.toggle('text-[#3375cb]', !canteen);
  document.querySelector<HTMLElement>('#section-eyebrow')!.textContent = canteen ? 'THE CAMPUS CANTEEN' : 'YOUR LEARNING SPACE';
  document.querySelector<HTMLElement>('#scene-title')!.textContent = canteen ? 'A little market. A well-earned break.' : 'Welcome back, alex.';
  document.querySelector<HTMLElement>('#scene-subtitle')!.textContent = canteen ? 'Walk to a shop, press E and exchange your quiz points for a treat.' : 'Pick a corner. Learn something new.';
  document.querySelector<HTMLElement>('#home-panel')!.classList.toggle('hidden', canteen);
  document.querySelector<HTMLElement>('#canteen-panel')!.classList.toggle('hidden', !canteen);
  document.querySelector<HTMLElement>('#back-to-classroom')!.classList.toggle('hidden', !canteen);
  document.querySelector<HTMLElement>('#avatar-selector')!.classList.toggle('hidden', !canteen);
};
window.addEventListener('game-scene-change', syncScene);
document.querySelector<HTMLButtonElement>('#back-classroom')?.addEventListener('click', () => {
  state.scene = 'home';
  syncScene();
});
document.querySelector<HTMLButtonElement>('#back-to-classroom')?.addEventListener('click', () => {
  state.scene = 'home';
  syncScene();
});

document.querySelectorAll<HTMLButtonElement>('[data-avatar]').forEach((button) => {
  button.addEventListener('click', () => {
    const avatar = button.dataset.avatar;
    if (avatar !== 'boy' && avatar !== 'girl') return;
    document.querySelectorAll<HTMLButtonElement>('[data-avatar]').forEach((choice) => {
      const isSelected = choice.dataset.avatar === avatar;
      choice.setAttribute('aria-pressed', String(isSelected));
      choice.classList.toggle('border-[#3375cb]', isSelected);
      choice.classList.toggle('bg-[#eaf2ff]', isSelected);
      choice.classList.toggle('text-[#3375cb]', isSelected);
      choice.classList.toggle('font-semibold', isSelected);
      choice.classList.toggle('border-[#dfe6ee]', !isSelected);
      choice.classList.toggle('bg-white', !isSelected);
      choice.classList.toggle('text-[#61738b]', !isSelected);
      choice.classList.toggle('font-medium', !isSelected);
    });
    window.dispatchEvent(new CustomEvent('avatar-change', { detail: avatar }));
  });
});

let selectedShop: CanteenShop | null = null;
let rewardCollected = false;
window.addEventListener('shop-selected', (event: Event) => {
  selectedShop = (event as CustomEvent<CanteenShop | null>).detail;
  rewardCollected = false;
  document.querySelector<HTMLElement>('#shop-status')!.textContent = selectedShop ? 'COUNTER NEARBY' : 'A SMALL BREAK, WELL EARNED';
  document.querySelector<HTMLElement>('#shop-title')!.textContent = selectedShop ? selectedShop.name : 'Find your next treat.';
  document.querySelector<HTMLElement>('#shop-instructions')!.textContent = selectedShop ? selectedShop.item : 'Walk to a counter. Press E to trade points.';
  document.querySelectorAll<HTMLElement>('[data-shop-id]').forEach((card) => {
    card.classList.toggle('ring-2', card.dataset.shopId === selectedShop?.id);
    card.classList.toggle('ring-[#826018]', card.dataset.shopId === selectedShop?.id);
  });
  const summary = document.querySelector<HTMLElement>('#exchange-summary')!;
  const action = document.querySelector<HTMLButtonElement>('#exchange-action')!;
  summary.classList.add('hidden');
  action.classList.toggle('hidden', !selectedShop);
  if (selectedShop) {
    const balance = state.points - selectedShop.price;
    summary.textContent = `Your points: ${state.points} · Exchange cost: −${selectedShop.price} · Balance: ${Math.max(0, balance)}`;
    summary.classList.remove('hidden');
    action.textContent = `Exchange · ${selectedShop.price} points`;
    action.disabled = state.points < selectedShop.price;
  }
});

document.querySelector<HTMLButtonElement>('#exchange-action')?.addEventListener('click', () => {
  const action = document.querySelector<HTMLButtonElement>('#exchange-action');
  const summary = document.querySelector<HTMLElement>('#exchange-summary');
  const status = document.querySelector<HTMLElement>('#shop-status');
  const title = document.querySelector<HTMLElement>('#shop-title');
  const instructions = document.querySelector<HTMLElement>('#shop-instructions');
  if (!selectedShop || !action || !summary || !status || !title || !instructions) return;
  if (!rewardCollected) {
    if (state.points < selectedShop.price) return;
    const previous = state.points;
    state.points -= selectedShop.price;
    updateHud(state.points);
    rewardCollected = true;
    status.textContent = 'REWARD COLLECTED';
    title.textContent = `Enjoy your ${selectedShop.item.toLowerCase()}!`;
    instructions.textContent = `${selectedShop.item} collected`;
    summary.textContent = `Previous points: ${previous} · Exchanged: −${selectedShop.price} · Your balance: ${state.points}`;
    action.textContent = 'Keep exploring →';
    action.disabled = false;
    return;
  }
  selectedShop = null;
  window.dispatchEvent(new CustomEvent('shop-selected', { detail: null }));
});
