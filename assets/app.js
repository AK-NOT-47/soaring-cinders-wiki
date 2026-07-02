// Soaring Cinders site — search, TOC scrollspy, mobile nav, progress bar
(function () {
  // ---- reading progress ----
  const bar = document.getElementById('progress');
  if (bar) {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    document.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // ---- mobile sidebar ----
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.querySelector('.menu-btn');
  const scrim = document.querySelector('.scrim');
  function closeNav() { sidebar && sidebar.classList.remove('open'); scrim && scrim.classList.remove('show'); }
  menuBtn && menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open'); scrim.classList.toggle('show');
  });
  scrim && scrim.addEventListener('click', closeNav);

  // ---- TOC scrollspy ----
  const tocLinks = Array.from(document.querySelectorAll('.toc a'));
  if (tocLinks.length) {
    const map = new Map();
    tocLinks.forEach(a => { const id = a.getAttribute('href').slice(1); const el = document.getElementById(id); if (el) map.set(el, a); });
    let current = null;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) {
        if (current) current.classList.remove('active');
        current = map.get(e.target); current && current.classList.add('active');
      }});
    }, { rootMargin: '-72px 0px -72% 0px', threshold: 0 });
    map.forEach((_a, el) => io.observe(el));
  }

  // ---- search ----
  const input = document.getElementById('search');
  const results = document.getElementById('results');
  const INDEX = window.SEARCH_INDEX || [];
  let active = -1, items = [];

  function snippet(text, q) {
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return text.slice(0, 110) + '…';
    const s = Math.max(0, i - 50), e = Math.min(text.length, i + q.length + 60);
    const esc = (t) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    return (s > 0 ? '…' : '') + esc(text.slice(s, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length, e)) + '…';
  }
  function run(q) {
    q = q.trim().toLowerCase();
    if (!q) { results.classList.remove('show'); results.innerHTML = ''; return; }
    const scored = [];
    for (const p of INDEX) {
      const t = p.title.toLowerCase(), body = p.text.toLowerCase();
      let score = 0;
      if (t.includes(q)) score += 100;
      const bi = body.indexOf(q);
      if (bi >= 0) score += 30;
      if (score) scored.push({ p, score });
    }
    scored.sort((a, b) => b.score - a.score);
    items = scored.slice(0, 8);
    if (!items.length) { results.innerHTML = '<div class="r-empty">No matches found.</div>'; results.classList.add('show'); return; }
    results.innerHTML = items.map((it, idx) =>
      `<a href="${it.p.url}" data-i="${idx}"><span class="r-group">${it.p.group}</span><div class="r-title">${it.p.title}</div><div class="r-snip">${snippet(it.p.text, q)}</div></a>`
    ).join('');
    results.classList.add('show'); active = -1;
  }
  if (input) {
    input.addEventListener('input', () => run(input.value));
    input.addEventListener('keydown', e => {
      const links = Array.from(results.querySelectorAll('a'));
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, links.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); }
      else if (e.key === 'Enter') { if (links[active]) location.href = links[active].href; return; }
      else if (e.key === 'Escape') { results.classList.remove('show'); input.blur(); return; }
      else return;
      links.forEach(l => l.classList.remove('active')); if (links[active]) links[active].classList.add('active');
    });
    document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) results.classList.remove('show'); });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); }
    });
  }

  // ---- embers on home ----
  const embers = document.querySelector('.embers');
  if (embers) {
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDuration = (5 + Math.random() * 7) + 's';
      s.style.animationDelay = (Math.random() * 8) + 's';
      const sz = 2 + Math.random() * 4; s.style.width = s.style.height = sz + 'px';
      embers.appendChild(s);
    }
  }
})();
