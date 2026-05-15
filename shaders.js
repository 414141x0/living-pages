export const vertex300 = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment300 = `#version 300 es
precision highp float;

uniform sampler2D tPlant;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;

uniform float uDiskSize;
uniform int uDiskSamples;
uniform float uShadowSharpness;

uniform float uWindStrength;
uniform float uWindSpeed;
uniform bool uWindEnabled;

uniform float uParallaxStrength;
uniform bool uParallaxEnabled;

uniform float uTimeOfDay;
uniform float uShadowLength;
uniform float uProgressiveBlur;

uniform bool uShowTexture;

in vec2 vUv;
out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float goldenAngle = PI * (3.0 - sqrt(5.0));

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

vec2 sunShadowDir(float tod, float lengthScale) {
    float sunAngle = (tod - 0.25) * TAU;
    float azimuth = mix(-1.2, 1.2, tod);
    float elevation = sin(sunAngle);
    elevation = max(elevation, 0.08);
    float stretch = (1.0 / tan(max(elevation * PI * 0.45, 0.15))) * lengthScale;
    return vec2(sin(azimuth), cos(azimuth) * 0.5 + 0.5) * stretch;
}

struct LightState {
    vec3 wall;
    vec3 shadow;
    float intensity;
    vec3 glowColor;
    float glowStrength;
};

LightState computeLighting(float tod) {
    float sunAngle = (tod - 0.25) * TAU;
    float elev = sin(sunAngle);

    float dayFactor = smoothstep(-0.1, 0.3, elev);          
    float twilightFactor = smoothstep(-0.6, -0.1, elev);    
    float goldenFactor = smoothstep(0.0, 0.3, elev) * smoothstep(0.7, 0.3, elev); 


    float eveningBias = smoothstep(0.45, 0.75, tod);
    float morningBias = 1.0 - eveningBias;



    vec3 nightWall = vec3(0.08, 0.08, 0.14);
    vec3 twilightWall = vec3(0.35, 0.30, 0.45);
    vec3 dayWall = vec3(0.882, 0.725, 0.549);
    vec3 noonWall = vec3(0.92, 0.78, 0.62);
    vec3 goldenWall = vec3(0.95, 0.82, 0.58);
    vec3 dawnWall = vec3(0.85, 0.68, 0.50);

    vec3 wall = mix(nightWall, twilightWall, twilightFactor);
    wall = mix(wall, dayWall, dayFactor);

    vec3 goldenTint = mix(dawnWall, goldenWall, eveningBias);
    wall = mix(wall, goldenTint, goldenFactor * 0.7);

    float noonFactor = smoothstep(0.3, 1.0, elev);
    wall = mix(wall, noonWall, noonFactor * 0.4);

    vec3 dayShadow = vec3(0.62, 0.50, 0.38);
    vec3 nightShadow = vec3(0.04, 0.04, 0.08);
    vec3 twilightShadow = vec3(0.22, 0.18, 0.30);
    vec3 goldenShadow = vec3(0.65, 0.52, 0.35);

    vec3 shadow = mix(nightShadow, twilightShadow, twilightFactor);
    shadow = mix(shadow, dayShadow, dayFactor);
    shadow = mix(shadow, goldenShadow, goldenFactor * 0.6);
    float shadowVisibility = smoothstep(0.30, 0.38, tod) * smoothstep(0.70, 0.62, tod);

    float peakIntensity = 0.22;
    float noonDip = 1.0 - noonFactor * 0.25;
    float goldenBoost = 1.0 + goldenFactor * 0.4;
    float intensity = shadowVisibility * peakIntensity * noonDip * goldenBoost;

    vec3 dayGlow = vec3(1.0, 0.92, 0.7);
    vec3 goldenGlow = vec3(1.0, 0.7, 0.3);
    vec3 twilightGlow = vec3(0.7, 0.4, 0.6);
    vec3 nightGlow = vec3(0.3, 0.35, 0.6);

    vec3 glowColor = mix(nightGlow, twilightGlow, twilightFactor);
    glowColor = mix(glowColor, dayGlow, dayFactor);
    glowColor = mix(glowColor, goldenGlow, goldenFactor * 0.8);

    float glowStrength = 0.015 + dayFactor * 0.03 + goldenFactor * 0.04;

    LightState ls;
    ls.wall = wall;
    ls.shadow = shadow;
    ls.intensity = intensity;
    ls.glowColor = glowColor;
    ls.glowStrength = glowStrength;
    return ls;
}

void main() {
    vec2 uv = vUv;

    if (uShowTexture) {
        fragColor = texture(tPlant, uv);
        return;
    }

    LightState light = computeLighting(uTimeOfDay);
    vec2 parallaxOffset = uParallaxEnabled ? uMouse * uParallaxStrength : vec2(0.0);

    vec2 shadowDir = sunShadowDir(uTimeOfDay, uShadowLength);
    vec2 origin = vec2(0.8, 0.0);
    vec2 d = (uv + parallaxOffset) - origin;
    vec2 shear = d.y * shadowDir;
    vec2 shearedUV = (uv + parallaxOffset) - shear;

    vec2 windOffset = vec2(0.0);
    if (uWindEnabled) {
        float t = uTime * uWindSpeed;
        vec2 nc = shearedUV * 3.0 + vec2(t * 0.3, t * 0.15);
        float nx = fbm(nc) - 0.5;
        float ny = fbm(nc + vec2(50.0, 50.0)) - 0.5;
        float heightFactor = smoothstep(0.0, 0.6, shearedUV.y);
        windOffset = vec2(nx, ny) * uWindStrength * heightFactor;
    }

    vec2 sampleBase = shearedUV + windOffset;

    float distFromBase = length(d);
    float progressiveScale = 1.0 + distFromBase * uProgressiveBlur;

    float shadowAccum = 0.0;
    float totalWeight = 0.0;
    vec2 texelSize = 1.0 / uResolution;
    float effectiveDisk = uDiskSize * progressiveScale;

    for (int i = 0; i < 128; i++) {
        if (i >= uDiskSamples) break;

        float r = effectiveDisk * sqrt(float(i) / float(uDiskSamples));
        float theta = float(i) * goldenAngle;
        vec2 diskOffset = vec2(r * cos(theta), r * sin(theta)) * texelSize;

        vec2 sUV = sampleBase + diskOffset;
        vec4 ps = texture(tPlant, sUV);

        float presence = step(0.1, ps.r);
        float depth = ps.g / 255.0;

        float depthBlur = max(3.0, depth * effectiveDisk);
        float dist = length(diskOffset / texelSize);
        float w = smoothstep(depthBlur, depthBlur * uShadowSharpness, dist);

        shadowAccum += presence * w;
        totalWeight += w;
    }

    float shadow = (totalWeight > 0.0) ? shadowAccum / totalWeight : 0.0;
    shadow *= light.intensity;

    vec3 color = light.wall;

    float sunAzimuth = mix(-1.2, 1.2, uTimeOfDay);
    vec2 glowCenter = vec2(0.5 - sin(sunAzimuth) * 0.4, 0.3 + sin((uTimeOfDay - 0.25) * TAU) * 0.3);
    float glowDist = length(uv - glowCenter);
    float glow = exp(-glowDist * glowDist * 2.0) * light.glowStrength;
    color += light.glowColor * glow;

    color = mix(color, light.shadow, shadow);

    float grain = fract(sin(dot(uv * uResolution, vec2(12.9898, 78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.004;

    fragColor = vec4(color, 1.0);
}
`;

export const vertex100 =  `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment100 =  `
precision highp float;

uniform sampler2D tPlant;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;

uniform float uDiskSize;
uniform float uShadowSharpness;

uniform float uWindStrength;
uniform float uWindSpeed;
uniform bool uWindEnabled;

uniform float uParallaxStrength;
uniform bool uParallaxEnabled;

uniform float uTimeOfDay;
uniform float uShadowLength;
uniform float uProgressiveBlur;

uniform bool uShowTexture;

varying vec2 vUv;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float goldenAngle = PI * (3.0 - sqrt(5.0));

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

vec2 sunShadowDir(float tod, float lengthScale) {
    float sunAngle = (tod - 0.25) * TAU;
    float azimuth = mix(-1.2, 1.2, tod);
    float elevation = sin(sunAngle);
    elevation = max(elevation, 0.08);
    float stretch = (1.0 / tan(max(elevation * PI * 0.45, 0.15))) * lengthScale;
    return vec2(sin(azimuth), cos(azimuth) * 0.5 + 0.5) * stretch;
}

void main() {
    vec2 uv = vUv;

    if (uShowTexture) {
        gl_FragColor = texture2D(tPlant, uv);
        return;
    }

    float sunAngle = (uTimeOfDay - 0.25) * TAU;
    float elev = sin(sunAngle);

    float dayFactor = smoothstep(-0.1, 0.3, elev);
    float twilightFactor = smoothstep(-0.6, -0.1, elev);
    float goldenFactor = smoothstep(0.0, 0.3, elev) * smoothstep(0.7, 0.3, elev);
    float eveningBias = smoothstep(0.45, 0.75, uTimeOfDay);
    float noonFactor = smoothstep(0.3, 1.0, elev);

    vec3 nightWall = vec3(0.08, 0.08, 0.14);
    vec3 twilightWall = vec3(0.35, 0.30, 0.45);
    vec3 dayWall = vec3(0.961, 0.929, 0.882);
    vec3 noonWall = vec3(0.98, 0.96, 0.94);
    vec3 goldenWall = vec3(0.95, 0.82, 0.58);
    vec3 dawnWall = vec3(0.92, 0.78, 0.65);

    vec3 wall = mix(nightWall, twilightWall, twilightFactor);
    wall = mix(wall, dayWall, dayFactor);
    vec3 goldenTint = mix(dawnWall, goldenWall, eveningBias);
    wall = mix(wall, goldenTint, goldenFactor * 0.7);
    wall = mix(wall, noonWall, noonFactor * 0.4);

    vec3 dayShadow = vec3(0.77, 0.75, 0.72);
    vec3 nightShadow = vec3(0.04, 0.04, 0.08);
    vec3 twilightShadow = vec3(0.22, 0.18, 0.30);
    vec3 goldenShadow = vec3(0.65, 0.52, 0.35);

    vec3 shadowCol = mix(nightShadow, twilightShadow, twilightFactor);
    shadowCol = mix(shadowCol, dayShadow, dayFactor);
    shadowCol = mix(shadowCol, goldenShadow, goldenFactor * 0.6);

    float shadowVisibility = smoothstep(0.30, 0.38, uTimeOfDay) * smoothstep(0.70, 0.62, uTimeOfDay);
    float peakIntensity = 0.22;
    float noonDip = 1.0 - noonFactor * 0.25;
    float goldenBoost = 1.0 + goldenFactor * 0.4;
    float shadowIntensity = shadowVisibility * peakIntensity * noonDip * goldenBoost;

    vec3 dayGlow = vec3(1.0, 0.92, 0.7);
    vec3 goldenGlow = vec3(1.0, 0.7, 0.3);
    vec3 twilightGlow = vec3(0.7, 0.4, 0.6);
    vec3 nightGlow = vec3(0.3, 0.35, 0.6);

    vec3 glowColor = mix(nightGlow, twilightGlow, twilightFactor);
    glowColor = mix(glowColor, dayGlow, dayFactor);
    glowColor = mix(glowColor, goldenGlow, goldenFactor * 0.8);
    float glowStrength = 0.015 + dayFactor * 0.03 + goldenFactor * 0.04;

    vec2 parallaxOffset = uParallaxEnabled ? uMouse * uParallaxStrength : vec2(0.0);

    vec2 shadowDir = sunShadowDir(uTimeOfDay, uShadowLength);
    vec2 origin = vec2(0.8, 0.0);
    vec2 d = (uv + parallaxOffset) - origin;
    vec2 shear = d.y * shadowDir;
    vec2 shearedUV = (uv + parallaxOffset) - shear;

    vec2 windOffset = vec2(0.0);
    if (uWindEnabled) {
        float t = uTime * uWindSpeed;
        vec2 nc = shearedUV * 3.0 + vec2(t * 0.3, t * 0.15);
        float nx = fbm(nc) - 0.5;
        float ny = fbm(nc + vec2(50.0, 50.0)) - 0.5;
        float heightFactor = smoothstep(0.0, 0.6, shearedUV.y);
        windOffset = vec2(nx, ny) * uWindStrength * heightFactor;
    }

    vec2 sampleBase = shearedUV + windOffset;

    float distFromBase = length(d);
    float progressiveScale = 1.0 + distFromBase * uProgressiveBlur;

    float shadowAccum = 0.0;
    float totalWeight = 0.0;
    vec2 texelSize = 1.0 / uResolution;
    float effectiveDisk = uDiskSize * progressiveScale;

    const int diskSamples = 64;
    for (int i = 0; i < diskSamples; i++) {
        float r = effectiveDisk * sqrt(float(i) / float(diskSamples));
        float theta = float(i) * goldenAngle;
        vec2 diskOffset = vec2(r * cos(theta), r * sin(theta)) * texelSize;

        vec2 sUV = sampleBase + diskOffset;
        vec4 ps = texture2D(tPlant, sUV);

        float presence = step(0.1, ps.r);
        float depth = ps.g / 255.0;

        float depthBlur = max(3.0, depth * effectiveDisk);
        float dist = length(diskOffset / texelSize);
        float w = smoothstep(depthBlur, depthBlur * uShadowSharpness, dist);

        shadowAccum += presence * w;
        totalWeight += w;
    }

    float shadow = (totalWeight > 0.0) ? shadowAccum / totalWeight : 0.0;
    shadow *= shadowIntensity;

    vec3 color = wall;

    float sunAzimuth = mix(-1.2, 1.2, uTimeOfDay);
    vec2 glowCenter = vec2(0.5 - sin(sunAzimuth) * 0.4, 0.3 + elev * 0.3);
    float glowDist = length(uv - glowCenter);
    float glow = exp(-glowDist * glowDist * 2.0) * glowStrength;
    color += glowColor * glow;

    color = mix(color, shadowCol, shadow);

    float grain = fract(sin(dot(uv * uResolution, vec2(12.9898, 78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.004;

    gl_FragColor = vec4(color, 1.0);
}
`;
