export function createControls(params, onChange) {
    const panel = document.createElement('div');
    panel.id = 'dev-controls';
    document.body.appendChild(panel);

    const style = document.createElement('style');
    style.textContent = `
        #dev-controls {
            position: fixed;
            top: 12px;
            right: 12px;
            width: 280px;
            max-height: calc(100vh - 24px);
            overflow-y: auto;
            background: rgba(24, 24, 28, 0.92);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 10px;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
            font-size: 12px;
            color: #e0e0e0;
            z-index: 1000;
            box-shadow: 0 4px 24px rgba(0,0,0,0.3);
            user-select: none;
        }
        #dev-controls.collapsed > .dc-body { display: none; }
        .dc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .dc-header:hover { background: rgba(255,255,255,0.04); }
        .dc-header h2 {
            margin: 0;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .dc-toggle-arrow {
            font-size: 10px;
            opacity: 0.5;
            transition: transform 0.2s;
        }
        #dev-controls.collapsed .dc-toggle-arrow { transform: rotate(-90deg); }
        .dc-body { padding: 6px 0; }
        .dc-section {
            padding: 4px 14px 8px;
        }
        .dc-section-title {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #888;
            margin: 8px 0 6px;
        }
        .dc-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 5px 0;
            gap: 8px;
        }
        .dc-row label {
            flex: 0 0 auto;
            font-size: 11px;
            color: #bbb;
            white-space: nowrap;
        }
        .dc-row .dc-input-group {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
            min-width: 0;
        }
        .dc-row input[type="range"] {
            flex: 1;
            min-width: 0;
            height: 4px;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(255,255,255,0.12);
            border-radius: 2px;
            outline: none;
        }
        .dc-row input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .dc-row .dc-value {
            font-size: 10px;
            font-variant-numeric: tabular-nums;
            color: #999;
            min-width: 36px;
            text-align: right;
        }
        .dc-row input[type="checkbox"] {
            width: 14px;
            height: 14px;
            accent-color: #6b8aff;
            cursor: pointer;
        }
        .dc-row input[type="color"] {
            width: 28px;
            height: 20px;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 4px;
            padding: 0;
            cursor: pointer;
            background: transparent;
        }
        .dc-fps {
            padding: 6px 14px 8px;
            font-size: 11px;
            color: #6b8aff;
            font-variant-numeric: tabular-nums;
            border-top: 1px solid rgba(255,255,255,0.06);
        }
        .dc-btn {
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.1);
            color: #ccc;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 11px;
            cursor: pointer;
            width: 100%;
            margin-top: 4px;
        }
        .dc-btn:hover { background: rgba(255,255,255,0.14); }

        #dev-controls::-webkit-scrollbar { width: 4px; }
        #dev-controls::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
    `;
    document.head.appendChild(style);

    const header = document.createElement('div');
    header.className = 'dc-header';
    header.innerHTML = `<h2>Controls</h2><span class="dc-toggle-arrow">▼</span>`;
    header.addEventListener('click', () => panel.classList.toggle('collapsed'));
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'dc-body';
    panel.appendChild(body);

    const controls = {};

    function addSection(title) {
        const section = document.createElement('div');
        section.className = 'dc-section';
        const titleEl = document.createElement('div');
        titleEl.className = 'dc-section-title';
        titleEl.textContent = title;
        section.appendChild(titleEl);
        body.appendChild(section);
        return section;
    }

    function addSlider(section, key, label, min, max, step) {
        const row = document.createElement('div');
        row.className = 'dc-row';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const group = document.createElement('div');
        group.className = 'dc-input-group';

        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = params[key];

        const val = document.createElement('span');
        val.className = 'dc-value';
        val.textContent = Number(params[key]).toFixed(step < 1 ? String(step).split('.')[1].length : 0);

        input.addEventListener('input', () => {
            params[key] = parseFloat(input.value);
            val.textContent = Number(input.value).toFixed(step < 1 ? String(step).split('.')[1].length : 0);
            onChange(key);
        });

        group.appendChild(input);
        group.appendChild(val);
        row.appendChild(lbl);
        row.appendChild(group);
        section.appendChild(row);
        controls[key] = { input, val };
    }

    function addCheckbox(section, key, label) {
        const row = document.createElement('div');
        row.className = 'dc-row';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = params[key];

        input.addEventListener('change', () => {
            params[key] = input.checked;
            onChange(key);
        });

        row.appendChild(lbl);
        row.appendChild(input);
        section.appendChild(row);
        controls[key] = { input };
    }

    function addColor(section, key, label) {
        const row = document.createElement('div');
        row.className = 'dc-row';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const input = document.createElement('input');
        input.type = 'color';
        input.value = params[key];

        input.addEventListener('input', () => {
            params[key] = input.value;
            onChange(key);
        });

        row.appendChild(lbl);
        row.appendChild(input);
        section.appendChild(row);
        controls[key] = { input };
    }

    function addButton(section, label, callback) {
        const btn = document.createElement('button');
        btn.className = 'dc-btn';
        btn.textContent = label;
        btn.addEventListener('click', callback);
        section.appendChild(btn);
    }

    const sunSec = addSection('Sun Cycle');
    addSlider(sunSec, 'timeOfDay', 'Time of Day', 0, 1, 0.001);
    addSlider(sunSec, 'sunSpeed', 'Cycle Speed', 0, 0.1, 0.001);
    addCheckbox(sunSec, 'animateSun', 'Animate');
    addSlider(sunSec, 'shadowLength', 'Shadow Length', 0, 1.5, 0.01);
    addSlider(sunSec, 'progressiveBlur', 'Distance Blur', 0, 6, 0.1);

    const shadowSec = addSection('Shadow');
    addSlider(shadowSec, 'diskSize', 'Blur Radius', 5, 150, 1);
    addSlider(shadowSec, 'diskSamples', 'Samples', 8, 128, 1);
    addSlider(shadowSec, 'shadowSharpness', 'Sharpness', 0.05, 0.8, 0.01);

    const windSec = addSection('Wind');
    addSlider(windSec, 'windStrength', 'Strength', 0, 0.03, 0.001);
    addSlider(windSec, 'windSpeed', 'Speed', 0, 3, 0.1);
    addCheckbox(windSec, 'windEnabled', 'Enabled');

    const parallaxSec = addSection('Parallax');
    addSlider(parallaxSec, 'parallaxStrength', 'Strength', 0, 0.06, 0.001);
    addCheckbox(parallaxSec, 'parallaxEnabled', 'Enabled');

    const plantSec = addSection('Plants');
    addSlider(plantSec, 'plantScale', 'Scale', 0.3, 3, 0.1);
    addButton(plantSec, 'Regenerate Plants', () => onChange('regenerate'));

    const debugSec = addSection('Debug');
    addCheckbox(debugSec, 'showTexture', 'Show Plant Texture');
    addCheckbox(debugSec, 'paused', 'Pause Animation');

    const fpsEl = document.createElement('div');
    fpsEl.className = 'dc-fps';
    fpsEl.textContent = 'FPS: --';
    body.appendChild(fpsEl);

    return {
        panel,
        controls,
        updateFPS(fps) {
            fpsEl.textContent = `FPS: ${fps}`;
        },
        updateSlider(key, value) {
            const ctrl = controls[key];
            if (ctrl && ctrl.input) {
                ctrl.input.value = value;
                if (ctrl.val) {
                    const step = parseFloat(ctrl.input.step);
                    const decimals = step < 1 ? String(step).split('.')[1].length : 0;
                    ctrl.val.textContent = Number(value).toFixed(decimals);
                }
            }
        },
    };
}

export function hexToVec3(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
}

export function vec3ToHex(r, g, b) {
    const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
}
