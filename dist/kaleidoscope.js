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
      '  for (int dy = -1; dy <= 1; dy += 1) {',
      '    for (int dx = -1; dx <= 1; dx += 1) {',
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
      '  float macroDrift = (noise3(vec3(C * 1.8 + 0.7, S * 1.8 + 1.2, 0.8)) - 0.5) * 0.45;',
      '  float stromaAsymmetry = noise3(vec3(C * 2.4 + 3.1, S * 2.4 + 1.9, v * 1.5));',
      '  float warpedAngle = angleRadian + macroDrift + (noise3(vec3(C * 4.5, S * 4.5, v * 3.0)) - 0.5) * 0.28 * v;',
      '  float calmZone = smoothstep(0.28, 0.68, noise3(vec3(C * 2.6 + 4.2, S * 2.6 + 2.7, v * 2.2)));',
      '  float calmSuppression = mix(0.30, 1.0, calmZone);',
      '  float phaseMacro = warpedAngle * 24.0 + (noise3(vec3(C * 4.0, S * 4.0, v * 5.0)) - 0.5) * 4.0;',
      '  float macroBeams = pow(0.5 + 0.5 * cos(phaseMacro), 2.2);',
      '  float branchJunction = smoothstep(0.18, 0.55, v);',
      '  float forkWarp = (noise3(vec3(C * 8.0, S * 8.0, v * 8.0)) - 0.5) * 5.0;',
      '  float phaseBifurcation = warpedAngle * 48.0 + forkWarp;',
      '  float branchBeams = pow(0.5 + 0.5 * cos(phaseBifurcation), 2.8) * branchJunction;',
      '  float tertiaryJunction = smoothstep(0.38, 0.78, v);',
      '  float phaseTertiary = warpedAngle * 96.0 + (noise3(vec3(C * 14.0, S * 14.0, v * 12.0)) - 0.5) * 6.0;',
      '  float tertiaryBeams = pow(0.5 + 0.5 * cos(phaseTertiary), 3.2) * tertiaryJunction;',
      '  float phaseMicro = warpedAngle * 168.0 + (noise3(vec3(C * 22.0, S * 22.0, v * 20.0)) - 0.5) * 7.0;',
      '  float microBeams = pow(0.5 + 0.5 * cos(phaseMicro), 3.5) * smoothstep(0.12, 0.90, v);',
      '  float combinedFibers = (macroBeams * 0.42 + branchBeams * 0.34 + tertiaryBeams * 0.26 + microBeams * 0.18) * calmSuppression;',
      '  float collaretteWarp = (noise3(vec3(C * 4.0, S * 4.0, 1.5)) - 0.5) * 0.05;',
      '  float collaretteV = 0.185 + collaretteWarp;',
      '  float collaretteWidth = 0.042 + 0.016 * noise3(vec3(C * 5.0, S * 5.0, 3.5));',
      '  float collaretteDist = (v - collaretteV) / collaretteWidth;',
      '  float collaretteElevation = exp(-collaretteDist * collaretteDist) * (0.60 + 0.40 * noise3(vec3(C * 6.0, S * 6.0, 2.5)));',
      '  float cryptCavity = computeCellularCrypts(u, v, C, S);',
      '  float furrowNoise = noise3(vec3(C * 5.0, S * 5.0, v * 16.0));',
      '  float furrowPhase = v * 30.0 + (furrowNoise - 0.5) * 3.5;',
      '  float furrowEnv = smoothstep(0.40, 0.56, v) * (1.0 - smoothstep(0.85, 0.98, v));',
      '  float furrowGroove = sin(furrowPhase) * furrowEnv * (0.45 + 0.55 * cos(warpedAngle * 5.0)) * 0.09;',
      '  float microGrain = noise3(vec3(C * 32.0, S * 32.0, v * 40.0));',
      '  float composedRelief = clamp(combinedFibers * 0.68 + collaretteElevation * 0.35 - cryptCavity * 0.70 - furrowGroove + (microGrain - 0.5) * 0.04, 0.0, 1.0);',
      '  float branchingPattern = clamp(branchBeams * 0.45 + tertiaryBeams * 0.35 + macroBeams * 0.25 - cryptCavity * 0.50, 0.0, 1.0);',
      '  float amberNoise = noise3(vec3(C * 6.5 + 3.7, S * 6.5 + 1.9, v * 10.0));',
      '  float pupillaryAmberRuff = smoothstep(0.02, 0.16, v) * (1.0 - smoothstep(0.18, 0.32, v));',
      '  float warmClusters = smoothstep(0.30, 0.68, amberNoise) * pupillaryAmberRuff;',
      '  float cryptRim = smoothstep(0.12, 0.38, cryptCavity) * (1.0 - smoothstep(0.55, 0.85, cryptCavity)) * 0.55;',
      '  float mineralPattern = clamp(warmClusters * 0.85 + cryptRim * 0.40 + (microGrain - 0.5) * 0.06, 0.0, 1.0);',
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
      'uniform vec2 uniformFramingNdcShift;',
      'uniform vec2 uniformFramingScreenShift;',
      'uniform float uniformFramingScale;',
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
      '  float dilationWeight = 1.0 - smoothstep(0.52, 1.50, radialMagnitude);',
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
      '  vec3 defaultCamPos = vec3(uniformPointer.x * 0.42, uniformPointer.y * 0.34, 2.68);',
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
      '  float effectiveFovScale = (1.54 / 1.70) * uniformFramingScale;',
      '  vec3 pupilRelative = vec3(0.0, 0.0, -1.08) - cameraOrigin;',
      '  float pupilDepth = dot(pupilRelative, cameraForward);',
      '  varyingIrisCenter = (vec2(dot(pupilRelative, cameraRight), dot(pupilRelative, cameraUp)) * effectiveFovScale / pupilDepth) + uniformFramingScreenShift;',
      '  gl_Position = vec4(',
      '    cameraCoordX * effectiveFovScale * (2.0 * minimumResolution / uniformResolution.x) + uniformFramingNdcShift.x * cameraDepth,',
      '    cameraCoordY * effectiveFovScale * (2.0 * minimumResolution / uniformResolution.y) + uniformFramingNdcShift.y * cameraDepth,',
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
      'uniform float uniformFramingScale;',
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
      '  vec3 sculptedNormal = normalize(surfaceNormalVector - tangentAngular * gradientU * 1.35 - tangentRadial * gradientV * 1.35);',
      '  vec3 colBackground = srgbToLinear(vec3(7.0, 13.0, 15.0) / 255.0);',
      '  vec3 colPetroleum  = srgbToLinear(vec3(23.0, 63.0, 70.0) / 255.0);',
      '  vec3 colDeepCrypt  = srgbToLinear(vec3(12.0, 32.0, 36.0) / 255.0);',
      '  vec3 colJade       = srgbToLinear(vec3(97.0, 143.0, 131.0) / 255.0);',
      '  vec3 colCeladon    = srgbToLinear(vec3(125.0, 175.0, 158.0) / 255.0);',
      '  vec3 colAmber      = srgbToLinear(vec3(199.0, 154.0, 96.0) / 255.0);',
      '  vec3 colWarmCopper = srgbToLinear(vec3(160.0, 115.0, 75.0) / 255.0);',
      '  vec3 colChampagne  = srgbToLinear(vec3(228.0, 216.0, 185.0) / 255.0);',
      '  float cavityDepth = 1.0 - smoothstep(0.12, 0.72, ridgeIntensity);',
      '  vec3 stromalBase = mix(colPetroleum, colDeepCrypt, cavityDepth * 0.75);',
      '  vec3 ridgeColor = mix(colJade, colCeladon, smoothstep(0.55, 0.95, ridgeIntensity));',
      '  float ridgePresence = smoothstep(0.20, 0.75, ridgeIntensity);',
      '  vec3 stromalComposition = mix(stromalBase, ridgeColor, ridgePresence);',
      '  float innerPupilZone = 1.0 - smoothstep(0.52, 0.92, radialDistance);',
      '  vec3 warmPigment = mix(colWarmCopper, colAmber, mineralFactor);',
      '  float warmPresence = clamp(mineralFactor * innerPupilZone * 1.35, 0.0, 0.92);',
      '  vec3 materialAlbedo = mix(stromalComposition, warmPigment, warmPresence);',
      '  vec3 keyLightVector = normalize(vec3(-0.62 + 0.03 * sin(uniformActiveTime * 0.35), 0.82 + 0.02 * cos(uniformActiveTime * 0.41), 1.25));',
      '  vec3 fillLightVector = normalize(vec3(0.72 - 0.02 * cos(uniformActiveTime * 0.29), -0.48 + 0.02 * sin(uniformActiveTime * 0.37), 0.40));',
      '  vec3 normalizedViewVector = normalize(varyingViewDirection);',
      '  vec3 specularHalfVector = normalize(keyLightVector + normalizedViewVector);',
      '  float diffuseKey = max(dot(sculptedNormal, keyLightVector), 0.0);',
      '  float diffuseFill = max(dot(sculptedNormal, fillLightVector), 0.0);',
      '  float throatOcclusion = smoothstep(-1.25, -0.35, varyingWorldPosition.z);',
      '  float creviceOcclusion = 0.52 + 0.48 * smoothstep(0.10, 0.68, ridgeIntensity);',
      '  float limbalShading = 1.0 - smoothstep(1.42, 2.10, radialDistance);',
      '  float specularPower = pow(max(dot(sculptedNormal, specularHalfVector), 0.0), 50.0);',
      '  float microSpecular = specularPower * microFiberGleam * 0.20;',
      '  float wetReflectiveGleam = pow(max(dot(sculptedNormal, specularHalfVector), 0.0), 110.0) * 0.12;',
      '  float diffuseLighting = (0.84 * diffuseKey + 0.26 * diffuseFill) * creviceOcclusion;',
      '  vec3 linearSceneComposition = materialAlbedo * (0.32 + diffuseLighting);',
      '  linearSceneComposition += colChampagne * microSpecular;',
      '  linearSceneComposition += colCeladon * wetReflectiveGleam;',
      '  linearSceneComposition *= (0.08 + 0.92 * throatOcclusion) * (0.18 + 0.82 * limbalShading);',
      '  float respirationWave = sin(uniformActiveTime * 0.641) * 0.72 + sin(uniformActiveTime * 0.306 + 1.15) * 0.28;',
      '  float tidalWave = sin(uniformActiveTime * 0.306) * 0.68 + sin(uniformActiveTime * 0.462 + 2.05) * 0.32;',
      '  float pupilDilation = 0.038 * respirationWave + 0.012 * tidalWave;',
      '  float currentPupilLipRadius = (0.57 + 0.010 * sin(angleRadian * 16.0)) * (1.0 + pupilDilation);',
      '  float pupillaryLipGlow = exp(-pow(abs(radialDistance - currentPupilLipRadius) / 0.028, 2.0));',
      '  linearSceneComposition += colAmber * (pupillaryLipGlow * diffuseKey * throatOcclusion * 0.25);',
      '  float pupilEdgeCoverage = smoothstep(0.480, 0.525, radialDistance);',
      '  linearSceneComposition = mix(colBackground, linearSceneComposition, pupilEdgeCoverage);',
      '  float limbusCoverage = 1.0 - smoothstep(2.04, 2.18, radialDistance);',
      '  if (limbusCoverage <= 0.001) {',
      '    discard;',
      '  }',
      '  float atmosphericSeparation = smoothstep(1.86, 2.06, radialDistance) * (1.0 - smoothstep(2.06, 2.18, radialDistance));',
      '  linearSceneComposition += colPetroleum * (atmosphericSeparation * 0.35);',
      '  vec2 screenCoordinates = (gl_FragCoord.xy - 0.5 * uniformResolution) / min(uniformResolution.x, uniformResolution.y);',
      '  vec2 eyeLocalCoord = (screenCoordinates - varyingIrisCenter) / max(uniformFramingScale, 0.01);',
      '  vec3 cornealNormal = normalize(vec3(eyeLocalCoord * 0.35, 1.0));',
      '  vec3 cornealReflectedRay = reflect(-normalizedViewVector, cornealNormal);',
      '  vec2 mainSoftboxPos = vec2(-0.36 + 0.02 * sin(uniformActiveTime * 0.30), 0.50 + 0.015 * cos(uniformActiveTime * 0.22));',
      '  float broadHighlight = exp(-pow(abs(cornealReflectedRay.x - mainSoftboxPos.x) / 0.22, 2.5) - pow(abs(cornealReflectedRay.y - mainSoftboxPos.y) / 0.075, 2.0));',
      '  vec2 secCatchlightPos = vec2(0.56 + 0.018 * cos(uniformActiveTime * 0.25), -0.22 + 0.02 * sin(uniformActiveTime * 0.28));',
      '  float secondaryHighlight = exp(-pow(abs(cornealReflectedRay.x - secCatchlightPos.x) / 0.030, 2.0) - pow(abs(cornealReflectedRay.y - secCatchlightPos.y) / 0.12, 3.0)) * 0.36;',
      '  float cornealFresnel = 0.018 + 0.22 * pow(1.0 - max(dot(normalizedViewVector, cornealNormal), 0.0), 5.0);',
      '  float corneaEnvelope = 1.0 - smoothstep(1.98, 2.16, radialDistance);',
      '  linearSceneComposition += (colChampagne * broadHighlight * 0.12 + colCeladon * secondaryHighlight * 0.07 + colPetroleum * cornealFresnel * 0.06) * corneaEnvelope;',
      '  vec2 dirToFocus = uniformFocusCoords - varyingIrisCenter;',
      '  float angleToFocus = atan(dirToFocus.y, dirToFocus.x);',
      '  vec2 dirFrag = screenCoordinates - varyingIrisCenter;',
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
    let uniformFramingNdcShiftLocation = null;
    let uniformFramingScreenShiftLocation = null;
    let uniformFramingScaleLocation = null;

    function cleanupPartialResources(targetShaderOne, targetShaderTwo, targetProgramInstance, targetBufferInstance, targetTextureInstance) {
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
        const fallbackWidth = Math.min(pointerCoarseQuery.matches ? 1024 : 2048, computedTextureWidth);
        const fallbackHeight = Math.floor(fallbackWidth / 4);
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

            const macroDrift = (noise3(C * 1.8 + 0.7, S * 1.8 + 1.2, 0.8) - 0.5) * 0.45;
            const warpedAngle = angleRadian + macroDrift + (noise3(C * 4.5, S * 4.5, v * 3.0) - 0.5) * 0.28 * v;

            const calmZone = Math.min(1.0, Math.max(0.0, (noise3(C * 2.6 + 4.2, S * 2.6 + 2.7, v * 2.2) - 0.28) / 0.40));
            const calmSuppression = 0.30 + 0.70 * calmZone;

            const phaseMacro = warpedAngle * 24.0 + (noise3(C * 4.0, S * 4.0, v * 5.0) - 0.5) * 4.0;
            const macroBeams = Math.pow(0.5 + 0.5 * Math.cos(phaseMacro), 2.2);

            const branchJunction = Math.min(1.0, Math.max(0.0, (v - 0.18) / 0.37));
            const forkWarp = (noise3(C * 8.0, S * 8.0, v * 8.0) - 0.5) * 5.0;
            const phaseBifurcation = warpedAngle * 48.0 + forkWarp;
            const branchBeams = Math.pow(0.5 + 0.5 * Math.cos(phaseBifurcation), 2.8) * branchJunction;

            const tertiaryJunction = Math.min(1.0, Math.max(0.0, (v - 0.38) / 0.40));
            const phaseTertiary = warpedAngle * 96.0 + (noise3(C * 14.0, S * 14.0, v * 12.0) - 0.5) * 6.0;
            const tertiaryBeams = Math.pow(0.5 + 0.5 * Math.cos(phaseTertiary), 3.2) * tertiaryJunction;

            const phaseMicro = warpedAngle * 168.0 + (noise3(C * 22.0, S * 22.0, v * 20.0) - 0.5) * 7.0;
            const microBeams = Math.pow(0.5 + 0.5 * Math.cos(phaseMicro), 3.5) * Math.min(1.0, Math.max(0.0, (v - 0.12) / 0.78));

            const combinedFibers = (macroBeams * 0.42 + branchBeams * 0.34 + tertiaryBeams * 0.26 + microBeams * 0.18) * calmSuppression;

            const collaretteWarp = (noise3(C * 4.0, S * 4.0, 1.5) - 0.5) * 0.05;
            const collaretteV = 0.185 + collaretteWarp;
            const collaretteWidth = 0.042 + 0.016 * noise3(C * 5.0, S * 5.0, 3.5);
            const collaretteDist = (v - collaretteV) / collaretteWidth;
            const collaretteElevation = Math.exp(-collaretteDist * collaretteDist) * (0.60 + 0.40 * noise3(C * 6.0, S * 6.0, 2.5));

            const cryptCavity = computeCellularCrypts(u, v, C, S);

            const furrowNoise = noise3(C * 5.0, S * 5.0, v * 16.0);
            const furrowPhase = v * 30.0 + (furrowNoise - 0.5) * 3.5;
            const furrowEnv = Math.min(1.0, Math.max(0.0, (v - 0.40) / 0.16)) * (1.0 - Math.min(1.0, Math.max(0.0, (v - 0.85) / 0.13)));
            const furrowGroove = Math.sin(furrowPhase) * furrowEnv * (0.45 + 0.55 * Math.cos(warpedAngle * 5.0)) * 0.09;

            const microGrain = noise3(C * 32.0, S * 32.0, v * 40.0);

            const composedRelief = Math.min(1.0, Math.max(0.0,
              combinedFibers * 0.68 + collaretteElevation * 0.35 - cryptCavity * 0.70 - furrowGroove + (microGrain - 0.5) * 0.04
            ));

            const branchingPattern = Math.min(1.0, Math.max(0.0,
              branchBeams * 0.45 + tertiaryBeams * 0.35 + macroBeams * 0.25 - cryptCavity * 0.50
            ));

            const amberNoise = noise3(C * 6.5 + 3.7, S * 6.5 + 1.9, v * 10.0);
            const pupillaryAmberRuff = Math.min(1.0, Math.max(0.0, (v - 0.02) / 0.14)) * (1.0 - Math.min(1.0, Math.max(0.0, (v - 0.18) / 0.14)));
            const warmClusters = Math.min(1.0, Math.max(0.0, (amberNoise - 0.30) / 0.38)) * pupillaryAmberRuff;
            const cryptRim = Math.min(1.0, Math.max(0.0, (cryptCavity - 0.12) / 0.26)) * (1.0 - Math.min(1.0, Math.max(0.0, (cryptCavity - 0.55) / 0.30))) * 0.55;
            const mineralPattern = Math.min(1.0, Math.max(0.0,
              warmClusters * 0.85 + cryptRim * 0.40 + (microGrain - 0.5) * 0.06
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

      try {
        allocatedFiberTexture = glContext.createTexture();
        if (!allocatedFiberTexture) {
          return false;
        }

        generateProceduralTexture(glContext, allocatedFiberTexture);

        const totalSectors = 256;
        const totalRings = 96;
        const vertexData = [];

        function evaluateHeight(radialDistance) {
          if (radialDistance < 0.44) {
            return -1.45;
          }
          if (radialDistance < 0.54) {
            const t = (radialDistance - 0.44) / 0.10;
            const h = t * t * (3.0 - 2.0 * t);
            return -1.45 + h * 1.55;
          }
          const collaretteElevation = Math.exp(-Math.pow((radialDistance - 0.80) / 0.08, 2.0)) * 0.12;
          const pupilLipElevation = Math.exp(-Math.pow((radialDistance - 0.58) / 0.045, 2.0)) * 0.08;

          let stroma = 0.0;
          if (radialDistance <= 2.12) {
            const stromaProgress = (radialDistance - 0.54) / (2.12 - 0.54);
            stroma = 0.10 + 0.14 * Math.sin(stromaProgress * Math.PI * 0.85) - 0.12 * Math.pow(stromaProgress, 2.5);
          } else {
            stroma = 0.0;
          }
          return stroma + collaretteElevation + pupilLipElevation;
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
          cleanupPartialResources(null, null, null, null, allocatedFiberTexture);
          return false;
        }
        glContext.bindBuffer(glContext.ARRAY_BUFFER, allocatedMeshBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(vertexData), glContext.STATIC_DRAW);
        totalVertexCount = vertexData.length / 8;

        compiledMainVs = glContext.createShader(glContext.VERTEX_SHADER);
        if (!compiledMainVs) {
          cleanupPartialResources(null, null, null, allocatedMeshBuffer, allocatedFiberTexture);
          return false;
        }
        glContext.shaderSource(compiledMainVs, mainVertexShaderSource);
        glContext.compileShader(compiledMainVs);
        if (!glContext.getShaderParameter(compiledMainVs, glContext.COMPILE_STATUS)) {
          cleanupPartialResources(compiledMainVs, null, null, allocatedMeshBuffer, allocatedFiberTexture);
          return false;
        }

        compiledMainFs = glContext.createShader(glContext.FRAGMENT_SHADER);
        if (!compiledMainFs) {
          cleanupPartialResources(compiledMainVs, null, null, allocatedMeshBuffer, allocatedFiberTexture);
          return false;
        }
        glContext.shaderSource(compiledMainFs, mainFragmentShaderSource);
        glContext.compileShader(compiledMainFs);
        if (!glContext.getShaderParameter(compiledMainFs, glContext.COMPILE_STATUS)) {
          cleanupPartialResources(compiledMainVs, compiledMainFs, null, allocatedMeshBuffer, allocatedFiberTexture);
          return false;
        }

        constructedMainProg = glContext.createProgram();
        if (!constructedMainProg) {
          cleanupPartialResources(compiledMainVs, compiledMainFs, null, allocatedMeshBuffer, allocatedFiberTexture);
          return false;
        }
        glContext.attachShader(constructedMainProg, compiledMainVs);
        glContext.attachShader(constructedMainProg, compiledMainFs);
        glContext.linkProgram(constructedMainProg);
        if (!glContext.getProgramParameter(constructedMainProg, glContext.LINK_STATUS)) {
          cleanupPartialResources(compiledMainVs, compiledMainFs, constructedMainProg, allocatedMeshBuffer, allocatedFiberTexture);
          return false;
        }

        positionAttributeLocation = glContext.getAttribLocation(constructedMainProg, 'attributeVertexPosition');
        texCoordAttributeLocation = glContext.getAttribLocation(constructedMainProg, 'attributeTexCoord');
        normalAttributeLocation = glContext.getAttribLocation(constructedMainProg, 'attributeNormal');

        if (positionAttributeLocation < 0 || texCoordAttributeLocation < 0 || normalAttributeLocation < 0) {
          cleanupPartialResources(compiledMainVs, compiledMainFs, constructedMainProg, allocatedMeshBuffer, allocatedFiberTexture);
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
        uniformFramingNdcShiftLocation = glContext.getUniformLocation(constructedMainProg, 'uniformFramingNdcShift');
        uniformFramingScreenShiftLocation = glContext.getUniformLocation(constructedMainProg, 'uniformFramingScreenShift');
        uniformFramingScaleLocation = glContext.getUniformLocation(constructedMainProg, 'uniformFramingScale');

        glContext.deleteShader(compiledMainVs);
        glContext.deleteShader(compiledMainFs);

        shaderProgram = constructedMainProg;
        vertexBuffer = allocatedMeshBuffer;
        fiberTexture = allocatedFiberTexture;
        return true;
      } catch (pipelineError) {
        cleanupPartialResources(compiledMainVs, compiledMainFs, constructedMainProg, allocatedMeshBuffer, allocatedFiberTexture);
        shaderProgram = null;
        vertexBuffer = null;
        fiberTexture = null;
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
    let isHeroVisible = true;

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

    let targetFramingCenterX = 0.5;
    let targetFramingCenterY = 0.5;
    let targetFramingScale = 1.0;

    let currentFramingCenterX = 0.5;
    let currentFramingCenterY = 0.5;
    let currentFramingScale = 1.0;

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
    let settlingDeadline = 0.0;
    const SETTLING_MAX_DURATION_MS = 700;
    const INITIAL_ENTRANCE_MS = 850;
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

      const isCoarse = pointerCoarseQuery.matches || (window.innerWidth && window.innerWidth < 768);
      const maximumPixelCap = isCoarse ? 1050000 : 4150000;
      const totalPixels = displayPixelWidth * displayPixelHeight;
      if (totalPixels > maximumPixelCap) {
        const reductionScale = Math.sqrt(maximumPixelCap / totalPixels);
        displayPixelWidth = Math.max(1, Math.floor(displayPixelWidth * reductionScale));
        displayPixelHeight = Math.max(1, Math.floor(displayPixelHeight * reductionScale));
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
      if (isContextLost || !glContext || glContext.isContextLost() || !shaderProgram || !checkAtlasViewActive() || checkDocumentHidden() || !isHeroVisible) {
        if (checkDocumentHidden() || !checkAtlasViewActive() || !isHeroVisible || isContextLost || (glContext && glContext.isContextLost())) {
          cancelScheduledFrame();
          isSettlingActive = false;
          lastFrameWallTimestamp = 0.0;
        }
        return;
      }
      updateCanvasDimensions();
      glContext.viewport(0, 0, canvasElement.width, canvasElement.height);
      glContext.clearColor(7.0 / 255.0, 13.0 / 255.0, 15.0 / 255.0, 1.0);
      glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

      const aspectMin = Math.min(canvasElement.width, canvasElement.height);
      const screenFocusX = (currentFocusX - 0.5) * (canvasElement.width / aspectMin);
      const screenFocusY = ((1.0 - currentFocusY) - 0.5) * (canvasElement.height / aspectMin);

      const framingNdcShiftX = (currentFramingCenterX - 0.5) * 2.0;
      const framingNdcShiftY = (0.5 - currentFramingCenterY) * 2.0;
      const framingScreenShiftX = (currentFramingCenterX - 0.5) * (canvasElement.width / aspectMin);
      const framingScreenShiftY = (0.5 - currentFramingCenterY) * (canvasElement.height / aspectMin);

      let pulseProgress = -1.0;
      if (pulseStartActiveTime > 0.0 && currentFocusStrength > 0.0) {
        const elapsedPulse = activeElapsedSeconds - pulseStartActiveTime;
        if (elapsedPulse >= 0.0 && elapsedPulse <= PULSE_DURATION_SECONDS) {
          pulseProgress = elapsedPulse / PULSE_DURATION_SECONDS;
        }
      }

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
      if (uniformFramingNdcShiftLocation) {
        glContext.uniform2f(uniformFramingNdcShiftLocation, framingNdcShiftX, framingNdcShiftY);
      }
      if (uniformFramingScreenShiftLocation) {
        glContext.uniform2f(uniformFramingScreenShiftLocation, framingScreenShiftX, framingScreenShiftY);
      }
      if (uniformFramingScaleLocation) {
        glContext.uniform1f(uniformFramingScaleLocation, currentFramingScale);
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

    function triggerInteractiveSettling(maxDurationMs) {
      if (!isHeroVisible || !checkAtlasViewActive() || !checkMotionPermitted() || checkDocumentHidden() || isContextLost || (glContext && glContext.isContextLost())) {
        return;
      }
      isSettlingActive = true;
      const duration = maxDurationMs || SETTLING_MAX_DURATION_MS;
      const now = performance.now();
      settlingDeadline = Math.max(settlingDeadline, now + duration);

      if (lastFrameWallTimestamp <= 0.0) {
        lastFrameWallTimestamp = now;
      }
      if (!schedulerAnimationFrameIdentifier) {
        cancelScheduledFrame();
        schedulerAnimationFrameIdentifier = window.requestAnimationFrame(unifiedSchedulerTick);
      }
    }

    function unifiedSchedulerTick(currentFrameTimestamp) {
      schedulerAnimationFrameIdentifier = 0;
      if (schedulerTimeoutIdentifier) {
        window.clearTimeout(schedulerTimeoutIdentifier);
        schedulerTimeoutIdentifier = 0;
      }

      if (!isHeroVisible || !checkAtlasViewActive() || checkDocumentHidden() || isContextLost || !glContext || glContext.isContextLost() || !shaderProgram) {
        cancelScheduledFrame();
        isSettlingActive = false;
        lastFrameWallTimestamp = 0.0;
        return;
      }

      if (!checkMotionPermitted()) {
        cancelScheduledFrame();
        isSettlingActive = false;
        lastFrameWallTimestamp = 0.0;
        currentPointerX = targetPointerX;
        currentPointerY = targetPointerY;
        currentRotationAngle = targetRotationAngle;
        currentZoom = targetZoom;
        currentProject = targetProject;
        currentFramingCenterX = targetFramingCenterX;
        currentFramingCenterY = targetFramingCenterY;
        currentFramingScale = targetFramingScale;
        currentFocusX = targetFocusX;
        currentFocusY = targetFocusY;
        currentFocusStrength = targetFocusStrength;
        renderSingleFrame();
        return;
      }

      const currentTimestamp = currentFrameTimestamp || performance.now();
      let deltaSeconds = 0.016;

      if (lastFrameWallTimestamp > 0.0) {
        const deltaMilliseconds = currentTimestamp - lastFrameWallTimestamp;
        const clampedDeltaMilliseconds = Math.min(Math.max(deltaMilliseconds, 0.0), 100.0);
        deltaSeconds = clampedDeltaMilliseconds * 0.001;
      }
      lastFrameWallTimestamp = currentTimestamp;
      activeElapsedSeconds += deltaSeconds;

      if (isSettlingActive) {
        const smoothingAlpha = 1.0 - Math.exp(-deltaSeconds / smoothingTimeConstant);
        currentPointerX += (targetPointerX - currentPointerX) * smoothingAlpha;
        currentPointerY += (targetPointerY - currentPointerY) * smoothingAlpha;
        currentRotationAngle += (targetRotationAngle - currentRotationAngle) * smoothingAlpha;
        currentZoom += (targetZoom - currentZoom) * smoothingAlpha;
        currentProject += (targetProject - currentProject) * smoothingAlpha;
        currentFramingCenterX += (targetFramingCenterX - currentFramingCenterX) * smoothingAlpha;
        currentFramingCenterY += (targetFramingCenterY - currentFramingCenterY) * smoothingAlpha;
        currentFramingScale += (targetFramingScale - currentFramingScale) * smoothingAlpha;
        currentFocusX += (targetFocusX - currentFocusX) * smoothingAlpha;
        currentFocusY += (targetFocusY - currentFocusY) * smoothingAlpha;
        currentFocusStrength += (targetFocusStrength - currentFocusStrength) * smoothingAlpha;

        const pulseActive = (activeElapsedSeconds - pulseStartActiveTime) < PULSE_DURATION_SECONDS && (activeElapsedSeconds >= pulseStartActiveTime);

        const distanceRemaining = (
          Math.hypot(targetPointerX - currentPointerX, targetPointerY - currentPointerY) +
          Math.abs(targetRotationAngle - currentRotationAngle) +
          Math.abs(targetZoom - currentZoom) +
          Math.abs(targetProject - currentProject) +
          Math.hypot(targetFramingCenterX - currentFramingCenterX, targetFramingCenterY - currentFramingCenterY) +
          Math.abs(targetFramingScale - currentFramingScale) +
          Math.hypot(targetFocusX - currentFocusX, targetFocusY - currentFocusY) +
          Math.abs(targetFocusStrength - currentFocusStrength)
        );

        const timeExpired = currentTimestamp >= settlingDeadline;

        if ((distanceRemaining < 0.0004 && !pulseActive) || timeExpired) {
          currentPointerX = targetPointerX;
          currentPointerY = targetPointerY;
          currentRotationAngle = targetRotationAngle;
          currentZoom = targetZoom;
          currentProject = targetProject;
          currentFramingCenterX = targetFramingCenterX;
          currentFramingCenterY = targetFramingCenterY;
          currentFramingScale = targetFramingScale;
          currentFocusX = targetFocusX;
          currentFocusY = targetFocusY;
          currentFocusStrength = targetFocusStrength;
          isSettlingActive = false;
          renderSingleFrame();
          lastFrameWallTimestamp = 0.0;
          return;
        }
      }

      renderSingleFrame();
      lastRenderWallTimestamp = performance.now();

      if (isSettlingActive) {
        schedulerAnimationFrameIdentifier = window.requestAnimationFrame(unifiedSchedulerTick);
      } else {
        lastFrameWallTimestamp = 0.0;
      }
    }

    function handlePointerMove(pointerEvent) {
      if (pointerEvent.pointerType === 'touch' || pointerCoarseQuery.matches) {
        return;
      }
      if (!isHeroVisible || !checkAtlasViewActive() || !checkMotionPermitted() || checkDocumentHidden()) {
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

      targetPointerX = ((clientCoordX / viewportWidth) * 2.0 - 1.0) * 0.35;
      targetPointerY = -((clientCoordY / viewportHeight) * 2.0 - 1.0) * 0.35;
      targetRotationAngle += (deltaCoordX * 0.25 - deltaCoordY * 0.20);

      triggerInteractiveSettling(700);
    }

    function handleOpticsInput(inputEvent) {
      if (!checkAtlasViewActive() || checkDocumentHidden() || !isHeroVisible) {
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

      let nextFramingCenterX = targetFramingCenterX;
      let nextFramingCenterY = targetFramingCenterY;
      let nextFramingScale = targetFramingScale;
      let framingUpdated = false;

      if (inputDetail.reset) {
        nextPointerX = 0.0;
        nextPointerY = 0.0;
        nextZoom = 0.0;
        nextRotation = 0.0;
        nextProject = 0.0;
        nextFocusStrength = 0.0;
        nextFocusPulseId = 0;
        focusUpdated = true;
        nextFramingCenterX = 0.5;
        nextFramingCenterY = 0.5;
        nextFramingScale = 1.0;
        framingUpdated = true;
      } else {
        if (Number.isFinite(inputDetail.x)) {
          nextPointerX = Math.max(-1.0, Math.min(1.0, inputDetail.x));
        }
        if (Number.isFinite(inputDetail.y)) {
          nextPointerY = Math.max(-1.0, Math.min(1.0, inputDetail.y));
        }
        if (Number.isFinite(inputDetail.irisZoom)) {
          nextZoom = Math.max(0.0, Math.min(0.12, inputDetail.irisZoom));
        } else if (Number.isFinite(inputDetail.zoom)) {
          nextZoom = Math.max(0.0, Math.min(0.12, (inputDetail.zoom - 1.0) / 0.25));
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
        if (inputDetail.framing && typeof inputDetail.framing === 'object') {
          const fr = inputDetail.framing;
          if (Number.isFinite(fr.centerX)) {
            nextFramingCenterX = Math.max(0.0, Math.min(1.0, fr.centerX));
            framingUpdated = true;
          }
          if (Number.isFinite(fr.centerY)) {
            nextFramingCenterY = Math.max(0.0, Math.min(1.0, fr.centerY));
            framingUpdated = true;
          }
          if (Number.isFinite(fr.scale)) {
            nextFramingScale = Math.max(0.2, Math.min(4.0, fr.scale));
            framingUpdated = true;
          }
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

      const framingChanged = framingUpdated && (
        Math.abs(nextFramingCenterX - targetFramingCenterX) > 0.0005 ||
        Math.abs(nextFramingCenterY - targetFramingCenterY) > 0.0005 ||
        Math.abs(nextFramingScale - targetFramingScale) > 0.0005
      );

      if (!cameraChanged && !focusChanged && !framingChanged) {
        return;
      }

      targetPointerX = nextPointerX;
      targetPointerY = nextPointerY;
      targetZoom = nextZoom;
      targetProject = nextProject;
      targetRotationAngle = nextRotation;

      if (framingChanged) {
        targetFramingCenterX = nextFramingCenterX;
        targetFramingCenterY = nextFramingCenterY;
        targetFramingScale = nextFramingScale;
      }

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
        currentFramingCenterX = targetFramingCenterX;
        currentFramingCenterY = targetFramingCenterY;
        currentFramingScale = targetFramingScale;
        currentFocusX = targetFocusX;
        currentFocusY = targetFocusY;
        currentFocusStrength = targetFocusStrength;
        renderSingleFrame();
        return;
      }

      triggerInteractiveSettling(700);
    }

    function handleResize() {
      if (!checkAtlasViewActive() || checkDocumentHidden() || !isHeroVisible) {
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
        currentFramingCenterX = targetFramingCenterX;
        currentFramingCenterY = targetFramingCenterY;
        currentFramingScale = targetFramingScale;
        currentFocusX = targetFocusX;
        currentFocusY = targetFocusY;
        currentFocusStrength = targetFocusStrength;
        pulseStartActiveTime = -100.0;
        renderSingleFrame();
        return;
      }

      renderSingleFrame();
      if (isHeroVisible && !schedulerAnimationFrameIdentifier) {
        triggerInteractiveSettling(500);
      }
    }

    let heroIntersectionObserver = null;
    if (typeof IntersectionObserver !== 'undefined' && viewportContainer) {
      heroIntersectionObserver = new IntersectionObserver(function (entries) {
        for (let i = 0; i < entries.length; i += 1) {
          const entry = entries[i];
          if (entry.target === viewportContainer) {
            const wasVisible = isHeroVisible;
            isHeroVisible = entry.isIntersecting;
            if (!isHeroVisible) {
              cancelScheduledFrame();
              isSettlingActive = false;
              lastFrameWallTimestamp = 0.0;
            } else if (!wasVisible) {
              if (checkAtlasViewActive() && !checkDocumentHidden()) {
                renderSingleFrame();
                if (checkMotionPermitted()) {
                  triggerInteractiveSettling(500);
                }
              }
            }
          }
        }
      }, { threshold: 0.01 });
      heroIntersectionObserver.observe(viewportContainer);
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
      getFraming: function () {
        return {
          centerX: currentFramingCenterX,
          centerY: currentFramingCenterY,
          scale: currentFramingScale
        };
      },
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
      totalVertexCount = 0;
      uniformFocusCoordsLocation = null;
      uniformFocusStrengthLocation = null;
      uniformFocusPulseTimeLocation = null;
      uniformFramingNdcShiftLocation = null;
      uniformFramingScreenShiftLocation = null;
      uniformFramingScaleLocation = null;
      canvasElement.style.visibility = 'hidden';
      documentRoot.classList.remove('has-kaleidoscope');
    });

    canvasElement.addEventListener('webglcontextrestored', function () {
      isContextLost = false;
      const restoredPipelineSuccess = setupWebGLPipeline();
      if (restoredPipelineSuccess) {
        canvasElement.style.visibility = 'visible';
        canvasElement.style.display = '';
        renderSingleFrame();
        if (checkMotionPermitted() && isHeroVisible) {
          triggerInteractiveSettling(500);
        }
      } else {
        canvasElement.style.visibility = 'hidden';
        documentRoot.classList.remove('has-kaleidoscope');
      }
    });

    if (!checkAtlasViewActive() || checkDocumentHidden()) {
      canvasElement.style.opacity = '0';
      canvasElement.style.visibility = 'hidden';
    } else {
      renderSingleFrame();
      if (checkMotionPermitted() && isHeroVisible) {
        triggerInteractiveSettling(INITIAL_ENTRANCE_MS);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeKaleidoscope, { once: true });
  } else {
    initializeKaleidoscope();
  }
})();
