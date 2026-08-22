/* config.js
 * Configuração de conexão MQTT (persistida em localStorage e sobrescrevível
 * por querystring) + definição dos ranges FIXOS de eixo Y de cada gráfico.
 */
(function (global) {
  'use strict';

  const DEFAULT_CFG = {
    host: 'broker.emqx.io',
    port: 8083,         // WS sem TLS
    tls: false,         // se true => wss
    path: '/mqtt',
    cid: 'ewolf-dashboard',
    topicTlm: 'pb/telemetry/json',
    IV: 250              // intervalo mínimo entre atualizações de UI (ms)
  };

  const LS_KEY = 'ewolf_mqtt_cfg_v1';

  // Ranges fixos (não adaptativos) de cada gráfico.
  // Ajuste estes valores para bater com o hardware real (ex.: pack de bateria,
  // motor, etc). Mantê-los fixos evita que o gráfico "pule" de escala e
  // facilita comparar leituras ao longo do tempo.
  const CHART_RANGES = {
    V:  { min: 0, max: 5,    decimals: 2 },
    P:  { min: 0, max: 100,  decimals: 0 },
    S:  { min: 0, max: 80,   decimals: 0 },
    IB: { min: 0, max: 30,   decimals: 1 },
    T:  { min: 0, max: 100,  decimals: 0 },
    H:  { min: 0, max: 100,  decimals: 0 },
    R:  { min: 0, max: 3000, decimals: 0 },
    IM: { min: 0, max: 60,   decimals: 1 },
    IR: { min: 0, max: 2,    decimals: 2 }
  };

  const clampNum = (val, min, max, fallback) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  function sanitizeCfg(state) {
    const next = { ...DEFAULT_CFG, ...state };
    next.host = (next.host || DEFAULT_CFG.host).trim() || DEFAULT_CFG.host;
    next.port = clampNum(next.port, 1, 65535, DEFAULT_CFG.port);
    next.tls = !!next.tls;
    next.path = (next.path || DEFAULT_CFG.path).trim() || DEFAULT_CFG.path;
    if (!next.path.startsWith('/')) next.path = '/' + next.path;
    next.cid = ((next.cid || DEFAULT_CFG.cid).trim() || DEFAULT_CFG.cid)
      .replace(/\s+/g, '-')
      .slice(0, 40);
    next.topicTlm = (next.topicTlm || DEFAULT_CFG.topicTlm).trim() || DEFAULT_CFG.topicTlm;
    next.IV = clampNum(next.IV, 100, 2000, DEFAULT_CFG.IV);
    return next;
  }

  function loadStoredCfg() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return sanitizeCfg(JSON.parse(raw));
    } catch (e) { /* localStorage indisponível ou JSON inválido: ignora */ }
    return null;
  }

  function persistCfg(cfg) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    } catch (e) { /* silencioso: storage pode estar cheio/bloqueado */ }
  }

  function applyQueryString(cfg) {
    const qs = new URLSearchParams(location.search);
    const get = (k, d) => (qs.has(k) ? qs.get(k) : d);
    const next = { ...cfg };
    if (qs.has('host')) next.host = get('host', next.host);
    if (qs.has('port')) next.port = Number(get('port', next.port));
    if (qs.has('tls')) next.tls = get('tls', '0') === '1';
    if (qs.has('path')) next.path = get('path', next.path);
    if (qs.has('cid')) next.cid = get('cid', next.cid);
    if (qs.has('topic')) next.topicTlm = get('topic', next.topicTlm);
    if (qs.has('topic_tlm')) next.topicTlm = get('topic_tlm', next.topicTlm);
    if (qs.has('ival')) next.IV = Number(get('ival', next.IV));
    return next;
  }

  function buildConfig() {
    let cfg = { ...DEFAULT_CFG, ...(loadStoredCfg() || {}) };
    cfg = applyQueryString(cfg);
    cfg = sanitizeCfg(cfg);
    persistCfg(cfg);
    return cfg;
  }

  global.EWolfConfig = {
    cfg: buildConfig(),
    CHART_RANGES,
    MAXPTS: 120
  };
})(window);
