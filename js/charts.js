/* charts.js
 * Buffers de dados (janela deslizante) + desenho dos gráficos em <canvas>
 * com eixo Y FIXO (não adaptativo), definido em config.js (CHART_RANGES).
 */
(function (global) {
  'use strict';

  const { MAXPTS, CHART_RANGES } = global.EWolfConfig;

  const buf = { V: [], P: [], S: [], IB: [], T: [], H: [], R: [], IM: [], IR: [] };

  function pushBuf(key, val) {
    const arr = buf[key];
    arr.push(val);
    if (arr.length > MAXPTS) arr.shift();
  }

  // Cache do tamanho de cada canvas para evitar resetar (e limpar) o buffer
  // do canvas a cada frame — só redimensiona de fato quando o tamanho em
  // tela muda (ex.: resize da janela), reduzindo reflow/layout thrashing.
  const canvasSize = new Map();
  function ensureCanvasSize(cv) {
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    const prev = canvasSize.get(cv.id);
    if (!prev || prev.w !== w || prev.h !== h) {
      cv.width = w;
      cv.height = h;
      canvasSize.set(cv.id, { w, h });
    }
    return { w, h };
  }

  function drawSeries(canvasId, dataKey) {
    const range = CHART_RANGES[dataKey];
    const data = buf[dataKey];
    const cv = document.getElementById(canvasId);
    if (!cv || !range) return;

    const ctx = cv.getContext('2d');
    const { w: W, h: H } = ensureCanvasSize(cv);
    const padL = 36, padB = 18, padT = 8, padR = 6;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#060814';
    ctx.fillRect(0, 0, W, H);

    // Eixo Y fixo: sempre usa [range.min, range.max], independente dos
    // valores recebidos (não faz auto-scale a partir dos dados).
    const dmin = range.min;
    const dmax = range.max;

    ctx.strokeStyle = '#15192b';
    ctx.lineWidth = 1;
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = padT + (H - padT - padB) * i / ticks;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#22263a';
    ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);

    ctx.fillStyle = '#9aa4b2';
    ctx.font = '10px system-ui';
    for (let i = 0; i <= ticks; i++) {
      const val = dmax - (dmax - dmin) * i / ticks;
      const y = padT + (H - padT - padB) * i / ticks + 3;
      ctx.fillText(val.toFixed(range.decimals), 4, y);
    }

    const clean = data.filter((x) => x != null && !Number.isNaN(x));
    if (clean.length < 2) {
      ctx.fillStyle = '#666';
      ctx.font = '11px system-ui';
      ctx.fillText('Sem dados', W / 2 - 30, H / 2);
      return;
    }

    ctx.strokeStyle = '#7aa2f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    const n = data.length;
    for (let i = 0; i < n; i++) {
      const v = data[i];
      if (v == null || Number.isNaN(v)) continue;
      // valores fora do range fixo são "clampados" visualmente para não
      // estourar o desenho do gráfico (o range é intencionalmente fixo).
      const vClamped = Math.min(dmax, Math.max(dmin, v));
      const x = padL + (W - padL - padR) * i / (MAXPTS - 1);
      const y = padT + (H - padT - padB) * (1 - (vClamped - dmin) / (dmax - dmin));
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
  }

  const ALL_SERIES = [
    ['cvV', 'V'], ['cvP', 'P'], ['cvS', 'S'], ['cvIB', 'IB'],
    ['cvT', 'T'], ['cvH', 'H'], ['cvR', 'R'], ['cvIM', 'IM'], ['cvIR', 'IR']
  ];

  function drawAll() {
    for (const [canvasId, key] of ALL_SERIES) drawSeries(canvasId, key);
  }

  // Redesenha (sem novos dados) quando a janela é redimensionada, para que
  // os gráficos acompanhem o layout responsivo.
  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(drawAll);
  });

  global.EWolfCharts = { buf, pushBuf, drawAll, ALL_SERIES };
})(window);
