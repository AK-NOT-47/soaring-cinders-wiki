// Soaring Cinders site — search, TOC scrollspy, mobile nav
(function () {
  // ---- mobile sidebar ----
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.querySelector('.menu-btn');
  const scrim = document.querySelector('.scrim');
  function closeNav() { sidebar && sidebar.classList.remove('open'); scrim && scrim.classList.remove('show'); }
  menuBtn && menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open'); scrim.classList.toggle('show');
  });
  scrim && scrim.addEventListener('click', closeNav);

  // ---- button press feedback ----
  document.addEventListener('pointerdown', e => {
    const button = e.target.closest && e.target.closest('.wiki-editor-actions button,.wiki-dialog-actions button,.wiki-tag-row button,.wiki-icon-btn');
    if (!button || button.disabled) return;
    button.classList.remove('wiki-pressing');
    // Restart the animation when a button is clicked repeatedly.
    void button.offsetWidth;
    button.classList.add('wiki-pressing');
    window.setTimeout(() => button.classList.remove('wiki-pressing'), 180);
  });

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

  // ---- local wiki editor ----
  (function () {
    const apiRoot = '/api/wiki';
    const top = document.querySelector('.top');
    if (!top || !window.fetch) return;

    let meta = null;
    let apiOnline = false;
    let tagManagerDirty = false;
    const storageKey = 'sc-wiki-local-edits-v1';
    const staticCategories = [
      { id: 'world', title: 'World', subcategories: ['Culture', 'History', 'Other', 'Religion'] },
      { id: 'characters', title: 'Characters', subcategories: ['Primary', 'Secondary', 'Tertiary'] },
      { id: 'locations', title: 'Locations', subcategories: ['Nation', 'Other', 'Region', 'Town'] },
      { id: 'story', title: 'Story', subcategories: [] },
      { id: 'bestiary', title: 'Bestiary', subcategories: [] },
      { id: 'items', title: 'Items', subcategories: [] },
      { id: 'magic', title: 'Magic', subcategories: [] },
      { id: 'systems', title: 'Systems', subcategories: [] },
      { id: 'development', title: 'Development', subcategories: [] },
    ].map(cat => ({
      ...cat,
      subcategories: cat.subcategories.map(title => ({ id: slugify(title), title })),
    }));

    const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    function slugify(value) {
      return String(value || '').trim().toLowerCase()
        .replace(/['"]/g, '')
        .replace(/[^\w]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    const readLocalEdits = () => {
      try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (e) { return {}; }
    };
    const writeLocalEdits = (edits) => {
      localStorage.setItem(storageKey, JSON.stringify(edits));
    };
    const pageKey = (namespace, slug) => `${namespace}/${slug}`;
    const pageBasePath = () => {
      const parts = location.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex(part => staticCategories.some(cat => cat.id === part));
      return idx > 0 ? '/' + parts.slice(0, idx).join('/') : '';
    };
    const articleUrl = (namespace, slug) => `${pageBasePath()}/${namespace}/${slug}.html`;
    const pageRef = (() => {
      const match = location.pathname.match(/\/([^/]+)\/([^/]+)\.html$/);
      if (!match) return { namespace: '', slug: '', isArticle: false };
      const namespace = decodeURIComponent(match[1]);
      const slug = decodeURIComponent(match[2]);
      return { namespace, slug, isArticle: slug !== 'index' };
    })();
    const titleFromPage = () => {
      const h1 = document.querySelector('.page-head h1');
      return h1 ? h1.textContent.trim().replace(/^[^\w#]+/, '').trim() : 'Article';
    };
    const api = async (path, options) => {
      const res = await fetch(apiRoot + path, {
        ...options,
        headers: { 'content-type': 'application/json', ...(options && options.headers || {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The wiki editor request failed.');
      return data;
    };
    const staticMeta = () => {
      const edits = readLocalEdits();
      const localPages = Object.values(edits).filter(page => !page.deleted);
      const indexedPages = (window.SEARCH_INDEX || [])
        .filter(item => item.url && /\/[^/]+\.html$/.test(item.url) && !item.url.endsWith('/index.html'))
        .map(item => {
          const bits = item.url.split('/');
          const namespace = bits[0];
          const slug = bits[1].replace(/\.html$/, '');
          return { namespace, slug, title: item.title, subcategory: '', tags: [] };
        });
      const pagesByKey = new Map(indexedPages.map(page => [pageKey(page.namespace, page.slug), page]));
      for (const page of localPages) pagesByKey.set(pageKey(page.namespace, page.slug), page);
      const tagCounts = new Map();
      for (const page of pagesByKey.values()) {
        for (const tag of page.tags || []) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
      return {
        categories: staticCategories,
        pages: [...pagesByKey.values()].sort((a, b) => a.title.localeCompare(b.title)),
        tags: [...tagCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
      };
    };
    const currentLocalPage = () => readLocalEdits()[pageKey(pageRef.namespace, pageRef.slug)];
    const currentBuiltPage = () => {
      if (window.WIKI_PAGE) return window.WIKI_PAGE;
      const script = document.getElementById('wiki-page-data');
      if (!script) return null;
      try { return JSON.parse(script.textContent || 'null'); } catch (e) { return null; }
    };
    const pageForEdit = () => {
      const local = currentLocalPage();
      if (local && !local.deleted) return local;
      const built = currentBuiltPage();
      if (built) return built;
      return {
        title: titleFromPage(),
        slug: pageRef.slug,
        namespace: pageRef.namespace,
        subcategory: defaultSubcategory(pageRef.namespace),
        tags: [],
        body: '# ' + titleFromPage(),
      };
    };
    const inlineMd = (text) => esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1');
    const renderMarkdown = (markdown) => {
      const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
      let html = '';
      let inList = false;
      const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
      for (const line of lines) {
        if (!line.trim()) { closeList(); continue; }
        const heading = line.match(/^(#{1,4})\s+(.+)$/);
        if (heading) {
          closeList();
          const level = heading[1].length;
          const id = slugify(heading[2]);
          html += `<h${level} id="${id}"><a class="header-anchor" href="#${id}">${inlineMd(heading[2])}</a></h${level}>`;
          continue;
        }
        const quote = line.match(/^>\s*(.+)$/);
        if (quote) { closeList(); html += `<blockquote><p>${inlineMd(quote[1])}</p></blockquote>`; continue; }
        const bullet = line.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          if (!inList) { html += '<ul>'; inList = true; }
          html += `<li>${inlineMd(bullet[1])}</li>`;
          continue;
        }
        closeList();
        html += `<p>${inlineMd(line)}</p>`;
      }
      closeList();
      return html;
    };
    const paintArticle = (page) => {
      if (!page || page.deleted || !pageRef.isArticle) return;
      const h1 = document.querySelector('.page-head h1');
      const crumb = document.querySelector('.breadcrumb span:last-child');
      const eyebrow = document.querySelector('.page-head .eyebrow');
      const facets = document.querySelector('.page-head .facets');
      const article = document.querySelector('article.prose');
      if (h1) h1.textContent = page.title;
      if (crumb) crumb.textContent = page.title;
      const cat = categoryById(page.namespace);
      const sub = cat && cat.subcategories ? cat.subcategories.find(s => s.id === page.subcategory) : null;
      if (eyebrow && cat) eyebrow.textContent = `${cat.title}${sub ? ' / ' + sub.title : ''}`;
      if (facets) facets.innerHTML = (page.tags || []).map(tag => `<span class="facet f-tag">#${esc(tag)}</span>`).join('');
      if (article) article.innerHTML = renderMarkdown(String(page.body || '').replace(/^#\s+.*(?:\n|$)/, ''));
      document.title = `${page.title} · Soaring Cinders Wiki`;
    };
    const saveLocalArticle = (payload) => {
      const title = String(payload.title || '').trim();
      if (!title) throw new Error('Title is required.');
      const namespace = slugify(payload.namespace);
      const slug = slugify(payload.slug || title);
      if (!categoryById(namespace)) throw new Error('Unknown category.');
      const cat = categoryById(namespace);
      const subcategory = cat.subcategories.length
        ? (cat.subcategories.find(sub => sub.id === slugify(payload.subcategory))?.id || cat.subcategories[0].id)
        : '';
      const tags = [...new Set((payload.tags || []).map(tag => String(tag).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const body = String(payload.body || '').replace(/^\s+/, '').trimEnd() + '\n';
      const edits = readLocalEdits();
      if (payload.original) delete edits[pageKey(payload.original.namespace, payload.original.slug)];
      edits[pageKey(namespace, slug)] = { title, slug, namespace, subcategory, tags, body: body || `# ${title}\n`, localOnly: true };
      writeLocalEdits(edits);
      meta = staticMeta();
      return { url: articleUrl(namespace, slug), namespace, slug, localOnly: true };
    };
    const categoryById = (id) => (meta.categories || []).find(cat => cat.id === id);
    const defaultSubcategory = (namespace) => {
      const cat = categoryById(namespace);
      return cat && cat.subcategories && cat.subcategories[0] ? cat.subcategories[0].id : '';
    };
    const currentCategory = () => categoryById(pageRef.namespace) ? pageRef.namespace : 'world';
    const showToast = (text) => {
      let toast = document.querySelector('.wiki-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'wiki-toast';
        document.body.appendChild(toast);
      }
      toast.textContent = text;
      toast.classList.add('show');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
    };
    const closeModal = (modal) => {
      modal.remove();
      document.body.classList.remove('wiki-modal-open');
      if (tagManagerDirty) {
        tagManagerDirty = false;
        location.reload();
      }
    };
    const modalShell = (title, body) => {
      const modal = document.createElement('div');
      modal.className = 'wiki-modal';
      modal.innerHTML = `<div class="wiki-dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="wiki-dialog-head"><h2>${esc(title)}</h2><button type="button" class="wiki-icon-btn" data-close aria-label="Close">x</button></div>
        ${body}
      </div>`;
      modal.addEventListener('click', e => {
        if (e.target === modal || e.target.closest('[data-close]')) closeModal(modal);
      });
      document.addEventListener('keydown', function onKey(e) {
        if (!document.body.contains(modal)) return document.removeEventListener('keydown', onKey);
        if (e.key === 'Escape') closeModal(modal);
      });
      document.body.appendChild(modal);
      document.body.classList.add('wiki-modal-open');
      return modal;
    };
    const setFormError = (form, message) => {
      const err = form.querySelector('.wiki-form-error');
      if (err) err.textContent = message || '';
    };
    const setBusy = (form, busy) => {
      form.querySelectorAll('button,input,select,textarea').forEach(el => { el.disabled = busy; });
      form.classList.toggle('is-busy', busy);
    };
    const field = (form, name) => form.querySelector(`[name="${name}"]`);
    const categoryOptions = (selected) => (meta.categories || []).map(cat =>
      `<option value="${esc(cat.id)}"${cat.id === selected ? ' selected' : ''}>${esc(cat.title)}</option>`
    ).join('');
    const subcategoryOptions = (namespace, selected) => {
      const cat = categoryById(namespace);
      const subs = cat && cat.subcategories ? cat.subcategories : [];
      return subs.map(sub =>
        `<option value="${esc(sub.id)}"${sub.id === selected ? ' selected' : ''}>${esc(sub.title)}</option>`
      ).join('');
    };
    const refreshSubcategorySelect = (form, selected) => {
      const ns = field(form, 'namespace').value;
      const row = form.querySelector('[data-subcategory-row]');
      const select = field(form, 'subcategory');
      const cat = categoryById(ns);
      const subs = cat && cat.subcategories ? cat.subcategories : [];
      row.hidden = subs.length === 0;
      select.innerHTML = subcategoryOptions(ns, selected || (subs[0] && subs[0].id) || '');
    };
    const openArticleEditor = async (mode) => {
      const isEdit = mode === 'edit';
      const page = isEdit
        ? (apiOnline
          ? await api(`/page?namespace=${encodeURIComponent(pageRef.namespace)}&slug=${encodeURIComponent(pageRef.slug)}`)
          : pageForEdit())
        : {
          title: '',
          slug: '',
          ns: currentCategory(),
          namespace: currentCategory(),
          subcategory: defaultSubcategory(currentCategory()),
          tags: [],
          body: '',
        };
      const namespace = page.namespace || page.ns || currentCategory();
      const modal = modalShell(isEdit ? 'Edit Article' : 'New Article', `<form class="wiki-edit-form">
        <div class="wiki-form-grid">
          <label>Title<input name="title" required value="${esc(page.title || '')}"></label>
          <label>Slug<input name="slug" value="${esc(page.slug || '')}" placeholder="auto-from-title"></label>
          <label>Category<select name="namespace">${categoryOptions(namespace)}</select></label>
          <label data-subcategory-row>Subcategory<select name="subcategory">${subcategoryOptions(namespace, page.subcategory)}</select></label>
          <label class="wiki-wide">Tags<input name="tags" value="${esc((page.tags || []).join(', '))}" placeholder="comma separated"></label>
        </div>
        <label class="wiki-body-label">Markdown<textarea name="body" spellcheck="true">${esc(page.body || '')}</textarea></label>
        <div class="wiki-form-error" role="alert"></div>
        <div class="wiki-dialog-actions"><button type="button" data-close>Cancel</button><button type="submit" class="primary">${isEdit ? 'Save' : 'Create'}</button></div>
      </form>`);
      const form = modal.querySelector('form');
      refreshSubcategorySelect(form, page.subcategory);
      field(form, 'namespace').addEventListener('change', () => refreshSubcategorySelect(form, ''));
      if (!isEdit) {
        field(form, 'title').addEventListener('input', () => {
          if (!field(form, 'slug').dataset.touched) field(form, 'slug').value = field(form, 'title').value.toLowerCase().trim().replace(/['"]/g, '').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
        });
        field(form, 'slug').addEventListener('input', () => { field(form, 'slug').dataset.touched = '1'; });
      }
      form.addEventListener('submit', async e => {
        e.preventDefault();
        setFormError(form, '');
        setBusy(form, true);
        try {
          const payload = {
            title: field(form, 'title').value,
            slug: field(form, 'slug').value,
            namespace: field(form, 'namespace').value,
            subcategory: field(form, 'subcategory').value,
            tags: field(form, 'tags').value.split(','),
            body: field(form, 'body').value,
          };
          if (isEdit) payload.original = { namespace: pageRef.namespace, slug: pageRef.slug };
          const saved = apiOnline
            ? await api('/page', { method: 'POST', body: JSON.stringify(payload) })
            : saveLocalArticle(payload);
          if (!apiOnline && saved.namespace === pageRef.namespace && saved.slug === pageRef.slug) {
            closeModal(modal);
            paintArticle(currentLocalPage());
            showToast('Saved in this browser.');
          } else {
            location.href = saved.url + '?edited=1';
          }
        } catch (error) {
          setFormError(form, error.message);
          setBusy(form, false);
        }
      });
      field(form, 'title').focus();
    };
    const deleteArticle = async () => {
      if (!pageRef.isArticle) return;
      const title = titleFromPage();
      if (!confirm(`Delete "${title}"?`)) return;
      try {
        if (apiOnline) {
          const deleted = await api('/delete', {
            method: 'POST',
            body: JSON.stringify({ namespace: pageRef.namespace, slug: pageRef.slug }),
          });
          location.href = deleted.url + '?edited=1';
        } else {
          const edits = readLocalEdits();
          edits[pageKey(pageRef.namespace, pageRef.slug)] = { ...(pageForEdit() || {}), deleted: true };
          writeLocalEdits(edits);
          location.href = articleUrl(pageRef.namespace, 'index').replace(/\/index\.html$/, '/index.html') + '?edited=1';
        }
      } catch (error) {
        showToast(error.message);
      }
    };
    const renderTagManager = (modal) => {
      const list = modal.querySelector('[data-tag-list]');
      const tags = meta.tags || [];
      list.innerHTML = tags.length ? tags.map(tag => `<div class="wiki-tag-row" data-tag="${esc(tag.name)}">
        <input value="${esc(tag.name)}" aria-label="Tag name">
        <span>${tag.count}</span>
        <button type="button" data-rename>Rename</button>
        <button type="button" data-delete>Delete</button>
      </div>`).join('') : '<div class="wiki-empty">No tags yet.</div>';
    };
    const openTagManager = async () => {
      meta = await api('/meta');
      const modal = modalShell('Tags', `<div class="wiki-tag-list" data-tag-list></div>
        <div class="wiki-form-error" role="alert"></div>
        <div class="wiki-dialog-actions"><button type="button" data-close>Done</button></div>`);
      renderTagManager(modal);
      modal.addEventListener('click', async e => {
        const row = e.target.closest('.wiki-tag-row');
        if (!row) return;
        const formErr = modal.querySelector('.wiki-form-error');
        formErr.textContent = '';
        const from = row.dataset.tag;
        try {
          if (e.target.matches('[data-rename]')) {
            const to = row.querySelector('input').value;
            if (apiOnline) await api('/tags', { method: 'POST', body: JSON.stringify({ action: 'rename', from, to }) });
            else {
              const edits = readLocalEdits();
              for (const page of Object.values(edits)) page.tags = (page.tags || []).map(tag => tag.toLowerCase() === from.toLowerCase() ? to : tag);
              writeLocalEdits(edits);
            }
          } else if (e.target.matches('[data-delete]')) {
            if (!confirm(`Delete tag "${from}" from all articles?`)) return;
            if (apiOnline) await api('/tags', { method: 'POST', body: JSON.stringify({ action: 'delete', tag: from }) });
            else {
              const edits = readLocalEdits();
              for (const page of Object.values(edits)) page.tags = (page.tags || []).filter(tag => tag.toLowerCase() !== from.toLowerCase());
              writeLocalEdits(edits);
            }
          } else {
            return;
          }
          tagManagerDirty = true;
          meta = apiOnline ? await api('/meta') : staticMeta();
          renderTagManager(modal);
        } catch (error) {
          formErr.textContent = error.message;
        }
      });
    };
    const installToolbar = () => {
      const toolbar = document.createElement('div');
      toolbar.className = 'wiki-editor-actions';
      toolbar.innerHTML = `${pageRef.isArticle ? '<button type="button" data-editor-edit>Edit</button><button type="button" data-editor-delete>Delete</button>' : ''}
        <button type="button" data-editor-new>New</button><button type="button" data-editor-tags>Tags</button>`;
      const toggle = top.querySelector('.theme-toggle');
      top.insertBefore(toolbar, toggle || null);
      toolbar.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) return;
        if (button.matches('[data-editor-edit]')) openArticleEditor('edit').catch(err => showToast(err.message));
        if (button.matches('[data-editor-new]')) openArticleEditor('new').catch(err => showToast(err.message));
        if (button.matches('[data-editor-delete]')) deleteArticle();
        if (button.matches('[data-editor-tags]')) openTagManager().catch(err => showToast(err.message));
      });
    };

    api('/meta').then(data => {
      apiOnline = true;
      meta = data;
      installToolbar();
      if (new URLSearchParams(location.search).has('edited')) showToast('Wiki updated.');
    }).catch(() => {
      apiOnline = false;
      meta = staticMeta();
      installToolbar();
      if (pageRef.isArticle) paintArticle(currentLocalPage());
      if (new URLSearchParams(location.search).has('edited')) showToast('Saved in this browser.');
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
        + `background:radial-gradient(circle at 40% 35%,${cool ? 'var(--cinderParticleCool)' : 'var(--cinderParticle)'},transparent 72%);`
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
