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
      announceStatus('E-mail arthurkadri968@gmail.com copiado para a área de transferência!');

      if (!actionButton.hasAttribute('data-original-label')) {
        actionButton.setAttribute('data-original-label', actionButton.innerHTML);
      }
      const originalMarkup = actionButton.getAttribute('data-original-label');

      if (copyTimeoutMap.has(actionButton)) {
        clearTimeout(copyTimeoutMap.get(actionButton));
      }

      actionButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <polyline points="20 6 9 17 4 12">
        </polyline></svg>
        <span>Copiado!</span>
      `;

      const timeoutId = setTimeout(function () {
        actionButton.innerHTML = originalMarkup;
        actionButton.removeAttribute('data-original-label');
        copyTimeoutMap.delete(actionButton);
      }, 2500);

      copyTimeoutMap.set(actionButton, timeoutId);
    } else {
      announceStatus('Não foi possível copiar automaticamente. Endereço: ' + EMAIL_ADDRESS, true);
    }
  }

  copyButtons.forEach(function (buttonItem) {
    buttonItem.addEventListener('click', handleCopyEmail);
  });

  const internalNavLinks = document.querySelectorAll('a[href^="#"]');
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
  const motionToggleText = motionToggleButton ? motionToggleButton.querySelector('.motion-toggle-text') : null;
  const motionLiveStatus = document.getElementById('motion-live-status');

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia('(pointer: fine)');

  let isEffectsPaused = false;
  let savedPreference = null;

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

  const heroSection = document.getElementById('hero');
  const sculptureStage = document.querySelector('.art-svg-stage');
  const layerCorona = document.querySelector('.layer-corona');
  const layerRibbonsOuter = document.querySelector('.layer-ribbons-outer');
  const layerRibbonsTertiary = document.querySelector('.layer-ribbons-tertiary');
  const layerRibbonsInner = document.querySelector('.layer-ribbons-inner');
  const layerCoreSculpture = document.querySelector('.layer-core-sculpture');
  const layerSparks = document.querySelector('.layer-sparks');
  const hazeLayer = document.querySelector('.art-haze-layer');
  const primaryCtaButton = document.querySelector('.btn-primary');
  const artContainer = document.querySelector('.hero-art-container');
  const morphCaption = document.querySelector('.morph-caption');
  let cloudMorph = typeof window.createCloudMorph === 'function' ? window.createCloudMorph(artContainer) : null;
  let morphProgress = 0;
  let morphFrameId = null;
  let needsMorphMeasure = true;
  let morphStart = 0;
  let morphDistance = 1;
  let isArtIntersecting = true;

  function clampUnit(value) {
    return Math.max(0, Math.min(1, value));
  }

  function morphPhase(start, end) {
    return clampUnit((morphProgress - start) / (end - start));
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
      artContainer.style.setProperty('--morph-core-opacity', '1');
      artContainer.style.setProperty('--morph-orbit-opacity', '1');
      artContainer.style.setProperty('--morph-haze-opacity', '1');
      artContainer.style.setProperty('--morph-caption-opacity', '0');
      artContainer.setAttribute('data-morph-progress', '0');
    }
    if (morphCaption) morphCaption.hidden = true;
    if (cloudMorph) cloudMorph.draw(0);
  }

  function renderMorphFrame() {
    morphFrameId = null;
    if (!cloudMorph || isEffectsPaused || document.hidden || !isArtIntersecting) return;

    try {
      if (needsMorphMeasure) {
        const rectangle = artContainer.getBoundingClientRect();
        morphStart = Math.max(0, rectangle.top + window.scrollY + rectangle.height - window.innerHeight * 0.8);
        morphDistance = Math.max(160, Math.min(280, window.innerHeight * 0.3));
        cloudMorph.resize();
        needsMorphMeasure = false;
      }

      morphProgress = clampUnit((window.scrollY - morphStart) / morphDistance);
      artContainer.style.setProperty('--morph-core-opacity', String(1 - morphPhase(0.15, 0.45)));
      artContainer.style.setProperty('--morph-orbit-opacity', String(1 - morphPhase(0.35, 0.8)));
      artContainer.style.setProperty('--morph-haze-opacity', String(1 - morphPhase(0.35, 0.8) * 0.8));
      artContainer.style.setProperty('--morph-caption-opacity', String(morphPhase(0.8, 1)));
      artContainer.setAttribute('data-morph-progress', morphProgress.toFixed(4));
      if (morphCaption) morphCaption.hidden = morphProgress <= 0.8;
      cloudMorph.draw(morphProgress);
      applyParallaxTransforms();
    } catch (morphError) {
      cloudMorph.destroy();
      cloudMorph = null;
      artContainer.classList.remove('morph-ready');
      restoreSculpture();
    }
  }

  function scheduleMorphFrame(shouldMeasure = false) {
    if (shouldMeasure) needsMorphMeasure = true;
    if (!cloudMorph || isEffectsPaused || document.hidden || !isArtIntersecting || morphFrameId !== null) return;
    morphFrameId = requestAnimationFrame(renderMorphFrame);
  }

  let isHeroIntersecting = true;
  let isPointerInsideHero = false;
  let targetRotateX = 0;
  let targetRotateY = 0;
  let currentRotateX = 0;
  let currentRotateY = 0;
  let animationFrameId = null;

  function resetHeroTransforms() {
    if (sculptureStage) sculptureStage.style.transform = '';
    if (layerCorona) layerCorona.style.transform = '';
    if (layerRibbonsOuter) layerRibbonsOuter.style.transform = '';
    if (layerRibbonsTertiary) layerRibbonsTertiary.style.transform = '';
    if (layerRibbonsInner) layerRibbonsInner.style.transform = '';
    if (layerCoreSculpture) layerCoreSculpture.style.transform = '';
    if (layerSparks) layerSparks.style.transform = '';
    if (hazeLayer) hazeLayer.style.transform = '';
  }

  function stopParallaxLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function updateParallaxFrame() {
    currentRotateX += (targetRotateX - currentRotateX) * 0.08;
    currentRotateY += (targetRotateY - currentRotateY) * 0.08;

    applyParallaxTransforms();

    const differenceX = Math.abs(targetRotateX - currentRotateX);
    const differenceY = Math.abs(targetRotateY - currentRotateY);

    if (differenceX < 0.002 && differenceY < 0.002) {
      currentRotateX = targetRotateX;
      currentRotateY = targetRotateY;
      if (!isPointerInsideHero) {
        resetHeroTransforms();
      }
      animationFrameId = null;
      return;
    }

    animationFrameId = requestAnimationFrame(updateParallaxFrame);
  }

  function applyParallaxTransforms() {
    const parallaxWeight = 1 - clampUnit(morphProgress / 0.15);
    const renderedRotateX = currentRotateX * parallaxWeight;
    const renderedRotateY = currentRotateY * parallaxWeight;

    if (sculptureStage) {
      sculptureStage.style.transform = 'perspective(900px) rotateX(' + renderedRotateX.toFixed(3) + 'deg) rotateY(' + renderedRotateY.toFixed(3) + 'deg)';
    }
    if (layerRibbonsOuter) {
      layerRibbonsOuter.style.transform = 'translate3d(' + (renderedRotateY * 1.1).toFixed(2) + 'px, ' + (-renderedRotateX * 1.1).toFixed(2) + 'px, 0)';
    }
    if (layerRibbonsTertiary) {
      layerRibbonsTertiary.style.transform = 'translate3d(' + (renderedRotateY * -0.6).toFixed(2) + 'px, ' + (renderedRotateX * 0.6).toFixed(2) + 'px, 0)';
    }
    if (layerRibbonsInner) {
      layerRibbonsInner.style.transform = 'translate3d(' + (renderedRotateY * -0.9).toFixed(2) + 'px, ' + (renderedRotateX * 0.9).toFixed(2) + 'px, 0)';
    }
    if (layerCoreSculpture) {
      layerCoreSculpture.style.transform = 'translate3d(' + (renderedRotateY * 0.6).toFixed(2) + 'px, ' + (-renderedRotateX * 0.6).toFixed(2) + 'px, 0)';
    }
    if (layerSparks) {
      layerSparks.style.transform = 'translate3d(' + (renderedRotateY * 1.4).toFixed(2) + 'px, ' + (-renderedRotateX * 1.4).toFixed(2) + 'px, 0)';
    }
    if (hazeLayer) {
      hazeLayer.style.transform = 'translate3d(' + (renderedRotateY * -0.45).toFixed(2) + 'px, ' + (renderedRotateX * 0.45).toFixed(2) + 'px, 0)';
    }
  }

  function scheduleParallaxUpdate() {
    if (isEffectsPaused || !isHeroIntersecting || !isArtIntersecting || document.hidden || !finePointerQuery.matches) {
      return;
    }
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(updateParallaxFrame);
    }
  }

  function applyMotionState(shouldPause, shouldSaveToStorage) {
    isEffectsPaused = shouldPause;

    if (shouldPause) {
      document.documentElement.setAttribute('data-motion', 'paused');
      stopParallaxLoop();
      cancelMorphFrame();
      restoreSculpture();
      resetHeroTransforms();
      targetRotateX = 0;
      targetRotateY = 0;
      currentRotateX = 0;
      currentRotateY = 0;
      if (primaryCtaButton) primaryCtaButton.style.transform = '';
    } else {
      document.documentElement.setAttribute('data-motion', 'active');
      scheduleMorphFrame(true);
    }

    if (motionToggleButton) {
      motionToggleButton.setAttribute('aria-pressed', shouldPause ? 'true' : 'false');
      motionToggleButton.setAttribute('aria-label', shouldPause ? 'Ativar efeitos visuais' : 'Pausar efeitos visuais');
      if (motionToggleText) {
        motionToggleText.textContent = shouldPause ? 'Ativar efeitos' : 'Pausar efeitos';
      }
    }

    if (motionLiveStatus) {
      motionLiveStatus.textContent = shouldPause ? 'Efeitos visuais pausados' : 'Efeitos visuais ativados';
    }

    if (shouldSaveToStorage) {
      savedPreference = shouldPause ? 'paused' : 'active';
      try {
        localStorage.setItem(STORAGE_KEY, savedPreference);
      } catch (storageError) {
        void storageError;
      }
    }
  }

  applyMotionState(isEffectsPaused, false);

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

  if (heroSection) {
    heroSection.addEventListener('pointermove', function (pointerEvent) {
      if (!finePointerQuery.matches || isEffectsPaused) return;
      const boundingRectangle = heroSection.getBoundingClientRect();
      const normalizedPointerX = ((pointerEvent.clientX - boundingRectangle.left) / boundingRectangle.width) * 2 - 1;
      const normalizedPointerY = ((pointerEvent.clientY - boundingRectangle.top) / boundingRectangle.height) * 2 - 1;

      targetRotateY = Math.max(-1, Math.min(1, normalizedPointerX)) * 7.5;
      targetRotateX = -Math.max(-1, Math.min(1, normalizedPointerY)) * 7.5;
      isPointerInsideHero = true;

      scheduleParallaxUpdate();
    });

    heroSection.addEventListener('pointerleave', function () {
      isPointerInsideHero = false;
      targetRotateX = 0;
      targetRotateY = 0;
      scheduleParallaxUpdate();
    });
  }

  document.addEventListener('visibilitychange', function () {
    document.documentElement.toggleAttribute('data-page-hidden', document.hidden);
    if (document.hidden) {
      stopParallaxLoop();
      cancelMorphFrame();
    } else {
      scheduleMorphFrame(true);
      if (isPointerInsideHero && !isEffectsPaused) scheduleParallaxUpdate();
    }
  });

  if ('IntersectionObserver' in window && heroSection) {
    const heroObserver = new IntersectionObserver(function (heroEntries) {
      heroEntries.forEach(function (heroEntry) {
        isHeroIntersecting = heroEntry.isIntersecting;
        heroSection.setAttribute('data-effects-visible', String(isHeroIntersecting));
        if (!isHeroIntersecting) {
          stopParallaxLoop();
        }
      });
    }, { threshold: 0.05 });
    heroObserver.observe(heroSection);
  }

  if (cloudMorph) {
    artContainer.classList.add('morph-ready');
    window.addEventListener('scroll', function () {
      scheduleMorphFrame();
    }, { passive: true });
    window.addEventListener('resize', function () {
      scheduleMorphFrame(true);
    }, { passive: true });
    window.addEventListener('pageshow', function () {
      scheduleMorphFrame(true);
    });

    if ('ResizeObserver' in window) {
      const morphResizeObserver = new ResizeObserver(function () {
        scheduleMorphFrame(true);
      });
      morphResizeObserver.observe(artContainer);
      if (heroSection) morphResizeObserver.observe(heroSection);
    }

    if ('IntersectionObserver' in window) {
      const artObserver = new IntersectionObserver(function (artEntries) {
        artEntries.forEach(function (artEntry) {
          isArtIntersecting = artEntry.isIntersecting;
          artContainer.setAttribute('data-effects-visible', String(isArtIntersecting));
          if (isArtIntersecting) {
            scheduleMorphFrame(true);
          } else {
            cancelMorphFrame();
            stopParallaxLoop();
          }
        });
      });
      artObserver.observe(artContainer);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        scheduleMorphFrame(true);
      });
    }
    scheduleMorphFrame(true);
  }

  if (primaryCtaButton) {
    primaryCtaButton.addEventListener('pointermove', function (pointerEvent) {
      if (!finePointerQuery.matches || isEffectsPaused) return;
      const ctaRectangle = primaryCtaButton.getBoundingClientRect();
      const centerX = ctaRectangle.left + ctaRectangle.width / 2;
      const centerY = ctaRectangle.top + ctaRectangle.height / 2;
      const offsetDeltaX = Math.max(-5, Math.min(5, (pointerEvent.clientX - centerX) * 0.16));
      const offsetDeltaY = Math.max(-5, Math.min(5, (pointerEvent.clientY - centerY) * 0.16));

      primaryCtaButton.style.transform = 'translate3d(' + offsetDeltaX.toFixed(2) + 'px, ' + offsetDeltaY.toFixed(2) + 'px, 0)';
    });

    primaryCtaButton.addEventListener('pointerleave', function () {
      primaryCtaButton.style.transform = '';
    });
  }

  const projectCards = document.querySelectorAll('.project-compact-card');
  const projectsList = document.querySelector('.projects-compact-list');

  function revealProjectCards() {
    projectCards.forEach(function (cardItem, cardIndex) {
      setTimeout(function () {
        cardItem.classList.add('is-revealed');
      }, cardIndex * 70);
    });
  }

  if ('IntersectionObserver' in window && projectsList) {
    const projectsObserver = new IntersectionObserver(function (projectEntries, observerInstance) {
      projectEntries.forEach(function (projectEntry) {
        if (projectEntry.isIntersecting) {
          revealProjectCards();
          observerInstance.unobserve(projectEntry.target);
        }
      });
    }, { threshold: 0.12 });
    projectsObserver.observe(projectsList);
  } else {
    revealProjectCards();
  }

  projectCards.forEach(function (cardItem) {
    cardItem.addEventListener('pointermove', function (pointerEvent) {
      if (!finePointerQuery.matches || isEffectsPaused) return;
      const cardRect = cardItem.getBoundingClientRect();
      const relativeCoordX = pointerEvent.clientX - cardRect.left;
      const relativeCoordY = pointerEvent.clientY - cardRect.top;

      cardItem.style.setProperty('--pointer-sheen-horizontal', relativeCoordX.toFixed(1) + 'px');
      cardItem.style.setProperty('--pointer-sheen-vertical', relativeCoordY.toFixed(1) + 'px');
    });

    cardItem.addEventListener('pointerleave', function () {
      cardItem.style.removeProperty('--pointer-sheen-horizontal');
      cardItem.style.removeProperty('--pointer-sheen-vertical');
    });
  });
})();
