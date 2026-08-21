/* mqtt-client.js
 * Conexão MQTT (via mqtt.js/WebSocket), parsing das mensagens de telemetria
 * e disparo das atualizações de UI/gráficos. Somente leitura (não publica).
 */
(function (global) {
  'use strict';

  const { cfg } = global.EWolfConfig;
  const { pushBuf, drawAll } = global.EWolfCharts;
  const UI = global.EWolfUI;

  let client = null;
  let lastDraw = 0;

  function parseReading(payload) {
    let d;
    try {
      d = JSON.parse(payload.toString());
    } catch (e) {
      return null;
    }

    const volts = Number(d.volts);
    const pct = Number(d.pct);
    const temp = (d.temp == null) ? null : Number(d.temp);
    const humi = (d.humi == null) ? null : Number(d.humi);
    const rpm = (d.rpm == null) ? null : Number(d.rpm);
    const spd = (d.speed_kmh == null) ? null : Number(d.speed_kmh);
    const ib = (d.current_bat_a == null) ? null : Number(d.current_bat_a);
    const im = (d.current_mot_a == null) ? null : Number(d.current_mot_a);
    const override = (d.override === 1 || d.override === true);
    const ovrPct = Number(d.override_pct || 0);
    const src = d.src || '?';
    const ack = d.ack;

    const ratio = (ib != null && im != null && !Number.isNaN(ib) && !Number.isNaN(im) && Math.abs(im) > 1e-3)
      ? (ib / im) : null;

    return { volts, pct, temp, humi, rpm, spd, ib, im, ratio, override, ovrPct, src, ack };
  }

  function handleMessage(topic, payload) {
    if (topic !== cfg.topicTlm) return;

    const now = performance.now();
    if (now - lastDraw < cfg.IV) return; // throttle de UI, não da conexão
    lastDraw = now;

    const reading = parseReading(payload);
    if (!reading) return;

    UI.noteMessageReceived();
    UI.setMqttStatus('ok', 'MQTT: conectado');
    UI.updateMetrics(reading);

    pushBuf('V', Number.isNaN(reading.volts) ? null : reading.volts);
    pushBuf('P', Number.isNaN(reading.pct) ? null : reading.pct);
    pushBuf('S', (reading.spd == null || Number.isNaN(reading.spd)) ? null : reading.spd);
    pushBuf('IB', (reading.ib == null || Number.isNaN(reading.ib)) ? null : reading.ib);
    pushBuf('T', (reading.temp == null || Number.isNaN(reading.temp)) ? null : reading.temp);
    pushBuf('H', (reading.humi == null || Number.isNaN(reading.humi)) ? null : reading.humi);
    pushBuf('R', (reading.rpm == null || Number.isNaN(reading.rpm)) ? null : reading.rpm);
    pushBuf('IM', (reading.im == null || Number.isNaN(reading.im)) ? null : reading.im);
    pushBuf('IR', (reading.ratio == null || Number.isNaN(reading.ratio)) ? null : reading.ratio);

    drawAll();
  }

  function connect() {
    if (client) {
      try { client.end(true); } catch (e) { /* ignore */ }
      client = null;
    }

    const proto = cfg.tls ? 'wss' : 'ws';
    const url = `${proto}://${cfg.host}:${cfg.port}${cfg.path}`;
    const options = {
      clientId: `${cfg.cid}-${Date.now()}`,
      clean: true,
      keepalive: 10,
      reconnectPeriod: 1000,
      connectTimeout: 30000
    };

    UI.setMqttStatus('err', 'MQTT: conectando…');
    UI.statusLine.textContent = 'Conectando em ' + url + ' …';

    try {
      client = mqtt.connect(url, options);
    } catch (e) {
      UI.statusLine.textContent = 'Erro ao criar cliente MQTT: ' + e;
      return;
    }

    client.on('connect', () => {
      UI.setMqttStatus('ok', 'MQTT: conectado');
      UI.statusLine.textContent = 'Assinando ' + cfg.topicTlm + '…';
      client.subscribe(cfg.topicTlm, { qos: 0 }, (err) => {
        UI.statusLine.textContent = err
          ? 'Erro ao assinar tópico de telemetria'
          : 'Recebendo telemetria em ' + cfg.topicTlm;
      });
    });

    client.on('reconnect', () => UI.setMqttStatus('err', 'MQTT: reconectando…'));
    client.on('close', () => UI.setMqttStatus('err', 'MQTT: desconectado'));
    client.on('error', (err) => {
      UI.setMqttStatus('err', 'MQTT: erro');
      console.error('MQTT error', err);
    });
    client.on('message', handleMessage);

    UI.startStaleWatchdog(() => cfg.IV);
  }

  // Encerra a conexão de forma limpa ao fechar/recarregar a aba.
  window.addEventListener('beforeunload', () => {
    if (client) { try { client.end(true); } catch (e) { /* ignore */ } }
  });

  global.EWolfMqtt = { connect };
})(window);
