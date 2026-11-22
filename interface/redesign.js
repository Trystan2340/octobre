/* OCTOBRE: navigation adaptative (aucune dépendance, aucun appel réseau). */
(() => {
  'use strict';
  const toggle = document.getElementById('mobile-menu');
  const rail = document.querySelector('.sidebar');
  if (!toggle || !rail) return;
  const close = () => {
    document.body.classList.remove('sidebar-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
  };
  toggle.addEventListener('click', () => {
    const next = !document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', next);
    toggle.setAttribute('aria-expanded', String(next));
    toggle.setAttribute('aria-label', next ? 'Fermer le menu' : 'Ouvrir le menu');
  });
  rail.addEventListener('click', event => { if (event.target.closest('[data-page], #new-chat')) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.addEventListener('click', event => {
    if (document.body.classList.contains('sidebar-open') && !rail.contains(event.target) && !toggle.contains(event.target)) close();
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) close(); });
})();
