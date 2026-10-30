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

    const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uniformResolution;
uniform vec2 uniformPointer;
uniform float uniformRotation;
uniform float uniformIntensity;
uniform float uniformZoom;
uniform float uniformProject;
uniform float uniformActiveTime;

float fiberPhase(vec2 position) {
  float radius = length(position);
  float angle = atan(position.y, position.x);
  float travelingTension = sin(angle * 9.0 + radius * 6.5 - uniformActiveTime * 0.462) * 0.85;
  float travelingRelief = sin(angle * 5.0 - radius * 7.2 + uniformActiveTime * 0.306) * 0.65;
  float perturbationOne = sin(angle * 13.0 + radius * 5.2 + travelingTension) * 2.1;
  float perturbationTwo = sin(angle * 7.0 - radius * 8.0 + travelingRelief) * 1.25;
  return angle * 113.0 + perturbationOne + perturbationTwo + radius * 7.0;
}
float irisHeight(vec2 position) {
  float radius = length(position);
  float angle = atan(position.y, position.x);
  float phase = fiberPhase(position);
  float bundles = pow(0.5 + 0.5 * sin(phase), 3.0);
  float filaments = pow(0.5 + 0.5 * sin(phase * 4.0 + sin(radius * 24.0 + angle * 19.0)), 6.0);
  float respirationWave = sin(uniformActiveTime * 0.641) * 0.72 + sin(uniformActiveTime * 0.306 + 1.15) * 0.28;
  float tidalWave = sin(uniformActiveTime * 0.306) * 0.68 + sin(uniformActiveTime * 0.462 + 2.05) * 0.32;
  float pupilDilation = 0.038 * respirationWave + 0.012 * tidalWave;
  float radialGrowth = smoothstep(0.51, 0.68, radius) * (1.0 - smoothstep(1.65, 2.1, radius));
  float collaretteRadius = (0.79 + 0.045 * sin(angle * 11.0) + 0.022 * sin(angle * 23.0)) * (1.0 + pupilDilation * 0.45);
  float collarette = exp(-pow(abs(radius - collaretteRadius) / 0.064, 2.0));
  float pupilLipRadius = (0.57 + 0.012 * sin(angle * 17.0)) * (1.0 + pupilDilation);
  float pupilLip = exp(-pow(abs(radius - pupilLipRadius) / 0.041, 2.0));
  float funnel = 0.23 - 0.85 * exp(-max(radius - 0.52 * (1.0 + pupilDilation), 0.0) * 2.35);
  float tissueLift = (respirationWave * 0.018 + tidalWave * 0.008) * smoothstep(0.52, 0.95, radius) * (1.0 - smoothstep(1.45, 2.05, radius));
  return funnel + tissueLift + radialGrowth * (bundles * 0.065 + filaments * 0.010 + 0.024 * sin(angle * 31.0 + radius * 12.0)) + collarette * (0.055 + bundles * 0.035) + pupilLip * 0.095;
}
float irisDistance(vec3 position) {
  float radius = length(position.xy);
  float angle = atan(position.y, position.x);
  float respirationWave = sin(uniformActiveTime * 0.641) * 0.72 + sin(uniformActiveTime * 0.306 + 1.15) * 0.28;
  float tidalWave = sin(uniformActiveTime * 0.306) * 0.68 + sin(uniformActiveTime * 0.462 + 2.05) * 0.32;
  float pupilDilation = 0.038 * respirationWave + 0.012 * tidalWave;
  float pupilRadius = (0.514 + 0.009 * sin(angle * 17.0) + 0.006 * sin(angle * 31.0)) * (1.0 + pupilDilation);
  pupilRadius += min(position.z + 0.57, 0.0) * 0.20;
  float surfaceDistance = (position.z - irisHeight(position.xy)) * 0.43;
  return max(max(surfaceDistance, (pupilRadius - radius) * 0.74), (radius - 2.12) * 0.5);
}
vec3 irisNormal(vec3 position) {
  vec2 normalOffsets = vec2(0.0020, -0.0020);
  return normalize(normalOffsets.xyy * irisDistance(position + normalOffsets.xyy) + normalOffsets.yyx * irisDistance(position + normalOffsets.yyx) + normalOffsets.yxy * irisDistance(position + normalOffsets.yxy) + normalOffsets.xxx * irisDistance(position + normalOffsets.xxx));
}
float sphereIntersection(vec3 rayOrigin, vec3 rayDirection, vec3 sphereCenter, float sphereRadius) {
  vec3 relativeOrigin = rayOrigin - sphereCenter;
  float projectedOrigin = dot(relativeOrigin, rayDirection);
  float discriminant = projectedOrigin * projectedOrigin - dot(relativeOrigin, relativeOrigin) + sphereRadius * sphereRadius;
  return discriminant > 0.0 ? -projectedOrigin - sqrt(max(discriminant, 0.0)) : -1.0;
}
void main(void) {
  vec2 screenCoordinate = (gl_FragCoord.xy - 0.5 * uniformResolution) / min(uniformResolution.x, uniformResolution.y);
  vec3 cameraOrigin = vec3(0.24 + uniformPointer.x * 0.82, -0.28 + uniformPointer.y * 0.68, 2.68 - uniformZoom * 0.10);
  vec3 cameraForward = normalize(vec3(0.0, 0.0, -0.24) - cameraOrigin);
  vec3 cameraRight = normalize(cross(cameraForward, vec3(0.0, 1.0, 0.0)));
  vec3 cameraUp = cross(cameraRight, cameraForward);
  vec3 cameraDirection = normalize(cameraForward * 1.62 + cameraRight * screenCoordinate.x * 1.70 + cameraUp * screenCoordinate.y * 1.70);
  vec3 rayOrigin = cameraOrigin;
  vec3 rayDirection = cameraDirection;
  vec3 corneaCenter = vec3(0.0, 0.0, -1.82);
  float corneaDistance = sphereIntersection(cameraOrigin, cameraDirection, corneaCenter, 2.65);
  vec3 corneaNormal = vec3(0.0, 0.0, 1.0);
  float corneaMask = 0.0;
  if (corneaDistance > 0.0) {
    vec3 corneaPosition = cameraOrigin + cameraDirection * corneaDistance;
    if (corneaPosition.z > -0.65) {
      corneaNormal = normalize(corneaPosition - corneaCenter);
      rayDirection = refract(cameraDirection, corneaNormal, 0.94);
      rayOrigin = corneaPosition + rayDirection * 0.002;
      corneaMask = 1.0;
    }
  }
  float rotationAngle = uniformRotation * 0.055;
  mat2 irisRotation = mat2(cos(rotationAngle), -sin(rotationAngle), sin(rotationAngle), cos(rotationAngle));
  rayOrigin.xy = irisRotation * rayOrigin.xy;
  rayDirection.xy = irisRotation * rayDirection.xy;
  float rayTravel = max(0.0, (0.40 - rayOrigin.z) / rayDirection.z);
  float rayEnd = (-1.18 - rayOrigin.z) / rayDirection.z;
  float previousTravel = rayTravel;
  float surfaceFound = 0.0;
  vec3 surfacePosition = rayOrigin + rayDirection * rayTravel;
  for (int marchIndex = 0; marchIndex < 52; marchIndex++) {
    surfacePosition = rayOrigin + rayDirection * rayTravel;
    float surfaceDistance = irisDistance(surfacePosition);
    if (surfaceDistance < 0.0015) { surfaceFound = 1.0; break; }
    previousTravel = rayTravel;
    rayTravel += clamp(surfaceDistance, 0.003, 0.16);
    if (rayTravel > rayEnd) break;
  }
  vec3 sceneColor = vec3(0.006, 0.011, 0.014);
  if (surfaceFound > 0.5) {
    float refinementFar = rayTravel;
    float refinementNear = previousTravel;
    for (int refinementIndex = 0; refinementIndex < 4; refinementIndex++) {
      float refinementMiddle = (refinementNear + refinementFar) * 0.5;
      float refinementDistance = irisDistance(rayOrigin + rayDirection * refinementMiddle);
      if (refinementDistance < 0.0015) refinementFar = refinementMiddle;
      else refinementNear = refinementMiddle;
    }
    surfacePosition = rayOrigin + rayDirection * refinementFar;
    vec3 surfaceNormal = irisNormal(surfacePosition);
    float radius = length(surfacePosition.xy);
    float angle = atan(surfacePosition.y, surfacePosition.x);
    float phase = fiberPhase(surfacePosition.xy);
    float ridge = 0.5 + 0.5 * sin(phase);
    float microFiber = pow(0.5 + 0.5 * sin(phase * 4.0 + sin(radius * 24.0 + angle * 19.0)), 5.0);
    float branching = 0.5 + 0.5 * sin(angle * 47.0 + sin(angle * 11.0) * 2.0 + radius * 18.0);
    float mineral = smoothstep(0.15, 0.85, sin(angle * 9.0 + radius * 4.0) * 0.32 + sin(angle * 23.0 - radius * 3.0) * 0.24 + 0.42);
    float innerGold = (1.0 - smoothstep(0.67, 1.12, radius)) * 0.55;
    vec3 petrolColor = mix(vec3(0.013, 0.066, 0.068), vec3(0.055, 0.23, 0.20), branching * 0.65 + ridge * 0.35);
    vec3 bronzeColor = mix(vec3(0.17, 0.076, 0.022), vec3(0.46, 0.30, 0.11), ridge);
    vec3 materialColor = mix(petrolColor, bronzeColor, clamp(mineral * 0.78 + innerGold, 0.0, 0.94));
    materialColor *= 0.62 + ridge * 0.48 + microFiber * 0.25;
    vec3 lightDirection = normalize(vec3(-0.65 + 0.04 * sin(uniformActiveTime * 0.35), 0.85 + 0.03 * cos(uniformActiveTime * 0.41), 1.25));
    vec3 fillDirection = normalize(vec3(0.75 - 0.03 * cos(uniformActiveTime * 0.29), -0.50 + 0.03 * sin(uniformActiveTime * 0.37), 0.35));
    vec3 viewDirection = -rayDirection;
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float diffuseLight = max(dot(surfaceNormal, lightDirection), 0.0);
    float fillLight = max(dot(surfaceNormal, fillDirection), 0.0);
    float shadow = 1.0;
    float shadowTravel = 0.028;
    for (int shadowIndex = 0; shadowIndex < 6; shadowIndex++) {
      float occluder = irisDistance(surfacePosition + surfaceNormal * 0.012 + lightDirection * shadowTravel);
      shadow = min(shadow, clamp(10.0 * occluder / shadowTravel, 0.15, 1.0));
      shadowTravel += 0.047;
    }
    float throatOcclusion = smoothstep(-1.07, -0.38, surfacePosition.z);
    float valleyOcclusion = 0.58 + ridge * 0.42;
    float limbalShade = 1.0 - smoothstep(1.42, 2.08, radius);
    float specularLight = pow(max(dot(surfaceNormal, halfDirection), 0.0), 34.0) * (0.18 + microFiber * 0.28);
    float wetGleam = pow(max(dot(surfaceNormal, halfDirection), 0.0), 130.0) * 0.35;
    sceneColor = materialColor * (0.20 + diffuseLight * shadow * 1.7 + fillLight * 0.32) * valleyOcclusion;
    sceneColor += vec3(0.74, 0.51, 0.24) * specularLight * shadow;
    sceneColor += vec3(0.26, 0.49, 0.44) * wetGleam;
    sceneColor *= (0.09 + 0.91 * throatOcclusion) * (0.18 + 0.82 * limbalShade);
    sceneColor += vec3(0.018, 0.060, 0.050) * fillLight * pow(1.0 - max(dot(surfaceNormal, viewDirection), 0.0), 3.0) * throatOcclusion;
    float respirationWave = sin(uniformActiveTime * 0.641) * 0.72 + sin(uniformActiveTime * 0.306 + 1.15) * 0.28;
    float tidalWave = sin(uniformActiveTime * 0.306) * 0.68 + sin(uniformActiveTime * 0.462 + 2.05) * 0.32;
    float pupilDilation = 0.038 * respirationWave + 0.012 * tidalWave;
    float currentPupilLipRadius = (0.57 + 0.012 * sin(angle * 17.0)) * (1.0 + pupilDilation);
    float pupillaryLip = exp(-pow(abs(radius - currentPupilLipRadius) / 0.032, 2.0));
    sceneColor += vec3(0.13, 0.074, 0.025) * pupillaryLip * diffuseLight * throatOcclusion;
  }
  if (corneaMask > 0.5) {
    vec3 reflectedDirection = reflect(cameraDirection, corneaNormal);
    vec2 upperSoftboxCenter = vec2(-0.43 + 0.032 * sin(uniformActiveTime * 0.38 + 0.5), 0.62 + 0.024 * cos(uniformActiveTime * 0.27));
    vec2 sideSoftboxCenter = vec2(0.74 + 0.026 * cos(uniformActiveTime * 0.33), -0.12 + 0.036 * sin(uniformActiveTime * 0.25 + 1.2));
    float upperSoftbox = exp(-pow(abs(reflectedDirection.x - upperSoftboxCenter.x) / 0.34, 4.0) - pow(abs(reflectedDirection.y - upperSoftboxCenter.y) / 0.055, 2.0));
    float sideSoftbox = exp(-pow(abs(reflectedDirection.x - sideSoftboxCenter.x) / 0.030, 2.0) - pow(abs(reflectedDirection.y - sideSoftboxCenter.y) / 0.32, 4.0));
    vec3 broadLightVector = normalize(vec3(-0.50 + 0.07 * sin(uniformActiveTime * 0.31), 0.70 + 0.05 * cos(uniformActiveTime * 0.23), 0.90));
    float broadReflection = pow(max(dot(reflectedDirection, broadLightVector), 0.0), 18.0);
    float fresnel = 0.025 + 0.65 * pow(1.0 - max(dot(-cameraDirection, corneaNormal), 0.0), 5.0);
    float clearTitle = smoothstep(0.17, 0.36, length(screenCoordinate));
    sceneColor += (vec3(0.63, 0.80, 0.73) * upperSoftbox * 0.23 + vec3(0.66, 0.43, 0.20) * sideSoftbox * 0.17 + vec3(0.16, 0.27, 0.23) * broadReflection * 0.10) * clearTitle;
    sceneColor += vec3(0.09, 0.19, 0.17) * fresnel * 0.55;
  }
  sceneColor *= 0.66 + 0.34 * smoothstep(0.10, 0.27, length(screenCoordinate));
  sceneColor *= 1.0 - smoothstep(0.70, 1.35, length(screenCoordinate)) * 0.40;
  sceneColor *= uniformIntensity * (1.0 + uniformProject * 0.07);
  sceneColor = vec3(1.0) - exp(-sceneColor * 1.30);
  sceneColor = pow(max(sceneColor, vec3(0.0)), vec3(0.88));
  gl_FragColor = vec4(sceneColor, 1.0);
}
`;

    let shaderProgram = null;
    let vertexBuffer = null;
    let uniformResolutionLocation = null;
    let uniformPointerLocation = null;
    let uniformRotationLocation = null;
    let uniformIntensityLocation = null;
    let uniformZoomLocation = null;
    let uniformProjectLocation = null;
    let uniformActiveTimeLocation = null;

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
      if (!glContext || glContext.isContextLost()) {
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
        uniformZoomLocation = glContext.getUniformLocation(constructedProgram, 'uniformZoom');
        uniformProjectLocation = glContext.getUniformLocation(constructedProgram, 'uniformProject');
        uniformActiveTimeLocation = glContext.getUniformLocation(constructedProgram, 'uniformActiveTime');

        glContext.deleteShader(compiledVertexShader);
        glContext.deleteShader(compiledFragmentShader);

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
    let targetZoom = 0.0;
    let startZoom = 0.0;
    let currentZoom = 0.0;
    let targetProject = 0.0;
    let startProject = 0.0;
    let currentProject = 0.0;
    let targetRotationAngle = 0.0;
    let startRotationAngle = 0.0;
    let currentRotationAngle = 0.0;
    let lastEventClientX = window.innerWidth * 0.5;
    let lastEventClientY = window.innerHeight * 0.5;

    let settlingStartTimestamp = 0.0;
    const pointerSettlingDuration = 500.0;
    let isSettlingActive = false;

    let activeElapsedSeconds = 0.0;
    let lastFrameWallTimestamp = 0.0;

    let schedulerTimeoutIdentifier = 0;
    let schedulerAnimationFrameIdentifier = 0;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerCoarseQuery = window.matchMedia('(pointer: coarse)');

    function checkMotionPermitted() {
      if (reducedMotionQuery.matches) {
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

    function checkAmbientPermitted() {
      return !isContextLost && glContext !== null && !glContext.isContextLost() && shaderProgram !== null &&
             checkMotionPermitted() && checkAtlasViewActive() && !checkDocumentHidden();
    }

    function cancelScheduledFrame() {
      if (schedulerTimeoutIdentifier) {
        window.clearTimeout(schedulerTimeoutIdentifier);
        schedulerTimeoutIdentifier = 0;
      }
      if (schedulerAnimationFrameIdentifier) {
        window.cancelAnimationFrame(schedulerAnimationFrameIdentifier);
        schedulerAnimationFrameIdentifier = 0;
      }
    }

    function updateCanvasDimensions(isInteractiveMode) {
      if (isContextLost || !glContext || glContext.isContextLost()) {
        return false;
      }
      const isCoarsePointer = pointerCoarseQuery.matches;
      const targetPixelBudget = isInteractiveMode ? 1050000 : (isCoarsePointer ? 280000 : 600000);
      const pixelBudgetScale = Math.sqrt(targetPixelBudget / Math.max(1, canvasElement.clientWidth * canvasElement.clientHeight));
      const maxDeviceScale = isInteractiveMode ? 1.5 : (isCoarsePointer ? 1.25 : 1.5);
      const devicePixelScale = Math.min(window.devicePixelRatio || 1.0, maxDeviceScale, pixelBudgetScale);
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

    function renderSingleFrame(isInteractiveMode) {
      if (isContextLost || !glContext || glContext.isContextLost() || !shaderProgram || !checkAtlasViewActive() || checkDocumentHidden()) {
        if (checkDocumentHidden() || !checkAtlasViewActive() || isContextLost || (glContext && glContext.isContextLost())) {
          cancelScheduledFrame();
          isSettlingActive = false;
          lastFrameWallTimestamp = 0.0;
        }
        return;
      }
      updateCanvasDimensions(isInteractiveMode);
      glContext.useProgram(shaderProgram);
      glContext.uniform2f(uniformResolutionLocation, canvasElement.width, canvasElement.height);
      glContext.uniform2f(uniformPointerLocation, currentPointerX, currentPointerY);
      glContext.uniform1f(uniformRotationLocation, currentRotationAngle);
      glContext.uniform1f(uniformIntensityLocation, 1.0);
      glContext.uniform1f(uniformZoomLocation, currentZoom);
      glContext.uniform1f(uniformProjectLocation, currentProject);
      glContext.uniform1f(uniformActiveTimeLocation, activeElapsedSeconds);
      glContext.drawArrays(glContext.TRIANGLES, 0, 6);

      if (!documentRoot.classList.contains('has-kaleidoscope')) {
        documentRoot.classList.add('has-kaleidoscope');
      }
    }

    function scheduleNextFrame(delayMilliseconds) {
      cancelScheduledFrame();
      if (!checkAmbientPermitted() && !isSettlingActive) {
        lastFrameWallTimestamp = 0.0;
        return;
      }
      if (delayMilliseconds > 4.0) {
        schedulerTimeoutIdentifier = window.setTimeout(function () {
          schedulerTimeoutIdentifier = 0;
          schedulerAnimationFrameIdentifier = window.requestAnimationFrame(unifiedSchedulerTick);
        }, Math.floor(delayMilliseconds));
      } else {
        schedulerAnimationFrameIdentifier = window.requestAnimationFrame(unifiedSchedulerTick);
      }
    }

    function unifiedSchedulerTick(currentFrameTimestamp) {
      schedulerAnimationFrameIdentifier = 0;
      if (schedulerTimeoutIdentifier) {
        window.clearTimeout(schedulerTimeoutIdentifier);
        schedulerTimeoutIdentifier = 0;
      }

      if (!checkAtlasViewActive() || checkDocumentHidden() || isContextLost || !glContext || glContext.isContextLost() || !shaderProgram) {
        cancelScheduledFrame();
        isSettlingActive = false;
        lastFrameWallTimestamp = 0.0;
        return;
      }

      if (!checkMotionPermitted()) {
        cancelScheduledFrame();
        isSettlingActive = false;
        lastFrameWallTimestamp = 0.0;
        return;
      }

      const currentTimestamp = currentFrameTimestamp || performance.now();

      if (lastFrameWallTimestamp > 0.0) {
        const deltaMilliseconds = currentTimestamp - lastFrameWallTimestamp;
        const clampedDeltaMilliseconds = Math.min(Math.max(deltaMilliseconds, 0.0), 250.0);
        activeElapsedSeconds += clampedDeltaMilliseconds * 0.001;
      }
      lastFrameWallTimestamp = currentTimestamp;

      if (isSettlingActive) {
        const elapsedMilliseconds = currentTimestamp - settlingStartTimestamp;
        if (elapsedMilliseconds >= pointerSettlingDuration) {
          currentPointerX = targetPointerX;
          currentPointerY = targetPointerY;
          currentRotationAngle = targetRotationAngle;
          currentZoom = targetZoom;
          currentProject = targetProject;
          isSettlingActive = false;
        } else {
          const normalizedProgress = Math.min(Math.max(elapsedMilliseconds / pointerSettlingDuration, 0.0), 1.0);
          const easingMultiplier = 1.0 - Math.pow(1.0 - normalizedProgress, 3.0);
          currentPointerX = startPointerX + (targetPointerX - startPointerX) * easingMultiplier;
          currentPointerY = startPointerY + (targetPointerY - startPointerY) * easingMultiplier;
          currentRotationAngle = startRotationAngle + (targetRotationAngle - startRotationAngle) * easingMultiplier;
          currentZoom = startZoom + (targetZoom - startZoom) * easingMultiplier;
          currentProject = startProject + (targetProject - startProject) * easingMultiplier;
        }
        renderSingleFrame(true);

        if (isSettlingActive) {
          scheduleNextFrame(0.0);
          return;
        }
      } else {
        renderSingleFrame(false);
      }

      if (!checkAmbientPermitted()) {
        cancelScheduledFrame();
        lastFrameWallTimestamp = 0.0;
        return;
      }

      const frameExecutionDuration = performance.now() - currentTimestamp;
      const targetAmbientInterval = pointerCoarseQuery.matches ? 83.33 : 55.56;
      const delayUntilNextFrame = Math.max(0.0, targetAmbientInterval - frameExecutionDuration);
      scheduleNextFrame(delayUntilNextFrame);
    }

    function triggerInteractiveSettling() {
      if (!checkAtlasViewActive() || !checkMotionPermitted() || checkDocumentHidden() || isContextLost || (glContext && glContext.isContextLost())) {
        return;
      }
      cancelScheduledFrame();
      isSettlingActive = true;
      settlingStartTimestamp = performance.now();
      startPointerX = currentPointerX;
      startPointerY = currentPointerY;
      startRotationAngle = currentRotationAngle;
      startZoom = currentZoom;
      startProject = currentProject;
      if (lastFrameWallTimestamp <= 0.0) {
        lastFrameWallTimestamp = performance.now();
      }
      schedulerAnimationFrameIdentifier = window.requestAnimationFrame(unifiedSchedulerTick);
    }

    function triggerAmbientMotion() {
      if (!checkAmbientPermitted()) {
        cancelScheduledFrame();
        lastFrameWallTimestamp = 0.0;
        return;
      }
      if (schedulerTimeoutIdentifier || schedulerAnimationFrameIdentifier) {
        return;
      }
      lastFrameWallTimestamp = performance.now();
      schedulerAnimationFrameIdentifier = window.requestAnimationFrame(unifiedSchedulerTick);
    }

    function handlePointerMove(pointerEvent) {
      if (pointerEvent.pointerType === 'touch') {
        return;
      }
      if (pointerCoarseQuery.matches) {
        return;
      }
      if (!checkAtlasViewActive() || !checkMotionPermitted() || checkDocumentHidden()) {
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

      triggerInteractiveSettling();
    }

    function handleOpticsInput(inputEvent) {
      if (!checkAtlasViewActive() || checkDocumentHidden() || !checkMotionPermitted()) {
        return;
      }
      const inputDetail = inputEvent.detail || {};
      const nextPointerX = inputDetail.reset ? 0.0 : (Number.isFinite(inputDetail.x) ? Math.max(-1.0, Math.min(1.0, inputDetail.x)) : targetPointerX);
      const nextPointerY = inputDetail.reset ? 0.0 : (Number.isFinite(inputDetail.y) ? Math.max(-1.0, Math.min(1.0, inputDetail.y)) : targetPointerY);
      const nextZoom = inputDetail.reset ? 0.0 : (Number.isFinite(inputDetail.zoom) ? Math.max(-1.0, Math.min(1.0, (inputDetail.zoom - 1.0) / 0.25)) : targetZoom);
      const nextRotation = inputDetail.reset ? 0.0 : targetRotationAngle;
      const nextProject = inputDetail.reset ? 0.0 : (inputDetail.project ? 1.0 : 0.0);

      if (Math.abs(nextPointerX - targetPointerX) + Math.abs(nextPointerY - targetPointerY) + Math.abs(nextZoom - targetZoom) + Math.abs(nextProject - targetProject) + Math.abs(nextRotation - targetRotationAngle) < 0.0001) {
        return;
      }

      targetPointerX = nextPointerX;
      targetPointerY = nextPointerY;
      targetZoom = nextZoom;
      targetProject = nextProject;
      targetRotationAngle = nextRotation;

      triggerInteractiveSettling();
    }

    function handleResize() {
      if (!checkAtlasViewActive() || checkDocumentHidden()) {
        return;
      }
      updateCanvasDimensions(isSettlingActive);
      renderSingleFrame(isSettlingActive);
    }

    function handleVisibilityChange() {
      if (checkDocumentHidden()) {
        cancelScheduledFrame();
        isSettlingActive = false;
        lastFrameWallTimestamp = 0.0;
      } else {
        if (checkAtlasViewActive()) {
          syncDocumentState();
        }
      }
    }

    function syncDocumentState() {
      const isAtlasView = checkAtlasViewActive();
      const isMotionAllowed = checkMotionPermitted();

      if (!isAtlasView) {
        cancelScheduledFrame();
        isSettlingActive = false;
        lastFrameWallTimestamp = 0.0;
        canvasElement.style.opacity = '0';
        canvasElement.style.visibility = 'hidden';
        return;
      }

      canvasElement.style.opacity = '1';
      canvasElement.style.visibility = 'visible';

      if (!isMotionAllowed) {
        cancelScheduledFrame();
        isSettlingActive = false;
        lastFrameWallTimestamp = 0.0;
        currentPointerX = targetPointerX;
        currentPointerY = targetPointerY;
        currentRotationAngle = targetRotationAngle;
        currentZoom = targetZoom;
        currentProject = targetProject;
        renderSingleFrame(false);
        return;
      }

      if (!schedulerTimeoutIdentifier && !schedulerAnimationFrameIdentifier) {
        triggerAmbientMotion();
      }
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
    window.addEventListener('portfolio:opticsinput', handleOpticsInput, { passive: true });
    window.addEventListener('hashchange', syncDocumentState, { passive: true });
    window.addEventListener('popstate', syncDocumentState, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    canvasElement.addEventListener('webglcontextlost', function (eventObject) {
      eventObject.preventDefault();
      isContextLost = true;
      cancelScheduledFrame();
      isSettlingActive = false;
      lastFrameWallTimestamp = 0.0;
      canvasElement.style.display = 'none';
      documentRoot.classList.remove('has-kaleidoscope');
    });

    canvasElement.addEventListener('webglcontextrestored', function () {
      isContextLost = false;
      const restoredPipelineSuccess = setupWebGLPipeline();
      if (restoredPipelineSuccess) {
        canvasElement.style.display = '';
        renderSingleFrame(false);
        if (checkAmbientPermitted()) {
          triggerAmbientMotion();
        }
      } else {
        canvasElement.style.display = 'none';
        documentRoot.classList.remove('has-kaleidoscope');
      }
    });

    if (!checkAtlasViewActive() || checkDocumentHidden()) {
      canvasElement.style.opacity = '0';
      canvasElement.style.visibility = 'hidden';
    } else {
      renderSingleFrame(false);
      if (checkAmbientPermitted()) {
        triggerAmbientMotion();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeKaleidoscope, { once: true });
  } else {
    initializeKaleidoscope();
  }
})();
