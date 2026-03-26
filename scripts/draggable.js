const MAP_WIDTH = 900;
const MAP_HEIGHT = 520;
const LABEL_WIDTH = 220;
const LABEL_HEIGHT = 84;
const DOT_SIZE = 16;

const state = {
    label: { x: 90, y: 95 },
    dot: { x: 730, y: 255 },
};

const mapEl = document.getElementById('map');
const labelEl = document.getElementById('label');
const dotEl = document.getElementById('dot');
const connectorEl = document.getElementById('connector');
const codeOutputEl = document.getElementById('code-output');
const copyBtnEl = document.getElementById('copy-btn');
const downloadBtnEl = document.getElementById('download-btn');

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getLabelAnchor(labelX, labelY, dotX, dotY) {
    const cx = labelX + LABEL_WIDTH / 2;
    const cy = labelY + LABEL_HEIGHT / 2;
    const dx = dotX - cx;
    const dy = dotY - cy;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx >= 0) {
            return { x: labelX + LABEL_WIDTH, y: cy, side: 'right' };
        }
        return { x: labelX, y: cy, side: 'left' };
    }

    if (dy >= 0) {
        return { x: cx, y: labelY + LABEL_HEIGHT, side: 'bottom' };
    }
    return { x: cx, y: labelY, side: 'top' };
}

function buildPath(labelX, labelY, dotX, dotY) {
    const start = getLabelAnchor(labelX, labelY, dotX, dotY);
    const end = { x: dotX, y: dotY };
    const offset = 70;
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const c1 = { x: start.x, y: start.y };
    if (start.side === 'right') c1.x += offset;
    if (start.side === 'left') c1.x -= offset;
    if (start.side === 'top') c1.y -= offset;
    if (start.side === 'bottom') c1.y += offset;

    const c2 = {
        x: end.x - dx * 0.38,
        y: end.y - dy * 0.22,
    };

    return  'M ' + start.x + ' ' + start.y +
            ' C ' + c1.x + ' ' + c1.y +
            ', ' + c2.x + ' ' + c2.y +
            ', ' + end.x + ' ' + end.y;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function generateStaticMarkup() {
    const path = buildPath(state.label.x, state.label.y, state.dot.x, state.dot.y);
    const labelLeft = Math.round(state.label.x);
    const labelTop = Math.round(state.label.y);
    const dotLeft = Math.round(state.dot.x - DOT_SIZE / 2);
    const dotTop = Math.round(state.dot.y - DOT_SIZE / 2);

    return `<!doctype html>
            <html lang="en">
            <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Static map annotation</title>
            <style>
            .map {
            position: relative;
            width: ${MAP_WIDTH}px;
            height: ${MAP_HEIGHT}px;
            background: #d9d9d9;
            overflow: hidden;
            font-family: Georgia, serif;
            }

            .connections {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            }

            .connector {
            fill: none;
            stroke: #2f8cff;
            stroke-width: 2;
            stroke-dasharray: 5 8;
            stroke-linecap: round;
            }

            .label {
            position: absolute;
            left: ${labelLeft}px;
            top: ${labelTop}px;
            width: ${LABEL_WIDTH}px;
            min-height: ${LABEL_HEIGHT}px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 14px;
            background: transparent;
            color: #111;
            text-decoration: none;
            }

            .icon {
            width: 54px;
            height: 54px;
            flex: 0 0 auto;
            background: #2f8cff;
            color: white;
            display: grid;
            place-items: center;
            font-size: 26px;
            line-height: 1;
            }

            .label-text {
            font-size: 18px;
            font-weight: 700;
            line-height: 1.25;
            }

            .dot {
            position: absolute;
            left: ${dotLeft}px;
            top: ${dotTop}px;
            width: ${DOT_SIZE}px;
            height: ${DOT_SIZE}px;
            border-radius: 999px;
            background: #2f8cff;
            }
            </style>
            </head>
            <body>
            <div class="map">
            <svg class="connections" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" preserveAspectRatio="none" aria-hidden="true">
            <path class="connector" d="${path}" />
            </svg>

            <a class="label" href="#">
            <span class="icon">♒</span>
            <span class="label-text">${escapeHtml('Usine marémotrice')}<br>${escapeHtml('de la Rance')}</span>
            </a>

            <div class="dot"></div>
            </div>
            </body>
            </html>`;
}

function render() {
    labelEl.style.left = state.label.x + 'px';
    labelEl.style.top = state.label.y + 'px';
    dotEl.style.left = state.dot.x + 'px';
    dotEl.style.top = state.dot.y + 'px';
    connectorEl.setAttribute('d', buildPath(state.label.x, state.label.y, state.dot.x, state.dot.y));
    codeOutputEl.textContent = generateStaticMarkup();
}

function attachDrag(element, kind) {
    element.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const startClientX = event.clientX;
        const startClientY = event.clientY;
        const startX = state[kind].x;
        const startY = state[kind].y;

        element.setPointerCapture(event.pointerId);

        function onMove(moveEvent) {
            const dx = moveEvent.clientX - startClientX;
            const dy = moveEvent.clientY - startClientY;

            if (kind === 'label') {
                state.label.x = clamp(startX + dx, 0, MAP_WIDTH - LABEL_WIDTH);
                state.label.y = clamp(startY + dy, 0, MAP_HEIGHT - LABEL_HEIGHT);
            } else {
                state.dot.x = clamp(startX + dx, DOT_SIZE / 2, MAP_WIDTH - DOT_SIZE / 2);
                state.dot.y = clamp(startY + dy, DOT_SIZE / 2, MAP_HEIGHT - DOT_SIZE / 2);
            }

            render();
        }

        function onUp() {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        }

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    });
}

copyBtnEl.addEventListener('click', async () => {
    await navigator.clipboard.writeText(generateStaticMarkup());
    const oldText = copyBtnEl.textContent;
    copyBtnEl.textContent = 'Copied';
    window.setTimeout(() => {
        copyBtnEl.textContent = oldText;
    }, 1200);
});

downloadBtnEl.addEventListener('click', () => {
    const blob = new Blob([generateStaticMarkup()], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'static-map-annotation.html';
    link.click();
    URL.revokeObjectURL(url);
});

attachDrag(labelEl, 'label');
attachDrag(dotEl, 'dot');
render();
