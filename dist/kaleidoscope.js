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
      '',
      'mat2 rot2d(float angle) {',
      '  float cosine = cos(angle);',
      '  float sine = sin(angle);',
      '  return mat2(cosine, -sine, sine, cosine);',
      '}',
      '',
      'void main(void) {',
      '  vec2 normalizedCoordinate = (gl_FragCoord.xy - 0.5 * uniformResolution) / min(uniformResolution.x, uniformResolution.y);',
      '  float distCenter = length(normalizedCoordinate);',
      '',
      '  vec3 chamberBase = mix(vec3(0.040, 0.052, 0.065), vec3(0.016, 0.022, 0.028), smoothstep(0.15, 1.10, distCenter));',
      '',
      '  float emeraldAtmosphere = smoothstep(0.40, 1.25, distCenter) * 0.48;',
      '  vec3 emeraldTint = vec3(0.045, 0.38, 0.28);',
      '  vec3 sceneColor = chamberBase + emeraldTint * emeraldAtmosphere;',
      '',
      '  float wallGrooves = sin(distCenter * 90.0) * 0.012;',
      '  sceneColor += vec3(wallGrooves);',
      '',
      '  vec3 cameraRayOrigin = vec3(uniformPointer.x * 0.38, uniformPointer.y * 0.38, 2.5);',
      '  vec3 cameraRayDirection = normalize(vec3(normalizedCoordinate.x, normalizedCoordinate.y, -1.85));',
      '',
      '  vec3 keyLight = normalize(vec3(0.7 + uniformPointer.x * 0.3, 0.9 + uniformPointer.y * 0.3, 1.6));',
      '  vec3 emeraldRimLight = normalize(vec3(-0.85, -0.45, 0.9));',
      '',
      '  for (int ringIndex = 0; ringIndex < 5; ringIndex++) {',
      '    float ringRadius;',
      '    float ringWidth;',
      '    float tiltX;',
      '    float tiltY;',
      '    float depthZ;',
      '    float speedRatio;',
      '    if (ringIndex == 0) {',
      '      ringRadius = 0.94; ringWidth = 0.050; tiltX =  0.54; tiltY =  0.32; depthZ = -0.18; speedRatio =  0.30;',
      '    } else if (ringIndex == 1) {',
      '      ringRadius = 0.76; ringWidth = 0.046; tiltX = -0.46; tiltY =  0.55; depthZ = -0.08; speedRatio = -0.50;',
      '    } else if (ringIndex == 2) {',
      '      ringRadius = 0.58; ringWidth = 0.040; tiltX =  0.60; tiltY = -0.38; depthZ =  0.02; speedRatio =  0.75;',
      '    } else if (ringIndex == 3) {',
      '      ringRadius = 0.42; ringWidth = 0.034; tiltX = -0.34; tiltY = -0.50; depthZ =  0.10; speedRatio = -1.05;',
      '    } else {',
      '      ringRadius = 0.28; ringWidth = 0.028; tiltX =  0.12; tiltY =  0.18; depthZ =  0.18; speedRatio =  1.40;',
      '    }',
      '',
      '    float ringPrecession = uniformRotation * speedRatio;',
      '    mat2 pitchMatrix = rot2d(tiltX + uniformPointer.y * 0.14);',
      '    mat2 yawMatrix = rot2d(tiltY + uniformPointer.x * 0.16);',
      '',
      '    vec3 ringNormal = vec3(0.0, 0.0, 1.0);',
      '    ringNormal.xz = yawMatrix * ringNormal.xz;',
      '    ringNormal.yz = pitchMatrix * ringNormal.yz;',
      '    ringNormal = normalize(ringNormal);',
      '',
      '    vec3 ringCenter = vec3(0.0, 0.0, depthZ);',
      '',
      '    float rayDotNormal = dot(cameraRayDirection, ringNormal);',
      '    if (abs(rayDotNormal) > 0.001) {',
      '      float hitDistance = dot(ringCenter - cameraRayOrigin, ringNormal) / rayDotNormal;',
      '      if (hitDistance > 0.0) {',
      '        vec3 hitPoint = cameraRayOrigin + hitDistance * cameraRayDirection;',
      '        vec3 relPos = hitPoint - ringCenter;',
      '',
      '        vec3 uVec = normalize(cross(abs(ringNormal.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), ringNormal));',
      '        vec3 vVec = cross(ringNormal, uVec);',
      '',
      '        float localU = dot(relPos, uVec);',
      '        float localV = dot(relPos, vVec);',
      '',
      '        vec2 ringCoord = rot2d(ringPrecession) * vec2(localU, localV);',
      '        float rDist = length(ringCoord);',
      '        float rAngle = atan(ringCoord.y, ringCoord.x);',
      '',
      '        float ringSignedDist = abs(rDist - ringRadius) - ringWidth;',
      '',
      '        if (ringSignedDist < 0.015) {',
      '          float radialGroove = sin(rDist * 280.0) * 0.05;',
      '          vec3 metalShade = mix(vec3(0.07, 0.09, 0.11), vec3(0.15, 0.19, 0.23), 0.5 + radialGroove);',
      '',
      '          float rimNormalized = (rDist - ringRadius) / ringWidth;',
      '          vec3 surfaceNormal = normalize(',
      '            ringNormal * 1.35 +',
      '            (uVec * ringCoord.x + vVec * ringCoord.y) / max(0.001, rDist) * rimNormalized * 0.85',
      '          );',
      '',
      '          float diffLight = max(dot(surfaceNormal, keyLight), 0.0);',
      '          vec3 halfVecKey = normalize(keyLight - cameraRayDirection);',
      '          float specHighlight = pow(max(dot(surfaceNormal, halfVecKey), 0.0), 38.0);',
      '',
      '          float rimDiff = max(dot(surfaceNormal, emeraldRimLight), 0.0);',
      '          vec3 rimEmeraldGleam = vec3(0.08, 0.65, 0.48) * (rimDiff * 0.35);',
      '',
      '          vec3 ringColor = metalShade * (0.35 + diffLight * 0.65) + vec3(specHighlight * 0.36) + rimEmeraldGleam;',
      '',
      '          float angleDeg = rAngle * 57.2957795;',
      '          float tick30 = abs(fract(angleDeg / 30.0 + 0.5) - 0.5) * 30.0;',
      '          float tick10 = abs(fract(angleDeg / 10.0 + 0.5) - 0.5) * 10.0;',
      '          float tick2  = abs(fract(angleDeg / 2.5 + 0.5) - 0.5) * 2.5;',
      '',
      '          float luminousMark = 0.0;',
      '          if (tick30 < 0.65 && abs(rimNormalized) < 0.80) {',
      '            luminousMark = 1.0;',
      '          } else if (tick10 < 0.42 && abs(rimNormalized) < 0.55) {',
      '            luminousMark = 0.85;',
      '          } else if (tick2 < 0.24 && abs(rimNormalized) < 0.35) {',
      '            luminousMark = 0.65;',
      '          }',
      '',
      '          float trackChannel = abs(rimNormalized - 0.22);',
      '          if (trackChannel < 0.09) {',
      '            float dashPhase = fract(angleDeg / 12.0);',
      '            if (dashPhase > 0.40) {',
      '              luminousMark = max(luminousMark, 0.80);',
      '            }',
      '          }',
      '',
      '          float trackChannel2 = abs(rimNormalized + 0.35);',
      '          if (trackChannel2 < 0.07) {',
      '            float dashPhase2 = fract(angleDeg / 6.0);',
      '            if (dashPhase2 > 0.55) {',
      '              luminousMark = max(luminousMark, 0.70);',
      '            }',
      '          }',
      '',
      '          vec3 colAmberCore = vec3(0.86, 0.65, 0.28);',
      '          vec3 colAmberWarm = vec3(0.98, 0.62, 0.12);',
      '          vec3 colAmberBloom = vec3(0.85, 0.40, 0.04);',
      '',
      '          vec3 amberFinal = mix(colAmberWarm, colAmberCore, luminousMark * 0.6);',
      '          ringColor = mix(ringColor, amberFinal, luminousMark);',
      '          ringColor += colAmberBloom * (luminousMark * 0.16);',
      '',
      '          float edgeAlpha = (1.0 - smoothstep(-0.005, 0.015, ringSignedDist));',
      '          sceneColor = mix(sceneColor, ringColor, edgeAlpha);',
      '        }',
      '      }',
      '    }',
      '  }',
      '',
      '  float blackCore = (1.0 - smoothstep(0.10, 0.26, distCenter));',
      '  sceneColor = mix(sceneColor, vec3(0.012, 0.016, 0.020), blackCore * 0.95);',
      '',
      '  if (distCenter < 0.25) {',
      '    float irisRing = sin(distCenter * 160.0) * 0.008;',
      '    sceneColor += vec3(irisRing);',
      '  }',
      '',
      '  float vignette = (1.0 - smoothstep(0.4, 1.3, distCenter));',
      '  sceneColor *= (0.7 + vignette * 0.3);',
      '',
      '  gl_FragColor = vec4(sceneColor * uniformIntensity * 0.68, 1.0);',
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
