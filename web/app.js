(() => {
  const body = document.body;
  const deck = document.getElementById('deck');
  const slides = [...deck.querySelectorAll(':scope > .s')];
  const crumbs = document.getElementById('crumbs');
  const count = document.getElementById('count');
  const btnMode = document.getElementById('btn-mode');
  const dlg = document.getElementById('index');
  const live = document.getElementById('live');
  const params = new URLSearchParams(location.search);
  let cur = 0;

  /* ---- datos: capítulo y título de cada diapositiva ---- */
  let chapter = null;
  const chapters = [];
  slides.forEach((s, i) => {
    if (s.classList.contains('sep')) {
      chapter = { el: s, i, title: s.querySelector('h2').textContent.trim(), short: s.dataset.short, num: s.dataset.num, items: [] };
      chapters.push(chapter);
    }
    const h = s.querySelector('h3, h2, h1');
    s._title = s.dataset.title || (h ? h.textContent.trim() : 'Diapositiva');
    s._ch = s.classList.contains('cover') || s.classList.contains('end') ? null : chapter;
    if (s._ch && s !== s._ch.el) s._ch.items.push({ s, i });
    if (!s.id) s.id = 'd' + (i + 1);
  });

  /* ---- cintas curvas de los separadores ---- */
  chapters.forEach((c, k) => {
    const text = c.el.dataset.ribbon;
    const sub = c.el.querySelector('.sub');
    if (sub) sub.style.setProperty('--n', sub.children.length);
    if (!text) return;
    const id = 'rib-s' + k;
    c.el.insertAdjacentHTML('afterbegin',
      `<svg class="ribbon" viewBox="0 0 520 300" aria-hidden="true">
        <path id="${id}" d="M40 330 C 120 160, 300 60, 560 40" fill="none" stroke="#c5bbde" stroke-width="40"/>
        <text font-size="19" dy="6"><textPath href="#${id}" startOffset="5%">${text}</textPath></text>
      </svg>`);
  });

  /* ---- migas de pan ---- */
  function setCrumbs(s) {
    const parts = [];
    if (s._ch) {
      parts.push(`<li><a href="#${s._ch.el.id}">${s._ch.short || s._ch.title}</a></li>`);
      if (s !== s._ch.el) parts.push(`<li aria-current="page">${s._title}</li>`);
    } else parts.push(`<li aria-current="page">${s._title}</li>`);
    crumbs.innerHTML = parts.join('');
  }

  /* ---- modo diapositivas ---- */
  const steps = s => [...s.querySelectorAll('.step')];
  function show(i, { revealAll = false } = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[cur].classList.remove('is-current');
    slides[cur].removeAttribute('aria-current');
    cur = i;
    const s = slides[cur];
    s.classList.add('is-current');
    s.setAttribute('aria-current', 'step');
    s.querySelectorAll('.now').forEach(e => e.classList.remove('now'));
    steps(s).forEach(st => { st.classList.toggle('on', revealAll); if (revealAll) st.removeAttribute('aria-hidden'); else st.setAttribute('aria-hidden', 'true'); });
    live.textContent = `Diapositiva ${cur + 1} de ${slides.length}: ${s._title}`;
    body.classList.toggle('on-dark', s.classList.contains('sep'));
    body.classList.toggle('on-cover', s.classList.contains('cover'));
    setCrumbs(s);
    count.textContent = `${cur + 1} / ${slides.length}`;
    if (body.classList.contains('mode-slides')) history.replaceState(null, '', '#' + (cur + 1));
  }
  function next() {
    const pending = steps(slides[cur]).find(st => !st.classList.contains('on'));
    if (pending) { markNow(pending); pending.classList.add('on'); pending.removeAttribute('aria-hidden'); live.textContent = pending.innerText.trim().replace(/\s+/g, ' '); return; }
    if (cur < slides.length - 1) show(cur + 1);
  }
  function markNow(st) {
    slides[cur].querySelectorAll('.now').forEach(e => e.classList.remove('now'));
    const li = st && st.closest('.ql li');
    if (li) li.classList.add('now');
  }
  function prev() { if (cur > 0) show(cur - 1, { revealAll: true }); }

  /* ---- modo lectura: seguir la sección visible ---- */
  const io = new IntersectionObserver(entries => {
    if (!body.classList.contains('mode-read')) return;
    const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (vis[0]) { cur = slides.indexOf(vis[0].target); setCrumbs(slides[cur]); }
  }, { rootMargin: '-80px 0px -55% 0px' });
  slides.forEach(s => io.observe(s));

  function setMode(mode, { keep = true } = {}) {
    const toSlides = mode === 'slides';
    body.classList.toggle('mode-slides', toSlides);
    body.classList.toggle('mode-read', !toSlides);
    btnMode.textContent = toSlides ? 'Lectura' : 'Diapositivas';
    try { localStorage.setItem('ai-mode', mode); } catch (e) {}
    if (toSlides) { show(cur, { revealAll: false }); }
    else {
      body.classList.remove('on-dark', 'on-cover');
      deck.querySelectorAll('.step').forEach(st => st.removeAttribute('aria-hidden'));
      slides.forEach(s => s.classList.remove('is-current'));
      history.replaceState(null, '', '#' + slides[cur].id);
      if (keep) slides[cur].scrollIntoView({ block: 'start' });
    }
  }

  function goTo(target) {
    const i = typeof target === 'number' ? target : slides.findIndex(s => s.id === target);
    if (i < 0) return;
    if (body.classList.contains('mode-slides')) show(i);
    else { cur = i; slides[i].scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); setCrumbs(slides[i]); history.replaceState(null, '', '#' + slides[i].id); }
  }

  /* ---- índice en forma de sitemap ---- */
  const tree = document.getElementById('tree');
  tree.innerHTML = `<div class="root"><a href="#portada">Arquitectura de la información</a></div>
    <ol class="chapters">${chapters.map(c => `<li>
      <a class="ch" href="#${c.el.id}"><span>${c.num}</span>${c.title}</a>
      <ul>${c.items.map(it => `<li><a href="#${it.s.id}">${it.s._title}</a></li>`).join('')}</ul>
    </li>`).join('')}</ol>`;
  function openIndex() {
    tree.querySelectorAll('[aria-current]').forEach(a => a.removeAttribute('aria-current'));
    const a = tree.querySelector(`a[href="#${slides[cur].id}"]`);
    if (a) a.setAttribute('aria-current', 'location');
    dlg.showModal();
    (a || tree.querySelector('a')).focus();
  }
  document.getElementById('btn-index').addEventListener('click', openIndex);
  document.getElementById('index-close').addEventListener('click', () => dlg.close());
  document.querySelectorAll('[data-open-index]').forEach(b => b.addEventListener('click', openIndex));

  /* ---- enlaces internos ---- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const go = a.dataset.go;
    e.preventDefault();
    if (dlg.open) dlg.close();
    if (go === 'next') return goTo(cur + 1);
    if (go === '0') return goTo(0);
    goTo(a.getAttribute('href').slice(1));
  });

  btnMode.addEventListener('click', () => setMode(body.classList.contains('mode-slides') ? 'read' : 'slides'));
  document.getElementById('next').addEventListener('click', next);
  document.getElementById('prev').addEventListener('click', prev);
  const btnFull = document.getElementById('btn-full');
  btnFull.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  document.addEventListener('fullscreenchange', () => { btnFull.textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa'; });

  /* ---- pausar animación (WCAG 2.2.2) ---- */
  const btnMotion = document.getElementById('btn-motion');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) btnMotion.hidden = true;
  btnMotion.addEventListener('click', () => {
    const on = document.documentElement.classList.toggle('paused');
    btnMotion.setAttribute('aria-pressed', on);
    btnMotion.textContent = on ? 'Reanudar animación' : 'Pausar animación';
  });

  /* ---- teclado ---- */
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (dlg.open) return;
    const k = e.key;
    if (k === 'i' || k === 'I') { e.preventDefault(); return openIndex(); }
    if (k === 'l' || k === 'L') { e.preventDefault(); return setMode(body.classList.contains('mode-slides') ? 'read' : 'slides'); }
    if (!body.classList.contains('mode-slides')) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'n'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'p'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); show(0); }
    else if (k === 'End') { e.preventDefault(); show(slides.length - 1, { revealAll: true }); }
    else if (k === 'f' || k === 'F') { e.preventDefault(); btnFull.click(); }
  });

  /* ---- gestos ---- */
  let tx = null;
  deck.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener('touchend', e => {
    if (tx === null || !body.classList.contains('mode-slides')) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  });

  /* ---- entradas en modo lectura ---- */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-motion');
    const reveal = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    slides.forEach(s => reveal.observe(s));
  }

  /* ---- arranque ---- */
  const h = location.hash.slice(1);
  if (/^\d+$/.test(h)) cur = Math.min(slides.length - 1, Math.max(0, +h - 1));
  else if (h) { const i = slides.findIndex(s => s.id === h); if (i >= 0) cur = i; }
  let mode = params.get('modo') === 'lectura' ? 'read' : params.get('modo') === 'diapositivas' ? 'slides' : null;
  if (!mode) { try { mode = localStorage.getItem('ai-mode'); } catch (e) {} }
  if (!mode) mode = innerWidth >= 900 ? 'slides' : 'read';
  setMode(mode, { keep: !!h });
  if (mode === 'read' && !h) scrollTo(0, 0);
  addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (/^\d+$/.test(h)) goTo(Math.min(slides.length, Math.max(1, +h)) - 1);
    else if (h && slides.some(s => s.id === h)) goTo(h);
  });
  addEventListener('resize', () => { if (innerWidth < 640 && body.classList.contains('mode-slides')) setMode('read'); });

  /* ---- comprobación de desbordes: ?check ---- */
  if (params.has('check')) {
    const bad = [];
    slides.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const els = [...s.querySelectorAll('*')].filter(el => !el.closest('.ribbon, .marq') && el.getClientRects().length);
      const off = els.find(el => { const b = el.getBoundingClientRect(); return b.bottom > r.bottom + 1 || b.right > r.right + 1 || b.left < r.left - 1; });
      const clipped = [...s.querySelectorAll('.cardset li, .answer, .key')].find(el => el.scrollHeight > el.clientHeight + 2);
      if (off || clipped) { (off || clipped).classList.add('overflow'); bad.push(`${i + 1}:${s._title}`); }
    });
    body.dataset.overflow = bad.join(' | ') || 'none';
  }
})();
