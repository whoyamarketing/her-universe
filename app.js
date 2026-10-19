(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const config = window.UNIVERSE;
  document.getElementById('personal-message').textContent = config.personalMessage;
  let soundEnabled = false, audio;
  function tone(index = 0) {
    if (!soundEnabled) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime([392,440,523,587,659][index % 5], audio.currentTime);
      gain.gain.setValueAtTime(0, audio.currentTime);
      gain.gain.linearRampToValueAtTime(.06, audio.currentTime + .025);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .5);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime + .55);
    } catch { /* Silent interaction remains available if Web Audio is unsupported. */ }
  }
  const soundButton = document.getElementById('sound');
  soundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundButton.setAttribute('aria-pressed', String(soundEnabled));
    soundButton.querySelector('span').textContent = soundEnabled ? 'Звук вкл.' : 'Звук выкл.';
    tone();
  });
  document.querySelectorAll('[data-character]').forEach((container, index) => {
    const id = container.dataset.character, character = config.characters[id];
    if (!character) return;
    const button = document.createElement('button');
    button.type = 'button'; button.setAttribute('aria-label', `Поговорить: ${character.name}`);
    button.setAttribute('aria-expanded', 'false');
    const img = document.createElement('img');
    img.src = character.image; img.alt = character.name;
    img.width = 210; img.height = 270; img.decoding = 'async';
    img.loading = id === 'spider' ? 'eager' : 'lazy';
    const label = document.createElement('span'); label.className = 'character-label'; label.textContent = character.name;
    button.append(img, label);
    const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.id = `phrase-${id}`; bubble.hidden = true;
    button.setAttribute('aria-controls', bubble.id);
    container.append(button, bubble);
    let count = 0, timer, effectTimer;
    button.addEventListener('click', () => {
      clearTimeout(timer); clearTimeout(effectTimer);
      container.querySelectorAll('.effect-ring,.particle').forEach(el => el.remove());
      bubble.textContent = character.phrases[count++ % character.phrases.length]; bubble.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      document.getElementById('announcement').textContent = `${character.name}: ${bubble.textContent}`;
      container.classList.add(character.effect, 'active');
      const ring = document.createElement('span'); ring.className = 'effect-ring'; container.append(ring);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        for (let i = 0; i < 9; i++) {
          const part = document.createElement('span'); part.className = 'particle'; part.textContent = character.particle || (id === 'harley' ? '♡' : '✧');
          const angle = i * Math.PI * 2 / 9;
          part.style.setProperty('--x', `${Math.cos(angle) * 130}px`);
          part.style.setProperty('--y', `${Math.sin(angle) * 130}px`); container.append(part);
        }
      }
      tone(index);
      effectTimer = setTimeout(() => {container.classList.remove('active');container.querySelectorAll('.effect-ring,.particle').forEach(el => el.remove());}, 1100);
      timer = setTimeout(() => {bubble.hidden = true;button.setAttribute('aria-expanded', 'false');}, 6500);
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') {clearTimeout(timer);bubble.hidden = true;button.setAttribute('aria-expanded', 'false');}
    });
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {entry.target.classList.add('visible');observer.unobserve(entry.target);}
    }), {threshold: .12});
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let scheduled = false;
    window.addEventListener('scroll', () => {
      if (scheduled) return; scheduled = true;
      requestAnimationFrame(() => {
        document.querySelectorAll('.sun,.moon,.castle').forEach(el => {
          const rect = el.parentElement.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < innerHeight) el.style.translate = `0 ${Math.max(-50, Math.min(50, -rect.top * .07))}px`;
        }); scheduled = false;
      });
    }, {passive: true});
  }
})();
