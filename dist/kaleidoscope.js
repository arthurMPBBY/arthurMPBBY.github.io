(function () {
  const documentRoot = document.documentElement;

  function initializeKaleidoscope() {
    let canvasElement = document.getElementById('kaleidoscope-canvas');
    const viewportContainer = document.getElementById('spatial-viewport');

    if (!viewportContainer) {
      return;
    }

    if (!canvasElement) {
      canvasElement = document.createElement('canvas');
      canvasElement.id = 'kaleidoscope-canvas';
      canvasElement.className = 'kaleidoscope-canvas';
      canvasElement.setAttribute('aria-hidden', 'true');
      canvasElement.style.pointerEvents = 'none';

      const existingAtlasCanvas = document.getElementById('atlas-canvas');
      if (existingAtlasCanvas && existingAtlasCanvas.parentNode === viewportContainer) {
        viewportContainer.insertBefore(canvasElement, existingAtlasCanvas);
      } else {
        viewportContainer.insertBefore(canvasElement, viewportContainer.firstChild);
      }
    }

    let glContext = null;
    try {
      glContext = canvasElement.getContext('webgl', {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false,
        powerPreference: 'low-power'
      }) || canvasElement.getContext('experimental-webgl');
    } catch (contextError) {
      glContext = null;
    }

    if (!glContext) {
      canvasElement.style.display = 'none';
      documentRoot.classList.remove('has-kaleidoscope');
      return;
    }

    const vertexShaderSource = [
      'attribute vec2 attributeVertexPosition;',
      'void main(void) {',
      '  gl_Position = vec4(attributeVertexPosition, 0.0, 1.0);',
      '}'
    ].join('\n');

    const fragmentShaderSource = [
      'precision mediump float;',
      'uniform vec2 uniformResolution;',
      'uniform vec2 uniformPointer;',
      'uniform float uniformRotation;',
      'uniform float uniformIntensity;',
      'void main(void) {',
      '  vec2 normalizedCoordinate = (gl_FragCoord.xy - 0.5 * uniformResolution) / min(uniformResolution.x, uniformResolution.y);',
      '  vec3 cameraRayOrigin = vec3(uniformPointer.x * 0.32, uniformPointer.y * 0.32, 2.2);',
      '  vec3 cameraRayDirection = normalize(vec3(normalizedCoordinate.x, normalizedCoordinate.y, -1.65));',
      '  float intersectionDistance = -cameraRayOrigin.z / cameraRayDirection.z;',
      '  vec3 chamberHitPoint = cameraRayOrigin + cameraRayDirection * intersectionDistance;',
      '  vec2 chamberPlaneCoordinate = chamberHitPoint.xy;',
      '  float cosineRotation = cos(uniformRotation);',
      '  float sineRotation = sin(uniformRotation);',
      '  mat2 rotationTransform = mat2(cosineRotation, -sineRotation, sineRotation, cosineRotation);',
      '  chamberPlaneCoordinate = rotationTransform * chamberPlaneCoordinate;',
      '  const float kaleidoscopeFoldCount = 12.0;',
      '  float sectorSliceAngle = 6.283185307179586 / kaleidoscopeFoldCount;',
      '  float polarDistance = length(chamberPlaneCoordinate);',
      '  float polarSectorAngle = atan(chamberPlaneCoordinate.y, chamberPlaneCoordinate.x);',
      '  polarSectorAngle = mod(polarSectorAngle, sectorSliceAngle);',
      '  if (polarSectorAngle > 0.5 * sectorSliceAngle) {',
      '    polarSectorAngle = sectorSliceAngle - polarSectorAngle;',
      '  }',
      '  vec2 foldedSectorPoint = vec2(cos(polarSectorAngle), sin(polarSectorAngle)) * polarDistance;',
      '  const float inverseSqrtThree = 0.577350269189626;',
      '  const float twoOverSqrtThree = 1.154700538379252;',
      '  const float triangularCellScale = 5.2;',
      '  vec2 isometricCoordinates = vec2(',
      '    foldedSectorPoint.x - foldedSectorPoint.y * inverseSqrtThree,',
      '    foldedSectorPoint.y * twoOverSqrtThree',
      '  ) * triangularCellScale;',
      '  vec2 cellIndex = floor(isometricCoordinates);',
      '  vec2 cellFraction = fract(isometricCoordinates);',
      '  bool isUpperTriangle = (cellFraction.x + cellFraction.y) >= 1.0;',
      '  vec3 barycentricDistances;',
      '  if (isUpperTriangle) {',
      '    barycentricDistances = vec3(',
      '      1.0 - cellFraction.x,',
      '      1.0 - cellFraction.y,',
      '      (cellFraction.x + cellFraction.y) - 1.0',
      '    );',
      '  } else {',
      '    barycentricDistances = vec3(',
      '      cellFraction.x,',
      '      cellFraction.y,',
      '      1.0 - (cellFraction.x + cellFraction.y)',
      '    );',
      '  }',
      '  float minimumEdgeDistance = min(barycentricDistances.x, min(barycentricDistances.y, barycentricDistances.z));',
      '  vec2 planarFacetNormal2D = vec2(0.0, 0.0);',
      '  if (barycentricDistances.x <= barycentricDistances.y && barycentricDistances.x <= barycentricDistances.z) {',
      '    planarFacetNormal2D = vec2(-0.866025, 0.500000) * (isUpperTriangle ? -1.0 : 1.0);',
      '  } else if (barycentricDistances.y <= barycentricDistances.z) {',
      '    planarFacetNormal2D = vec2(0.000000, -1.000000) * (isUpperTriangle ? -1.0 : 1.0);',
      '  } else {',
      '    planarFacetNormal2D = vec2(0.866025, 0.500000) * (isUpperTriangle ? -1.0 : 1.0);',
      '  }',
      '  float cellParity = mod(cellIndex.x + cellIndex.y, 2.0);',
      '  float facetOrientationSign = (cellParity > 0.5) ? 1.0 : -1.0;',
      '  float concentricTierFraction = fract(polarDistance * 4.2);',
      '  float concentricRingEdge = min(concentricTierFraction, 1.0 - concentricTierFraction);',
      '  float combinedEdgeDistance = min(minimumEdgeDistance * 0.45, concentricRingEdge * 0.35);',
      '  vec3 surfaceFacetNormal = normalize(vec3(',
      '    planarFacetNormal2D.x * 0.42 * facetOrientationSign,',
      '    planarFacetNormal2D.y * 0.42 * facetOrientationSign,',
      '    1.15',
      '  ));',
      '  vec3 primaryLightDirection = normalize(vec3(',
      '    uniformPointer.x * 0.55 - normalizedCoordinate.x,',
      '    uniformPointer.y * 0.55 - normalizedCoordinate.y,',
      '    1.65',
      '  ));',
      '  float facetDiffuseLight = clamp(dot(surfaceFacetNormal, primaryLightDirection), 0.0, 1.0);',
      '  vec3 reflectionHalfwayVector = normalize(primaryLightDirection - cameraRayDirection);',
      '  float facetSpecularHighlight = pow(clamp(dot(surfaceFacetNormal, reflectionHalfwayVector), 0.0, 1.0), 42.0);',
      '  const vec3 colorPaper = vec3(0.95686, 0.96471, 0.97647);',
      '  const vec3 colorPaperWhite = vec3(1.000, 1.000, 1.000);',
      '  const vec3 colorInkDark = vec3(0.04314, 0.05882, 0.08235);',
      '  const vec3 colorInkSlate = vec3(0.23922, 0.27843, 0.34902);',
      '  const vec3 colorSilver = vec3(0.91373, 0.93333, 0.95686);',
      '  const vec3 colorCoral = vec3(0.85098, 0.26275, 0.18039);',
      '  float chamberDepthShade = clamp((polarDistance - 0.28) * 0.55, 0.0, 0.32);',
      '  vec3 facetResultColor = mix(colorPaper, colorSilver, 0.35 + facetDiffuseLight * 0.50);',
      '  facetResultColor = mix(facetResultColor, colorInkSlate, chamberDepthShade * (1.0 - facetDiffuseLight * 0.65));',
      '  facetResultColor += colorPaperWhite * (facetSpecularHighlight * 0.55);',
      '  float hairlineEdgeMask = 1.0 - smoothstep(0.015, 0.065, combinedEdgeDistance * 12.0);',
      '  facetResultColor = mix(facetResultColor, colorInkDark, hairlineEdgeMask * 0.28);',
      '  float vertexDistance = length(vec2(',
      '    min(barycentricDistances.x, barycentricDistances.y),',
      '    min(barycentricDistances.y, barycentricDistances.z)',
      '  ));',
      '  float coralJewelMask = pow(clamp(1.0 - vertexDistance * 14.0, 0.0, 1.0), 4.0) * pow(facetDiffuseLight, 2.0);',
      '  facetResultColor = mix(facetResultColor, colorCoral, coralJewelMask * 0.65);',
      '  float projectFieldDistance = length(normalizedCoordinate * vec2(1.0, 1.25));',
      '  float clearInnerRadius = 0.22;',
      '  float clearOuterRadius = 0.70;',
      '  float peripheralFieldVisibility = smoothstep(clearInnerRadius, clearOuterRadius, projectFieldDistance);',
      '  vec3 finalCanvasColor = mix(colorPaper, facetResultColor, peripheralFieldVisibility * uniformIntensity);',
      '  gl_FragColor = vec4(finalCanvasColor, 1.0);',
      '}'
    ].join('\n');

    let shaderProgram = null;
    let vertexBuffer = null;
    let uniformResolutionLocation = null;
    let uniformPointerLocation = null;
    let uniformRotationLocation = null;
    let uniformIntensityLocation = null;

    function cleanupPartialResources(targetShaderOne, targetShaderTwo, targetProgramInstance, targetBufferInstance) {
      try {
        if (targetShaderOne && glContext) {
          glContext.deleteShader(targetShaderOne);
        }
        if (targetShaderTwo && glContext) {
          glContext.deleteShader(targetShaderTwo);
        }
        if (targetProgramInstance && glContext) {
          glContext.deleteProgram(targetProgramInstance);
        }
        if (targetBufferInstance && glContext) {
          glContext.deleteBuffer(targetBufferInstance);
        }
      } catch (cleanupError) {
        return false;
      }
      return true;
    }

    function setupWebGLPipeline() {
      if (!glContext) {
        return false;
      }

      let compiledVertexShader = null;
      let compiledFragmentShader = null;
      let constructedProgram = null;
      let allocatedBuffer = null;

      try {
        compiledVertexShader = glContext.createShader(glContext.VERTEX_SHADER);
        if (!compiledVertexShader) {
          return false;
        }
        glContext.shaderSource(compiledVertexShader, vertexShaderSource);
        glContext.compileShader(compiledVertexShader);
        if (!glContext.getShaderParameter(compiledVertexShader, glContext.COMPILE_STATUS)) {
          cleanupPartialResources(compiledVertexShader, null, null, null);
          return false;
        }

        compiledFragmentShader = glContext.createShader(glContext.FRAGMENT_SHADER);
        if (!compiledFragmentShader) {
          cleanupPartialResources(compiledVertexShader, null, null, null);
          return false;
        }
        glContext.shaderSource(compiledFragmentShader, fragmentShaderSource);
        glContext.compileShader(compiledFragmentShader);
        if (!glContext.getShaderParameter(compiledFragmentShader, glContext.COMPILE_STATUS)) {
          cleanupPartialResources(compiledVertexShader, compiledFragmentShader, null, null);
          return false;
        }

        constructedProgram = glContext.createProgram();
        if (!constructedProgram) {
          cleanupPartialResources(compiledVertexShader, compiledFragmentShader, null, null);
          return false;
        }
        glContext.attachShader(constructedProgram, compiledVertexShader);
        glContext.attachShader(constructedProgram, compiledFragmentShader);
        glContext.linkProgram(constructedProgram);

        if (!glContext.getProgramParameter(constructedProgram, glContext.LINK_STATUS)) {
          cleanupPartialResources(compiledVertexShader, compiledFragmentShader, constructedProgram, null);
          return false;
        }

        glContext.useProgram(constructedProgram);

        const quadVertices = new Float32Array([
          -1.0, -1.0,
           1.0, -1.0,
          -1.0,  1.0,
          -1.0,  1.0,
           1.0, -1.0,
           1.0,  1.0
        ]);

        allocatedBuffer = glContext.createBuffer();
        if (!allocatedBuffer) {
          cleanupPartialResources(compiledVertexShader, compiledFragmentShader, constructedProgram, null);
          return false;
        }
        glContext.bindBuffer(glContext.ARRAY_BUFFER, allocatedBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, quadVertices, glContext.STATIC_DRAW);

        const positionAttributeLocation = glContext.getAttribLocation(constructedProgram, 'attributeVertexPosition');
        if (positionAttributeLocation < 0) {
          cleanupPartialResources(compiledVertexShader, compiledFragmentShader, constructedProgram, allocatedBuffer);
          return false;
        }
        glContext.enableVertexAttribArray(positionAttributeLocation);
        glContext.vertexAttribPointer(positionAttributeLocation, 2, glContext.FLOAT, false, 0, 0);

        uniformResolutionLocation = glContext.getUniformLocation(constructedProgram, 'uniformResolution');
        uniformPointerLocation = glContext.getUniformLocation(constructedProgram, 'uniformPointer');
        uniformRotationLocation = glContext.getUniformLocation(constructedProgram, 'uniformRotation');
        uniformIntensityLocation = glContext.getUniformLocation(constructedProgram, 'uniformIntensity');

        shaderProgram = constructedProgram;
        vertexBuffer = allocatedBuffer;
        return true;
      } catch (pipelineError) {
        cleanupPartialResources(compiledVertexShader, compiledFragmentShader, constructedProgram, allocatedBuffer);
        shaderProgram = null;
        vertexBuffer = null;
        return false;
      }
    }

    const pipelineInitialized = setupWebGLPipeline();
    if (!pipelineInitialized) {
      canvasElement.style.display = 'none';
      documentRoot.classList.remove('has-kaleidoscope');
      return;
    }

    let isContextLost = false;
    let targetPointerX = 0.0;
    let targetPointerY = 0.0;
    let startPointerX = 0.0;
    let startPointerY = 0.0;
    let currentPointerX = 0.0;
    let currentPointerY = 0.0;
    let targetRotationAngle = 0.0;
    let startRotationAngle = 0.0;
    let currentRotationAngle = 0.0;
    let lastEventClientX = window.innerWidth * 0.5;
    let lastEventClientY = window.innerHeight * 0.5;
    let settlingStartTimestamp = 0;
    const pointerSettlingDuration = 700.0;
    let animationFrameIdentifier = 0;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerCoarseQuery = window.matchMedia('(pointer: coarse)');

    function checkMotionActive() {
      if (reducedMotionQuery.matches || pointerCoarseQuery.matches) {
        return false;
      }
      const motionAttribute = documentRoot.getAttribute('data-motion');
      if (motionAttribute === 'paused') {
        return false;
      }
      return true;
    }

    function checkAtlasViewActive() {
      const activeViewAttribute = documentRoot.getAttribute('data-view');
      if (activeViewAttribute === 'room' || activeViewAttribute === 'direct') {
        return false;
      }
      const requestedRoute = window.location.hash.slice(1);
      if (requestedRoute === 'leitura' || requestedRoute === 'laboratorio' ||
          document.getElementById('room-' + requestedRoute) ||
          document.getElementById('overlay-' + requestedRoute)) {
        return false;
      }
      return true;
    }

    function checkDocumentHidden() {
      return document.hidden === true || document.visibilityState === 'hidden';
    }

    function stopSettlingAnimation() {
      if (animationFrameIdentifier) {
        window.cancelAnimationFrame(animationFrameIdentifier);
        animationFrameIdentifier = 0;
      }
    }

    function updateCanvasDimensions() {
      if (isContextLost || !glContext) {
        return false;
      }
      const devicePixelScale = Math.min(window.devicePixelRatio || 1.0, 1.5);
      const displayPixelWidth = Math.max(1, Math.floor(canvasElement.clientWidth * devicePixelScale));
      const displayPixelHeight = Math.max(1, Math.floor(canvasElement.clientHeight * devicePixelScale));

      if (canvasElement.width !== displayPixelWidth || canvasElement.height !== displayPixelHeight) {
        canvasElement.width = displayPixelWidth;
        canvasElement.height = displayPixelHeight;
        glContext.viewport(0, 0, displayPixelWidth, displayPixelHeight);
        return true;
      }
      return false;
    }

    function renderSingleFrame() {
      if (isContextLost || !glContext || !shaderProgram || !checkAtlasViewActive() || checkDocumentHidden()) {
        if (checkDocumentHidden()) {
          stopSettlingAnimation();
        }
        return;
      }
      updateCanvasDimensions();
      glContext.useProgram(shaderProgram);
      glContext.uniform2f(uniformResolutionLocation, canvasElement.width, canvasElement.height);
      glContext.uniform2f(uniformPointerLocation, currentPointerX, currentPointerY);
      glContext.uniform1f(uniformRotationLocation, currentRotationAngle);
      glContext.uniform1f(uniformIntensityLocation, 1.0);
      glContext.drawArrays(glContext.TRIANGLES, 0, 6);

      if (!documentRoot.classList.contains('has-kaleidoscope')) {
        documentRoot.classList.add('has-kaleidoscope');
      }
    }

    function animationSettlingStep(currentFrameTimestamp) {
      if (isContextLost || !glContext || !shaderProgram || !checkAtlasViewActive() || checkDocumentHidden()) {
        stopSettlingAnimation();
        return;
      }

      const currentTimestamp = currentFrameTimestamp || performance.now();
      const elapsedMilliseconds = currentTimestamp - settlingStartTimestamp;

      if (elapsedMilliseconds >= pointerSettlingDuration) {
        currentPointerX = targetPointerX;
        currentPointerY = targetPointerY;
        currentRotationAngle = targetRotationAngle;
        renderSingleFrame();
        stopSettlingAnimation();
        return;
      }

      const normalizedProgress = Math.min(Math.max(elapsedMilliseconds / pointerSettlingDuration, 0.0), 1.0);
      const easingMultiplier = 1.0 - Math.pow(1.0 - normalizedProgress, 3.0);

      currentPointerX = startPointerX + (targetPointerX - startPointerX) * easingMultiplier;
      currentPointerY = startPointerY + (targetPointerY - startPointerY) * easingMultiplier;
      currentRotationAngle = startRotationAngle + (targetRotationAngle - startRotationAngle) * easingMultiplier;

      renderSingleFrame();
      animationFrameIdentifier = window.requestAnimationFrame(animationSettlingStep);
    }

    function handlePointerMove(pointerEvent) {
      if (pointerEvent.pointerType === 'touch') {
        return;
      }
      if (!checkAtlasViewActive() || !checkMotionActive() || pointerCoarseQuery.matches) {
        return;
      }
      if (checkDocumentHidden()) {
        return;
      }

      const clientCoordX = pointerEvent.clientX;
      const clientCoordY = pointerEvent.clientY;
      const viewportWidth = window.innerWidth || 1;
      const viewportHeight = window.innerHeight || 1;

      const deltaCoordX = (clientCoordX - lastEventClientX) / viewportWidth;
      const deltaCoordY = (clientCoordY - lastEventClientY) / viewportHeight;

      lastEventClientX = clientCoordX;
      lastEventClientY = clientCoordY;

      targetPointerX = (clientCoordX / viewportWidth) * 2.0 - 1.0;
      targetPointerY = -((clientCoordY / viewportHeight) * 2.0 - 1.0);

      targetRotationAngle += (deltaCoordX * 0.55 - deltaCoordY * 0.40);

      startPointerX = currentPointerX;
      startPointerY = currentPointerY;
      startRotationAngle = currentRotationAngle;
      settlingStartTimestamp = performance.now();

      if (!animationFrameIdentifier) {
        animationFrameIdentifier = window.requestAnimationFrame(animationSettlingStep);
      }
    }

    function handleResize() {
      if (!checkAtlasViewActive() || checkDocumentHidden()) {
        return;
      }
      updateCanvasDimensions();
      renderSingleFrame();
    }

    function handleVisibilityChange() {
      if (checkDocumentHidden()) {
        stopSettlingAnimation();
      } else {
        if (checkAtlasViewActive()) {
          renderSingleFrame();
        }
      }
    }

    function syncDocumentState() {
      const isAtlasView = checkAtlasViewActive();
      const isMotionAllowed = checkMotionActive();

      if (!isAtlasView) {
        stopSettlingAnimation();
        canvasElement.style.opacity = '0';
        canvasElement.style.visibility = 'hidden';
        return;
      }

      canvasElement.style.opacity = '1';
      canvasElement.style.visibility = 'visible';

      if (!isMotionAllowed) {
        stopSettlingAnimation();
        currentPointerX = targetPointerX;
        currentPointerY = targetPointerY;
        currentRotationAngle = targetRotationAngle;
      }

      renderSingleFrame();
    }

    const stateObserver = new MutationObserver(function (mutationRecords) {
      for (let recordIndex = 0; recordIndex < mutationRecords.length; recordIndex += 1) {
        const recordItem = mutationRecords[recordIndex];
        if (recordItem.attributeName === 'data-view' || recordItem.attributeName === 'data-motion') {
          syncDocumentState();
        }
      }
    });

    stateObserver.observe(documentRoot, {
      attributes: true,
      attributeFilter: ['data-view', 'data-motion']
    });

    reducedMotionQuery.addEventListener('change', syncDocumentState);
    pointerCoarseQuery.addEventListener('change', syncDocumentState);

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('hashchange', syncDocumentState, { passive: true });
    window.addEventListener('popstate', syncDocumentState, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    canvasElement.addEventListener('webglcontextlost', function (eventObject) {
      eventObject.preventDefault();
      isContextLost = true;
      stopSettlingAnimation();
      canvasElement.style.display = 'none';
      documentRoot.classList.remove('has-kaleidoscope');
    });

    canvasElement.addEventListener('webglcontextrestored', function () {
      isContextLost = false;
      const restoredPipelineSuccess = setupWebGLPipeline();
      if (restoredPipelineSuccess) {
        canvasElement.style.display = '';
        renderSingleFrame();
      } else {
        canvasElement.style.display = 'none';
        documentRoot.classList.remove('has-kaleidoscope');
      }
    });

    if (!checkAtlasViewActive() || checkDocumentHidden()) {
      canvasElement.style.opacity = '0';
      canvasElement.style.visibility = 'hidden';
    } else {
      renderSingleFrame();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeKaleidoscope, { once: true });
  } else {
    initializeKaleidoscope();
  }
})();
