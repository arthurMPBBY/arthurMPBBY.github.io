(function () {
  const documentRoot = document.documentElement;

  function initializeKaleidoscope() {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerCoarseQuery = window.matchMedia('(pointer: coarse)');

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
        depth: true,
        stencil: false,
        antialias: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      }) || canvasElement.getContext('experimental-webgl');
    } catch (contextError) {
      glContext = null;
    }

    if (!glContext) {
      canvasElement.style.display = 'none';
      documentRoot.classList.remove('has-kaleidoscope');
      return;
    }

    const precisionHeader = [
      '#ifdef GL_FRAGMENT_PRECISION_HIGH',
      'precision highp float;',
      '#else',
      'precision mediump float;',
      '#endif'
    ].join('\n') + '\n';

    const spaceVertexShaderSource = precisionHeader + [
      'attribute vec2 attributePosition;',
      'varying vec2 varyingScreenCoord;',
      'void main(void) {',
      '  varyingScreenCoord = attributePosition;',
      '  gl_Position = vec4(attributePosition, 0.9999, 1.0);',
      '}'
    ].join('\n');

    const spaceFragmentShaderSource = precisionHeader + [
      'uniform vec2 uniformResolution;',
      'uniform vec2 uniformPointer;',
      'uniform float uniformZoom;',
      'uniform float uniformRotation;',
      'uniform float uniformActiveTime;',
      'uniform vec2 uniformFocusCoords;',
      'uniform float uniformFocusStrength;',
      'varying vec2 varyingScreenCoord;',
      'vec4 computeCosmicHash(vec2 gridCell) {',
      '  vec4 hashVector = fract(sin(vec4(',
      '    dot(gridCell, vec2(127.1, 311.7)),',
      '    dot(gridCell, vec2(269.5, 183.3)),',
      '    dot(gridCell, vec2(419.2, 371.9)),',
      '    dot(gridCell, vec2(531.3, 627.1))',
      '  )) * 43758.5453);',
      '  return hashVector;',
      '}',
      'vec3 renderStarLayer(vec2 sampleCoordinates, float gridScale, float minimumStarBrightness, float starSharpness, vec3 baseStarColor) {',
      '  vec2 scaledCoordinates = sampleCoordinates * gridScale;',
      '  vec2 baseCellIndex = floor(scaledCoordinates);',
      '  vec2 localCellFraction = fract(scaledCoordinates);',
      '  vec3 layerAccumulation = vec3(0.0);',
      '  float pixelSpan = gridScale / min(uniformResolution.x, uniformResolution.y);',
      '  float pixelVariance = pixelSpan * pixelSpan / 6.0;',
      '  float filteredCoreSharpness = starSharpness / (1.0 + starSharpness * pixelVariance);',
      '  float haloSharpness = starSharpness * 0.08;',
      '  float filteredHaloSharpness = haloSharpness / (1.0 + haloSharpness * pixelVariance);',
      '  for (int stepOffsetY = 0; stepOffsetY < 3; stepOffsetY += 1) {',
      '    for (int stepOffsetX = 0; stepOffsetX < 3; stepOffsetX += 1) {',
      '      vec2 neighborOffset = vec2(float(stepOffsetX - 1), float(stepOffsetY - 1));',
      '      vec2 neighborCell = baseCellIndex + neighborOffset;',
      '      vec4 starParameters = computeCosmicHash(neighborCell);',
      '      vec2 starLocalPosition = neighborOffset + starParameters.xy * 0.76 + 0.12;',
      '      vec2 vectorToStar = localCellFraction - starLocalPosition;',
      '      float distanceSquared = dot(vectorToStar, vectorToStar);',
      '      float starProbability = starParameters.z;',
      '      if (starProbability > minimumStarBrightness) {',
      '        float normalizedLuminance = (starProbability - minimumStarBrightness) / (1.0 - minimumStarBrightness);',
      '        float starCoreIntensity = exp(-distanceSquared * filteredCoreSharpness) * (filteredCoreSharpness / starSharpness) * normalizedLuminance;',
      '        float starHaloIntensity = exp(-distanceSquared * filteredHaloSharpness) * (filteredHaloSharpness / haloSharpness) * (normalizedLuminance * 0.22);',
      '        vec3 spectralTint = mix(baseStarColor, vec3(0.88, 0.94, 1.0), starParameters.w * 0.55);',
      '        if (starParameters.w > 0.82) {',
      '          spectralTint = mix(spectralTint, vec3(1.0, 0.88, 0.72), (starParameters.w - 0.82) / 0.18);',
      '        }',
      '        layerAccumulation += spectralTint * (starCoreIntensity + starHaloIntensity);',
      '      }',
      '    }',
      '  }',
      '  return layerAccumulation;',
      '}',
      'void main(void) {',
      '  vec2 centeredCoordinates = (gl_FragCoord.xy - 0.5 * uniformResolution) / min(uniformResolution.x, uniformResolution.y);',
      '  float cosmicRotation = uniformRotation * 0.015;',
      '  mat2 cosmicRotationMatrix = mat2(cos(cosmicRotation), -sin(cosmicRotation), sin(cosmicRotation), cos(cosmicRotation));',
      '  centeredCoordinates = cosmicRotationMatrix * centeredCoordinates;',
      '  float zoomScaleFactor = 1.0 - uniformZoom * 0.08;',
      '  centeredCoordinates *= zoomScaleFactor;',
      '  vec2 cosmicDriftVector = vec2(uniformActiveTime * 0.0016, uniformActiveTime * 0.0008);',
      '  vec2 deepLayerCoordinates = centeredCoordinates + uniformPointer * 0.032 + cosmicDriftVector * 0.45;',
      '  vec2 midLayerCoordinates = centeredCoordinates + uniformPointer * 0.072 + cosmicDriftVector * 0.95;',
      '  vec2 foreLayerCoordinates = centeredCoordinates + uniformPointer * 0.125 + cosmicDriftVector * 1.55;',
      '  vec3 deepStarsAccumulation = renderStarLayer(deepLayerCoordinates, 76.0, 0.62, 900.0, vec3(0.56, 0.70, 0.82));',
      '  vec3 midStarsAccumulation = renderStarLayer(midLayerCoordinates, 38.0, 0.72, 480.0, vec3(0.74, 0.86, 0.96));',
      '  vec3 foreStarsAccumulation = renderStarLayer(foreLayerCoordinates, 17.0, 0.85, 230.0, vec3(0.88, 0.95, 1.0));',
      '  vec2 dustLayerCoordinates = centeredCoordinates + uniformPointer * 0.048 + cosmicDriftVector * 0.65;',
      '  float wavePatternOne = sin(dustLayerCoordinates.x * 1.85 + dustLayerCoordinates.y * 1.25 + uniformActiveTime * 0.015);',
      '  float wavePatternTwo = cos(dustLayerCoordinates.x * 2.75 - dustLayerCoordinates.y * 1.95 + wavePatternOne * 0.72);',
      '  float wavePatternThree = sin(dustLayerCoordinates.x * 4.20 + dustLayerCoordinates.y * 3.10 - uniformActiveTime * 0.022);',
      '  float combinedDust = wavePatternOne * 0.45 + wavePatternTwo * 0.35 + wavePatternThree * 0.20;',
      '  float dustDensityValue = smoothstep(-0.35, 0.75, combinedDust);',
      '  float perimeterDistanceFactor = smoothstep(0.40, 1.60, length(centeredCoordinates));',
      '  vec3 interstellarDustColor = mix(vec3(0.012, 0.026, 0.032), vec3(0.022, 0.045, 0.054), wavePatternTwo * 0.5 + 0.5) * dustDensityValue * (0.42 + 0.58 * perimeterDistanceFactor) * 0.42;',
      '  vec3 voidBaseColor = vec3(0.003, 0.005, 0.008);',
      '  vec3 spaceSceneComposition = voidBaseColor + interstellarDustColor + deepStarsAccumulation * 0.65 + midStarsAccumulation * 0.85 + foreStarsAccumulation * 1.10;',
      '  float distToFocusSpace = length(centeredCoordinates - uniformFocusCoords);',
      '  spaceSceneComposition *= 1.0 - 0.20 * uniformFocusStrength * exp(-pow(distToFocusSpace / 0.38, 2.0));',
      '  gl_FragColor = vec4(spaceSceneComposition, 1.0);',
      '}'
    ].join('\n');

    const textureVertexShaderSource = [
      'attribute vec2 attributePosition;',
      'varying vec2 varyingUv;',
      'void main(void) {',
      '  varyingUv = attributePosition * 0.5 + 0.5;',
      '  gl_Position = vec4(attributePosition, 0.0, 1.0);',
      '}'
    ].join('\n');

    const textureFragmentShaderSource = precisionHeader + [
      'varying vec2 varyingUv;',
      '#define PI 3.141592653589793',
      'float hash3(vec3 p) {',
      '  p = fract(p * vec3(0.1031, 0.1030, 0.0973));',
      '  p += dot(p, p.yzx + 33.33);',
      '  return fract((p.x + p.y) * p.z);',
      '}',
      'float noise3(vec3 p) {',
      '  vec3 i = floor(p);',
      '  vec3 f = fract(p);',
      '  vec3 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(',
      '    mix(',
      '      mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), u.x),',
      '      mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), u.x),',
      '      u.y',
      '    ),',
      '    mix(',
      '      mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), u.x),',
      '      mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), u.x),',
      '      u.y',
      '    ),',
      '    u.z',
      '  );',
      '}',
      'float hash2(vec2 p) {',
      '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
      '  p3 += dot(p3, p3.yzx + 33.33);',
      '  return fract((p3.x + p3.y) * p3.z);',
      '}',
      'vec2 hash22(vec2 p) {',
      '  return vec2(hash2(p), hash2(p + vec2(17.1, 31.7)));',
      '}',
      'float computeCellularCrypts(float u, float v, float C, float S) {',
      '  float warpAngle = (noise3(vec3(C * 4.0, S * 4.0, v * 3.0)) - 0.5) * 0.35;',
      '  float warpV = (noise3(vec3(C * 3.0 + 5.1, S * 3.0 + 2.4, v * 4.0)) - 0.5) * 0.04;',
      '  float wu = fract(u + warpAngle / (2.0 * PI) + 1.0);',
      '  float wv = v + warpV;',
      '  float cellCols = 24.0;',
      '  float cellRows = 10.0;',
      '  vec2 p = vec2(wu * cellCols, wv * cellRows);',
      '  vec2 ip = floor(p);',
      '  vec2 fp = fract(p);',
      '  float minDist = 10.0;',
      '  for (int dy = -1; dy <= 1; dy++) {',
      '    for (int dx = -1; dx <= 1; dx++) {',
      '      float cx = mod(ip.x + float(dx) + cellCols, cellCols);',
      '      float cy = ip.y + float(dy);',
      '      if (cy >= 0.0 && cy < cellRows) {',
      '        float seed = hash2(vec2(cx, cy));',
      '        float threshold = (cy >= 1.0 && cy <= 2.0) ? 0.48 : ((cy >= 4.0 && cy <= 6.0) ? 0.76 : 0.99);',
      '        if (seed > threshold) {',
      '          vec2 offset = hash22(vec2(cx + 12.3, cy + 45.6));',
      '          vec2 r = vec2(float(dx), float(dy)) + offset * 0.6 + 0.2 - fp;',
      '          float dist = sqrt(r.x * r.x + r.y * r.y * 1.6);',
      '          minDist = min(minDist, dist);',
      '        }',
      '      }',
      '    }',
      '  }',
      '  float radius = 0.46;',
      '  float rawCavity = max(0.0, 1.0 - minDist / radius);',
      '  float smoothCavity = rawCavity * rawCavity * (3.0 - 2.0 * rawCavity);',
      '  float collaretteEnv = exp(-pow((v - 0.18) / 0.075, 2.0));',
      '  float ciliaryEnv = exp(-pow((v - 0.52) / 0.16, 2.0)) * 0.40;',
      '  float pupilCutoff = smoothstep(0.04, 0.09, v);',
      '  return smoothCavity * (collaretteEnv + ciliaryEnv) * pupilCutoff;',
      '}',
      'void main(void) {',
      '  float u = varyingUv.x;',
      '  float v = varyingUv.y;',
      '  float angleRadian = u * 2.0 * PI;',
      '  float C = cos(angleRadian);',
      '  float S = sin(angleRadian);',
      '  float nLow = noise3(vec3(C * 3.5, S * 3.5, v * 2.5));',
      '  float nMid = noise3(vec3(C * 9.0 + 3.1, S * 9.0 + 2.7, v * 7.0));',
      '  float warpedAngle = angleRadian + (nLow - 0.5) * 0.42 + (nMid - 0.5) * 0.18 * v;',
      '  float collaretteWarp = (noise3(vec3(C * 4.0, S * 4.0, 1.5)) - 0.5) * 0.05;',
      '  float collaretteV = 0.175 + collaretteWarp;',
      '  float collaretteAmp = smoothstep(0.25, 0.75, noise3(vec3(C * 5.0 + 2.0, S * 5.0 + 1.0, 3.2)));',
      '  float collaretteWidth = 0.038 + 0.015 * noise3(vec3(C * 6.0, S * 6.0, 4.0));',
      '  float collaretteDist = (v - collaretteV) / collaretteWidth;',
      '  float collaretteElevation = exp(-collaretteDist * collaretteDist) * collaretteAmp;',
      '  float phase1 = warpedAngle * 36.0 + (noise3(vec3(C * 6.0, S * 6.0, v * 6.0)) - 0.5) * 5.0;',
      '  float beam1 = pow(0.5 + 0.5 * cos(phase1), 2.5);',
      '  float mask1 = smoothstep(0.06, 0.20, v) * (0.6 + 0.4 * noise3(vec3(C * 3.0, S * 3.0, 2.0)));',
      '  float phase2 = warpedAngle * 72.0 + (noise3(vec3(C * 12.0 + 1.0, S * 12.0 + 3.0, v * 10.0)) - 0.5) * 6.0;',
      '  float beam2 = pow(0.5 + 0.5 * cos(phase2), 3.0);',
      '  float mask2 = smoothstep(0.14, 0.35, v + (noise3(vec3(C * 4.0, S * 4.0, 1.0)) - 0.5) * 0.15);',
      '  float phase3 = warpedAngle * 144.0 + (noise3(vec3(C * 20.0 + 2.0, S * 20.0 + 5.0, v * 18.0)) - 0.5) * 8.0;',
      '  float beam3 = pow(0.5 + 0.5 * cos(phase3), 3.5);',
      '  float mask3 = smoothstep(0.25, 0.55, v);',
      '  float fiberRelief = beam1 * mask1 * 0.48 + beam2 * mask2 * 0.36 + beam3 * mask3 * 0.26;',
      '  float restingZone = smoothstep(0.18, 0.65, noise3(vec3(C * 2.5, S * 2.5, v * 2.0)));',
      '  fiberRelief *= 0.55 + 0.45 * restingZone;',
      '  float cryptCavity = computeCellularCrypts(u, v, C, S);',
      '  float furrowNoise = noise3(vec3(C * 6.0, S * 6.0, v * 15.0));',
      '  float furrowPhase = v * 32.0 + (furrowNoise - 0.5) * 3.0;',
      '  float furrowEnv = smoothstep(0.42, 0.57, v) * (1.0 - smoothstep(0.88, 0.98, v));',
      '  float furrowGroove = sin(furrowPhase) * furrowEnv * (0.5 + 0.5 * cos(warpedAngle * 6.0)) * 0.08;',
      '  float microGrain = noise3(vec3(C * 32.0, S * 32.0, v * 40.0));',
      '  float composedRelief = clamp(fiberRelief * 0.65 + collaretteElevation * 0.30 - cryptCavity * 0.60 - furrowGroove + (microGrain - 0.5) * 0.05, 0.0, 1.0);',
      '  float branchingPattern = clamp(beam2 * mask2 * 0.50 + beam3 * mask3 * 0.35 + beam1 * mask1 * 0.25 - cryptCavity * 0.45, 0.0, 1.0);',
      '  float amberNoise = noise3(vec3(C * 7.0 + 4.1, S * 7.0 + 2.3, v * 12.0));',
      '  float warmClusters = smoothstep(0.35, 0.70, amberNoise) * (1.0 - smoothstep(0.06, 0.28, v));',
      '  float cryptRim = smoothstep(0.10, 0.35, cryptCavity) * (1.0 - smoothstep(0.55, 0.85, cryptCavity)) * 0.60;',
      '  float ciliaryTone = (1.0 - smoothstep(0.25, 0.95, v)) * 0.25;',
      '  float mineralPattern = clamp(warmClusters * 0.65 + cryptRim + ciliaryTone + (microGrain - 0.5) * 0.08, 0.0, 1.0);',
      '  gl_FragColor = vec4(composedRelief, branchingPattern, mineralPattern, 1.0);',
      '}'
    ].join('\n');

    const mainVertexShaderSource = precisionHeader + [
      'attribute vec3 attributeVertexPosition;',
      'attribute vec2 attributeTexCoord;',
      'attribute vec3 attributeNormal;',
      'uniform vec2 uniformResolution;',
      'uniform vec2 uniformPointer;',
      'uniform float uniformRotation;',
      'uniform float uniformZoom;',
      'uniform float uniformActiveTime;',
      'varying vec3 varyingWorldPosition;',
      'varying vec3 varyingNormal;',
      'varying vec2 varyingTexCoord;',
      'varying vec3 varyingViewDirection;',
      'varying vec2 varyingIrisCenter;',
      'void main(void) {',
      '  float respirationWave = sin(uniformActiveTime * 0.641) * 0.72 + sin(uniformActiveTime * 0.306 + 1.15) * 0.28;',
      '  float tidalWave = sin(uniformActiveTime * 0.306) * 0.68 + sin(uniformActiveTime * 0.462 + 2.05) * 0.32;',
      '  float pupilDilation = 0.038 * respirationWave + 0.012 * tidalWave;',
      '  vec3 localVertexPosition = attributeVertexPosition;',
      '  vec3 localNormal = attributeNormal;',
      '  float radialMagnitude = length(localVertexPosition.xy);',
      '  float dilationWeight = 1.0 - smoothstep(0.52, 1.5, radialMagnitude);',
      '  localVertexPosition.xy *= 1.0 + pupilDilation * dilationWeight;',
      '  float tissueLift = (respirationWave * 0.018 + tidalWave * 0.008) * smoothstep(0.52, 0.95, radialMagnitude) * (1.0 - smoothstep(1.45, 2.05, radialMagnitude));',
      '  localVertexPosition.z += tissueLift;',
      '  float rotationAngle = uniformRotation * 0.055;',
      '  mat2 rotationMatrix = mat2(cos(rotationAngle), -sin(rotationAngle), sin(rotationAngle), cos(rotationAngle));',
      '  localVertexPosition.xy = rotationMatrix * localVertexPosition.xy;',
      '  localNormal.xy = rotationMatrix * localNormal.xy;',
      '  varyingWorldPosition = localVertexPosition;',
      '  varyingNormal = normalize(localNormal);',
      '  varyingTexCoord = attributeTexCoord;',
      '  vec3 cameraTarget = vec3(0.0, 0.0, -0.24);',
      '  vec3 defaultCamPos = vec3(0.24 + uniformPointer.x * 0.82, -0.28 + uniformPointer.y * 0.68, 2.68);',
      '  vec3 cameraOrigin = defaultCamPos - (defaultCamPos - cameraTarget) * (uniformZoom * 0.58);',
      '  vec3 cameraForward = normalize(cameraTarget - cameraOrigin);',
      '  vec3 cameraRight = normalize(cross(cameraForward, vec3(0.0, 1.0, 0.0)));',
      '  vec3 cameraUp = cross(cameraRight, cameraForward);',
      '  varyingViewDirection = normalize(cameraOrigin - localVertexPosition);',
      '  vec3 relativePosition = localVertexPosition - cameraOrigin;',
      '  float cameraDepth = dot(relativePosition, cameraForward);',
      '  float cameraCoordX = dot(relativePosition, cameraRight);',
      '  float cameraCoordY = dot(relativePosition, cameraUp);',
      '  float minimumResolution = min(uniformResolution.x, uniformResolution.y);',
      '  float fovScale = 1.54 / 1.70;',
      '  vec3 pupilRelative = vec3(0.0, 0.0, -1.08) - cameraOrigin;',
      '  float pupilDepth = dot(pupilRelative, cameraForward);',
      '  varyingIrisCenter = vec2(dot(pupilRelative, cameraRight), dot(pupilRelative, cameraUp)) * fovScale / pupilDepth;',
      '  gl_Position = vec4(',
      '    cameraCoordX * fovScale * (2.0 * minimumResolution / uniformResolution.x),',
      '    cameraCoordY * fovScale * (2.0 * minimumResolution / uniformResolution.y),',
      '    cameraDepth * 0.2 - 0.1,',
      '    cameraDepth',
      '  );',
      '}'
    ].join('\n');

    const mainFragmentShaderSource = precisionHeader + [
      'uniform vec2 uniformResolution;',
      'uniform float uniformIntensity;',
      'uniform float uniformProject;',
      'uniform float uniformActiveTime;',
      'uniform vec2 uniformFocusCoords;',
      'uniform float uniformFocusStrength;',
      'uniform float uniformFocusPulseTime;',
      'uniform sampler2D uniformFiberTexture;',
      'varying vec3 varyingWorldPosition;',
      'varying vec3 varyingNormal;',
      'varying vec2 varyingTexCoord;',
      'varying vec3 varyingViewDirection;',
      'varying vec2 varyingIrisCenter;',
      'vec3 srgbToLinear(vec3 c) {',
      '  vec3 lower = c / 12.92;',
      '  vec3 higher = pow((c + 0.055) / 1.055, vec3(2.4));',
      '  return mix(lower, higher, step(vec3(0.04045), c));',
      '}',
      'vec3 linearToSRGB(vec3 c) {',
      '  vec3 higher = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;',
      '  vec3 lower = c * 12.92;',
      '  return mix(lower, higher, step(vec3(0.0031308), c));',
      '}',
      'void main(void) {',
      '  float radialDistance = length(varyingWorldPosition.xy);',
      '  float angleRadian = atan(varyingWorldPosition.y, varyingWorldPosition.x);',
      '  float travelingTension = sin(angleRadian * 8.0 + radialDistance * 6.0 - uniformActiveTime * 0.462) * 0.65;',
      '  float travelingRelief = cos(angleRadian * 6.0 - radialDistance * 7.0 + uniformActiveTime * 0.306) * 0.45;',
      '  vec2 dynamicUv = vec2(varyingTexCoord.x + (travelingTension + travelingRelief) * 0.0012, varyingTexCoord.y);',
      '  vec4 fiberSample = texture2D(uniformFiberTexture, dynamicUv);',
      '  float ridgeIntensity = fiberSample.r;',
      '  float branchingFactor = fiberSample.g;',
      '  float mineralFactor = fiberSample.b;',
      '  float microFiberGleam = pow(ridgeIntensity, 3.5);',
      '  vec2 reliefOffset = vec2(0.0006, 0.0018);',
      '  float heightRight = texture2D(uniformFiberTexture, dynamicUv + vec2(reliefOffset.x, 0.0)).r;',
      '  float heightUp = texture2D(uniformFiberTexture, dynamicUv + vec2(0.0, reliefOffset.y)).r;',
      '  float gradientU = clamp((heightRight - ridgeIntensity) / reliefOffset.x * 0.018 / max(6.2831853 * radialDistance, 0.5), -0.30, 0.30);',
      '  float gradientV = clamp((heightUp - ridgeIntensity) / reliefOffset.y * 0.018 / 1.60, -0.30, 0.30);',
      '  vec3 surfaceNormalVector = normalize(varyingNormal);',
      '  vec3 tangentAngular = normalize(vec3(-sin(angleRadian), cos(angleRadian), 0.0));',
      '  vec3 tangentRadial = normalize(cross(tangentAngular, surfaceNormalVector));',
      '  vec3 sculptedNormal = normalize(surfaceNormalVector - tangentAngular * gradientU - tangentRadial * gradientV);',
      '  vec3 colAbyssal   = srgbToLinear(vec3(3.0, 9.0, 12.0) / 255.0);',
      '  vec3 colPetrol    = srgbToLinear(vec3(11.0, 37.0, 41.0) / 255.0);',
      '  vec3 colJade      = srgbToLinear(vec3(40.0, 97.0, 90.0) / 255.0);',
      '  vec3 colCeladon   = srgbToLinear(vec3(100.0, 142.0, 123.0) / 255.0);',
      '  vec3 colSlate     = srgbToLinear(vec3(60.0, 88.0, 102.0) / 255.0);',
      '  vec3 colCopper    = srgbToLinear(vec3(149.0, 99.0, 65.0) / 255.0);',
      '  vec3 colAmber     = srgbToLinear(vec3(190.0, 146.0, 89.0) / 255.0);',
      '  vec3 colChampagne = srgbToLinear(vec3(221.0, 207.0, 171.0) / 255.0);',
      '  float ciliaryEdgeFraction = smoothstep(1.05, 2.05, radialDistance);',
      '  vec3 baseColdStroma = mix(colPetrol, colSlate, ciliaryEdgeFraction * 0.60);',
      '  vec3 fiberColor = mix(colJade, colCeladon, smoothstep(0.30, 0.85, ridgeIntensity));',
      '  float fiberPresence = clamp(branchingFactor * 0.50 + ridgeIntensity * 0.50, 0.0, 1.0);',
      '  vec3 stromalComposition = mix(baseColdStroma, fiberColor, fiberPresence * 0.65);',
      '  float innerZoneWeight = 1.0 - smoothstep(0.54, 0.98, radialDistance);',
      '  vec3 warmPigment = mix(colCopper, colAmber, mineralFactor);',
      '  float warmPresence = clamp(innerZoneWeight * (0.25 + mineralFactor * 0.75), 0.0, 0.85);',
      '  vec3 materialAlbedo = mix(stromalComposition, warmPigment, warmPresence);',
      '  float cryptDepthOcclusion = smoothstep(0.06, 0.48, ridgeIntensity);',
      '  materialAlbedo = mix(colAbyssal, materialAlbedo, 0.45 + 0.55 * cryptDepthOcclusion);',
      '  vec3 keyLightVector = normalize(vec3(-0.65 + 0.04 * sin(uniformActiveTime * 0.35), 0.85 + 0.03 * cos(uniformActiveTime * 0.41), 1.25));',
      '  vec3 fillLightVector = normalize(vec3(0.75 - 0.03 * cos(uniformActiveTime * 0.29), -0.50 + 0.03 * sin(uniformActiveTime * 0.37), 0.35));',
      '  vec3 normalizedViewVector = normalize(varyingViewDirection);',
      '  vec3 specularHalfVector = normalize(keyLightVector + normalizedViewVector);',
      '  float diffuseKey = max(dot(sculptedNormal, keyLightVector), 0.0);',
      '  float diffuseFill = max(dot(sculptedNormal, fillLightVector), 0.0);',
      '  float throatOcclusion = smoothstep(-1.07, -0.38, varyingWorldPosition.z);',
      '  float creviceOcclusion = 0.60 + 0.40 * smoothstep(0.08, 0.65, ridgeIntensity);',
      '  float limbalShading = 1.0 - smoothstep(1.42, 2.08, radialDistance);',
      '  float specularPower = pow(max(dot(sculptedNormal, specularHalfVector), 0.0), 55.0);',
      '  float microSpecular = specularPower * microFiberGleam * 0.18;',
      '  float wetReflectiveGleam = pow(max(dot(sculptedNormal, specularHalfVector), 0.0), 120.0) * 0.14;',
      '  float diffuseLighting = (0.85 * diffuseKey + 0.24 * diffuseFill) * creviceOcclusion;',
      '  vec3 linearSceneComposition = materialAlbedo * (0.34 + diffuseLighting);',
      '  linearSceneComposition += colChampagne * microSpecular;',
      '  linearSceneComposition += colCeladon * wetReflectiveGleam;',
      '  linearSceneComposition *= (0.09 + 0.91 * throatOcclusion) * (0.18 + 0.82 * limbalShading);',
      '  float rimFresnel = pow(1.0 - max(dot(surfaceNormalVector, normalizedViewVector), 0.0), 3.0);',
      '  linearSceneComposition += colSlate * (diffuseFill * 0.10 * rimFresnel * throatOcclusion);',
      '  float respirationWave = sin(uniformActiveTime * 0.641) * 0.72 + sin(uniformActiveTime * 0.306 + 1.15) * 0.28;',
      '  float tidalWave = sin(uniformActiveTime * 0.306) * 0.68 + sin(uniformActiveTime * 0.462 + 2.05) * 0.32;',
      '  float pupilDilation = 0.038 * respirationWave + 0.012 * tidalWave;',
      '  float currentPupilLipRadius = (0.57 + 0.010 * sin(angleRadian * 16.0)) * (1.0 + pupilDilation);',
      '  float pupillaryLipGlow = exp(-pow(abs(radialDistance - currentPupilLipRadius) / 0.028, 2.0));',
      '  float lipPigmentVariation = 0.25 + 0.75 * smoothstep(0.12, 0.65, branchingFactor);',
      '  linearSceneComposition += colCopper * (pupillaryLipGlow * diffuseKey * throatOcclusion * lipPigmentVariation * 0.20);',
      '  float pupilEdgeCoverage = smoothstep(0.485, 0.525, radialDistance);',
      '  linearSceneComposition = mix(colAbyssal * 0.4, linearSceneComposition, pupilEdgeCoverage);',
      '  float limbusCoverage = 1.0 - smoothstep(2.04, 2.18, radialDistance);',
      '  if (limbusCoverage <= 0.001) {',
      '    discard;',
      '  }',
      '  float atmosphericSeparation = smoothstep(1.86, 2.06, radialDistance) * (1.0 - smoothstep(2.06, 2.18, radialDistance));',
      '  linearSceneComposition += colPetrol * (atmosphericSeparation * 0.45);',
      '  vec2 screenCoordinates = (gl_FragCoord.xy - 0.5 * uniformResolution) / min(uniformResolution.x, uniformResolution.y);',
      '  vec3 cornealNormal = normalize(vec3(screenCoordinates * 0.35, 1.0));',
      '  vec3 cornealReflectedRay = reflect(-normalizedViewVector, cornealNormal);',
      '  vec2 upperSoftboxPosition = vec2(-0.43 + 0.032 * sin(uniformActiveTime * 0.38 + 0.5), 0.62 + 0.024 * cos(uniformActiveTime * 0.27));',
      '  vec2 sideSoftboxPosition = vec2(0.74 + 0.026 * cos(uniformActiveTime * 0.33), -0.12 + 0.036 * sin(uniformActiveTime * 0.25 + 1.2));',
      '  float upperSoftboxIntensity = exp(-pow(abs(cornealReflectedRay.x - upperSoftboxPosition.x) / 0.14, 4.0) - pow(abs(cornealReflectedRay.y - upperSoftboxPosition.y) / 0.040, 2.0));',
      '  float sideSoftboxIntensity = exp(-pow(abs(cornealReflectedRay.x - sideSoftboxPosition.x) / 0.025, 2.0) - pow(abs(cornealReflectedRay.y - sideSoftboxPosition.y) / 0.22, 4.0));',
      '  vec3 broadLightDirection = normalize(vec3(-0.50 + 0.07 * sin(uniformActiveTime * 0.31), 0.70 + 0.05 * cos(uniformActiveTime * 0.23), 0.90));',
      '  float broadSurfaceReflection = pow(max(dot(cornealReflectedRay, broadLightDirection), 0.0), 24.0);',
      '  float cornealFresnel = 0.015 + 0.25 * pow(1.0 - max(dot(normalizedViewVector, cornealNormal), 0.0), 5.0);',
      '  float clearTitleCorridor = smoothstep(0.17, 0.36, length(screenCoordinates));',
      '  float corneaEnvelope = 1.0 - smoothstep(2.00, 2.16, radialDistance);',
      '  linearSceneComposition += ((colCeladon * upperSoftboxIntensity * 0.06 + colCopper * sideSoftboxIntensity * 0.05 + colChampagne * broadSurfaceReflection * 0.04) * clearTitleCorridor + colPetrol * cornealFresnel * 0.08) * corneaEnvelope;',
      '  linearSceneComposition *= 0.68 + 0.32 * smoothstep(0.10, 0.28, length(screenCoordinates));',
      '  linearSceneComposition *= 1.0 - smoothstep(0.70, 1.35, length(screenCoordinates)) * 0.35;',
      '  vec2 irisScreenCenter = varyingIrisCenter;',
      '  vec2 dirToFocus = uniformFocusCoords - irisScreenCenter;',
      '  float angleToFocus = atan(dirToFocus.y, dirToFocus.x);',
      '  vec2 dirFrag = screenCoordinates - irisScreenCenter;',
      '  float angleFrag = atan(dirFrag.y, dirFrag.x);',
      '  float angleDiff = abs(mod(angleFrag - angleToFocus + 3.14159265, 6.2831853) - 3.14159265);',
      '  float sectorHalo = exp(-pow(angleDiff / 0.72, 2.0));',
      '  float pulseBeam = 0.0;',
      '  if (uniformFocusPulseTime >= 0.0 && uniformFocusPulseTime <= 1.0) {',
      '    float p = uniformFocusPulseTime;',
      '    float waveRadius = 0.52 + p * 1.55;',
      '    float waveDist = abs(radialDistance - waveRadius);',
      '    pulseBeam = exp(-pow(waveDist / 0.14, 2.0)) * (1.0 - p) * sectorHalo * uniformFocusStrength;',
      '  }',
      '  float staticSectorHalo = sectorHalo * uniformFocusStrength * (0.30 + 0.70 * smoothstep(0.55, 1.85, radialDistance));',
      '  vec3 focusLightColor = mix(colCeladon, colChampagne, 0.40);',
      '  vec3 contextualFocusLight = focusLightColor * (staticSectorHalo * 0.20 + pulseBeam * 0.45);',
      '  float distToLabel = length(screenCoordinates - uniformFocusCoords);',
      '  float underLabelAttenuation = 1.0 - 0.20 * uniformFocusStrength * exp(-pow(distToLabel / 0.35, 2.0));',
      '  linearSceneComposition *= underLabelAttenuation;',
      '  linearSceneComposition += contextualFocusLight;',
      '  linearSceneComposition *= uniformIntensity * (1.0 + uniformProject * 0.07);',
      '  vec3 mappedColor = vec3(1.0) - exp(-linearSceneComposition * 1.30);',
      '  vec3 finalSrgbColor = linearToSRGB(mappedColor);',
      '  gl_FragColor = vec4(finalSrgbColor, limbusCoverage);',
      '}'
    ].join('\n');

    let shaderProgram = null;
    let vertexBuffer = null;
    let fiberTexture = null;
    let totalVertexCount = 0;

    let positionAttributeLocation = -1;
    let texCoordAttributeLocation = -1;
    let normalAttributeLocation = -1;

    let uniformResolutionLocation = null;
    let uniformPointerLocation = null;
    let uniformRotationLocation = null;
    let uniformIntensityLocation = null;
    let uniformZoomLocation = null;
    let uniformProjectLocation = null;
    let uniformActiveTimeLocation = null;
    let uniformFocusCoordsLocation = null;
    let uniformFocusStrengthLocation = null;
    let uniformFocusPulseTimeLocation = null;
    let fiberTextureUniformLocation = null;

    let spaceShaderProgram = null;
    let spaceQuadBuffer = null;
    let spacePositionAttributeLocation = -1;
    let spaceResolutionUniformLocation = null;
    let spacePointerUniformLocation = null;
    let spaceZoomUniformLocation = null;
    let spaceRotationUniformLocation = null;
    let spaceActiveTimeUniformLocation = null;
    let spaceFocusCoordsUniformLocation = null;
    let spaceFocusStrengthUniformLocation = null;

    function cleanupPartialResources(targetShaderOne, targetShaderTwo, targetProgramInstance, targetBufferInstance, targetTextureInstance, spaceShaderOne, spaceShaderTwo, spaceProgramInstance, spaceBufferInstance) {
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
        if (targetTextureInstance && glContext) {
          glContext.deleteTexture(targetTextureInstance);
        }
        if (spaceShaderOne && glContext) {
          glContext.deleteShader(spaceShaderOne);
        }
        if (spaceShaderTwo && glContext) {
          glContext.deleteShader(spaceShaderTwo);
        }
        if (spaceProgramInstance && glContext) {
          glContext.deleteProgram(spaceProgramInstance);
        }
        if (spaceBufferInstance && glContext) {
          glContext.deleteBuffer(spaceBufferInstance);
        }
      } catch (cleanupError) {
        return false;
      }
      return true;
    }

    function generateProceduralTexture(targetGlContext, targetTexture) {
      const maximumTextureDimension = targetGlContext.getParameter(targetGlContext.MAX_TEXTURE_SIZE) || 4096;
      const computedTextureWidth = Math.min(pointerCoarseQuery.matches ? 2048 : 4096, maximumTextureDimension);
      const computedTextureHeight = Math.min(pointerCoarseQuery.matches ? 512 : 1024, Math.floor(computedTextureWidth / 4));

      let bakeCanvasElement = null;
      let bakeGlContext = null;
      let compiledBakeVs = null;
      let compiledBakeFs = null;
      let constructedBakeProg = null;
      let quadBufferInstance = null;
      let textureBakeSucceeded = false;

      try {
        bakeCanvasElement = document.createElement('canvas');
        bakeCanvasElement.width = computedTextureWidth;
        bakeCanvasElement.height = computedTextureHeight;
        bakeGlContext = bakeCanvasElement.getContext('webgl', {
          alpha: false,
          depth: false,
          stencil: false,
          antialias: false,
          preserveDrawingBuffer: true
        });

        if (bakeGlContext) {
          compiledBakeVs = bakeGlContext.createShader(bakeGlContext.VERTEX_SHADER);
          if (!compiledBakeVs) {
            throw new Error('Texture vertex shader unavailable');
          }
          bakeGlContext.shaderSource(compiledBakeVs, textureVertexShaderSource);
          bakeGlContext.compileShader(compiledBakeVs);
          if (!bakeGlContext.getShaderParameter(compiledBakeVs, bakeGlContext.COMPILE_STATUS)) {
            throw new Error('Texture vertex shader compilation failed');
          }

          compiledBakeFs = bakeGlContext.createShader(bakeGlContext.FRAGMENT_SHADER);
          if (!compiledBakeFs) {
            throw new Error('Texture fragment shader unavailable');
          }
          bakeGlContext.shaderSource(compiledBakeFs, textureFragmentShaderSource);
          bakeGlContext.compileShader(compiledBakeFs);
          if (!bakeGlContext.getShaderParameter(compiledBakeFs, bakeGlContext.COMPILE_STATUS)) {
            throw new Error('Texture fragment shader compilation failed');
          }

          constructedBakeProg = bakeGlContext.createProgram();
          if (!constructedBakeProg) {
            throw new Error('Texture shader program unavailable');
          }
          bakeGlContext.attachShader(constructedBakeProg, compiledBakeVs);
          bakeGlContext.attachShader(constructedBakeProg, compiledBakeFs);
          bakeGlContext.linkProgram(constructedBakeProg);
          if (!bakeGlContext.getProgramParameter(constructedBakeProg, bakeGlContext.LINK_STATUS)) {
            throw new Error('Texture shader linking failed');
          }

          quadBufferInstance = bakeGlContext.createBuffer();
          if (!quadBufferInstance) {
            throw new Error('Texture geometry buffer unavailable');
          }
          bakeGlContext.bindBuffer(bakeGlContext.ARRAY_BUFFER, quadBufferInstance);
          bakeGlContext.bufferData(bakeGlContext.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), bakeGlContext.STATIC_DRAW);

          bakeGlContext.viewport(0, 0, computedTextureWidth, computedTextureHeight);
          bakeGlContext.useProgram(constructedBakeProg);
          const posLocation = bakeGlContext.getAttribLocation(constructedBakeProg, 'attributePosition');
          if (posLocation < 0) {
            throw new Error('Texture vertex attribute unavailable');
          }
          bakeGlContext.enableVertexAttribArray(posLocation);
          bakeGlContext.vertexAttribPointer(posLocation, 2, bakeGlContext.FLOAT, false, 0, 0);
          bakeGlContext.drawArrays(bakeGlContext.TRIANGLES, 0, 6);

          targetGlContext.pixelStorei(targetGlContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          targetGlContext.pixelStorei(targetGlContext.UNPACK_COLORSPACE_CONVERSION_WEBGL, targetGlContext.NONE);
          targetGlContext.bindTexture(targetGlContext.TEXTURE_2D, targetTexture);
          targetGlContext.texImage2D(targetGlContext.TEXTURE_2D, 0, targetGlContext.RGBA, targetGlContext.RGBA, targetGlContext.UNSIGNED_BYTE, bakeCanvasElement);
          textureBakeSucceeded = true;
        }
      } catch (bakeError) {
        textureBakeSucceeded = false;
      } finally {
        if (bakeGlContext) {
          try {
            if (compiledBakeVs) {
              bakeGlContext.deleteShader(compiledBakeVs);
            }
            if (compiledBakeFs) {
              bakeGlContext.deleteShader(compiledBakeFs);
            }
            if (constructedBakeProg) {
              bakeGlContext.deleteProgram(constructedBakeProg);
            }
            if (quadBufferInstance) {
              bakeGlContext.deleteBuffer(quadBufferInstance);
            }
            const loseContextExtension = bakeGlContext.getExtension('WEBGL_lose_context');
            if (loseContextExtension) {
              loseContextExtension.loseContext();
            }
          } catch (resourceDisposeError) {
          }
        }
        if (bakeCanvasElement) {
          bakeCanvasElement.width = 1;
          bakeCanvasElement.height = 1;
          bakeCanvasElement = null;
        }
      }

      if (!textureBakeSucceeded) {
        const fallbackWidth = computedTextureWidth;
        const fallbackHeight = computedTextureHeight;
        const fallbackBytes = new Uint8Array(fallbackWidth * fallbackHeight * 4);

        function fract(x) { return x - Math.floor(x); }
        function hash3(x, y, z) {
          let px = fract(x * 0.1031);
          let py = fract(y * 0.1030);
          let pz = fract(z * 0.0973);
          const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
          px += d; py += d; pz += d;
          return fract((px + py) * pz);
        }
        function noise3(x, y, z) {
          const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
          const fx = x - ix, fy = y - iy, fz = z - iz;
          const ux = fx * fx * (3.0 - 2.0 * fx);
          const uy = fy * fy * (3.0 - 2.0 * fy);
          const uz = fz * fz * (3.0 - 2.0 * fz);
          const h000 = hash3(ix, iy, iz), h100 = hash3(ix + 1, iy, iz);
          const h010 = hash3(ix, iy + 1, iz), h110 = hash3(ix + 1, iy + 1, iz);
          const h001 = hash3(ix, iy, iz + 1), h101 = hash3(ix + 1, iy, iz + 1);
          const h011 = hash3(ix, iy + 1, iz + 1), h111 = hash3(ix + 1, iy + 1, iz + 1);
          const x00 = h000 + ux * (h100 - h000), x10 = h010 + ux * (h110 - h010);
          const x01 = h001 + ux * (h101 - h001), x11 = h011 + ux * (h111 - h011);
          const y0 = x00 + uy * (x10 - x00), y1 = x01 + uy * (x11 - x01);
          return y0 + uz * (y1 - y0);
        }
        function hash2(x, y) {
          let px = fract(x * 0.1031), py = fract(y * 0.1030);
          const d = px * (py + 33.33) + py * (px + 33.33);
          px += d; py += d;
          return fract((px + py) * px);
        }
        function hash22(x, y) {
          return [hash2(x, y), hash2(x + 17.1, y + 31.7)];
        }
        function computeCellularCrypts(u, v, C, S) {
          const warpAngle = (noise3(C * 4.0, S * 4.0, v * 3.0) - 0.5) * 0.35;
          const warpV = (noise3(C * 3.0 + 5.1, S * 3.0 + 2.4, v * 4.0) - 0.5) * 0.04;
          const wu = fract(u + warpAngle / (2.0 * Math.PI) + 1.0);
          const wv = v + warpV;
          const cellCols = 24.0, cellRows = 10.0;
          const px = wu * cellCols, py = wv * cellRows;
          const ix = Math.floor(px), iy = Math.floor(py);
          const fx = px - ix, fy = py - iy;
          let minDist = 10.0;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const cx = (ix + dx + cellCols) % cellCols;
              const cy = iy + dy;
              if (cy >= 0.0 && cy < cellRows) {
                const seed = hash2(cx, cy);
                const threshold = (cy >= 1.0 && cy <= 2.0) ? 0.48 : ((cy >= 4.0 && cy <= 6.0) ? 0.76 : 0.99);
                if (seed > threshold) {
                  const offset = hash22(cx + 12.3, cy + 45.6);
                  const rx = dx + offset[0] * 0.6 + 0.2 - fx;
                  const ry = dy + offset[1] * 0.6 + 0.2 - fy;
                  const dist = Math.sqrt(rx * rx + ry * ry * 1.6);
                  if (dist < minDist) minDist = dist;
                }
              }
            }
          }
          const radius = 0.46;
          const rawCavity = Math.max(0.0, 1.0 - minDist / radius);
          const smoothCavity = rawCavity * rawCavity * (3.0 - 2.0 * rawCavity);
          const collaretteEnv = Math.exp(-Math.pow((v - 0.18) / 0.075, 2.0));
          const ciliaryEnv = Math.exp(-Math.pow((v - 0.52) / 0.16, 2.0)) * 0.40;
          const pupilCutoff = Math.min(1.0, Math.max(0.0, (v - 0.04) / 0.05));
          return smoothCavity * (collaretteEnv + ciliaryEnv) * pupilCutoff;
        }

        for (let pixelRow = 0; pixelRow < fallbackHeight; pixelRow += 1) {
          const v = pixelRow / fallbackHeight;

          for (let pixelColumn = 0; pixelColumn < fallbackWidth; pixelColumn += 1) {
            const u = pixelColumn / fallbackWidth;
            const angleRadian = u * Math.PI * 2.0;

            const C = Math.cos(angleRadian);
            const S = Math.sin(angleRadian);

            const nLow = noise3(C * 3.5, S * 3.5, v * 2.5);
            const nMid = noise3(C * 9.0 + 3.1, S * 9.0 + 2.7, v * 7.0);
            const warpedAngle = angleRadian + (nLow - 0.5) * 0.42 + (nMid - 0.5) * 0.18 * v;

            const collaretteWarp = (noise3(C * 4.0, S * 4.0, 1.5) - 0.5) * 0.05;
            const collaretteV = 0.175 + collaretteWarp;
            const collaretteAmp = Math.min(1.0, Math.max(0.0, (noise3(C * 5.0 + 2.0, S * 5.0 + 1.0, 3.2) - 0.25) / 0.50));
            const collaretteWidth = 0.038 + 0.015 * noise3(C * 6.0, S * 6.0, 4.0);
            const collaretteDist = (v - collaretteV) / collaretteWidth;
            const collaretteElevation = Math.exp(-collaretteDist * collaretteDist) * collaretteAmp;

            const phase1 = warpedAngle * 36.0 + (noise3(C * 6.0, S * 6.0, v * 6.0) - 0.5) * 5.0;
            const beam1 = Math.pow(0.5 + 0.5 * Math.cos(phase1), 2.5);
            const mask1 = Math.min(1.0, Math.max(0.0, (v - 0.06) / 0.14)) * (0.6 + 0.4 * noise3(C * 3.0, S * 3.0, 2.0));

            const phase2 = warpedAngle * 72.0 + (noise3(C * 12.0 + 1.0, S * 12.0 + 3.0, v * 10.0) - 0.5) * 6.0;
            const beam2 = Math.pow(0.5 + 0.5 * Math.cos(phase2), 3.0);
            const mask2 = Math.min(1.0, Math.max(0.0, (v + (noise3(C * 4.0, S * 4.0, 1.0) - 0.5) * 0.15 - 0.14) / 0.21));

            const phase3 = warpedAngle * 144.0 + (noise3(C * 20.0 + 2.0, S * 20.0 + 5.0, v * 18.0) - 0.5) * 8.0;
            const beam3 = Math.pow(0.5 + 0.5 * Math.cos(phase3), 3.5);
            const mask3 = Math.min(1.0, Math.max(0.0, (v - 0.25) / 0.30));

            let fiberRelief = beam1 * mask1 * 0.48 + beam2 * mask2 * 0.36 + beam3 * mask3 * 0.26;
            const restingZone = Math.min(1.0, Math.max(0.0, (noise3(C * 2.5, S * 2.5, v * 2.0) - 0.18) / 0.47));
            fiberRelief *= 0.55 + 0.45 * restingZone;

            const cryptCavity = computeCellularCrypts(u, v, C, S);

            const furrowNoise = noise3(C * 6.0, S * 6.0, v * 15.0);
            const furrowPhase = v * 32.0 + (furrowNoise - 0.5) * 3.0;
            const furrowEnv = Math.min(1.0, Math.max(0.0, (v - 0.42) / 0.15)) * (1.0 - Math.min(1.0, Math.max(0.0, (v - 0.88) / 0.10)));
            const furrowGroove = Math.sin(furrowPhase) * furrowEnv * (0.5 + 0.5 * Math.cos(warpedAngle * 6.0)) * 0.08;

            const microGrain = noise3(C * 32.0, S * 32.0, v * 40.0);

            const composedRelief = Math.min(1.0, Math.max(0.0,
              fiberRelief * 0.65 + collaretteElevation * 0.30 - cryptCavity * 0.60 - furrowGroove + (microGrain - 0.5) * 0.05
            ));

            const branchingPattern = Math.min(1.0, Math.max(0.0,
              beam2 * mask2 * 0.50 + beam3 * mask3 * 0.35 + beam1 * mask1 * 0.25 - cryptCavity * 0.45
            ));

            const amberNoise = noise3(C * 7.0 + 4.1, S * 7.0 + 2.3, v * 12.0);
            const warmClusters = Math.min(1.0, Math.max(0.0, (amberNoise - 0.35) / 0.35)) * (1.0 - Math.min(1.0, Math.max(0.0, (v - 0.06) / 0.22)));
            const cryptRim = Math.min(1.0, Math.max(0.0, (cryptCavity - 0.10) / 0.25)) * (1.0 - Math.min(1.0, Math.max(0.0, (cryptCavity - 0.55) / 0.30))) * 0.60;
            const ciliaryTone = (1.0 - Math.min(1.0, Math.max(0.0, (v - 0.25) / 0.70))) * 0.25;
            const mineralPattern = Math.min(1.0, Math.max(0.0,
              warmClusters * 0.65 + cryptRim + ciliaryTone + (microGrain - 0.5) * 0.08
            ));

            const byteOffset = (pixelRow * fallbackWidth + pixelColumn) * 4;
            fallbackBytes[byteOffset] = Math.min(255, Math.max(0, Math.round(composedRelief * 255)));
            fallbackBytes[byteOffset + 1] = Math.min(255, Math.max(0, Math.round(branchingPattern * 255)));
            fallbackBytes[byteOffset + 2] = Math.min(255, Math.max(0, Math.round(mineralPattern * 255)));
            fallbackBytes[byteOffset + 3] = 255;
          }
        }

        targetGlContext.pixelStorei(targetGlContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        targetGlContext.pixelStorei(targetGlContext.UNPACK_COLORSPACE_CONVERSION_WEBGL, targetGlContext.NONE);
        targetGlContext.bindTexture(targetGlContext.TEXTURE_2D, targetTexture);
        targetGlContext.texImage2D(targetGlContext.TEXTURE_2D, 0, targetGlContext.RGBA, fallbackWidth, fallbackHeight, 0, targetGlContext.RGBA, targetGlContext.UNSIGNED_BYTE, fallbackBytes);
      }

      targetGlContext.bindTexture(targetGlContext.TEXTURE_2D, targetTexture);
      targetGlContext.texParameteri(targetGlContext.TEXTURE_2D, targetGlContext.TEXTURE_WRAP_S, targetGlContext.REPEAT);
      targetGlContext.texParameteri(targetGlContext.TEXTURE_2D, targetGlContext.TEXTURE_WRAP_T, targetGlContext.CLAMP_TO_EDGE);
      targetGlContext.texParameteri(targetGlContext.TEXTURE_2D, targetGlContext.TEXTURE_MIN_FILTER, targetGlContext.LINEAR_MIPMAP_LINEAR);
      targetGlContext.texParameteri(targetGlContext.TEXTURE_2D, targetGlContext.TEXTURE_MAG_FILTER, targetGlContext.LINEAR);
      targetGlContext.generateMipmap(targetGlContext.TEXTURE_2D);

      const anisotropicExtension = targetGlContext.getExtension('EXT_texture_filter_anisotropic') ||
                                   targetGlContext.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
                                   targetGlContext.getExtension('MOZ_EXT_texture_filter_anisotropic');
      if (anisotropicExtension) {
        const maximumAnisotropy = targetGlContext.getParameter(anisotropicExtension.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 4;
        targetGlContext.texParameterf(targetGlContext.TEXTURE_2D, anisotropicExtension.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4.0, maximumAnisotropy));
      }
    }

    function setupWebGLPipeline() {
      if (!glContext || glContext.isContextLost()) {
        return false;
      }

      let allocatedFiberTexture = null;
      let compiledMainVs = null;
      let compiledMainFs = null;
      let constructedMainProg = null;
      let allocatedMeshBuffer = null;
      let compiledSpaceVs = null;
      let compiledSpaceFs = null;
      let constructedSpaceProg = null;
      let allocatedSpaceBuffer = null;

      try {
        allocatedSpaceBuffer = glContext.createBuffer();
        if (!allocatedSpaceBuffer) {
          return false;
        }
        glContext.bindBuffer(glContext.ARRAY_BUFFER, allocatedSpaceBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), glContext.STATIC_DRAW);

        compiledSpaceVs = glContext.createShader(glContext.VERTEX_SHADER);
        if (!compiledSpaceVs) {
          cleanupPartialResources(null, null, null, null, null, null, null, null, allocatedSpaceBuffer);
          return false;
        }
        glContext.shaderSource(compiledSpaceVs, spaceVertexShaderSource);
        glContext.compileShader(compiledSpaceVs);
        if (!glContext.getShaderParameter(compiledSpaceVs, glContext.COMPILE_STATUS)) {
          cleanupPartialResources(null, null, null, null, null, compiledSpaceVs, null, null, allocatedSpaceBuffer);
          return false;
        }

        compiledSpaceFs = glContext.createShader(glContext.FRAGMENT_SHADER);
        if (!compiledSpaceFs) {
          cleanupPartialResources(null, null, null, null, null, compiledSpaceVs, null, null, allocatedSpaceBuffer);
          return false;
        }
        glContext.shaderSource(compiledSpaceFs, spaceFragmentShaderSource);
        glContext.compileShader(compiledSpaceFs);
        if (!glContext.getShaderParameter(compiledSpaceFs, glContext.COMPILE_STATUS)) {
          cleanupPartialResources(null, null, null, null, null, compiledSpaceVs, compiledSpaceFs, null, allocatedSpaceBuffer);
          return false;
        }

        constructedSpaceProg = glContext.createProgram();
        if (!constructedSpaceProg) {
          cleanupPartialResources(null, null, null, null, null, compiledSpaceVs, compiledSpaceFs, null, allocatedSpaceBuffer);
          return false;
        }
        glContext.attachShader(constructedSpaceProg, compiledSpaceVs);
        glContext.attachShader(constructedSpaceProg, compiledSpaceFs);
        glContext.linkProgram(constructedSpaceProg);
        if (!glContext.getProgramParameter(constructedSpaceProg, glContext.LINK_STATUS)) {
          cleanupPartialResources(null, null, null, null, null, compiledSpaceVs, compiledSpaceFs, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }

        const spacePositionLocation = glContext.getAttribLocation(constructedSpaceProg, 'attributePosition');
        if (spacePositionLocation < 0) {
          cleanupPartialResources(null, null, null, null, null, compiledSpaceVs, compiledSpaceFs, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }

        const spaceResolutionLoc = glContext.getUniformLocation(constructedSpaceProg, 'uniformResolution');
        const spacePointerLoc = glContext.getUniformLocation(constructedSpaceProg, 'uniformPointer');
        const spaceZoomLoc = glContext.getUniformLocation(constructedSpaceProg, 'uniformZoom');
        const spaceRotationLoc = glContext.getUniformLocation(constructedSpaceProg, 'uniformRotation');
        const spaceActiveTimeLoc = glContext.getUniformLocation(constructedSpaceProg, 'uniformActiveTime');
        const spaceFocusCoordsLoc = glContext.getUniformLocation(constructedSpaceProg, 'uniformFocusCoords');
        const spaceFocusStrengthLoc = glContext.getUniformLocation(constructedSpaceProg, 'uniformFocusStrength');

        glContext.deleteShader(compiledSpaceVs);
        glContext.deleteShader(compiledSpaceFs);

        allocatedFiberTexture = glContext.createTexture();
        if (!allocatedFiberTexture) {
          cleanupPartialResources(null, null, null, null, null, null, null, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }

        generateProceduralTexture(glContext, allocatedFiberTexture);

        const totalSectors = 256;
        const totalRings = 96;
        const vertexData = [];

        function evaluateHeight(radialDistance) {
          if (radialDistance < 0.44) {
            return -1.25;
          }
          const collaretteElevation = Math.exp(-Math.pow((radialDistance - 0.80) / 0.064, 2.0)) * 0.055;
          const pupilLipElevation = Math.exp(-Math.pow((radialDistance - 0.56) / 0.041, 2.0)) * 0.095;
          const lipFadeIn = Math.min(1.0, Math.max(0.0, (radialDistance - 0.44) / 0.06));

          let baseSurfaceZ = 0.0;
          if (radialDistance < 0.52) {
            const hermiteFraction = (radialDistance - 0.44) / 0.08;
            const hermiteFactor = hermiteFraction * hermiteFraction * (3.0 - 2.0 * hermiteFraction);
            baseSurfaceZ = -1.25 + hermiteFactor * 0.63;
          } else if (radialDistance <= 2.12) {
            baseSurfaceZ = 0.23 - 0.85 * Math.exp(-(radialDistance - 0.52) * 2.35);
          } else {
            baseSurfaceZ = 0.23 - 0.85 * Math.exp(-(2.12 - 0.52) * 2.35);
          }
          return baseSurfaceZ + collaretteElevation + pupilLipElevation * lipFadeIn;
        }

        function evaluateProfile(radialDistance) {
          const surfaceZ = evaluateHeight(radialDistance);
          const deltaRadialStep = 0.002;
          const heightPlus = evaluateHeight(radialDistance + deltaRadialStep);
          const heightMinus = evaluateHeight(radialDistance - deltaRadialStep);
          const slopeZ = (heightPlus - heightMinus) / (2.0 * deltaRadialStep);
          return { surfaceZ: surfaceZ, slopeZ: slopeZ };
        }

        const ringRadii = [];
        for (let ringStep = 0; ringStep <= totalRings; ringStep += 1) {
          const ringProgress = ringStep / totalRings;
          let computedRadius = 0.0;
          if (ringProgress < 0.17) {
            computedRadius = (ringProgress / 0.17) * 0.44;
          } else if (ringProgress < 0.38) {
            computedRadius = 0.44 + ((ringProgress - 0.17) / 0.21) * (0.60 - 0.44);
          } else if (ringProgress < 0.58) {
            computedRadius = 0.60 + ((ringProgress - 0.38) / 0.20) * (0.95 - 0.60);
          } else if (ringProgress < 0.83) {
            computedRadius = 0.95 + ((ringProgress - 0.58) / 0.25) * (2.12 - 0.95);
          } else {
            computedRadius = 2.12 + ((ringProgress - 0.83) / 0.17) * (2.28 - 2.12);
          }
          ringRadii.push(computedRadius);
        }

        for (let ringIndex = 0; ringIndex < totalRings; ringIndex += 1) {
          const radiusInner = ringRadii[ringIndex];
          const radiusOuter = ringRadii[ringIndex + 1];
          const profileInner = evaluateProfile(radiusInner);
          const profileOuter = evaluateProfile(radiusOuter);

          for (let sectorIndex = 0; sectorIndex < totalSectors; sectorIndex += 1) {
            const sectorProgressStart = sectorIndex / totalSectors;
            const sectorProgressEnd = (sectorIndex + 1) / totalSectors;
            const angleStart = sectorProgressStart * Math.PI * 2.0;
            const angleEnd = sectorProgressEnd * Math.PI * 2.0;

            function appendVertex(radialPosition, angleValue, profileData, textureU) {
              const positionX = radialPosition * Math.cos(angleValue);
              const positionY = radialPosition * Math.sin(angleValue);
              const positionZ = profileData.surfaceZ;

              let normalX = -Math.cos(angleValue) * profileData.slopeZ;
              let normalY = -Math.sin(angleValue) * profileData.slopeZ;
              let normalZ = 1.0;
              const normalLength = Math.hypot(normalX, normalY, normalZ) || 1.0;
              normalX /= normalLength;
              normalY /= normalLength;
              normalZ /= normalLength;

              const textureV = Math.min(1.0, Math.max(0.0, (radialPosition - 0.52) / (2.12 - 0.52)));
              vertexData.push(positionX, positionY, positionZ, textureU, textureV, normalX, normalY, normalZ);
            }

            appendVertex(radiusInner, angleStart, profileInner, sectorProgressStart);
            appendVertex(radiusOuter, angleStart, profileOuter, sectorProgressStart);
            appendVertex(radiusInner, angleEnd, profileInner, sectorProgressEnd);

            appendVertex(radiusInner, angleEnd, profileInner, sectorProgressEnd);
            appendVertex(radiusOuter, angleStart, profileOuter, sectorProgressStart);
            appendVertex(radiusOuter, angleEnd, profileOuter, sectorProgressEnd);
          }
        }

        allocatedMeshBuffer = glContext.createBuffer();
        if (!allocatedMeshBuffer) {
          cleanupPartialResources(null, null, null, null, allocatedFiberTexture, null, null, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }
        glContext.bindBuffer(glContext.ARRAY_BUFFER, allocatedMeshBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(vertexData), glContext.STATIC_DRAW);
        totalVertexCount = vertexData.length / 8;

        compiledMainVs = glContext.createShader(glContext.VERTEX_SHADER);
        if (!compiledMainVs) {
          cleanupPartialResources(null, null, null, allocatedMeshBuffer, allocatedFiberTexture, null, null, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }
        glContext.shaderSource(compiledMainVs, mainVertexShaderSource);
        glContext.compileShader(compiledMainVs);
        if (!glContext.getShaderParameter(compiledMainVs, glContext.COMPILE_STATUS)) {
          cleanupPartialResources(compiledMainVs, null, null, allocatedMeshBuffer, allocatedFiberTexture, null, null, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }

        compiledMainFs = glContext.createShader(glContext.FRAGMENT_SHADER);
        if (!compiledMainFs) {
          cleanupPartialResources(compiledMainVs, null, null, allocatedMeshBuffer, allocatedFiberTexture, null, null, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }
        glContext.shaderSource(compiledMainFs, mainFragmentShaderSource);
        glContext.compileShader(compiledMainFs);
        if (!glContext.getShaderParameter(compiledMainFs, glContext.COMPILE_STATUS)) {
          cleanupPartialResources(compiledMainVs, compiledMainFs, null, allocatedMeshBuffer, allocatedFiberTexture, null, null, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }

        constructedMainProg = glContext.createProgram();
        if (!constructedMainProg) {
          cleanupPartialResources(compiledMainVs, compiledMainFs, null, allocatedMeshBuffer, allocatedFiberTexture, null, null, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }
        glContext.attachShader(constructedMainProg, compiledMainVs);
        glContext.attachShader(constructedMainProg, compiledMainFs);
        glContext.linkProgram(constructedMainProg);
        if (!glContext.getProgramParameter(constructedMainProg, glContext.LINK_STATUS)) {
          cleanupPartialResources(compiledMainVs, compiledMainFs, constructedMainProg, allocatedMeshBuffer, allocatedFiberTexture, null, null, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }

        positionAttributeLocation = glContext.getAttribLocation(constructedMainProg, 'attributeVertexPosition');
        texCoordAttributeLocation = glContext.getAttribLocation(constructedMainProg, 'attributeTexCoord');
        normalAttributeLocation = glContext.getAttribLocation(constructedMainProg, 'attributeNormal');

        if (positionAttributeLocation < 0 || texCoordAttributeLocation < 0 || normalAttributeLocation < 0) {
          cleanupPartialResources(compiledMainVs, compiledMainFs, constructedMainProg, allocatedMeshBuffer, allocatedFiberTexture, null, null, constructedSpaceProg, allocatedSpaceBuffer);
          return false;
        }

        uniformResolutionLocation = glContext.getUniformLocation(constructedMainProg, 'uniformResolution');
        uniformPointerLocation = glContext.getUniformLocation(constructedMainProg, 'uniformPointer');
        uniformRotationLocation = glContext.getUniformLocation(constructedMainProg, 'uniformRotation');
        uniformIntensityLocation = glContext.getUniformLocation(constructedMainProg, 'uniformIntensity');
        uniformZoomLocation = glContext.getUniformLocation(constructedMainProg, 'uniformZoom');
        uniformProjectLocation = glContext.getUniformLocation(constructedMainProg, 'uniformProject');
        uniformActiveTimeLocation = glContext.getUniformLocation(constructedMainProg, 'uniformActiveTime');
        uniformFocusCoordsLocation = glContext.getUniformLocation(constructedMainProg, 'uniformFocusCoords');
        uniformFocusStrengthLocation = glContext.getUniformLocation(constructedMainProg, 'uniformFocusStrength');
        uniformFocusPulseTimeLocation = glContext.getUniformLocation(constructedMainProg, 'uniformFocusPulseTime');
        fiberTextureUniformLocation = glContext.getUniformLocation(constructedMainProg, 'uniformFiberTexture');

        glContext.deleteShader(compiledMainVs);
        glContext.deleteShader(compiledMainFs);

        shaderProgram = constructedMainProg;
        vertexBuffer = allocatedMeshBuffer;
        fiberTexture = allocatedFiberTexture;
        spaceShaderProgram = constructedSpaceProg;
        spaceQuadBuffer = allocatedSpaceBuffer;
        spacePositionAttributeLocation = spacePositionLocation;
        spaceResolutionUniformLocation = spaceResolutionLoc;
        spacePointerUniformLocation = spacePointerLoc;
        spaceZoomUniformLocation = spaceZoomLoc;
        spaceRotationUniformLocation = spaceRotationLoc;
        spaceActiveTimeUniformLocation = spaceActiveTimeLoc;
        spaceFocusCoordsUniformLocation = spaceFocusCoordsLoc;
        spaceFocusStrengthUniformLocation = spaceFocusStrengthLoc;
        return true;
      } catch (pipelineError) {
        cleanupPartialResources(compiledMainVs, compiledMainFs, constructedMainProg, allocatedMeshBuffer, allocatedFiberTexture, compiledSpaceVs, compiledSpaceFs, constructedSpaceProg, allocatedSpaceBuffer);
        shaderProgram = null;
        vertexBuffer = null;
        fiberTexture = null;
        spaceShaderProgram = null;
        spaceQuadBuffer = null;
        totalVertexCount = 0;
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
    let currentPointerX = 0.0;
    let currentPointerY = 0.0;
    let targetZoom = 0.0;
    let currentZoom = 0.0;
    let targetProject = 0.0;
    let currentProject = 0.0;
    let targetRotationAngle = 0.0;
    let currentRotationAngle = 0.0;
    let lastEventClientX = window.innerWidth * 0.5;
    let lastEventClientY = window.innerHeight * 0.5;

    let targetFocusX = 0.5;
    let targetFocusY = 0.5;
    let targetFocusStrength = 0.0;
    let targetFocusPulseId = 0;

    let currentFocusX = 0.5;
    let currentFocusY = 0.5;
    let currentFocusStrength = 0.0;

    let pulseStartActiveTime = -100.0;
    let lastActivePulseId = 0;
    const PULSE_DURATION_SECONDS = 0.55;

    let isSettlingActive = false;
    const smoothingTimeConstant = 0.040;

    let activeElapsedSeconds = 0.0;
    let lastFrameWallTimestamp = 0.0;
    let lastRenderWallTimestamp = 0.0;

    let schedulerTimeoutIdentifier = 0;
    let schedulerAnimationFrameIdentifier = 0;

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
      return !isContextLost && glContext !== null && !glContext.isContextLost() && shaderProgram !== null && spaceShaderProgram !== null &&
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

    function updateCanvasDimensions() {
      if (isContextLost || !glContext || glContext.isContextLost()) {
        return false;
      }
      const clientWidth = canvasElement.clientWidth || window.innerWidth || 1;
      const clientHeight = canvasElement.clientHeight || window.innerHeight || 1;
      const systemDevicePixelRatio = window.devicePixelRatio || 1.0;
      const effectiveDevicePixelRatio = Math.max(1.0, Math.min(systemDevicePixelRatio, 2.0));
      let displayPixelWidth = Math.max(1, Math.round(clientWidth * effectiveDevicePixelRatio));
      let displayPixelHeight = Math.max(1, Math.round(clientHeight * effectiveDevicePixelRatio));

      const maximumPixelCap = 4150000;
      const totalPixels = displayPixelWidth * displayPixelHeight;
      if (totalPixels > maximumPixelCap) {
        const reductionScale = Math.sqrt(maximumPixelCap / totalPixels);
        displayPixelWidth = Math.max(clientWidth, Math.round(displayPixelWidth * reductionScale));
        displayPixelHeight = Math.max(clientHeight, Math.round(displayPixelHeight * reductionScale));
      }

      if (canvasElement.width !== displayPixelWidth || canvasElement.height !== displayPixelHeight) {
        canvasElement.width = displayPixelWidth;
        canvasElement.height = displayPixelHeight;
        glContext.viewport(0, 0, displayPixelWidth, displayPixelHeight);
        return true;
      }
      return false;
    }

    function renderSingleFrame() {
      if (isContextLost || !glContext || glContext.isContextLost() || !shaderProgram || !spaceShaderProgram || !checkAtlasViewActive() || checkDocumentHidden()) {
        if (checkDocumentHidden() || !checkAtlasViewActive() || isContextLost || (glContext && glContext.isContextLost())) {
          cancelScheduledFrame();
          isSettlingActive = false;
          lastFrameWallTimestamp = 0.0;
        }
        return;
      }
      updateCanvasDimensions();
      glContext.viewport(0, 0, canvasElement.width, canvasElement.height);
      glContext.clearColor(0.003, 0.005, 0.008, 1.0);
      glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

      const aspectMin = Math.min(canvasElement.width, canvasElement.height);
      const screenFocusX = (currentFocusX - 0.5) * (canvasElement.width / aspectMin);
      const screenFocusY = ((1.0 - currentFocusY) - 0.5) * (canvasElement.height / aspectMin);

      let pulseProgress = -1.0;
      if (pulseStartActiveTime > 0.0 && currentFocusStrength > 0.0) {
        const elapsedPulse = activeElapsedSeconds - pulseStartActiveTime;
        if (elapsedPulse >= 0.0 && elapsedPulse <= PULSE_DURATION_SECONDS) {
          pulseProgress = elapsedPulse / PULSE_DURATION_SECONDS;
        }
      }

      glContext.disable(glContext.DEPTH_TEST);
      glContext.disable(glContext.BLEND);
      glContext.useProgram(spaceShaderProgram);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, spaceQuadBuffer);
      glContext.enableVertexAttribArray(spacePositionAttributeLocation);
      glContext.vertexAttribPointer(spacePositionAttributeLocation, 2, glContext.FLOAT, false, 0, 0);
      glContext.uniform2f(spaceResolutionUniformLocation, canvasElement.width, canvasElement.height);
      glContext.uniform2f(spacePointerUniformLocation, currentPointerX, currentPointerY);
      glContext.uniform1f(spaceZoomUniformLocation, 0.0);
      glContext.uniform1f(spaceRotationUniformLocation, currentRotationAngle);
      glContext.uniform1f(spaceActiveTimeUniformLocation, activeElapsedSeconds);
      if (spaceFocusCoordsUniformLocation) {
        glContext.uniform2f(spaceFocusCoordsUniformLocation, screenFocusX, screenFocusY);
      }
      if (spaceFocusStrengthUniformLocation) {
        glContext.uniform1f(spaceFocusStrengthUniformLocation, currentFocusStrength);
      }
      glContext.drawArrays(glContext.TRIANGLES, 0, 6);
      glContext.disableVertexAttribArray(spacePositionAttributeLocation);

      glContext.enable(glContext.DEPTH_TEST);
      glContext.depthFunc(glContext.LEQUAL);
      glContext.enable(glContext.BLEND);
      glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);
      glContext.useProgram(shaderProgram);

      glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
      const strideBytes = 32;
      glContext.enableVertexAttribArray(positionAttributeLocation);
      glContext.vertexAttribPointer(positionAttributeLocation, 3, glContext.FLOAT, false, strideBytes, 0);

      glContext.enableVertexAttribArray(texCoordAttributeLocation);
      glContext.vertexAttribPointer(texCoordAttributeLocation, 2, glContext.FLOAT, false, strideBytes, 12);

      glContext.enableVertexAttribArray(normalAttributeLocation);
      glContext.vertexAttribPointer(normalAttributeLocation, 3, glContext.FLOAT, false, strideBytes, 20);

      glContext.activeTexture(glContext.TEXTURE0);
      glContext.bindTexture(glContext.TEXTURE_2D, fiberTexture);
      glContext.uniform1i(fiberTextureUniformLocation, 0);

      glContext.uniform2f(uniformResolutionLocation, canvasElement.width, canvasElement.height);
      glContext.uniform2f(uniformPointerLocation, currentPointerX, currentPointerY);
      glContext.uniform1f(uniformRotationLocation, currentRotationAngle);
      glContext.uniform1f(uniformIntensityLocation, 1.0);
      glContext.uniform1f(uniformZoomLocation, currentZoom);
      glContext.uniform1f(uniformProjectLocation, currentProject);
      glContext.uniform1f(uniformActiveTimeLocation, activeElapsedSeconds);
      if (uniformFocusCoordsLocation) {
        glContext.uniform2f(uniformFocusCoordsLocation, screenFocusX, screenFocusY);
      }
      if (uniformFocusStrengthLocation) {
        glContext.uniform1f(uniformFocusStrengthLocation, currentFocusStrength);
      }
      if (uniformFocusPulseTimeLocation) {
        glContext.uniform1f(uniformFocusPulseTimeLocation, pulseProgress);
      }

      glContext.drawArrays(glContext.TRIANGLES, 0, totalVertexCount);

      glContext.disableVertexAttribArray(positionAttributeLocation);
      glContext.disableVertexAttribArray(texCoordAttributeLocation);
      glContext.disableVertexAttribArray(normalAttributeLocation);
      glContext.disable(glContext.BLEND);

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
      if (delayMilliseconds > 3.0) {
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

      if (!checkAtlasViewActive() || checkDocumentHidden() || isContextLost || !glContext || glContext.isContextLost() || !shaderProgram || !spaceShaderProgram) {
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
      const targetFrameInterval = pointerCoarseQuery.matches ? 33.33 : 16.0;

      if (!isSettlingActive && lastRenderWallTimestamp > 0.0) {
        const elapsedSinceLastRender = currentTimestamp - lastRenderWallTimestamp;
        if (elapsedSinceLastRender < targetFrameInterval - 1.5) {
          schedulerAnimationFrameIdentifier = window.requestAnimationFrame(unifiedSchedulerTick);
          return;
        }
      }

      let deltaSeconds = 0.016;

      if (lastFrameWallTimestamp > 0.0) {
        const deltaMilliseconds = currentTimestamp - lastFrameWallTimestamp;
        const clampedDeltaMilliseconds = Math.min(Math.max(deltaMilliseconds, 0.0), 250.0);
        deltaSeconds = clampedDeltaMilliseconds * 0.001;
        activeElapsedSeconds += deltaSeconds;
      }
      lastFrameWallTimestamp = currentTimestamp;

      if (isSettlingActive) {
        const smoothingAlpha = 1.0 - Math.exp(-deltaSeconds / smoothingTimeConstant);
        currentPointerX += (targetPointerX - currentPointerX) * smoothingAlpha;
        currentPointerY += (targetPointerY - currentPointerY) * smoothingAlpha;
        currentRotationAngle += (targetRotationAngle - currentRotationAngle) * smoothingAlpha;
        currentZoom += (targetZoom - currentZoom) * smoothingAlpha;
        currentProject += (targetProject - currentProject) * smoothingAlpha;
        currentFocusX += (targetFocusX - currentFocusX) * smoothingAlpha;
        currentFocusY += (targetFocusY - currentFocusY) * smoothingAlpha;
        currentFocusStrength += (targetFocusStrength - currentFocusStrength) * smoothingAlpha;

        const pulseActive = (activeElapsedSeconds - pulseStartActiveTime) < PULSE_DURATION_SECONDS && (activeElapsedSeconds >= pulseStartActiveTime);

        const distanceRemaining = Math.hypot(targetPointerX - currentPointerX, targetPointerY - currentPointerY) +
                                  Math.abs(targetRotationAngle - currentRotationAngle) +
                                  Math.abs(targetZoom - currentZoom) +
                                  Math.abs(targetProject - currentProject) +
                                  Math.hypot(targetFocusX - currentFocusX, targetFocusY - currentFocusY) +
                                  Math.abs(targetFocusStrength - currentFocusStrength);
        if (distanceRemaining < 0.0004 && !pulseActive) {
          currentPointerX = targetPointerX;
          currentPointerY = targetPointerY;
          currentRotationAngle = targetRotationAngle;
          currentZoom = targetZoom;
          currentProject = targetProject;
          currentFocusX = targetFocusX;
          currentFocusY = targetFocusY;
          currentFocusStrength = targetFocusStrength;
          isSettlingActive = false;
        }
      }

      renderSingleFrame();
      lastRenderWallTimestamp = performance.now();

      if (!checkAmbientPermitted()) {
        cancelScheduledFrame();
        lastFrameWallTimestamp = 0.0;
        return;
      }

      if (isSettlingActive) {
        scheduleNextFrame(0.0);
      } else {
        schedulerAnimationFrameIdentifier = window.requestAnimationFrame(unifiedSchedulerTick);
      }
    }

    function triggerInteractiveSettling() {
      if (!checkAtlasViewActive() || !checkMotionPermitted() || checkDocumentHidden() || isContextLost || (glContext && glContext.isContextLost())) {
        return;
      }
      isSettlingActive = true;
      if (lastFrameWallTimestamp <= 0.0) {
        lastFrameWallTimestamp = performance.now();
      }
      if (!schedulerAnimationFrameIdentifier) {
        cancelScheduledFrame();
        schedulerAnimationFrameIdentifier = window.requestAnimationFrame(unifiedSchedulerTick);
      }
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
      if (!checkAtlasViewActive() || checkDocumentHidden()) {
        return;
      }
      const inputDetail = (inputEvent && inputEvent.detail) || {};
      let nextPointerX = targetPointerX;
      let nextPointerY = targetPointerY;
      let nextZoom = targetZoom;
      let nextRotation = targetRotationAngle;
      let nextProject = targetProject;

      let nextFocusX = targetFocusX;
      let nextFocusY = targetFocusY;
      let nextFocusStrength = targetFocusStrength;
      let nextFocusPulseId = targetFocusPulseId;
      let focusUpdated = false;

      if (inputDetail.reset) {
        nextPointerX = 0.0;
        nextPointerY = 0.0;
        nextZoom = 0.0;
        nextRotation = 0.0;
        nextProject = 0.0;
        nextFocusStrength = 0.0;
        nextFocusPulseId = 0;
        focusUpdated = true;
      } else {
        if (Number.isFinite(inputDetail.x)) {
          nextPointerX = Math.max(-1.0, Math.min(1.0, inputDetail.x));
        }
        if (Number.isFinite(inputDetail.y)) {
          nextPointerY = Math.max(-1.0, Math.min(1.0, inputDetail.y));
        }
        if (Number.isFinite(inputDetail.irisZoom)) {
          nextZoom = Math.max(0.0, Math.min(1.0, inputDetail.irisZoom));
        } else if (Number.isFinite(inputDetail.zoom)) {
          nextZoom = Math.max(0.0, Math.min(1.0, (inputDetail.zoom - 1.0) / 0.25));
        }
        if (Number.isFinite(inputDetail.rotation)) {
          nextRotation = inputDetail.rotation;
        }
        if (typeof inputDetail.project !== 'undefined') {
          nextProject = inputDetail.project ? 1.0 : 0.0;
        }
        if (inputDetail.focus && typeof inputDetail.focus === 'object') {
          const f = inputDetail.focus;
          if (Number.isFinite(f.x)) {
            nextFocusX = Math.max(0.0, Math.min(1.0, f.x));
          }
          if (Number.isFinite(f.y)) {
            nextFocusY = Math.max(0.0, Math.min(1.0, f.y));
          }
          if (Number.isFinite(f.strength)) {
            nextFocusStrength = Math.max(0.0, Math.min(1.0, f.strength));
          }
          if (Number.isInteger(f.pulseId) && f.pulseId > 0) {
            nextFocusPulseId = f.pulseId;
          }
          focusUpdated = true;
        }
      }

      const cameraChanged = (
        Math.abs(nextPointerX - targetPointerX) +
        Math.abs(nextPointerY - targetPointerY) +
        Math.abs(nextZoom - targetZoom) +
        Math.abs(nextProject - targetProject) +
        Math.abs(nextRotation - targetRotationAngle) >= 0.0001
      );

      const focusChanged = focusUpdated && (
        Math.abs(nextFocusStrength - targetFocusStrength) > 0.001 ||
        Math.abs(nextFocusX - targetFocusX) > 0.001 ||
        Math.abs(nextFocusY - targetFocusY) > 0.001 ||
        nextFocusPulseId !== targetFocusPulseId
      );

      if (!cameraChanged && !focusChanged) {
        return;
      }

      targetPointerX = nextPointerX;
      targetPointerY = nextPointerY;
      targetZoom = nextZoom;
      targetProject = nextProject;
      targetRotationAngle = nextRotation;

      if (focusChanged) {
        if (nextFocusPulseId !== targetFocusPulseId && nextFocusStrength > 0.0) {
          pulseStartActiveTime = activeElapsedSeconds;
          lastActivePulseId = nextFocusPulseId;
        } else if (nextFocusStrength <= 0.0) {
          pulseStartActiveTime = -100.0;
        }
        targetFocusX = nextFocusX;
        targetFocusY = nextFocusY;
        targetFocusStrength = nextFocusStrength;
        targetFocusPulseId = nextFocusPulseId;
      }

      if (!checkMotionPermitted()) {
        currentPointerX = targetPointerX;
        currentPointerY = targetPointerY;
        currentRotationAngle = targetRotationAngle;
        currentZoom = targetZoom;
        currentProject = targetProject;
        currentFocusX = targetFocusX;
        currentFocusY = targetFocusY;
        currentFocusStrength = targetFocusStrength;
        renderSingleFrame();
        return;
      }

      triggerInteractiveSettling();
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
        cancelScheduledFrame();
        isSettlingActive = false;
        lastFrameWallTimestamp = 0.0;
        targetFocusStrength = 0.0;
        currentFocusStrength = 0.0;
        pulseStartActiveTime = -100.0;
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
        targetFocusStrength = 0.0;
        currentFocusStrength = 0.0;
        pulseStartActiveTime = -100.0;
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
        currentFocusX = targetFocusX;
        currentFocusY = targetFocusY;
        currentFocusStrength = targetFocusStrength;
        pulseStartActiveTime = -100.0;
        renderSingleFrame();
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

    window.__portfolioOptics = {
      getZoom: function () { return currentZoom; },
      getTargetZoom: function () { return targetZoom; },
      setIrisZoom: function (val, immediate) {
        handleOpticsInput({ detail: { irisZoom: val, reset: val === 0.0 } });
        if (immediate) {
          currentZoom = targetZoom;
          renderSingleFrame();
        }
      },
      reset: function () {
        handleOpticsInput({ detail: { reset: true } });
      }
    };

    canvasElement.addEventListener('webglcontextlost', function (eventObject) {
      eventObject.preventDefault();
      isContextLost = true;
      cancelScheduledFrame();
      isSettlingActive = false;
      lastFrameWallTimestamp = 0.0;
      targetFocusStrength = 0.0;
      currentFocusStrength = 0.0;
      pulseStartActiveTime = -100.0;
      shaderProgram = null;
      vertexBuffer = null;
      fiberTexture = null;
      spaceShaderProgram = null;
      spaceQuadBuffer = null;
      totalVertexCount = 0;
      uniformFocusCoordsLocation = null;
      uniformFocusStrengthLocation = null;
      uniformFocusPulseTimeLocation = null;
      spaceFocusCoordsUniformLocation = null;
      spaceFocusStrengthUniformLocation = null;
      canvasElement.style.display = 'none';
      documentRoot.classList.remove('has-kaleidoscope');
    });

    canvasElement.addEventListener('webglcontextrestored', function () {
      isContextLost = false;
      const restoredPipelineSuccess = setupWebGLPipeline();
      if (restoredPipelineSuccess) {
        canvasElement.style.display = '';
        renderSingleFrame();
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
      renderSingleFrame();
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
