/* OCTOBRE · V3 — navigation adaptative et menus rapides.
   Aucune dépendance, aucun appel réseau : tout est dessiné côté client. */
(() => {
  'use strict';
  const body = document.body;
  const toggle = document.getElementById('mobile-menu');
  const rail = document.querySelector('.sidebar');
  const wide = window.matchMedia('(min-width: 761px)');

  /* ---------- Tiroir de navigation (mobile / tablette) ---------- */
  function closeDrawer({ restoreFocus = false } = {}) {
    if (!toggle || !rail || !body.classList.contains('sidebar-open')) return;
    body.classList.remove('sidebar-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    if (restoreFocus) toggle.focus();
  }
  function openDrawer() {
    body.classList.add('sidebar-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fermer le menu');
    rail.querySelector('nav button')?.focus({ preventScroll: true });
  }
  if (toggle && rail) {
    toggle.addEventListener('click', () => {
      if (body.classList.contains('sidebar-open')) closeDrawer();
      else openDrawer();
    });
    rail.addEventListener('click', event => {
      if (event.target.closest('[data-page], #new-chat')) closeDrawer();
    });
    document.addEventListener('click', event => {
      if (body.classList.contains('sidebar-open') && !rail.contains(event.target) && !toggle.contains(event.target)) closeDrawer();
    });
    wide.addEventListener('change', event => { if (event.matches) closeDrawer(); });
  }

  /* ---------- Pictogrammes des boutons créés par app.js ---------- */
  const pageIcons = {
    chat: '<path d="M20.5 11.6a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.3-4.6a7.5 7.5 0 1 1 14.7-3.3Z"/>',
    missions: '<path d="M9 4.4H7a2 2 0 0 0-2 2v12.2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6.4a2 2 0 0 0-2-2h-2"/><rect x="9" y="2.6" width="6" height="4" rx="1.4"/><path d="m9 13.4 1.9 1.9 4-4.1"/>',
    projects: '<path d="M3.4 7.4a2 2 0 0 1 2-2h3.9l2 2h7.3a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z"/><path d="M3.4 10.4h17.2"/>',
    voices: '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5M8.5 21.5h7"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 1 5-5l-2.5 2.5 1.5 2.5 2.5-2.5a4 4 0 0 1-5 5L5.7 18.3a1.9 1.9 0 0 1-2.7-2.7z"/><path d="M5 21h6"/>',
    health: '<path d="M3 12h3.4l2.6-6.4L13 18.4l2.5-6.4H21"/>',
    settings: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.9v2.2M12 18.9v2.2M2.9 12h2.2M18.9 12h2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>'
  };
  const pageNames = { chat: 'Discussion', missions: 'Missions', projects: 'Projets et fichiers', voices: 'Studio vocal', tools: 'Outils', health: 'Diagnostic', settings: 'Paramètres' };
  const icon = path => `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const text = (node, glyph) => {
    const wrap = document.createElement('span');
    wrap.className = 'btn-icon ' + glyph;
    wrap.setAttribute('aria-hidden', 'true');
    node.prepend(wrap);
    return wrap;
  };
  const iconFor = {
    'Confirmer la transcription': 'icon-check',
    'Écouter un aperçu': 'icon-play',
    'Valider cette voix': 'icon-check',
    'Utiliser cette voix': 'icon-link',
    'Actualiser': 'icon-refresh',
    'Rechercher': 'icon-search',
    'Exporter le certificat local': 'icon-download',
    'Créer un code de 2 minutes': 'icon-key',
    'Préparer avec Octobre': 'icon-spark',
    'Enregistrer les prochaines actions': 'icon-record',
    'Terminer l’enregistrement': 'icon-stop',
    'Vérifier et enregistrer': 'icon-check',
    'Importer et conserver l’ancien extrait en quarantaine': 'icon-upload',
    'Retirer vers la quarantaine récupérable': 'icon-trash',
    'Désactiver ce profil': 'icon-ban',
    'Réactiver ce profil': 'icon-refresh',
    'Rétablir les réglages de la mascotte': 'icon-refresh',
    'Actualiser les fichiers': 'icon-refresh',
    'Indexer cet espace': 'icon-list',
    'Restaurer': 'icon-refresh',
    'Exécuter': 'icon-play',
    'Suspendre le déclenchement': 'icon-pause',
    'Activer le déclenchement': 'icon-play',
    'Découvrir les outils': 'icon-list',
    'Révoquer': 'icon-ban',
    'Mettre en pause': 'icon-pause',
    'Reprendre': 'icon-play',
    'Interrompre': 'icon-stop'
  };
  function decorate(node) {
    if (!(node instanceof Element) || node.dataset.v3Icon === '1') return;
    node.dataset.v3Icon = '1';
    if (node.matches('button')) {
      const label = node.textContent.replace(/\s+/g, ' ').trim();
      const glyph = iconFor[label];
      if (glyph) text(node, glyph);
    }
    for (const child of node.querySelectorAll('button')) {
      const label = child.textContent.replace(/\s+/g, ' ').trim();
      const glyph = iconFor[label];
      if (glyph) text(child, glyph);
      child.dataset.v3Icon = '1';
    }
  }
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) decorate(node);
  }).observe(document.body, { childList: true, subtree: true });

  /* ---------- Menu rapide de l'en-tête ---------- */
  const quickToggle = document.getElementById('quick-menu-toggle');
  const quickPanel = document.getElementById('quick-menu-panel');
  if (!quickToggle || !quickPanel) return;

  const entries = [...quickPanel.querySelectorAll('[role="menuitem"]')];
  const isOpen = () => quickToggle.getAttribute('aria-expanded') === 'true';
  function openMenu(focusIndex = 0) {
    quickPanel.hidden = false;
    quickToggle.setAttribute('aria-expanded', 'true');
    syncCurrent();
    closeDrawer();
    entries[focusIndex]?.focus();
  }
  function closeMenu({ restoreFocus = false } = {}) {
    if (!isOpen()) return;
    quickPanel.hidden = true;
    quickToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) quickToggle.focus();
  }
  function syncCurrent() {
    for (const entry of entries) {
      if (entry.dataset.quick !== 'page') { entry.removeAttribute('aria-current'); continue; }
      const pressed = entry.dataset.page === document.querySelector('.sidebar nav button.active')?.dataset.page;
      pressed ? entry.setAttribute('aria-current', 'true') : entry.removeAttribute('aria-current');
    }
  }
  function activate(entry) {
    closeMenu({ restoreFocus: true });
    if (entry.dataset.quick === 'page') {
      document.querySelector(`.sidebar nav button[data-page="${entry.dataset.page}"]`)?.click();
    } else if (entry.dataset.quick === 'new-chat') {
      document.getElementById('new-chat')?.click();
    } else if (entry.dataset.quick === 'theme') {
      document.getElementById('light-theme')?.click();
    }
  }
  quickToggle.addEventListener('click', event => {
    event.stopPropagation();
    if (isOpen()) closeMenu();
    else openMenu();
  });
  quickPanel.addEventListener('click', event => {
    const entry = event.target.closest('[role="menuitem"]');
    if (entry) activate(entry);
  });
  /* Le panneau suit les changements de page et d'apparence. */
  new MutationObserver(syncCurrent).observe(document.querySelector('.sidebar nav') || document.body, {
    subtree: true, attributeFilter: ['class']
  });
  new MutationObserver(() => { if (isOpen()) syncCurrent(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('click', event => {
    if (isOpen() && !quickPanel.contains(event.target) && !quickToggle.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenu({ restoreFocus: isOpen() });
      closeDrawer({ restoreFocus: body.classList.contains('sidebar-open') });
      return;
    }
    const typing = event.target.closest('input, textarea, select, [contenteditable="true"]');
    if ((event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey) && !event.altKey) {
      event.preventDefault();
      isOpen() ? closeMenu({ restoreFocus: true }) : openMenu();
      return;
    }
    if (isOpen() && !typing && /^[1-7]$/.test(event.key)) {
      const entry = entries.find(node => node.dataset.quick === 'page' && node.querySelector('.quick-menu-shortcut')?.textContent === event.key);
      if (entry) { event.preventDefault(); activate(entry); return; }
    }
    if (!isOpen() || !['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(event.key)) return;
    const current = entries.indexOf(document.activeElement);
    if (event.key === 'Tab') { closeMenu(); return; }
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? current + 1
      : event.key === 'ArrowUp' ? (current <= 0 ? entries.length - 1 : current - 1)
      : event.key === 'Home' ? 0 : entries.length - 1;
    entries[(next + entries.length) % entries.length]?.focus();
  });
  window.addEventListener('blur', () => closeMenu());
  document.addEventListener('focusin', event => {
    if (isOpen() && !quickPanel.contains(event.target) && event.target !== quickToggle) closeMenu();
  });
})();
