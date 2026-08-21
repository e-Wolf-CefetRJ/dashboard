/* ui.js
 * Atualização do DOM (métricas, badges, status) e um "watchdog" que sinaliza
 * quando a telemetria para de chegar (sem depender apenas do estado da
 * conexão MQTT, que pode continuar "conectado" sem publicar nada).
 */
(function (global) {
  'use strict';

  const el = (id) => document.getElementById(id);

  const dom = {
    mqttDot: el('mqttDot'),
    mqttText: el('mqttText'),
    srcText: el('srcText'),
    ovrText: el('ovrText'),
    motorBadge: el('motorBadge'),
    ackBadge: el('ackBadge'),
    v: el('v'), p: el('p'), t: el('t'), h: el('h'),
    rpm: el('rpm'), spd: el('spd'), ibat: el('ibat'), imot: el('imot'), iratio: el('iratio'),
    statusLine: el('statusLine'),
    lastMsg: el('lastMsg'),
    intervalTxt: el('intervalTxt')
  };

  const fmt = (val, digits) => (val == null || Number.isNaN(val)) ? '--' : val.toFixed(digits);

  function setMqttStatus(state, text) {
    dom.mqttText.textContent = text;
    dom.mqttDot.classList.remove('ok', 'err', 'warn');
    if (state) dom.mqttDot.classList.add(state);
  }

  function setIntervalLabel(ms) {
    dom.intervalTxt.textContent = String(ms);
  }

  function updateMetrics(reading) {
    const { volts, pct, temp, humi, rpm, spd, ib, im, ratio, override, ovrPct, src, ack } = reading;

    if (!Number.isNaN(volts)) dom.v.textContent = fmt(volts, 3);
    if (!Number.isNaN(pct)) dom.p.textContent = fmt(pct, 1);
    dom.t.textContent = fmt(temp, 1);
    dom.h.textContent = fmt(humi, 1);
    dom.rpm.textContent = fmt(rpm, 1);
    dom.spd.textContent = fmt(spd, 2);
    dom.ibat.textContent = fmt(ib, 2);
    dom.imot.textContent = fmt(im, 2);
    dom.iratio.textContent = fmt(ratio, 2);

    dom.srcText.textContent = src || '?';
    const safeOvrPct = Number.isFinite(ovrPct) ? ovrPct : 0;
    dom.ovrText.textContent = override ? `ON (${safeOvrPct.toFixed(0)}%)` : 'OFF';

    // motor ON/OFF – heurística: se override não está travando e pct > 0
    const motorOn = (!override && !Number.isNaN(pct) && pct > 0.5);
    dom.motorBadge.textContent = 'motor: ' + (motorOn ? 'ON' : 'OFF');

    const ackClean = (ack || '').toString().trim();
    dom.ackBadge.textContent = 'ack: ' + (ackClean || '—');

    const nowLabel = new Date().toLocaleTimeString();
    dom.statusLine.textContent = 'Última mensagem: ' + nowLabel;
    dom.lastMsg.textContent = nowLabel;
  }

  // Watchdog: se nenhuma mensagem chegar por um tempo (múltiplo do
  // intervalo mínimo configurado), avisa visualmente em vez de deixar o
  // badge "conectado" mentindo sobre a telemetria estar viva.
  let lastMessageAt = 0;
  let watchdogTimer = null;

  function noteMessageReceived() {
    lastMessageAt = Date.now();
  }

  function startStaleWatchdog(getIntervalMs) {
    if (watchdogTimer) clearInterval(watchdogTimer);
    watchdogTimer = setInterval(() => {
      if (!lastMessageAt) return;
      const staleAfter = Math.max(3000, getIntervalMs() * 8);
      if (Date.now() - lastMessageAt > staleAfter) {
        setMqttStatus('warn', 'MQTT: conectado, sem dados recentes');
      }
    }, 1000);
  }

  global.EWolfUI = {
    setMqttStatus,
    setIntervalLabel,
    updateMetrics,
    noteMessageReceived,
    startStaleWatchdog,
    statusLine: dom.statusLine
  };
})(window);
