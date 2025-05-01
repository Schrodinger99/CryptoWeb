/* global fetch, echarts */
import { API_BASE, DATA_URL, getAuthHeaders } from './api_url.mjs';

async function fetchWithCheck(url) {
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error('Response text:', text);
    throw new Error('Invalid JSON response');
  }
}

// Elementos del DOM
const heatmapContainer = document.getElementById('heatmap-progress');
const timelineContainer = document.getElementById('timeline-unlocks');
const errorBox = document.getElementById('errorBox');

document.addEventListener('DOMContentLoaded', initUserActivity);

async function initUserActivity() {
  try {
    console.log('Fetching user activity data...');
    // Auth check (optional)
    await fetchWithCheck(`${API_BASE}/check-auth`);

    // Parallel data fetch from DATA_URL
    const [heatmapDataRaw, timelineDataRaw] = await Promise.all([
      fetchWithCheck(`${DATA_URL}/useractivity/mapa-calor`),
      fetchWithCheck(`${DATA_URL}/useractivity/desbloqueos`)
    ]);

    const rawHeatmap = Array.isArray(heatmapDataRaw[0]) ? heatmapDataRaw[0] : heatmapDataRaw;
    const timelineData = Array.isArray(timelineDataRaw[0]) ? timelineDataRaw[0] : timelineDataRaw;

    // Inicializar Heatmap
    if (heatmapContainer && rawHeatmap?.length) {
      const xCats = [...new Set(rawHeatmap.map(d => `Módulo ${d.modulo}`))];
      const yCats = [...new Set(rawHeatmap.map(d => d.usuario))];

      const seriesData = rawHeatmap.map(d => [
        xCats.indexOf(`Módulo ${d.modulo}`),   // índice X
        yCats.indexOf(d.usuario),              // índice Y
        Number(d.pct)
      ]);

      const chart = echarts.init(heatmapContainer, currentTheme());
      chart.setOption({
        backgroundColor: 'transparent',
        grid: { top: '10%', height: '60%' },
        tooltip: {
          position: 'top',
          formatter: p => `${yCats[p.data[1]]} – ${xCats[p.data[0]]}: ${p.data[2]}%`
        },
        xAxis: { type: 'category', data: xCats, splitArea: { show: true } },
        yAxis: { type: 'category', data: yCats, splitArea: { show: true } },
        visualMap: {
          min: 0, max: 100, calculable: true,
          orient: 'horizontal', left: 'center', bottom: '5%'
        },
        series: [{
          name: 'Progreso', type: 'heatmap', animation: false,
          data: seriesData,
          label: { show: true, formatter: p => p.data[2] + '%' },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' }
          }
        }]
      });

      window.addEventListener('resize', () => chart.resize());
    }

    // Inicializar Timeline
    if (timelineContainer && timelineData?.length > 0) {
      const timelineChart = echarts.init(timelineContainer, currentTheme());
      timelineChart.setOption({
        backgroundColor: 'transparent',
          tooltip: { trigger: 'axis' },
          xAxis: {
                type: 'category',
                data: timelineData.map(d => {
                    const fecha = new Date(d.fecha);
                    return fecha.toLocaleDateString('es', {
                        day: '2-digit',
                        month: '2-digit'
                    });
                })
            },
            yAxis: { type: 'value' },
            series: [{
                name: 'Desbloqueos',
                type: 'line',
                data: timelineData.map(d => d.total),
                smooth: true
            }]
        });

        window.addEventListener('resize', () => timelineChart.resize());
    }

  } catch (err) {
    console.error('Error fetching activity data:', err);
    if (errorBox) {
        errorBox.classList.remove('hidden');
        errorBox.textContent = 'Error al cargar los datos de actividad.';
    }
  }
}

function currentTheme() {
  const html = document.documentElement;
  return html.classList.contains('dark') ? 'dark' : 'light';
}

export { initUserActivity };