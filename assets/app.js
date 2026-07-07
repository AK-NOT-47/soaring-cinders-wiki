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

  // ---- day / night theme ----
  (function () {
    const root = document.documentElement;
    const toggle = document.querySelector('.theme-toggle');
    function apply(t) {
      root.dataset.theme = t;
      try { localStorage.setItem('sc-wiki-theme', t); } catch (e) {}
      if (toggle) toggle.querySelectorAll('button').forEach(b => {
        const on = b.getAttribute('data-theme-set') === t;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    apply(root.dataset.theme === 'day' ? 'day' : 'night'); // sync buttons to the head-set theme
    if (toggle) toggle.addEventListener('click', e => {
      const b = e.target.closest('button[data-theme-set]');
      if (b) apply(b.getAttribute('data-theme-set'));
    });
  })();

  // ---- ember weather (site-wide) ----
  (function () {
    const layer = document.querySelector('.ember-weather');
    if (!layer) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 38; i++) {
      const e = document.createElement('i');
      const x = 4 + Math.random() * 92, s = 3 + Math.random() * 6, d = 7 + Math.random() * 10;
      const delay = Math.random() * d, dx = Math.random() * 46 - 23, o = 0.4 + Math.random() * 0.5;
      const cool = Math.random() < 0.16;
      e.style.cssText = `left:${x.toFixed(2)}%;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;`
        + `background:radial-gradient(circle at 40% 35%,${cool ? 'var(--teal)' : 'var(--ember)'},transparent 72%);`
        + `animation:floatup ${d.toFixed(2)}s linear infinite;animation-delay:-${delay.toFixed(2)}s;`
        + `--dx:${dx.toFixed(0)}px;opacity:${o.toFixed(2)}`;
      frag.appendChild(e);
    }
    layer.appendChild(frag);
  })();

  // ---- Wikipedia-style hover previews ----
  (function () {
    const card = document.getElementById('sc-hovercard');
    const data = window.PREVIEW_INDEX;
    if (!card || !data) return;
    let showT = null, hideT = null, current = null;
    const slugFromHref = (href) => {
      if (!href || href.charAt(0) === '#') return null;
      const last = href.split('#')[0].split('?')[0].split('/').pop();
      if (!last || last.indexOf('.html') < 0) return null;
      return last.replace(/\.html$/, '');
    };
    const fill = (d) => {
      card.innerHTML = '<div class="hc-bar"></div><div class="hc-body">'
        + '<div class="hc-head"><span class="hc-glyph">' + d.glyph + '</span><span class="hc-kind">' + d.ns + '</span></div>'
        + '<div class="hc-blurb">' + d.blurb + '</div>'
        + '<div class="hc-read">READ ARTICLE →</div></div>';
    };
    const place = (a) => {
      const r = a.getBoundingClientRect(), cw = card.offsetWidth || 308, ch = card.offsetHeight || 130;
      const vw = window.innerWidth, vh = window.innerHeight, gap = 10;
      let left = r.left; if (left + cw > vw - 12) left = vw - 12 - cw; if (left < 12) left = 12;
      let top = r.bottom + gap; if (top + ch > vh - 12) top = r.top - gap - ch; if (top < 12) top = 12;
      card.style.left = Math.round(left) + 'px'; card.style.top = Math.round(top) + 'px';
    };
    const show = (a, d) => { clearTimeout(hideT); current = a; fill(d); place(a); requestAnimationFrame(() => card.classList.add('show')); };
    const hide = () => { card.classList.remove('show'); current = null; };
    document.addEventListener('mouseover', e => {
      const a = e.target.closest && e.target.closest('a'); if (!a || card.contains(a)) return;
      const slug = slugFromHref(a.getAttribute('href')); if (!slug) return;
      const d = data[slug]; if (!d) return;
      clearTimeout(showT); clearTimeout(hideT);
      if (current === a) return;
      showT = setTimeout(() => show(a, d), 320);
    });
    document.addEventListener('mouseout', e => {
      const a = e.target.closest && e.target.closest('a'); if (!a) return;
      clearTimeout(showT); hideT = setTimeout(hide, 130);
    });
    window.addEventListener('scroll', () => { if (current) place(current); }, true);
  })();
})();
