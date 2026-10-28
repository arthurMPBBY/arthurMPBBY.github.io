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
    const milestonesTableBody = document.querySelector('#finance-milestones-table tbody');

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
          balancePathString = 'M ' + pointCoordinateX + ' ' + balanceCoordinateY;
          contributedPathString = 'M ' + pointCoordinateX + ' ' + contributedCoordinateY;
        } else {
          balancePathString += ' L ' + pointCoordinateX + ' ' + balanceCoordinateY;
          contributedPathString += ' L ' + pointCoordinateX + ' ' + contributedCoordinateY;
        }
      });

      const horizontalGridLevels = 4;
      let gridLinesMarkup = '';
      for (let levelIndex = 0; levelIndex <= horizontalGridLevels; levelIndex += 1) {
        const levelFraction = levelIndex / horizontalGridLevels;
        const levelAmount = maximumAmount * levelFraction;
        const levelCoordinateY = scaleCoordinateY(levelAmount).toFixed(2);

        gridLinesMarkup += '<line x1="' + paddingLeft + '" y1="' + levelCoordinateY + '" x2="' + (svgViewWidth - paddingRight) + '" y2="' + levelCoordinateY + '" stroke="#e5e5e0" stroke-width="1" stroke-dasharray="2 3" />';
        gridLinesMarkup += '<text x="' + (paddingLeft - 8) + '" y="' + (Number(levelCoordinateY) + 4) + '" text-anchor="end" font-size="10" fill="#585d66" font-family="monospace">' + axisFormatter.format(levelAmount) + '</text>';
      }

      let timeTicksMarkup = '';
      const timeIntervals = totalMonths <= 12 ? 3 : (totalMonths <= 60 ? 12 : 36);
      for (let monthTick = 0; monthTick <= totalMonths; monthTick += timeIntervals) {
        const tickCoordinateX = scaleCoordinateX(monthTick).toFixed(2);
        timeTicksMarkup += '<line x1="' + tickCoordinateX + '" y1="' + (svgViewHeight - paddingBottom) + '" x2="' + tickCoordinateX + '" y2="' + (svgViewHeight - paddingBottom + 5) + '" stroke="#585d66" stroke-width="1" />';
        timeTicksMarkup += '<text x="' + tickCoordinateX + '" y="' + (svgViewHeight - paddingBottom + 18) + '" text-anchor="middle" font-size="10" fill="#585d66" font-family="monospace">' + monthTick + 'm</text>';
      }

      if (totalMonths % timeIntervals !== 0) {
        const finalTickX = scaleCoordinateX(totalMonths).toFixed(2);
        timeTicksMarkup += '<line x1="' + finalTickX + '" y1="' + (svgViewHeight - paddingBottom) + '" x2="' + finalTickX + '" y2="' + (svgViewHeight - paddingBottom + 5) + '" stroke="#c16b59" stroke-width="1" />';
        timeTicksMarkup += '<text x="' + finalTickX + '" y="' + (svgViewHeight - paddingBottom + 30) + '" text-anchor="middle" font-size="10" fill="#c16b59" font-family="monospace">' + totalMonths + 'm</text>';
      }

      chartSvg.innerHTML = `
        <g class="chart-grid">${gridLinesMarkup}</g>
        <g class="chart-ticks">${timeTicksMarkup}</g>
        <line x1="${paddingLeft}" y1="${svgViewHeight - paddingBottom}" x2="${svgViewWidth - paddingRight}" y2="${svgViewHeight - paddingBottom}" stroke="#25272b" stroke-width="1.2" />
        <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${svgViewHeight - paddingBottom}" stroke="#25272b" stroke-width="1.2" />
        <path d="${contributedPathString}" fill="none" stroke="#585d66" stroke-width="1.8" stroke-dasharray="5 4" class="chart-line-contributed" />
        <path d="${balancePathString}" fill="none" stroke="#c16b59" stroke-width="2.4" class="chart-line-balance" />
      `;
    }

    function populateMilestonesTable(calculationData) {
      if (!milestonesTableBody || !calculationData) return;

      const pointsArray = calculationData.points;
      const totalMonths = pointsArray.length - 1;
      const selectedMilestones = [];

      selectedMilestones.push(pointsArray[0]);

      for (let monthNumber = 12; monthNumber < totalMonths; monthNumber += 12) {
        selectedMilestones.push(pointsArray[monthNumber]);
      }

      if (totalMonths > 0) {
        selectedMilestones.push(pointsArray[totalMonths]);
      }

      let rowsMarkup = '';
      selectedMilestones.forEach(function (milestonePoint) {
        const monthNumber = milestonePoint.month;
        const yearsCount = (monthNumber / 12).toFixed(1);
        const timeLabel = monthNumber === 0
          ? 'Mes 0 (Inicio)'
          : monthNumber + ' meses (' + yearsCount + ' anos)';
        const interestAccumulated = milestonePoint.balance - milestonePoint.contributed;

        rowsMarkup += `
          <tr>
            <th scope="row">${timeLabel}</th>
            <td>${currencyFormatter.format(milestonePoint.contributed)}</td>
            <td><strong>${currencyFormatter.format(milestonePoint.balance)}</strong></td>
            <td>${currencyFormatter.format(interestAccumulated)}</td>
          </tr>
        `;
      });

      milestonesTableBody.innerHTML = rowsMarkup;
    }

    function executeCalculation() {
      let hasValidationError = false;

      const rawInitial = initialInput.value;
      const parsedInitial = parseNumericValue(rawInitial);
      if (rawInitial.trim() === '') {
        setFieldError(errorInitial, initialInput, 'Informe o valor inicial (R$ 0 a R$ 1.000.000).');
        hasValidationError = true;
      } else if (Number.isNaN(parsedInitial) || parsedInitial < 0 || parsedInitial > 1000000) {
        setFieldError(errorInitial, initialInput, 'Informe um valor valido entre R$ 0 e R$ 1.000.000.');
        hasValidationError = true;
      } else {
        clearFieldError(errorInitial, initialInput);
      }

      const rawMonthly = monthlyInput.value;
      const parsedMonthly = parseNumericValue(rawMonthly);
      if (rawMonthly.trim() === '') {
        setFieldError(errorMonthly, monthlyInput, 'Informe o aporte mensal (R$ 0 a R$ 10.000).');
        hasValidationError = true;
      } else if (Number.isNaN(parsedMonthly) || parsedMonthly < 0 || parsedMonthly > 10000) {
        setFieldError(errorMonthly, monthlyInput, 'Informe um aporte entre R$ 0 e R$ 10.000.');
        hasValidationError = true;
      } else {
        clearFieldError(errorMonthly, monthlyInput);
      }

      const rawRate = rateInput.value;
      const parsedRate = parseNumericValue(rawRate);
      if (rawRate.trim() === '') {
        setFieldError(errorRate, rateInput, 'Informe a taxa anual (0% a 30%).');
        hasValidationError = true;
      } else if (Number.isNaN(parsedRate) || parsedRate < 0 || parsedRate > 30) {
        setFieldError(errorRate, rateInput, 'Informe uma taxa anual entre 0% e 30%.');
        hasValidationError = true;
      } else {
        clearFieldError(errorRate, rateInput);
      }

      const rawMonths = monthsInput.value;
      const parsedMonths = parseNumericValue(rawMonths);
      if (rawMonths.trim() === '') {
        setFieldError(errorMonths, monthsInput, 'Informe o prazo (1 a 360 meses).');
        hasValidationError = true;
      } else if (Number.isNaN(parsedMonths) || !Number.isInteger(parsedMonths) || parsedMonths < 1 || parsedMonths > 360) {
        setFieldError(errorMonths, monthsInput, 'Informe um prazo inteiro entre 1 e 360 meses.');
        hasValidationError = true;
      } else {
        clearFieldError(errorMonths, monthsInput);
      }

      if (hasValidationError) {
        return;
      }

      try {
        const calculationResult = window.PortfolioFinance.calculate({
          initialAmount: parsedInitial,
          monthlyContribution: parsedMonthly,
          annualRatePercent: parsedRate,
          months: parsedMonths
        });

        lastValidCalculation = calculationResult;

        if (resultContributed) resultContributed.textContent = currencyFormatter.format(calculationResult.totalContributed);
        if (resultInterest) resultInterest.textContent = currencyFormatter.format(calculationResult.interest);
        if (resultBalance) resultBalance.textContent = currencyFormatter.format(calculationResult.finalBalance);

        drawChart(calculationResult);
        populateMilestonesTable(calculationResult);
      } catch (calculationError) {
        setFieldError(errorMonths, monthsInput, calculationError.message);
      }
    }

    function syncRateControls(sourceControl) {
      if (sourceControl === rateSlider) {
        rateInput.value = rateSlider.value;
      } else {
        const numericRate = parseNumericValue(rateInput.value);
        if (!Number.isNaN(numericRate) && numericRate >= 0 && numericRate <= 30) {
          rateSlider.value = String(numericRate);
        }
      }
      rateSlider.setAttribute('aria-valuetext', rateSlider.value + '% ao ano');
      executeCalculation();
    }

    function syncMonthsControls(sourceControl) {
      if (sourceControl === monthsSlider) {
        monthsInput.value = monthsSlider.value;
      } else {
        const numericMonths = parseNumericValue(monthsInput.value);
        if (!Number.isNaN(numericMonths) && Number.isInteger(numericMonths) && numericMonths >= 1 && numericMonths <= 360) {
          monthsSlider.value = String(numericMonths);
        }
      }
      monthsSlider.setAttribute('aria-valuetext', monthsSlider.value + ' meses');
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

    if (resetFormButton) {
      resetFormButton.addEventListener('click', function () {
        initialInput.value = String(defaultValues.initialAmount);
        monthlyInput.value = String(defaultValues.monthlyContribution);
        rateSlider.value = String(defaultValues.annualRatePercent);
        rateInput.value = String(defaultValues.annualRatePercent);
        monthsSlider.value = String(defaultValues.months);
        monthsInput.value = String(defaultValues.months);

        rateSlider.setAttribute('aria-valuetext', defaultValues.annualRatePercent + '% ao ano');
        monthsSlider.setAttribute('aria-valuetext', defaultValues.months + ' meses');

        clearFieldError(errorInitial, initialInput);
        clearFieldError(errorMonthly, monthlyInput);
        clearFieldError(errorRate, rateInput);
        clearFieldError(errorMonths, monthsInput);

        executeCalculation();
        window.dispatchEvent(new CustomEvent('portfolio:layoutchange'));
      });
    }

    labDetails.addEventListener('toggle', function () {
      if (labDetails.open && !lastValidCalculation) {
        executeCalculation();
      }
      window.dispatchEvent(new CustomEvent('portfolio:layoutchange'));
    });

    const tableDetails = document.querySelector('.finance-table-details');
    if (tableDetails) {
      tableDetails.addEventListener('toggle', function () {
        window.dispatchEvent(new CustomEvent('portfolio:layoutchange'));
      });
    }

    executeCalculation();
  }

  function initializeBriefMode() {
    const briefModeButton = document.getElementById('brief-mode-toggle');
    const briefLiveStatus = document.getElementById('brief-live-status');
    if (!briefModeButton) return;

    let isBriefActive = false;

    function applyBriefMode(activateBrief) {
      isBriefActive = activateBrief;
      const htmlRoot = document.documentElement;

      if (activateBrief) {
        const currentActiveElement = document.activeElement;
        if (currentActiveElement && (currentActiveElement.closest('[data-full-only]') || currentActiveElement.closest('.hero-actions > a') || currentActiveElement.closest('.about-sidebar-card') || currentActiveElement.closest('.finance-controls-grid') || currentActiveElement.offsetParent === null)) {
          briefModeButton.focus();
        }

        htmlRoot.setAttribute('data-view', 'brief');
        briefModeButton.setAttribute('aria-pressed', 'true');
        briefModeButton.setAttribute('aria-label', 'Ver portfólio completo');
        const buttonTextElement = briefModeButton.querySelector('.brief-mode-text');
        if (buttonTextElement) buttonTextElement.textContent = 'Ver portfolio completo';

        if (briefLiveStatus) {
          briefLiveStatus.textContent = 'Modo de 20 segundos ativado. Conteudo resumido para leitura rapida.';
        }

        window.dispatchEvent(new CustomEvent('portfolio:viewchange', { detail: { mode: 'brief' } }));
        window.dispatchEvent(new CustomEvent('portfolio:layoutchange'));
      } else {
        htmlRoot.setAttribute('data-view', 'full');
        briefModeButton.setAttribute('aria-pressed', 'false');
        briefModeButton.setAttribute('aria-label', 'Ativar versão resumida de 20 segundos');
        const buttonTextElement = briefModeButton.querySelector('.brief-mode-text');
        if (buttonTextElement) buttonTextElement.textContent = 'Tenho 20 segundos';

        if (briefLiveStatus) {
          briefLiveStatus.textContent = 'Portfolio completo restaurado.';
        }

        window.dispatchEvent(new CustomEvent('portfolio:viewchange', { detail: { mode: 'full' } }));
        window.dispatchEvent(new CustomEvent('portfolio:layoutchange'));
      }
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

      const heroEditorial = document.querySelector('.hero-editorial') || document.getElementById('hero');
      const projectsHeader = document.querySelector('#projetos .section-header');
      const projectCards = document.querySelectorAll('.project-compact-card');
      const emailBox = document.querySelector('.contact-email-box') || contactCard;

      if (!heroEditorial || !projectsHeader || projectCards.length === 0 || !emailBox) {
        return;
      }

      const calculatedAnchors = [];

      const heroRect = heroEditorial.getBoundingClientRect();
      const heroAnchorX = Math.max(16, heroRect.left - mainRectangle.left - 20);
      const heroAnchorY = Math.max(20, heroRect.top - mainRectangle.top + 40);
      calculatedAnchors.push({ coordinateX: heroAnchorX, coordinateY: heroAnchorY });

      const headerRect = projectsHeader.getBoundingClientRect();
      const headerAnchorX = Math.max(16, headerRect.left - mainRectangle.left - 20);
      const headerAnchorY = headerRect.top - mainRectangle.top + 16;
      calculatedAnchors.push({ coordinateX: headerAnchorX, coordinateY: headerAnchorY });

      projectCards.forEach(function (cardItem) {
        const cardRect = cardItem.getBoundingClientRect();
        const cardAnchorX = Math.max(16, cardRect.left - mainRectangle.left - 18);
        const cardAnchorY = cardRect.top - mainRectangle.top + cardRect.height * 0.45;
        calculatedAnchors.push({ coordinateX: cardAnchorX, coordinateY: cardAnchorY });
      });

      const emailRect = emailBox.getBoundingClientRect();
      const endAnchorX = Math.max(16, emailRect.left - mainRectangle.left - 8);
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
    window.addEventListener('orientationchange', function () {
      isTrailGeometryInvalid = true;
      scheduleTrailUpdate();
    }, { passive: true });
    window.addEventListener('pageshow', function () {
      isTrailGeometryInvalid = true;
      scheduleTrailUpdate();
    });
    window.addEventListener('portfolio:layoutchange', function () {
      isTrailGeometryInvalid = true;
      scheduleTrailUpdate();
    });
    window.addEventListener('portfolio:motionchange', function (motionChangeEvent) {
      isEffectsPaused = Boolean(motionChangeEvent.detail && motionChangeEvent.detail.paused);
      scheduleTrailUpdate();
    });
    window.addEventListener('portfolio:viewchange', function (viewChangeEvent) {
      isViewBrief = Boolean(viewChangeEvent.detail && viewChangeEvent.detail.mode === 'brief');
      if (isViewBrief) {
        cancelTrailFrame();
        trailSvg.style.display = 'none';
      } else {
        trailSvg.style.display = '';
        isTrailGeometryInvalid = true;
        scheduleTrailUpdate();
      }
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

    if (typeof window.ResizeObserver === 'function') {
      const trailResizeObserver = new ResizeObserver(function () {
        isTrailGeometryInvalid = true;
        scheduleTrailUpdate();
      });
      trailResizeObserver.observe(mainContent);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        isTrailGeometryInvalid = true;
        scheduleTrailUpdate();
      });
    }

    setTimeout(function () {
      isTrailGeometryInvalid = true;
      scheduleTrailUpdate();
    }, 50);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initializeProjectXray();
    initializeFinanceLab();
    initializeBriefMode();
    initializeLightTrail();
  });
})();
