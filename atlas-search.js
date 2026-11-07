(() => {
  'use strict';
  const init = () => {
    if (document.getElementById('atlas-search-dialog')) return;
    const ids = ['cota', 'yahcw', 'tuya', 'gaming', 'python', 'spotifast', 'financeiro'];
    // The existing index is the single source of truth for project descriptions.
    const projects = ids.map(id => {
      const source = document.querySelector(`.indice-jump-btn[data-jump-room="${id}"]`);
      return { id, title: source.querySelector('strong').textContent.trim(), description: source.querySelector('small').textContent.trim() };
    });
    const dialog = document.createElement('dialog');
    dialog.id = 'atlas-search-dialog';
    dialog.className = 'atlas-search-dialog';
    dialog.setAttribute('aria-labelledby', 'atlas-search-title');
    dialog.innerHTML = '<header class="atlas-search-header"><h2 id="atlas-search-title">Localizar um projeto</h2><button type="button" class="atlas-search-close-btn" aria-label="Fechar busca">×</button></header><div class="atlas-search-field"><label for="atlas-search-input">NOME, TECNOLOGIA OU ÁREA</label><input class="atlas-search-input" id="atlas-search-input" type="search" autocomplete="off" placeholder="Tente Python, dados ou Windows…" aria-controls="atlas-search-results"></div><p class="atlas-search-status" role="status" aria-live="polite"></p><ul id="atlas-search-results" class="atlas-search-results"></ul><footer class="atlas-search-footer">↑ ↓ selecionar · Enter abrir · Esc voltar</footer>';
    document.body.appendChild(dialog);
    const input = dialog.querySelector('input');
    const list = dialog.querySelector('ul');
    const status = dialog.querySelector('[role="status"]');
    let opener = null, selected = 0, results = projects;
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const close = (restore = true) => {
      dialog.close();
      document.documentElement.removeAttribute('data-search-open');
      if (restore && opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true });
    };
    const activate = id => {
      close(false);
      const trigger = document.querySelector(`.indice-jump-btn[data-jump-room="${id}"]`);
      trigger.click();
    };
    const highlight = () => {
      [...list.querySelectorAll('a')].forEach((a, i) => a.classList.toggle('is-selected', i === selected));
    };
    const render = () => {
      const query = normalize(input.value.trim());
      results = projects.filter(p => normalize(`${p.title} ${p.description} ${p.id}`).includes(query));
      selected = 0;
      list.replaceChildren();
      results.forEach((p, i) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${p.id}`;
        a.className = 'atlas-search-item';
        a.dataset.project = p.id;
        const index = document.createElement('span');
        index.className = 'atlas-search-item-index';
        index.textContent = String(projects.indexOf(p) + 1).padStart(2, '0');
        index.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        const title = document.createElement('strong');
        title.textContent = p.title;
        const description = document.createElement('small');
        description.textContent = p.description;
        text.append(title, description); a.append(index, text); li.append(a); list.append(li);
        a.addEventListener('click', e => { e.preventDefault(); activate(p.id); });
        a.addEventListener('focus', () => { selected = i; highlight(); });
      });
      status.textContent = results.length ? `${results.length} projeto${results.length === 1 ? '' : 's'} encontrado${results.length === 1 ? '' : 's'}` : 'Nenhum projeto encontrado. Tente outro nome ou tecnologia.';
      highlight();
    };
    const open = element => {
      if (document.querySelector('dialog[open]')) return;
      opener = element || document.activeElement;
      input.value = ''; render();
      dialog.showModal();
      document.documentElement.setAttribute('data-search-open', 'true');
      input.focus();
    };
    input.addEventListener('input', render);
    dialog.querySelector('button').addEventListener('click', () => close());
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } });
    document.querySelectorAll('[data-atlas-search]').forEach(button => { button.setAttribute('aria-controls', dialog.id); button.addEventListener('click', () => open(button)); });
    window.addEventListener('keydown', e => {
      if (dialog.open) {
        // Capture before the legacy router: Escape must close only this layer.
        if (['Escape', 'ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
          if (e.key === 'Enter' && e.target === dialog.querySelector('button')) return;
          e.preventDefault(); e.stopImmediatePropagation();
          if (e.key === 'Escape') close();
          else if (e.key === 'Enter' && results[selected]) activate(results[selected].id);
          else if (results.length && e.key !== 'Enter') {
            selected = (selected + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
            const target = list.querySelectorAll('a')[selected];
            target.focus({ preventScroll: true }); highlight();
            const r = target.getBoundingClientRect(), container = list.getBoundingClientRect();
            if (r.bottom > container.bottom) list.scrollTop += r.bottom - container.bottom;
            if (r.top < container.top) list.scrollTop -= container.top - r.top;
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k' && !e.target.closest('input,textarea,select,[contenteditable="true"]')) {
        e.preventDefault(); open(document.activeElement);
      }
    }, true);
    // Keep the displayed keyboard shortcut accurate for the current platform.
    document.querySelectorAll('[data-atlas-search] kbd').forEach(kbd => { kbd.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'; });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
