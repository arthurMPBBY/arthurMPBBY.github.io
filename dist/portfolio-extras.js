(function () {
  'use strict';

  function initializeProjectXray() {
    const xrayDetailsList = document.querySelectorAll('.project-xray');
    if (!xrayDetailsList || xrayDetailsList.length === 0) return;

    xrayDetailsList.forEach(function (detailsElement) {
      detailsElement.addEventListener('toggle', function () {
        if (detailsElement.open) {
          xrayDetailsList.forEach(function (otherDetails) {
            if (otherDetails !== detailsElement && otherDetails.open) {
              otherDetails.open = false;
            }
          });
        }
        window.dispatchEvent(new CustomEvent('portfolio:layoutchange'));
      });
    });
  }

  function initializeFinanceLab() {
    const labSection = document.getElementById('laboratorio');
    const labDetails = document.getElementById('finance-lab');
    if (!labSection || !labDetails) return;

    const initialInput = document.getElementById('finance-initial');
    const monthlyInput = document.getElementById('finance-monthly');
    const rateSlider = document.getElementById('finance-rate-slider');
    const rateInput = document.getElementById('finance-rate-input');
    const monthsSlider = document.getElementById('finance-months-slider');
    const monthsInput = document.getElementById('finance-months-input');
    const resetFormButton = document.getElementById('finance-reset-btn');

    const resultContributed = document.getElementById('finance-res-contributed');
    const resultInterest = document.getElementById('finance-res-interest');
    const resultBalance = document.getElementById('finance-res-balance');
    const chartSvg = document.getElementById('finance-chart-svg');
    const milestonesTableBody = document.getElementById('finance-milestones-body');

    const errorInitial = document.getElementById('error-finance-initial');
    const errorMonthly = document.getElementById('error-finance-monthly');
    const errorRate = document.getElementById('error-finance-rate');
    const errorMonths = document.getElementById('error-finance-months');

    const currencyFormatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    const axisFormatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1
    });

    const defaultValues = {
      initialAmount: 1000,
      monthlyContribution: 100,
      annualRatePercent: 12,
      months: 12
    };

    let lastValidCalculation = null;

    function parseNumericValue(rawString) {
      if (typeof rawString !== 'string') return NaN;
      const cleanString = rawString.trim().replace(/\s+/g, '');
      if (cleanString === '') return NaN;
      if (cleanString === '-' || cleanString === '+' || cleanString === '.' || cleanString === ',') {
        return NaN;
      }
      let normalizedString = cleanString;
      if (cleanString.includes(',') && !cleanString.includes('.')) {
        normalizedString = cleanString.replace(',', '.');
      }
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalizedString)) {
        return NaN;
      }
      const parsedNumber = Number(normalizedString);
      if (!Number.isFinite(parsedNumber)) {
        return NaN;
      }
      return parsedNumber;
    }

    function clearFieldError(errorContainer, inputElement) {
      let stateChanged = false;
      if (errorContainer && !errorContainer.hidden) {
        errorContainer.textContent = '';
        errorContainer.hidden = true;
        stateChanged = true;
      }
      if (inputElement && inputElement.hasAttribute('aria-invalid')) {
        inputElement.removeAttribute('aria-invalid');
      }
      if (stateChanged) {
        window.dispatchEvent(new CustomEvent('portfolio:layoutchange'));
      }
    }

    function setFieldError(errorContainer, inputElement, errorMessage) {
      let stateChanged = false;
      if (errorContainer) {
        if (errorContainer.hidden || errorContainer.textContent !== errorMessage) {
          stateChanged = true;
        }
        errorContainer.textContent = errorMessage;
        errorContainer.hidden = false;
      }
      if (inputElement) {
        inputElement.setAttribute('aria-invalid', 'true');
      }
      if (stateChanged) {
        window.dispatchEvent(new CustomEvent('portfolio:layoutchange'));
      }
    }

    function drawChart(calculationData) {
      if (!chartSvg || !calculationData) return;

      const pointsArray = calculationData.points;
      const totalMonths = pointsArray.length - 1;
      const maximumAmount = Math.max(1, calculationData.finalBalance, calculationData.totalContributed);

      const svgViewWidth = 600;
      const svgViewHeight = 280;
      const paddingLeft = 65;
      const paddingRight = 25;
      const paddingTop = 25;
      const paddingBottom = 45;

      const plotAreaWidth = svgViewWidth - paddingLeft - paddingRight;
      const plotAreaHeight = svgViewHeight - paddingTop - paddingBottom;

      function scaleCoordinateX(monthNumber) {
        if (totalMonths <= 0) return paddingLeft;
        return paddingLeft + (monthNumber / totalMonths) * plotAreaWidth;
      }

      function scaleCoordinateY(amountValue) {
        return paddingTop + plotAreaHeight - (amountValue / maximumAmount) * plotAreaHeight;
      }

      let balancePathString = '';
      let contributedPathString = '';

      pointsArray.forEach(function (pointItem, pointIndex) {
        const pointCoordinateX = scaleCoordinateX(pointItem.month).toFixed(2);
        const balanceCoordinateY = scaleCoordinateY(pointItem.balance).toFixed(2);
        const contributedCoordinateY = scaleCoordinateY(pointItem.contributed).toFixed(2);

        if (pointIndex === 0) {
          balancePathString += 'M ' + pointCoordinateX + ' ' + balanceCoordinateY;
          contributedPathString += 'M ' + pointCoordinateX + ' ' + contributedCoordinateY;
        } else {
          balancePathString += ' L ' + pointCoordinateX + ' ' + balanceCoordinateY;
          contributedPathString += ' L ' + pointCoordinateX + ' ' + contributedCoordinateY;
        }
      });

      const firstPointX = scaleCoordinateX(0).toFixed(2);
      const lastPointX = scaleCoordinateX(totalMonths).toFixed(2);
      const zeroBaseY = scaleCoordinateY(0).toFixed(2);

      const balanceAreaPathString = balancePathString + ' L ' + lastPointX + ' ' + zeroBaseY + ' L ' + firstPointX + ' ' + zeroBaseY + ' Z';

      let gridLinesHtml = '';
      const horizontalGridSteps = 4;
      for (let stepIndex = 0; stepIndex <= horizontalGridSteps; stepIndex += 1) {
        const stepAmount = (maximumAmount / horizontalGridSteps) * stepIndex;
        const gridCoordinateY = scaleCoordinateY(stepAmount).toFixed(2);
        const formattedAxisLabel = axisFormatter.format(stepAmount);

        gridLinesHtml += '<line x1="' + paddingLeft + '" y1="' + gridCoordinateY + '" x2="' + (svgViewWidth - paddingRight) + '" y2="' + gridCoordinateY + '" stroke="#e5e5df" stroke-width="1" stroke-dasharray="3,3" />';
        gridLinesHtml += '<text x="' + (paddingLeft - 8) + '" y="' + (Number(gridCoordinateY) + 4) + '" fill="#7a7972" font-size="10" font-family="var(--font-mono, monospace)" text-anchor="end">' + formattedAxisLabel + '</text>';
      }

      let monthAxisLabelsHtml = '';
      const timeIntervals = [0, Math.round(totalMonths / 2), totalMonths];
      const uniqueIntervals = Array.from(new Set(timeIntervals));
      uniqueIntervals.forEach(function (monthInterval) {
        const intervalCoordinateX = scaleCoordinateX(monthInterval).toFixed(2);
        const intervalText = monthInterval === 0 ? 'Mês 0' : 'Mês ' + monthInterval;
        monthAxisLabelsHtml += '<text x="' + intervalCoordinateX + '" y="' + (svgViewHeight - 14) + '" fill="#7a7972" font-size="10" font-family="var(--font-mono, monospace)" text-anchor="middle">' + intervalText + '</text>';
      });

      chartSvg.innerHTML = '<defs>' +
        '<linearGradient id="balance-area-gradient" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#c16b59" stop-opacity="0.22" />' +
          '<stop offset="100%" stop-color="#c16b59" stop-opacity="0.01" />' +
        '</linearGradient>' +
        '</defs>' +
        gridLinesHtml +
        '<path d="' + balanceAreaPathString + '" fill="url(#balance-area-gradient)" />' +
        '<path d="' + contributedPathString + '" fill="none" stroke="#6e6e66" stroke-width="1.8" stroke-dasharray="4,4" />' +
        '<path d="' + balancePathString + '" fill="none" stroke="#c16b59" stroke-width="2.5" />' +
        monthAxisLabelsHtml;
    }

    function populateMilestonesTable(calculationData) {
      if (!milestonesTableBody || !calculationData) return;

      const pointsArray = calculationData.points;
      const totalMonths = pointsArray.length - 1;

      const milestoneMonths = [];
      for (let monthTicker = 12; monthTicker <= totalMonths; monthTicker += 12) {
        milestoneMonths.push(monthTicker);
      }
      if (totalMonths > 0 && !milestoneMonths.includes(totalMonths)) {
        milestoneMonths.push(totalMonths);
      }

      if (milestoneMonths.length === 0) {
        milestoneMonths.push(totalMonths);
      }

      let generatedRowsHtml = '';
      milestoneMonths.forEach(function (targetMonth) {
        const foundPoint = pointsArray.find(function (point) {
          return point.month === targetMonth;
        }) || pointsArray[pointsArray.length - 1];

        const yearsCount = Math.floor(targetMonth / 12);
        const remainderMonths = targetMonth % 12;
        let periodDescription = 'Mês ' + targetMonth;
        if (yearsCount > 0 && remainderMonths === 0) {
          periodDescription += ' (Ano ' + yearsCount + ')';
        } else if (yearsCount > 0) {
          periodDescription += ' (' + yearsCount + 'a ' + remainderMonths + 'm)';
        }

        const calculatedInterest = Math.max(0, foundPoint.balance - foundPoint.contributed);

        generatedRowsHtml += '<tr>' +
          '<td>' + periodDescription + '</td>' +
          '<td>' + currencyFormatter.format(foundPoint.contributed) + '</td>' +
          '<td>' + currencyFormatter.format(calculatedInterest) + '</td>' +
          '<td><strong>' + currencyFormatter.format(foundPoint.balance) + '</strong></td>' +
          '</tr>';
      });

      milestonesTableBody.innerHTML = generatedRowsHtml;
    }

    function executeCalculation() {
      const parsedInitial = parseNumericValue(initialInput.value);
      const parsedMonthly = parseNumericValue(monthlyInput.value);
      const parsedRate = parseNumericValue(rateInput.value);
      const parsedMonths = parseNumericValue(monthsInput.value);

      let hasFormErrors = false;

      if (!Number.isFinite(parsedInitial) || parsedInitial < 0 || parsedInitial > 1000000) {
        setFieldError(errorInitial, initialInput, 'Informe um valor inicial entre R$ 0 e R$ 1.000.000');
        hasFormErrors = true;
      } else {
        clearFieldError(errorInitial, initialInput);
      }

      if (!Number.isFinite(parsedMonthly) || parsedMonthly < 0 || parsedMonthly > 10000) {
        setFieldError(errorMonthly, monthlyInput, 'Informe um aporte mensal entre R$ 0 e R$ 10.000');
        hasFormErrors = true;
      } else {
        clearFieldError(errorMonthly, monthlyInput);
      }

      if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 30) {
        setFieldError(errorRate, rateInput, 'Informe uma taxa anual entre 0% e 30%');
        hasFormErrors = true;
      } else {
        clearFieldError(errorRate, rateInput);
      }

      if (!Number.isInteger(parsedMonths) || parsedMonths < 1 || parsedMonths > 360) {
        setFieldError(errorMonths, monthsInput, 'Informe um prazo inteiro entre 1 e 360 meses');
        hasFormErrors = true;
      } else {
        clearFieldError(errorMonths, monthsInput);
      }

      if (hasFormErrors) {
        return;
      }

      if (!window.PortfolioFinance || typeof window.PortfolioFinance.calculate !== 'function') {
        return;
      }

      try {
        const calculationOutput = window.PortfolioFinance.calculate({
          initialAmount: parsedInitial,
          monthlyContribution: parsedMonthly,
          annualRatePercent: parsedRate,
          months: parsedMonths
        });

        lastValidCalculation = calculationOutput;

        resultBalance.textContent = currencyFormatter.format(calculationOutput.finalBalance);
        resultContributed.textContent = currencyFormatter.format(calculationOutput.totalContributed);
        resultInterest.textContent = currencyFormatter.format(calculationOutput.interest);

        drawChart(calculationOutput);
        populateMilestonesTable(calculationOutput);
      } catch (calculationException) {
        setFieldError(errorInitial, initialInput, calculationException.message || 'Erro ao calcular.');
      }
    }

    function syncRateControls(sourceElement) {
      if (sourceElement === rateSlider) {
        rateInput.value = rateSlider.value;
      } else {
        rateSlider.value = rateInput.value;
      }
      executeCalculation();
    }

    function syncMonthsControls(sourceElement) {
      if (sourceElement === monthsSlider) {
        monthsInput.value = monthsSlider.value;
      } else {
        monthsSlider.value = monthsInput.value;
      }
      executeCalculation();
    }

    initialInput.addEventListener('input', executeCalculation);
    monthlyInput.addEventListener('input', executeCalculation);

    rateSlider.addEventListener('input', function () {
      syncRateControls(rateSlider);
    });
    rateInput.addEventListener('input', function () {
      syncRateControls(rateInput);
    });

    monthsSlider.addEventListener('input', function () {
      syncMonthsControls(monthsSlider);
    });
    monthsInput.addEventListener('input', function () {
      syncMonthsControls(monthsInput);
    });

    resetFormButton.addEventListener('click', function () {
      initialInput.value = defaultValues.initialAmount;
      monthlyInput.value = defaultValues.monthlyContribution;
      rateSlider.value = defaultValues.annualRatePercent;
      rateInput.value = defaultValues.annualRatePercent;
      monthsSlider.value = defaultValues.months;
      monthsInput.value = defaultValues.months;

      clearFieldError(errorInitial, initialInput);
      clearFieldError(errorMonthly, monthlyInput);
      clearFieldError(errorRate, rateInput);
      clearFieldError(errorMonths, monthsInput);

      executeCalculation();
    });

    executeCalculation();
  }

  function initializeBriefMode() {
    const briefModeButton = document.getElementById('brief-mode-toggle');
    const briefStatusRegion = document.getElementById('brief-live-status');
    if (!briefModeButton) return;

    let isBriefActive = document.documentElement.getAttribute('data-view') === 'brief';

    function applyBriefMode(activateBrief) {
      isBriefActive = activateBrief;

      if (activateBrief) {
        const currentActiveElement = document.activeElement;
        const isFocusInsideHiddenScope = currentActiveElement && (
          currentActiveElement.closest('[data-full-only]') !== null ||
          currentActiveElement.classList.contains('btn-primary') ||
          currentActiveElement.classList.contains('btn-secondary')
        );

        document.documentElement.setAttribute('data-view', 'brief');
        briefModeButton.setAttribute('aria-pressed', 'true');
        briefModeButton.classList.add('is-active');
        const buttonLabel = briefModeButton.querySelector('.brief-btn-text');
        if (buttonLabel) buttonLabel.textContent = 'Ver portfólio completo';

        if (briefStatusRegion) {
          briefStatusRegion.textContent = 'Modo resumo de 20 segundos ativado. Exibindo apenas destaques.';
        }

        if (isFocusInsideHiddenScope) {
          briefModeButton.focus();
        }
      } else {
        document.documentElement.setAttribute('data-view', 'full');
        briefModeButton.setAttribute('aria-pressed', 'false');
        briefModeButton.classList.remove('is-active');
        const buttonLabel = briefModeButton.querySelector('.brief-btn-text');
        if (buttonLabel) buttonLabel.textContent = 'Tenho 20 segundos';

        if (briefStatusRegion) {
          briefStatusRegion.textContent = 'Modo completo ativado. Todas as seções e detalhes estão visíveis.';
        }
      }

      window.dispatchEvent(new CustomEvent('portfolio:viewchange', {
        detail: {
          mode: activateBrief ? 'brief' : 'full'
        }
      }));
      window.dispatchEvent(new CustomEvent('portfolio:layoutchange'));
    }

    briefModeButton.addEventListener('click', function () {
      applyBriefMode(!isBriefActive);
    });
  }

  function initializeLightTrail() {
    const mainContent = document.getElementById('main-content') || document.querySelector('main');
    const trailSvg = document.getElementById('light-trail-svg');
    const trailBackgroundPath = document.getElementById('light-trail-bg');
    const trailActivePath = document.getElementById('light-trail-active');
    const trailHaloCircle = document.getElementById('light-trail-halo');
    const contactCard = document.querySelector('.contact-editorial-card');

    if (!mainContent || !trailSvg || !trailBackgroundPath || !trailActivePath || !trailHaloCircle) return;

    if (typeof trailActivePath.getTotalLength !== 'function' || typeof trailActivePath.getPointAtLength !== 'function') {
      trailSvg.style.display = 'none';
      return;
    }

    let totalPathLength = 0;
    let cachedSegments = [];
    let cachedMainTop = 0;
    let isTrailGeometryInvalid = true;
    let trailAnimationFrameId = null;
    let isEffectsPaused = document.documentElement.getAttribute('data-motion') === 'paused';
    let isDocumentHidden = document.hidden;
    let isViewBrief = document.documentElement.getAttribute('data-view') === 'brief';

    function cancelTrailFrame() {
      if (trailAnimationFrameId !== null) {
        cancelAnimationFrame(trailAnimationFrameId);
        trailAnimationFrameId = null;
      }
    }

    function recomputeGeometry() {
      if (isViewBrief || isDocumentHidden) {
        isTrailGeometryInvalid = true;
        return;
      }

      const mainRectangle = mainContent.getBoundingClientRect();
      cachedMainTop = mainRectangle.top + window.scrollY;
      const contentWidth = mainContent.clientWidth;
      const contentHeight = mainContent.clientHeight;

      if (contentWidth <= 0 || contentHeight <= 0) {
        isTrailGeometryInvalid = true;
        return;
      }

      trailSvg.setAttribute('viewBox', '0 0 ' + contentWidth + ' ' + contentHeight);
      trailSvg.style.width = contentWidth + 'px';
      trailSvg.style.height = contentHeight + 'px';

      const heroEditorial = document.querySelector('.hero-editorial-column') || document.getElementById('hero');
      const projectsHeader = document.querySelector('#projetos .section-header');
      const projectCards = document.querySelectorAll('.project-compact-card');
      const emailBox = document.querySelector('.contact-email-box') || contactCard;

      if (!heroEditorial || !projectsHeader || projectCards.length === 0 || !emailBox) {
        return;
      }

      const safeGutterHorizontal = Math.max(8, Math.min(16, mainRectangle.left > 24 ? 12 : 8));
      const calculatedAnchors = [];

      const heroRect = heroEditorial.getBoundingClientRect();
      const heroAnchorY = Math.max(20, heroRect.top - mainRectangle.top + 40);
      calculatedAnchors.push({ coordinateX: safeGutterHorizontal, coordinateY: heroAnchorY });

      const headerRect = projectsHeader.getBoundingClientRect();
      const headerAnchorY = headerRect.top - mainRectangle.top + 16;
      calculatedAnchors.push({ coordinateX: safeGutterHorizontal, coordinateY: headerAnchorY });

      projectCards.forEach(function (cardItem) {
        const cardRect = cardItem.getBoundingClientRect();
        const cardAnchorY = cardRect.top - mainRectangle.top + cardRect.height * 0.45;
        calculatedAnchors.push({ coordinateX: safeGutterHorizontal, coordinateY: cardAnchorY });
      });

      const emailRect = emailBox.getBoundingClientRect();
      const endAnchorX = Math.max(safeGutterHorizontal, emailRect.left - mainRectangle.left - 8);
      const endAnchorY = emailRect.top - mainRectangle.top + emailRect.height * 0.5;
      calculatedAnchors.push({ coordinateX: endAnchorX, coordinateY: endAnchorY });

      let generatedPathString = 'M ' + calculatedAnchors[0].coordinateX.toFixed(1) + ' ' + calculatedAnchors[0].coordinateY.toFixed(1);
      for (let anchorIndex = 1; anchorIndex < calculatedAnchors.length; anchorIndex += 1) {
        const prevAnchor = calculatedAnchors[anchorIndex - 1];
        const currAnchor = calculatedAnchors[anchorIndex];
        const midCoordinateY = (prevAnchor.coordinateY + currAnchor.coordinateY) / 2;

        generatedPathString += ' C ' + prevAnchor.coordinateX.toFixed(1) + ' ' + midCoordinateY.toFixed(1) + ', ' +
          currAnchor.coordinateX.toFixed(1) + ' ' + midCoordinateY.toFixed(1) + ', ' +
          currAnchor.coordinateX.toFixed(1) + ' ' + currAnchor.coordinateY.toFixed(1);
      }

      trailBackgroundPath.setAttribute('d', generatedPathString);
      trailActivePath.setAttribute('d', generatedPathString);

      try {
        totalPathLength = trailActivePath.getTotalLength();
      } catch (pathMeasurementError) {
        totalPathLength = 0;
      }

      if (totalPathLength <= 0) {
        isTrailGeometryInvalid = true;
        return;
      }

      trailActivePath.style.strokeDasharray = String(totalPathLength);

      const anchorCumulativeLengths = [0];
      for (let anchorIndex = 1; anchorIndex < calculatedAnchors.length - 1; anchorIndex += 1) {
        const targetCoordinateY = calculatedAnchors[anchorIndex].coordinateY;
        let searchLowerBound = anchorCumulativeLengths[anchorIndex - 1];
        let searchUpperBound = totalPathLength;
        for (let iterationIndex = 0; iterationIndex < 16; iterationIndex += 1) {
          const searchMidPoint = (searchLowerBound + searchUpperBound) / 2;
          const samplePoint = trailActivePath.getPointAtLength(searchMidPoint);
          if (samplePoint.y < targetCoordinateY) {
            searchLowerBound = searchMidPoint;
          } else {
            searchUpperBound = searchMidPoint;
          }
        }
        anchorCumulativeLengths.push((searchLowerBound + searchUpperBound) / 2);
      }
      anchorCumulativeLengths.push(totalPathLength);

      cachedSegments = [];
      for (let segmentIndex = 0; segmentIndex < calculatedAnchors.length - 1; segmentIndex += 1) {
        cachedSegments.push({
          startY: calculatedAnchors[segmentIndex].coordinateY,
          endY: calculatedAnchors[segmentIndex + 1].coordinateY,
          startLength: anchorCumulativeLengths[segmentIndex],
          endLength: anchorCumulativeLengths[segmentIndex + 1]
        });
      }

      isTrailGeometryInvalid = false;
    }

    function renderTrailFrame() {
      trailAnimationFrameId = null;

      if (isViewBrief || isDocumentHidden) {
        return;
      }

      if (isTrailGeometryInvalid) {
        recomputeGeometry();
      }

      if (totalPathLength <= 0 || cachedSegments.length === 0) {
        return;
      }

      const readingScrollPoint = window.scrollY + window.innerHeight * 0.65;
      const readingContentCoordinateY = readingScrollPoint - cachedMainTop;

      const firstAnchorY = cachedSegments[0].startY;
      const lastAnchorY = cachedSegments[cachedSegments.length - 1].endY;

      const isScrolledNearBottom = (window.scrollY + window.innerHeight) >= (document.documentElement.scrollHeight - 60);

      let activeLength = 0;
      if (isScrolledNearBottom) {
        activeLength = totalPathLength;
      } else if (readingContentCoordinateY <= firstAnchorY) {
        activeLength = 0;
      } else if (readingContentCoordinateY >= lastAnchorY) {
        activeLength = totalPathLength;
      } else {
        for (let segmentIndex = 0; segmentIndex < cachedSegments.length; segmentIndex += 1) {
          const currentSegment = cachedSegments[segmentIndex];
          if (readingContentCoordinateY >= currentSegment.startY && readingContentCoordinateY <= currentSegment.endY) {
            const segmentDeltaY = currentSegment.endY - currentSegment.startY;
            const segmentFraction = segmentDeltaY > 0 ? (readingContentCoordinateY - currentSegment.startY) / segmentDeltaY : 0;
            activeLength = currentSegment.startLength + segmentFraction * (currentSegment.endLength - currentSegment.startLength);
            break;
          }
        }
      }

      const offsetDistance = Math.max(0, totalPathLength - activeLength);
      trailActivePath.style.strokeDashoffset = offsetDistance.toFixed(2);

      const progressRatio = totalPathLength > 0 ? activeLength / totalPathLength : 0;

      if (activeLength > 2) {
        const haloCoordinates = trailActivePath.getPointAtLength(activeLength);
        trailHaloCircle.setAttribute('cx', haloCoordinates.x.toFixed(2));
        trailHaloCircle.setAttribute('cy', haloCoordinates.y.toFixed(2));
        trailHaloCircle.style.opacity = isEffectsPaused ? '0' : '1';
      } else {
        trailHaloCircle.style.opacity = '0';
      }

      if (contactCard) {
        let contactIlluminationRatio = 0;
        if (isScrolledNearBottom || progressRatio >= 0.98) {
          contactIlluminationRatio = 1;
        } else if (progressRatio >= 0.78) {
          contactIlluminationRatio = Math.max(0, Math.min(1, (progressRatio - 0.78) / 0.20));
        }
        contactCard.style.setProperty('--contact-illumination', contactIlluminationRatio.toFixed(3));
      }
    }

    function scheduleTrailUpdate() {
      if (isViewBrief || isDocumentHidden || trailAnimationFrameId !== null) return;
      trailAnimationFrameId = requestAnimationFrame(renderTrailFrame);
    }

    window.addEventListener('scroll', scheduleTrailUpdate, { passive: true });
    window.addEventListener('resize', function () {
      isTrailGeometryInvalid = true;
      scheduleTrailUpdate();
    }, { passive: true });

    window.addEventListener('portfolio:layoutchange', function () {
      isTrailGeometryInvalid = true;
      scheduleTrailUpdate();
    });

    const contactNavLink = document.querySelector('a[href="#contato"]');
    if (contactNavLink) {
      contactNavLink.addEventListener('click', function () {
        setTimeout(function () {
          if (contactCard) {
            contactCard.style.setProperty('--contact-illumination', '0.85');
          }
          isTrailGeometryInvalid = true;
          scheduleTrailUpdate();
        }, 120);
      });
    }

    const motionStateObserver = new MutationObserver(function () {
      isEffectsPaused = document.documentElement.getAttribute('data-motion') === 'paused';
      isViewBrief = document.documentElement.getAttribute('data-view') === 'brief';

      if (isViewBrief) {
        cancelTrailFrame();
        trailSvg.style.display = 'none';
      } else {
        trailSvg.style.display = '';
        isTrailGeometryInvalid = true;
        scheduleTrailUpdate();
      }

      if (isEffectsPaused) {
        trailHaloCircle.style.opacity = '0';
      } else {
        scheduleTrailUpdate();
      }
    });

    motionStateObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion', 'data-view']
    });

    document.addEventListener('visibilitychange', function () {
      isDocumentHidden = document.hidden;
      if (isDocumentHidden) {
        cancelTrailFrame();
      } else {
        isTrailGeometryInvalid = true;
        scheduleTrailUpdate();
      }
    });

    const trailResizeObserver = new ResizeObserver(function () {
      isTrailGeometryInvalid = true;
      scheduleTrailUpdate();
    });
    trailResizeObserver.observe(mainContent);

    recomputeGeometry();
    scheduleTrailUpdate();
  }

  function initializeAllExtras() {
    initializeProjectXray();
    initializeFinanceLab();
    initializeBriefMode();
    initializeLightTrail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllExtras);
  } else {
    initializeAllExtras();
  }
})();
