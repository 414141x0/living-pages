import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';


const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71;
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const easingFactor = 0.5;
const easingFactorFold = 0.3;
const insideCurveStrength = 0.18;
const outsideCurveStrength = 0.05;
const turningCurveStrength = 0.09;

const TEXTURE_W = 340;
const TEXTURE_H = 480;

const whiteColor = new THREE.Color('white');
const emissiveColor = new THREE.Color('orange');


function degToRad(d) { return d * Math.PI / 180; }

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function dampAngle(current, prop, target, lambda, delta) {
    const diff = ((((target - current[prop]) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    current[prop] = THREE.MathUtils.lerp(current[prop], current[prop] + diff, 1 - Math.exp(-lambda * delta));
}


const pageGeometry = new THREE.BoxGeometry(
    PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH,
    PAGE_SEGMENTS, 2
);
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new THREE.Vector3();
const skinIndexes = [];
const skinWeights = [];

for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const x = vertex.x;
    const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
    let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
    skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
    skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}

pageGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndexes, 4));
pageGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

const pageMaterials = [
    new THREE.MeshStandardMaterial({ color: whiteColor }),
    new THREE.MeshStandardMaterial({ color: '#111' }),
    new THREE.MeshStandardMaterial({ color: whiteColor }),
    new THREE.MeshStandardMaterial({ color: whiteColor }),
];


async function renderHtmlToCanvas(element) {
    const pr = 2;
    const c = document.createElement('canvas');
    c.width = TEXTURE_W * pr;
    c.height = TEXTURE_H * pr;
    const ctx = c.getContext('2d');

    const serialized = new XMLSerializer().serializeToString(element);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TEXTURE_W * pr}" height="${TEXTURE_H * pr}">
        <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:${TEXTURE_W}px;height:${TEXTURE_H}px;overflow:hidden;transform:scale(${pr});transform-origin:top left;">
                ${serialized}
            </div>
        </foreignObject>
    </svg>`;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const img = new Image();
    img.src = url;
    await img.decode();
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
}

function el(styles, html) {
    const d = document.createElement('div');
    d.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    Object.assign(d.style, {
        width: TEXTURE_W + 'px', height: TEXTURE_H + 'px',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        overflow: 'hidden', boxSizing: 'border-box', ...styles,
    });
    d.innerHTML = html;
    return d;
}


const pageContents = [
    { front: () => el({ background:'linear-gradient(160deg, #0a0e1a 0%, #141c2e 40%, #1a2840 100%)', color:'#d0dce8', padding:'0', textAlign:'center' },
        `<div style="padding:40px 28px;">
           <div style="margin-top:20px;width:90px;height:90px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg, #2a4a6a, #5b8fb9 50%, #88c0e8);box-shadow:0 0 40px rgba(91,143,185,0.3);display:flex;align-items:center;justify-content:center;">
             <svg viewBox="0 0 40 40" width="44" height="44">
               <circle cx="20" cy="14" r="7" fill="none" stroke="#d0dce8" stroke-width="1.5"/>
               <path d="M8,34 Q8,24 20,22 Q32,24 32,34" fill="none" stroke="#d0dce8" stroke-width="1.5"/>
             </svg>
           </div>
           <div style="font-size:11px;letter-spacing:5px;margin-top:28px;color:#5b8fb9;text-transform:uppercase;">Portfolio</div>
           <div style="font-size:34px;font-weight:700;margin-top:8px;line-height:1.1;background:linear-gradient(180deg,#e8f0f8,#5b8fb9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">About Me</div>
           <div style="width:40px;height:1px;background:#5b8fb9;margin:22px auto;"></div>
           <div style="font-size:11px;color:#6090b0;line-height:1.7;">Rendering &bull; Systems &bull; AI/ML</div>
           <div style="margin-top:40px;font-size:10px;color:#3a5a7a;letter-spacing:2px;">FLIP TO READ &rarr;</div>
         </div>`),
      back: () => el({ background:'#f0f4f8', color:'#1a2840', padding:'28px 24px' },
        `<div style="margin-top:10px;text-align:center;">
           <div style="width:60px;height:60px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg, #2a4a6a, #5b8fb9);"></div>
         </div>
         <div style="margin-top:16px;font-size:20px;font-weight:700;text-align:center;line-height:1.3;">Passionate Engineer</div>
         <div style="margin-top:12px;font-size:12px;color:#3a5a7a;line-height:1.7;text-align:center;">With experience across rendering, systems, and AI/ML.</div>
         <div style="margin-top:18px;display:flex;flex-direction:column;gap:8px;">
           <div style="background:#e0eaf4;border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
             <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#e8a840,#c47030);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
               <svg viewBox="0 0 16 16" width="14" height="14"><polygon points="8,2 10,6 14,6.5 11,9.5 12,14 8,11.5 4,14 5,9.5 2,6.5 6,6" fill="#fff"/></svg>
             </div>
             <div><div style="font-size:10px;font-weight:700;">Rendering</div><div style="font-size:9px;color:#5a7a9a;">WebGL, shaders, real-time graphics</div></div>
           </div>
           <div style="background:#e0eaf4;border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
             <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#5b8fb9,#2a4a6a);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
               <svg viewBox="0 0 16 16" width="14" height="14"><rect x="2" y="4" width="5" height="5" rx="1" fill="#fff"/><rect x="9" y="7" width="5" height="5" rx="1" fill="#fff"/><line x1="7" y1="6.5" x2="9" y2="9.5" stroke="#fff" stroke-width="1"/></svg>
             </div>
             <div><div style="font-size:10px;font-weight:700;">Systems</div><div style="font-size:9px;color:#5a7a9a;">Architecture, performance, low-level</div></div>
           </div>
           <div style="background:#e0eaf4;border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
             <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#7c5cbf,#5c3caf);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
               <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="5" cy="8" r="2" fill="#fff"/><circle cx="11" cy="5" r="2" fill="#fff"/><circle cx="11" cy="11" r="2" fill="#fff"/><line x1="6.5" y1="7" x2="9.5" y2="5.5" stroke="#fff" stroke-width="0.8"/><line x1="6.5" y1="9" x2="9.5" y2="10.5" stroke="#fff" stroke-width="0.8"/></svg>
             </div>
             <div><div style="font-size:10px;font-weight:700;">AI / ML</div><div style="font-size:9px;color:#5a7a9a;">Machine learning, intelligent systems</div></div>
           </div>
         </div>
         <div style="margin-top:14px;font-size:10px;color:#8a9ab0;text-align:center;">This scene is a live demo &mdash; keep flipping to see how it works.</div>`) },

    { front: () => el({ background:'linear-gradient(160deg, #1a1410 0%, #2a1f18 40%, #3d2b1a 100%)', color:'#e8ddd3', padding:'0', textAlign:'center' },
        `<div style="padding:40px 28px;">
           <div style="margin-top:30px;width:80px;height:80px;margin:30px auto 0;border-radius:50%;background:radial-gradient(circle at 35% 35%, #f5ede1, #d4a574 60%, #8b6242);box-shadow:0 0 40px rgba(212,165,116,0.4);"></div>
           <div style="font-size:11px;letter-spacing:6px;margin-top:28px;color:#a89080;text-transform:uppercase;">Behind the Pixels</div>
           <div style="font-size:30px;font-weight:700;margin-top:10px;line-height:1.15;background:linear-gradient(180deg,#f5ede1,#d4a574);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">How This Scene Was Made</div>
           <div style="width:40px;height:1px;background:#d4a574;margin:20px auto;"></div>
           <div style="font-size:11px;color:#a89080;line-height:1.7;">Procedural Plants &bull; Soft Shadows<br>Day/Night Cycle &bull; Wind &bull; Parallax<br>3D Bone-Mesh Book &bull; HTML-in-Canvas</div>
           <div style="margin-top:30px;font-size:10px;color:#6b5a4a;letter-spacing:2px;">FLIP TO EXPLORE &rarr;</div>
         </div>`),
      back: () => el({ background:'#f5ede1', color:'#2a1f18', padding:'28px 24px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#8b6242;text-transform:uppercase;">Contents</div>
         <div style="margin-top:16px;font-size:19px;font-weight:700;line-height:1.3;">What you're looking at right now took zero image files.</div>
         <div style="margin-top:14px;font-size:11px;color:#6b5a4a;line-height:1.7;">Every leaf, every shadow, every color shift is computed in real time. This book will walk you through each layer.</div>
         <div style="margin-top:18px;display:flex;flex-direction:column;gap:8px;">
           <div style="display:flex;align-items:center;gap:10px;"><div style="width:22px;height:22px;border-radius:50%;background:#3d7c3a;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">1</div><div style="font-size:11px;font-weight:600;">L-Systems — Growing Digital Plants</div></div>
           <div style="display:flex;align-items:center;gap:10px;"><div style="width:22px;height:22px;border-radius:50%;background:#c4956a;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">2</div><div style="font-size:11px;font-weight:600;">Vogel Disk Shadows</div></div>
           <div style="display:flex;align-items:center;gap:10px;"><div style="width:22px;height:22px;border-radius:50%;background:#e8a840;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">3</div><div style="font-size:11px;font-weight:600;">Day & Night Cycle</div></div>
           <div style="display:flex;align-items:center;gap:10px;"><div style="width:22px;height:22px;border-radius:50%;background:#5b8fb9;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">4</div><div style="font-size:11px;font-weight:600;">Wind & Parallax</div></div>
           <div style="display:flex;align-items:center;gap:10px;"><div style="width:22px;height:22px;border-radius:50%;background:#7c5cbf;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">5</div><div style="font-size:11px;font-weight:600;">The 3D Book & Bone Mesh</div></div>
           <div style="display:flex;align-items:center;gap:10px;"><div style="width:22px;height:22px;border-radius:50%;background:#bf5c5c;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">6</div><div style="font-size:11px;font-weight:600;">HTML Rendered into Canvas</div></div>
         </div>`) },

    { front: () => el({ background:'#0c1a0c', color:'#c8e6c8', padding:'24px 22px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#3d7c3a;text-transform:uppercase;">Chapter 1</div>
         <div style="font-size:22px;font-weight:700;margin-top:8px;color:#7fcc7f;">L-Systems</div>
         <div style="font-size:12px;color:#5a9a5a;margin-top:4px;">Growing Plants with Grammar</div>
         <svg viewBox="0 0 280 220" style="width:100%;margin-top:12px;">
           <line x1="140" y1="220" x2="140" y2="160" stroke="#3d7c3a" stroke-width="3"/>
           <line x1="140" y1="160" x2="110" y2="110" stroke="#4a8f4a" stroke-width="2.5"/>
           <line x1="140" y1="160" x2="170" y2="110" stroke="#4a8f4a" stroke-width="2.5"/>
           <line x1="110" y1="110" x2="85" y2="65" stroke="#5aa05a" stroke-width="2"/>
           <line x1="110" y1="110" x2="125" y2="60" stroke="#5aa05a" stroke-width="2"/>
           <line x1="170" y1="110" x2="155" y2="60" stroke="#5aa05a" stroke-width="2"/>
           <line x1="170" y1="110" x2="195" y2="65" stroke="#5aa05a" stroke-width="2"/>
           <line x1="85" y1="65" x2="70" y2="30" stroke="#6bb06b" stroke-width="1.5"/>
           <line x1="85" y1="65" x2="95" y2="28" stroke="#6bb06b" stroke-width="1.5"/>
           <line x1="125" y1="60" x2="115" y2="25" stroke="#6bb06b" stroke-width="1.5"/>
           <line x1="125" y1="60" x2="138" y2="28" stroke="#6bb06b" stroke-width="1.5"/>
           <line x1="155" y1="60" x2="145" y2="25" stroke="#6bb06b" stroke-width="1.5"/>
           <line x1="155" y1="60" x2="168" y2="28" stroke="#6bb06b" stroke-width="1.5"/>
           <line x1="195" y1="65" x2="185" y2="30" stroke="#6bb06b" stroke-width="1.5"/>
           <line x1="195" y1="65" x2="210" y2="32" stroke="#6bb06b" stroke-width="1.5"/>
           <circle cx="70" cy="26" r="5" fill="#2d8a2d" opacity="0.7"/>
           <circle cx="95" cy="24" r="4" fill="#2d8a2d" opacity="0.7"/>
           <circle cx="115" cy="21" r="5" fill="#2d8a2d" opacity="0.6"/>
           <circle cx="138" cy="24" r="4" fill="#2d8a2d" opacity="0.7"/>
           <circle cx="145" cy="21" r="5" fill="#2d8a2d" opacity="0.6"/>
           <circle cx="168" cy="24" r="4" fill="#2d8a2d" opacity="0.7"/>
           <circle cx="185" cy="26" r="5" fill="#2d8a2d" opacity="0.7"/>
           <circle cx="210" cy="28" r="4" fill="#2d8a2d" opacity="0.6"/>
         </svg>
         <div style="font-size:11px;color:#5a9a5a;line-height:1.6;margin-top:8px;">In 1968, biologist Aristid Lindenmayer discovered you could describe how plants grow using simple text rules. We use this idea to generate every leaf you see.</div>`),
      back: () => el({ background:'#f0f7f0', color:'#1a2e1a', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#2d6b2d;">How it works</div>
         <div style="font-size:11px;color:#3d5a3d;margin-top:10px;line-height:1.6;">Start with a single instruction: <strong>F</strong> (draw forward). Then apply a rule over and over:</div>
         <div style="margin-top:12px;background:#dceadc;border-radius:8px;padding:12px;font-family:monospace;">
           <div style="font-size:10px;color:#6b8a6b;margin-bottom:6px;">RULE: F &rarr; F[+F]F[-F]F</div>
           <div style="font-size:10px;margin-top:8px;color:#2d6b2d;font-weight:700;">Step 0:</div>
           <div style="font-size:13px;letter-spacing:2px;color:#3d7c3a;">F</div>
           <div style="font-size:10px;margin-top:6px;color:#2d6b2d;font-weight:700;">Step 1:</div>
           <div style="font-size:10px;letter-spacing:1px;color:#3d7c3a;word-break:break-all;">F[+F]F[-F]F</div>
           <div style="font-size:10px;margin-top:6px;color:#2d6b2d;font-weight:700;">Step 2:</div>
           <div style="font-size:7px;letter-spacing:0.5px;color:#3d7c3a;word-break:break-all;">F[+F]F[-F]F[+F[+F]F[-F]F]F[+F]F[-F]F[-F[+F]F[-F]F]F[+F]F[-F]F</div>
         </div>
         <div style="margin-top:14px;font-size:11px;color:#3d5a3d;line-height:1.6;">Each <strong style="color:#2d6b2d;">[</strong> saves position, <strong style="color:#2d6b2d;">+/-</strong> turns, <strong style="color:#2d6b2d;">]</strong> returns. In just 4 iterations, a single letter becomes a full plant with hundreds of branches.</div>
         <div style="margin-top:10px;display:flex;gap:6px;justify-content:center;">
           <div style="width:8px;height:30px;background:#3d7c3a;border-radius:2px;"></div>
           <div style="width:8px;height:50px;background:#4a8f4a;border-radius:2px;margin-top:-20px;"></div>
           <div style="width:8px;height:70px;background:#5aa05a;border-radius:2px;margin-top:-40px;"></div>
           <div style="width:8px;height:90px;background:#6bb06b;border-radius:2px;margin-top:-60px;"></div>
         </div>`) },

    { front: () => el({ background:'#0c1a0c', color:'#c8e6c8', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#7fcc7f;">The Depth Trick</div>
         <div style="font-size:11px;color:#5a9a5a;margin-top:8px;line-height:1.6;">Each plant isn't just a shape — it carries a <em>depth map</em>. Leaves close to the wall get one value, leaves far away get another.</div>
         <svg viewBox="0 0 280 180" style="width:100%;margin-top:14px;">
           <defs>
             <linearGradient id="dg" x1="0" y1="0" x2="1" y2="0">
               <stop offset="0%" stop-color="#1a3a1a"/>
               <stop offset="100%" stop-color="#7fcc7f"/>
             </linearGradient>
           </defs>
           <rect x="10" y="10" width="260" height="30" rx="4" fill="url(#dg)"/>
           <text x="15" y="29" font-size="9" fill="#0c1a0c" font-weight="bold">CLOSE (sharp shadow)</text>
           <text x="190" y="29" font-size="9" fill="#0c1a0c" font-weight="bold">FAR (soft shadow)</text>
           <rect x="30" y="60" width="60" height="100" rx="4" fill="#1a3a1a" stroke="#3d7c3a" stroke-width="1"/>
           <text x="38" y="80" font-size="8" fill="#5a9a5a">depth:</text>
           <text x="38" y="95" font-size="16" fill="#7fcc7f" font-weight="bold">0.1</text>
           <text x="38" y="115" font-size="8" fill="#5a9a5a">Shadow:</text>
           <text x="38" y="130" font-size="10" fill="#7fcc7f" font-weight="bold">razor sharp</text>
           <rect x="110" y="60" width="60" height="100" rx="4" fill="#1a3a1a" stroke="#3d7c3a" stroke-width="1"/>
           <text x="118" y="80" font-size="8" fill="#5a9a5a">depth:</text>
           <text x="118" y="95" font-size="16" fill="#7fcc7f" font-weight="bold">0.5</text>
           <text x="118" y="115" font-size="8" fill="#5a9a5a">Shadow:</text>
           <text x="118" y="130" font-size="10" fill="#7fcc7f" font-weight="bold">medium</text>
           <rect x="190" y="60" width="60" height="100" rx="4" fill="#1a3a1a" stroke="#3d7c3a" stroke-width="1"/>
           <text x="198" y="80" font-size="8" fill="#5a9a5a">depth:</text>
           <text x="198" y="95" font-size="16" fill="#7fcc7f" font-weight="bold">0.9</text>
           <text x="198" y="115" font-size="8" fill="#5a9a5a">Shadow:</text>
           <text x="198" y="130" font-size="10" fill="#7fcc7f" font-weight="bold">very soft</text>
         </svg>
         <div style="font-size:11px;color:#5a9a5a;line-height:1.6;margin-top:10px;">This is how real plants cast shadows — stems touching the wall make crisp lines, while distant leaves make diffused blobs.</div>`),
      back: () => el({ background:'#1a1410', color:'#e8ddd3', padding:'24px 22px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#c4956a;text-transform:uppercase;">Chapter 2</div>
         <div style="font-size:22px;font-weight:700;margin-top:8px;color:#e8c9a0;">Vogel Disk Shadows</div>
         <div style="font-size:12px;color:#a89080;margin-top:4px;">64 Samples of Sunlight</div>
         <svg viewBox="0 0 280 200" style="width:100%;margin-top:12px;">
           <circle cx="140" cy="100" r="80" fill="none" stroke="#3d2b1a" stroke-width="1" stroke-dasharray="3,3"/>
           ${Array.from({length:64}, (_,i) => {
             const r = Math.sqrt(i/64) * 75;
             const a = i * 2.399963;
             const x = 140 + r * Math.cos(a);
             const y = 100 + r * Math.sin(a);
             const op = 0.3 + (i/64)*0.7;
             return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#d4a574" opacity="${op.toFixed(2)}"/>`;
           }).join('')}
           <circle cx="140" cy="100" r="4" fill="#e8c9a0"/>
           <text x="140" y="192" text-anchor="middle" font-size="9" fill="#a89080">Vogel Spiral — Golden Angle Spacing</text>
         </svg>
         <div style="font-size:11px;color:#a89080;line-height:1.6;margin-top:6px;">For every pixel on screen, the shader samples 64 points in this spiral pattern. Each sample checks: "Is there a plant here? How far is it from the wall?" The result: shadows that blur naturally with distance.</div>`) },

    { front: () => el({ background:'#f5ede1', color:'#2a1f18', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#8b6242;">How Soft Shadows Work</div>
         <div style="font-size:11px;color:#6b5a4a;margin-top:10px;line-height:1.6;">Each of those 64 spiral samples reads the plant texture and asks two questions:</div>
         <div style="margin-top:12px;background:#e8ddd3;border-radius:8px;padding:14px;">
           <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;">
             <div style="width:20px;height:20px;border-radius:50%;background:#c4956a;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">1</div>
             <div style="font-size:11px;line-height:1.5;"><strong>Is there a plant here?</strong><br>Red channel = presence (255 = yes)</div>
           </div>
           <div style="display:flex;align-items:flex-start;gap:8px;">
             <div style="width:20px;height:20px;border-radius:50%;background:#c4956a;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">2</div>
             <div style="font-size:11px;line-height:1.5;"><strong>How far from the wall?</strong><br>Green channel = depth (0 = touching, 255 = far)</div>
           </div>
         </div>
         <div style="margin-top:14px;font-size:11px;color:#6b5a4a;line-height:1.6;">The depth value controls the blur radius per sample. A <strong>smoothstep</strong> function decides if each spiral point contributes — close leaves accept only nearby samples (sharp), distant leaves accept wide ones (soft).</div>
         <div style="margin-top:12px;display:flex;gap:4px;align-items:flex-end;">
           ${Array.from({length:20}, (_,i) => {
             const h = 10 + Math.sin(i*0.4)*15 + i*2;
             const c = Math.round(140 + i*5);
             return `<div style="width:12px;height:${h}px;background:rgb(${c},${c-40},${c-80});border-radius:2px 2px 0 0;"></div>`;
           }).join('')}
         </div>`),
      back: () => el({ background:'#1a1410', color:'#e8ddd3', padding:'24px 22px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#e8a840;text-transform:uppercase;">Chapter 3</div>
         <div style="font-size:22px;font-weight:700;margin-top:8px;color:#f0c870;">Dawn to Dusk</div>
         <div style="font-size:12px;color:#a89080;margin-top:4px;">A Full Day in One Loop</div>
         <svg viewBox="0 0 280 160" style="width:100%;margin-top:14px;">
           <defs>
             <linearGradient id="sky" x1="0" y1="0" x2="1" y2="0">
               <stop offset="0%" stop-color="#1a1a3a"/>
               <stop offset="20%" stop-color="#c47030"/>
               <stop offset="40%" stop-color="#e8c880"/>
               <stop offset="60%" stop-color="#f0e8d0"/>
               <stop offset="80%" stop-color="#c47030"/>
               <stop offset="100%" stop-color="#2a1a3a"/>
             </linearGradient>
           </defs>
           <rect x="0" y="0" width="280" height="160" rx="6" fill="url(#sky)" opacity="0.3"/>
           <path d="M 10,130 Q 70,20 140,30 Q 210,20 270,130" stroke="#f0c870" stroke-width="2" fill="none" stroke-dasharray="4,3"/>
           <circle cx="30" cy="115" r="10" fill="#e8a840" opacity="0.6"/>
           <text x="30" y="140" text-anchor="middle" font-size="8" fill="#a89080">Dawn</text>
           <circle cx="140" cy="28" r="12" fill="#f0e8a0"/>
           <text x="140" y="18" text-anchor="middle" font-size="8" fill="#f0c870">Noon</text>
           <circle cx="250" cy="115" r="10" fill="#c45030" opacity="0.6"/>
           <text x="250" y="140" text-anchor="middle" font-size="8" fill="#a89080">Dusk</text>
           <line x1="10" y1="130" x2="270" y2="130" stroke="#3d2b1a" stroke-width="1"/>
         </svg>
         <div style="font-size:11px;color:#a89080;line-height:1.6;margin-top:10px;">The sun follows a sine curve across the sky. Its elevation drives <em>everything</em>: wall color, shadow direction, shadow intensity, even a golden-hour amber tint. One number — <strong>timeOfDay</strong> — controls the entire mood.</div>`) },

    { front: () => el({ background:'#1a1410', color:'#e8ddd3', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#f0c870;">The Wall Transforms</div>
         <div style="font-size:11px;color:#a89080;margin-top:8px;line-height:1.6;">Six keyframe colors blend smoothly as the day progresses:</div>
         <div style="margin-top:14px;display:flex;flex-direction:column;gap:6px;">
           <div style="display:flex;align-items:center;gap:10px;">
             <div style="width:40px;height:28px;border-radius:4px;background:#141428;border:1px solid #2a2a3a;"></div>
             <div><div style="font-size:10px;font-weight:700;">Midnight</div><div style="font-size:9px;color:#6b5a4a;">Deep blue-black stillness</div></div>
           </div>
           <div style="display:flex;align-items:center;gap:10px;">
             <div style="width:40px;height:28px;border-radius:4px;background:#d9ae80;border:1px solid #c49a6a;"></div>
             <div><div style="font-size:10px;font-weight:700;">Dawn</div><div style="font-size:9px;color:#6b5a4a;">Warm peach awakening</div></div>
           </div>
           <div style="display:flex;align-items:center;gap:10px;">
             <div style="width:40px;height:28px;border-radius:4px;background:#e1b98c;border:1px solid #c4a070;"></div>
             <div><div style="font-size:10px;font-weight:700;">Morning</div><div style="font-size:9px;color:#6b5a4a;">Classic cream sunlit wall</div></div>
           </div>
           <div style="display:flex;align-items:center;gap:10px;">
             <div style="width:40px;height:28px;border-radius:4px;background:#ebb870;border:1px solid #d0a060;"></div>
             <div><div style="font-size:10px;font-weight:700;">Golden Hour</div><div style="font-size:9px;color:#6b5a4a;">Amber glow, peak drama</div></div>
           </div>
           <div style="display:flex;align-items:center;gap:10px;">
             <div style="width:40px;height:28px;border-radius:4px;background:#594d70;border:1px solid #4a3f60;"></div>
             <div><div style="font-size:10px;font-weight:700;">Dusk</div><div style="font-size:9px;color:#6b5a4a;">Muted purple fade</div></div>
           </div>
           <div style="display:flex;align-items:center;gap:10px;">
             <div style="width:40px;height:28px;border-radius:4px;background:#faf0e0;border:1px solid #e0d4c0;"></div>
             <div><div style="font-size:10px;font-weight:700;">Noon</div><div style="font-size:9px;color:#6b5a4a;">Bright warm white</div></div>
           </div>
         </div>
         <div style="margin-top:12px;height:8px;border-radius:4px;background:linear-gradient(90deg, #141428, #d9ae80 20%, #e1b98c 35%, #faf0e0 50%, #ebb870 70%, #594d70 85%, #141428);"></div>`),
      back: () => el({ background:'#0a1628', color:'#c0d8f0', padding:'24px 22px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#5b8fb9;text-transform:uppercase;">Chapter 4</div>
         <div style="font-size:22px;font-weight:700;margin-top:8px;color:#88c0e8;">Wind & Parallax</div>
         <div style="font-size:12px;color:#6090b0;margin-top:4px;">Making Still Plants Breathe</div>
         <svg viewBox="0 0 280 140" style="width:100%;margin-top:14px;">
           <path d="M 0,70 Q 35,30 70,70 Q 105,110 140,70 Q 175,30 210,70 Q 245,110 280,70" stroke="#5b8fb9" stroke-width="2" fill="none"/>
           <path d="M 0,70 Q 35,45 70,70 Q 105,95 140,70 Q 175,45 210,70 Q 245,95 280,70" stroke="#88c0e8" stroke-width="1.5" fill="none" opacity="0.5"/>
           <text x="140" y="20" text-anchor="middle" font-size="9" fill="#6090b0">sin(uv.y * 3.0 + time * windSpeed)</text>
           <line x1="70" y1="75" x2="70" y2="130" stroke="#3a6a3a" stroke-width="2"/>
           <circle cx="70" cy="130" r="3" fill="#3a6a3a"/>
           <text x="70" y="125" text-anchor="middle" font-size="8" fill="#5b8fb9">leaf</text>
           <path d="M 68,75 L 58,60 M 72,80 L 82,65" stroke="#3a6a3a" stroke-width="1.5"/>
           <text x="140" y="135" text-anchor="middle" font-size="9" fill="#6090b0">Stronger at the top, still at the roots</text>
         </svg>
         <div style="font-size:11px;color:#6090b0;line-height:1.6;margin-top:10px;">Layered sine waves shift the UV lookup for each pixel. The strength scales with height — treetops sway while stems stay rooted. Three overlapping frequencies create organic, never-repeating movement.</div>`) },

    { front: () => el({ background:'#0a1628', color:'#c0d8f0', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#88c0e8;">Mouse Parallax</div>
         <div style="font-size:11px;color:#6090b0;margin-top:10px;line-height:1.6;">Move your mouse. The shadows shift. That's parallax — a tiny UV offset based on cursor position that fakes 3D depth on a flat screen.</div>
         <svg viewBox="0 0 280 200" style="width:100%;margin-top:12px;">
           <rect x="60" y="30" width="160" height="120" rx="6" fill="none" stroke="#2a4a6a" stroke-width="1.5"/>
           <text x="140" y="25" text-anchor="middle" font-size="8" fill="#5b8fb9">SCREEN</text>
           <circle cx="180" cy="70" r="6" fill="#88c0e8" opacity="0.8"/>
           <text x="190" y="68" font-size="8" fill="#88c0e8">cursor</text>
           <line x1="90" y1="80" x2="100" y2="80" stroke="#5b8fb9" stroke-width="1.5" stroke-dasharray="2,2"/>
           <rect x="80" y="65" width="15" height="45" rx="2" fill="#2a4a2a" opacity="0.4"/>
           <text x="87" y="130" text-anchor="middle" font-size="7" fill="#5b8fb9">plant</text>
           <rect x="92" y="68" width="15" height="45" rx="2" fill="#1a3a1a" opacity="0.6"/>
           <text x="99" y="130" text-anchor="middle" font-size="7" fill="#3d7c3a">shadow</text>
           <path d="M 180,76 L 99,85" stroke="#5b8fb9" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#arrowhead)"/>
           <text x="140" y="170" text-anchor="middle" font-size="9" fill="#6090b0">offset = mouse * 0.015 * depth</text>
           <text x="140" y="185" text-anchor="middle" font-size="8" fill="#4a7090">Deeper leaves shift more. Subtle but effective.</text>
         </svg>`),
      back: () => el({ background:'#1a0a28', color:'#d8c0f0', padding:'24px 22px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#7c5cbf;text-transform:uppercase;">Chapter 5</div>
         <div style="font-size:22px;font-weight:700;margin-top:8px;color:#b898e8;">The 3D Book</div>
         <div style="font-size:12px;color:#9070b0;margin-top:4px;">You're Holding a Bone Skeleton</div>
         <div style="margin-top:14px;font-size:11px;color:#9070b0;line-height:1.6;">This book you're flipping right now is a <strong style="color:#b898e8;">SkinnedMesh</strong> — the same tech used for 3D character animation in games. Each page has 31 bones chained together like a spine.</div>
         <svg viewBox="0 0 280 120" style="width:100%;margin-top:12px;">
           ${Array.from({length:16}, (_,i) => {
             const x = 15 + i * 17;
             const angle = Math.sin(i * 0.25) * 0.3;
             const y = 60 + Math.sin(i * 0.4) * 15;
             return `<rect x="${x}" y="${y-12}" width="14" height="24" rx="2" fill="#3a2a5a" stroke="#7c5cbf" stroke-width="1" transform="rotate(${(angle*30).toFixed(1)} ${x+7} ${y})"/>
                     <circle cx="${x}" cy="${y}" r="2.5" fill="#b898e8"/>`;
           }).join('')}
           <text x="140" y="110" text-anchor="middle" font-size="8" fill="#9070b0">Each box = one bone segment. They chain together like vertebrae.</text>
         </svg>
         <div style="font-size:11px;color:#9070b0;line-height:1.6;margin-top:6px;">Rotating each bone by a slightly different amount creates that natural page curl you see during flips.</div>`) },

    { front: () => el({ background:'#1a0a28', color:'#d8c0f0', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#b898e8;">Three Curves, One Flip</div>
         <div style="font-size:11px;color:#9070b0;margin-top:10px;line-height:1.6;">When a page turns, three mathematical curves work together:</div>
         <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">
           <div style="background:rgba(124,92,191,0.15);border-radius:8px;padding:10px;border-left:3px solid #9070d0;">
             <div style="font-size:11px;font-weight:700;color:#b898e8;">Inside Curve <span style="font-size:9px;color:#9070b0;">(bones 0-7)</span></div>
             <div style="font-size:10px;color:#9070b0;margin-top:4px;">sin(i * 0.2 + 0.25)</div>
             <div style="font-size:10px;color:#7a60a0;margin-top:2px;">Curls the spine edge — the part near the binding</div>
           </div>
           <div style="background:rgba(124,92,191,0.15);border-radius:8px;padding:10px;border-left:3px solid #7c5cbf;">
             <div style="font-size:11px;font-weight:700;color:#b898e8;">Outside Curve <span style="font-size:9px;color:#9070b0;">(bones 8-30)</span></div>
             <div style="font-size:10px;color:#9070b0;margin-top:4px;">cos(i * 0.3 + 0.09)</div>
             <div style="font-size:10px;color:#7a60a0;margin-top:2px;">Counter-bends the outer edge for realism</div>
           </div>
           <div style="background:rgba(124,92,191,0.15);border-radius:8px;padding:10px;border-left:3px solid #5c3caf;">
             <div style="font-size:11px;font-weight:700;color:#b898e8;">Turning Wave <span style="font-size:9px;color:#9070b0;">(all bones)</span></div>
             <div style="font-size:10px;color:#9070b0;margin-top:4px;">sin(i * PI / 31) * turningTime</div>
             <div style="font-size:10px;color:#7a60a0;margin-top:2px;">A ripple that peaks mid-flip then vanishes</div>
           </div>
         </div>
         <div style="margin-top:10px;font-size:10px;color:#7a60a0;text-align:center;">Combined with exponential damping for buttery animation</div>`),
      back: () => el({ background:'#f5ede1', color:'#2a1f18', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#8b6242;">Skin Weights</div>
         <div style="font-size:11px;color:#6b5a4a;margin-top:10px;line-height:1.6;">Every vertex in the page geometry knows which two bones control it, and how much.</div>
         <svg viewBox="0 0 280 130" style="width:100%;margin-top:12px;">
           <rect x="10" y="30" width="260" height="60" rx="4" fill="#e8ddd3" stroke="#c4956a" stroke-width="1"/>
           ${Array.from({length:10}, (_,i) => {
             const x = 10 + i * 26;
             const pct = (i % 10) / 10;
             return `<line x1="${x}" y1="30" x2="${x}" y2="90" stroke="#c4956a" stroke-width="0.5" stroke-dasharray="2,2"/>
                     <rect x="${x}" y="${50 - pct*18}" width="26" height="${pct*18 + 2}" fill="rgba(196,149,106,${0.2+pct*0.6})" />`;
           }).join('')}
           <text x="20" y="110" font-size="8" fill="#8b6242">Bone N: 95%</text>
           <text x="120" y="110" font-size="8" fill="#8b6242">50/50</text>
           <text x="220" y="110" font-size="8" fill="#8b6242">Bone N+1: 95%</text>
           <text x="140" y="25" text-anchor="middle" font-size="8" fill="#6b5a4a">Linear weight blend across each segment</text>
         </svg>
         <div style="font-size:11px;color:#6b5a4a;line-height:1.6;margin-top:8px;">At segment boundaries, a vertex is 100% controlled by one bone. In between, control fades linearly to the next bone. This creates smooth bending instead of hard creases.</div>`) },

    { front: () => el({ background:'#2a0a0a', color:'#f0c8c8', padding:'24px 22px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#bf5c5c;text-transform:uppercase;">Chapter 6</div>
         <div style="font-size:22px;font-weight:700;margin-top:8px;color:#e88888;">HTML in Canvas</div>
         <div style="font-size:12px;color:#b07070;margin-top:4px;">The Weirdest Trick in Web Dev</div>
         <div style="margin-top:14px;font-size:11px;color:#b07070;line-height:1.6;">These pages you're reading? They started as regular HTML — the same tech behind every website. But WebGL can't render HTML. So how did it get here?</div>
         <div style="margin-top:14px;display:flex;flex-direction:column;gap:6px;align-items:center;">
           <div style="background:#3a1a1a;border:1px solid #5a2a2a;border-radius:6px;padding:8px 14px;font-size:10px;width:85%;text-align:center;">
             <div style="color:#e88888;font-weight:700;">Step 1</div>
             <div style="color:#b07070;">Write the page as HTML + CSS</div>
           </div>
           <div style="font-size:14px;color:#5a2a2a;">&darr;</div>
           <div style="background:#3a1a1a;border:1px solid #5a2a2a;border-radius:6px;padding:8px 14px;font-size:10px;width:85%;text-align:center;">
             <div style="color:#e88888;font-weight:700;">Step 2</div>
             <div style="color:#b07070;">Wrap in SVG foreignObject</div>
           </div>
           <div style="font-size:14px;color:#5a2a2a;">&darr;</div>
           <div style="background:#3a1a1a;border:1px solid #5a2a2a;border-radius:6px;padding:8px 14px;font-size:10px;width:85%;text-align:center;">
             <div style="color:#e88888;font-weight:700;">Step 3</div>
             <div style="color:#b07070;">Encode as data:image/svg+xml URL</div>
           </div>
           <div style="font-size:14px;color:#5a2a2a;">&darr;</div>
           <div style="background:#3a1a1a;border:1px solid #5a2a2a;border-radius:6px;padding:8px 14px;font-size:10px;width:85%;text-align:center;">
             <div style="color:#e88888;font-weight:700;">Step 4</div>
             <div style="color:#b07070;">drawImage onto Canvas &rarr; WebGL Texture</div>
           </div>
         </div>`),
      back: () => el({ background:'#f5ede1', color:'#2a1f18', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#bf5c5c;">The foreignObject Trick</div>
         <div style="font-size:11px;color:#6b5a4a;margin-top:10px;line-height:1.6;">SVG has a secret superpower: the <strong>&lt;foreignObject&gt;</strong> tag can embed full HTML inside an SVG. And SVGs can be loaded as images. So:</div>
         <div style="margin-top:12px;background:#e8ddd3;border-radius:8px;padding:12px;font-family:monospace;font-size:8px;color:#5a3a3a;line-height:1.6;overflow:hidden;">
           &lt;svg&gt;<br>
           &nbsp;&nbsp;&lt;foreignObject&gt;<br>
           &nbsp;&nbsp;&nbsp;&nbsp;&lt;div style="..."&gt;<br>
           &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Any HTML here!<br>
           &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Buttons, text, layouts...<br>
           &nbsp;&nbsp;&nbsp;&nbsp;&lt;/div&gt;<br>
           &nbsp;&nbsp;&lt;/foreignObject&gt;<br>
           &lt;/svg&gt;
         </div>
         <div style="margin-top:12px;font-size:11px;color:#6b5a4a;line-height:1.6;">The browser rasterizes all that HTML into pixels. We draw those pixels onto a Canvas. That Canvas becomes a texture mapped onto the 3D bone mesh. <strong>No screenshots. No images. Pure code.</strong></div>
         <div style="margin-top:12px;text-align:center;">
           <div style="display:inline-block;background:#bf5c5c;color:#fff;padding:6px 16px;border-radius:20px;font-size:10px;font-weight:600;">HTML &rarr; SVG &rarr; Canvas &rarr; WebGL</div>
         </div>`) },

    { front: () => el({ background:'#0a0a1e', color:'#c8c8f0', padding:'24px 22px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#6060bf;text-transform:uppercase;">Chapter 7</div>
         <div style="font-size:22px;font-weight:700;margin-top:8px;color:#a0a0e8;">Light & Reflection</div>
         <div style="font-size:12px;color:#7070a0;margin-top:4px;">PBR Materials on Paper</div>
         <div style="margin-top:14px;font-size:11px;color:#7070a0;line-height:1.6;">Each page uses <strong style="color:#a0a0e8;">MeshStandardMaterial</strong> — the same physically-based rendering used in AAA games. Two key properties:</div>
         <div style="margin-top:14px;display:flex;gap:10px;">
           <div style="flex:1;background:#1a1a3a;border-radius:8px;padding:12px;text-align:center;">
             <div style="width:50px;height:50px;margin:0 auto;border-radius:50%;background:radial-gradient(circle at 30% 30%, #e0e0ff, #6060a0 60%, #2a2a5a);"></div>
             <div style="font-size:10px;font-weight:700;margin-top:8px;color:#a0a0e8;">Roughness: 0.1</div>
             <div style="font-size:9px;color:#7070a0;margin-top:2px;">Inner pages — glossy, catches light</div>
           </div>
           <div style="flex:1;background:#1a1a3a;border-radius:8px;padding:12px;text-align:center;">
             <div style="width:50px;height:50px;margin:0 auto;border-radius:50%;background:radial-gradient(circle at 40% 40%, #b0b0c0, #707088 70%, #3a3a4a);"></div>
             <div style="font-size:10px;font-weight:700;margin-top:8px;color:#a0a0e8;">Roughness: 0.8</div>
             <div style="font-size:9px;color:#7070a0;margin-top:2px;">Cover pages — matte, like cardboard</div>
           </div>
         </div>
         <div style="margin-top:14px;font-size:11px;color:#7070a0;line-height:1.6;">The <strong style="color:#a0a0e8;">RoomEnvironment</strong> map wraps the scene in a virtual room, giving the glossy pages something to reflect. That faint sheen you see? Real-time reflections.</div>`),
      back: () => el({ background:'#0a0a1e', color:'#c8c8f0', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#a0a0e8;">The Orange Glow</div>
         <div style="font-size:11px;color:#7070a0;margin-top:10px;line-height:1.6;">Hover over a page. See it glow? That's the <strong style="color:#e8a040;">emissive</strong> property — the material literally emits light.</div>
         <div style="margin-top:14px;display:flex;align-items:center;gap:14px;justify-content:center;">
           <div style="text-align:center;">
             <div style="width:60px;height:80px;border-radius:4px;background:#2a2a3a;border:1px solid #4a4a6a;"></div>
             <div style="font-size:9px;color:#7070a0;margin-top:4px;">Normal</div>
           </div>
           <div style="font-size:16px;color:#7070a0;">&rarr;</div>
           <div style="text-align:center;">
             <div style="width:60px;height:80px;border-radius:4px;background:#3a2a1a;border:1px solid #e8a040;box-shadow:0 0 15px rgba(232,160,64,0.4);"></div>
             <div style="font-size:9px;color:#e8a040;margin-top:4px;">Hovered</div>
           </div>
         </div>
         <div style="margin-top:16px;font-size:11px;color:#7070a0;line-height:1.6;">The intensity smoothly lerps from 0 to 0.22 — fast enough to feel responsive, slow enough to feel organic. A tiny detail that makes the whole thing feel alive.</div>
         <div style="margin-top:14px;background:#1a1a3a;border-radius:8px;padding:10px;font-family:monospace;font-size:9px;color:#7070a0;">
           emissiveIntensity = lerp(current, target, 0.1)
         </div>`) },

    { front: () => el({ background:'#f5ede1', color:'#2a1f18', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#5b4a8a;">Orbit & Float</div>
         <div style="font-size:11px;color:#6b5a4a;margin-top:10px;line-height:1.6;">The book lives in a <strong>Three.js</strong> scene with a free camera. Drag the background to orbit around it. Scroll to zoom.</div>
         <svg viewBox="0 0 280 160" style="width:100%;margin-top:12px;">
           <ellipse cx="140" cy="90" rx="100" ry="40" fill="none" stroke="#8b6242" stroke-width="1" stroke-dasharray="4,3"/>
           <rect x="118" y="65" width="44" height="50" rx="4" fill="#d4a574" stroke="#8b6242" stroke-width="1.5"/>
           <text x="140" y="94" text-anchor="middle" font-size="9" fill="#5a3a1a" font-weight="bold">BOOK</text>
           <circle cx="55" cy="70" r="8" fill="#5b4a8a" opacity="0.8"/>
           <text x="55" y="60" text-anchor="middle" font-size="8" fill="#5b4a8a">cam</text>
           <path d="M 55,78 Q 55,120 100,120" stroke="#5b4a8a" stroke-width="1" fill="none" stroke-dasharray="2,2" marker-end="url(#a2)"/>
         </svg>
         <div style="margin-top:10px;font-size:11px;color:#6b5a4a;line-height:1.6;">The <strong>Float</strong> animation adds gentle sine-wave bobbing on top — the book breathes even when you don't touch it. Two nested groups keep the base tilt separate from the oscillation.</div>
         <div style="margin-top:10px;background:#e8ddd3;border-radius:8px;padding:8px 12px;font-family:monospace;font-size:8px;color:#6b5a4a;">
           y = sin(t * 0.5) / 10<br>
           rotX = cos(t * 0.5) / 4<br>
           rotZ = sin(t * 0.45) / 10
         </div>`),
      back: () => el({ background:'#0a1a0a', color:'#c8e8c8', padding:'24px 22px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#4a8f4a;text-transform:uppercase;">Chapter 8</div>
         <div style="font-size:22px;font-weight:700;margin-top:8px;color:#7fcc7f;">Two Renderers,<br>One Screen</div>
         <div style="font-size:11px;color:#5a9a5a;margin-top:12px;line-height:1.6;">Here's the wild part: there are <strong>two completely separate WebGL renderers</strong> running simultaneously on this page.</div>
         <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
           <div style="background:rgba(61,124,58,0.15);border-radius:8px;padding:10px;border:1px solid #2a5a2a;">
             <div style="font-size:11px;font-weight:700;color:#7fcc7f;">Layer 1: OGL</div>
             <div style="font-size:10px;color:#5a9a5a;margin-top:4px;line-height:1.5;">A lightweight WebGL library renders the plant shadows, wall colors, wind, and parallax as a fullscreen fragment shader.</div>
           </div>
           <div style="text-align:center;font-size:12px;color:#3d7c3a;">+ transparent overlay</div>
           <div style="background:rgba(61,124,58,0.15);border-radius:8px;padding:10px;border:1px solid #2a5a2a;">
             <div style="font-size:11px;font-weight:700;color:#7fcc7f;">Layer 2: Three.js</div>
             <div style="font-size:10px;color:#5a9a5a;margin-top:4px;line-height:1.5;">A full 3D engine renders the book with bones, shadows, PBR materials, and orbit controls. Its canvas is transparent so the wall shows through.</div>
           </div>
         </div>
         <div style="margin-top:10px;font-size:10px;color:#3d7c3a;text-align:center;">Both share the same timeOfDay for synchronized lighting.</div>`) },

    { front: () => el({ background:'#1a1410', color:'#e8ddd3', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#d4a574;">The Book's Shadow</div>
         <div style="font-size:11px;color:#a89080;margin-top:10px;line-height:1.6;">The book casts a real shadow onto a hidden wall behind it. The directional light moves along the same sun path as the plant shadows:</div>
         <div style="margin-top:12px;background:#2a1f18;border-radius:8px;padding:12px;font-family:monospace;font-size:9px;color:#a89080;line-height:1.7;">
           azimuth = lerp(-1.2, 1.2, timeOfDay)<br>
           elevation = max(sin(sunAngle), 0.08)<br><br>
           light.x = sin(azimuth) * 5<br>
           light.y = elevation * 5 + 1<br><br>
           intensity = 0.3 + visibility * 2.5
         </div>
         <div style="margin-top:12px;font-size:11px;color:#a89080;line-height:1.6;">At dawn, the light comes from the left and casts long shadows to the right. At noon, it's overhead with short shadows. At dusk, everything reverses. The book and plants live in the same sun.</div>`),
      back: () => el({ background:'linear-gradient(180deg, #1a1410 0%, #2a1f18 100%)', color:'#e8ddd3', padding:'24px 22px' },
        `<div style="font-size:10px;letter-spacing:4px;color:#d4a574;text-transform:uppercase;">The Full Stack</div>
         <div style="font-size:16px;font-weight:700;margin-top:10px;color:#f0dcc8;">Everything Running at Once</div>
         <div style="margin-top:14px;display:flex;flex-direction:column;gap:5px;font-size:10px;">
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#3d7c3a;flex-shrink:0;"></div><span style="color:#a89080;">L-System string expansion (4 iterations)</span></div>
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#5aa05a;flex-shrink:0;"></div><span style="color:#a89080;">Turtle renderer &rarr; Canvas2D with depth map</span></div>
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#c4956a;flex-shrink:0;"></div><span style="color:#a89080;">Vogel Disk shadow sampling (64 points)</span></div>
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#e8a840;flex-shrink:0;"></div><span style="color:#a89080;">Day/night wall color blending (6 keyframes)</span></div>
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#5b8fb9;flex-shrink:0;"></div><span style="color:#a89080;">3-layer sine wind + mouse parallax</span></div>
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#7c5cbf;flex-shrink:0;"></div><span style="color:#a89080;">31-bone SkinnedMesh per page (248 bones total)</span></div>
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#bf5c5c;flex-shrink:0;"></div><span style="color:#a89080;">SVG foreignObject &rarr; Canvas &rarr; WebGL texture</span></div>
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#a0a0e8;flex-shrink:0;"></div><span style="color:#a89080;">PBR materials + RoomEnvironment reflections</span></div>
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#e8a040;flex-shrink:0;"></div><span style="color:#a89080;">Dynamic shadow casting synced to sun path</span></div>
           <div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#d4a574;flex-shrink:0;"></div><span style="color:#a89080;">OrbitControls + Float animation + drag-to-flip</span></div>
         </div>
         <div style="margin-top:14px;text-align:center;font-size:10px;color:#6b5a4a;">All running at 60fps. Zero image files. Pure math and code.</div>`) },

    { front: () => el({ background:'#f5ede1', color:'#2a1f18', padding:'24px 22px' },
        `<div style="font-size:14px;font-weight:700;color:#8b6242;">No Dependencies*</div>
         <div style="font-size:10px;color:#a89080;margin-top:2px;">*well, almost</div>
         <div style="font-size:11px;color:#6b5a4a;margin-top:14px;line-height:1.6;">This entire scene ships with just two libraries and vanilla JavaScript:</div>
         <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
           <div style="background:#e8ddd3;border-radius:8px;padding:12px;">
             <div style="font-size:12px;font-weight:700;color:#2a1f18;">OGL</div>
             <div style="font-size:10px;color:#6b5a4a;margin-top:2px;">Minimal WebGL library (the plant shadow layer)</div>
             <div style="font-size:9px;color:#a89080;margin-top:4px;">Renderer, Program, Mesh, Texture, Triangle</div>
           </div>
           <div style="background:#e8ddd3;border-radius:8px;padding:12px;">
             <div style="font-size:12px;font-weight:700;color:#2a1f18;">Three.js</div>
             <div style="font-size:10px;color:#6b5a4a;margin-top:2px;">3D engine (the book layer)</div>
             <div style="font-size:9px;color:#a89080;margin-top:4px;">SkinnedMesh, Bone, Skeleton, OrbitControls, PMREMGenerator</div>
           </div>
         </div>
         <div style="margin-top:14px;font-size:11px;color:#6b5a4a;line-height:1.6;">No React. No build step. No bundler. Just ES modules loaded via import maps. Open the source — it's all readable.</div>`),
      back: () => el({ background:'linear-gradient(160deg, #1a1410 0%, #2a1f18 40%, #3d2b1a 100%)', color:'#e8ddd3', padding:'0', textAlign:'center' },
        `<div style="padding:40px 28px;">
           <div style="margin-top:40px;font-size:11px;letter-spacing:6px;color:#6b5a4a;text-transform:uppercase;">Crafted with</div>
           <div style="font-size:32px;font-weight:700;margin-top:12px;background:linear-gradient(180deg,#f5ede1,#d4a574);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Curiosity</div>
           <div style="width:40px;height:1px;background:#d4a574;margin:20px auto;"></div>
           <div style="font-size:11px;color:#a89080;line-height:1.7;">Every shader, every bone curve,<br>every pixel on these pages —<br>built from scratch with<br>math, code, and obsession.</div>
           <div style="margin-top:30px;width:60px;height:60px;margin:0 auto;border-radius:50%;background:radial-gradient(circle at 35% 35%, #f5ede1, #d4a574 60%, #8b6242);box-shadow:0 0 30px rgba(212,165,116,0.3);"></div>
           <div style="margin-top:16px;font-size:9px;color:#6b5a4a;letter-spacing:2px;">&larr; FLIP BACK TO START</div>
         </div>`) },
];

class Page {
    constructor(number, frontTex, backTex, totalPages) {
        this.number = number;
        this.totalPages = totalPages;
        this.opened = false;
        this.bookClosed = true;
        this.highlighted = false;
        this.turnedAt = 0;
        this.lastOpened = false;
        this.dragTarget = undefined;

        const frontMat = new THREE.MeshStandardMaterial({
            color: whiteColor, map: frontTex,
            roughness: number === 0 ? 0.8 : 0.1,
            emissive: emissiveColor, emissiveIntensity: 0,
        });
        const backMat = new THREE.MeshStandardMaterial({
            color: whiteColor, map: backTex,
            roughness: number === totalPages - 1 ? 0.8 : 0.1,
            emissive: emissiveColor, emissiveIntensity: 0,
        });

        const materials = [...pageMaterials, frontMat, backMat];

        const bones = [];
        for (let i = 0; i <= PAGE_SEGMENTS; i++) {
            const bone = new THREE.Bone();
            bone.position.x = i === 0 ? 0 : SEGMENT_WIDTH;
            if (i > 0) bones[i - 1].add(bone);
            bones.push(bone);
        }
        const skeleton = new THREE.Skeleton(bones);

        this.mesh = new THREE.SkinnedMesh(pageGeometry, materials);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.frustumCulled = false;
        this.mesh.add(skeleton.bones[0]);
        this.mesh.bind(skeleton);

        this.group = new THREE.Group();
        this.group.add(this.mesh);

        this.frontMat = frontMat;
        this.backMat = backMat;
    }

    setPage(delayedPage) {
        this.opened = delayedPage > this.number;
        this.bookClosed = delayedPage === 0 || delayedPage === this.totalPages;

        if (this.lastOpened !== this.opened) {
            this.turnedAt = +new Date();
            this.lastOpened = this.opened;
        }

        this.mesh.position.z = -this.number * PAGE_DEPTH + delayedPage * PAGE_DEPTH;
    }

    update(delta) {
        const ei = this.highlighted ? 0.22 : 0;
        this.frontMat.emissiveIntensity =
        this.backMat.emissiveIntensity = THREE.MathUtils.lerp(
            this.frontMat.emissiveIntensity, ei, 0.1
        );

        let turningTime = Math.min(400, new Date() - this.turnedAt) / 400;
        turningTime = Math.sin(turningTime * Math.PI);

        let targetRotation;
        let bookClosed = this.bookClosed;

        if (this.dragTarget !== undefined) {
            targetRotation = this.dragTarget;
            bookClosed = false;
        } else {
            targetRotation = this.opened ? -Math.PI / 2 : Math.PI / 2;
            if (!bookClosed) {
                targetRotation += degToRad(this.number * 0.8);
            }
        }

        const bones = this.mesh.skeleton.bones;
        for (let i = 0; i < bones.length; i++) {
            const target = i === 0 ? this.group : bones[i];

            const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
            const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
            const turningIntensity = Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;

            let rotationAngle =
                insideCurveStrength * insideCurveIntensity * targetRotation -
                outsideCurveStrength * outsideCurveIntensity * targetRotation +
                turningCurveStrength * turningIntensity * targetRotation;

            let foldRotationAngle = degToRad(Math.sin(targetRotation) * 2);

            if (bookClosed) {
                if (i === 0) {
                    rotationAngle = targetRotation;
                    foldRotationAngle = 0;
                } else {
                    rotationAngle = 0;
                    foldRotationAngle = 0;
                }
            }

            dampAngle(target.rotation, 'y', rotationAngle, easingFactor, delta);

            const foldIntensity = i > 8
                ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
                : 0;
            dampAngle(target.rotation, 'x', foldRotationAngle * foldIntensity, easingFactorFold, delta);
        }
    }
}

class Book {
    constructor(params) {
        this.params = params;
        this.page = 0;
        this.delayedPage = 0;
        this.pages = [];
        this.timeout = null;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.hoveredPage = null;
    }

    async init() {

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:10;pointer-events:all;';
        document.body.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(this.renderer)).texture;
        pmremGenerator.dispose();

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(-0.5, 1, 4);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.set(2048, 2048);
        this.dirLight.shadow.camera.left = -5;
        this.dirLight.shadow.camera.right = 5;
        this.dirLight.shadow.camera.top = 5;
        this.dirLight.shadow.camera.bottom = -5;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 20;
        this.dirLight.shadow.bias = -0.0001;
        this.scene.add(this.dirLight);
        this.scene.add(this.dirLight.target);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        const shadowWall = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 15),
            new THREE.ShadowMaterial({ transparent: true, opacity: 0.3 })
        );
        shadowWall.position.set(0, 0, -2);
        shadowWall.receiveShadow = true;
        this.scene.add(shadowWall);

        this.outerGroup = new THREE.Group();
        this.outerGroup.rotation.x = -Math.PI / 4;
        this.outerGroup.rotation.y = Math.PI;
        this.scene.add(this.outerGroup);

        this.float = new THREE.Group();
        this.outerGroup.add(this.float);

        this.root = new THREE.Group();
        this.root.rotation.y = Math.PI / 2;
        this.float.add(this.root);

        await this.buildPages();

        this.setupInput();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.buildUI();

        window.addEventListener('resize', () => this.onResize());
        this.clock = new THREE.Clock();
        this.onResize();
        this.animate();
    }

    async buildPages() {
        for (let i = 0; i < pageContents.length; i++) {
            const [fc, bc] = await Promise.all([
                renderHtmlToCanvas(pageContents[i].front()),
                renderHtmlToCanvas(pageContents[i].back()),
            ]);
            const ft = new THREE.CanvasTexture(fc);
            ft.colorSpace = THREE.SRGBColorSpace;
            ft.minFilter = THREE.LinearFilter;
            ft.generateMipmaps = false;
            const bt = new THREE.CanvasTexture(bc);
            bt.colorSpace = THREE.SRGBColorSpace;
            bt.minFilter = THREE.LinearFilter;
            bt.generateMipmaps = false;

            const p = new Page(i, ft, bt, pageContents.length);
            p.setPage(0);
            this.pages.push(p);
            this.root.add(p.group);
        }
    }

    setupInput() {
        const c = this.renderer.domElement;
        let dragPage = null;
        let dragStartX = 0;
        let dragStartOpened = false;
        let dragged = false;
        let currentProgress = 0;

        const updateMouse = (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };

        const hitTest = () => {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const hits = this.raycaster.intersectObjects(this.pages.map(p => p.mesh), false);
            if (hits.length === 0) return null;
            return this.pages.find(p => p.mesh === hits[0].object) || null;
        };

        c.addEventListener('pointerdown', (e) => {
            updateMouse(e);
            const hit = hitTest();
            if (!hit) return;

            dragPage = hit;
            dragStartX = e.clientX;
            dragStartOpened = hit.opened;
            dragged = false;
            currentProgress = dragStartOpened ? 1 : 0;

            this.controls.enabled = false;
            c.setPointerCapture(e.pointerId);
        });

        c.addEventListener('pointermove', (e) => {
            updateMouse(e);

            if (!dragPage) {
                const hit = hitTest();
                const prev = this.hoveredPage;
                this.hoveredPage = null;
                if (hit) {
                    this.hoveredPage = hit;
                    hit.highlighted = true;
                    c.style.cursor = 'pointer';
                }
                if (prev && prev !== this.hoveredPage) prev.highlighted = false;
                if (!this.hoveredPage) c.style.cursor = 'default';
                return;
            }

            const dx = e.clientX - dragStartX;
            if (!dragged && Math.abs(dx) > 5) {
                dragged = true;
                c.style.cursor = 'grabbing';
            }
            if (!dragged) return;

            const maxDrag = window.innerWidth * 0.3;
            let progress;
            if (dragStartOpened) {
                progress = 1 - dx / maxDrag;
            } else {
                progress = -dx / maxDrag;
            }
            progress = Math.max(0, Math.min(1, progress));
            currentProgress = progress;

            dragPage.dragTarget = THREE.MathUtils.lerp(Math.PI / 2, -Math.PI / 2, progress);
        });

        c.addEventListener('pointerup', (e) => {
            if (!dragPage) return;

            if (dragged) {
                if (currentProgress > 0.5) {
                    if (!dragStartOpened) this.setPage(dragPage.number + 1);
                } else {
                    if (dragStartOpened) this.setPage(dragPage.number);
                }
                dragPage.dragTarget = undefined;
                c.style.cursor = 'default';
            } else {
                this.setPage(dragPage.opened ? dragPage.number : dragPage.number + 1);
                dragPage.highlighted = false;
            }

            this.controls.enabled = true;
            c.releasePointerCapture(e.pointerId);
            dragPage = null;
            dragged = false;
        });
    }

    setPage(target) {
        this.page = Math.max(0, Math.min(target, this.pages.length));
        this.updateBtns();

        clearTimeout(this.timeout);
        const go = () => {
            if (this.page === this.delayedPage) return;
            if (this.page > this.delayedPage) this.delayedPage++;
            else this.delayedPage--;

            for (const p of this.pages) p.setPage(this.delayedPage);

            const delay = Math.abs(this.page - this.delayedPage) > 2 ? 50 : 150;
            this.timeout = setTimeout(go, delay);
        };
        go();
    }

    syncLighting() {
        const tod = this.params.timeOfDay;
        const TAU = Math.PI * 2;

        const sunAngle = (tod - 0.25) * TAU;
        const azimuth = THREE.MathUtils.lerp(-1.2, 1.2, tod);
        const elevation = Math.max(Math.sin(sunAngle), 0.08);

        const vis = smoothstep(0.30, 0.38, tod) * smoothstep(0.70, 0.62, tod);

        const goldenFactor = smoothstep(0.0, 0.3, elevation) * smoothstep(0.7, 0.3, elevation);

        this.dirLight.position.set(
            Math.sin(azimuth) * 5,
            elevation * 5 + 1,
            3
        );

        this.dirLight.intensity = 0.3 + vis * 2.5;

        const warmth = goldenFactor * 0.3;
        this.dirLight.color.setRGB(1, 1 - warmth * 0.3, 1 - warmth * 0.7);

        this.ambientLight.intensity = 0.2 + vis * 0.5;
    }

    buildUI() {
        const nav = document.createElement('div');
        nav.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:20;display:flex;justify-content:center;pointer-events:none;';

        const inner = document.createElement('div');
        inner.style.cssText = 'display:flex;align-items:center;gap:16px;overflow-x:auto;max-width:90vw;padding:24px 40px;pointer-events:all;';

        this.btns = [];
        const total = this.pages.length;
        for (let i = 0; i <= total; i++) {
            const b = document.createElement('button');
            b.textContent = i === 0 ? 'Cover' : i === total ? 'Back Cover' : `Page ${i}`;
            b.style.cssText = 'background:rgba(0,0,0,0.3);color:#fff;border:1px solid transparent;padding:12px 16px;border-radius:999px;font:14px/1 -apple-system,system-ui,sans-serif;cursor:pointer;white-space:nowrap;transition:all 0.3s;text-transform:uppercase;flex-shrink:0;';
            b.addEventListener('mouseenter', () => { if (i !== this.page) b.style.borderColor = 'rgba(255,255,255,0.5)'; });
            b.addEventListener('mouseleave', () => b.style.borderColor = 'transparent');
            b.addEventListener('click', () => this.setPage(i));
            inner.appendChild(b);
            this.btns.push(b);
        }
        nav.appendChild(inner);
        document.body.appendChild(nav);
        this.nav = nav;

        const tog = document.createElement('button');
        tog.textContent = 'Hide Book';
        tog.style.cssText = 'position:fixed;top:14px;left:14px;z-index:20;background:rgba(24,24,28,0.85);backdrop-filter:blur(8px);color:#e0e0e0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 14px;font:12px/1 -apple-system,system-ui,sans-serif;cursor:pointer;';
        let vis = true;
        tog.addEventListener('click', () => {
            vis = !vis;
            this.renderer.domElement.style.display = vis ? '' : 'none';
            nav.style.display = vis ? '' : 'none';
            tog.textContent = vis ? 'Hide Book' : 'Show Book';
        });
        document.body.appendChild(tog);

        this.updateBtns();
    }

    updateBtns() {
        for (let i = 0; i < this.btns.length; i++) {
            const active = i === this.page;
            this.btns[i].style.background = active ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.3)';
            this.btns[i].style.color = active ? '#000' : '#fff';
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        const t = this.clock.getElapsedTime();

        const speed = 2;
        const rotI = 2;
        const floatI = 1;
        const tt = (t / 4) * speed;
        this.float.rotation.x = (Math.cos(tt) / 8) * rotI;
        this.float.rotation.y = (Math.sin(tt) / 8) * rotI;
        this.float.rotation.z = (Math.sin(tt) / 20) * rotI;
        this.float.position.y = (Math.sin(tt) / 10) * floatI;

        for (const p of this.pages) p.update(delta);

        this.syncLighting();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export async function initBook(params) {
    const book = new Book(params);
    await book.init();
}
