import { Renderer, Program, Mesh, Texture } from 'ogl';
import { Triangle } from 'ogl';
import { generatePlantTexture } from './plantGenerator.js';
import { vertex300, fragment300, vertex100, fragment100 } from './shaders.js';
import { createControls, hexToVec3 } from './controls.js';
import { initBook } from './book.js';

const params = {
    diskSize: 103,
    diskSamples: 65,
    shadowSharpness: 0.40,

    windStrength: 0.020,
    windSpeed: 1.5,
    windEnabled: true,

    parallaxStrength: 0.015,
    parallaxEnabled: true,

    timeOfDay: 0.37,
    shadowLength: 1.50,
    progressiveBlur: 6.0,
    animateSun: true,
    sunSpeed: 0.100,

    plantScale: 1.0,

    showTexture: false,
    paused: false,
};

const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: false });
const gl = renderer.gl;
document.body.appendChild(gl.canvas);
gl.clearColor(0.882, 0.725, 0.549, 1);

let plantTexture = new Texture(gl, {
    generateMipmaps: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
});

function rebuildPlantTexture() {
    const canvas = generatePlantTexture(1024, 1024, {
        plantScale: params.plantScale,
    });
    plantTexture.image = canvas;
    plantTexture.needsUpdate = true;
}

rebuildPlantTexture();

const isWebgl2 = renderer.isWebgl2;
const vertex = isWebgl2 ? vertex300 : vertex100;
const fragment = isWebgl2 ? fragment300 : fragment100;

const uniforms = {
    tPlant: { value: plantTexture },
    uResolution: { value: [gl.canvas.width, gl.canvas.height] },
    uMouse: { value: [0, 0] },
    uTime: { value: 0 },

    uDiskSize: { value: params.diskSize },
    uDiskSamples: { value: params.diskSamples },
    uShadowSharpness: { value: params.shadowSharpness },

    uWindStrength: { value: params.windStrength },
    uWindSpeed: { value: params.windSpeed },
    uWindEnabled: { value: params.windEnabled },

    uParallaxStrength: { value: params.parallaxStrength },
    uParallaxEnabled: { value: params.parallaxEnabled },

    uTimeOfDay: { value: params.timeOfDay },
    uShadowLength: { value: params.shadowLength },
    uProgressiveBlur: { value: params.progressiveBlur },

    uShowTexture: { value: params.showTexture },
};

const program = new Program(gl, {
    vertex,
    fragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
});

const geometry = new Triangle(gl);
const mesh = new Mesh(gl, { geometry, program });

function syncUniforms() {
    uniforms.uDiskSize.value = params.diskSize;
    uniforms.uDiskSamples.value = params.diskSamples;
    uniforms.uShadowSharpness.value = params.shadowSharpness;
    uniforms.uWindStrength.value = params.windStrength;
    uniforms.uWindSpeed.value = params.windSpeed;
    uniforms.uWindEnabled.value = params.windEnabled;
    uniforms.uParallaxStrength.value = params.parallaxStrength;
    uniforms.uParallaxEnabled.value = params.parallaxEnabled;
    uniforms.uTimeOfDay.value = params.timeOfDay;
    uniforms.uShadowLength.value = params.shadowLength;
    uniforms.uProgressiveBlur.value = params.progressiveBlur;
    uniforms.uShowTexture.value = params.showTexture;
}

const plantKeys = new Set(['plantScale', 'regenerate']);

const ui = createControls(params, (key) => {
    if (plantKeys.has(key)) {
        rebuildPlantTexture();
    }
    syncUniforms();
});

function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
}
window.addEventListener('resize', resize);
resize();

const targetMouse = [0, 0];
const currentMouse = [0, 0];

window.addEventListener('mousemove', (e) => {
    targetMouse[0] = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouse[1] = -((e.clientY / window.innerHeight) * 2 - 1);
});

let lastTime = 0;
let frameCount = 0;
let fpsAccum = 0;

function update(t) {
    requestAnimationFrame(update);

    frameCount++;
    const delta = t - lastTime;
    fpsAccum += delta;
    if (fpsAccum >= 500) {
        ui.updateFPS(Math.round((frameCount / fpsAccum) * 1000));
        frameCount = 0;
        fpsAccum = 0;
    }
    lastTime = t;

    if (params.paused) return;

    currentMouse[0] += (targetMouse[0] - currentMouse[0]) * 0.05;
    currentMouse[1] += (targetMouse[1] - currentMouse[1]) * 0.05;

    uniforms.uMouse.value = [currentMouse[0], currentMouse[1]];
    uniforms.uTime.value = t * 0.001;

    if (params.animateSun) {
        params.timeOfDay = (params.timeOfDay + params.sunSpeed * 0.001) % 1.0;
        uniforms.uTimeOfDay.value = params.timeOfDay;
        ui.updateSlider('timeOfDay', params.timeOfDay);
    }

    renderer.render({ scene: mesh });
}

requestAnimationFrame(update);

initBook(params).catch(console.error);
