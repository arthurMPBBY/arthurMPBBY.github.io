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
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
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
})();
