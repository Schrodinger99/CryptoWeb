/* global fetch, echarts */
import { API_BASE, DATA_URL, getAuthHeaders } from './api_url.mjs';// import * as echarts from 'echarts';

document.addEventListener('DOMContentLoaded', initDashboard);

async function fetchWithCheck(url) {
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Response text:', text);
    throw new Error('Invalid JSON response');
  }
}

async function initDashboard() {
  try {
    console.log('Iniciando fetch de datos...');
    console.log('API_BASE:', API_BASE);

    // Hacer las peticiones en paralelo (una sola vez)
    const [countData, nacionalidades, modulos, juegos] = await Promise.all([
        fetchWithCheck(`${DATA_URL}/usuarios/count`),
        fetchWithCheck(`${DATA_URL}/usuarios/nacionalidad`),
        fetchWithCheck(`${DATA_URL}/progreso/modulos`),
        fetchWithCheck(`${DATA_URL}/juegos/resueltos`)
    ]);

    console.log('Datos recibidos:', { countData, nacionalidades, modulos, juegos });

    // === 1. Card: Total de usuarios registrados ===
    const totalElement = document.getElementById('totalUsuarios');
    if (totalElement) {
      totalElement.textContent = countData.total || '0';
    }

    // === 2. Pie chart: Usuarios por nacionalidad ===
    const pieDom = document.getElementById('nationality-chart');
    if (pieDom && nacionalidades?.length > 0) {
      const pieChart = echarts.init(pieDom, currentTheme());
      pieChart.setOption({
        backgroundColor: currentTheme() === 'dark' ? '#1f2937' : '#ffffff',
        title: { text: 'Usuarios por nacionalidad', left: 'center' },
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', left: 'left' },
        series: [{
          type: 'pie',
          radius: '50%',
          data: nacionalidades.map(n => ({ value: n.total, name: n.nacionalidad })),
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } }
        }]
      });
    }

    // === 3. Bar chart: Avance porcentual por módulo ===
    const barDom = document.getElementById('main');
    if (barDom && modulos?.length > 0) {
      const barChart = echarts.init(barDom, currentTheme());
      barChart.setOption({
        backgroundColor: currentTheme() === 'dark' ? '#1f2937' : '#ffffff',
        title: { text: 'Avance promedio por módulo', left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: modulos.map(m => `Módulo ${m.id_modulo}`) },
        yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
        series: [{ type: 'bar', data: modulos.map(m => m.promedio_pct) }]
      });

      // Ajustar tamaño cuando cambie el viewport
      window.addEventListener('resize', () => barChart.resize());
    }

    // === 4. Bar chart: Quests completadas por tipo ===
    const qDom = document.getElementById('quest-chart');
    if (qDom && juegos?.length > 0) {
      const qChart = echarts.init(qDom, currentTheme());
      qChart.setOption({
        backgroundColor: currentTheme() === 'dark' ? '#1f2937' : '#ffffff',
        title: { text: 'Quests completadas por tipo', left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: juegos.map(j => j.juego) },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: juegos.map(j => j.total_usuarios) }]
      });

      // Ajustar tamaño cuando cambie el viewport
      window.addEventListener('resize', () => qChart.resize());
    }

  } catch (err) {
    console.error('Error específico:', err.message);
    console.error('Stack trace:', err.stack);
    const errBox = document.getElementById('errorBox');
    if (errBox) {
      errBox.textContent = `Error al cargar dashboard: ${err.message}`;
      errBox.style.display = 'block';
    }
    // Marcar contenedores con error
    document.getElementById('totalUsuarios').textContent = 'Error';
    ['nationality-chart', 'main', 'quest-chart'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<p class="text-red-500">Error al cargar datos</p>';
    });
  }
}

function currentTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}