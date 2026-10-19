(() => {
  'use strict';
  const dialog = document.getElementById('birthday-messages');
  const trigger = document.getElementById('messages-button');
  const close = document.getElementById('messages-close');
  const feed = document.getElementById('messages-feed');
  const badge = document.getElementById('message-badge');
  const status = document.getElementById('messages-status');
  const next = document.getElementById('messages-next');
  const ids = [...new Set([...document.querySelectorAll('[data-character]')].map(el => el.dataset.character))]
    .filter(id => window.UNIVERSE.characters[id]);
  const key = 'universe-birthday-read-v1';
  let read = new Set();
  try { const stored = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(stored)) read = new Set(stored.filter(id => ids.includes(id))); } catch { /* Storage is optional, including file://. */ }
  let timer;
  function update() {
    const remaining = ids.filter(id => !read.has(id));
    badge.textContent = String(remaining.length);
    badge.hidden = remaining.length === 0;
    trigger.setAttribute('aria-label', `Поздравления: непрочитанных ${remaining.length} из ${ids.length}`);
    next.hidden = !remaining.length;
    status.textContent = remaining.length ? `${window.UNIVERSE.characters[remaining[0]].name} печатает…` : `Все ${ids.length} поздравлений прочитаны. Ты — центр этой вселенной ♡`;
    return remaining;
  }
  function append(id, animate) {
    const character = window.UNIVERSE.characters[id];
    const item = document.createElement('article');
    item.className = 'birthday-message' + (animate ? ' message-new' : '');
    item.dataset.sender = id;
    const avatar = document.createElement('img');
    avatar.src = character.image; avatar.alt = character.name; avatar.width = avatar.height = 48;
    const body = document.createElement('div'); body.className = 'birthday-message-body';
    const name = document.createElement('h3'); name.textContent = character.name;
    const text = document.createElement('p'); text.textContent = character.birthday || `С днём рождения! Пусть твоя вселенная будет полна счастья. ♡`;
    body.append(name, text); item.append(avatar, body); feed.append(item);
  }
  function schedule() {
    clearTimeout(timer);
    if (dialog.open && !document.hidden && update().length) timer = setTimeout(deliver, 5000);
  }
  function deliver() {
    clearTimeout(timer);
    if (!dialog.open || document.hidden) return;
    const id = update()[0];
    if (!id) return;
    append(id, true); read.add(id);
    try { localStorage.setItem(key, JSON.stringify([...read])); } catch { /* Keep session state. */ }
    update();
    feed.scrollTo({top: feed.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    schedule();
  }
  trigger.addEventListener('click', () => {
    if (dialog.open) return;
    document.dispatchEvent(new Event('universe-pause'));
    feed.replaceChildren();
    ids.filter(id => read.has(id)).forEach(id => append(id, false));
    dialog.showModal(); document.body.classList.add('messages-open');
    update();
    if (!read.size) deliver(); else schedule();
    feed.scrollTop = feed.scrollHeight;
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    clearTimeout(timer); document.body.classList.remove('messages-open'); trigger.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }});
  next.addEventListener('click', deliver);
  document.addEventListener('visibilitychange', schedule);
  update();
})();
