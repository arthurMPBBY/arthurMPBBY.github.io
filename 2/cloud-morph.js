(function () {
    window.createCloudMorph = function (artContainer) {
        if (!artContainer || typeof artContainer.querySelector !== "function") {
            return null;
        }
        if (!window.Path2D || !window.document || typeof window.document.createElement !== "function") {
            return null;
        }
        let canvasElement = null;
        try {
            const mainBillowElement = artContainer.querySelector(".sculpture-mainbillow");
            const underBillowElement = artContainer.querySelector(".sculpture-underbillow");
            if (!mainBillowElement || !underBillowElement) {
                return null;
            }
            const mainPathData = mainBillowElement.getAttribute("d");
            const underPathData = underBillowElement.getAttribute("d");
            if (!mainPathData || !underPathData) {
                return null;
            }
            const mainPath = new Path2D(mainPathData);
            const underPath = new Path2D(underPathData);

            canvasElement = document.createElement("canvas");
            canvasElement.className = "cloud-morph-canvas";
            canvasElement.setAttribute("aria-hidden", "true");
            canvasElement.style.position = "absolute";
            canvasElement.style.top = "0";
            canvasElement.style.left = "0";
            canvasElement.style.width = "100%";
            canvasElement.style.height = "100%";
            canvasElement.style.pointerEvents = "none";
            canvasElement.style.zIndex = "4";
            artContainer.appendChild(canvasElement);

            const canvasContext = canvasElement.getContext("2d");
            if (!canvasContext) {
                if (canvasElement.parentNode) {
                    canvasElement.parentNode.removeChild(canvasElement);
                }
                return null;
            }

            const probeCanvas = document.createElement("canvas");
            probeCanvas.width = 16;
            probeCanvas.height = 16;
            const probeContext = probeCanvas.getContext("2d");
            if (!probeContext || typeof probeContext.isPointInPath !== "function") {
                if (canvasElement.parentNode) {
                    canvasElement.parentNode.removeChild(canvasElement);
                }
                return null;
            }

            const candidatePoints = [];
            const minCoordX = 114;
            const maxCoordX = 390;
            const minCoordY = 132;
            const maxCoordY = 316;
            const stepSize = 5;
            for (let sampleCoordX = minCoordX; sampleCoordX <= maxCoordX; sampleCoordX += stepSize) {
                for (let sampleCoordY = minCoordY; sampleCoordY <= maxCoordY; sampleCoordY += stepSize) {
                    const isInsideMain = probeContext.isPointInPath(mainPath, sampleCoordX, sampleCoordY);
                    const isInsideUnder = probeContext.isPointInPath(underPath, sampleCoordX, sampleCoordY);
                    if (isInsideMain || isInsideUnder) {
                        candidatePoints.push({ posX: sampleCoordX, posY: sampleCoordY });
                    }
                }
            }
            if (candidatePoints.length === 0) {
                if (canvasElement.parentNode) {
                    canvasElement.parentNode.removeChild(canvasElement);
                }
                return null;
            }

            const nextRandom = createDeterministicRandom(48271);

            for (let shuffleIndex = candidatePoints.length - 1; shuffleIndex > 0; shuffleIndex -= 1) {
                const swapTargetIndex = Math.floor(nextRandom() * (shuffleIndex + 1));
                const temporaryPoint = candidatePoints[shuffleIndex];
                candidatePoints[shuffleIndex] = candidatePoints[swapTargetIndex];
                candidatePoints[swapTargetIndex] = temporaryPoint;
            }

            const anchorPoints = [
                { posX: 85, posY: 280 },
                { posX: 140, posY: 265 },
                { posX: 195, posY: 290 },
                { posX: 250, posY: 225 },
                { posX: 305, posY: 240 },
                { posX: 360, posY: 185 },
                { posX: 415, posY: 170 }
            ];

            const curveVertices = [];
            const segmentsTotal = anchorPoints.length - 1;
            const stepsPerSegment = 40;
            for (let segmentIndex = 0; segmentIndex < segmentsTotal; segmentIndex += 1) {
                const pointZero = anchorPoints[Math.max(0, segmentIndex - 1)];
                const pointOne = anchorPoints[segmentIndex];
                const pointTwo = anchorPoints[segmentIndex + 1];
                const pointThree = anchorPoints[Math.min(anchorPoints.length - 1, segmentIndex + 2)];
                for (let stepIndex = 0; stepIndex < stepsPerSegment; stepIndex += 1) {
                    const fractionValue = stepIndex / stepsPerSegment;
                    const fractionSquare = fractionValue * fractionValue;
                    const fractionCube = fractionSquare * fractionValue;
                    const weightZero = -0.5 * fractionCube + fractionSquare - 0.5 * fractionValue;
                    const weightOne = 1.5 * fractionCube - 2.5 * fractionSquare + 1.0;
                    const weightTwo = -1.5 * fractionCube + 2.0 * fractionSquare + 0.5 * fractionValue;
                    const weightThree = 0.5 * fractionCube - 0.5 * fractionSquare;
                    const interpolatedX = weightZero * pointZero.posX + weightOne * pointOne.posX + weightTwo * pointTwo.posX + weightThree * pointThree.posX;
                    const interpolatedY = weightZero * pointZero.posY + weightOne * pointOne.posY + weightTwo * pointTwo.posY + weightThree * pointThree.posY;
                    curveVertices.push({ posX: interpolatedX, posY: interpolatedY });
                }
            }
            curveVertices.push({ posX: anchorPoints[anchorPoints.length - 1].posX, posY: anchorPoints[anchorPoints.length - 1].posY });

            const arcLengths = [0];
            let accumulatedLength = 0;
            for (let vertexIndex = 1; vertexIndex < curveVertices.length; vertexIndex += 1) {
                const deltaCoordX = curveVertices[vertexIndex].posX - curveVertices[vertexIndex - 1].posX;
                const deltaCoordY = curveVertices[vertexIndex].posY - curveVertices[vertexIndex - 1].posY;
                accumulatedLength += Math.hypot(deltaCoordX, deltaCoordY);
                arcLengths.push(accumulatedLength);
            }
            const totalCurveLength = accumulatedLength;

            const masterParticles = [];
            const maxParticleCount = 240;
            const colorOptions = [
                "rgba(193, 107, 89, 0.92)",
                "rgba(193, 107, 89, 0.76)",
                "rgba(223, 179, 167, 0.88)",
                "rgba(88, 93, 102, 0.70)",
                "rgba(37, 39, 43, 0.65)",
                "rgba(255, 255, 255, 0.92)"
            ];

            for (let particleIndex = 0; particleIndex < maxParticleCount; particleIndex += 1) {
                const progressAlongCurve = particleIndex / (maxParticleCount - 1);
                const targetArcDistance = progressAlongCurve * totalCurveLength;
                let searchIndex = 0;
                while (searchIndex < arcLengths.length - 2 && arcLengths[searchIndex + 1] < targetArcDistance) {
                    searchIndex += 1;
                }
                const previousPoint = curveVertices[searchIndex];
                const nextPoint = curveVertices[searchIndex + 1];
                const segmentSpanDistance = arcLengths[searchIndex + 1] - arcLengths[searchIndex] || 1;
                const segmentFraction = (targetArcDistance - arcLengths[searchIndex]) / segmentSpanDistance;
                const baseLineX = previousPoint.posX + segmentFraction * (nextPoint.posX - previousPoint.posX);
                const baseLineY = previousPoint.posY + segmentFraction * (nextPoint.posY - previousPoint.posY);

                const deltaCoordX = nextPoint.posX - previousPoint.posX;
                const deltaCoordY = nextPoint.posY - previousPoint.posY;
                const segmentDistance = Math.hypot(deltaCoordX, deltaCoordY) || 1;
                const tangentCoordX = deltaCoordX / segmentDistance;
                const tangentCoordY = deltaCoordY / segmentDistance;
                const normalCoordX = -tangentCoordY;
                const normalCoordY = tangentCoordX;

                const dispersionOffset = (nextRandom() + nextRandom() - 1.0) * 4.5;
                const targetCoordX = baseLineX + normalCoordX * dispersionOffset;
                const targetCoordY = baseLineY + normalCoordY * dispersionOffset;

                const sourceCandidate = candidatePoints[particleIndex % candidatePoints.length];
                const sourceCoordX = sourceCandidate.posX + (nextRandom() - 0.5) * 2.5;
                const sourceCoordY = sourceCandidate.posY + (nextRandom() - 0.5) * 2.5;

                const midpointCoordX = (sourceCoordX + targetCoordX) * 0.5;
                const midpointCoordY = (sourceCoordY + targetCoordY) * 0.5;
                const chordDeltaX = targetCoordX - sourceCoordX;
                const chordDeltaY = targetCoordY - sourceCoordY;
                const chordDistance = Math.hypot(chordDeltaX, chordDeltaY) || 1;
                const chordNormalX = -chordDeltaY / chordDistance;
                const chordNormalY = chordDeltaX / chordDistance;
                const curvatureMagnitude = (nextRandom() - 0.5) * Math.min(chordDistance * 0.45, 26);
                const controlPointX = midpointCoordX + chordNormalX * curvatureMagnitude;
                const controlPointY = midpointCoordY + chordNormalY * curvatureMagnitude;

                const particleRadius = 0.95 + nextRandom() * 0.65;
                const chosenColor = colorOptions[Math.floor(nextRandom() * colorOptions.length)];

                masterParticles.push({
                    sourceX: sourceCoordX,
                    sourceY: sourceCoordY,
                    targetX: targetCoordX,
                    targetY: targetCoordY,
                    controlX: controlPointX,
                    controlY: controlPointY,
                    radius: particleRadius,
                    color: chosenColor
                });
            }

            let measuredWidth = 500;
            let measuredHeight = 500;
            let effectiveDpr = 1;
            let uniformScale = 1;
            let viewportOffsetX = 0;
            let viewportOffsetY = 0;
            let activeParticleCount = maxParticleCount;
            let savedProgress = 0;

            function resize() {
                const containerRect = artContainer.getBoundingClientRect();
                measuredWidth = containerRect.width || artContainer.clientWidth || 500;
                measuredHeight = containerRect.height || artContainer.clientHeight || 500;
                effectiveDpr = Math.min(window.devicePixelRatio || 1, 2);

                canvasElement.width = Math.max(1, Math.round(measuredWidth * effectiveDpr));
                canvasElement.height = Math.max(1, Math.round(measuredHeight * effectiveDpr));
                canvasElement.style.width = measuredWidth + "px";
                canvasElement.style.height = measuredHeight + "px";

                const baseSvgDimension = 500;
                uniformScale = Math.min(measuredWidth / baseSvgDimension, measuredHeight / baseSvgDimension);
                viewportOffsetX = (measuredWidth - baseSvgDimension * uniformScale) / 2;
                viewportOffsetY = (measuredHeight - baseSvgDimension * uniformScale) / 2;

                const windowWidth = window.innerWidth || document.documentElement.clientWidth || measuredWidth;
                activeParticleCount = windowWidth <= 640 ? 120 : maxParticleCount;

                draw(savedProgress);
            }

            function draw(progress) {
                savedProgress = Number(progress) || 0;
                const clampedProgress = Math.max(0, Math.min(1, savedProgress));
                canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
                if (clampedProgress <= 0.15) {
                    return;
                }
                canvasContext.save();
                canvasContext.scale(effectiveDpr, effectiveDpr);
                canvasContext.translate(viewportOffsetX, viewportOffsetY);
                canvasContext.scale(uniformScale, uniformScale);

                if (clampedProgress > 0.8) {
                    const chartAlpha = (clampedProgress - 0.8) / 0.2;

                    canvasContext.save();
                    canvasContext.setLineDash([3, 4]);
                    canvasContext.strokeStyle = "rgba(88, 93, 102, " + (0.22 * chartAlpha).toFixed(4) + ")";
                    canvasContext.lineWidth = 0.8;
                    canvasContext.beginPath();
                    canvasContext.moveTo(75, 190);
                    canvasContext.lineTo(425, 190);
                    canvasContext.moveTo(75, 240);
                    canvasContext.lineTo(425, 240);
                    canvasContext.moveTo(75, 290);
                    canvasContext.lineTo(425, 290);
                    canvasContext.stroke();
                    canvasContext.restore();

                    canvasContext.save();
                    canvasContext.strokeStyle = "rgba(193, 107, 89, " + (0.85 * chartAlpha).toFixed(4) + ")";
                    canvasContext.lineWidth = 1.4;
                    canvasContext.lineCap = "round";
                    canvasContext.lineJoin = "round";
                    canvasContext.beginPath();
                    for (let vertexIndex = 0; vertexIndex < curveVertices.length; vertexIndex += 1) {
                        if (vertexIndex === 0) {
                            canvasContext.moveTo(curveVertices[0].posX, curveVertices[0].posY);
                        } else {
                            canvasContext.lineTo(curveVertices[vertexIndex].posX, curveVertices[vertexIndex].posY);
                        }
                    }
                    canvasContext.stroke();
                    canvasContext.restore();

                    const markerIndices = [
                        0,
                        Math.floor(curveVertices.length * 0.38),
                        Math.floor(curveVertices.length * 0.72),
                        curveVertices.length - 1
                    ];
                    canvasContext.save();
                    canvasContext.fillStyle = "rgba(193, 107, 89, " + (0.95 * chartAlpha).toFixed(4) + ")";
                    canvasContext.strokeStyle = "rgba(255, 255, 255, " + (0.90 * chartAlpha).toFixed(4) + ")";
                    canvasContext.lineWidth = 1.2;
                    for (let markerLoopIndex = 0; markerLoopIndex < markerIndices.length; markerLoopIndex += 1) {
                        const markerVertex = curveVertices[markerIndices[markerLoopIndex]];
                        canvasContext.beginPath();
                        canvasContext.arc(markerVertex.posX, markerVertex.posY, 2.8, 0, Math.PI * 2);
                        canvasContext.fill();
                        canvasContext.stroke();
                    }
                    canvasContext.restore();
                }

                let fadeRatio = 1.0;
                let travelFraction = 0.0;
                if (clampedProgress <= 0.45) {
                    fadeRatio = (clampedProgress - 0.15) / 0.30;
                    travelFraction = 0.0;
                } else if (clampedProgress < 0.80) {
                    fadeRatio = 1.0;
                    travelFraction = (clampedProgress - 0.45) / 0.35;
                } else {
                    fadeRatio = 1.0;
                    travelFraction = 1.0;
                }

                const easedTravel = travelFraction * travelFraction * (3.0 - 2.0 * travelFraction);
                const inverseTravel = 1.0 - easedTravel;

                canvasContext.save();
                canvasContext.globalAlpha = Math.max(0, Math.min(1, fadeRatio));
                for (let particleLoopIndex = 0; particleLoopIndex < activeParticleCount; particleLoopIndex += 1) {
                    const masterIndex = Math.round(particleLoopIndex * (maxParticleCount - 1) / (activeParticleCount - 1));
                    const renderParticle = masterParticles[masterIndex];
                    let currentRenderX = renderParticle.sourceX;
                    let currentRenderY = renderParticle.sourceY;
                    if (easedTravel > 0.0) {
                        if (easedTravel >= 1.0) {
                            currentRenderX = renderParticle.targetX;
                            currentRenderY = renderParticle.targetY;
                        } else {
                            currentRenderX = inverseTravel * inverseTravel * renderParticle.sourceX + 2.0 * inverseTravel * easedTravel * renderParticle.controlX + easedTravel * easedTravel * renderParticle.targetX;
                            currentRenderY = inverseTravel * inverseTravel * renderParticle.sourceY + 2.0 * inverseTravel * easedTravel * renderParticle.controlY + easedTravel * easedTravel * renderParticle.targetY;
                        }
                    }
                    canvasContext.fillStyle = renderParticle.color;
                    canvasContext.beginPath();
                    canvasContext.arc(currentRenderX, currentRenderY, renderParticle.radius, 0, Math.PI * 2);
                    canvasContext.fill();
                }
                canvasContext.restore();

                canvasContext.restore();
            }

            function destroy() {
                if (canvasElement && canvasElement.parentNode) {
                    canvasElement.parentNode.removeChild(canvasElement);
                }
            }

            const controller = {
                resize: resize,
                draw: draw,
                destroy: destroy,
                get particleCount() {
                    return activeParticleCount;
                }
            };

            resize();
            return controller;
        } catch (errorCaught) {
            if (canvasElement && canvasElement.parentNode) {
                canvasElement.parentNode.removeChild(canvasElement);
            }
            return null;
        }
    };

    function createDeterministicRandom(seedValue) {
        let internalState = seedValue >>> 0;
        return function () {
            internalState = (internalState + 0x6D2B79F5) | 0;
            let calculationStep = Math.imul(internalState ^ (internalState >>> 15), 1 | internalState);
            calculationStep = (calculationStep + Math.imul(calculationStep ^ (calculationStep >>> 7), 61 | calculationStep)) ^ calculationStep;
            return ((calculationStep ^ (calculationStep >>> 14)) >>> 0) / 4294967296;
        };
    }
})();
