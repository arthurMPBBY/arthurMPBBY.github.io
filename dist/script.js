(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const EMAIL_ADDRESS = 'arthurkadri968@gmail.com';
  const STORAGE_MOTION_KEY = 'arthur_portfolio_motion';

  function safeStorageGet(storageKey) {
    try {
      return window.localStorage.getItem(storageKey);
    } catch (storageError) {
      return null;
    }
  }

  function safeStorageSet(storageKey, storageValue) {
    try {
      window.localStorage.setItem(storageKey, storageValue);
      return true;
    } catch (storageError) {
      return false;
    }
  }

  function announceLiveStatus(statusElementId, messageText, isErrorState) {
    const liveElement = document.getElementById(statusElementId);
    if (!liveElement) return;
    liveElement.textContent = messageText;
    if (isErrorState) {
      liveElement.classList.add('error');
    } else {
      liveElement.classList.remove('error');
    }
    setTimeout(function () {
      if (liveElement.textContent === messageText) {
        liveElement.textContent = '';
        liveElement.classList.remove('error');
      }
    }, 4000);
  }

  function initializeEmailCopy() {
    const copyButtons = document.querySelectorAll('[data-copy-email]');
    copyButtons.forEach(function (copyButton) {
      const originalContent = copyButton.innerHTML;
      let restoreTimer = null;
      copyButton.addEventListener('click', async function (clickEvent) {
        clickEvent.preventDefault();
        let copySuccessful = false;

        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(EMAIL_ADDRESS);
            copySuccessful = true;
          } catch (clipboardError) {
            copySuccessful = false;
          }
        }

        if (!copySuccessful) {
          const previousFocus = document.activeElement;
          try {
            const hiddenTextarea = document.createElement('textarea');
            hiddenTextarea.value = EMAIL_ADDRESS;
            hiddenTextarea.setAttribute('readonly', '');
            hiddenTextarea.style.position = 'absolute';
            hiddenTextarea.style.left = '-9999px';
            document.body.appendChild(hiddenTextarea);
            hiddenTextarea.select();
            copySuccessful = document.execCommand('copy');
            document.body.removeChild(hiddenTextarea);
          } catch (execCommandError) {
            copySuccessful = false;
          }
          if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
        }

        if (copySuccessful) {
          announceLiveStatus('email-live-status', 'E-mail ' + EMAIL_ADDRESS + ' copiado com sucesso!', false);
          window.clearTimeout(restoreTimer);
          copyButton.innerHTML = '<svg viewBox=\"0 0 16 16\" width=\"14\" height=\"14\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><polyline points=\"2 8 6 12 14 3\"></polyline></svg><span>Copiado!</span>';
          restoreTimer = setTimeout(function () {
            copyButton.innerHTML = originalContent;
          }, 2400);
        } else {
          announceLiveStatus('email-live-status', 'Endereço: ' + EMAIL_ADDRESS, true);
        }
      });
    });
  }

  function initializeMotionControls() {
    const motionButton = document.getElementById('motion-toggle-btn');
    const motionStatusText = document.getElementById('motion-status-label');

    const savedPreference = safeStorageGet(STORAGE_MOTION_KEY);

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (savedPreference === 'paused' || reducedMotionQuery.matches) {
      document.documentElement.setAttribute('data-motion', 'paused');
      if (motionButton) {
        motionButton.setAttribute('aria-pressed', 'true');
      }
      if (motionStatusText) {
        motionStatusText.textContent = 'Ativar animações';
      }
    } else {
      document.documentElement.setAttribute('data-motion', 'active');
      if (motionButton) {
        motionButton.setAttribute('aria-pressed', 'false');
      }
      if (motionStatusText) {
        motionStatusText.textContent = 'Pausar animações';
      }
    }

    if (motionButton) motionButton.setAttribute('aria-label', document.documentElement.getAttribute('data-motion') === 'paused' ? 'Ativar animações' : 'Pausar animações');
    reducedMotionQuery.addEventListener('change', function () {
      const shouldPause = reducedMotionQuery.matches || safeStorageGet(STORAGE_MOTION_KEY) === 'paused';
      document.documentElement.setAttribute('data-motion', shouldPause ? 'paused' : 'active');
      if (motionButton) motionButton.setAttribute('aria-pressed', shouldPause ? 'true' : 'false');
      if (motionButton) motionButton.setAttribute('aria-label', shouldPause ? 'Ativar animações' : 'Pausar animações');
      if (motionStatusText) motionStatusText.textContent = shouldPause ? 'Ativar animações' : 'Pausar animações';
      window.dispatchEvent(new CustomEvent('portfolio:motionchange'));
    });
    if (motionButton) {
      motionButton.addEventListener('click', function () {
        const isCurrentlyPaused = document.documentElement.getAttribute('data-motion') === 'paused';
        const newMotionState = isCurrentlyPaused && !reducedMotionQuery.matches ? 'active' : 'paused';

        document.documentElement.setAttribute('data-motion', newMotionState);
        motionButton.setAttribute('aria-pressed', newMotionState === 'paused' ? 'true' : 'false');
        motionButton.setAttribute('aria-label', newMotionState === 'paused' ? 'Ativar animações' : 'Pausar animações');
        if (motionStatusText) {
          motionStatusText.textContent = newMotionState === 'paused' ? 'Ativar animações' : 'Pausar animações';
        }

        safeStorageSet(STORAGE_MOTION_KEY, newMotionState);

        announceLiveStatus('motion-live-status', newMotionState === 'paused' ? 'Animações decorativas pausadas.' : 'Animações decorativas ativadas.', false);
        window.dispatchEvent(new CustomEvent('portfolio:motionchange', { detail: { motion: newMotionState } }));
      });
    }
  }

  function initializeBriefMode() {
    const briefButton = document.getElementById('brief-mode-toggle');
    const briefStatusLabel = document.getElementById('brief-status-label');

    if (!briefButton) return;

    briefButton.addEventListener('click', function () {
      const isCurrentlyBrief = document.documentElement.getAttribute('data-view') === 'brief';
      const newViewState = isCurrentlyBrief ? 'full' : 'brief';

      document.documentElement.setAttribute('data-view', newViewState);
      briefButton.setAttribute('aria-pressed', newViewState === 'brief' ? 'true' : 'false');

      if (briefStatusLabel) {
        briefStatusLabel.textContent = newViewState === 'brief' ? 'Modo completo' : 'Tenho 20 segundos';
      }

      briefButton.setAttribute('aria-label', newViewState === 'brief' ? 'Restaurar modo completo' : 'Ativar modo de 20 segundos');
      briefButton.focus({ preventScroll: true });

      const announcementMessage = newViewState === 'brief' ? 'Modo 20 segundos ativado: fatos essenciais e contatos.' : 'Modo completo restaurado.';
      announceLiveStatus('brief-live-status', announcementMessage, false);

      window.dispatchEvent(new CustomEvent('portfolio:viewchange', { detail: { view: newViewState } }));
      window.dispatchEvent(new CustomEvent('portfolio:motionchange'));
    });
  }

  let observatoryTabActivationFunction = null;

  function initializeProjectObservatory() {
    const observatoryTabs = document.querySelectorAll('.observatory-tab[role=\"tab\"]');
    const observatoryPanels = document.querySelectorAll('.observatory-panel[role=\"tabpanel\"]');

    if (observatoryTabs.length === 0) return;

    function activateTab(targetTab, shouldFocusTab) {
      observatoryTabs.forEach(function (tabElement) {
        const isSelected = tabElement === targetTab;
        tabElement.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        tabElement.setAttribute('tabindex', isSelected ? '0' : '-1');
        if (isSelected) {
          tabElement.classList.add('is-active');
        } else {
          tabElement.classList.remove('is-active');
        }
      });

      const targetPanelId = targetTab.getAttribute('aria-controls');
      observatoryPanels.forEach(function (panelElement) {
        if (panelElement.id === targetPanelId) {
          panelElement.hidden = false;
          panelElement.classList.add('is-active');
          panelElement.setAttribute('tabindex', '0');
        } else {
          panelElement.hidden = true;
          panelElement.classList.remove('is-active');
          panelElement.removeAttribute('tabindex');
        }
      });

      if (shouldFocusTab) {
        targetTab.focus();
      }

      const associatedStateName = targetTab.getAttribute('data-scene-state') || 'hero';
      if (window.ImmersiveScene && typeof window.ImmersiveScene.setState === 'function') {
        window.ImmersiveScene.setState(associatedStateName);
      }
      window.dispatchEvent(new CustomEvent('portfolio:statechange', { detail: { state: associatedStateName } }));
    }

    observatoryTabActivationFunction = activateTab;

    const initialActiveTab = document.querySelector('.observatory-tab.is-active') || observatoryTabs[0];
    activateTab(initialActiveTab, false);

    observatoryTabs.forEach(function (tabElement, tabIndex) {
      tabElement.addEventListener('click', function () {
        activateTab(tabElement, false);
      });

      tabElement.addEventListener('keydown', function (keyboardEvent) {
        let destinationIndex = null;
        if (keyboardEvent.key === 'ArrowRight' || keyboardEvent.key === 'ArrowDown') {
          destinationIndex = (tabIndex + 1) % observatoryTabs.length;
        } else if (keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowUp') {
          destinationIndex = (tabIndex - 1 + observatoryTabs.length) % observatoryTabs.length;
        } else if (keyboardEvent.key === 'Home') {
          destinationIndex = 0;
        } else if (keyboardEvent.key === 'End') {
          destinationIndex = observatoryTabs.length - 1;
        }

        if (destinationIndex !== null) {
          keyboardEvent.preventDefault();
          activateTab(observatoryTabs[destinationIndex], true);
        }
      });
    });
  }

  function initializeYahcwDemo() {
    const triggerOverviewButtons = document.querySelectorAll('[data-yahcw-trigger]');
    const closeOverviewButton = document.getElementById('yahcw-overview-close-btn');
    const overviewModal = document.getElementById('yahcw-demo-overview');
    const brightnessSlider = document.getElementById('yahcw-brightness-slider');
    const brightnessValueDisplay = document.getElementById('yahcw-brightness-display');
    const demoDesktopStage = document.getElementById('yahcw-demo-stage');
    const audioSelectElement = document.getElementById('yahcw-audio-select');
    const audioDisplayElement = document.getElementById('yahcw-audio-display');
    const windowTiles = document.querySelectorAll('.yahcw-overview-tile');
    const activeWindowTitleDisplay = document.getElementById('yahcw-active-window-title');
    const hotCornerTriggerBox = document.getElementById('yahcw-corner-trigger-box');

    if (!overviewModal) return;

    let lastActiveTrigger = null;

    function openOverview(triggerOrigin) {
      lastActiveTrigger = triggerOrigin || triggerOverviewButtons[0] || null;
      overviewModal.hidden = false;
      overviewModal.classList.add('is-open');

      const firstTile = overviewModal.querySelector('.yahcw-overview-tile');
      if (firstTile) {
        firstTile.focus();
      } else if (closeOverviewButton) {
        closeOverviewButton.focus();
      }
    }

    function closeOverview() {
      overviewModal.hidden = true;
      overviewModal.classList.remove('is-open');

      if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
        lastActiveTrigger.focus();
      }
    }

    triggerOverviewButtons.forEach(function (triggerButton) {
      triggerButton.addEventListener('click', function () {
        if (overviewModal.hidden) {
          openOverview(triggerButton);
        } else {
          closeOverview();
        }
      });
    });

    if (hotCornerTriggerBox) {
      hotCornerTriggerBox.addEventListener('mouseenter', function () {
        if (overviewModal.hidden) openOverview(hotCornerTriggerBox);
      });
      hotCornerTriggerBox.addEventListener('click', function () {
        if (overviewModal.hidden) openOverview(hotCornerTriggerBox);
      });
    }

    if (closeOverviewButton) {
      closeOverviewButton.addEventListener('click', closeOverview);
    }

    overviewModal.addEventListener('keydown', function (keyboardEvent) {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        closeOverview();
      }
      if (keyboardEvent.key === 'Tab') {
        const focusableItems = Array.from(overviewModal.querySelectorAll('button:not([disabled])'));
        const firstItem = focusableItems[0];
        const lastItem = focusableItems[focusableItems.length - 1];
        if (keyboardEvent.shiftKey && document.activeElement === firstItem) {
          keyboardEvent.preventDefault();
          lastItem.focus();
        } else if (!keyboardEvent.shiftKey && document.activeElement === lastItem) {
          keyboardEvent.preventDefault();
          firstItem.focus();
        }
      }
    });

    windowTiles.forEach(function (windowTile) {
      windowTile.addEventListener('click', function () {
        const windowTitle = windowTile.getAttribute('data-window-title') || 'FormOverview.cs';
        if (activeWindowTitleDisplay) {
          activeWindowTitleDisplay.textContent = windowTitle;
        }
        announceLiveStatus('yahcw-live-status', 'Janela em foco alterada para: ' + windowTitle, false);
        closeOverview();
      });
    });

    if (brightnessSlider) {
      brightnessSlider.addEventListener('input', function () {
        const brightnessPercentage = Number(brightnessSlider.value);
        if (brightnessValueDisplay) {
          brightnessValueDisplay.textContent = brightnessPercentage + '%';
        }
        if (demoDesktopStage) {
          const brightnessFactor = 0.4 + (brightnessPercentage / 100) * 0.6;
          demoDesktopStage.style.filter = 'brightness(' + brightnessFactor.toFixed(2) + ')';
        }
      });
    }

    if (audioSelectElement) {
      audioSelectElement.addEventListener('change', function () {
        const selectedDeviceName = audioSelectElement.options[audioSelectElement.selectedIndex].text;
        if (audioDisplayElement) {
          audioDisplayElement.textContent = selectedDeviceName;
        }
      });
    }
  }

  function initializeTuyaDemo() {
    const lampToggleButton = document.getElementById('tuya-lamp-toggle');
    const lampStatusIndicator = document.getElementById('tuya-lamp-status-pill');
    const lampBulbVisual = document.getElementById('tuya-lamp-visual');
    const routeRadios = document.querySelectorAll('input[name=\"tuya-route-choice\"]');
    const dropLocalCheckbox = document.getElementById('tuya-drop-local-toggle');
    const latencyDisplay = document.getElementById('tuya-latency-display');
    const activeRouteDisplay = document.getElementById('tuya-route-display');
    const fallbackNotice = document.getElementById('tuya-fallback-notice');

    let isLampTurnedOn = false;

    function updateLampUi() {
      if (!lampToggleButton || !lampStatusIndicator || !lampBulbVisual) return;

      if (isLampTurnedOn) {
        lampToggleButton.setAttribute('aria-pressed', 'true');
        lampToggleButton.textContent = 'Desligar Lâmpada';
        lampStatusIndicator.textContent = 'Ligada';
        lampStatusIndicator.classList.add('is-lamp-on');
        lampBulbVisual.classList.add('is-lit');
      } else {
        lampToggleButton.setAttribute('aria-pressed', 'false');
        lampToggleButton.textContent = 'Ligar Lâmpada';
        lampStatusIndicator.textContent = 'Desligada';
        lampStatusIndicator.classList.remove('is-lamp-on');
        lampBulbVisual.classList.remove('is-lit');
      }
    }

    function computeActiveRoute() {
      let chosenRoute = 'local';
      routeRadios.forEach(function (radioElement) {
        if (radioElement.checked) {
          chosenRoute = radioElement.value;
        }
      });

      const isLocalDropped = dropLocalCheckbox && dropLocalCheckbox.checked;

      if (chosenRoute === 'local' && isLocalDropped) {
        if (activeRouteDisplay) {
          activeRouteDisplay.textContent = 'Contingência: Nuvem (Tuya OpenAPI - simulação)';
        }
        if (latencyDisplay) {
          latencyDisplay.textContent = '~320 ms (valor simulado para demonstração)';
        }
        if (fallbackNotice) {
          fallbackNotice.hidden = false;
        }
      } else if (chosenRoute === 'cloud') {
        if (activeRouteDisplay) {
          activeRouteDisplay.textContent = 'Nuvem (Tuya OpenAPI - simulação)';
        }
        if (latencyDisplay) {
          latencyDisplay.textContent = '~280 ms (valor simulado para demonstração)';
        }
        if (fallbackNotice) {
          fallbackNotice.hidden = true;
        }
      } else {
        if (activeRouteDisplay) {
          activeRouteDisplay.textContent = 'Local (TCP Direto / Porta 6668) [Simulação]';
        }
        if (latencyDisplay) {
          latencyDisplay.textContent = '~14 ms (valor simulado para demonstração)';
        }
        if (fallbackNotice) {
          fallbackNotice.hidden = true;
        }
      }
    }

    if (lampToggleButton) {
      lampToggleButton.addEventListener('click', function () {
        isLampTurnedOn = !isLampTurnedOn;
        updateLampUi();
      });
    }

    routeRadios.forEach(function (radioElement) {
      radioElement.addEventListener('change', computeActiveRoute);
    });

    if (dropLocalCheckbox) {
      dropLocalCheckbox.addEventListener('change', computeActiveRoute);
    }
  }

  function initializeGamingHudDemo() {
    const profileSelectElement = document.getElementById('gaming-hud-preset-select');
    const frametimeDisplay = document.getElementById('gaming-frametime-value');
    const fpsDisplay = document.getElementById('gaming-fps-value');
    const lowOneDisplay = document.getElementById('gaming-low-value');
    const presentCountDisplay = document.getElementById('gaming-presents-value');
    const jsonOutputDisplay = document.getElementById('gaming-json-snapshot');

    const telemetryProfiles = {
      stable: {
        frametimeMs: 6.94,
        fpsEquivalent: 144,
        lowOnePercentMs: 7.82,
        presentsRecorded: 14420
      },
      shaderStutter: {
        frametimeMs: 16.42,
        fpsEquivalent: 61,
        lowOnePercentMs: 33.10,
        presentsRecorded: 6140
      },
      heavyLoad: {
        frametimeMs: 22.22,
        fpsEquivalent: 45,
        lowOnePercentMs: 41.50,
        presentsRecorded: 4500
      }
    };

    function updateTelemetryUi(profileKey) {
      const selectedData = telemetryProfiles[profileKey] || telemetryProfiles.stable;
      if (frametimeDisplay) frametimeDisplay.textContent = selectedData.frametimeMs.toFixed(2) + ' ms';
      if (fpsDisplay) fpsDisplay.textContent = selectedData.fpsEquivalent + ' FPS';
      if (lowOneDisplay) lowOneDisplay.textContent = selectedData.lowOnePercentMs.toFixed(2) + ' ms';
      if (presentCountDisplay) presentCountDisplay.textContent = selectedData.presentsRecorded.toLocaleString('pt-BR');

      if (jsonOutputDisplay) {
        const snapshotObject = {
          source: 'vulkan_presentation_observer',
          targetLayer: 'VK_LAYER_OBSERVE_PRESENT',
          scenarioType: 'synthetic_benchmark_demo',
          timestamp: new Date().toISOString(),
          metrics: {
            frametimeMs: selectedData.frametimeMs,
            fps: selectedData.fpsEquivalent,
            onePercentLowMs: selectedData.lowOnePercentMs,
            presentsObserved: selectedData.presentsRecorded
          }
        };
        jsonOutputDisplay.textContent = JSON.stringify(snapshotObject, null, 2);
      }
    }

    if (profileSelectElement) {
      profileSelectElement.addEventListener('change', function () {
        updateTelemetryUi(profileSelectElement.value);
      });
      updateTelemetryUi(profileSelectElement.value);
    }
  }

  function initializeFinanceLabIntegration() {
    if (!window.PortfolioFinance || typeof window.PortfolioFinance.calculate !== 'function') {
      return;
    }

    const initialInput = document.getElementById('finance-initial');
    const monthlyInput = document.getElementById('finance-monthly');
    const rateSlider = document.getElementById('finance-rate-slider');
    const rateInput = document.getElementById('finance-rate-input');
    const monthsSlider = document.getElementById('finance-months-slider');
    const monthsInput = document.getElementById('finance-months-input');
    const resetButton = document.getElementById('finance-reset-btn');

    const resultContributed = document.getElementById('finance-res-contributed');
    const resultInterest = document.getElementById('finance-res-interest');
    const resultBalance = document.getElementById('finance-res-balance');
    const chartSvg = document.getElementById('finance-chart-svg');
    const tableBody = document.getElementById('finance-milestones-body');

    const errorInitial = document.getElementById('error-finance-initial');
    const errorMonthly = document.getElementById('error-finance-monthly');
    const errorRate = document.getElementById('error-finance-rate');
    const errorMonths = document.getElementById('error-finance-months');

    const currencyFormatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    function setFieldError(errorElement, inputElement, errorMessage) {
      if (!errorElement) return;
      if (errorMessage) {
        errorElement.textContent = errorMessage;
        errorElement.hidden = false;
        if (inputElement) inputElement.setAttribute('aria-invalid', 'true');
      } else {
        errorElement.textContent = '';
        errorElement.hidden = true;
        if (inputElement) inputElement.removeAttribute('aria-invalid');
      }
    }

    function renderDynamicSvgChart(calculationPoints) {
      if (!chartSvg || !calculationPoints || calculationPoints.length === 0) return;

      const chartWidth = 540;
      const chartHeight = 240;
      const paddingLeft = 44;
      const paddingRight = 20;
      const paddingTop = 24;
      const paddingBottom = 34;

      const plotWidth = chartWidth - paddingLeft - paddingRight;
      const plotHeight = chartHeight - paddingTop - paddingBottom;

      const lastPoint = calculationPoints[calculationPoints.length - 1];
      const maximumValue = Math.max(10, lastPoint.balance);
      const totalMonths = Math.max(1, lastPoint.month);

      let balancePathString = '';
      let contributedPathString = '';
      let balanceAreaString = '';

      calculationPoints.forEach(function (dataPoint, pointIndex) {
        const coordinateX = paddingLeft + (dataPoint.month / totalMonths) * plotWidth;
        const balanceY = paddingTop + plotHeight - (dataPoint.balance / maximumValue) * plotHeight;
        const contributedY = paddingTop + plotHeight - (dataPoint.contributed / maximumValue) * plotHeight;

        if (pointIndex === 0) {
          balancePathString += 'M ' + coordinateX.toFixed(1) + ' ' + balanceY.toFixed(1);
          contributedPathString += 'M ' + coordinateX.toFixed(1) + ' ' + contributedY.toFixed(1);
          balanceAreaString += 'M ' + coordinateX.toFixed(1) + ' ' + (paddingTop + plotHeight) + ' L ' + coordinateX.toFixed(1) + ' ' + balanceY.toFixed(1);
        } else {
          balancePathString += ' L ' + coordinateX.toFixed(1) + ' ' + balanceY.toFixed(1);
          contributedPathString += ' L ' + coordinateX.toFixed(1) + ' ' + balanceY.toFixed(1);
          balanceAreaString += ' L ' + coordinateX.toFixed(1) + ' ' + balanceY.toFixed(1);
        }
      });

      balanceAreaString += ' L ' + (paddingLeft + plotWidth).toFixed(1) + ' ' + (paddingTop + plotHeight) + ' Z';

      chartSvg.innerHTML = `
        <defs>
          <linearGradient id=\"chartSeaglassAreaGradient\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
            <stop offset=\"0%\" stop-color=\"#a6d6c0\" stop-opacity=\"0.24\" />
            <stop offset=\"100%\" stop-color=\"#a6d6c0\" stop-opacity=\"0.0\" />
          </linearGradient>
        </defs>
        <line x1=\"${paddingLeft}\" y1=\"${paddingTop + plotHeight}\" x2=\"${paddingLeft + plotWidth}\" y2=\"${paddingTop + plotHeight}\" stroke=\"#1c2430\" stroke-width=\"1\" />
        <line x1=\"${paddingLeft}\" y1=\"${paddingTop}\" x2=\"${paddingLeft}\" y2=\"${paddingTop + plotHeight}\" stroke=\"#1c2430\" stroke-width=\"1\" />
        <path d=\"${balanceAreaString}\" fill=\"url(#chartSeaglassAreaGradient)\" />
        <path d=\"${contributedPathString}\" fill=\"none\" stroke=\"#64748b\" stroke-width=\"2\" stroke-dasharray=\"4 4\" />
        <path d=\"${balancePathString}\" fill=\"none\" stroke=\"#a6d6c0\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />
      `;
    }

    function renderMilestonesTable(calculationPoints) {
      if (!tableBody || !calculationPoints) return;
      tableBody.innerHTML = '';

      const milestonesPoints = calculationPoints.filter(function (pointItem) {
        return pointItem.month > 0 && (pointItem.month % 12 === 0 || pointItem.month === calculationPoints.length - 1);
      });

      milestonesPoints.forEach(function (milestone) {
        const yearNumber = Math.floor(milestone.month / 12);
        const periodLabel = yearNumber > 0 ? 'Mês ' + milestone.month + ' (Ano ' + yearNumber + ')' : 'Mês ' + milestone.month;
        const interestAmount = milestone.balance - milestone.contributed;

        const tableRow = document.createElement('tr');
        tableRow.innerHTML = `
          <td>${periodLabel}</td>
          <td>${currencyFormatter.format(milestone.contributed)}</td>
          <td>${currencyFormatter.format(interestAmount)}</td>
          <td><strong>${currencyFormatter.format(milestone.balance)}</strong></td>
        `;
        tableBody.appendChild(tableRow);
      });
    }

    function recalculateFinance() {
      if (!initialInput || !monthlyInput || !rateInput || !monthsInput) return;

      const rawInitial = initialInput.value.trim();
      const rawMonthly = monthlyInput.value.trim();
      const rawRate = rateInput.value.trim();
      const rawMonths = monthsInput.value.trim();

      const initialValue = parseFloat(rawInitial);
      const monthlyValue = parseFloat(rawMonthly);
      const rateValue = parseFloat(rawRate);

      const isStrictIntegerMonths = /^\d+$/.test(rawMonths);
      const monthsValue = isStrictIntegerMonths ? parseInt(rawMonths, 10) : NaN;

      let hasValidationError = false;

      if (isNaN(initialValue) || initialValue < 0 || initialValue > 1000000) {
        setFieldError(errorInitial, initialInput, 'Valor entre 0 e 1.000.000');
        hasValidationError = true;
      } else {
        setFieldError(errorInitial, initialInput, '');
      }

      if (isNaN(monthlyValue) || monthlyValue < 0 || monthlyValue > 10000) {
        setFieldError(errorMonthly, monthlyInput, 'Aporte entre 0 e 10.000');
        hasValidationError = true;
      } else {
        setFieldError(errorMonthly, monthlyInput, '');
      }

      if (isNaN(rateValue) || rateValue < 0 || rateValue > 30) {
        setFieldError(errorRate, rateInput, 'Taxa entre 0% e 30%');
        hasValidationError = true;
      } else {
        setFieldError(errorRate, rateInput, '');
      }

      if (!isStrictIntegerMonths || isNaN(monthsValue) || monthsValue < 1 || monthsValue > 360) {
        setFieldError(errorMonths, monthsInput, 'Prazo deve ser um número inteiro de meses (1 a 360)');
        hasValidationError = true;
      } else {
        setFieldError(errorMonths, monthsInput, '');
      }

      if (hasValidationError) {
        return;
      }

      try {
        const calculationResults = window.PortfolioFinance.calculate({
          initialAmount: initialValue,
          monthlyContribution: monthlyValue,
          annualRatePercent: rateValue,
          months: monthsValue
        });

        if (resultBalance) resultBalance.textContent = currencyFormatter.format(calculationResults.finalBalance);
        if (resultContributed) resultContributed.textContent = currencyFormatter.format(calculationResults.totalContributed);
        if (resultInterest) resultInterest.textContent = currencyFormatter.format(calculationResults.interest);

        renderDynamicSvgChart(calculationResults.points);
        renderMilestonesTable(calculationResults.points);
      } catch (calculationError) {
        // preserve previous valid results
      }
    }

    if (rateSlider && rateInput) {
      rateSlider.addEventListener('input', function () {
        rateInput.value = rateSlider.value;
        recalculateFinance();
      });
      rateInput.addEventListener('input', function () {
        rateSlider.value = rateInput.value;
        recalculateFinance();
      });
    }

    if (monthsSlider && monthsInput) {
      monthsSlider.addEventListener('input', function () {
        monthsInput.value = monthsSlider.value;
        recalculateFinance();
      });
      monthsInput.addEventListener('input', function () {
        monthsSlider.value = monthsInput.value;
        recalculateFinance();
      });
    }

    if (initialInput) initialInput.addEventListener('input', recalculateFinance);
    if (monthlyInput) monthlyInput.addEventListener('input', recalculateFinance);

    if (resetButton) {
      resetButton.addEventListener('click', function () {
        if (initialInput) initialInput.value = '1000';
        if (monthlyInput) monthlyInput.value = '100';
        if (rateInput) rateInput.value = '12';
        if (rateSlider) rateSlider.value = '12';
        if (monthsInput) monthsInput.value = '12';
        if (monthsSlider) monthsSlider.value = '12';

        setFieldError(errorInitial, initialInput, '');
        setFieldError(errorMonthly, monthlyInput, '');
        setFieldError(errorRate, rateInput, '');
        setFieldError(errorMonths, monthsInput, '');

        recalculateFinance();
      });
    }

    recalculateFinance();
  }

  function handleHashNavigation() {
    const currentHash = window.location.hash;
    if (currentHash === '#laboratorio' || currentHash === '#panel-finance') {
      if (document.documentElement.getAttribute('data-view') === 'brief') document.getElementById('brief-mode-toggle').click();
      const financeTab = document.getElementById('tab-finance');
      if (financeTab && typeof observatoryTabActivationFunction === 'function') {
        observatoryTabActivationFunction(financeTab, false);
      }
      const financePanel = document.getElementById('panel-finance');
      if (financePanel) {
        financePanel.scrollIntoView({ behavior: document.documentElement.getAttribute('data-motion') === 'paused' ? 'instant' : 'smooth' });
      }
    }
  }

  function initializeNavigationFocus() {
    const internalAnchors = document.querySelectorAll('a[href^=\"#\"]');
    internalAnchors.forEach(function (anchorElement) {
      anchorElement.addEventListener('click', function (event) {
        const destinationHash = this.getAttribute('href');
        if (destinationHash === '#laboratorio' || destinationHash === '#panel-finance') {
          event.preventDefault();
          if (document.documentElement.getAttribute('data-view') === 'brief') document.getElementById('brief-mode-toggle').click();
          const financeTab = document.getElementById('tab-finance');
          if (financeTab && typeof observatoryTabActivationFunction === 'function') {
            observatoryTabActivationFunction(financeTab, false);
          }
          const financePanel = document.getElementById('panel-finance');
          if (financePanel) {
            financePanel.scrollIntoView({ behavior: document.documentElement.getAttribute('data-motion') === 'paused' ? 'instant' : 'smooth' });
            financePanel.focus({ preventScroll: true });
          }
          history.pushState(null, '', '#laboratorio');
          return;
        }

        if (destinationHash && destinationHash !== '#') {
          const destinationElement = document.querySelector(destinationHash);
          if (destinationElement) {
            destinationElement.setAttribute('tabindex', '-1');
            destinationElement.focus({ preventScroll: true });
          }
        }
      });
    });

    window.addEventListener('hashchange', handleHashNavigation);
    if (window.location.hash) {
      setTimeout(handleHashNavigation, 80);
    }
  }

  function initializeAboutCloudIllustration() {
    const artContainers = document.querySelectorAll('.about-art-cloud');
    if (window.createCloudMorph && typeof window.createCloudMorph === 'function') {
      artContainers.forEach(function (artContainer) {
        try {
          window.createCloudMorph(artContainer);
        } catch (cloudError) {
          void cloudError;
        }
      });
    }
  }

  function initializeApplication() {
    document.documentElement.classList.add('js-ready');
    initializeEmailCopy();
    initializeMotionControls();
    initializeBriefMode();
    initializeProjectObservatory();
    initializeYahcwDemo();
    initializeTuyaDemo();
    initializeGamingHudDemo();
    initializeFinanceLabIntegration();
    initializeNavigationFocus();
    initializeAboutCloudIllustration();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
  } else {
    initializeApplication();
  }
})();
