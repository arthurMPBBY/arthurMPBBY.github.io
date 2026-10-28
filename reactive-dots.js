(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const GRID_SPACING = 26;
  const INFLUENCE_RADIUS = 160;
  const MAXIMUM_DISPLACEMENT = 12;
  const BLUR_SPRITE_LEVELS = 5;

  const finePointerMediaQuery = window.matchMedia('(pointer: fine)');
  const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const canvasElement = document.createElement('canvas');
  canvasElement.className = 'reactive-dots-canvas';
  canvasElement.setAttribute('aria-hidden', 'true');

  let canvasContext;
  try {
    canvasContext = canvasElement.getContext('2d', { alpha: true });
  } catch (contextError) {
    return;
  }
  if (!canvasContext) {
    return;
  }

  if (document.body.firstChild) {
    document.body.insertBefore(canvasElement, document.body.firstChild);
  } else {
    document.body.appendChild(canvasElement);
  }

  let deviceScaleRatio = 1;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let cachedScrollHorizontal = 0;
  let cachedScrollVertical = 0;

  let activePointerHorizontal = -1000;
  let activePointerVertical = -1000;
  let targetPointerHorizontal = -1000;
  let targetPointerVertical = -1000;
  let currentInfluenceFactor = 0;
  let targetInfluenceFactor = 0;

  let animationFrameIdentifier = null;
  let isPointerWithinViewport = false;
  let isMotionPausedManually = document.documentElement.getAttribute('data-motion') === 'paused';
  let isBriefViewActive = document.documentElement.getAttribute('data-view') === 'brief';
  let isDocumentHiddenState = document.hidden;

  const spriteCanvasList = [];

  function createBlurSprites() {
    spriteCanvasList.length = 0;

    for (let levelIndex = 0; levelIndex < BLUR_SPRITE_LEVELS; levelIndex += 1) {
      const spriteCanvas = document.createElement('canvas');
      const spriteDimension = Math.round((14 + levelIndex * 5) * deviceScaleRatio);
      spriteCanvas.width = spriteDimension;
      spriteCanvas.height = spriteDimension;

      const spriteContext = spriteCanvas.getContext('2d');
      if (!spriteContext) {
        continue;
      }

      const spriteCenterCoordinate = spriteDimension / 2;

      if (levelIndex === 0) {
        const dotRadius = 1.1 * deviceScaleRatio;
        spriteContext.beginPath();
        spriteContext.arc(spriteCenterCoordinate, spriteCenterCoordinate, dotRadius, 0, Math.PI * 2);
        spriteContext.fillStyle = '#dbdbd4';
        spriteContext.fill();
      } else {
        const outerBlurRadius = (1.5 + levelIndex * 1.05) * deviceScaleRatio;
        const radialGradient = spriteContext.createRadialGradient(
          spriteCenterCoordinate,
          spriteCenterCoordinate,
          0,
          spriteCenterCoordinate,
          spriteCenterCoordinate,
          outerBlurRadius
        );

        let centerColorString = 'rgba(219, 219, 212, 0.95)';
        if (levelIndex === 1) {
          centerColorString = 'rgba(215, 213, 206, 0.90)';
        } else if (levelIndex === 2) {
          centerColorString = 'rgba(208, 196, 189, 0.85)';
        } else if (levelIndex === 3) {
          centerColorString = 'rgba(201, 178, 170, 0.80)';
        } else {
          centerColorString = 'rgba(193, 160, 150, 0.75)';
        }

        radialGradient.addColorStop(0, centerColorString);
        radialGradient.addColorStop(0.45, centerColorString.replace(/[\d\.]+\)$/, '0.35)'));
        radialGradient.addColorStop(1, 'rgba(219, 219, 212, 0)');

        spriteContext.fillStyle = radialGradient;
        spriteContext.beginPath();
        spriteContext.arc(spriteCenterCoordinate, spriteCenterCoordinate, outerBlurRadius, 0, Math.PI * 2);
        spriteContext.fill();
      }

      spriteCanvasList.push({
        canvas: spriteCanvas,
        halfDimension: spriteDimension / 2
      });
    }
  }

  function resizeViewportCanvas() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    deviceScaleRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvasElement.width = Math.max(1, Math.round(viewportWidth * deviceScaleRatio));
    canvasElement.height = Math.max(1, Math.round(viewportHeight * deviceScaleRatio));
    canvasElement.style.width = viewportWidth + 'px';
    canvasElement.style.height = viewportHeight + 'px';

    createBlurSprites();
    updateScrollOffsets();
    renderDotsFrame();
  }

  function updateScrollOffsets() {
    cachedScrollHorizontal = window.scrollX || window.pageXOffset || 0;
    cachedScrollVertical = window.scrollY || window.pageYOffset || 0;
  }

  function cancelAnimationSchedule() {
    if (animationFrameIdentifier !== null) {
      cancelAnimationFrame(animationFrameIdentifier);
      animationFrameIdentifier = null;
    }
  }

  function isEffectAllowed() {
    if (isMotionPausedManually || isBriefViewActive || isDocumentHiddenState) {
      return false;
    }
    if (reducedMotionMediaQuery.matches && document.documentElement.getAttribute('data-motion') !== 'active') {
      return false;
    }
    if (!finePointerMediaQuery.matches) {
      return false;
    }
    return true;
  }

  function renderDotsFrame() {
    if (!canvasContext || spriteCanvasList.length === 0) {
      return;
    }

    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const horizontalGridOffset = GRID_SPACING / 2 - (cachedScrollHorizontal % GRID_SPACING) - GRID_SPACING;
    const verticalGridOffset = GRID_SPACING / 2 - (cachedScrollVertical % GRID_SPACING) - GRID_SPACING;

    const baseSpriteItem = spriteCanvasList[0];
    const defaultSpriteCanvas = baseSpriteItem.canvas;
    const defaultSpriteHalf = baseSpriteItem.halfDimension;

    const effectActive = isEffectAllowed() && currentInfluenceFactor > 0.001;

    for (let currentVerticalPosition = verticalGridOffset; currentVerticalPosition <= viewportHeight + GRID_SPACING; currentVerticalPosition += GRID_SPACING) {
      for (let currentHorizontalPosition = horizontalGridOffset; currentHorizontalPosition <= viewportWidth + GRID_SPACING; currentHorizontalPosition += GRID_SPACING) {
        let drawCenterHorizontal = currentHorizontalPosition;
        let drawCenterVertical = currentVerticalPosition;
        let selectedSpriteIndex = 0;

        if (effectActive) {
          const deltaFromPointerHorizontal = currentHorizontalPosition - activePointerHorizontal;
          const deltaFromPointerVertical = currentVerticalPosition - activePointerVertical;
          const distanceFromPointer = Math.hypot(deltaFromPointerHorizontal, deltaFromPointerVertical);

          if (distanceFromPointer < INFLUENCE_RADIUS && distanceFromPointer > 0.001) {
            const proximityRatio = 1 - (distanceFromPointer / INFLUENCE_RADIUS);
            const smoothStepFalloff = proximityRatio * proximityRatio * (3 - 2 * proximityRatio);
            const displacementMagnitude = smoothStepFalloff * MAXIMUM_DISPLACEMENT * currentInfluenceFactor;

            const unitDirectionHorizontal = deltaFromPointerHorizontal / distanceFromPointer;
            const unitDirectionVertical = deltaFromPointerVertical / distanceFromPointer;

            drawCenterHorizontal += unitDirectionHorizontal * displacementMagnitude;
            drawCenterVertical += unitDirectionVertical * displacementMagnitude;

            const scaledProximity = proximityRatio * currentInfluenceFactor;
            if (scaledProximity > 0.72) {
              selectedSpriteIndex = 4;
            } else if (scaledProximity > 0.48) {
              selectedSpriteIndex = 3;
            } else if (scaledProximity > 0.28) {
              selectedSpriteIndex = 2;
            } else if (scaledProximity > 0.10) {
              selectedSpriteIndex = 1;
            }
          }
        }

        const activeSpriteItem = spriteCanvasList[selectedSpriteIndex] || baseSpriteItem;
        const targetPixelHorizontal = Math.round(drawCenterHorizontal * deviceScaleRatio - activeSpriteItem.halfDimension);
        const targetPixelVertical = Math.round(drawCenterVertical * deviceScaleRatio - activeSpriteItem.halfDimension);

        canvasContext.drawImage(activeSpriteItem.canvas, targetPixelHorizontal, targetPixelVertical);
      }
    }
  }

  function advanceAnimationStep() {
    animationFrameIdentifier = null;

    if (!isEffectAllowed()) {
      currentInfluenceFactor = 0;
      targetInfluenceFactor = 0;
      renderDotsFrame();
      return;
    }

    const differenceHorizontal = targetPointerHorizontal - activePointerHorizontal;
    const differenceVertical = targetPointerVertical - activePointerVertical;
    const differenceInfluence = targetInfluenceFactor - currentInfluenceFactor;

    activePointerHorizontal += differenceHorizontal * 0.16;
    activePointerVertical += differenceVertical * 0.16;
    currentInfluenceFactor += differenceInfluence * 0.12;

    renderDotsFrame();

    const distanceDelta = Math.hypot(differenceHorizontal, differenceVertical);
    const influenceDelta = Math.abs(differenceInfluence);

    const hasConvergedToTarget = distanceDelta < 0.12 && influenceDelta < 0.003;
    const hasReturnedToRest = !isPointerWithinViewport && currentInfluenceFactor < 0.003;

    if (hasReturnedToRest) {
      currentInfluenceFactor = 0;
      renderDotsFrame();
      return;
    }

    if (hasConvergedToTarget && isPointerWithinViewport) {
      return;
    }

    animationFrameIdentifier = requestAnimationFrame(advanceAnimationStep);
  }

  function scheduleAnimation() {
    if (!isEffectAllowed() || animationFrameIdentifier !== null) {
      return;
    }
    animationFrameIdentifier = requestAnimationFrame(advanceAnimationStep);
  }

  function handlePointerMove(pointerEvent) {
    if (pointerEvent.pointerType === 'touch' || !isEffectAllowed()) {
      return;
    }

    targetPointerHorizontal = pointerEvent.clientX;
    targetPointerVertical = pointerEvent.clientY;
    targetInfluenceFactor = 1;
    isPointerWithinViewport = true;

    if (currentInfluenceFactor < 0.01) {
      activePointerHorizontal = targetPointerHorizontal;
      activePointerVertical = targetPointerVertical;
    }

    scheduleAnimation();
  }

  function handlePointerLeave() {
    isPointerWithinViewport = false;
    targetInfluenceFactor = 0;
    scheduleAnimation();
  }

  function handleScroll() {
    updateScrollOffsets();
    if (isEffectAllowed()) scheduleAnimation();
  }

  function handleResize() {
    cancelAnimationSchedule();
    resizeViewportCanvas();
  }

  function synchronizeAvailability() {
    const allowed = isEffectAllowed();
    canvasElement.hidden = !allowed;
    document.documentElement.classList.toggle('has-reactive-dots', allowed);
    if (!allowed) {
      cancelAnimationSchedule();
      targetInfluenceFactor = 0;
      currentInfluenceFactor = 0;
    } else {
      updateScrollOffsets();
      renderDotsFrame();
    }
  }

  try {
    resizeViewportCanvas();
    if (spriteCanvasList.length === 0) {
      canvasElement.remove();
      return;
    }
    synchronizeAvailability();
  } catch (initializationError) {
    cancelAnimationSchedule();
    canvasElement.remove();
    document.documentElement.classList.remove('has-reactive-dots');
    return;
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', handlePointerLeave);
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });

  document.addEventListener('visibilitychange', function () {
    isDocumentHiddenState = document.hidden;
    synchronizeAvailability();
  });

  window.addEventListener('portfolio:motionchange', function (motionEvent) {
    isMotionPausedManually = Boolean(motionEvent.detail && motionEvent.detail.paused);
    cancelAnimationSchedule();
    targetInfluenceFactor = 0;
    currentInfluenceFactor = 0;
    synchronizeAvailability();
  });

  window.addEventListener('portfolio:viewchange', function (viewEvent) {
    isBriefViewActive = Boolean(viewEvent.detail && viewEvent.detail.mode === 'brief');
    cancelAnimationSchedule();
    targetInfluenceFactor = 0;
    currentInfluenceFactor = 0;
    synchronizeAvailability();
  });

  if (typeof reducedMotionMediaQuery.addEventListener === 'function') {
    reducedMotionMediaQuery.addEventListener('change', function () {
      cancelAnimationSchedule();
      targetInfluenceFactor = 0;
      currentInfluenceFactor = 0;
      synchronizeAvailability();
    });
  }

  if (typeof finePointerMediaQuery.addEventListener === 'function') {
    finePointerMediaQuery.addEventListener('change', function () {
      cancelAnimationSchedule();
      targetInfluenceFactor = 0;
      currentInfluenceFactor = 0;
      synchronizeAvailability();
    });
  }

})();
