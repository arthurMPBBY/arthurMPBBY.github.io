/**
 * ATLAS DE SISTEMAS — CAMADA CARTOGRÁFICA EDITORIAL
 * atlas-cartography.js
 *
 * Camada cartográfica pura em DOM/CSS:
 * - SEM canvas
 * - SEM loop requestAnimationFrame (rAF)
 * - Marcadores discretos de orientação e numeração nos 6 artefatos
 * - Painel compacto contextual na faixa inferior esquerda (desktop >= 1100px)
 * - Legenda superior sob a topbar com medidas claras
 * - Event delegation nos .artifact-trigger
 * - MutationObserver em html[data-view] e body classes
 * - Ocultação estrita em salas dedicadas, leitura direta, arte e móvel
 * - ZERO dimming dos demais projetos (preserva foco e nitidez)
 */

(function () {
  'use strict';

  // 1. Garante carregamento do CSS cartográfico de forma idempotente
  if (!document.querySelector('link[href*="atlas-cartography.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'atlas-cartography.css';
    document.head.appendChild(link);
  }

  // 2. Registro técnico e editorial fiel das 6 estações espaciais
  const STATIONS = {
    yahcw: {
      id: 'yahcw',
      index: '01',
      quadrant: 'NW',
      azimuth: '206°',
      coordsText: '-440, -220',
      distanceText: 'Δ 492px',
      category: 'Win32 · C# · DDC/CI',
      name: 'Seu desktop, pelos cantos',
      techSubtitle: 'YAHCW — Hot Corners e DWM',
      phrase: 'Janelas, áudio e brilho num só lugar.',
      ctaText: 'Explorar sala 01'
    },
    tuya: {
      id: 'tuya',
      index: '02',
      quadrant: 'NE',
      azimuth: '334°',
      coordsText: '+440, -220',
      distanceText: 'Δ 492px',
      category: 'Redes · Sockets TCP · OpenAPI',
      name: 'Luz sob seu controle',
      techSubtitle: 'tuya-smart-lamps',
      phrase: 'Automação local com alternativa pela nuvem.',
      ctaText: 'Explorar sala 02'
    },
    gaming: {
      id: 'gaming',
      index: '03',
      quadrant: 'SW',
      azimuth: '154°',
      coordsText: '-450, +220',
      distanceText: 'Δ 501px',
      category: 'C++17 · Vulkan · Wayland',
      name: 'Cada frame conta',
      techSubtitle: 'gaming-fps-hud',
      phrase: 'Observe FPS e variações no tempo de quadro.',
      ctaText: 'Explorar sala 03'
    },
    python: {
      id: 'python',
      index: '04',
      quadrant: 'SE',
      azimuth: '026°',
      coordsText: '+450, +220',
      distanceText: 'Δ 501px',
      category: 'Python 3 · Algoritmos UFABC',
      name: 'Da lógica ao código',
      techSubtitle: 'python-curso',
      phrase: 'Exercícios que transformam conceitos em programas.',
      ctaText: 'Explorar sala 04'
    },
    spotifast: {
      id: 'spotifast',
      index: '05',
      quadrant: 'N',
      azimuth: '270°',
      coordsText: '0, -350',
      distanceText: 'Δ 350px',
      category: 'Design Tokens · JSON',
      name: 'Uma interface, outra identidade',
      techSubtitle: 'spotifast-neon-theme',
      phrase: 'Explore cores e tokens de uma interface.',
      ctaText: 'Explorar sala 05'
    },
    financeiro: {
      id: 'financeiro',
      index: '06',
      quadrant: 'S',
      azimuth: '090°',
      coordsText: '0, +350',
      distanceText: 'Δ 350px',
      category: 'Finanças · Modelagem Quantitativa',
      name: 'Explore os juros compostos',
      techSubtitle: 'Laboratório Financeiro',
      phrase: 'Compare cenários com aportes, prazo e taxa.',
      ctaText: 'Explorar sala 06'
    }
  };

  let layerContainer = null;
  let contextPanel = null;
  let panelKicker = null;
  let panelVector = null;
  let panelTitle = null;
  let panelPhrase = null;
  let panelMeta = null;
  let panelAction = null;
  let topRuler = null;
  let activeStationKey = null;
  let idleTimeoutId = null;

  // 3. Monta marcadores de orientação discretos nos 6 artefatos espaciais
  function setupStationMarkers() {
    const artifacts = document.querySelectorAll('.spatial-artifact');
    if (!artifacts || artifacts.length === 0) return;

    artifacts.forEach(function (artifact) {
      const key = artifact.getAttribute('data-project');
      const data = STATIONS[key];
      if (!data) return;

      if (artifact.querySelector('.carto-station-marker')) return;

      const marker = document.createElement('div');
      marker.className = 'carto-station-marker';
      marker.setAttribute('aria-hidden', 'true');
      marker.innerHTML = `
        <span class="marker-quad">${data.quadrant} · ${data.index}</span>
        <span class="marker-sep">/</span>
        <span class="marker-coords">[${data.coordsText}]</span>
        <span class="marker-dist">${data.distanceText}</span>
      `;

      artifact.appendChild(marker);
    });
  }

  // 4. Monta a camada HUD cartográfica (Legenda Superior e Painel Inferior Esquerdo)
  function setupCartographyHUD() {
    if (document.getElementById('atlas-carto-layer')) {
      layerContainer = document.getElementById('atlas-carto-layer');
      return;
    }

    layerContainer = document.createElement('div');
    layerContainer.id = 'atlas-carto-layer';
    layerContainer.className = 'atlas-carto-layer';
    layerContainer.setAttribute('role', 'region');
    layerContainer.setAttribute('aria-label', 'Camada Cartográfica Editorial');

    // Legenda superior sob topbar fixa
    topRuler = document.createElement('div');
    topRuler.className = 'carto-top-ruler';
    topRuler.setAttribute('aria-hidden', 'true');
    topRuler.innerHTML = `
      <span class="ruler-dot"></span>
      <span>ORIGEM <span class="ruler-val">ÍRIS (0,0)</span></span>
      <span class="ruler-sep">/</span>
      <span>PROJEÇÃO <span class="ruler-val">CARTESIANA</span></span>
      <span class="ruler-sep">/</span>
      <span><span class="ruler-val">6</span> ESTAÇÕES ATIVAS</span>
    `;
    layerContainer.appendChild(topRuler);

    // Painel contextual na faixa inferior esquerda (>= 1100px)
    contextPanel = document.createElement('aside');
    contextPanel.className = 'carto-context-panel';
    contextPanel.setAttribute('aria-label', 'Dossiê Cartográfico do Projeto');

    contextPanel.innerHTML = `
      <header class="carto-panel-header">
        <span class="carto-panel-kicker" id="carto-kicker">CARTOGRAFIA ESPACIAL</span>
        <span class="carto-panel-vector" id="carto-vector">ORIGEM (0,0)</span>
      </header>
      <div class="carto-panel-body">
        <h3 class="carto-panel-title" id="carto-title">Íris Central de Sistemas</h3>
        <p class="carto-panel-phrase" id="carto-phrase">Passe o cursor ou use Tab para conhecer cada projeto.</p>
      </div>
      <footer class="carto-panel-footer">
        <span class="carto-panel-meta" id="carto-meta">COORDENADAS DO ATLAS · ORIGEM CENTRAL</span>
        <a href="#" class="carto-panel-action" id="carto-action" style="display:none;">Abrir estação &rarr;</a>
      </footer>
    `;

    layerContainer.appendChild(contextPanel);
    document.body.appendChild(layerContainer);

    panelKicker = document.getElementById('carto-kicker');
    panelVector = document.getElementById('carto-vector');
    panelTitle = document.getElementById('carto-title');
    panelPhrase = document.getElementById('carto-phrase');
    panelMeta = document.getElementById('carto-meta');
    panelAction = document.getElementById('carto-action');
    contextPanel.addEventListener('mouseenter', () => clearTimeout(idleTimeoutId));
    contextPanel.addEventListener('mouseleave', resetToIdleContext);
    contextPanel.addEventListener('focusin', () => clearTimeout(idleTimeoutId));
    contextPanel.addEventListener('focusout', e => { if (!contextPanel.contains(e.relatedTarget)) resetToIdleContext(); });

    // Clique na ação do painel despacha navegação para o artefato real
    panelAction.addEventListener('click', function (e) {
      e.preventDefault();
      if (!activeStationKey) return;
      const trigger = document.querySelector(`.artifact-trigger[data-enter-room="${activeStationKey}"]`);
      if (trigger) {
        trigger.click();
      } else {
        window.location.hash = activeStationKey;
      }
    });
  }

  // 5. Atualização de estado do painel contextual
  function renderStationContext(key) {
    if (!contextPanel) return;
    clearTimeout(idleTimeoutId);

    const data = STATIONS[key];
    if (!data) return;

    activeStationKey = key;
    contextPanel.classList.add('is-active');

    if (panelKicker) panelKicker.textContent = `${data.index} · ${data.category}`;
    if (panelVector) panelVector.textContent = `${data.quadrant} [${data.coordsText}] · ${data.distanceText}`;
    if (panelTitle) panelTitle.textContent = `${data.name} (${data.techSubtitle})`;
    if (panelPhrase) panelPhrase.textContent = data.phrase;
    if (panelMeta) panelMeta.textContent = `MARCO ${data.index} · QUADRANTE ${data.quadrant}`;
    if (panelAction) {
      panelAction.style.display = 'inline-flex';
      panelAction.textContent = `${data.ctaText} →`;
      panelAction.setAttribute('href', `#${data.id}`);
    }

    // Marca artefato correspondente como alvo (sem alterar os demais)
    document.querySelectorAll('.spatial-artifact').forEach(function (art) {
      if (art.getAttribute('data-project') === key) {
        art.classList.add('is-targeted');
      } else {
        art.classList.remove('is-targeted');
      }
    });
  }

  function resetToIdleContext() {
    clearTimeout(idleTimeoutId);
    idleTimeoutId = setTimeout(function () {
      if (!contextPanel) return;
      activeStationKey = null;
      contextPanel.classList.remove('is-active');

      if (panelKicker) panelKicker.textContent = 'CARTOGRAFIA ESPACIAL';
      if (panelVector) panelVector.textContent = 'ORIGEM (0,0)';
      if (panelTitle) panelTitle.textContent = 'Íris Central de Sistemas';
      if (panelPhrase) panelPhrase.textContent = 'Passe o cursor ou use Tab para conhecer cada projeto.';
      if (panelMeta) panelMeta.textContent = 'COORDENADAS DO ATLAS · ORIGEM CENTRAL';
      if (panelAction) {
        panelAction.style.display = 'none';
      }

      document.querySelectorAll('.spatial-artifact.is-targeted').forEach(function (art) {
        art.classList.remove('is-targeted');
      });
    }, 180);
  }

  // 6. Delegação de eventos nos artefatos (.artifact-trigger e .spatial-artifact)
  function setupEventDelegation() {
    function resolveProjectKey(target) {
      if (!target || !(target instanceof Element)) return null;
      const trigger = target.closest('.artifact-trigger');
      if (trigger) {
        return trigger.getAttribute('data-enter-room') || trigger.closest('.spatial-artifact')?.getAttribute('data-project');
      }
      const artifact = target.closest('.spatial-artifact');
      if (artifact) {
        return artifact.getAttribute('data-project');
      }
      return null;
    }

    document.addEventListener('mouseover', function (e) {
      const key = resolveProjectKey(e.target);
      if (key && STATIONS[key]) {
        renderStationContext(key);
      }
    }, { passive: true });

    document.addEventListener('mouseout', function (e) {
      const currentKey = resolveProjectKey(e.target);
      const relatedKey = resolveProjectKey(e.relatedTarget);
      if (currentKey && currentKey !== relatedKey) {
        // Se moveu para dentro do próprio painel contextual, não reseta
        if (e.relatedTarget && e.relatedTarget instanceof Element && e.relatedTarget.closest('.carto-context-panel')) {
          return;
        }
        resetToIdleContext();
      }
    }, { passive: true });

    document.addEventListener('focusin', function (e) {
      const key = resolveProjectKey(e.target);
      if (key && STATIONS[key]) {
        renderStationContext(key);
      }
    }, { passive: true });

    document.addEventListener('focusout', function (e) {
      const currentKey = resolveProjectKey(e.target);
      const relatedKey = resolveProjectKey(e.relatedTarget);
      if (currentKey && currentKey !== relatedKey) {
        resetToIdleContext();
      }
    }, { passive: true });
  }

  // 7. MutationObserver em html[data-view] e body classes
  // Desaparece estritamente em rooms, direct, arte e móvel
  function setupViewObserver() {
    function updateVisibility() {
      const currentView = document.documentElement.getAttribute('data-view') || 'atlas';
      const isBodyAtlas = document.body.classList.contains('mode-atlas');
      const isBodyDirect = document.body.classList.contains('mode-direct');
      const isBodyRoom = document.body.classList.contains('mode-room');

      const shouldShow = currentView === 'atlas' && !isBodyDirect && !isBodyRoom;

      if (layerContainer) {
        if (shouldShow) {
          layerContainer.classList.remove('is-view-hidden');
          layerContainer.removeAttribute('aria-hidden');
        } else {
          layerContainer.classList.add('is-view-hidden');
          layerContainer.setAttribute('aria-hidden', 'true');
        }
      }
    }

    const observer = new MutationObserver(function () {
      updateVisibility();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-view']
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Chamada inicial de conferência de visibilidade
    updateVisibility();
  }

  // 8. Inicialização quando o DOM estiver pronto
  function init() {
    setupStationMarkers();
    setupCartographyHUD();
    setupEventDelegation();
    setupViewObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
