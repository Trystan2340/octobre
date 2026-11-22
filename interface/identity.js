'use strict';

(() => {
  const defaults = { style: 'ambre', effect: 'orbit', motion: 'full', visible: true };
  const choices = {
    style: ['ambre', 'aurore', 'encre', 'porcelaine'],
    effect: ['orbit', 'wave', 'pulse'],
    motion: ['full', 'quiet', 'off']
  };
  const storageKey = 'octobre-identity';
  let settings = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey)) || {};
    for (const [key, values] of Object.entries(choices)) {
      if (values.includes(saved[key])) settings[key] = saved[key];
    }
    if (typeof saved.visible === 'boolean') settings.visible = saved.visible;
  } catch {
    // A malformed preference gets the default appearance.
  }

  class OctobreMascot extends HTMLElement {
    connectedCallback() {
      if (!this.firstChild) {
        const shape = document.createElement('span');
        shape.className = 'mascot-shape';
        shape.setAttribute('aria-hidden', 'true');
        shape.innerHTML = '<span class="mascot-halo"></span><span class="mascot-body"></span><canvas class="sphere-face"></canvas>';
        this.append(shape);
      }
      this.canvas = this.querySelector('canvas');
      this.stateOwner = this.closest('.preview-stage, .activity');
      this.preferences = new MutationObserver(() => this.refresh());
      this.preferences.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-mascot-state', 'data-mascot-style', 'data-mascot-motion', 'data-mascot-visible']
      });
      if (this.stateOwner) {
        this.preferences.observe(this.stateOwner, { attributes: true, attributeFilter: ['data-mascot-state'] });
      }
      this.visibility = new IntersectionObserver(entries => {
        this.inView = entries[0].isIntersecting;
        if (this.inView) this.refresh();
        else this.release();
      });
      this.visibility.observe(this);
      this.onPointer = event => {
        if (!this.bot || document.body.dataset.mascotMotion !== 'full') return;
        const box = this.getBoundingClientRect();
        this.bot.update({ gaze: {
          x: (event.clientX - box.left) / box.width - .5,
          y: (event.clientY - box.top) / box.height - .5
        } });
      };
      this.onLeave = () => this.bot?.update({ gaze: { x: 0, y: 0 } });
      this.addEventListener('pointermove', this.onPointer);
      this.addEventListener('pointerleave', this.onLeave);
    }

    refresh() {
      if (!this.inView) return;
      const body = document.body;
      const state = this.stateOwner?.dataset.mascotState || body.dataset.mascotState || 'idle';
      const states = { answering: 'writing', speaking: 'dictating', ready: 'happy' };
      const animated = body.dataset.mascotMotion === 'full';
      const eyeColors = { ambre: '#fff5e5', aurore: '#edfff9', encre: '#ffffff', porcelaine: '#3d344c' };
      const options = {
        shape: 'blob',
        state: states[state] || state,
        autoBlink: animated,
        autoExpression: animated,
        theme: { bodyColor: 'transparent', eyeColor: eyeColors[body.dataset.mascotStyle] || '#ffffff' },
        ariaLabel: 'Sphère Octobre'
      };
      if (!this.bot) this.bot = new OctobreSphere.GrokBot(this.canvas, options);
      else this.bot.update(options);
      if (!animated) this.bot.reset();
    }

    release() {
      this.bot?.destroy();
      this.bot = null;
    }

    disconnectedCallback() {
      this.release();
      this.preferences?.disconnect();
      this.visibility?.disconnect();
      this.removeEventListener('pointermove', this.onPointer);
      this.removeEventListener('pointerleave', this.onLeave);
    }
  }
  customElements.define('octobre-mascot', OctobreMascot);

  const root = document.body;
  const field = id => document.getElementById(id);
  const preview = field('mascot-preview');
  const previewScene = preview.closest('.preview-stage');
  const previewState = field('preview-state');
  let chatState = 'idle';
  let audioState = 'idle';

  function syncState() {
    root.dataset.mascotState = chatState !== 'idle' ? chatState : audioState;
  }

  function applySettings() {
    root.dataset.mascotStyle = settings.style;
    root.dataset.mascotMotion = settings.motion;
    root.dataset.mascotEffect = settings.effect;
    root.dataset.mascotVisible = String(settings.visible);
    document.querySelectorAll('[name="mascot-style"]').forEach(radio => {
      radio.checked = radio.value === settings.style;
    });
    field('mascot-effect').value = settings.effect;
    field('mascot-motion').value = settings.motion;
    field('mascot-visible').checked = settings.visible;
  }

  function update(patch) {
    settings = { ...settings, ...patch };
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* session only */ }
    applySettings();
  }

  document.querySelectorAll('[name="mascot-style"]').forEach(radio => {
    radio.addEventListener('change', () => update({ style: radio.value }));
  });
  field('mascot-effect').addEventListener('change', event => update({ effect: event.target.value }));
  field('mascot-motion').addEventListener('change', event => update({ motion: event.target.value }));
  field('mascot-visible').addEventListener('change', event => update({ visible: event.target.checked }));
  field('mascot-reset').addEventListener('click', () => {
    update(defaults);
    previewState.value = 'idle';
    previewState.dispatchEvent(new Event('change'));
  });
  previewState.addEventListener('change', () => {
    previewScene.dataset.mascotState = previewState.value;
    preview.setAttribute('aria-label', 'Octobre · ' + previewState.selectedOptions[0].textContent);
  });
  const audio = field('audio');
  for (const event of ['playing', 'pause', 'ended', 'error']) {
    audio.addEventListener(event, () => {
      audioState = event === 'playing' ? 'speaking' : 'idle';
      syncState();
    });
  }

  const messages = {
    queued: 'En file d’attente',
    waiting_gpu: 'Attend le moteur local',
    running: 'Octobre réfléchit',
    verifying: 'Vérification du résultat',
    answering: 'Octobre répond',
    succeeded: 'Terminé',
    cancelled: 'Interrompu',
    interrupted: 'Interrompu par un arrêt',
    failed: 'Une erreur est survenue',
    disconnected: 'Suivi de la réponse interrompu'
  };
  const actions = {
    'file.list': 'Dossier consulté',
    'file.read': 'Fichier lu',
    'file.write': 'Fichier enregistré',
    'file.move': 'Fichier déplacé',
    'file.trash': 'Fichier mis en quarantaine',
    'file.restore': 'Fichier restauré',
    'memory.search': 'Mémoire consultée',
    'terminal.run': 'Test isolé terminé'
  };
  const terminal = new Set(['succeeded', 'cancelled', 'interrupted', 'failed', 'disconnected']);

  function startActivity() {
    const details = document.createElement('details');
    details.className = 'activity';
    details.dataset.mascotState = 'thinking';
    details.innerHTML = `
      <summary>
        <octobre-mascot aria-hidden="true"></octobre-mascot>
        <span class="activity-indicator" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="activity-label" role="status"></span>
        <span class="activity-time" aria-hidden="true"></span>
        <span class="activity-chevron" aria-hidden="true">›</span>
      </summary>
      <ol class="activity-steps" aria-label="Étapes de la demande"></ol>`;
    const label = details.querySelector('.activity-label');
    const time = details.querySelector('.activity-time');
    const steps = details.querySelector('ol');
    const started = performance.now();
    let previous = '';
    let isDone = false;

    function tick() {
      const seconds = Math.floor((performance.now() - started) / 1000);
      time.textContent = seconds < 60 ? seconds + ' s' : Math.floor(seconds / 60) + ' min ' + seconds % 60 + ' s';
    }

    function record(text) {
      if (text === previous || steps.children.length >= 60) return;
      const item = document.createElement('li');
      item.textContent = text;
      previous = text;
      steps.append(item);
    }

    const timer = setInterval(tick, 1000);
    function setState(state) {
      if (isDone || !messages[state]) return;
      label.textContent = messages[state];
      record(messages[state]);
      if (terminal.has(state)) {
        isDone = true;
        clearInterval(timer);
        tick();
        details.dataset.finished = state;
        details.dataset.mascotState = state === 'succeeded' ? 'ready' : 'idle';
        chatState = 'idle';
      } else {
        details.dataset.mascotState = state === 'answering' ? 'answering' : 'thinking';
        chatState = details.dataset.mascotState;
      }
      syncState();
    }
    setState('queued');
    tick();

    return {
      element: details,
      receive(kind, payload) {
        if (isDone) return;
        if (kind === 'state') setState(payload.state);
        if (kind === 'token' && label.textContent !== messages.answering) setState('answering');
        if (kind === 'tool') {
          const result = payload.result?.status;
          const text = result === 'refused' ? 'Action refusée'
            : result === 'failed' ? 'Action en erreur'
            : actions[payload.tool] || 'Résultat d’un outil reçu';
          record(text);
          label.textContent = text;
        }
        if (kind === 'research') record('Sources Web reçues');
        if (kind === 'artifact') record('Fichier produit');
        if (kind === 'fallback') record('Passage au moteur de secours');
      },
      finish(state = 'disconnected') { setState(state); }
    };
  }

  window.octobreIdentity = {
    startActivity,
    listen(active) {
      audioState = active ? 'listening' : 'idle';
      syncState();
    }
  };
  applySettings();
  syncState();
  previewState.dispatchEvent(new Event('change'));
})();
