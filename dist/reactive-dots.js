(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const PITCH_HORIZONTAL = 14;
  const PITCH_VERTICAL = 16;
  const BAR_WIDTH_LOGICAL = 1.2;
  const BAR_HEIGHT_LOGICAL = 6.0;
  const INFLUENCE_RADIUS = 130;
  const MAXIMUM_DISPLACEMENT = 7.5;
  const REST_RETURN_SPEED = 0.12;

  const finePointerMediaQuery = window.matchMedia('(pointer: fine)');
  const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let isMotionPausedManually = document.documentElement.getAttribute('data-motion') === 'paused';
  let isBriefViewActive = document.documentElement.getAttribute('data-view') === 'brief';
  let isDocumentHiddenState = Boolean(document.hidden);

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

  let canvasElement = null;
  let canvasContext = null;

  try {
    canvasElement = document.createElement('canvas');
    canvasElement.className = 'reactive-dots-canvas';
    canvasElement.setAttribute('aria-hidden', 'true');
    canvasElement.hidden = true;
    canvasContext = canvasElement.getContext('2d', { alpha: true });
  } catch (initializationError) {
    canvasContext = null;
  }

  if (!canvasElement || !canvasContext) {
    if (canvasElement && canvasElement.parentNode) {
      canvasElement.parentNode.removeChild(canvasElement);
    }
    document.documentElement.classList.remove('has-reactive-dots');
    return;
  }

  let deviceScaleRatio = 1;
  let viewportWidth = 0;
  let viewportHeight = 0;

  let activePointerX = -1000;
  let activePointerY = -1000;
  let isPointerActive = false;

  let animationFrameIdentifier = null;
  let isFieldResting = true;

  const spriteLevels = [];

  function createMicrobarSprites() {
    spriteLevels.length = 0;

    const spriteWidthPx = Math.max(16, Math.round(20 * deviceScaleRatio));
    const spriteHeightPx = Math.max(20, Math.round(24 * deviceScaleRatio));

    const barWidthPx = Math.max(1, Math.round(BAR_WIDTH_LOGICAL * deviceScaleRatio));
    const barHeightPx = Math.max(3, Math.round(BAR_HEIGHT_LOGICAL * deviceScaleRatio));

    const centerX = spriteWidthPx / 2;
    const centerY = spriteHeightPx / 2;

    const barLeft = Math.round(centerX - barWidthPx / 2);
    const barTop = Math.round(centerY - barHeightPx / 2);

    const levels = [
      { fill: 'rgba(222, 195, 177, 0.42)', shadowColor: null, shadowBlur: 0 },
      { fill: 'rgba(215, 150, 134, 0.72)', shadowColor: 'rgba(215, 150, 134, 0.35)', shadowBlur: 2.0 },
      { fill: 'rgba(193, 107, 89, 0.92)', shadowColor: 'rgba(193, 107, 89, 0.45)', shadowBlur: 4.0 },
      { fill: 'rgba(180, 85, 68, 1.0)', shadowColor: 'rgba(193, 107, 89, 0.60)', shadowBlur: 6.0 }
    ];

    for (let index = 0; index < levels.length; index += 1) {
      const palette = levels[index];
      let spriteCanvas;
      let spriteContext;
      try {
        spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = spriteWidthPx;
        spriteCanvas.height = spriteHeightPx;
        spriteContext = spriteCanvas.getContext('2d');
      } catch (contextError) {
        spriteContext = null;
      }

      if (!spriteContext) {
        return false;
      }

      spriteContext.save();
      if (palette.shadowColor && palette.shadowBlur > 0) {
        spriteContext.shadowColor = palette.shadowColor;
        spriteContext.shadowBlur = Math.round(palette.shadowBlur * deviceScaleRatio);
      }
      spriteContext.fillStyle = palette.fill;
      spriteContext.fillRect(barLeft, barTop, barWidthPx, barHeightPx);
      spriteContext.restore();

      spriteLevels.push({
        canvas: spriteCanvas,
        halfWidth: spriteWidthPx / 2,
        halfHeight: spriteHeightPx / 2,
        width: spriteWidthPx,
        height: spriteHeightPx,
        barWidth: barWidthPx,
        barHeight: barHeightPx
      });
    }

    return spriteLevels.length === levels.length;
  }

  let fieldPoints = [];

  function shouldIncludeCell(column, row, totalCols, totalRows) {
    const hash = Math.sin(column * 12.9898 + row * 78.233) * 43758.5453;
    const noise = hash - Math.floor(hash);

    if (noise < 0.22) {
      return false;
    }

    const normX = column / totalCols;
    const normY = row / totalRows;

    const inUpperBreathingZone = normX > 0.08 && normX < 0.42 && normY > 0.12 && normY < 0.44;
    if (inUpperBreathingZone && noise < 0.48) {
      return false;
    }

    const inLowerBreathingZone = normX > 0.55 && normX < 0.92 && normY > 0.35 && normY < 0.72;
    if (inLowerBreathingZone && noise < 0.48) {
      return false;
    }

    return true;
  }

  function rebuildFieldGrid() {
    deviceScaleRatio = Math.min(window.devicePixelRatio || 1, 2);
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;

    canvasElement.width = Math.round(viewportWidth * deviceScaleRatio);
    canvasElement.height = Math.round(viewportHeight * deviceScaleRatio);
    canvasElement.style.width = viewportWidth + 'px';
    canvasElement.style.height = viewportHeight + 'px';

    const spritesCreated = createMicrobarSprites();
    if (!spritesCreated) {
      if (canvasElement.parentNode) {
        canvasElement.parentNode.removeChild(canvasElement);
      }
      document.documentElement.classList.remove('has-reactive-dots');
      return false;
    }

    fieldPoints = [];
    const pitchX = viewportWidth < 600 ? PITCH_HORIZONTAL * 1.35 : PITCH_HORIZONTAL;
    const pitchY = viewportWidth < 600 ? PITCH_VERTICAL * 1.35 : PITCH_VERTICAL;

    const totalCols = Math.ceil(viewportWidth / pitchX) + 1;
    const totalRows = Math.ceil(viewportHeight / pitchY) + 1;

    for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
      const baseY = rowIndex * pitchY;
      for (let colIndex = 0; colIndex < totalCols; colIndex += 1) {
        if (!shouldIncludeCell(colIndex, rowIndex, totalCols, totalRows)) {
          continue;
        }

        const baseX = colIndex * pitchX;
        fieldPoints.push({
          restX: baseX,
          restY: baseY,
          currentX: baseX,
          currentY: baseY,
          displacement: 0,
          spriteIndex: 0
        });
      }
    }

    return true;
  }

  function renderFieldFrame() {
    animationFrameIdentifier = null;

    if (!isEffectAllowed()) {
      synchronizeAvailability();
      return;
    }

    canvasContext.setTransform(1, 0, 0, 1, 0, 0);
    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);

    let maxVelocity = 0;
    const defaultSprite = spriteLevels[0];
    if (!defaultSprite) return;

    for (let index = 0; index < fieldPoints.length; index += 1) {
      const point = fieldPoints[index];
      let targetX = point.restX;
      let targetY = point.restY;
      let activeSprite = defaultSprite;

      if (isPointerActive) {
        const deltaX = point.restX - activePointerX;
        const deltaY = point.restY - activePointerY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance < INFLUENCE_RADIUS && distance > 0.001) {
          const proximityRatio = 1 - distance / INFLUENCE_RADIUS;
          const repulsionForce = Math.pow(proximityRatio, 1.8) * MAXIMUM_DISPLACEMENT;
          targetX = point.restX + (deltaX / distance) * repulsionForce;
          targetY = point.restY + (deltaY / distance) * repulsionForce;

          const level = Math.min(spriteLevels.length - 1, Math.floor(proximityRatio * spriteLevels.length));
          activeSprite = spriteLevels[level] || defaultSprite;
        }
      }

      const diffX = targetX - point.currentX;
      const diffY = targetY - point.currentY;
      point.currentX += diffX * REST_RETURN_SPEED;
      point.currentY += diffY * REST_RETURN_SPEED;

      const motionDelta = Math.hypot(diffX, diffY);
      if (motionDelta > maxVelocity) {
        maxVelocity = motionDelta;
      }

      const drawX = Math.round(point.currentX * deviceScaleRatio - activeSprite.halfWidth);
      const drawY = Math.round(point.currentY * deviceScaleRatio - activeSprite.halfHeight);

      canvasContext.drawImage(activeSprite.canvas, drawX, drawY);
    }

    if (maxVelocity < 0.08) {
      if (!isPointerActive) {
        for (let index = 0; index < fieldPoints.length; index += 1) {
          fieldPoints[index].currentX = fieldPoints[index].restX;
          fieldPoints[index].currentY = fieldPoints[index].restY;
        }
      }
      isFieldResting = true;
      return;
    }

    requestRenderLoop();
  }

  function requestRenderLoop() {
    if (animationFrameIdentifier !== null) return;
    if (!isEffectAllowed()) return;
    animationFrameIdentifier = requestAnimationFrame(renderFieldFrame);
  }

  function synchronizeAvailability() {
    isMotionPausedManually = document.documentElement.getAttribute('data-motion') === 'paused';
    isBriefViewActive = document.documentElement.getAttribute('data-view') === 'brief';
    isDocumentHiddenState = Boolean(document.hidden);

    const allowed = isEffectAllowed();

    if (!allowed) {
      if (animationFrameIdentifier !== null) {
        cancelAnimationFrame(animationFrameIdentifier);
        animationFrameIdentifier = null;
      }
      canvasElement.hidden = true;
      document.documentElement.classList.remove('has-reactive-dots');

      if (canvasContext && canvasElement.width > 0 && canvasElement.height > 0) {
        canvasContext.setTransform(1, 0, 0, 1, 0, 0);
        canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }

      for (let index = 0; index < fieldPoints.length; index += 1) {
        fieldPoints[index].currentX = fieldPoints[index].restX;
        fieldPoints[index].currentY = fieldPoints[index].restY;
      }
      isFieldResting = true;
    } else {
      if (!canvasElement.parentNode) {
        if (document.body.firstChild) {
          document.body.insertBefore(canvasElement, document.body.firstChild);
        } else {
          document.body.appendChild(canvasElement);
        }
      }

      if (fieldPoints.length === 0 || canvasElement.width === 0 || viewportWidth !== window.innerWidth || viewportHeight !== window.innerHeight || deviceScaleRatio !== Math.min(window.devicePixelRatio || 1, 2)) {
        const gridBuilt = rebuildFieldGrid();
        if (!gridBuilt) {
          if (canvasElement.parentNode) {
            canvasElement.parentNode.removeChild(canvasElement);
          }
          document.documentElement.classList.remove('has-reactive-dots');
          return;
        }
      }

      canvasElement.hidden = false;
      if (animationFrameIdentifier !== null) {
        cancelAnimationFrame(animationFrameIdentifier);
        animationFrameIdentifier = null;
      }
      renderFieldFrame();
      document.documentElement.classList.add('has-reactive-dots');
    }
  }

  function handlePointerMove(moveEvent) {
    if (moveEvent.pointerType === 'touch') return;
    activePointerX = moveEvent.clientX;
    activePointerY = moveEvent.clientY;
    isPointerActive = true;
    isFieldResting = false;
    requestRenderLoop();
  }

  function handlePointerLeave(event) {
    if (event && event.pointerType === 'touch') return;
    activePointerX = -1000;
    activePointerY = -1000;
    isPointerActive = false;
    isFieldResting = false;
    requestRenderLoop();
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
  window.addEventListener('mouseleave', handlePointerLeave, { passive: true });

  window.addEventListener('resize', function () {
    if (isEffectAllowed()) {
      rebuildFieldGrid();
      requestRenderLoop();
    } else {
      synchronizeAvailability();
    }
  }, { passive: true });

  if (typeof finePointerMediaQuery.addEventListener === 'function') {
    finePointerMediaQuery.addEventListener('change', synchronizeAvailability);
  } else if (typeof finePointerMediaQuery.addListener === 'function') {
    finePointerMediaQuery.addListener(synchronizeAvailability);
  }

  if (typeof reducedMotionMediaQuery.addEventListener === 'function') {
    reducedMotionMediaQuery.addEventListener('change', synchronizeAvailability);
  } else if (typeof reducedMotionMediaQuery.addListener === 'function') {
    reducedMotionMediaQuery.addListener(synchronizeAvailability);
  }

  window.addEventListener('portfolio:motionchange', function (motionEvent) {
    isMotionPausedManually = Boolean(motionEvent.detail && motionEvent.detail.paused);
    synchronizeAvailability();
  });

  window.addEventListener('portfolio:viewchange', function (viewEvent) {
    isBriefViewActive = Boolean(viewEvent.detail && viewEvent.detail.mode === 'brief');
    synchronizeAvailability();
  });

  window.addEventListener('portfolio:layoutchange', function () {
    synchronizeAvailability();
  });

  document.addEventListener('visibilitychange', function () {
    isDocumentHiddenState = Boolean(document.hidden);
    synchronizeAvailability();
  });

  synchronizeAvailability();
})();
