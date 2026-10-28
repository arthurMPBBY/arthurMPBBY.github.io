(function () {
  'use strict';

  function validateNumericArgument(numericValue, parameterDescription, minimumAllowed, maximumAllowed, requiresInteger) {
    if (typeof numericValue !== 'number' || typeof numericValue === 'boolean' || numericValue === null || !Number.isFinite(numericValue)) {
      throw new Error(parameterDescription + ' deve ser um numero valido.');
    }
    if (requiresInteger && !Number.isInteger(numericValue)) {
      throw new Error(parameterDescription + ' deve ser um numero inteiro.');
    }
    if (numericValue < minimumAllowed || numericValue > maximumAllowed) {
      throw new Error(parameterDescription + ' fora do intervalo permitido (' + minimumAllowed + ' a ' + maximumAllowed + ').');
    }
    return numericValue;
  }

  function calculate(parameters) {
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
      throw new Error('Parametros invalidos para o calculo financeiro.');
    }

    const initialAmount = validateNumericArgument(
      parameters.initialAmount,
      'Valor inicial',
      0,
      1000000,
      false
    );
    const monthlyContribution = validateNumericArgument(
      parameters.monthlyContribution,
      'Aporte mensal',
      0,
      10000,
      false
    );
    const annualRatePercent = validateNumericArgument(
      parameters.annualRatePercent,
      'Taxa anual',
      0,
      30,
      false
    );
    const months = validateNumericArgument(
      parameters.months,
      'Prazo em meses',
      1,
      360,
      true
    );

    const monthlyRate = annualRatePercent === 0
      ? 0
      : Math.expm1(Math.log1p(annualRatePercent / 100) / 12);

    const points = [];
    let currentBalance = initialAmount;
    let currentContributed = initialAmount;

    points.push({
      month: 0,
      balance: currentBalance,
      contributed: currentContributed
    });

    for (let currentMonth = 1; currentMonth <= months; currentMonth += 1) {
      currentBalance = currentBalance * (1 + monthlyRate) + monthlyContribution;
      currentContributed = initialAmount + monthlyContribution * currentMonth;
      points.push({
        month: currentMonth,
        balance: currentBalance,
        contributed: currentContributed
      });
    }

    const finalBalance = currentBalance;
    const totalContributed = currentContributed;
    const interest = finalBalance - totalContributed;

    return {
      monthlyRate: monthlyRate,
      points: points,
      totalContributed: totalContributed,
      finalBalance: finalBalance,
      interest: interest
    };
  }

  window.PortfolioFinance = {
    calculate: calculate
  };
})();
