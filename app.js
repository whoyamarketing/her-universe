(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const config = window.UNIVERSE;
  document.getElementById('personal-title').textContent = config.personalTitle;
  document.getElementById('personal-message').textContent = config.personalMessage;
  let soundEnabled = false, audio;
  const stopActions = new Set();
  let activeScene = null;
  function activateScene(scene, autoplay = true) {
    if (scene !== activeScene) {
      stopActions.forEach(stop => stop());
      activeScene = scene;
      document.dispatchEvent(new CustomEvent('universe-scene', {detail: {scene, autoplay}}));
    }
  }
  function updateActiveScene() {
    const middle = innerHeight / 2;
    const scene = [...document.querySelectorAll('main > .scene')].find(el => {
      const rect = el.getBoundingClientRect();
      return rect.top <= middle && rect.bottom > middle;
    }) || null;
    activateScene(scene);
  }
  let sceneFrame = false;
  function queueSceneUpdate() {
    if (sceneFrame) return;
    sceneFrame = true;
    requestAnimationFrame(() => {sceneFrame = false; updateActiveScene();});
  }
  window.addEventListener('scroll', queueSceneUpdate, {passive: true});
  window.addEventListener('resize', queueSceneUpdate);
  function setSound(enabled) {
    soundEnabled = enabled;
    soundButton.setAttribute('aria-pressed', String(enabled));
    soundButton.querySelector('span').textContent = enabled ? 'Звук вкл.' : 'Звук выкл.';
    document.dispatchEvent(new CustomEvent('universe-sound', { detail: enabled }));
  }
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
    setSound(!soundEnabled);
    if (!soundEnabled) stopActions.forEach(stop => stop());
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
    let running = false;
    container.stopRecording = stopRecording;
    const recording = character.audio ? document.createElement('audio') : null;
    function stopRecording() {
      running = false;
      if (recording) { recording.pause(); recording.currentTime = 0; }
      img.src = character.image;
      container.classList.remove('chainsaw-running');
      if (recording) button.setAttribute('aria-pressed', 'false');
    }
    if (recording) {
      recording.src = character.audio;
      recording.preload = 'none';
      recording.volume = .65;
      container.append(recording);
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Бубба Сойер: включить или остановить бензопилу со звуком');
      stopActions.add(stopRecording);
      recording.addEventListener('ended', stopRecording);
      recording.addEventListener('error', () => {
        stopRecording();
        bubble.textContent = 'Не удалось загрузить звук. Попробуй ещё раз.';
        bubble.hidden = false;
        button.setAttribute('aria-expanded', 'true');
      });
    }
    button.addEventListener('click', () => {
      if (recording && running) { stopRecording(); return; }
      if (recording) {
        activateScene(container.closest('.scene'), false);
        running = true;
        setSound(true);
        button.setAttribute('aria-pressed', 'true');
        container.classList.add('chainsaw-running');
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) img.src = character.activeImage;
        recording.play().catch(() => {
          stopRecording();
          bubble.textContent = 'Нажми ещё раз, чтобы включить звук.';
          bubble.hidden = false;
          button.setAttribute('aria-expanded', 'true');
        });
      }
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
      if (!recording) tone(index);
      effectTimer = setTimeout(() => {container.classList.remove('active');container.querySelectorAll('.effect-ring,.particle').forEach(el => el.remove());}, 1100);
      timer = setTimeout(() => {bubble.hidden = true;button.setAttribute('aria-expanded', 'false');}, 6500);
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') {stopRecording();clearTimeout(timer);bubble.hidden = true;button.setAttribute('aria-expanded', 'false');}
    });
  });
  const phone = document.querySelector('.scream-phone');
  if (phone && config.phone) {
    const scene = document.getElementById('scream');
    const ring = document.createElement('audio');
    const voice = document.createElement('audio');
    ring.src = config.phone.ringtone; voice.src = config.phone.voice;
    ring.dataset.phoneAudio = 'ring'; voice.dataset.phoneAudio = 'voice';
    ring.preload = voice.preload = 'none';
    ring.loop = true; ring.volume = .55; voice.volume = .8;
    scene.append(ring, voice);
    let visible = false, answered = false, generation = 0;
    const label = phone.querySelector('span');
    function pause(track) { track.pause(); track.currentTime = 0; }
    function resetPhone() {
      generation++;
      pause(ring); pause(voice); answered = false;
      phone.classList.remove('ringing', 'on-call');
      phone.setAttribute('aria-pressed', 'false');
      phone.setAttribute('aria-label', 'Ответить на звонок Ghostface');
      label.textContent = 'ОТВЕТИТЬ НА ЗВОНОК';
    }
    function startRing() {
      if (!visible || activeScene !== scene || !soundEnabled || answered || document.hidden || document.querySelector('dialog[open]') || !ring.paused) return;
      const request = ++generation;
      phone.classList.add('ringing'); label.textContent = 'ВХОДЯЩИЙ ВЫЗОВ…';
      ring.play().catch(error => {
        if (request !== generation || error.name === 'AbortError') return;
        phone.classList.remove('ringing'); label.textContent = 'НАЖМИ, ЧТОБЫ ОТВЕТИТЬ';
      });
    }
    stopActions.add(resetPhone);
    phone.addEventListener('click', () => {
      if (answered) { resetPhone(); return; }
      activateScene(scene, false);
      generation++; answered = true; pause(ring);
      setSound(true);
      phone.classList.remove('ringing'); phone.classList.add('on-call');
      phone.setAttribute('aria-pressed', 'true');
      phone.setAttribute('aria-label', 'Остановить голос Ghostface');
      label.textContent = 'GHOSTFACE НА ЛИНИИ…';
      const request = generation;
      voice.play().catch(error => {
        if (request !== generation || error.name === 'AbortError') return;
        resetPhone(); label.textContent = 'НЕ УДАЛОСЬ ВОСПРОИЗВЕСТИ. ПОВТОРИТЬ?';
      });
    });
    phone.addEventListener('keydown', event => { if (event.key === 'Escape') resetPhone(); });
    voice.addEventListener('ended', () => { resetPhone(); label.textContent = 'ЗВОНОК ЗАВЕРШЁН · ПОВТОРИТЬ?'; });
    for (const track of [ring, voice]) track.addEventListener('error', () => {
      resetPhone(); label.textContent = 'ЗВУК НЕДОСТУПЕН · ПОВТОРИТЬ?';
    });
    document.addEventListener('universe-sound', event => {
      if (event.detail) startRing(); else resetPhone();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) startRing(); });
    document.addEventListener('universe-scene', event => {
      visible = event.detail.scene === scene;
      if (!visible) resetPhone();
      else if (event.detail.autoplay) startRing();
    });
  }
  Object.entries(config.sceneAudio || {}).forEach(([id, source]) => {
    const scene = document.getElementById(id);
    if (!scene) return;
    const music = document.createElement('audio');
    music.src = source; music.preload = 'none'; music.volume = .55;
    music.dataset.sceneAudio = id;
    scene.append(music);
    function stopMusic() { music.pause(); music.currentTime = 0; }
    function startMusic() {
      if (activeScene !== scene || !soundEnabled || document.hidden || document.querySelector('dialog[open]') || !music.paused) return;
      music.play().catch(() => { /* Browser autoplay restrictions do not interrupt the scene. */ });
    }
    stopActions.add(stopMusic);
    document.addEventListener('universe-scene', event => {
      if (event.detail.scene === scene && event.detail.autoplay) startMusic(); else stopMusic();
    });
    document.addEventListener('universe-sound', event => { if (event.detail) startMusic(); else stopMusic(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) startMusic(); });
  });
  updateActiveScene();
  document.addEventListener('universe-pause', () => stopActions.forEach(stop => stop()));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopActions.forEach(stop => stop());
  });
  if ('IntersectionObserver' in window) {
    const actionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) entry.target.stopRecording?.();
    }));
    document.querySelectorAll('[data-character] audio').forEach(el => actionObserver.observe(el.parentElement));
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
