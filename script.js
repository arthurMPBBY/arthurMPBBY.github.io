/**
 * Arthur Kadri — Portfólio de Dados, Finanças & Sistemas
 * Arquitetura de Navegação Editorial com Rolagem Nativa & Íris Monumental
 */
(function () {
  'use strict';

  // Constantes e Metadados
  const EMAIL_ADDRESS = 'arthurkadri968@gmail.com';
  const STORAGE_MOTION_KEY = 'arthur_portfolio_motion';
  const PROJECT_SEQUENCE = ['cota', 'financeiro', 'yahcw', 'tuya', 'gaming', 'python', 'spotifast'];

  // Estados de Interface e Histórico
  let currentActiveRoom = null;
  let isDirectReadingActive = false;
  let isMotionReduced = false;
  let returnTargetRoute = 'atlas';
  let returnTargetScroll = 0;
  let returnTargetFocus = null;
  const roomTriggers = new Map();
  const roomScrolls = new Map();
  let savedModalPreviousRoute = null;
  let savedModalTrigger = null;

  // Elementos DOM Principais
  const spatialViewport = document.getElementById('spatial-viewport');
  const liveAnnouncer = document.getElementById('live-announcer');

  function announceLiveStatus(message) {
    if (liveAnnouncer) {
      liveAnnouncer.textContent = message;
    }
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

  function formatBRL(amount) {
    return 'R$ ' + Number(amount).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // =========================================================================
  // 1. HERO FRAMING & ZOOM ÓPTICO COM ROLAGEM NATIVA
  // =========================================================================

  function dispatchHeroFraming() {
    const isMobile = window.innerWidth <= 768;
    // Desktop: íris monumental à direita (0.73, 0.50, scale 1.20)
    // Mobile: íris centralizada no subcontainer de 42svh (0.50, 0.58, scale 1.05)
    const framing = isMobile
      ? { centerX: 0.50, centerY: 0.58, scale: 1.05 }
      : { centerX: 0.73, centerY: 0.50, scale: 1.20 };

    window.dispatchEvent(new CustomEvent('portfolio:opticsinput', {
      detail: { framing: framing }
    }));
  }

  function handleHeroScroll() {
    if (isMotionReduced) return;
    if (!spatialViewport) return;
    const heroRect = spatialViewport.getBoundingClientRect();
    const heroHeight = spatialViewport.offsetHeight || window.innerHeight;
    // Progresso suave quando o hero rola para cima (0 no topo, 1 ao sair)
    const scrollRatio = Math.max(0, Math.min(1, -heroRect.top / heroHeight));
    // Aproximação curta (0.0 até 0.10) sem captura de wheel
    const nextZoom = scrollRatio * 0.10;

    window.dispatchEvent(new CustomEvent('portfolio:opticsinput', {
      detail: { irisZoom: nextZoom }
    }));
  }

  // =========================================================================
  // 2. PRÉVIA FINANCEIRA NO CAPÍTULO 2 (VIA finance-lab.js API)
  // =========================================================================

  function initializeFinancePreview() {
    if (!window.PortfolioFinance || typeof window.PortfolioFinance.calculate !== 'function') {
      return;
    }

    try {
      // Caso canônico de validação da simulação
      const params = {
        initialAmount: 1000,
        monthlyContribution: 100,
        annualRatePercent: 12,
        months: 12
      };
      const result = window.PortfolioFinance.calculate(params);

      const elFinal = document.getElementById('fp-final-balance');
      const elContrib = document.getElementById('fp-total-contributed');
      const elInterest = document.getElementById('fp-total-interest');
      if (elFinal) elFinal.textContent = formatBRL(result.finalBalance);
      if (elContrib) elContrib.textContent = formatBRL(result.totalContributed);
      if (elInterest) elInterest.textContent = formatBRL(result.interest);

      const barsTrack = document.getElementById('fp-bars-track');
      if (barsTrack && result.points && result.points.length > 0) {
        barsTrack.innerHTML = '';
        const maxVal = result.finalBalance;
        result.points.forEach(function (pt) {
          const heightPercent = Math.max(6, (pt.balance / maxVal) * 100);
          const bar = document.createElement('div');
          bar.className = 'chart-bar';
          bar.style.height = heightPercent.toFixed(1) + '%';
          bar.setAttribute('title', 'Mês ' + pt.month + ': Saldo ' + formatBRL(pt.balance) + ' (Aportado ' + formatBRL(pt.contributed) + ')');
          barsTrack.appendChild(bar);
        });
      }
    } catch (err) {
      console.warn('Erro ao inicializar prévia do finance-lab:', err);
    }
  }

  // =========================================================================
  // 3. REVELAÇÃO SUAVE EM ROLAGEM NATIVA (SCROLL REVEAL - FAIL OPEN)
  // =========================================================================

  function initializeScrollReveal() {
    const revealTargets = document.querySelectorAll('.chapter-feature, .systems-tools-section, .journey-footer');

    if (!('IntersectionObserver' in window) || isMotionReduced) {
      revealTargets.forEach(function (el) {
        el.classList.add('is-revealed');
      });
      return;
    }

    revealTargets.forEach(function (el) {
      el.classList.add('reveal-on-scroll', 'will-reveal');
    });

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('will-reveal');
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  }

  // =========================================================================
  // 4. GESTÃO DE ROTAS & RESTAURAÇÃO DE SCROLL E FOCO
  // =========================================================================

  function restoreReturnState(exitingRoomId) {
    let focusToRestore = returnTargetFocus;
    if (!focusToRestore || focusToRestore === document.body || !focusToRestore.isConnected) {
      if (exitingRoomId) {
        focusToRestore = roomTriggers.get(exitingRoomId) || document.querySelector('[data-enter-room="' + exitingRoomId + '"]');
      }
    }
    let scrollToRestore = returnTargetScroll;
    if ((scrollToRestore === 0 || typeof scrollToRestore !== 'number') && exitingRoomId && roomScrolls.has(exitingRoomId)) {
      scrollToRestore = roomScrolls.get(exitingRoomId);
    }
    const applyState = function () {
      window.scrollTo({ top: scrollToRestore, behavior: 'instant' });
      if (focusToRestore && typeof focusToRestore.focus === 'function' && focusToRestore.isConnected) {
        focusToRestore.focus({ preventScroll: true });
      }
    };
    applyState();
    setTimeout(applyState, 50);
    setTimeout(applyState, 150);
    returnTargetFocus = null;
  }

  function navigateToRoute(routeHash, pushHistory) {
    const cleanHash = (routeHash || '').replace('#', '').trim();
    const prevRoute = (window.location.hash || '').replace('#', '').trim() || 'atlas';
    if (pushHistory !== false) {
      const fullHash = cleanHash ? '#' + cleanHash : '#atlas';
      if (window.location.hash !== fullHash) {
        window.history.pushState(null, '', fullHash);
      }
    }
    applyRouteState(cleanHash, prevRoute);
  }

  function applyRouteState(cleanHash, optPreviousRoute) {
    const rawRoute = cleanHash || 'atlas';
    const route = (rawRoute === 'laboratorio') ? 'financeiro' : rawRoute;

    // Rota #projetos (âncora suave na home ou retorno de sala)
    if (route === 'projetos') {
      const wasInRoom = Boolean(currentActiveRoom);
      const exitingRoom = currentActiveRoom;
      closeAllRoomsInternal();
      if (isDirectReadingActive) {
        exitDirectReadingInternal();
      }
      closeAllOverlaysInternal();
      document.documentElement.setAttribute('data-view', 'atlas');
      document.body.classList.add('mode-atlas');
      document.body.classList.remove('mode-room');
      currentActiveRoom = null;
      isDirectReadingActive = false;

      if (wasInRoom) {
        restoreReturnState(exitingRoom);
      } else {
        const anchor = document.getElementById('projetos');
        if (anchor) {
          anchor.scrollIntoView({ behavior: isMotionReduced ? 'instant' : 'smooth', block: 'start' });
        }
      }
      announceLiveStatus('Seção de projetos selecionada.');
      return;
    }

    // Rota #atlas (Home principal)
    if (route === 'atlas' || route === '') {
      const wasInRoom = Boolean(currentActiveRoom);
      const exitingRoom = currentActiveRoom;
      closeAllRoomsInternal();
      exitDirectReadingInternal();
      closeAllOverlaysInternal();
      currentActiveRoom = null;
      isDirectReadingActive = false;

      document.documentElement.setAttribute('data-view', 'atlas');
      document.body.classList.add('mode-atlas');
      document.body.classList.remove('mode-room');

      // Restaura o scroll e foco salvos ao sair da sala
      if (wasInRoom) {
        restoreReturnState(exitingRoom);
      }
      announceLiveStatus('Retornou à página inicial.');
      return;
    }

    // Rota #leitura (Modo Direto)
    if (route === 'leitura') {
      const wasInRoom = Boolean(currentActiveRoom);
      const exitingRoom = currentActiveRoom;
      if (!currentActiveRoom && !isDirectReadingActive) {
        returnTargetScroll = window.scrollY || document.documentElement.scrollTop || 0;
        returnTargetFocus = document.activeElement;
        returnTargetRoute = 'atlas';
      }
      closeAllRoomsInternal();
      closeAllOverlaysInternal();
      enterDirectReadingInternal();
      currentActiveRoom = null;
      isDirectReadingActive = true;
      document.documentElement.setAttribute('data-view', 'direct');
      if (wasInRoom) {
        restoreReturnState(exitingRoom);
      }
      announceLiveStatus('Modo de leitura direta ativado.');
      return;
    }

    // Rotas de Modais (#contato, #sobre, #indice)
    if (route === 'sobre' || route === 'contato' || route === 'indice') {
      savedModalTrigger = document.activeElement;
      savedModalPreviousRoute = currentActiveRoom || (isDirectReadingActive ? 'leitura' : (((window.location.hash || '').replace('#', '').trim()) || 'atlas'));
      openOverlayModalInternal('overlay-' + route);
      return;
    }

    // Rotas de Salas de Projetos
    if (PROJECT_SEQUENCE.indexOf(route) !== -1) {
      if (!currentActiveRoom) {
        const curScroll = window.scrollY || document.documentElement.scrollTop || 0;
        const curFocus = document.activeElement;
        returnTargetScroll = curScroll;
        returnTargetFocus = curFocus;
        if (curFocus && curFocus !== document.body && curFocus.isConnected) {
          roomTriggers.set(route, curFocus);
        } else if (!roomTriggers.has(route)) {
          const defaultBtn = document.querySelector('[data-enter-room="' + route + '"]');
          if (defaultBtn) roomTriggers.set(route, defaultBtn);
        }
        if (curScroll > 0) {
          roomScrolls.set(route, curScroll);
        }
        if (isDirectReadingActive) {
          returnTargetRoute = 'leitura';
        } else {
          const prevHash = optPreviousRoute || (window.location.hash || '').replace('#', '').trim();
          returnTargetRoute = (prevHash === 'projetos') ? 'projetos' : 'atlas';
        }
      }
      exitDirectReadingInternal();
      closeAllOverlaysInternal();
      openRoomInternal(route);
      document.documentElement.setAttribute('data-view', 'room');
      document.body.classList.add('mode-room');
      document.body.classList.remove('mode-atlas');
      currentActiveRoom = route;
      announceLiveStatus('Entrou na sala do projeto: ' + route);
      return;
    }

    // Rota desconhecida: fallback para atlas
    applyRouteState('atlas');
  }

  function exitCurrentRoom(pushHistory) {
    const targetRoute = returnTargetRoute || 'atlas';
    const exitingRoom = currentActiveRoom;

    closeAllRoomsInternal();
    currentActiveRoom = null;

    if (targetRoute === 'leitura') {
      enterDirectReadingInternal();
      isDirectReadingActive = true;
      document.documentElement.setAttribute('data-view', 'direct');
      if (pushHistory !== false) {
        window.history.pushState(null, '', '#leitura');
      }
    } else {
      exitDirectReadingInternal();
      isDirectReadingActive = false;
      document.documentElement.setAttribute('data-view', 'atlas');
      document.body.classList.add('mode-atlas');
      document.body.classList.remove('mode-room');
      const fullHash = (targetRoute === 'projetos') ? '#projetos' : '#atlas';
      if (pushHistory !== false && window.location.hash !== fullHash) {
        window.history.pushState(null, '', fullHash);
      }
      restoreReturnState(exitingRoom);
    }
    announceLiveStatus('Retornou à navegação.');
  }

  function handleOverlayClose() {
    const triggerToRestore = savedModalTrigger;
    const previousRoute = savedModalPreviousRoute || currentActiveRoom || (isDirectReadingActive ? 'leitura' : 'atlas');

    closeAllOverlaysInternal();

    if (previousRoute && PROJECT_SEQUENCE.indexOf(previousRoute) !== -1) {
      openRoomInternal(previousRoute);
      document.documentElement.setAttribute('data-view', 'room');
      document.body.classList.add('mode-room');
      document.body.classList.remove('mode-atlas');
      currentActiveRoom = previousRoute;
      window.history.replaceState(null, '', '#' + previousRoute);
    } else if (previousRoute === 'leitura') {
      enterDirectReadingInternal();
      isDirectReadingActive = true;
      document.documentElement.setAttribute('data-view', 'direct');
      window.history.replaceState(null, '', '#leitura');
    } else if (previousRoute === 'projetos') {
      window.history.replaceState(null, '', '#projetos');
    } else {
      window.history.replaceState(null, '', '#atlas');
    }

    savedModalPreviousRoute = null;

    if (triggerToRestore && typeof triggerToRestore.focus === 'function' && triggerToRestore.isConnected) {
      triggerToRestore.focus({ preventScroll: true });
    }
    savedModalTrigger = null;
  }

  function openRoomInternal(projectId) {
    document.querySelectorAll('.project-room').forEach(function (room) {
      if (room.getAttribute('data-room-id') === projectId) {
        room.hidden = false;
        room.classList.add('is-active');
        room.scrollTop = 0;
        const backBtn = room.querySelector('.room-back-btn');
        if (backBtn && typeof backBtn.focus === 'function') {
          setTimeout(function () { backBtn.focus({ preventScroll: true }); }, 50);
        }
      } else {
        room.hidden = true;
        room.classList.remove('is-active');
      }
    });
  }

  function closeAllRoomsInternal() {
    document.querySelectorAll('.project-room').forEach(function (room) {
      room.hidden = true;
      room.classList.remove('is-active');
    });
  }

  function enterDirectReadingInternal() {
    const directView = document.getElementById('direct-reading-view');
    if (directView) {
      directView.hidden = false;
      document.body.classList.add('mode-direct');
      document.body.classList.remove('mode-atlas');
      window.scrollTo(0, 0);
      const returnBtn = document.getElementById('btn-return-to-atlas');
      if (returnBtn) returnBtn.focus({ preventScroll: true });
    }
  }

  function exitDirectReadingInternal() {
    const directView = document.getElementById('direct-reading-view');
    if (directView) {
      directView.hidden = true;
      document.body.classList.remove('mode-direct');
    }
  }

  function openOverlayModalInternal(overlayId) {
    const modalElement = document.getElementById(overlayId);
    if (!modalElement) return;
    const overlaysContainer = document.getElementById('overlays-container');
    if (overlaysContainer) {
      overlaysContainer.removeAttribute('aria-hidden');
    }
    if (!modalElement.__hasCancelHandler) {
      modalElement.addEventListener('cancel', function (cancelEvent) {
        cancelEvent.preventDefault();
        handleOverlayClose();
      });
      modalElement.__hasCancelHandler = true;
    }
    if (typeof modalElement.showModal === 'function') {
      if (!modalElement.open) {
        modalElement.showModal();
      }
    } else {
      modalElement.setAttribute('open', '');
    }
    const closeBtn = modalElement.querySelector('[data-action="close-overlay"]');
    if (closeBtn && typeof closeBtn.focus === 'function') {
      setTimeout(function () { closeBtn.focus(); }, 20);
    }
  }

  function closeAllOverlaysInternal() {
    document.querySelectorAll('.atlas-overlay-modal').forEach(function (modal) {
      if (typeof modal.close === 'function') {
        if (modal.open) modal.close();
      } else {
        modal.removeAttribute('open');
      }
    });
    const overlaysContainer = document.getElementById('overlays-container');
    if (overlaysContainer) {
      overlaysContainer.setAttribute('aria-hidden', 'true');
    }
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

  // =========================================================================
  // 5. NAVEGAÇÃO POR TECLADO
  // =========================================================================

  function initializeKeyboardNavigation() {
    window.addEventListener('keydown', function (keyboardEvent) {
      // Esc fecha modal ou sai da sala
      if (keyboardEvent.key === 'Escape' || keyboardEvent.key === 'Esc') {
        const openModal = document.querySelector('.atlas-overlay-modal[open]');
        if (openModal) {
          handleOverlayClose();
          keyboardEvent.preventDefault();
          return;
        }

        if (currentActiveRoom) {
          exitCurrentRoom(true);
          keyboardEvent.preventDefault();
          return;
        }

        if (isDirectReadingActive) {
          exitCurrentRoom(true);
          keyboardEvent.preventDefault();
          return;
        }
      }

      // Setas esquerda/direita alternam salas quando dentro de um projeto
      if (currentActiveRoom && !document.querySelector('.atlas-overlay-modal[open]')) {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
          return;
        }
        if (keyboardEvent.key === 'ArrowRight') {
          stepActiveRoom('next');
          keyboardEvent.preventDefault();
        } else if (keyboardEvent.key === 'ArrowLeft') {
          stepActiveRoom('prev');
          keyboardEvent.preventDefault();
        }
      }
    });
  }

  // =========================================================================
  // 6. CONTROLE DE ANIMAÇÃO & PREFERÊNCIAS DE MOVIMENTO
  // =========================================================================

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
      announceLiveStatus('Animações ativadas.');
    }
  }

  // =========================================================================
  // 7. CÓPIA DE E-MAIL COM ACESSIBILIDADE
  // =========================================================================

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

  // =========================================================================
  // 8. DEMOS INTERATIVOS DAS SALAS DE PROJETOS
  // =========================================================================

  function initializeYahcwDemo() {
    const toggleOverviewButton = document.getElementById('btn-toggle-overview');
    const brightnessSlider = document.getElementById('sim-brightness-slider');
    const brightnessDisplay = document.getElementById('brightness-val-display');
    const audioSelect = document.getElementById('sim-audio-select');
    const yahcwLogBox = document.getElementById('yahcw-log-box');
    const screenFrame = document.getElementById('yahcw-screen-frame');

    if (toggleOverviewButton) {
      toggleOverviewButton.addEventListener('click', function () {
        if (screenFrame) {
          screenFrame.classList.toggle('overview-active');
        }
        if (yahcwLogBox) {
          yahcwLogBox.innerHTML = '<code>[DWM] Hot Corner ativado: Visão Geral de Miniaturas alternada.</code>';
        }
      });
    }

    if (brightnessSlider) {
      brightnessSlider.addEventListener('input', function () {
        const val = brightnessSlider.value;
        if (brightnessDisplay) brightnessDisplay.textContent = val + '%';
        const filterFactor = 0.3 + (val / 100) * 0.7;
        const screenPreview = document.getElementById('screen-preview-content');
        if (screenPreview) {
          screenPreview.style.filter = 'brightness(' + filterFactor.toFixed(2) + ')';
        }
        if (yahcwLogBox) {
          yahcwLogBox.innerHTML = '<code>[Filtro Simulado] VCP 0x10 -> ' + val + '% no monitor DDC/CI</code>';
        }
      });
    }

    if (audioSelect) {
      audioSelect.addEventListener('change', function () {
        const chosenAudio = audioSelect.value;
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

    let isLampPowered = true;
    let isTcpActive = true;

    if (powerButton) {
      powerButton.addEventListener('click', function () {
        isLampPowered = !isLampPowered;
        if (bulbElement) {
          bulbElement.style.opacity = isLampPowered ? '1' : '0.2';
          bulbElement.style.boxShadow = isLampPowered ? '0 0 20px rgba(199, 154, 96, 0.8)' : 'none';
        }
        if (tuyaLogBox) {
          const routeName = isTcpActive ? 'TCP LOCAL (192.168.1.104:6668)' : 'OPENAPI NUVEM';
          tuyaLogBox.innerHTML = '<code>[COMANDO] Lâmpada ' + (isLampPowered ? 'LIGADA' : 'DESLIGADA') + ' via ' + routeName + '</code>';
        }
      });
    }

    if (failureButton) {
      failureButton.addEventListener('click', function () {
        isTcpActive = false;
        if (badgeRouteMode) {
          badgeRouteMode.textContent = 'ROTA CONTINGÊNCIA: OPENAPI NUVEM';
          badgeRouteMode.classList.remove('active');
          badgeRouteMode.classList.add('fallback');
        }
        if (pingReadout) pingReadout.textContent = '148ms (nuvem simulada)';
        if (wireSegment) wireSegment.classList.add('wire-fallback');
        if (nodeTargetLabel) nodeTargetLabel.textContent = 'Nuvem Tuya (OpenAPI SSE)';
        if (tuyaLogBox) {
          tuyaLogBox.innerHTML = '<code>[WATCHDOG] Queda TCP local detectada. Comutação para OpenAPI Cloud ativa.</code>';
        }
      });
    }

    if (restoreButton) {
      restoreButton.addEventListener('click', function () {
        isTcpActive = true;
        if (badgeRouteMode) {
          badgeRouteMode.textContent = 'ROTA ATIVA: TCP LOCAL';
          badgeRouteMode.classList.remove('fallback');
          badgeRouteMode.classList.add('active');
        }
        if (pingReadout) pingReadout.textContent = '4ms (simulado)';
        if (wireSegment) wireSegment.classList.remove('wire-fallback');
        if (nodeTargetLabel) nodeTargetLabel.textContent = 'Lâmpada (192.168.1.104)';
        if (tuyaLogBox) {
          tuyaLogBox.innerHTML = '<code>[TCP-SOCKET] Conexão local reestabelecida em 192.168.1.104:6668.</code>';
        }
      });
    }
  }

  function initializeGamingDemo() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    const avgFpsElement = document.getElementById('metric-avg-fps');
    const lowFpsElement = document.getElementById('metric-low-fps');
    const frametimeElement = document.getElementById('metric-frametime');
    const maxHitchElement = document.getElementById('metric-max-hitch');
    const jsonDisplay = document.getElementById('gaming-json-display');
    const copyJsonButton = document.getElementById('btn-copy-gaming-json');

    const SCENARIOS = {
      stable: {
        avg: '144.1 FPS', low: '139.8 FPS', ft: '6.94 ms', hitch: '7.42 ms',
        json: { timestamp_ns: 1730219842104500, present_count: 86420, avg_frame_time_ms: 6.94, one_percent_low_fps: 139.8, active_swapchain: "0x7ffd98b04a20", hitch_count_last_sec: 0 }
      },
      stutter: {
        avg: '118.4 FPS', low: '42.1 FPS', ft: '8.44 ms', hitch: '34.80 ms',
        json: { timestamp_ns: 1730219843105200, present_count: 86538, avg_frame_time_ms: 8.44, one_percent_low_fps: 42.1, active_swapchain: "0x7ffd98b04a20", hitch_count_last_sec: 4 }
      },
      heavy: {
        avg: '59.8 FPS', low: '56.2 FPS', ft: '16.72 ms', hitch: '18.10 ms',
        json: { timestamp_ns: 1730219844106100, present_count: 86598, avg_frame_time_ms: 16.72, one_percent_low_fps: 56.2, active_swapchain: "0x7ffd98b04a20", hitch_count_last_sec: 0 }
      }
    };

    presetButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        presetButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        const key = btn.getAttribute('data-preset') || 'stable';
        const data = SCENARIOS[key];
        if (!data) return;
        if (avgFpsElement) avgFpsElement.textContent = data.avg;
        if (lowFpsElement) lowFpsElement.textContent = data.low;
        if (frametimeElement) frametimeElement.textContent = data.ft;
        if (maxHitchElement) maxHitchElement.textContent = data.hitch;
        if (jsonDisplay) jsonDisplay.textContent = JSON.stringify(data.json, null, 2);
      });
    });

    if (copyJsonButton && jsonDisplay) {
      copyJsonButton.addEventListener('click', async function () {
        try {
          await navigator.clipboard.writeText(jsonDisplay.textContent);
          copyJsonButton.textContent = 'Copiado!';
          setTimeout(function () { copyJsonButton.textContent = 'Copiar JSON'; }, 1500);
        } catch (_) {}
      });
    }
  }

  function initializePythonDemo() {
    const codeTabButtons = document.querySelectorAll('.code-tab-btn');
    codeTabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        codeTabButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        const tabNum = btn.getAttribute('data-code-tab');
        document.querySelectorAll('.code-tab-content').forEach(function (panel) {
          panel.hidden = true;
          panel.classList.remove('active');
        });
        const targetPanel = document.getElementById('code-panel-' + tabNum);
        if (targetPanel) {
          targetPanel.hidden = false;
          targetPanel.classList.add('active');
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
        if (!hex) return;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(hex);
          }
          if (statusBox) {
            statusBox.innerHTML = '<code>Token copiado: ' + hex + '</code>';
          }
        } catch (_) {}
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
        '  <linearGradient id="chartGradientAreaV3" x1="0" y1="0" x2="0" y2="1">' +
        '    <stop offset="0%" stop-color="#C79A60" stop-opacity="0.30" />' +
        '    <stop offset="100%" stop-color="#173F46" stop-opacity="0.02" />' +
        '  </linearGradient>' +
        '</defs>' +
        '<line x1="' + padX + '" y1="' + baselineY + '" x2="' + (chartWidth - padX) + '" y2="' + baselineY + '" stroke="#173F46" stroke-width="1.2" />' +
        '<line x1="' + padX + '" y1="' + padY + '" x2="' + padX + '" y2="' + baselineY + '" stroke="#173F46" stroke-width="1.2" />' +
        '<line x1="' + padX + '" y1="' + midLineY.toFixed(1) + '" x2="' + (chartWidth - padX) + '" y2="' + midLineY.toFixed(1) + '" stroke="#173F46" stroke-width="0.5" stroke-dasharray="3 3" stroke-opacity="0.5" />' +
        '<path d="' + areaFillPath + '" fill="url(#chartGradientAreaV3)" />' +
        '<path d="' + contributedPath + '" fill="none" stroke="#618F83" stroke-width="1.8" stroke-dasharray="4 4" />' +
        '<path d="' + balancePath + '" fill="none" stroke="#C79A60" stroke-width="2.5" />' +
        '<circle cx="' + (chartWidth - padX) + '" cy="' + (chartHeight - padY - (finalBalance / maxY) * plotHeight).toFixed(1) + '" r="4.5" fill="#C79A60" />';
    }

    function runCalculationWithParameters(params) {
      if (!window.PortfolioFinance || typeof window.PortfolioFinance.calculate !== 'function') {
        if (errorBox) {
          errorBox.textContent = 'Mecanismo de cálculo não disponível.';
          errorBox.hidden = false;
        }
        return false;
      }

      try {
        const result = window.PortfolioFinance.calculate(params);
        if (errorBox) errorBox.hidden = true;

        if (finalBalanceElement) finalBalanceElement.textContent = formatBRL(result.finalBalance);
        if (totalContributedElement) totalContributedElement.textContent = formatBRL(result.totalContributed);
        if (totalInterestElement) totalInterestElement.textContent = formatBRL(result.interest);
        if (monthlyRateElement) {
          monthlyRateElement.textContent = (result.monthlyRate * 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4
          }) + '%';
        }

        renderFinanceChart(result.points, result.totalContributed, result.finalBalance);
        return true;
      } catch (calcError) {
        if (errorBox) {
          errorBox.textContent = calcError.message || 'Erro ao calcular parâmetros financeiros.';
          errorBox.hidden = false;
        }
        return false;
      }
    }

    if (financeForm) {
      financeForm.addEventListener('submit', function (submitEvent) {
        submitEvent.preventDefault();
        const initialAmount = Number(document.getElementById('param-initial-amount').value);
        const monthlyContribution = Number(document.getElementById('param-monthly-contribution').value);
        const annualRatePercent = Number(document.getElementById('param-annual-rate').value);
        const months = Number(document.getElementById('param-months').value);

        runCalculationWithParameters({
          initialAmount: initialAmount,
          monthlyContribution: monthlyContribution,
          annualRatePercent: annualRatePercent,
          months: months
        });
      });
    }

    const resetCaseButton = document.getElementById('btn-reset-finance-case');
    if (resetCaseButton) {
      resetCaseButton.addEventListener('click', function () {
        document.getElementById('param-initial-amount').value = 1000;
        document.getElementById('param-monthly-contribution').value = 100;
        document.getElementById('param-annual-rate').value = 12;
        document.getElementById('param-months').value = 12;
        runCalculationWithParameters({
          initialAmount: 1000,
          monthlyContribution: 100,
          annualRatePercent: 12,
          months: 12
        });
      });
    }

    // Inicialização canônica da sala
    runCalculationWithParameters({
      initialAmount: 1000,
      monthlyContribution: 100,
      annualRatePercent: 12,
      months: 12
    });
  }

  // =========================================================================
  // 9. INICIALIZADOR GLOBAL DE EVENTOS & DELEGAÇÃO DE CLIQUE
  // =========================================================================

  function initializeEventListeners() {
    // Scroll do hero para zoom sutil da íris (sem wheel preventDefault)
    window.addEventListener('scroll', handleHeroScroll, { passive: true });
    window.addEventListener('resize', dispatchHeroFraming, { passive: true });

    // Botões de entrada em sala
    document.querySelectorAll('[data-enter-room]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const target = btn.getAttribute('data-enter-room');
        if (target) navigateToRoute(target, true);
      });
    });

    // Pular de índice ou callouts para sala
    document.querySelectorAll('[data-jump-room]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const target = btn.getAttribute('data-jump-room');
        if (target) navigateToRoute(target, true);
      });
    });

    // Botões de voltar da sala
    document.querySelectorAll('[data-action="exit-room"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        exitCurrentRoom(true);
      });
    });

    // Botões de avanço/recuo de sala
    document.querySelectorAll('[data-step-dir]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const dir = btn.getAttribute('data-step-dir');
        if (dir === 'next' || dir === 'prev') {
          stepActiveRoom(dir);
        }
      });
    });

    // Botão de retorno do modo de leitura direta
    const returnAtlasBtn = document.getElementById('btn-return-to-atlas');
    if (returnAtlasBtn) {
      returnAtlasBtn.addEventListener('click', function () {
        exitCurrentRoom(true);
      });
    }

    const returnAtlasFooterBtn = document.getElementById('btn-return-to-atlas-footer');
    if (returnAtlasFooterBtn) {
      returnAtlasFooterBtn.addEventListener('click', function () {
        exitCurrentRoom(true);
      });
    }

    // Botão de contato do Hero
    const btnHeroContact = document.getElementById('btn-hero-contact');
    if (btnHeroContact) {
      btnHeroContact.addEventListener('click', function () {
        navigateToRoute('contato', true);
      });
    }

    // Fechar Overlays Modais
    document.querySelectorAll('[data-action="close-overlay"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleOverlayClose();
      });
    });

    // Sincronização do Histórico e Hash
    window.addEventListener('popstate', function () {
      applyRouteState(window.location.hash.replace('#', ''));
    });
    window.addEventListener('hashchange', function () {
      applyRouteState(window.location.hash.replace('#', ''));
    });
  }

  // =========================================================================
  // 10. BOOTSTRAP DO PORTFÓLIO
  // =========================================================================

  function initializeApp() {
    dispatchHeroFraming();
    initializeMotionControls();
    initializeKeyboardNavigation();
    initializeEmailCopy();
    initializeYahcwDemo();
    initializeTuyaDemo();
    initializeGamingDemo();
    initializePythonDemo();
    initializeSpotifastDemo();
    initializeFinanceDemo();
    initializeFinancePreview();
    initializeScrollReveal();
    initializeEventListeners();

    // Rota inicial pela URL
    const initialHash = window.location.hash.replace('#', '').trim();
    if (initialHash) {
      applyRouteState(initialHash);
    } else {
      applyRouteState('atlas');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
})();
