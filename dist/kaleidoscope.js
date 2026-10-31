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
      'void main(void) {',
      '  float angleRadian = varyingUv.x * 2.0 * PI;',
      '  float radialDistance = 0.50 + varyingUv.y * 1.62;',
      '  float waveTension = sin(angleRadian * 9.0 + radialDistance * 6.5) * 0.85;',
      '  float waveRelief = sin(angleRadian * 5.0 - radialDistance * 7.2) * 0.65;',
      '  float perturbationOne = sin(angleRadian * 13.0 + radialDistance * 5.2 + waveTension) * 2.1;',
      '  float perturbationTwo = sin(angleRadian * 7.0 - radialDistance * 8.0 + waveRelief) * 1.25;',
      '  float fiberPhase = angleRadian * 113.0 + perturbationOne + perturbationTwo + radialDistance * 7.0;',
      '  float ridgeValue = 0.5 + 0.5 * sin(fiberPhase);',
      '  float microFiber = pow(0.5 + 0.5 * sin(fiberPhase * 4.0 + sin(radialDistance * 24.0 + angleRadian * 19.0)), 5.0);',
      '  float branchingPattern = 0.5 + 0.5 * sin(angleRadian * 47.0 + sin(angleRadian * 11.0) * 2.0 + radialDistance * 18.0);',
      '  float mineralPattern = smoothstep(0.15, 0.85, sin(angleRadian * 9.0 + radialDistance * 4.0) * 0.32 + sin(angleRadian * 23.0 - radialDistance * 3.0) * 0.24 + 0.42);',
      '  float fiberRelief = ridgeValue * 0.72 + microFiber * 0.28;',
      '  gl_FragColor = vec4(clamp(fiberRelief, 0.0, 1.0), branchingPattern, mineralPattern, 1.0);',
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
      '  vec3 cameraOrigin = vec3(0.24 + uniformPointer.x * 0.82, -0.28 + uniformPointer.y * 0.68, 2.68 - uniformZoom * 0.10);',
      '  vec3 cameraForward = normalize(vec3(0.0, 0.0, -0.24) - cameraOrigin);',
      '  vec3 cameraRight = normalize(cross(cameraForward, vec3(0.0, 1.0, 0.0)));',
      '  vec3 cameraUp = cross(cameraRight, cameraForward);',
      '  varyingViewDirection = normalize(cameraOrigin - localVertexPosition);',
      '  vec3 relativePosition = localVertexPosition - cameraOrigin;',
      '  float cameraDepth = dot(relativePosition, cameraForward);',
      '  float cameraCoordX = dot(relativePosition, cameraRight);',
      '  float cameraCoordY = dot(relativePosition, cameraUp);',
      '  float minimumResolution = min(uniformResolution.x, uniformResolution.y);',
      '  float fovScale = 1.62 / 1.70;',
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
      'uniform sampler2D uniformFiberTexture;',
      'varying vec3 varyingWorldPosition;',
      'varying vec3 varyingNormal;',
      'varying vec2 varyingTexCoord;',
      'varying vec3 varyingViewDirection;',
      'void main(void) {',
      '  float radialDistance = length(varyingWorldPosition.xy);',
      '  float angleRadian = atan(varyingWorldPosition.y, varyingWorldPosition.x);',
      '  float travelingTension = sin(angleRadian * 9.0 + radialDistance * 6.5 - uniformActiveTime * 0.462) * 0.85;',
      '  float travelingRelief = sin(angleRadian * 5.0 - radialDistance * 7.2 + uniformActiveTime * 0.306) * 0.65;',
      '  vec2 dynamicUv = vec2(varyingTexCoord.x + (travelingTension + travelingRelief) * 0.0018, varyingTexCoord.y);',
      '  vec4 fiberSample = texture2D(uniformFiberTexture, dynamicUv);',
      '  float ridgeIntensity = fiberSample.r;',
      '  float branchingFactor = fiberSample.g;',
      '  float mineralFactor = fiberSample.b;',
      '  float microFiberGleam = pow(ridgeIntensity, 2.5);',
      '  vec2 reliefOffset = vec2(0.0006, 0.0020);',
      '  float heightRight = texture2D(uniformFiberTexture, dynamicUv + vec2(reliefOffset.x, 0.0)).r;',
      '  float heightUp = texture2D(uniformFiberTexture, dynamicUv + vec2(0.0, reliefOffset.y)).r;',
      '  float gradientU = (heightRight - ridgeIntensity) * 0.40;',
      '  float gradientV = (heightUp - ridgeIntensity) * 0.40;',
      '  vec3 surfaceNormalVector = normalize(varyingNormal);',
      '  vec3 tangentAngular = normalize(vec3(-sin(angleRadian), cos(angleRadian), 0.0));',
      '  vec3 tangentRadial = normalize(cross(surfaceNormalVector, tangentAngular));',
      '  vec3 sculptedNormal = normalize(surfaceNormalVector - tangentAngular * gradientU - tangentRadial * gradientV);',
      '  float innerGoldShimmer = (1.0 - smoothstep(0.67, 1.12, radialDistance)) * 0.55;',
      '  vec3 petrolHue = mix(vec3(0.013, 0.066, 0.068), vec3(0.055, 0.23, 0.20), branchingFactor * 0.65 + ridgeIntensity * 0.35);',
      '  vec3 bronzeHue = mix(vec3(0.17, 0.076, 0.022), vec3(0.46, 0.30, 0.11), ridgeIntensity);',
      '  vec3 materialHue = mix(petrolHue, bronzeHue, clamp(mineralFactor * 0.78 + innerGoldShimmer, 0.0, 0.94));',
      '  materialHue *= 0.62 + ridgeIntensity * 0.48 + microFiberGleam * 0.25;',
      '  vec3 keyLightVector = normalize(vec3(-0.65 + 0.04 * sin(uniformActiveTime * 0.35), 0.85 + 0.03 * cos(uniformActiveTime * 0.41), 1.25));',
      '  vec3 fillLightVector = normalize(vec3(0.75 - 0.03 * cos(uniformActiveTime * 0.29), -0.50 + 0.03 * sin(uniformActiveTime * 0.37), 0.35));',
      '  vec3 normalizedViewVector = normalize(varyingViewDirection);',
      '  vec3 specularHalfVector = normalize(keyLightVector + normalizedViewVector);',
      '  float diffuseIllumination = max(dot(sculptedNormal, keyLightVector), 0.0);',
      '  float fillIllumination = max(dot(sculptedNormal, fillLightVector), 0.0);',
      '  float throatOcclusion = smoothstep(-1.07, -0.38, varyingWorldPosition.z);',
      '  float valleyOcclusion = 0.58 + ridgeIntensity * 0.42;',
      '  float limbalShading = 1.0 - smoothstep(1.42, 2.08, radialDistance);',
      '  float specularHighlight = pow(max(dot(sculptedNormal, specularHalfVector), 0.0), 34.0) * (0.18 + microFiberGleam * 0.28);',
      '  float wetReflectiveGleam = pow(max(dot(sculptedNormal, specularHalfVector), 0.0), 130.0) * 0.35;',
      '  vec3 sceneComposition = materialHue * (0.20 + diffuseIllumination * 1.7 + fillIllumination * 0.32) * valleyOcclusion;',
      '  sceneComposition += vec3(0.74, 0.51, 0.24) * specularHighlight;',
      '  sceneComposition += vec3(0.26, 0.49, 0.44) * wetReflectiveGleam;',
      '  sceneComposition *= (0.09 + 0.91 * throatOcclusion) * (0.18 + 0.82 * limbalShading);',
      '  sceneComposition += vec3(0.018, 0.060, 0.050) * fillIllumination * pow(1.0 - max(dot(surfaceNormalVector, normalizedViewVector), 0.0), 3.0) * throatOcclusion;',
      '  float respirationWave = sin(uniformActiveTime * 0.641) * 0.72 + sin(uniformActiveTime * 0.306 + 1.15) * 0.28;',
      '  float tidalWave = sin(uniformActiveTime * 0.306) * 0.68 + sin(uniformActiveTime * 0.462 + 2.05) * 0.32;',
      '  float pupilDilation = 0.038 * respirationWave + 0.012 * tidalWave;',
      '  float currentPupilLipRadius = (0.57 + 0.012 * sin(angleRadian * 17.0)) * (1.0 + pupilDilation);',
      '  float pupillaryLipGlow = exp(-pow(abs(radialDistance - currentPupilLipRadius) / 0.032, 2.0));',
      '  sceneComposition += vec3(0.13, 0.074, 0.025) * pupillaryLipGlow * diffuseIllumination * throatOcclusion;',
      '  float pupilEdgeCoverage = smoothstep(0.485, 0.525, radialDistance);',
      '  sceneComposition = mix(vec3(0.003, 0.005, 0.007), sceneComposition, pupilEdgeCoverage);',
      '  float limbusEdgeFade = smoothstep(2.05, 2.18, radialDistance);',
      '  sceneComposition = mix(sceneComposition, vec3(0.006, 0.011, 0.014), limbusEdgeFade);',
      '  vec2 screenCoordinates = (gl_FragCoord.xy - 0.5 * uniformResolution) / min(uniformResolution.x, uniformResolution.y);',
      '  vec3 cornealNormal = normalize(vec3(screenCoordinates * 0.35, 1.0));',
      '  vec3 cornealReflectedRay = reflect(-normalizedViewVector, cornealNormal);',
      '  vec2 upperSoftboxPosition = vec2(-0.43 + 0.032 * sin(uniformActiveTime * 0.38 + 0.5), 0.62 + 0.024 * cos(uniformActiveTime * 0.27));',
      '  vec2 sideSoftboxPosition = vec2(0.74 + 0.026 * cos(uniformActiveTime * 0.33), -0.12 + 0.036 * sin(uniformActiveTime * 0.25 + 1.2));',
      '  float upperSoftboxIntensity = exp(-pow(abs(cornealReflectedRay.x - upperSoftboxPosition.x) / 0.34, 4.0) - pow(abs(cornealReflectedRay.y - upperSoftboxPosition.y) / 0.055, 2.0));',
      '  float sideSoftboxIntensity = exp(-pow(abs(cornealReflectedRay.x - sideSoftboxPosition.x) / 0.030, 2.0) - pow(abs(cornealReflectedRay.y - sideSoftboxPosition.y) / 0.32, 4.0));',
      '  vec3 broadLightDirection = normalize(vec3(-0.50 + 0.07 * sin(uniformActiveTime * 0.31), 0.70 + 0.05 * cos(uniformActiveTime * 0.23), 0.90));',
      '  float broadSurfaceReflection = pow(max(dot(cornealReflectedRay, broadLightDirection), 0.0), 18.0);',
      '  float cornealFresnel = 0.025 + 0.65 * pow(1.0 - max(dot(normalizedViewVector, cornealNormal), 0.0), 5.0);',
      '  float clearTitleCorridor = smoothstep(0.17, 0.36, length(screenCoordinates));',
      '  sceneComposition += (vec3(0.63, 0.80, 0.73) * upperSoftboxIntensity * 0.23 + vec3(0.66, 0.43, 0.20) * sideSoftboxIntensity * 0.17 + vec3(0.16, 0.27, 0.23) * broadSurfaceReflection * 0.10) * clearTitleCorridor;',
      '  sceneComposition += vec3(0.09, 0.19, 0.17) * cornealFresnel * 0.55;',
      '  sceneComposition *= 0.66 + 0.34 * smoothstep(0.10, 0.27, length(screenCoordinates));',
      '  sceneComposition *= 1.0 - smoothstep(0.70, 1.35, length(screenCoordinates)) * 0.40;',
      '  sceneComposition *= uniformIntensity * (1.0 + uniformProject * 0.07);',
      '  sceneComposition = vec3(1.0) - exp(-sceneComposition * 1.30);',
      '  sceneComposition = pow(max(sceneComposition, vec3(0.0)), vec3(0.88));',
      '  gl_FragColor = vec4(sceneComposition, 1.0);',
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
    let fiberTextureUniformLocation = null;

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
        const fallbackWidth = computedTextureWidth;
        const fallbackHeight = computedTextureHeight;
        const fallbackBytes = new Uint8Array(fallbackWidth * fallbackHeight * 4);

        for (let pixelRow = 0; pixelRow < fallbackHeight; pixelRow += 1) {
          const rowFraction = pixelRow / fallbackHeight;
          const radialPosition = 0.50 + rowFraction * 1.62;

          for (let pixelColumn = 0; pixelColumn < fallbackWidth; pixelColumn += 1) {
            const columnFraction = pixelColumn / fallbackWidth;
            const angleRadian = columnFraction * Math.PI * 2.0;

            const waveTension = Math.sin(angleRadian * 9.0 + radialPosition * 6.5) * 0.85;
            const waveRelief = Math.sin(angleRadian * 5.0 - radialPosition * 7.2) * 0.65;
            const perturbationOne = Math.sin(angleRadian * 13.0 + radialPosition * 5.2 + waveTension) * 2.1;
            const perturbationTwo = Math.sin(angleRadian * 7.0 - radialPosition * 8.0 + waveRelief) * 1.25;
            const fiberPhase = angleRadian * 113.0 + perturbationOne + perturbationTwo + radialPosition * 7.0;

            const ridgeValue = 0.5 + 0.5 * Math.sin(fiberPhase);
            const microFiberGleam = Math.pow(0.5 + 0.5 * Math.sin(fiberPhase * 4.0 + Math.sin(radialPosition * 24.0 + angleRadian * 19.0)), 5.0);
            const branchingFactor = 0.5 + 0.5 * Math.sin(angleRadian * 47.0 + Math.sin(angleRadian * 11.0) * 2.0 + radialPosition * 18.0);
            const mineralFactor = Math.min(1.0, Math.max(0.0, (Math.sin(angleRadian * 9.0 + radialPosition * 4.0) * 0.32 + Math.sin(angleRadian * 23.0 - radialPosition * 3.0) * 0.24 + 0.42 - 0.15) / 0.70));
            const fiberRelief = ridgeValue * 0.72 + microFiberGleam * 0.28;

            const byteOffset = (pixelRow * fallbackWidth + pixelColumn) * 4;
            fallbackBytes[byteOffset] = Math.min(255, Math.max(0, Math.round(fiberRelief * 255)));
            fallbackBytes[byteOffset + 1] = Math.min(255, Math.max(0, Math.round(branchingFactor * 255)));
            fallbackBytes[byteOffset + 2] = Math.min(255, Math.max(0, Math.round(mineralFactor * 255)));
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
            computedRadius = 2.12 + ((ringProgress - 0.83) / 0.17) * (4.20 - 2.12);
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
        fiberTextureUniformLocation = glContext.getUniformLocation(constructedMainProg, 'uniformFiberTexture');

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
      if (isContextLost || !glContext || glContext.isContextLost() || !shaderProgram || !checkAtlasViewActive() || checkDocumentHidden()) {
        if (checkDocumentHidden() || !checkAtlasViewActive() || isContextLost || (glContext && glContext.isContextLost())) {
          cancelScheduledFrame();
          isSettlingActive = false;
          lastFrameWallTimestamp = 0.0;
        }
        return;
      }
      updateCanvasDimensions();
      glContext.useProgram(shaderProgram);
      glContext.viewport(0, 0, canvasElement.width, canvasElement.height);
      glContext.clearColor(0.006, 0.011, 0.014, 1.0);
      glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
      glContext.enable(glContext.DEPTH_TEST);

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

      glContext.drawArrays(glContext.TRIANGLES, 0, totalVertexCount);

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

        const distanceRemaining = Math.hypot(targetPointerX - currentPointerX, targetPointerY - currentPointerY) +
                                  Math.abs(targetRotationAngle - currentRotationAngle) +
                                  Math.abs(targetZoom - currentZoom) +
                                  Math.abs(targetProject - currentProject);
        if (distanceRemaining < 0.0004) {
          currentPointerX = targetPointerX;
          currentPointerY = targetPointerY;
          currentRotationAngle = targetRotationAngle;
          currentZoom = targetZoom;
          currentProject = targetProject;
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
      updateCanvasDimensions();
      renderSingleFrame();
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
