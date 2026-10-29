(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const finePointerMediaQuery = window.matchMedia('(pointer: fine)');
  const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let canvasElement = null;
  let canvasContext = null;
  let animationFrameId = null;
  let isSettled = false;
  let isSceneInView = true;
  let sceneIntersectionObserver = null;
  let currentStateName = 'hero';
  let selectedProjectStateName = 'yahcw';
  const sectionVisibility = new Map();
  let isInitialized = false;

  const DESKTOP_PARTICLE_COUNT = 6400;
  const MOBILE_PARTICLE_COUNT = 1600;

  const particleCollection = [];

  let viewportWidth = 0;
  let viewportHeight = 0;
  let deviceScaleRatio = 1;

  let cameraYaw = 0;
  let cameraPitch = 0;
  let targetCameraYaw = 0;
  let targetCameraPitch = 0;

  let pointerPositionX = -9999;
  let pointerPositionY = -9999;
  let hasPointerInteraction = false;

  function canAnimateScene() {
    if (typeof document === 'undefined') return false;
    if (document.hidden) return false;
    if (!isSceneInView) return false;

    const isMotionPaused = document.documentElement.getAttribute('data-motion') === 'paused';
    const isBriefViewActive = document.documentElement.getAttribute('data-view') === 'brief';

    if (isMotionPaused || isBriefViewActive) {
      return false;
    }

    if (reducedMotionMediaQuery.matches) {
      return false;
    }

    return true;
  }

  function initializeCanvasElement() {
    canvasElement = document.getElementById('immersive-scene-canvas');
    if (!canvasElement) {
      canvasElement = document.createElement('canvas');
      canvasElement.id = 'immersive-scene-canvas';
      canvasElement.className = 'immersive-scene-canvas';
      canvasElement.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvasElement);
    }

    document.body.prepend(canvasElement);

    try {
      canvasContext = canvasElement.getContext('2d', { alpha: true });
    } catch (contextError) {
      canvasContext = null;
    }

    if (!canvasContext) {
      canvasElement.style.display = 'none';
      return false;
    }

    handleResize();
    buildParticleGeometry();
    return true;
  }

  function buildParticleGeometry() {
    particleCollection.length = 0;
    const isMobileViewport = viewportWidth < 768;
    const targetParticleCount = isMobileViewport ? MOBILE_PARTICLE_COUNT : DESKTOP_PARTICLE_COUNT;
    const gridDimension = Math.floor(Math.sqrt(targetParticleCount));

    for (let particleIndex = 0; particleIndex < targetParticleCount; particleIndex += 1) {
      const colIndex = particleIndex % gridDimension;
      const rowIndex = Math.floor(particleIndex / gridDimension);
      const colRatio = colIndex / Math.max(1, gridDimension - 1);
      const rowRatio = rowIndex / Math.max(1, gridDimension - 1);

      particleCollection.push({
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        targetPositionX: 0,
        targetPositionY: 0,
        targetPositionZ: 0,
        gridColRatio: colRatio,
        gridRowRatio: rowRatio,
        particleIndex: particleIndex,
        screenCoordinateX: 0,
        screenCoordinateY: 0,
        renderedScale: 1,
        projectedDepth: 0,
        isVisible: false,
        colorKind: 'slate',
        baseAlpha: 0.35,
        radius: 1.0
      });
    }

    computeMorphTargets(currentStateName);

    for (let particleIndex = 0; particleIndex < particleCollection.length; particleIndex += 1) {
      const particle = particleCollection[particleIndex];
      particle.positionX = particle.targetPositionX;
      particle.positionY = particle.targetPositionY;
      particle.positionZ = particle.targetPositionZ;
    }

    updateParticles();
    drawScene();
  }

  function computeMorphTargets(targetStateName) {
    const particleTotal = particleCollection.length;
    const gridDimension = Math.floor(Math.sqrt(particleTotal));

    for (let particleIndex = 0; particleIndex < particleTotal; particleIndex += 1) {
      const particle = particleCollection[particleIndex];
      const colIndex = particleIndex % gridDimension;
      const rowIndex = Math.floor(particleIndex / gridDimension);
      const colRatio = particle.gridColRatio;
      const rowRatio = particle.gridRowRatio;

      if (targetStateName === 'yahcw') {
        const quadrantIndex = particleIndex % 4;
        const subIndex = Math.floor(particleIndex / 4);
        const subTotal = Math.max(1, Math.floor(particleTotal / 4));
        const subGridDim = Math.floor(Math.sqrt(subTotal));
        const subCol = (subIndex % subGridDim) / Math.max(1, subGridDim - 1);
        const subRow = Math.floor(subIndex / subGridDim) / Math.max(1, subGridDim - 1);

        let windowCenterX = 0;
        let windowCenterY = 0;
        let windowCenterZ = 0;
        let windowWidth = 320;
        let windowHeight = 200;

        if (quadrantIndex === 0) {
          windowCenterX = 100;
          windowCenterY = -50;
          windowCenterZ = -140;
          windowWidth = 360;
          windowHeight = 220;
        } else if (quadrantIndex === 1) {
          windowCenterX = -130;
          windowCenterY = 40;
          windowCenterZ = -40;
          windowWidth = 310;
          windowHeight = 190;
        } else if (quadrantIndex === 2) {
          windowCenterX = 220;
          windowCenterY = 90;
          windowCenterZ = 50;
          windowWidth = 270;
          windowHeight = 170;
        } else {
          windowCenterX = -40;
          windowCenterY = -120;
          windowCenterZ = 130;
          windowWidth = 290;
          windowHeight = 180;
        }

        const isBorder = (subCol < 0.05 || subCol > 0.95 || subRow < 0.05 || subRow > 0.95);
        particle.targetPositionX = windowCenterX + (subCol - 0.5) * windowWidth;
        particle.targetPositionY = windowCenterY + (subRow - 0.5) * windowHeight;
        particle.targetPositionZ = windowCenterZ + (subCol - 0.5) * 40;

        if (isBorder) {
          particle.colorKind = 'seaglass';
          particle.baseAlpha = 0.8;
          particle.radius = 1.2;
        } else if (subIndex % 7 === 0) {
          particle.colorKind = 'silver';
          particle.baseAlpha = 0.5;
          particle.radius = 1.0;
        } else {
          particle.colorKind = 'slate';
          particle.baseAlpha = 0.22;
          particle.radius = 0.8;
        }
      } else if (targetStateName === 'tuya') {
        const isLocalBranch = (particleIndex % 2 === 0);
        const branchIndex = Math.floor(particleIndex / 2);
        const branchTotal = Math.max(1, Math.floor(particleTotal / 2));
        const branchRatio = branchIndex / branchTotal;

        if (isLocalBranch) {
          const spineX = (branchRatio - 0.35) * 780;
          const busRibIndex = branchIndex % 12;
          const ribProgress = (busRibIndex / 11 - 0.5) * 110;
          const sineWave = Math.sin(branchRatio * Math.PI * 5) * 24;

          particle.targetPositionX = spineX;
          particle.targetPositionY = sineWave + ribProgress;
          particle.targetPositionZ = -60 + Math.cos(branchRatio * Math.PI * 4) * 50;

          particle.colorKind = (busRibIndex === 0 || busRibIndex === 11) ? 'seaglass' : 'silver';
          particle.baseAlpha = 0.65;
          particle.radius = 1.1;
        } else {
          const orbitAngle = branchRatio * Math.PI * 2;
          const radiusX = 390;
          const radiusY = 140;
          const radiusZ = 340;

          particle.targetPositionX = 60 + Math.cos(orbitAngle) * radiusX;
          particle.targetPositionY = Math.sin(orbitAngle) * radiusY + Math.sin(orbitAngle * 3) * 28;
          particle.targetPositionZ = Math.sin(orbitAngle) * radiusZ;

          particle.colorKind = (branchIndex % 5 === 0) ? 'seaglass' : 'slate';
          particle.baseAlpha = 0.38;
          particle.radius = 0.9;
        }
      } else if (targetStateName === 'gaming-fps-hud') {
        const laneCount = 8;
        const laneIndex = particleIndex % laneCount;
        const laneProgress = Math.floor(particleIndex / laneCount) / Math.max(1, Math.floor(particleTotal / laneCount) - 1);

        const laneSpacing = 70;
        const laneX = ((laneIndex - 3.5) * laneSpacing) + 120;
        const corridorZ = (laneProgress - 0.5) * 1100;

        let harmonicWave = Math.sin(laneProgress * Math.PI * 7 + laneIndex * 0.9) * 28;
        if (laneIndex === 3 || laneIndex === 4) {
          const stutterDistance = Math.abs(laneProgress - 0.62);
          if (stutterDistance < 0.12) {
            harmonicWave += (1 - stutterDistance / 0.12) * 65;
          }
        }

        particle.targetPositionX = laneX;
        particle.targetPositionY = harmonicWave + (laneIndex - 3.5) * 8;
        particle.targetPositionZ = corridorZ;

        if (laneIndex === 3 || laneIndex === 4) {
          particle.colorKind = 'seaglass';
          particle.baseAlpha = 0.75;
          particle.radius = 1.15;
        } else if (particleIndex % 6 === 0) {
          particle.colorKind = 'silver';
          particle.baseAlpha = 0.5;
          particle.radius = 0.95;
        } else {
          particle.colorKind = 'slate';
          particle.baseAlpha = 0.24;
          particle.radius = 0.8;
        }
      } else if (targetStateName === 'laboratorio') {
        const curveX = (colRatio - 0.3) * 820;
        const exponentialRise = Math.pow(colRatio, 2.5) * 440;
        const depthRibZ = (rowRatio - 0.5) * 880;
        const ribCrossWave = Math.sin(rowRatio * Math.PI * 4) * 22;

        particle.targetPositionX = curveX;
        particle.targetPositionY = 170 - exponentialRise + ribCrossWave;
        particle.targetPositionZ = depthRibZ;

        if (colRatio > 0.72) {
          particle.colorKind = 'seaglass';
          particle.baseAlpha = 0.8;
          particle.radius = 1.2;
        } else if (rowIndex % 6 === 0) {
          particle.colorKind = 'silver';
          particle.baseAlpha = 0.52;
          particle.radius = 1.0;
        } else {
          particle.colorKind = 'slate';
          particle.baseAlpha = 0.22;
          particle.radius = 0.75;
        }
      } else {
        const worldX = (colRatio - 0.2) * 1050;
        const worldZ = (rowRatio - 0.5) * 1050;

        const riverCenterRatio = 0.56 + 0.14 * Math.sin(rowRatio * Math.PI * 2.2);
        const distanceToRiver = Math.abs(colRatio - riverCenterRatio);

        const riverBedDip = -54 * Math.exp(-Math.pow(distanceToRiver / 0.13, 2));
        const terrainWave = Math.sin(colRatio * Math.PI * 3.4 + rowRatio * 2.2) * 32 + Math.cos(rowRatio * Math.PI * 3.8) * 36;
        const worldY = 90 + terrainWave + riverBedDip;

        particle.targetPositionX = worldX;
        particle.targetPositionY = worldY;
        particle.targetPositionZ = worldZ;

        if (distanceToRiver < 0.13) {
          particle.colorKind = 'seaglass';
          particle.baseAlpha = Math.max(0.4, 0.82 - (distanceToRiver / 0.13) * 0.42);
          particle.radius = 1.15;
        } else if ((colIndex % 6 === 0 || rowIndex % 6 === 0) && terrainWave > 12) {
          particle.colorKind = 'silver';
          particle.baseAlpha = 0.55;
          particle.radius = 0.95;
        } else {
          particle.colorKind = 'slate';
          particle.baseAlpha = 0.22;
          particle.radius = 0.75;
        }
      }
    }

    isSettled = false;
    requestRenderLoop();
  }

  function handleResize() {
    if (!canvasElement) return;

    viewportWidth = Math.max(320, window.innerWidth);
    viewportHeight = Math.max(320, window.innerHeight);
    deviceScaleRatio = Math.min(2, window.devicePixelRatio || 1);

    canvasElement.width = Math.floor(viewportWidth * deviceScaleRatio);
    canvasElement.height = Math.floor(viewportHeight * deviceScaleRatio);
    canvasElement.style.width = viewportWidth + 'px';
    canvasElement.style.height = viewportHeight + 'px';

    if (canvasContext) {
      canvasContext.setTransform(1, 0, 0, 1, 0, 0);
      canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasContext.scale(deviceScaleRatio, deviceScaleRatio);
    }

    if (particleCollection.length > 0) {
      buildParticleGeometry();
    }
    isSettled = false;
    requestRenderLoop();
  }

  function updateParticles() {
    let maximumDisplacement = 0;
    const interpolationFactor = 0.12;

    targetCameraYaw = hasPointerInteraction ? (pointerPositionX / viewportWidth - 0.5) * 0.32 : 0;
    targetCameraPitch = hasPointerInteraction ? (pointerPositionY / viewportHeight - 0.5) * 0.24 : 0;

    const yawDelta = (targetCameraYaw - cameraYaw) * 0.08;
    const pitchDelta = (targetCameraPitch - cameraPitch) * 0.08;
    cameraYaw += yawDelta;
    cameraPitch += pitchDelta;

    const cameraMotionMagnitude = Math.abs(yawDelta) + Math.abs(pitchDelta);

    const cosYaw = Math.cos(cameraYaw);
    const sinYaw = Math.sin(cameraYaw);
    const cosPitch = Math.cos(cameraPitch);
    const sinPitch = Math.sin(cameraPitch);

    const focalLength = 680;
    const cameraDistance = 780;
    const particleTotal = particleCollection.length;

    for (let particleIndex = 0; particleIndex < particleTotal; particleIndex += 1) {
      const particle = particleCollection[particleIndex];

      const differenceX = particle.targetPositionX - particle.positionX;
      const differenceY = particle.targetPositionY - particle.positionY;
      const differenceZ = particle.targetPositionZ - particle.positionZ;

      particle.positionX += differenceX * interpolationFactor;
      particle.positionY += differenceY * interpolationFactor;
      particle.positionZ += differenceZ * interpolationFactor;

      const currentDisplacement = Math.abs(differenceX) + Math.abs(differenceY) + Math.abs(differenceZ);
      if (currentDisplacement > maximumDisplacement) {
        maximumDisplacement = currentDisplacement;
      }

      const rotatedX = particle.positionX * cosYaw - particle.positionZ * sinYaw;
      const intermediateZ = particle.positionX * sinYaw + particle.positionZ * cosYaw;
      const rotatedY = particle.positionY * cosPitch - intermediateZ * sinPitch;
      const rotatedZ = particle.positionY * sinPitch + intermediateZ * cosPitch;

      particle.projectedDepth = rotatedZ;
      const combinedDepth = cameraDistance + rotatedZ;

      if (combinedDepth > 30) {
        const perspectiveScale = focalLength / combinedDepth;
        particle.screenCoordinateX = viewportWidth * 0.5 + rotatedX * perspectiveScale;
        particle.screenCoordinateY = viewportHeight * 0.5 + rotatedY * perspectiveScale;
        particle.renderedScale = perspectiveScale;
        particle.isVisible = true;
      } else {
        particle.isVisible = false;
      }
    }

    if (maximumDisplacement < 0.06 && cameraMotionMagnitude < 0.0004) {
      isSettled = true;
    }
  }

  function drawScene() {
    if (!canvasContext) return;

    canvasContext.clearRect(0, 0, viewportWidth, viewportHeight);

    const particleTotal = particleCollection.length;

    const seaglassParticles = [];
    const silverParticles = [];
    const slateParticles = [];

    for (let particleIndex = 0; particleIndex < particleTotal; particleIndex += 1) {
      const particle = particleCollection[particleIndex];
      if (!particle.isVisible) continue;

      const coordX = particle.screenCoordinateX;
      const coordY = particle.screenCoordinateY;

      if (coordX < -30 || coordX > viewportWidth + 30 || coordY < -30 || coordY > viewportHeight + 30) {
        continue;
      }

      if (particle.colorKind === 'seaglass') {
        seaglassParticles.push(particle);
      } else if (particle.colorKind === 'silver') {
        silverParticles.push(particle);
      } else {
        slateParticles.push(particle);
      }
    }

    if (slateParticles.length > 0) {
      canvasContext.fillStyle = 'rgba(100, 120, 140, 0.28)';
      canvasContext.beginPath();
      for (let index = 0; index < slateParticles.length; index += 1) {
        const particleItem = slateParticles[index];
        const depthClamp = Math.max(0.2, Math.min(1.3, particleItem.renderedScale));
        const radius = Math.max(0.6, particleItem.radius * depthClamp);
        canvasContext.rect(particleItem.screenCoordinateX - radius, particleItem.screenCoordinateY - radius, radius * 2, radius * 2);
      }
      canvasContext.fill();
    }

    if (silverParticles.length > 0) {
      canvasContext.fillStyle = 'rgba(226, 232, 240, 0.52)';
      canvasContext.beginPath();
      for (let index = 0; index < silverParticles.length; index += 1) {
        const particleItem = silverParticles[index];
        const depthClamp = Math.max(0.2, Math.min(1.4, particleItem.renderedScale));
        const radius = Math.max(0.7, particleItem.radius * depthClamp);
        canvasContext.rect(particleItem.screenCoordinateX - radius, particleItem.screenCoordinateY - radius, radius * 2, radius * 2);
      }
      canvasContext.fill();
    }

    if (seaglassParticles.length > 0) {
      canvasContext.fillStyle = 'rgba(166, 214, 192, 0.82)';
      canvasContext.beginPath();
      for (let index = 0; index < seaglassParticles.length; index += 1) {
        const particleItem = seaglassParticles[index];
        const depthClamp = Math.max(0.2, Math.min(1.5, particleItem.renderedScale));
        const radius = Math.max(0.8, particleItem.radius * depthClamp);
        canvasContext.rect(particleItem.screenCoordinateX - radius, particleItem.screenCoordinateY - radius, radius * 2, radius * 2);
      }
      canvasContext.fill();
    }
  }

  function executeAnimationLoop() {
    animationFrameId = null;

    if (!canAnimateScene()) {
      return;
    }

    updateParticles();
    drawScene();

    if (!isSettled) {
      animationFrameId = window.requestAnimationFrame(executeAnimationLoop);
    }
  }

  function requestRenderLoop() {
    if (animationFrameId !== null) {
      return;
    }
    if (!canAnimateScene()) return;
    isSettled = false;
    animationFrameId = window.requestAnimationFrame(executeAnimationLoop);
  }

  function handlePointerMove(pointerEvent) {
    if (!finePointerMediaQuery.matches || pointerEvent.pointerType === 'touch' || !canAnimateScene()) return;
    pointerPositionX = pointerEvent.clientX;
    pointerPositionY = pointerEvent.clientY;
    hasPointerInteraction = true;

    requestRenderLoop();
  }

  function handlePointerLeave() {
    hasPointerInteraction = false;
    targetCameraYaw = 0;
    targetCameraPitch = 0;
    requestRenderLoop();
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    } else {
      requestRenderLoop();
    }
  }

  function setSceneState(stateName) {
    if (!['hero', 'yahcw', 'tuya', 'gaming-fps-hud', 'laboratorio'].includes(stateName)) return;
    if (stateName !== 'hero') selectedProjectStateName = stateName;
    const heroSection = document.getElementById('hero');
    const heroVisible = heroSection && heroSection.getBoundingClientRect().bottom > viewportHeight * 0.45;
    const nextStateName = heroVisible ? 'hero' : selectedProjectStateName;
    if (currentStateName === nextStateName) return;
    currentStateName = nextStateName;
    computeMorphTargets(nextStateName);
  }

  function initializeIntersectionObserver() {
    if (typeof IntersectionObserver === 'undefined') return;

    const observedSections = document.querySelectorAll('#hero, #projetos');
    if (observedSections.length === 0) return;

    sceneIntersectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sectionVisibility.set(entry.target, entry.isIntersecting);
      });
      isSceneInView = Array.from(sectionVisibility.values()).some(Boolean);
      canvasElement.hidden = !isSceneInView;
      setSceneState(selectedProjectStateName);
      if (!isSceneInView) {
        if (animationFrameId !== null) {
          window.cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      } else {
        requestRenderLoop();
      }
    }, { threshold: [0, 0.05, 0.45, 0.8] });

    observedSections.forEach(function (sectionElement) {
      sceneIntersectionObserver.observe(sectionElement);
    });
  }

  function initializeScene() {
    if (isInitialized) return;
    isInitialized = true;
    const isCanvasAvailable = initializeCanvasElement();
    if (!isCanvasAvailable) return;

    initializeIntersectionObserver();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    function handleMediaChange() {
      hasPointerInteraction = false;
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (canAnimateScene()) requestRenderLoop();
    }
    reducedMotionMediaQuery.addEventListener('change', handleMediaChange);
    finePointerMediaQuery.addEventListener('change', handleMediaChange);

    window.addEventListener('portfolio:statechange', function (customEvent) {
      if (customEvent && customEvent.detail && customEvent.detail.state) {
        setSceneState(customEvent.detail.state);
      }
    });

    window.addEventListener('portfolio:motionchange', function () {
      if (canAnimateScene()) {
        requestRenderLoop();
      } else if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    });

    window.addEventListener('portfolio:viewchange', function () {
      if (canAnimateScene()) {
        requestRenderLoop();
      } else if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    });

    requestRenderLoop();
  }

  window.ImmersiveScene = {
    initialize: initializeScene,
    setState: setSceneState,
    requestRender: requestRenderLoop,
    getParticleCount: function () {
      return particleCollection.length;
    },
    isSettled: function () {
      return isSettled;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScene);
  } else {
    initializeScene();
  }
})();
