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
  const settings = window.UNIVERSE.birthdaySchedule;
  const start = Date.parse(settings.start), end = Date.parse(settings.end);
  const interval = settings.intervalMs;
  const firstBatch = Math.min(settings.firstBatch, ids.length);
  const firstEnd = start + Math.max(0, firstBatch - 1) * interval;
  const releases = ids.map((id, index) => index < firstBatch ? start + index * interval
    : firstEnd + (end - firstEnd) * (index - firstBatch + 1) / (ids.length - firstBatch));
  const key = `universe-birthday-read-v2-${settings.start}`;
  const timeKey = `${key}-last`;
  const formatTime = time => new Intl.DateTimeFormat('ru-RU', {timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(time);
  function countdown(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
  }
  let lastDelivered = 0;
  try { lastDelivered = Number(localStorage.getItem(timeKey)) || 0; } catch { /* Storage optional. */ }
  let read = new Set();
  try { const stored = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(stored)) read = new Set(stored.filter(id => ids.includes(id))); } catch { /* Storage is optional, including file://. */ }
  function nextMessage() {
    const index = ids.findIndex(id => !read.has(id));
    if (index < 0) return null;
    return { id: ids[index], due: Math.max(releases[index], lastDelivered + interval) };
  }
  function update() {
    const remaining = ids.filter(id => !read.has(id));
    badge.textContent = String(remaining.length);
    badge.hidden = remaining.length === 0;
    trigger.setAttribute('aria-label', `Поздравления: непрочитанных ${remaining.length} из ${ids.length}`);
    next.hidden = !remaining.length;
    const upcoming = nextMessage();
    const now = Date.now();
    next.disabled = !upcoming || now < upcoming.due;
    next.textContent = upcoming && now < upcoming.due ? `Через ${countdown(upcoming.due - now)}` : 'Прочитать сообщение ↓';
    if (!upcoming) status.textContent = `Все ${ids.length} поздравлений прочитаны. Ты — центр этой вселенной ♡`;
    else if (now < start) status.textContent = `Поздравления начнутся 20 октября 2026 в 10:00 МСК. До начала: ${countdown(start - now)}`;
    else if (now < upcoming.due) status.textContent = `Следующее поздравление в ${formatTime(upcoming.due)} МСК · ${window.UNIVERSE.characters[upcoming.id].name}`;
    else status.textContent = `${window.UNIVERSE.characters[upcoming.id].name} прислал(а) поздравление…`;
    return upcoming;
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
  function tick() {
    const upcoming = update();
    if (dialog.open && !document.hidden && upcoming && Date.now() >= upcoming.due) deliver();
  }
  function deliver() {
    if (!dialog.open || document.hidden) return;
    const upcoming = update();
    if (!upcoming || Date.now() < upcoming.due) return;
    append(upcoming.id, true); read.add(upcoming.id);
    lastDelivered = Date.now();
    try {
      localStorage.setItem(key, JSON.stringify([...read]));
      localStorage.setItem(timeKey, String(lastDelivered));
    } catch { /* Keep session state. */ }
    update();
    feed.scrollTo({top: feed.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
  trigger.addEventListener('click', () => {
    if (dialog.open) return;
    document.dispatchEvent(new Event('universe-pause'));
    feed.replaceChildren();
    ids.filter(id => read.has(id)).forEach(id => append(id, false));
    dialog.showModal(); document.body.classList.add('messages-open');
    update();
    tick();
    feed.scrollTop = feed.scrollHeight;
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('messages-open'); trigger.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }});
  next.addEventListener('click', deliver);
  document.addEventListener('visibilitychange', tick);
  setInterval(tick, 1000);
  update();
})();
