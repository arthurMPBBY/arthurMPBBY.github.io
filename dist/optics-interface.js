(function () {
  'use strict';

  const root = document.documentElement;
  const panel = document.getElementById('optics-interface');
  const toggle = document.getElementById('btn-optics-view');
  const viewport = document.getElementById('spatial-viewport');
  if (!panel || !toggle || !viewport) return;

  const caption = document.getElementById('optics-caption');
  const adjustments = document.getElementById('optics-adjustments');
  const keyHint = document.getElementById('optics-key-hint');
  const depth = document.getElementById('optics-depth');
  const motion = document.getElementById('optics-motion');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const isolatedElements = Array.from(document.querySelectorAll('.atlas-header, .atlas-dock, .atlas-minimap-container, #spatial-world, #atlas-relation-banner, .skip-link'));
  let previousInertStates = [];
  let immersive = false;
  let dragPointer = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let gazeX = 0;
  let gazeY = 0;
  let dragGazeX = 0;
  let dragGazeY = 0;
  let previousFocus = null;

  function motionAllowed() {
    return root.dataset.motion !== 'paused' && !reducedMotion.matches && !document.hidden;
  }

  function dispatchOptics(reset) {
    window.dispatchEvent(new CustomEvent('portfolio:opticsinput', {
      detail: { x: gazeX, y: gazeY, zoom: Number(depth.value) / 100, reset: Boolean(reset) }
    }));
  }

  function updateMaterialPerspective() {
    const active = motionAllowed() && !coarsePointer.matches;
    root.style.setProperty('--iris-pitch', (active ? gazeY * -4 : 0).toFixed(2) + 'deg');
    root.style.setProperty('--iris-yaw', (active ? gazeX * 6 : 0).toFixed(2) + 'deg');
  }

  function setImmersive(nextState, restoreFocus) {
    if (immersive === nextState) return;
    immersive = nextState;
    if (immersive) {
      previousFocus = document.activeElement;
      previousInertStates = isolatedElements.map(element => element.inert);
      isolatedElements.forEach(element => { element.inert = true; });
      root.dataset.optics = 'immersive';
    } else {
      isolatedElements.forEach((element, index) => { element.inert = previousInertStates[index]; });
      delete root.dataset.optics;
      dragPointer = null;
    }
    caption.hidden = !immersive;
    adjustments.hidden = !immersive;
    keyHint.hidden = !immersive;
    toggle.setAttribute('aria-pressed', String(immersive));
    document.getElementById('optics-toggle-label').textContent = immersive ? 'Voltar aos projetos' : 'Dentro da íris';
    if (immersive) toggle.focus({ preventScroll: true });
    if (!immersive && restoreFocus && previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    gazeX = 0;
    gazeY = 0;
    depth.value = '100';
    dispatchOptics(true);
    updateMaterialPerspective();
  }

  function synchronize() {
    const available = root.classList.contains('has-kaleidoscope') && root.dataset.view === 'atlas';
    if (!available && immersive) setImmersive(false, false);
    panel.hidden = !available;
    const paused = !motionAllowed();
    motion.setAttribute('aria-pressed', String(paused));
    motion.textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
    motion.disabled = reducedMotion.matches;
    depth.disabled = paused;
    document.getElementById('optics-reset').disabled = paused;
    updateMaterialPerspective();
  }

  toggle.addEventListener('click', () => setImmersive(!immersive, true));
  document.getElementById('optics-reset').addEventListener('click', () => {
    gazeX = 0;
    gazeY = 0;
    depth.value = '100';
    dispatchOptics(true);
    updateMaterialPerspective();
  });
  depth.addEventListener('input', () => { if (motionAllowed()) dispatchOptics(false); });
  motion.addEventListener('click', () => document.getElementById('motion-toggle-btn').click());

  window.addEventListener('pointerdown', pointerEvent => {
    if (!viewport.contains(pointerEvent.target) || pointerEvent.button > 0) return;
    if (immersive) pointerEvent.stopImmediatePropagation();
    if (!motionAllowed()) return;
    dragPointer = pointerEvent.pointerId;
    dragStartX = pointerEvent.clientX;
    dragStartY = pointerEvent.clientY;
    dragGazeX = gazeX;
    dragGazeY = gazeY;
  }, { capture: true });

  window.addEventListener('pointermove', pointerEvent => {
    if (root.dataset.view !== 'atlas' || !motionAllowed()) return;
    const dragging = pointerEvent.pointerId === dragPointer;
    if (immersive) {
      if (pointerEvent.pointerType === 'touch' && !dragging) return;
      if (dragging) {
        gazeX = Math.max(-1, Math.min(1, dragGazeX + (pointerEvent.clientX - dragStartX) / innerWidth * 2));
        gazeY = Math.max(-1, Math.min(1, dragGazeY - (pointerEvent.clientY - dragStartY) / innerHeight * 2));
      } else {
        gazeX = pointerEvent.clientX / innerWidth * 2 - 1;
        gazeY = 1 - pointerEvent.clientY / innerHeight * 2;
      }
      dispatchOptics(false);
      pointerEvent.stopImmediatePropagation();
    } else if (pointerEvent.pointerType === 'touch') {
      if (!dragging || Math.hypot(pointerEvent.clientX - dragStartX, pointerEvent.clientY - dragStartY) < 6) return;
      gazeX = Math.max(-1, Math.min(1, (pointerEvent.clientX - dragStartX) / innerWidth));
      gazeY = Math.max(-1, Math.min(1, -(pointerEvent.clientY - dragStartY) / innerHeight));
      dispatchOptics(false);
    } else {
      gazeX = pointerEvent.clientX / innerWidth * 2 - 1;
      gazeY = 1 - pointerEvent.clientY / innerHeight * 2;
    }
    updateMaterialPerspective();
  }, { capture: true, passive: true });

  function finishDrag(pointerEvent) {
    if (pointerEvent.pointerId !== dragPointer) return;
    dragPointer = null;
    if (immersive) pointerEvent.stopImmediatePropagation();
  }
  window.addEventListener('pointerup', finishDrag, true);
  window.addEventListener('pointercancel', finishDrag, true);
  window.addEventListener('wheel', wheelEvent => {
    if (!immersive || !viewport.contains(wheelEvent.target)) return;
    wheelEvent.preventDefault();
    wheelEvent.stopImmediatePropagation();
    if (!motionAllowed()) return;
    depth.value = String(Math.round(Math.max(80, Math.min(125, Number(depth.value) - wheelEvent.deltaY * 0.025))));
    dispatchOptics(false);
  }, { capture: true, passive: false });

  window.addEventListener('keydown', keyboardEvent => {
    if (!immersive) return;
    if (keyboardEvent.key === 'Escape') {
      keyboardEvent.preventDefault();
      keyboardEvent.stopImmediatePropagation();
      setImmersive(false, true);
      return;
    }
    if (keyboardEvent.key === 'Tab') {
      const focusable = Array.from(panel.querySelectorAll('button, input')).filter(element => !element.disabled && element.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (keyboardEvent.shiftKey && document.activeElement === first) { keyboardEvent.preventDefault(); last.focus(); }
      if (!keyboardEvent.shiftKey && document.activeElement === last) { keyboardEvent.preventDefault(); first.focus(); }
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(keyboardEvent.key)) {
      keyboardEvent.stopImmediatePropagation();
      if (keyboardEvent.target === depth) return;
      keyboardEvent.preventDefault();
      if (!motionAllowed()) return;
      gazeX = Math.max(-1, Math.min(1, gazeX + (keyboardEvent.key === 'ArrowRight' ? 0.12 : keyboardEvent.key === 'ArrowLeft' ? -0.12 : 0)));
      gazeY = Math.max(-1, Math.min(1, gazeY + (keyboardEvent.key === 'ArrowUp' ? 0.12 : keyboardEvent.key === 'ArrowDown' ? -0.12 : 0)));
      dispatchOptics(false);
      updateMaterialPerspective();
    }
    if (['+', '=', '-', '0', 'Home'].includes(keyboardEvent.key) && keyboardEvent.target !== depth) {
      keyboardEvent.preventDefault();
      keyboardEvent.stopImmediatePropagation();
      if (!motionAllowed()) return;
      if (keyboardEvent.key === '0' || keyboardEvent.key === 'Home') {
        gazeX = 0;
        gazeY = 0;
        depth.value = '100';
        dispatchOptics(true);
        updateMaterialPerspective();
      } else {
        depth.value = String(Math.max(80, Math.min(125, Number(depth.value) + (keyboardEvent.key === '-' ? -5 : 5))));
        dispatchOptics(false);
      }
    }
  }, true);

  new MutationObserver(synchronize).observe(root, { attributes: true, attributeFilter: ['class', 'data-view', 'data-motion'] });
  document.addEventListener('visibilitychange', synchronize);
  reducedMotion.addEventListener('change', synchronize);
  coarsePointer.addEventListener('change', synchronize);
  synchronize();
}());
