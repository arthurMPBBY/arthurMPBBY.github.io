(function () {
  'use strict';

  const EMAIL_ADDRESS = 'arthurkadri968@gmail.com';
  const copyButtons = document.querySelectorAll('[data-copy-email]');
  const liveStatus = document.getElementById('email-live-status');
  const copyTimeoutMap = new WeakMap();
  let statusTimeoutId = null;

  function announceStatus(message, isError = false) {
    if (!liveStatus) return;
    if (statusTimeoutId) clearTimeout(statusTimeoutId);

    liveStatus.textContent = message;
    liveStatus.classList.toggle('error', isError);

    statusTimeoutId = setTimeout(function () {
      liveStatus.textContent = '';
      liveStatus.classList.remove('error');
    }, 4000);
  }

  async function handleCopyEmail(clickEvent) {
    clickEvent.preventDefault();
    const actionButton = clickEvent.currentTarget;
    let copiedSuccessfully = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(EMAIL_ADDRESS);
        copiedSuccessfully = true;
      } catch (clipboardError) {
        copiedSuccessfully = false;
      }
    }

    if (!copiedSuccessfully) {
      try {
        const textareaElement = document.createElement('textarea');
        textareaElement.value = EMAIL_ADDRESS;
        textareaElement.setAttribute('readonly', '');
        textareaElement.style.position = 'absolute';
        textareaElement.style.left = '-9999px';
        document.body.appendChild(textareaElement);
        textareaElement.select();
        copiedSuccessfully = document.execCommand('copy');
        document.body.removeChild(textareaElement);
      } catch (fallbackError) {
        copiedSuccessfully = false;
      }
    }

    if (copiedSuccessfully) {
      announceStatus('E-mail arthurkadri968@gmail.com copiado para a \u00e1rea de transfer\u00eancia!');

      if (!actionButton.hasAttribute('data-original-label')) {
        actionButton.setAttribute('data-original-label', actionButton.innerHTML);
      }
      const originalMarkup = actionButton.getAttribute('data-original-label');

      if (copyTimeoutMap.has(actionButton)) {
        clearTimeout(copyTimeoutMap.get(actionButton));
      }

      actionButton.innerHTML = '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"14\" height=\"14\" aria-hidden=\"true\"><polyline points=\"20 6 9 17 4 12\"></polyline></svg><span>Copiado!</span>';

      const timeoutId = setTimeout(function () {
        actionButton.innerHTML = originalMarkup;
        actionButton.removeAttribute('data-original-label');
        copyTimeoutMap.delete(actionButton);
      }, 2500);

      copyTimeoutMap.set(actionButton, timeoutId);
    } else {
      announceStatus('N\u00e3o foi poss\u00edvel copiar automaticamente. Endere\u00e7o: ' + EMAIL_ADDRESS, true);
    }
  }

  copyButtons.forEach(function (buttonItem) {
    buttonItem.addEventListener('click', handleCopyEmail);
  });

  const internalNavLinks = document.querySelectorAll('a[href^=\"#\"]');
  internalNavLinks.forEach(function (linkElement) {
    linkElement.addEventListener('click', function () {
      const targetIdentifier = this.getAttribute('href');
      if (targetIdentifier && targetIdentifier !== '#') {
        const targetElement = document.querySelector(targetIdentifier);
        if (targetElement) {
          targetElement.setAttribute('tabindex', '-1');
          targetElement.focus({ preventScroll: true });
        }
      }
    });
  });

  document.documentElement.classList.add('js-ready');

  const STORAGE_KEY = 'arthur_portfolio_motion';
  const motionToggleButton = document.getElementById('motion-toggle-btn');
  const motionToggleText = motionToggleButton ? motionToggleButton.querySelector('.motion-btn-text') : null;
  const motionLiveStatus = document.getElementById('motion-live-status');

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia('(pointer: fine)');

  let isEffectsPaused = false;
  let savedPreference = null;
  let isViewBrief = document.documentElement.getAttribute('data-view') === 'brief';

  try {
    savedPreference = localStorage.getItem(STORAGE_KEY);
  } catch (storageError) {
    savedPreference = null;
  }

  if (savedPreference === 'paused') {
    isEffectsPaused = true;
  } else if (savedPreference === 'active') {
    isEffectsPaused = false;
  } else {
    isEffectsPaused = reducedMotionQuery.matches;
  }

  const artContainer = document.querySelector('.hero-art-container');
  let cloudMorph = typeof window.createCloudMorph === 'function' && artContainer ? window.createCloudMorph(artContainer) : null;
  let morphProgress = 0;
  let morphFrameId = null;
  let needsMorphMeasure = true;
  let morphStart = 0;
  let morphDistance = 1;
  let isArtIntersecting = true;

  function clampUnit(value) {
    return Math.max(0, Math.min(1, value));
  }

  function cancelMorphFrame() {
    if (morphFrameId !== null) {
      cancelAnimationFrame(morphFrameId);
      morphFrameId = null;
    }
  }

  function restoreSculpture() {
    morphProgress = 0;
    if (artContainer) {
      artContainer.setAttribute('data-morph-progress', '0');
    }
    if (cloudMorph && typeof cloudMorph.draw === 'function') {
      cloudMorph.draw(0);
    }
  }

  function renderMorphFrame() {
    morphFrameId = null;
    if (isViewBrief || document.documentElement.getAttribute('data-view') === 'brief') return;
    if (!cloudMorph || isEffectsPaused || document.hidden || !isArtIntersecting) return;

    try {
      if (needsMorphMeasure && artContainer) {
        const rectangle = artContainer.getBoundingClientRect();
        if (rectangle.width === 0 || rectangle.height === 0) {
          return;
        }
        morphStart = Math.max(0, rectangle.top + window.scrollY - window.innerHeight * 0.7);
        morphDistance = Math.max(180, Math.min(360, window.innerHeight * 0.45));
        if (typeof cloudMorph.resize === 'function') {
          cloudMorph.resize();
        }
        needsMorphMeasure = false;
      }

      morphProgress = clampUnit((window.scrollY - morphStart) / morphDistance);
      if (artContainer) {
        artContainer.setAttribute('data-morph-progress', morphProgress.toFixed(4));
      }
      if (typeof cloudMorph.draw === 'function') {
        cloudMorph.draw(morphProgress);
      }
    } catch (morphError) {
      if (cloudMorph && typeof cloudMorph.destroy === 'function') {
        cloudMorph.destroy();
      }
      cloudMorph = null;
      if (artContainer) {
        artContainer.classList.remove('morph-ready');
      }
      restoreSculpture();
    }
  }

  function scheduleMorphFrame(shouldMeasure = false) {
    if (isViewBrief || document.documentElement.getAttribute('data-view') === 'brief') return;
    if (shouldMeasure) needsMorphMeasure = true;
    if (!cloudMorph || isEffectsPaused || document.hidden || !isArtIntersecting || morphFrameId !== null) return;
    morphFrameId = requestAnimationFrame(renderMorphFrame);
  }

  function applyMotionState(shouldPause, shouldSaveToStorage) {
    isEffectsPaused = shouldPause;

    if (shouldPause) {
      document.documentElement.setAttribute('data-motion', 'paused');
      cancelMorphFrame();
      restoreSculpture();
    } else {
      document.documentElement.setAttribute('data-motion', 'active');
      scheduleMorphFrame(true);
    }

    if (motionToggleButton) {
      motionToggleButton.setAttribute('aria-pressed', shouldPause ? 'true' : 'false');
      motionToggleButton.setAttribute('aria-label', shouldPause ? 'Ativar anima\u00e7\u00f5es decorativas' : 'Pausar anima\u00e7\u00f5es decorativas');
      if (motionToggleText) {
        motionToggleText.textContent = shouldPause ? 'Ativar anima\u00e7\u00f5es' : 'Pausar anima\u00e7\u00f5es';
      }
    }

    if (motionLiveStatus) {
      motionLiveStatus.textContent = shouldPause ? 'Anima\u00e7\u00f5es pausadas' : 'Anima\u00e7\u00f5es ativadas';
    }

    if (shouldSaveToStorage) {
      savedPreference = shouldPause ? 'paused' : 'active';
      try {
        localStorage.setItem(STORAGE_KEY, savedPreference);
      } catch (storageError) {
        void storageError;
      }
    }

    window.dispatchEvent(new CustomEvent('portfolio:motionchange', {
      detail: {
        paused: shouldPause
      }
    }));
  }

  applyMotionState(isEffectsPaused, false);

  window.addEventListener('portfolio:viewchange', function (viewEvent) {
    isViewBrief = Boolean(viewEvent.detail && viewEvent.detail.mode === 'brief');
    if (isViewBrief) {
      cancelMorphFrame();
      restoreSculpture();
    } else {
      needsMorphMeasure = true;
      scheduleMorphFrame(true);
    }
  });

  window.addEventListener('portfolio:layoutchange', function () {
    if (isViewBrief || document.documentElement.getAttribute('data-view') === 'brief') {
      return;
    }
    scheduleMorphFrame(true);
  });

  if (motionToggleButton) {
    motionToggleButton.addEventListener('click', function () {
      applyMotionState(!isEffectsPaused, true);
    });
  }

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', function (motionQueryEvent) {
      if (savedPreference === null) {
        applyMotionState(motionQueryEvent.matches, false);
      }
    });
  }

  document.addEventListener('visibilitychange', function () {
    document.documentElement.toggleAttribute('data-page-hidden', document.hidden);
    if (document.hidden || isViewBrief) {
      cancelMorphFrame();
    } else {
      scheduleMorphFrame(true);
    }
  });

  if (cloudMorph && artContainer) {
    artContainer.classList.add('morph-ready');
    window.addEventListener('scroll', function () {
      if (isViewBrief || document.documentElement.getAttribute('data-view') === 'brief') return;
      scheduleMorphFrame();
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (isViewBrief || document.documentElement.getAttribute('data-view') === 'brief') return;
      scheduleMorphFrame(true);
    }, { passive: true });
    window.addEventListener('pageshow', function () {
      if (isViewBrief || document.documentElement.getAttribute('data-view') === 'brief') return;
      scheduleMorphFrame(true);
    });

    if (typeof window.ResizeObserver === 'function') {
      const morphResizeObserver = new ResizeObserver(function () {
        if (isViewBrief || document.documentElement.getAttribute('data-view') === 'brief') return;
        scheduleMorphFrame(true);
      });
      morphResizeObserver.observe(artContainer);
    }

    if (typeof window.IntersectionObserver === 'function') {
      const artObserver = new IntersectionObserver(function (artEntries) {
        artEntries.forEach(function (artEntry) {
          isArtIntersecting = artEntry.isIntersecting;
          artContainer.setAttribute('data-effects-visible', String(isArtIntersecting));
          if (isArtIntersecting) {
            scheduleMorphFrame(true);
          } else {
            cancelMorphFrame();
          }
        });
      });
      artObserver.observe(artContainer);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (isViewBrief || document.documentElement.getAttribute('data-view') === 'brief') return;
        scheduleMorphFrame(true);
      });
    }
    scheduleMorphFrame(true);
  }

  function initializeEntranceAnimation() {
    const introOverlay = document.getElementById('intro-overlay');
    const introCanvas = document.getElementById('intro-canvas');
    const introSkipButton = document.getElementById('intro-skip-btn');

    if (!introOverlay || !introCanvas) return;

    let hasIntroSeen = false;
    try {
      hasIntroSeen = sessionStorage.getItem('arthur_intro_seen') === 'true';
    } catch (storageException) {
      hasIntroSeen = false;
    }

    if (hasIntroSeen || isEffectsPaused || reducedMotionQuery.matches || isViewBrief) {
      introOverlay.setAttribute('hidden', '');
      introOverlay.classList.add('intro-dismissed');
      introOverlay.style.display = 'none';
      if (introSkipButton) {
        introSkipButton.setAttribute('tabindex', '-1');
      }
      return;
    }

    let canvasContext = null;
    try {
      canvasContext = introCanvas.getContext('2d');
    } catch (contextError) {
      canvasContext = null;
    }

    if (!canvasContext) {
      introOverlay.setAttribute('hidden', '');
      introOverlay.classList.add('intro-dismissed');
      introOverlay.style.display = 'none';
      if (introSkipButton) {
        introSkipButton.setAttribute('tabindex', '-1');
      }
      return;
    }

    let isIntroDismissed = false;
    let animationFrameId = null;
    let animationStartTime = null;
    const animationTotalDuration = 1600;
    const totalBarsCount = 42;

    let cachedDeviceRatio = 1;
    let cachedViewportWidth = 0;
    let cachedViewportHeight = 0;
    let cachedBarPitch = 0;
    let cachedCenterY = 0;
    let cachedIsDesktopLayout = true;
    let cachedBaseTitleSize = 64;
    let cachedSubFontSize = 12;
    let cachedLeftMargin = 48;
    let cachedRightMargin = 800;
    let cachedTopBaseline = 0;
    let cachedBottomBaseline = 0;

    function measureLayout() {
      cachedDeviceRatio = Math.min(window.devicePixelRatio || 1, 2);
      cachedViewportWidth = window.innerWidth;
      cachedViewportHeight = window.innerHeight;

      introCanvas.width = Math.round(cachedViewportWidth * cachedDeviceRatio);
      introCanvas.height = Math.round(cachedViewportHeight * cachedDeviceRatio);
      introCanvas.style.width = cachedViewportWidth + 'px';
      introCanvas.style.height = cachedViewportHeight + 'px';

      cachedBarPitch = cachedViewportWidth / totalBarsCount;
      cachedCenterY = cachedViewportHeight * 0.48;

      cachedIsDesktopLayout = cachedViewportWidth >= 768;
      cachedBaseTitleSize = cachedIsDesktopLayout
        ? Math.max(54, Math.min(115, cachedViewportWidth * 0.08))
        : Math.max(42, Math.min(68, cachedViewportWidth * 0.12));
      cachedSubFontSize = Math.max(11, Math.min(13, cachedViewportWidth * 0.012));

      if (cachedIsDesktopLayout) {
        cachedLeftMargin = Math.max(48, cachedViewportWidth * 0.08);
        cachedRightMargin = cachedViewportWidth - cachedLeftMargin;
        cachedTopBaseline = cachedCenterY - cachedBaseTitleSize * 0.25;
        cachedBottomBaseline = cachedCenterY + cachedBaseTitleSize * 0.75;
      }
    }

    function cleanupAllIntroListeners() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      introOverlay.removeEventListener('focusout', handleOverlayFocusOut);
      if (introSkipButton) {
        introSkipButton.removeEventListener('click', dismissIntro);
      }
      window.removeEventListener('portfolio:motionchange', handleMotionChange);
      window.removeEventListener('portfolio:viewchange', handleViewChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (typeof reducedMotionQuery.removeEventListener === 'function') {
        reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      } else if (typeof reducedMotionQuery.removeListener === 'function') {
        reducedMotionQuery.removeListener(handleReducedMotionChange);
      }
    }

    function dismissIntro() {
      if (isIntroDismissed) return;
      isIntroDismissed = true;

      clearTimeout(failsafeTimerId);

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      try {
        sessionStorage.setItem('arthur_intro_seen', 'true');
      } catch (storageException) {
        void storageException;
      }

      const wasSkipFocused = document.activeElement === introSkipButton || (introOverlay && introOverlay.contains(document.activeElement));

      cleanupAllIntroListeners();

      if (introSkipButton) {
        introSkipButton.setAttribute('tabindex', '-1');
      }

      introOverlay.classList.add('intro-dismissed');

      if (wasSkipFocused) {
        const focusTarget = document.getElementById('hero') || document.getElementById('main-content') || document.querySelector('h1');
        if (focusTarget) {
          if (!focusTarget.hasAttribute('tabindex')) {
            focusTarget.setAttribute('tabindex', '-1');
          }
          try {
            focusTarget.focus({ preventScroll: true });
          } catch (focusException) {
            focusTarget.focus();
          }
        }
      }

      setTimeout(function () {
        introOverlay.setAttribute('hidden', '');
        introOverlay.style.display = 'none';
      }, 320);
    }

    function handleKeyDown(keyboardEvent) {
      if (keyboardEvent.key === 'Escape' || keyboardEvent.key === 'Esc' || keyboardEvent.key === 'Tab') {
        dismissIntro();
      }
    }

    function handleOverlayFocusOut(focusEvent) {
      if (isIntroDismissed) return;
      if (focusEvent.relatedTarget && !introOverlay.contains(focusEvent.relatedTarget)) {
        dismissIntro();
      }
    }

    function handleResize() {
      measureLayout();
    }

    function handleMotionChange(motionEvent) {
      if (motionEvent.detail && motionEvent.detail.paused) {
        dismissIntro();
      }
    }

    function handleViewChange(viewEvent) {
      if (viewEvent.detail && viewEvent.detail.mode === 'brief') {
        dismissIntro();
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        dismissIntro();
      }
    }

    function handleReducedMotionChange(queryEvent) {
      if (queryEvent.matches) {
        dismissIntro();
      }
    }

    if (introSkipButton) {
      introSkipButton.addEventListener('click', dismissIntro);
    }
    window.addEventListener('keydown', handleKeyDown);
    introOverlay.addEventListener('focusout', handleOverlayFocusOut);
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('portfolio:motionchange', handleMotionChange);
    window.addEventListener('portfolio:viewchange', handleViewChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    } else if (typeof reducedMotionQuery.addListener === 'function') {
      reducedMotionQuery.addListener(handleReducedMotionChange);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!isIntroDismissed) measureLayout();
      });
    }

    const failsafeTimerId = setTimeout(dismissIntro, 2150);
    const wallClockStart = performance.now();

    measureLayout();

    function renderIntroFrame(timestamp) {
      if (isIntroDismissed) return;

      if (performance.now() - wallClockStart >= 2100) {
        dismissIntro();
        return;
      }

      if (!animationStartTime) animationStartTime = timestamp;
      const elapsedTime = timestamp - animationStartTime;
      const progressRatio = Math.min(1, elapsedTime / animationTotalDuration);

      canvasContext.setTransform(1, 0, 0, 1, 0, 0);
      canvasContext.clearRect(0, 0, introCanvas.width, introCanvas.height);
      canvasContext.setTransform(cachedDeviceRatio, 0, 0, cachedDeviceRatio, 0, 0);
      canvasContext.fillStyle = '#fafaf9';
      canvasContext.fillRect(0, 0, cachedViewportWidth, cachedViewportHeight);

      const peakHeight = cachedIsDesktopLayout ? 130 : 85;
      const restHeight = 6;

      for (let barIndex = 0; barIndex < totalBarsCount; barIndex += 1) {
        const normalizedBarIndex = barIndex / (totalBarsCount - 1);
        const sweepDelay = normalizedBarIndex * 0.32;
        const barGrowthPhase = Math.max(0, Math.min(1, (progressRatio - sweepDelay) / 0.32));
        const smoothGrowth = barGrowthPhase * barGrowthPhase * (3 - 2 * barGrowthPhase);

        const decayPhase = Math.max(0, Math.min(1, (progressRatio - 0.62) / 0.36));
        const smoothDecay = 1 - decayPhase * decayPhase * (3 - 2 * decayPhase);

        const barEnvelope = smoothGrowth * smoothDecay;
        if (barEnvelope > 0.001) {
          const waveHarmonic = Math.sin(normalizedBarIndex * Math.PI * 3 + progressRatio * Math.PI * 2) * 6;
          const barHeight = restHeight + barEnvelope * (peakHeight - restHeight + waveHarmonic);
          const barHorizontal = barIndex * cachedBarPitch;
          const barTop = cachedCenterY - barHeight / 2;
          const barWidth = Math.max(1.5, Math.min(2.4, cachedBarPitch * 0.18));
          const barAlpha = barEnvelope * 0.72;

          if (barIndex % 7 === 0) {
            canvasContext.fillStyle = 'rgba(193, 107, 89, ' + (barAlpha * 0.88).toFixed(3) + ')';
          } else {
            canvasContext.fillStyle = 'rgba(27, 28, 27, ' + (barAlpha * 0.75).toFixed(3) + ')';
          }
          canvasContext.fillRect(barHorizontal, barTop, barWidth, barHeight);
        }
      }

      if (progressRatio > 0.20) {
        const textProgress = Math.min(1, (progressRatio - 0.20) / 0.35);
        const easeOutText = 1 - Math.pow(1 - textProgress, 3);
        const textOpacity = easeOutText;

        canvasContext.save();

        if (cachedIsDesktopLayout) {
          canvasContext.font = '800 ' + Math.round(cachedBaseTitleSize) + 'px "Plus Jakarta Sans", system-ui, sans-serif';
          canvasContext.fillStyle = 'rgba(27, 28, 27, ' + textOpacity.toFixed(3) + ')';

          canvasContext.textAlign = 'left';
          canvasContext.textBaseline = 'alphabetic';
          canvasContext.fillText('Arthur', cachedLeftMargin, cachedTopBaseline);

          canvasContext.textAlign = 'right';
          canvasContext.fillText('Kadri.', cachedRightMargin, cachedBottomBaseline);

          canvasContext.font = '600 ' + Math.round(cachedSubFontSize) + 'px "JetBrains Mono", monospace';
          canvasContext.fillStyle = 'rgba(193, 107, 89, ' + (textOpacity * 0.95).toFixed(3) + ')';
          canvasContext.textAlign = 'left';
          canvasContext.fillText('UFABC \u00b7 2\u00ba PER\u00cdODO', cachedLeftMargin, cachedTopBaseline - cachedBaseTitleSize * 0.9);

          canvasContext.font = '500 ' + Math.round(cachedSubFontSize * 0.95) + 'px "DM Sans", system-ui, sans-serif';
          canvasContext.fillStyle = 'rgba(78, 83, 80, ' + (textOpacity * 0.85).toFixed(3) + ')';
          canvasContext.textAlign = 'right';
          canvasContext.fillText('PROGRAMA\u00c7\u00c3O PR\u00c1TICA \u00b7 DADOS & MERCADO FINANCEIRO', cachedRightMargin, cachedBottomBaseline + cachedBaseTitleSize * 0.35);
        } else {
          canvasContext.textAlign = 'center';
          canvasContext.textBaseline = 'middle';

          canvasContext.font = '800 ' + Math.round(cachedBaseTitleSize) + 'px "Plus Jakarta Sans", system-ui, sans-serif';
          canvasContext.fillStyle = 'rgba(27, 28, 27, ' + textOpacity.toFixed(3) + ')';
          canvasContext.fillText('Arthur Kadri.', cachedViewportWidth / 2, cachedCenterY - cachedBaseTitleSize * 0.3);

          canvasContext.font = '600 ' + Math.round(cachedSubFontSize) + 'px "JetBrains Mono", monospace';
          canvasContext.fillStyle = 'rgba(193, 107, 89, ' + (textOpacity * 0.95).toFixed(3) + ')';
          canvasContext.fillText('UFABC \u00b7 2\u00ba PER\u00cdODO', cachedViewportWidth / 2, cachedCenterY + cachedBaseTitleSize * 0.45);

          canvasContext.font = '500 ' + Math.round(cachedSubFontSize * 0.95) + 'px "DM Sans", system-ui, sans-serif';
          canvasContext.fillStyle = 'rgba(78, 83, 80, ' + (textOpacity * 0.85).toFixed(3) + ')';
          canvasContext.fillText('PROGRAMA\u00c7\u00c3O \u00b7 DADOS & FINAN\u00c7AS', cachedViewportWidth / 2, cachedCenterY + cachedBaseTitleSize * 0.8);
        }

        canvasContext.restore();
      }

      if (progressRatio >= 1) {
        dismissIntro();
        return;
      }

      if (!isIntroDismissed) {
        animationFrameId = requestAnimationFrame(renderIntroFrame);
      }
    }

    try {
      renderIntroFrame(performance.now());
      introOverlay.removeAttribute('hidden');
    } catch (startupError) {
      dismissIntro();
      introOverlay.setAttribute('hidden', '');
      introOverlay.classList.add('intro-dismissed');
      introOverlay.style.display = 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEntranceAnimation);
  } else {
    initializeEntranceAnimation();
  }
})();
