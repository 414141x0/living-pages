function mulberry32(seed) {
    let t = seed | 0;
    return function () {
        t = (t + 0x6d2b79f5) | 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function produce(axiom, rules, depth) {
    let rule = axiom;
    for (let i = 0; i < depth; i++) {
        let next = '';
        let multiplier = 0;
        for (const char of rule) {
            if (char.match(/[a-zA-Z]/)) {
                if (rules[char] !== undefined) {
                    next += '<' + rules[char] + '>';
                } else if (char === 'F' || char === 'f') {
                    next += 'F';
                } else if (char === 'G' || char === 'g') {
                    next += 'G';
                } else {
                    next += char;
                }
            } else if (char === '+') {
                if (multiplier !== 0) next += String(multiplier);
                next += '+';
                multiplier = 0;
            } else if (char === '-') {
                if (multiplier !== 0) next += String(multiplier);
                next += '-';
                multiplier = 0;
            } else if ('[]<>|'.includes(char)) {
                next += char;
            } else if (char >= '0' && char <= '9') {
                multiplier = multiplier * 10 + parseInt(char);
            }
        }
        rule = next;
    }
    return rule;
}

class TurtleRenderer {
    constructor(stepLength, turnAngleDeg, depthScale, rng) {
        this.stepLength = stepLength;
        this.turnAngleRad = (turnAngleDeg * Math.PI) / 180;
        this.depthScale = depthScale;
        this.rng = rng;

        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.penIsDown = true;
        this.stateStack = [];
        this.depth = 0;
        this.maxDepthSeen = 0;
        this.segments = [];
    }

    setAngle(degrees) {
        this.angle = (degrees * Math.PI) / 180;
    }

    goForward(distance) {
        const effectiveDistance = distance * Math.pow(this.depthScale, this.depth);
        // Stochastic length variation: +-15% for organic feel
        const jitter = 1.0 + (this.rng() - 0.5) * 0.3;
        const d = effectiveDistance * jitter;

        const dx = d * Math.sin(this.angle);
        const dy = d * Math.cos(this.angle);
        const nx = this.x + dx;
        const ny = this.y + dy;

        if (this.penIsDown) {
            this.segments.push({
                x0: this.x,
                y0: this.y,
                x1: nx,
                y1: ny,
                depth: this.depth,
            });
        }

        this.x = nx;
        this.y = ny;
    }

    turn(multiplier) {
        // Stochastic angle jitter: +-12% for organic branching
        const jitter = 1.0 + (this.rng() - 0.5) * 0.24;
        this.angle += this.turnAngleRad * multiplier * jitter;
    }

    saveState() {
        this.stateStack.push({ x: this.x, y: this.y, angle: this.angle });
    }

    restoreState() {
        if (this.stateStack.length > 0) {
            const state = this.stateStack.pop();
            this.x = state.x;
            this.y = state.y;
            this.angle = state.angle;
        }
    }

    pushDepth() {
        this.depth++;
        if (this.depth > this.maxDepthSeen) this.maxDepthSeen = this.depth;
    }

    popDepth() {
        this.depth--;
    }

    execute(command) {
        let multiplier = 0;
        for (const char of command) {
            if (char === 'F' || char === '|') {
                this.penIsDown = true;
                this.goForward(this.stepLength);
            } else if (char === 'G') {
                this.penIsDown = false;
                this.goForward(this.stepLength);
            } else if (char === '+') {
                const m = multiplier !== 0 ? multiplier : 1;
                this.turn(m);
                multiplier = 0;
            } else if (char === '-') {
                const m = multiplier !== 0 ? multiplier : 1;
                this.turn(-m);
                multiplier = 0;
            } else if (char === '[') {
                this.saveState();
            } else if (char === ']') {
                this.restoreState();
            } else if (char === '<') {
                this.pushDepth();
            } else if (char === '>') {
                this.popDepth();
            } else if (char >= '0' && char <= '9') {
                multiplier = multiplier * 10 + parseInt(char);
            }
        }
    }
}

function renderLSystem(config, offsetX, offsetY, scale, canvasWidth, canvasHeight, rng) {
    const command = produce(config.axiom, config.rules, config.depth);
    const turtle = new TurtleRenderer(
        config.stepLength,
        config.turnAngle,
        config.depthScale || 1.0,
        rng
    );
    if (config.initialAngle !== undefined) turtle.setAngle(config.initialAngle);
    turtle.execute(command);

    const maxDepth = Math.max(turtle.maxDepthSeen, 1);
    return turtle.segments.map((seg) => ({
        x0: seg.x0 * scale + offsetX,
        y0: canvasHeight - (seg.y0 * scale + offsetY),
        x1: seg.x1 * scale + offsetX,
        y1: canvasHeight - (seg.y1 * scale + offsetY),
        depth: seg.depth,
        maxDepth: maxDepth,
    }));
}

// Draw segments with depth-encoded color
// Red = presence, Green = depth (distance from wall)
// Depth reasoning: trunk/stems are close to wall (low green),
// outer branches/leaves are far from wall (high green = soft shadow)
function drawSegments(ctx, segments, baseLineWidth) {
    for (const seg of segments) {
        const depthRatio = seg.depth / seg.maxDepth;
        // Depth from wall: trunk (depth 0) is attached to wall = green 15
        // Tips (max depth) are farthest from wall = green 220
        const greenValue = Math.floor(15 + depthRatio * 205);
        const lineWidth = Math.max(0.4, baseLineWidth * (1 - depthRatio * 0.75));

        ctx.strokeStyle = `rgb(255, ${greenValue}, 0)`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(seg.x0, seg.y0);
        ctx.lineTo(seg.x1, seg.y1);
        ctx.stroke();
    }
}

// Leaves drawn at branch tips with high depth values (far from wall = soft shadow)
function drawLeafCluster(ctx, x, y, angle, size, depthValue) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const g = Math.min(255, Math.floor(depthValue));
    ctx.fillStyle = `rgb(255, ${g}, 0)`;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.25, -size * 0.5, size * 0.75, -size * 0.4, size, 0);
    ctx.bezierCurveTo(size * 0.75, size * 0.4, size * 0.25, size * 0.5, 0, 0);
    ctx.fill();
    ctx.restore();
}

function addLeavesToSegments(ctx, segments, leafSize, rng) {
    for (const seg of segments) {
        const depthRatio = seg.depth / seg.maxDepth;
        // Only add leaves to outer branches
        if (depthRatio < 0.35) continue;
        if (rng() > 0.5) continue;

        const angle = Math.atan2(seg.y1 - seg.y0, seg.x1 - seg.x0);
        const numLeaves = depthRatio > 0.7 ? Math.ceil(rng() * 3) : 1;

        for (let l = 0; l < numLeaves; l++) {
            const leafAngle = angle + (rng() - 0.5) * 2.0;
            // Leaves are the farthest from the wall: green 180-250
            const depthVal = 180 + depthRatio * 70;
            const size = leafSize * (0.5 + rng() * 0.8);
            const t = rng();
            const lx = seg.x0 + (seg.x1 - seg.x0) * t;
            const ly = seg.y0 + (seg.y1 - seg.y0) * t;
            drawLeafCluster(ctx, lx, ly, leafAngle, size, depthVal);
        }
    }
}

export function generatePlantTexture(width = 1024, height = 1024, options = {}) {
    const {
        plantScale = 1.0,
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const rng = mulberry32(42);

    const grassRules = { F: 'F[+F]F[-F]F' };

    for (let i = 0; i < 8; i++) {
        const grass = {
            axiom: 'F',
            rules: grassRules,
            depth: 3,
            turnAngle: 16 + rng() * 12,
            stepLength: 5 + rng() * 4,
            depthScale: 1.0,
            initialAngle: -6 + rng() * 12,
        };
        const x = width * (0.62 + rng() * 0.12);
        const segs = renderLSystem(grass, x, height * -0.04, (0.8 + rng() * 0.5) * plantScale, width, height, rng);
        drawSegments(ctx, segs, 1.0 + rng() * 0.8);
        addLeavesToSegments(ctx, segs, (6 + rng() * 4) * plantScale, rng);
    }

    for (let i = 0; i < 7; i++) {
        const grass = {
            axiom: 'F',
            rules: grassRules,
            depth: 3,
            turnAngle: 14 + rng() * 14,
            stepLength: 6 + rng() * 5,
            depthScale: 1.0,
            initialAngle: -4 + rng() * 8,
        };
        const x = width * (0.78 + rng() * 0.16);
        const segs = renderLSystem(grass, x, height * -0.04, (0.9 + rng() * 0.6) * plantScale, width, height, rng);
        drawSegments(ctx, segs, 1.0 + rng() * 1.0);
        addLeavesToSegments(ctx, segs, (7 + rng() * 5) * plantScale, rng);
    }

    return canvas;
}
