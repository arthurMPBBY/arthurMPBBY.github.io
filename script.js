(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const EMAIL_ADDRESS = 'arthurkadri968@gmail.com';
  const STORAGE_MOTION_KEY = 'arthur_portfolio_motion';

  // Coordenadas espaciais dos 6 objetos livres (origem 0,0 centralizada)
  const PROJECT_COORDINATES = {
    yahcw: { coordX: -440, coordY: -220, zoom: 1.15 },
    tuya: { coordX: 440, coordY: -220, zoom: 1.15 },
    gaming: { coordX: -450, coordY: 220, zoom: 1.15 },
    python: { coordX: 450, coordY: 220, zoom: 1.15 },
    spotifast: { coordX: 0, coordY: -350, zoom: 1.15 },
    financeiro: { coordX: 0, coordY: 350, zoom: 1.15 }
  };

  const PROJECT_SEQUENCE = ['yahcw', 'tuya', 'gaming', 'python', 'spotifast', 'financeiro'];

  const CONCEPTUAL_RELATIONS = {
    yahcw: {
      title: 'YAHCW',
      category: 'Win32 · DWM · C#',
      related: [
        { id: 'tuya', label: 'tuya-smart-lamps', relTag: 'Interfaces de controle' },
        { id: 'spotifast', label: 'spotifast-neon-theme', relTag: 'Ergonomia Desktop' }
      ],
      editorial: 'Controle e interface direta: do gerenciamento de janelas DWM e luminância física aos comandos de iluminação residencial e ergonomia visual no desktop.',
      connectionTags: 'Controle de ambiente & interfaces de desktop'
    },
    tuya: {
      title: 'tuya-smart-lamps',
      category: 'Redes · TCP / OpenAPI',
      related: [
        { id: 'yahcw', label: 'YAHCW', relTag: 'Software & Hardware' },
        { id: 'python', label: 'python-curso', relTag: 'Automação & Lógica' }
      ],
      editorial: 'Automação e protocolos determinísticos: orquestração de rede e contingência inteligente aliadas a estruturas de dados e comunicação com periféricos.',
      connectionTags: 'Protocolos de rede, sockets e automação'
    },
    gaming: {
      title: 'gaming-fps-hud',
      category: 'C++17 · Vulkan · Wayland',
      related: [
        { id: 'financeiro', label: 'Laboratório Financeiro', relTag: 'Séries Temporais' },
        { id: 'python', label: 'python-curso', relTag: 'Métricas & Amostragem' }
      ],
      editorial: 'Observabilidade quantitativa e telemetria: leitura contínua de latências e 1% lows dialoga com modelagem temporal e simulações analíticas de capitalização.',
      connectionTags: 'Observação, amostragem e séries temporais'
    },
    python: {
      title: 'python-curso',
      category: 'Python 3 · Algoritmos UFABC',
      related: [
        { id: 'financeiro', label: 'Laboratório Financeiro', relTag: 'Cálculo Rigoroso' },
        { id: 'tuya', label: 'tuya-smart-lamps', relTag: 'Estruturas de Dados' }
      ],
      editorial: 'Estruturas de dados e rigor lógico: fundamentos de coleções e precisão determinística aplicados diretamente a modelos matemáticos e protocolos de rede.',
      connectionTags: 'Estrutura lógica, coleções e algoritmos'
    },
    spotifast: {
      title: 'spotifast-neon-theme',
      category: 'Design Tokens · JSON',
      related: [
        { id: 'yahcw', label: 'YAHCW', relTag: 'Ergonomia de Tela' },
        { id: 'gaming', label: 'gaming-fps-hud', relTag: 'Performance & HUD' }
      ],
      editorial: 'Aparência, tokens e design de interação: interfaces utilitárias que priorizam contraste, baixo overhead de renderização e conforto visual operacional.',
      connectionTags: 'Design de tokens e ergonomia operacional'
    },
    financeiro: {
      title: 'Laboratório Financeiro',
      category: 'Finanças · Taxa Efetiva',
      related: [
        { id: 'gaming', label: 'gaming-fps-hud', relTag: 'Modelagem Contínua' },
        { id: 'python', label: 'python-curso', relTag: 'Matemática Aplicada' }
      ],
      editorial: 'Modelagem quantitativa e matemática aplicada: simulação rigorosa de juros compostos compartilhando princípios de medição contínua e algoritmos determinísticos.',
      connectionTags: 'Matemática aplicada e simulação quantitativa'
    }
  };

  let activeRelationProject = null;
  let savedAtlasCamera = null;
  let savedAtlasFocus = null;
  let relationDismissTimer = null;

  function cancelRelationDismissal() {
    clearTimeout(relationDismissTimer);
    relationDismissTimer = null;
  }

  function scheduleRelationDismissal() {
    cancelRelationDismissal();
    relationDismissTimer = setTimeout(function () {
      const banner = document.getElementById('atlas-relation-banner');
      const artifact = document.getElementById('artifact-' + activeRelationProject);
      const activeElement = document.activeElement;
      if ((banner && (banner.matches(':hover') || banner.contains(activeElement))) ||
          (artifact && (artifact.matches(':hover') || artifact.contains(activeElement)))) return;
      clearConceptualRelation();
    }, 1200);
  }

  function safeStorageGet(storageKey) {
    try {
      return window.localStorage.getItem(storageKey);
    } catch (_) {
      return null;
    }
  }

  function safeStorageSet(storageKey, storageValue) {
    try {
      window.localStorage.setItem(storageKey, storageValue);
      return true;
    } catch (_) {
      return false;
    }
  }

  function announceLiveStatus(statusMessage) {
    const liveElement = document.getElementById('live-announcer');
    if (!liveElement) return;
    liveElement.textContent = statusMessage;
    setTimeout(function () {
      if (liveElement.textContent === statusMessage) {
        liveElement.textContent = '';
      }
    }, 3500);
  }

  const cameraState = {
    currentPanX: 0,
    currentPanY: 0,
    currentZoom: 0.85,
    targetPanX: 0,
    targetPanY: 0,
    targetZoom: 0.85,
    isSettled: false,
    minZoom: 0.35,
    maxZoom: 1.85,
    minPanX: -900,
    maxPanX: 900,
    minPanY: -800,
    maxPanY: 800
  };

  const pointerState = {
    isPointerDown: false,
    isDragging: false,
    wasDragged: false,
    startPointerX: 0,
    startPointerY: 0,
    previousPointerX: 0,
    previousPointerY: 0,
    totalDragDistance: 0,
    activePointerId: null
  };

  let animationFrameHandle = null;
  let isPageVisible = true;
  let isMotionReduced = false;
  let currentActiveRoom = null;
  let isDirectReadingActive = false;
  let lastFocusedRoomId = null;

  const spatialViewport = document.getElementById('spatial-viewport');
  const spatialWorld = document.getElementById('spatial-world');
  const atlasCanvas = document.getElementById('atlas-canvas');
  let atlasCanvasContext = null;

  try {
    if (atlasCanvas && typeof atlasCanvas.getContext === 'function') {
      atlasCanvasContext = atlasCanvas.getContext('2d');
    }
  } catch (_) {
    atlasCanvasContext = null;
  }

  // Cálculo real de FIT com bounding boxes dos objetos + safe area de header e dock
  function calculateOverviewFit() {
    const viewportWidth = window.innerWidth || 1440;
    const viewportHeight = window.innerHeight || 900;

    // Dimensões do envelope mundial (inclui raio dos objetos e margens de respiração)
    // Coordenadas: X [-450 a +450] + meio-objeto 190px = 1280px span
    // Coordenadas: Y [-350 a +350] + meio-objeto 135px = 970px span
    const worldEnvelopeWidth = 1280;
    const worldEnvelopeHeight = 970;

    // Safe areas: Header (~84px), Dock (~96px), Margens laterais (~72px)
    const availableWidth = Math.max(viewportWidth - 72, 280);
    const availableHeight = Math.max(viewportHeight - 180, 260);

    const fitScaleX = availableWidth / worldEnvelopeWidth;
    const fitScaleY = availableHeight / worldEnvelopeHeight;
    let idealZoom = Math.min(fitScaleX, fitScaleY) * 0.98;

    // Em telas mobile, garante zoom legível e composição apropriada
    if (viewportWidth < 500) {
      idealZoom = Math.max(0.42, Math.min(idealZoom, 0.58));
    } else {
      idealZoom = Math.max(cameraState.minZoom, Math.min(idealZoom, 1.05));
    }

    return idealZoom;
  }

  function clampValue(unclampedValue, minimumAllowed, maximumAllowed) {
    return Math.max(minimumAllowed, Math.min(maximumAllowed, unclampedValue));
  }

  function resetCameraToOverview(snap) {
    const calculatedFitZoom = calculateOverviewFit();
    cameraState.targetPanX = 0;
    cameraState.targetPanY = 0;
    cameraState.targetZoom = calculatedFitZoom;

    if (isMotionReduced || snap) {
      cameraState.currentPanX = 0;
      cameraState.currentPanY = 0;
      cameraState.currentZoom = calculatedFitZoom;
      cameraState.isSettled = true;
      applyWorldTransform();
      drawAtlasCanvas();
    } else {
      cameraState.isSettled = false;
    }

    requestCameraWakeup();
    announceLiveStatus('Enquadramento geral do Atlas restaurado.');
  }

  function requestCameraWakeup() {
    if (!isPageVisible || currentActiveRoom || isDirectReadingActive) {
      return;
    }
    if (animationFrameHandle === null) {
      animationFrameHandle = window.requestAnimationFrame(runSpatialRenderLoop);
    }
  }

  // Aplicação da transformação espacial (origem 0,0 do mundo no centro da tela)
  function applyWorldTransform() {
    if (!spatialWorld) return;
    const windowHalfWidth = (window.innerWidth || 1200) / 2;
    const windowHalfHeight = (window.innerHeight || 800) / 2;
    const translateX = windowHalfWidth + cameraState.currentPanX;
    const translateY = windowHalfHeight + cameraState.currentPanY;

    spatialWorld.style.transform = 'translate3d(' + translateX.toFixed(1) + 'px, ' + translateY.toFixed(1) + 'px, 0) scale(' + cameraState.currentZoom.toFixed(4) + ')';
    updateMinimapFrustum();
  }

  function setConceptualRelation(projectId) {
    cancelRelationDismissal();
    if (activeRelationProject === projectId) return;
    activeRelationProject = projectId;

    const banner = document.getElementById('atlas-relation-banner');
    const pairLabel = document.getElementById('relation-pair-label');
    const editorialText = document.getElementById('relation-editorial-text');
    const jumpActions = document.getElementById('relation-jump-actions');

    const allArtifacts = document.querySelectorAll('.spatial-artifact');
    if (!projectId || !CONCEPTUAL_RELATIONS[projectId]) {
      allArtifacts.forEach(function (art) {
        art.classList.remove('is-highlighted', 'is-concept-connected', 'is-concept-dimmed');
      });
      if (banner) {
        banner.setAttribute('inert', '');
        banner.classList.remove('is-visible');
        banner.setAttribute('aria-hidden', 'true');
      }
      drawAtlasCanvas();
      return;
    }

    const relData = CONCEPTUAL_RELATIONS[projectId];
    const relatedIds = relData.related.map(function (relation) { return relation.id; });

    allArtifacts.forEach(function (art) {
      const artId = art.getAttribute('data-project');
      if (artId === projectId) {
        art.classList.add('is-highlighted');
        art.classList.remove('is-concept-connected', 'is-concept-dimmed');
      } else if (relatedIds.indexOf(artId) !== -1) {
        art.classList.add('is-concept-connected');
        art.classList.remove('is-highlighted', 'is-concept-dimmed');
      } else {
        art.classList.add('is-concept-dimmed');
        art.classList.remove('is-highlighted', 'is-concept-connected');
      }
    });

    if (banner && pairLabel && editorialText && jumpActions) {
      const firstRel = relData.related[0];
      const secondRel = relData.related[1];
      pairLabel.textContent = relData.title + ' · Em comum com ' + firstRel.label + ' e ' + secondRel.label;
      editorialText.textContent = relData.editorial;

      jumpActions.innerHTML = '';
      relData.related.forEach(function (item) {
        const jumpBtn = document.createElement('button');
        jumpBtn.type = 'button';
        jumpBtn.className = 'relation-jump-btn';
        jumpBtn.setAttribute('data-jump-room', item.id);
        jumpBtn.textContent = 'Saltar para ' + item.label + ' →';
        jumpBtn.addEventListener('click', function (clickEvent) {
          clickEvent.stopPropagation();
          navigateToRoute(item.id, true);
        });
        jumpActions.appendChild(jumpBtn);
      });

      banner.classList.add('is-visible');
      banner.removeAttribute('inert');
      banner.removeAttribute('aria-hidden');
    }

    drawAtlasCanvas();
  }

  function clearConceptualRelation() {
    setConceptualRelation(null);
  }

  function indicateReturnOnArtifact(projectId) {
    const artifactElement = document.getElementById('artifact-' + projectId);
    if (!artifactElement) return;
    artifactElement.classList.add('returned-pulse');
    setTimeout(function () {
      artifactElement.classList.remove('returned-pulse');
    }, 460);
  }

  function drawAtlasCanvas() {
    if (!atlasCanvas || !atlasCanvasContext) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;

    const scaledWidth = Math.floor(viewportWidth * dpr);
    const scaledHeight = Math.floor(viewportHeight * dpr);

    if (atlasCanvas.width !== scaledWidth || atlasCanvas.height !== scaledHeight) {
      atlasCanvas.width = scaledWidth;
      atlasCanvas.height = scaledHeight;
      atlasCanvas.style.width = viewportWidth + 'px';
      atlasCanvas.style.height = viewportHeight + 'px';
    }

    atlasCanvasContext.save();
    atlasCanvasContext.scale(dpr, dpr);
    atlasCanvasContext.clearRect(0, 0, viewportWidth, viewportHeight);

    const worldCenterX = viewportWidth / 2 + cameraState.currentPanX;
    const worldCenterY = viewportHeight / 2 + cameraState.currentPanY;
    const currentScale = cameraState.currentZoom;

    // Grade técnica ortogonal
    atlasCanvasContext.strokeStyle = 'rgba(14, 18, 24, 0.05)';
    atlasCanvasContext.lineWidth = 1;

    const majorGridStep = 180 * currentScale;
    if (majorGridStep > 24) {
      const offsetX = worldCenterX % majorGridStep;
      const offsetY = worldCenterY % majorGridStep;

      atlasCanvasContext.beginPath();
      for (let gridX = offsetX; gridX < viewportWidth; gridX += majorGridStep) {
        atlasCanvasContext.moveTo(gridX, 0);
        atlasCanvasContext.lineTo(gridX, viewportHeight);
      }
      for (let gridY = offsetY; gridY < viewportHeight; gridY += majorGridStep) {
        atlasCanvasContext.moveTo(0, gridY);
        atlasCanvasContext.lineTo(viewportWidth, gridY);
      }
      atlasCanvasContext.stroke();
    }

    // Eixos principais cartográficos passando por (0, 0)
    atlasCanvasContext.strokeStyle = 'rgba(14, 18, 24, 0.16)';
    atlasCanvasContext.lineWidth = 1;
    atlasCanvasContext.beginPath();
    atlasCanvasContext.moveTo(worldCenterX, 0);
    atlasCanvasContext.lineTo(worldCenterX, viewportHeight);
    atlasCanvasContext.moveTo(0, worldCenterY);
    atlasCanvasContext.lineTo(viewportWidth, worldCenterY);
    atlasCanvasContext.stroke();

    // Raios de anéis astronômicos concêntricos
    atlasCanvasContext.strokeStyle = 'rgba(14, 18, 24, 0.06)';
    atlasCanvasContext.lineWidth = 1;
    [260, 480, 720].forEach(function (radius) {
      atlasCanvasContext.beginPath();
      atlasCanvasContext.arc(worldCenterX, worldCenterY, radius * currentScale, 0, Math.PI * 2);
      atlasCanvasContext.stroke();
    });

    // Vetores de conexão entre o meridiano e cada objeto
    const projectKeys = Object.keys(PROJECT_COORDINATES);
    const relatedPartnerIds = (activeRelationProject && CONCEPTUAL_RELATIONS[activeRelationProject])
      ? CONCEPTUAL_RELATIONS[activeRelationProject].related.map(function (relation) { return relation.id; })
      : [];

    for (let i = 0; i < projectKeys.length; i += 1) {
      const pKey = projectKeys[i];
      const pLoc = PROJECT_COORDINATES[pKey];
      const pScreenX = worldCenterX + pLoc.coordX * currentScale;
      const pScreenY = worldCenterY + pLoc.coordY * currentScale;
      const labelClearance = 1 / Math.hypot(pLoc.coordX / 300, pLoc.coordY / 100);

      const isPrimary = pKey === activeRelationProject;
      const isPartner = relatedPartnerIds.indexOf(pKey) !== -1;

      if (activeRelationProject) {
        if (isPrimary || isPartner) {
          atlasCanvasContext.strokeStyle = 'rgba(217, 67, 46, 0.65)';
          atlasCanvasContext.lineWidth = 1.6;
          atlasCanvasContext.setLineDash([4, 4]);
        } else {
          atlasCanvasContext.strokeStyle = 'rgba(14, 18, 24, 0.08)';
          atlasCanvasContext.lineWidth = 0.8;
          atlasCanvasContext.setLineDash([2, 6]);
        }
      } else {
        atlasCanvasContext.strokeStyle = 'rgba(217, 67, 46, 0.32)';
        atlasCanvasContext.lineWidth = 1.2;
        atlasCanvasContext.setLineDash([4, 6]);
      }

      atlasCanvasContext.beginPath();
      atlasCanvasContext.moveTo(
        worldCenterX + pLoc.coordX * currentScale * labelClearance,
        worldCenterY + pLoc.coordY * currentScale * labelClearance
      );
      atlasCanvasContext.lineTo(pScreenX, pScreenY);
      atlasCanvasContext.stroke();

      // Ponto de mira no destino
      atlasCanvasContext.fillStyle = (activeRelationProject && !isPrimary && !isPartner)
        ? 'rgba(14, 18, 24, 0.25)'
        : 'rgba(217, 67, 46, 0.85)';
      atlasCanvasContext.beginPath();
      atlasCanvasContext.arc(pScreenX, pScreenY, isPrimary ? 4.5 : 3, 0, Math.PI * 2);
      atlasCanvasContext.fill();
    }
    atlasCanvasContext.setLineDash([]);

    if (activeRelationProject && CONCEPTUAL_RELATIONS[activeRelationProject]) {
      const sourceCoords = PROJECT_COORDINATES[activeRelationProject];
      const sScreenX = worldCenterX + sourceCoords.coordX * currentScale;
      const sScreenY = worldCenterY + sourceCoords.coordY * currentScale;
      const relList = CONCEPTUAL_RELATIONS[activeRelationProject].related;

      for (let rIdx = 0; rIdx < relList.length; rIdx += 1) {
        const targetId = relList[rIdx].id;
        const targetCoords = PROJECT_COORDINATES[targetId];
        if (!targetCoords) continue;

        const tScreenX = worldCenterX + targetCoords.coordX * currentScale;
        const tScreenY = worldCenterY + targetCoords.coordY * currentScale;

        const midX = (sScreenX + tScreenX) / 2;
        const midY = (sScreenY + tScreenY) / 2;
        const vecX = midX - worldCenterX;
        const vecY = midY - worldCenterY;
        const distToCenter = Math.hypot(vecX, vecY) || 1;
        const radialPush = Math.max(90 * currentScale, 55);

        const ctrlX = midX + (vecX / distToCenter) * radialPush;
        const ctrlY = midY + (vecY / distToCenter) * radialPush;

        atlasCanvasContext.strokeStyle = 'rgba(217, 67, 46, 0.72)';
        atlasCanvasContext.lineWidth = 1.8 * currentScale;
        atlasCanvasContext.setLineDash([5 * currentScale, 4 * currentScale]);
        atlasCanvasContext.beginPath();
        atlasCanvasContext.moveTo(sScreenX, sScreenY);
        atlasCanvasContext.quadraticCurveTo(ctrlX, ctrlY, tScreenX, tScreenY);
        atlasCanvasContext.stroke();

        atlasCanvasContext.fillStyle = '#d9432e';
        atlasCanvasContext.beginPath();
        atlasCanvasContext.arc(ctrlX, ctrlY, 3 * currentScale, 0, Math.PI * 2);
        atlasCanvasContext.fill();
      }
      atlasCanvasContext.setLineDash([]);
    }

    atlasCanvasContext.restore();
  }

  function runSpatialRenderLoop() {
    animationFrameHandle = null;

    if (!isPageVisible) {
      return;
    }

    if (isMotionReduced) {
      cameraState.currentPanX = cameraState.targetPanX;
      cameraState.currentPanY = cameraState.targetPanY;
      cameraState.currentZoom = cameraState.targetZoom;
      cameraState.isSettled = true;
      applyWorldTransform();
      drawAtlasCanvas();
      return; // Zero RAF quando idle em reduced motion
    }

    const lerpRate = pointerState.isDragging ? 0.35 : 0.22;
    const deltaPanX = cameraState.targetPanX - cameraState.currentPanX;
    const deltaPanY = cameraState.targetPanY - cameraState.currentPanY;
    const deltaZoom = cameraState.targetZoom - cameraState.currentZoom;

    cameraState.currentPanX += deltaPanX * lerpRate;
    cameraState.currentPanY += deltaPanY * lerpRate;
    cameraState.currentZoom += deltaZoom * lerpRate;

    applyWorldTransform();
    drawAtlasCanvas();

    const isPanSettled = Math.abs(deltaPanX) < 0.15 && Math.abs(deltaPanY) < 0.15;
    const isZoomSettled = Math.abs(deltaZoom) < 0.001;

    if (isPanSettled && isZoomSettled && !pointerState.isDragging) {
      cameraState.currentPanX = cameraState.targetPanX;
      cameraState.currentPanY = cameraState.targetPanY;
      cameraState.currentZoom = cameraState.targetZoom;
      cameraState.isSettled = true;
      applyWorldTransform();
      drawAtlasCanvas();
      // Não solicita novo frame: RAF para no estado idle!
    } else {
      cameraState.isSettled = false;
      requestCameraWakeup();
    }
  }

  // Captura de ponteiro: NUNCA capturar em pointerdown para não sequestrar cliques!
  // Somente capturar após ultrapassar limiar de 6px (arrasto confirmado)
  function handlePointerDown(pointerEvent) {
    if (pointerEvent.button !== 0 && pointerEvent.pointerType === 'mouse') {
      return;
    }
    pointerState.isPointerDown = true;
    pointerState.isDragging = false;
    pointerState.wasDragged = false;
    pointerState.activePointerId = pointerEvent.pointerId;
    pointerState.startPointerX = pointerEvent.clientX;
    pointerState.startPointerY = pointerEvent.clientY;
    pointerState.previousPointerX = pointerEvent.clientX;
    pointerState.previousPointerY = pointerEvent.clientY;
    pointerState.totalDragDistance = 0;
  }

  function handlePointerMove(pointerEvent) {
    if (!pointerState.isPointerDown) {
      return;
    }
    const movementX = pointerEvent.clientX - pointerState.previousPointerX;
    const movementY = pointerEvent.clientY - pointerState.previousPointerY;
    pointerState.previousPointerX = pointerEvent.clientX;
    pointerState.previousPointerY = pointerEvent.clientY;

    const distanceFromStart = Math.hypot(
      pointerEvent.clientX - pointerState.startPointerX,
      pointerEvent.clientY - pointerState.startPointerY
    );
    pointerState.totalDragDistance = distanceFromStart;

    if (distanceFromStart > 6 && !pointerState.isDragging) {
      pointerState.isDragging = true;
      pointerState.wasDragged = true;
      if (spatialViewport) {
        spatialViewport.classList.add('is-dragging');
        if (typeof spatialViewport.setPointerCapture === 'function' && pointerState.activePointerId !== null) {
          try {
            spatialViewport.setPointerCapture(pointerState.activePointerId);
          } catch (_) {}
        }
      }
    }

    if (pointerState.isDragging) {
      cameraState.targetPanX = clampValue(
        cameraState.targetPanX + movementX,
        cameraState.minPanX,
        cameraState.maxPanX
      );
      cameraState.targetPanY = clampValue(
        cameraState.targetPanY + movementY,
        cameraState.minPanY,
        cameraState.maxPanY
      );
      requestCameraWakeup();
    }
  }

  function handlePointerUp(pointerEvent) {
    if (!pointerState.isPointerDown) {
      return;
    }
    pointerState.isPointerDown = false;

    if (spatialViewport) {
      spatialViewport.classList.remove('is-dragging');
      if (typeof spatialViewport.releasePointerCapture === 'function' && pointerState.activePointerId !== null) {
        try {
          spatialViewport.releasePointerCapture(pointerState.activePointerId);
        } catch (_) {}
      }
    }
    pointerState.activePointerId = null;

    // Mantém flag wasDragged por breve instante para prevenir evento de clique concorrente após drag
    setTimeout(function () {
      pointerState.totalDragDistance = 0;
      pointerState.isDragging = false;
      pointerState.wasDragged = false;
    }, 60);
  }

  // Zoom ancorado na posição do cursor
  function handleWheelZoom(wheelEvent) {
    // Se leitura direta ou modal estiver aberta, não captura wheel
    if (isDirectReadingActive || document.querySelector('.atlas-overlay-modal[open]')) {
      return;
    }

    wheelEvent.preventDefault();
    const zoomMultiplier = Math.exp(-wheelEvent.deltaY * 0.0015);
    const newTargetZoom = clampValue(
      cameraState.targetZoom * zoomMultiplier,
      cameraState.minZoom,
      cameraState.maxZoom
    );

    const windowHalfWidth = (window.innerWidth || 1200) / 2;
    const windowHalfHeight = (window.innerHeight || 800) / 2;
    const cursorOffsetX = wheelEvent.clientX - windowHalfWidth - cameraState.targetPanX;
    const cursorOffsetY = wheelEvent.clientY - windowHalfHeight - cameraState.targetPanY;

    const zoomScaleRatio = newTargetZoom / cameraState.targetZoom;
    const adjustedPanX = cameraState.targetPanX - cursorOffsetX * (zoomScaleRatio - 1);
    const adjustedPanY = cameraState.targetPanY - cursorOffsetY * (zoomScaleRatio - 1);

    cameraState.targetZoom = newTargetZoom;
    cameraState.targetPanX = clampValue(adjustedPanX, cameraState.minPanX, cameraState.maxPanX);
    cameraState.targetPanY = clampValue(adjustedPanY, cameraState.minPanY, cameraState.maxPanY);

    if (isMotionReduced) {
      cameraState.currentZoom = cameraState.targetZoom;
      cameraState.currentPanX = cameraState.targetPanX;
      cameraState.currentPanY = cameraState.targetPanY;
    }
    requestCameraWakeup();
  }

  // Minimap: Frustum divide pan pelo zoom; Teleporte multiplica coordenadas pelo zoom
  function updateMinimapFrustum() {
    const frustumRectangle = document.getElementById('minimap-frustum');
    const coordReadout = document.getElementById('minimap-coord-readout');
    if (!frustumRectangle) return;

    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    const scaleFactor = cameraState.currentZoom || 1;

    // Dimensões do frustum no espaço do mundo (unidades mundiais)
    const visibleWidthWorld = viewportWidth / scaleFactor;
    const visibleHeightWorld = viewportHeight / scaleFactor;

    // Coordenada do centro da tela em unidades do mundo: pan dividido pelo zoom!
    const worldCenterX = -cameraState.currentPanX / scaleFactor;
    const worldCenterY = -cameraState.currentPanY / scaleFactor;

    const visibleLeftWorld = worldCenterX - visibleWidthWorld / 2;
    const visibleTopWorld = worldCenterY - visibleHeightWorld / 2;

    frustumRectangle.setAttribute('x', Math.round(visibleLeftWorld));
    frustumRectangle.setAttribute('y', Math.round(visibleTopWorld));
    frustumRectangle.setAttribute('width', Math.round(visibleWidthWorld));
    frustumRectangle.setAttribute('height', Math.round(visibleHeightWorld));

    if (coordReadout) {
      coordReadout.textContent = Math.round(worldCenterX) + ', ' + Math.round(worldCenterY);
    }
  }

  function handleMinimapClick(mouseEvent) {
    const minimapRadar = document.getElementById('minimap-radar');
    if (!minimapRadar) return;
    const boundingBox = minimapRadar.getBoundingClientRect();
    const clickRatioX = (mouseEvent.clientX - boundingBox.left) / boundingBox.width;
    const clickRatioY = (mouseEvent.clientY - boundingBox.top) / boundingBox.height;

    // Radar viewBox: -1000 a +1000 X (largura 2000), -800 a +800 Y (altura 1600)
    const targetWorldX = -1000 + clickRatioX * 2000;
    const targetWorldY = -800 + clickRatioY * 1600;

    // Teleporte: multiplica unidades mundiais pelo zoom para converter em pan screen-px!
    const currentScale = cameraState.targetZoom;
    cameraState.targetPanX = clampValue(-targetWorldX * currentScale, cameraState.minPanX, cameraState.maxPanX);
    cameraState.targetPanY = clampValue(-targetWorldY * currentScale, cameraState.minPanY, cameraState.maxPanY);

    if (isMotionReduced) {
      cameraState.currentPanX = cameraState.targetPanX;
      cameraState.currentPanY = cameraState.targetPanY;
    }
    requestCameraWakeup();
  }

  // Centralização de rotas sem criação espúria de entradas no histórico
  function navigateToRoute(routeHash, pushHistory) {
    const cleanHash = (routeHash || '').replace('#', '').trim();
    if (pushHistory !== false) {
      const fullHash = cleanHash ? '#' + cleanHash : '#atlas';
      if (window.location.hash !== fullHash) {
        window.history.pushState(null, '', fullHash);
      }
    }
    applyRouteState(cleanHash);
  }

  function applyRouteState(cleanHash) {
    const route = cleanHash || 'atlas';

    if (route === 'atlas') {
      closeAllRoomsInternal();
      exitDirectReadingInternal();
      closeAllOverlaysInternal();
      currentActiveRoom = null;
      isDirectReadingActive = false;
      updateDockActive(null);
      setSpatialViewportInert(false);
      clearConceptualRelation();

      if (savedAtlasCamera) {
        cameraState.targetPanX = savedAtlasCamera.panX;
        cameraState.targetPanY = savedAtlasCamera.panY;
        cameraState.targetZoom = savedAtlasCamera.zoom;
        if (isMotionReduced) {
          cameraState.currentPanX = savedAtlasCamera.panX;
          cameraState.currentPanY = savedAtlasCamera.panY;
          cameraState.currentZoom = savedAtlasCamera.zoom;
          cameraState.isSettled = true;
          applyWorldTransform();
          drawAtlasCanvas();
        } else {
          cameraState.isSettled = false;
          requestCameraWakeup();
        }
        savedAtlasCamera = null;
      } else {
        resetCameraToOverview(true);
      }

      if (lastFocusedRoomId) {
        const trigger = savedAtlasFocus && savedAtlasFocus.isConnected && !savedAtlasFocus.closest('[inert]') && savedAtlasFocus !== document.body ? savedAtlasFocus : document.querySelector('[data-enter-room="' + lastFocusedRoomId + '"]');
        if (trigger && typeof trigger.focus === 'function') {
          trigger.focus({ preventScroll: true });
        }
        const originArtifact = trigger && trigger.closest('.spatial-artifact');
        indicateReturnOnArtifact(originArtifact ? originArtifact.getAttribute('data-project') : lastFocusedRoomId);
        savedAtlasFocus = null;
      }
      announceLiveStatus('Retornou ao Atlas Espacial.');
      return;
    }

    if (route === 'leitura') {
      closeAllRoomsInternal();
      closeAllOverlaysInternal();
      enterDirectReadingInternal();
      // currentActiveRoom DEVE ser estritamente null ao entrar em leitura!
      currentActiveRoom = null;
      isDirectReadingActive = true;
      updateDockActive(null);
      setSpatialViewportInert(true);
      announceLiveStatus('Modo de leitura direta ativado.');
      return;
    }

    if (route === 'sobre' || route === 'contato' || route === 'indice') {
      closeAllRoomsInternal();
      exitDirectReadingInternal();
      currentActiveRoom = null;
      isDirectReadingActive = false;
      updateDockActive(null);
      setSpatialViewportInert(true);
      openOverlayModalInternal('overlay-' + route);
      return;
    }

    const resolvedProject = (route === 'laboratorio') ? 'financeiro' : route;
    if (PROJECT_COORDINATES[resolvedProject]) {
      if (!currentActiveRoom && !isDirectReadingActive) {
        savedAtlasFocus = document.activeElement;
        savedAtlasCamera = {
          panX: cameraState.currentPanX,
          panY: cameraState.currentPanY,
          zoom: cameraState.currentZoom
        };
      }
      clearConceptualRelation();
      exitDirectReadingInternal();
      closeAllOverlaysInternal();
      openRoomInternal(resolvedProject);
      document.documentElement.setAttribute('data-view', 'room');
      currentActiveRoom = resolvedProject;
      lastFocusedRoomId = resolvedProject;
      isDirectReadingActive = false;
      updateDockActive(resolvedProject);
      setSpatialViewportInert(true);
      announceLiveStatus('Entrou na sala do projeto: ' + resolvedProject);
      return;
    }

    // Rota desconhecida: volta para o atlas
    applyRouteState('atlas');
  }

  function setSpatialViewportInert(isInert) {
    if (!spatialViewport) return;
    if (isInert) {
      spatialViewport.setAttribute('inert', '');
      spatialViewport.setAttribute('aria-hidden', 'true');
    } else {
      spatialViewport.removeAttribute('inert');
      spatialViewport.removeAttribute('aria-hidden');
    }
  }

  function updateDockActive(activeProjectId) {
    document.querySelectorAll('.dock-item-btn').forEach(function (dockButton) {
      if (dockButton.getAttribute('data-dock-target') === activeProjectId) {
        dockButton.classList.add('active');
      } else {
        dockButton.classList.remove('active');
      }
    });
  }

  function openRoomInternal(projectId) {
    const targetRoomElement = document.getElementById('room-' + projectId);
    if (!targetRoomElement) return;

    if (animationFrameHandle) {
      cancelAnimationFrame(animationFrameHandle);
      animationFrameHandle = null;
    }

    const artElement = document.getElementById('artifact-' + projectId);
    let hasVisualOrigin = false;
    if (artElement) {
      const artRect = artElement.getBoundingClientRect();
      const vpW = window.innerWidth || 1200;
      const vpH = window.innerHeight || 800;
      if (artRect.width > 0 && artRect.right > 20 && artRect.left < vpW - 20 && artRect.bottom > 20 && artRect.top < vpH - 20) {
        const originX = Math.round(((artRect.left + artRect.width / 2) / vpW) * 100);
        const originY = Math.round(((artRect.top + artRect.height / 2) / vpH) * 100);
        targetRoomElement.style.setProperty('--room-origin-x', originX + '%');
        targetRoomElement.style.setProperty('--room-origin-y', originY + '%');
        targetRoomElement.classList.add('room-enter-expand');
        hasVisualOrigin = true;
      }
    }
    if (!hasVisualOrigin) {
      targetRoomElement.style.removeProperty('--room-origin-x');
      targetRoomElement.style.removeProperty('--room-origin-y');
      targetRoomElement.classList.remove('room-enter-expand');
    }

    document.querySelectorAll('.project-room').forEach(function (room) {
      if (room !== targetRoomElement) {
        room.classList.remove('is-active', 'room-enter-expand');
        room.hidden = true;
      }
    });

    targetRoomElement.hidden = false;
    targetRoomElement.classList.add('is-active');

    const backButton = targetRoomElement.querySelector('.room-back-btn');
    if (backButton && typeof backButton.focus === 'function') {
      backButton.focus();
    }
  }

  function closeAllRoomsInternal() {
    document.querySelectorAll('.project-room').forEach(function (room) {
      room.classList.remove('is-active', 'room-enter-expand');
      room.hidden = true;
    });
  }

  function enterDirectReadingInternal() {
    if (animationFrameHandle) {
      cancelAnimationFrame(animationFrameHandle);
      animationFrameHandle = null;
    }
    document.body.classList.remove('mode-atlas');
    document.body.classList.add('mode-direct');
    document.documentElement.setAttribute('data-view', 'direct');

    const directView = document.getElementById('direct-reading-view');
    if (directView) {
      directView.hidden = false;
    }

    const readingBtn = document.getElementById('btn-direct-reading');
    if (readingBtn) {
      readingBtn.setAttribute('aria-pressed', 'true');
      readingBtn.classList.add('active');
    }

    const returnBtn = document.getElementById('btn-return-to-atlas');
    if (returnBtn && typeof returnBtn.focus === 'function') {
      returnBtn.focus();
    }
  }

  function exitDirectReadingInternal() {
    document.body.classList.remove('mode-direct');
    document.body.classList.add('mode-atlas');
    document.documentElement.setAttribute('data-view', 'atlas');

    const directView = document.getElementById('direct-reading-view');
    if (directView) {
      directView.hidden = true;
    }

    const readingBtn = document.getElementById('btn-direct-reading');
    if (readingBtn) {
      readingBtn.setAttribute('aria-pressed', 'false');
      readingBtn.classList.remove('active');
    }
  }

  function openOverlayModalInternal(modalId) {
    closeAllOverlaysInternal();
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;

    if (typeof modalElement.showModal === 'function') {
      modalElement.showModal();
    } else {
      modalElement.setAttribute('open', '');
    }

    const container = document.getElementById('overlays-container');
    if (container) container.setAttribute('aria-hidden', 'false');

    const closeBtn = modalElement.querySelector('[data-action="close-overlay"]');
    if (closeBtn && typeof closeBtn.focus === 'function') {
      closeBtn.focus();
    }
  }

  function closeAllOverlaysInternal() {
    document.querySelectorAll('.atlas-overlay-modal').forEach(function (modal) {
      if (typeof modal.close === 'function' && modal.open) {
        modal.close();
      } else {
        modal.removeAttribute('open');
      }
    });

    const container = document.getElementById('overlays-container');
    if (container) container.setAttribute('aria-hidden', 'true');
  }

  function stepActiveRoom(stepDirection) {
    if (!currentActiveRoom) return;
    const currentIndex = PROJECT_SEQUENCE.indexOf(currentActiveRoom);
    if (currentIndex === -1) return;

    let targetIndex = stepDirection === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= PROJECT_SEQUENCE.length) targetIndex = 0;
    else if (targetIndex < 0) targetIndex = PROJECT_SEQUENCE.length - 1;

    navigateToRoute(PROJECT_SEQUENCE[targetIndex], true);
  }

  // Navegação por teclado & gestão de foco
  function initializeKeyboardNavigation() {
    window.addEventListener('keydown', function (keyboardEvent) {
      // 1. Esc SEMPRE fecha salas ou modais, MESMO com foco dentro de inputs/selects!
      if (keyboardEvent.key === 'Escape') {
        const openModal = document.querySelector('.atlas-overlay-modal[open]');
        if (openModal) {
          navigateToRoute('atlas', true);
          keyboardEvent.preventDefault();
          return;
        }
        if (currentActiveRoom) {
          navigateToRoute('atlas', true);
          keyboardEvent.preventDefault();
          return;
        }
        if (isDirectReadingActive) {
          navigateToRoute('atlas', true);
          keyboardEvent.preventDefault();
          return;
        }
      }

      // Se um campo de formulário estiver focado, não sequestra setas/teclas de digitação
      const activeTag = (document.activeElement && document.activeElement.tagName) || '';
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag)) {
        return;
      }

      // 2. Quando em sala ativa: setas navegam entre salas
      if (currentActiveRoom) {
        if (keyboardEvent.key === 'ArrowRight') {
          stepActiveRoom('next');
          keyboardEvent.preventDefault();
        } else if (keyboardEvent.key === 'ArrowLeft') {
          stepActiveRoom('prev');
          keyboardEvent.preventDefault();
        }
        return;
      }

      // 3. Em modo leitura ou modal aberta: NÃO capturar setas para permitir rolagem nativa!
      if (isDirectReadingActive || document.querySelector('.atlas-overlay-modal[open]')) {
        return;
      }

      // 4. No Atlas: setas deslocam câmera, +/- alteram zoom, 0 restaura enquadramento geral
      const panStep = keyboardEvent.shiftKey ? 140 : 50;
      if (keyboardEvent.key === 'ArrowRight') {
        cameraState.targetPanX = clampValue(cameraState.targetPanX - panStep, cameraState.minPanX, cameraState.maxPanX);
        requestCameraWakeup();
        keyboardEvent.preventDefault();
      } else if (keyboardEvent.key === 'ArrowLeft') {
        cameraState.targetPanX = clampValue(cameraState.targetPanX + panStep, cameraState.minPanX, cameraState.maxPanX);
        requestCameraWakeup();
        keyboardEvent.preventDefault();
      } else if (keyboardEvent.key === 'ArrowDown') {
        cameraState.targetPanY = clampValue(cameraState.targetPanY - panStep, cameraState.minPanY, cameraState.maxPanY);
        requestCameraWakeup();
        keyboardEvent.preventDefault();
      } else if (keyboardEvent.key === 'ArrowUp') {
        cameraState.targetPanY = clampValue(cameraState.targetPanY + panStep, cameraState.minPanY, cameraState.maxPanY);
        requestCameraWakeup();
        keyboardEvent.preventDefault();
      } else if (keyboardEvent.key === '+' || keyboardEvent.key === '=') {
        cameraState.targetZoom = clampValue(cameraState.targetZoom * 1.15, cameraState.minZoom, cameraState.maxZoom);
        requestCameraWakeup();
        keyboardEvent.preventDefault();
      } else if (keyboardEvent.key === '-' || keyboardEvent.key === '_') {
        cameraState.targetZoom = clampValue(cameraState.targetZoom / 1.15, cameraState.minZoom, cameraState.maxZoom);
        requestCameraWakeup();
        keyboardEvent.preventDefault();
      } else if (keyboardEvent.key === '0') {
        resetCameraToOverview();
        keyboardEvent.preventDefault();
      }
    });
  }

  function initializeMotionControls() {
    const motionButton = document.getElementById('motion-toggle-btn');
    const savedPreference = safeStorageGet(STORAGE_MOTION_KEY);
    const systemPrefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (savedPreference === 'paused' || (savedPreference === null && systemPrefersReduced)) {
      setMotionState(true, false);
    } else {
      setMotionState(false, false);
    }

    if (motionButton) {
      motionButton.addEventListener('click', function () {
        setMotionState(!isMotionReduced, true);
      });
    }

    if (window.matchMedia) {
      try {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addEventListener('change', function (mediaEvent) {
          if (safeStorageGet(STORAGE_MOTION_KEY) === null) {
            setMotionState(mediaEvent.matches, false);
          }
        });
      } catch (_) {}
    }
  }

  function setMotionState(reducedTarget, saveToStorage) {
    isMotionReduced = reducedTarget;
    const motionButton = document.getElementById('motion-toggle-btn');
    const motionStatusLabel = document.getElementById('motion-status-label');

    if (isMotionReduced) {
      document.documentElement.setAttribute('data-motion', 'paused');
      document.querySelectorAll('.room-enter-expand').forEach(function (room) {
        room.classList.remove('room-enter-expand');
      });
      if (motionButton) {
        motionButton.setAttribute('aria-pressed', 'true');
        motionButton.setAttribute('aria-label', 'Ativar animações de câmera e partículas');
        motionButton.classList.add('active');
      }
      if (motionStatusLabel) {
        motionStatusLabel.textContent = 'Ativar animações';
      }
      if (saveToStorage) {
        safeStorageSet(STORAGE_MOTION_KEY, 'paused');
      }
      cameraState.currentPanX = cameraState.targetPanX;
      cameraState.currentPanY = cameraState.targetPanY;
      cameraState.currentZoom = cameraState.targetZoom;
      cameraState.isSettled = true;
      applyWorldTransform();
      drawAtlasCanvas();
      announceLiveStatus('Animações pausadas.');
    } else {
      document.documentElement.setAttribute('data-motion', 'active');
      if (motionButton) {
        motionButton.setAttribute('aria-pressed', 'false');
        motionButton.setAttribute('aria-label', 'Pausar animações de câmera e partículas');
        motionButton.classList.remove('active');
      }
      if (motionStatusLabel) {
        motionStatusLabel.textContent = 'Pausar animações';
      }
      if (saveToStorage) {
        safeStorageSet(STORAGE_MOTION_KEY, 'active');
      }
      cameraState.isSettled = false;
      requestCameraWakeup();
      announceLiveStatus('Animações ativadas.');
    }
  }

  function initializeEmailCopy() {
    const copyButtons = document.querySelectorAll('[data-copy-email]');
    copyButtons.forEach(function (buttonElement) {
      buttonElement.addEventListener('click', async function (clickEvent) {
        clickEvent.preventDefault();
        let wasSuccessful = false;

        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(EMAIL_ADDRESS);
            wasSuccessful = true;
          } catch (_) {
            wasSuccessful = false;
          }
        }

        if (!wasSuccessful) {
          try {
            const hiddenTextarea = document.createElement('textarea');
            hiddenTextarea.value = EMAIL_ADDRESS;
            hiddenTextarea.setAttribute('readonly', '');
            hiddenTextarea.style.position = 'absolute';
            hiddenTextarea.style.left = '-9999px';
            document.body.appendChild(hiddenTextarea);
            hiddenTextarea.select();
            wasSuccessful = document.execCommand('copy');
            document.body.removeChild(hiddenTextarea);
          } catch (_) {
            wasSuccessful = false;
          }
        }

        const emailLiveElement = document.getElementById('email-live-status');
        if (wasSuccessful) {
          if (emailLiveElement) {
            emailLiveElement.textContent = 'E-mail ' + EMAIL_ADDRESS + ' copiado com sucesso!';
          }
          announceLiveStatus('E-mail copiado com sucesso.');
        } else {
          if (emailLiveElement) {
            emailLiveElement.textContent = 'Endereço: ' + EMAIL_ADDRESS;
          }
        }
      });
    });
  }

  // Demos Interativos das Salas
  function initializeYahcwDemo() {
    const toggleOverviewButton = document.getElementById('btn-toggle-overview');
    const cornerTrigger = document.getElementById('sim-corner-trigger');
    const dwmOverviewOverlay = document.getElementById('sim-dwm-overview');
    const closeOverviewButton = document.getElementById('btn-close-overview');
    const brightnessSlider = document.getElementById('sim-brightness-slider');
    const brightnessDisplay = document.getElementById('brightness-val-display');
    const screenPreview = document.getElementById('sim-screen-preview');
    const audioSelect = document.getElementById('sim-audio-select');
    const yahcwLogBox = document.getElementById('yahcw-log-box');
    const trayAudioLabel = document.getElementById('sim-tray-audio-label');
    const trayBrightLabel = document.getElementById('sim-tray-bright-label');

    function toggleDwmOverview() {
      if (!dwmOverviewOverlay) return;
      const isHidden = dwmOverviewOverlay.hidden;
      dwmOverviewOverlay.hidden = !isHidden;
      if (yahcwLogBox) {
        yahcwLogBox.innerHTML = isHidden
          ? '<code>[DWM] Hot Corner ativado: Visão Geral de Miniaturas aberta.</code>'
          : '<code>[DWM] Visão Geral fechada.</code>';
      }
    }

    if (toggleOverviewButton) toggleOverviewButton.addEventListener('click', toggleDwmOverview);
    if (cornerTrigger) {
      cornerTrigger.addEventListener('click', toggleDwmOverview);
      cornerTrigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          toggleDwmOverview();
          e.preventDefault();
        }
      });
    }
    if (closeOverviewButton) {
      closeOverviewButton.addEventListener('click', function () {
        if (dwmOverviewOverlay) dwmOverviewOverlay.hidden = true;
      });
    }

    const windowThumbnails = document.querySelectorAll('.overview-thumb');
    windowThumbnails.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        const winId = thumb.getAttribute('data-select-win');
        document.querySelectorAll('.sim-window-tile').forEach(function (tile) {
          tile.classList.remove('is-active');
        });
        const targetTile = document.getElementById('win-tile-' + winId);
        if (targetTile) targetTile.classList.add('is-active');
        if (dwmOverviewOverlay) dwmOverviewOverlay.hidden = true;
        if (yahcwLogBox) {
          yahcwLogBox.innerHTML = '<code>[DWM] Janela focada via miniatura: #' + winId + '</code>';
        }
      });
    });

    if (brightnessSlider && screenPreview) {
      brightnessSlider.addEventListener('input', function () {
        const val = brightnessSlider.value;
        if (brightnessDisplay) brightnessDisplay.textContent = val + '%';
        if (trayBrightLabel) trayBrightLabel.textContent = val + '%';
        const filterFactor = 0.3 + (val / 100) * 0.7;
        screenPreview.style.filter = 'brightness(' + filterFactor.toFixed(2) + ')';
        if (yahcwLogBox) {
          yahcwLogBox.innerHTML = '<code>[Filtro Simulado] Demonstração: VCP 0x10 -> ' + val + '% no monitor DDC/CI</code>';
        }
      });
    }

    if (audioSelect) {
      audioSelect.addEventListener('change', function () {
        const chosenAudio = audioSelect.value;
        if (trayAudioLabel) trayAudioLabel.textContent = chosenAudio;
        if (yahcwLogBox) {
          yahcwLogBox.innerHTML = '<code>[IPolicyConfig] Dispositivo comutado para ' + chosenAudio + ' (COM status S_OK)</code>';
        }
      });
    }
  }

  function initializeTuyaDemo() {
    const bulbElement = document.getElementById('tuya-bulb-element');
    const powerButton = document.getElementById('btn-toggle-lamp-power');
    const failureButton = document.getElementById('btn-simulate-tcp-failure');
    const restoreButton = document.getElementById('btn-restore-tcp');
    const badgeRouteMode = document.getElementById('badge-route-mode');
    const pingReadout = document.getElementById('ping-readout');
    const wireSegment = document.getElementById('wire-segment');
    const nodeTargetLabel = document.getElementById('node-target-label');
    const tuyaLogBox = document.getElementById('tuya-log-box');

    let isLampPowerOn = false;
    let isTcpActive = true;

    if (powerButton && bulbElement) {
      powerButton.addEventListener('click', function () {
        isLampPowerOn = !isLampPowerOn;
        if (isLampPowerOn) bulbElement.classList.add('is-on');
        else bulbElement.classList.remove('is-on');

        const activeRoute = isTcpActive ? 'TCP Socket (porta 6668)' : 'Tuya Cloud OpenAPI';
        if (tuyaLogBox) {
          tuyaLogBox.innerHTML += '<br><code>[COMANDO] Power state -> ' + (isLampPowerOn ? 'ON' : 'OFF') + ' via ' + activeRoute + '</code>';
          tuyaLogBox.scrollTop = tuyaLogBox.scrollHeight;
        }
      });
    }

    if (failureButton) {
      failureButton.addEventListener('click', function () {
        isTcpActive = false;
        if (badgeRouteMode) {
          badgeRouteMode.textContent = 'ROTA CONTINGÊNCIA: CLOUD OPENAPI';
          badgeRouteMode.className = 'route-badge cloud';
        }
        if (pingReadout) pingReadout.textContent = '148ms (simulado)';
        if (wireSegment) wireSegment.className = 'wire wire-active';
        if (nodeTargetLabel) nodeTargetLabel.textContent = 'Nuvem Tuya (OpenAPI Gateway)';

        if (tuyaLogBox) {
          tuyaLogBox.innerHTML += '<br><code>[SOCKET-ERROR] Timeout de ping local na porta 6668</code>' +
            '<br><code>[CONTINGENCY] Comutando para Tuya Cloud OpenAPI</code>' +
            '<br><code>[OPENAPI] Sessão estabelecida via OpenAPI (Latência simulada: 148ms)</code>';
          tuyaLogBox.scrollTop = tuyaLogBox.scrollHeight;
        }
      });
    }

    if (restoreButton) {
      restoreButton.addEventListener('click', function () {
        isTcpActive = true;
        if (badgeRouteMode) {
          badgeRouteMode.textContent = 'ROTA ATIVA: TCP LOCAL';
          badgeRouteMode.className = 'route-badge active';
        }
        if (pingReadout) pingReadout.textContent = '4ms (simulado)';
        if (wireSegment) wireSegment.className = 'wire wire-active';
        if (nodeTargetLabel) nodeTargetLabel.textContent = 'Lâmpada (192.168.1.104)';

        if (tuyaLogBox) {
          tuyaLogBox.innerHTML += '<br><code>[TCP-RECOVER] Barramento local restabelecido em 192.168.1.104:6668 (Latência simulada: 4ms)</code>';
          tuyaLogBox.scrollTop = tuyaLogBox.scrollHeight;
        }
      });
    }
  }

  function initializeGamingDemo() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    const metricAvgFps = document.getElementById('metric-avg-fps');
    const metricLowFps = document.getElementById('metric-low-fps');
    const metricFrametime = document.getElementById('metric-frametime');
    const metricMaxHitch = document.getElementById('metric-max-hitch');
    const gamingChartLine = document.getElementById('gaming-chart-line');
    const gamingJsonDisplay = document.getElementById('gaming-json-display');
    const copyJsonButton = document.getElementById('btn-copy-gaming-json');

    const syntheticPresets = {
      stable: {
        avgFps: '144.1 FPS',
        lowFps: '139.8 FPS',
        frameTime: '6.94 ms',
        maxHitch: '7.42 ms',
        pathData: 'M 0 50 Q 100 48 200 52 T 400 50',
        jsonPayload: '{\n  "timestamp_ns": 1730219842104500,\n  "present_count": 86420,\n  "avg_frame_time_ms": 6.94,\n  "one_percent_low_fps": 139.8,\n  "active_swapchain": "0x7ffd98b04a20",\n  "hitch_count_last_sec": 0\n}'
      },
      stutter: {
        avgFps: '112.4 FPS',
        lowFps: '28.5 FPS',
        frameTime: '8.89 ms',
        maxHitch: '35.40 ms',
        pathData: 'M 0 50 L 120 50 L 130 115 L 140 50 L 260 50 L 270 110 L 280 50 L 400 50',
        jsonPayload: '{\n  "timestamp_ns": 1730219842998100,\n  "present_count": 86840,\n  "avg_frame_time_ms": 8.89,\n  "one_percent_low_fps": 28.5,\n  "active_swapchain": "0x7ffd98b04a20",\n  "hitch_count_last_sec": 4,\n  "last_stutter_cause": "vkCreateGraphicsPipelines shader compile"\n}'
      },
      heavy: {
        avgFps: '59.8 FPS',
        lowFps: '54.2 FPS',
        frameTime: '16.72 ms',
        maxHitch: '19.80 ms',
        pathData: 'M 0 80 Q 80 75 160 85 T 320 80 T 400 85',
        jsonPayload: '{\n  "timestamp_ns": 1730219843650000,\n  "present_count": 87210,\n  "avg_frame_time_ms": 16.72,\n  "one_percent_low_fps": 54.2,\n  "active_swapchain": "0x7ffd98b04a20",\n  "hitch_count_last_sec": 0\n}'
      }
    };

    presetButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        presetButtons.forEach(function (b) { b.classList.remove('active'); });
        button.classList.add('active');
        const presetKey = button.getAttribute('data-preset');
        const data = syntheticPresets[presetKey];
        if (!data) return;

        if (metricAvgFps) metricAvgFps.textContent = data.avgFps;
        if (metricLowFps) metricLowFps.textContent = data.lowFps;
        if (metricFrametime) metricFrametime.textContent = data.frameTime;
        if (metricMaxHitch) metricMaxHitch.textContent = data.maxHitch;
        if (gamingChartLine) gamingChartLine.setAttribute('d', data.pathData);
        if (gamingJsonDisplay) gamingJsonDisplay.textContent = data.jsonPayload;
      });
    });

    if (copyJsonButton && gamingJsonDisplay) {
      copyJsonButton.addEventListener('click', async function () {
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(gamingJsonDisplay.textContent);
            copyJsonButton.textContent = 'Copiado!';
            setTimeout(function () { copyJsonButton.textContent = 'Copiar JSON'; }, 2000);
          } catch (_) {
            copyJsonButton.textContent = 'Falha ao copiar';
          }
        }
      });
    }
  }

  function initializePythonDemo() {
    const codeTabButtons = document.querySelectorAll('.code-tab-btn');
    codeTabButtons.forEach(function (tab) {
      tab.addEventListener('click', function () {
        codeTabButtons.forEach(function (b) { b.classList.remove('active'); });
        tab.classList.add('active');
        const targetIndex = tab.getAttribute('data-code-tab');

        document.querySelectorAll('.code-tab-content').forEach(function (panel) {
          panel.classList.remove('active');
          panel.hidden = true;
        });

        const activePanel = document.getElementById('code-panel-' + targetIndex);
        if (activePanel) {
          activePanel.classList.add('active');
          activePanel.hidden = false;
        }
      });
    });
  }

  function initializeSpotifastDemo() {
    const tokenTiles = document.querySelectorAll('[data-copy-hex]');
    const statusBox = document.getElementById('spotifast-copy-status');

    tokenTiles.forEach(function (tile) {
      tile.addEventListener('click', async function () {
        const hex = tile.getAttribute('data-copy-hex');
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(hex);
            if (statusBox) statusBox.innerHTML = '<code>Token copiado: ' + hex + '</code>';
          } catch (_) {
            if (statusBox) statusBox.innerHTML = '<code>Valor do token: ' + hex + '</code>';
          }
        } else {
          if (statusBox) statusBox.innerHTML = '<code>Valor do token: ' + hex + '</code>';
        }
      });
    });
  }

  function initializeFinanceDemo() {
    const financeForm = document.getElementById('finance-calc-form');
    const errorBox = document.getElementById('finance-error-box');
    const finalBalanceElement = document.getElementById('res-final-balance');
    const totalContributedElement = document.getElementById('res-total-contributed');
    const totalInterestElement = document.getElementById('res-total-interest');
    const monthlyRateElement = document.getElementById('res-monthly-rate');
    const chartSvg = document.getElementById('finance-chart-svg');

    function formatCurrencyReal(amount) {
      return 'R$ ' + Number(amount).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    function renderFinanceChart(pointsList, totalContributed, finalBalance) {
      if (!chartSvg) return;
      const chartWidth = 500;
      const chartHeight = 200;
      const padX = 40;
      const padY = 25;

      const plotWidth = chartWidth - padX * 2;
      const plotHeight = chartHeight - padY * 2;

      const maxY = Math.max(finalBalance * 1.08, 100);
      const maxMonth = pointsList[pointsList.length - 1].month || 1;

      let balancePath = '';
      let contributedPath = '';
      let areaFillPath = '';

      for (let i = 0; i < pointsList.length; i += 1) {
        const pt = pointsList[i];
        const px = padX + (pt.month / maxMonth) * plotWidth;
        const pyBalance = chartHeight - padY - (pt.balance / maxY) * plotHeight;
        const pyContrib = chartHeight - padY - (pt.contributed / maxY) * plotHeight;

        if (i === 0) {
          balancePath += 'M ' + px.toFixed(1) + ' ' + pyBalance.toFixed(1);
          contributedPath += 'M ' + px.toFixed(1) + ' ' + pyContrib.toFixed(1);
          areaFillPath += 'M ' + px.toFixed(1) + ' ' + (chartHeight - padY) + ' L ' + px.toFixed(1) + ' ' + pyBalance.toFixed(1);
        } else {
          balancePath += ' L ' + px.toFixed(1) + ' ' + pyBalance.toFixed(1);
          contributedPath += ' L ' + px.toFixed(1) + ' ' + pyContrib.toFixed(1);
          areaFillPath += ' L ' + px.toFixed(1) + ' ' + pyBalance.toFixed(1);
        }
      }

      areaFillPath += ' L ' + (chartWidth - padX).toFixed(1) + ' ' + (chartHeight - padY) + ' Z';
      const baselineY = chartHeight - padY;
      const midLineY = padY + plotHeight / 2;

      chartSvg.innerHTML =
        '<defs>' +
        '  <linearGradient id="chartGradientAreaV2" x1="0" y1="0" x2="0" y2="1">' +
        '    <stop offset="0%" stop-color="#d9432e" stop-opacity="0.25" />' +
        '    <stop offset="100%" stop-color="#d9432e" stop-opacity="0.02" />' +
        '  </linearGradient>' +
        '</defs>' +
        '<line x1="' + padX + '" y1="' + baselineY + '" x2="' + (chartWidth - padX) + '" y2="' + baselineY + '" stroke="#0e1218" stroke-width="1.2" />' +
        '<line x1="' + padX + '" y1="' + padY + '" x2="' + padX + '" y2="' + baselineY + '" stroke="#0e1218" stroke-width="1.2" />' +
        '<line x1="' + padX + '" y1="' + midLineY.toFixed(1) + '" x2="' + (chartWidth - padX) + '" y2="' + midLineY.toFixed(1) + '" stroke="#0e1218" stroke-width="0.5" stroke-dasharray="3 3" stroke-opacity="0.2" />' +
        '<path d="' + areaFillPath + '" fill="url(#chartGradientAreaV2)" />' +
        '<path d="' + contributedPath + '" fill="none" stroke="#5c6779" stroke-width="1.8" stroke-dasharray="4 4" />' +
        '<path d="' + balancePath + '" fill="none" stroke="#d9432e" stroke-width="2.5" />' +
        '<circle cx="' + (chartWidth - padX) + '" cy="' + (chartHeight - padY - (finalBalance / maxY) * plotHeight).toFixed(1) + '" r="4.5" fill="#d9432e" />';
    }

    function runCalculationWithParameters(params) {
      if (!window.PortfolioFinance || typeof window.PortfolioFinance.calculate !== 'function') {
        if (errorBox) {
          errorBox.textContent = 'Mecanismo de cálculo não disponível.';
          errorBox.hidden = false;
        }
        return false;
      }

      // Validação estrita: prazos fracionários devem ser rejeitados preservando o gráfico anterior!
      if (!Number.isInteger(params.months) || params.months < 1) {
        if (errorBox) {
          errorBox.textContent = 'Prazo em meses deve ser um número inteiro positivo (ex: 12). Valores fracionários são rejeitados.';
          errorBox.hidden = false;
        }
        return false;
      }

      try {
        const result = window.PortfolioFinance.calculate(params);
        if (errorBox) {
          errorBox.textContent = '';
          errorBox.hidden = true;
        }
        if (finalBalanceElement) finalBalanceElement.textContent = formatCurrencyReal(result.finalBalance);
        if (totalContributedElement) totalContributedElement.textContent = formatCurrencyReal(result.totalContributed);
        if (totalInterestElement) totalInterestElement.textContent = formatCurrencyReal(result.interest);
        if (monthlyRateElement) {
          monthlyRateElement.textContent = (result.monthlyRate * 100).toFixed(2) + '% a.m.';
        }
        renderFinanceChart(result.points, result.totalContributed, result.finalBalance);
        return true;
      } catch (err) {
        if (errorBox) {
          errorBox.textContent = err.message || 'Parâmetros inválidos para o cálculo.';
          errorBox.hidden = false;
        }
        // Preserva o gráfico e os resultados anteriores intactos!
        return false;
      }
    }

    if (financeForm) {
      financeForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const initialRaw = document.getElementById('fin-initial-amount')?.value.trim();
        const contribRaw = document.getElementById('fin-monthly-contrib')?.value.trim();
        const rateRaw = document.getElementById('fin-annual-rate')?.value.trim();
        const monthsRaw = document.getElementById('fin-months')?.value.trim();

        if (!initialRaw || !contribRaw || !rateRaw || !monthsRaw) {
          if (errorBox) {
            errorBox.textContent = 'Preencha todos os campos antes de calcular.';
            errorBox.hidden = false;
          }
          return;
        }

        const monthsNum = Number(monthsRaw);
        runCalculationWithParameters({
          initialAmount: Number(initialRaw),
          monthlyContribution: Number(contribRaw),
          annualRatePercent: Number(rateRaw),
          months: monthsNum
        });
      });

      // Execução canônica inicial com caso de referência: 1000, 100, 12, 12 -> R$ 2.384,65
      runCalculationWithParameters({
        initialAmount: 1000,
        monthlyContribution: 100,
        annualRatePercent: 12,
        months: 12
      });
    }
  }

  function initializeEventListeners() {
    if (spatialViewport) {
      spatialViewport.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
      spatialViewport.addEventListener('wheel', handleWheelZoom, { passive: false });
      spatialViewport.addEventListener('dblclick', function () {
        resetCameraToOverview();
      });
    }

    // Minimapa
    const minimapRadar = document.getElementById('minimap-radar');
    if (minimapRadar) {
      minimapRadar.addEventListener('click', handleMinimapClick);
      minimapRadar.addEventListener('keydown', function (keyboardEvent) {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ' || keyboardEvent.key === 'Spacebar') {
          keyboardEvent.preventDefault();
          resetCameraToOverview();
          announceLiveStatus('Enquadramento geral restaurado pelo radar.');
        }
      });
    }

    document.querySelectorAll('.spatial-artifact').forEach(function (artifact) {
      const projId = artifact.getAttribute('data-project');
      const trigger = artifact.querySelector('.artifact-trigger');

      function onEnter() {
        if (!currentActiveRoom && !isDirectReadingActive) {
          setConceptualRelation(projId);
        }
      }

      function onLeave(pointerEvent) {
        if (pointerEvent && pointerEvent.relatedTarget && artifact.contains(pointerEvent.relatedTarget)) {
          return;
        }
        if (!currentActiveRoom && !isDirectReadingActive) {
          if (!artifact.contains(document.activeElement)) {
            scheduleRelationDismissal();
          }
        }
      }

      artifact.addEventListener('pointerenter', onEnter);
      artifact.addEventListener('pointerleave', onLeave);

      if (trigger) {
        trigger.addEventListener('focus', onEnter);
        trigger.addEventListener('blur', function () {
          if (!currentActiveRoom && !isDirectReadingActive) {
            setTimeout(function () {
              const activeEl = document.activeElement;
              const banner = document.getElementById('atlas-relation-banner');
              if (activeEl && (artifact.contains(activeEl) || (banner && banner.contains(activeEl)))) {
                return;
              }
              if (activeRelationProject === projId) {
                clearConceptualRelation();
              }
            }, 15);
          }
        });
      }
    });

    const relationBanner = document.getElementById('atlas-relation-banner');
    if (relationBanner) {
      relationBanner.setAttribute('inert', '');
      relationBanner.addEventListener('pointerenter', cancelRelationDismissal);
      relationBanner.addEventListener('pointerleave', scheduleRelationDismissal);
      relationBanner.addEventListener('focusin', cancelRelationDismissal);
      relationBanner.addEventListener('focusout', scheduleRelationDismissal);
    }

    // Controles de Zoom do Dock
    const dockOverview = document.getElementById('btn-dock-overview');
    if (dockOverview) {
      dockOverview.addEventListener('click', function () {
        navigateToRoute('atlas', true);
        resetCameraToOverview(true);
      });
    }

    const dockZoomIn = document.getElementById('btn-dock-zoom-in');
    if (dockZoomIn) {
      dockZoomIn.addEventListener('click', function () {
        cameraState.targetZoom = clampValue(cameraState.targetZoom * 1.25, cameraState.minZoom, cameraState.maxZoom);
        requestCameraWakeup();
      });
    }

    const dockZoomOut = document.getElementById('btn-dock-zoom-out');
    if (dockZoomOut) {
      dockZoomOut.addEventListener('click', function () {
        cameraState.targetZoom = clampValue(cameraState.targetZoom / 1.25, cameraState.minZoom, cameraState.maxZoom);
        requestCameraWakeup();
      });
    }

    // Modo Leitura Direta
    const directBtn = document.getElementById('btn-direct-reading');
    if (directBtn) {
      directBtn.addEventListener('click', function () {
        if (isDirectReadingActive) {
          navigateToRoute('atlas', true);
        } else {
          navigateToRoute('leitura', true);
        }
      });
    }

    const returnAtlasBtn = document.getElementById('btn-return-to-atlas');
    if (returnAtlasBtn) {
      returnAtlasBtn.addEventListener('click', function () {
        navigateToRoute('atlas', true);
      });
    }

    const returnAtlasFooterBtn = document.getElementById('btn-return-to-atlas-footer');
    if (returnAtlasFooterBtn) {
      returnAtlasFooterBtn.addEventListener('click', function () {
        navigateToRoute('atlas', true);
      });
    }

    const brandHomeLink = document.getElementById('brand-home-link');
    if (brandHomeLink) {
      brandHomeLink.addEventListener('click', function (e) {
        e.preventDefault();
        navigateToRoute('atlas', true);
        resetCameraToOverview();
      });
    }

    // Botões do Header
    const btnIndice = document.getElementById('btn-header-indice');
    if (btnIndice) {
      btnIndice.addEventListener('click', function () {
        navigateToRoute('indice', true);
      });
    }

    const btnSobre = document.getElementById('btn-header-sobre');
    if (btnSobre) {
      btnSobre.addEventListener('click', function () {
        navigateToRoute('sobre', true);
      });
    }

    const btnContato = document.getElementById('btn-header-contato');
    if (btnContato) {
      btnContato.addEventListener('click', function () {
        navigateToRoute('contato', true);
      });
    }

    // Fechar Overlays
    const closeOverlayBtns = document.querySelectorAll('[data-action="close-overlay"]');
    closeOverlayBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigateToRoute('atlas', true);
      });
    });

    // Pular de Índice para Sala
    const indiceJumps = document.querySelectorAll('[data-jump-room]');
    indiceJumps.forEach(function (jump) {
      jump.addEventListener('click', function () {
        const target = jump.getAttribute('data-jump-room');
        navigateToRoute(target, true);
      });
    });

    // CLIQUE REAL nos artefatos espaciais: somente abre se NÃO foi arrasto (>6px)
    const enterButtons = document.querySelectorAll('[data-enter-room]');
    enterButtons.forEach(function (btn) {
      btn.addEventListener('click', function (clickEvent) {
        if (clickEvent.detail !== 0 && (pointerState.totalDragDistance > 6 || pointerState.wasDragged)) {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          return;
        }
        const target = btn.getAttribute('data-enter-room');
        navigateToRoute(target, true);
      });
    });

    // Clique no artigo como hit-target complementar
    const spatialArtifacts = document.querySelectorAll('.spatial-artifact');
    spatialArtifacts.forEach(function (artifact) {
      artifact.addEventListener('click', function (clickEvent) {
        if (clickEvent.detail !== 0 && (pointerState.totalDragDistance > 6 || pointerState.wasDragged)) {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          return;
        }
        if (clickEvent.target.closest('button')) {
          return;
        }
        const target = artifact.getAttribute('data-project');
        if (target) {
          navigateToRoute(target, true);
        }
      });
    });

    // Dock: Botões de Projeto
    const dockButtons = document.querySelectorAll('[data-dock-target]');
    dockButtons.forEach(function (dockBtn) {
      dockBtn.addEventListener('click', function () {
        const target = dockBtn.getAttribute('data-dock-target');
        navigateToRoute(target, true);
      });
    });

    // Voltar da Sala
    const backButtons = document.querySelectorAll('[data-action="exit-room"]');
    backButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigateToRoute('atlas', true);
      });
    });

    // Passo entre Salas (Anterior / Próximo)
    const stepButtons = document.querySelectorAll('[data-step-dir]');
    stepButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const dir = btn.getAttribute('data-step-dir');
        stepActiveRoom(dir);
      });
    });

    // Histórico Back/Forward do navegador
    window.addEventListener('popstate', function () {
      applyRouteState(window.location.hash.replace('#', ''));
    });

    // Redimensionamento de Janela
    window.addEventListener('resize', function () {
      if (!currentActiveRoom && !isDirectReadingActive) {
        const fitZoom = calculateOverviewFit();
        cameraState.targetZoom = fitZoom;
        if (isMotionReduced) {
          cameraState.currentZoom = fitZoom;
        }
      }
      requestCameraWakeup();
    });

    // Visibilidade da Página (Zero RAF ao ocultar aba)
    document.addEventListener('visibilitychange', function () {
      isPageVisible = !document.hidden;
      document.documentElement.toggleAttribute('data-page-hidden', !isPageVisible);
      if (!isPageVisible) {
        document.querySelectorAll('.room-enter-expand').forEach(function (room) {
          room.classList.remove('room-enter-expand');
        });
        if (animationFrameHandle) cancelAnimationFrame(animationFrameHandle);
        animationFrameHandle = null;
      }
      if (isPageVisible) {
        requestCameraWakeup();
      }
    });
  }

  function initializeAtlasApp() {
    initializeMotionControls();
    initializeEmailCopy();
    initializeKeyboardNavigation();
    initializeYahcwDemo();
    initializeTuyaDemo();
    initializeGamingDemo();
    initializePythonDemo();
    initializeSpotifastDemo();
    initializeFinanceDemo();
    initializeEventListeners();

    // Inicialização da Câmera com FIT real
    const initialFitZoom = calculateOverviewFit();
    cameraState.currentZoom = initialFitZoom;
    cameraState.targetZoom = initialFitZoom;
    cameraState.currentPanX = 0;
    cameraState.currentPanY = 0;
    cameraState.targetPanX = 0;
    cameraState.targetPanY = 0;

    applyWorldTransform();
    drawAtlasCanvas();

    // Rota inicial (se houver hash)
    if (window.location.hash && window.location.hash !== '#atlas') {
      applyRouteState(window.location.hash.replace('#', ''));
    } else {
      requestCameraWakeup();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAtlasApp);
  } else {
    initializeAtlasApp();
  }
})();
