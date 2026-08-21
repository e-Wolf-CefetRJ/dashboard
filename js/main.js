/* main.js — ponto de entrada: inicializa UI, gráficos vazios e conexão MQTT. */
(function () {
  'use strict';

  const { cfg } = window.EWolfConfig;

  window.EWolfUI.setIntervalLabel(cfg.IV);
  window.EWolfCharts.drawAll(); // desenha os grids vazios (com eixo Y fixo) antes de qualquer dado
  window.EWolfMqtt.connect();
})();
