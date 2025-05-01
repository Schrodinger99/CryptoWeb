/* global fetch, echarts */
import { API_BASE, DATA_URL, getAuthHeaders } from './api_url.mjs';

async function fetchWithCheck(url) {
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// Elementos del DOM
const modulesContainer = document.getElementById('modules-container');
const progressChart = document.getElementById('progress-chart');
const questionsChart = document.getElementById('questions-chart');
const errorBox = document.getElementById('errorBox');

document.addEventListener('DOMContentLoaded', initModules);

async function initModules() {
    try {
        // Opcional: comprobar autenticación
        await fetchWithCheck(`${API_BASE}/check-auth`);
        // Hacer las peticiones en paralelo
        const [progressData, questionsData] = await Promise.all([
            fetchWithCheck(`${DATA_URL}/modulos/progreso`),
            fetchWithCheck(`${DATA_URL}/modulos/preguntas`)
        ]);

        console.log('Modules data:', { progressData, questionsData });

        // Renderizar tarjetas de módulos
        if (modulesContainer && progressData?.length) {
            modulesContainer.innerHTML = progressData.map(module => `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                        ${module.nombre_mod}
                    </h3>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">
                        ${module.descrip_mod}
                    </p>
                    <div class="mb-4">
                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                            <div class="bg-pink-600 h-2.5 rounded-full" 
                                 style="width: ${(module.promedio_progreso * 100).toFixed(0)}%">
                            </div>
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Progreso promedio: ${(module.promedio_progreso * 100).toFixed(0)}%
                        </p>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600 dark:text-gray-300">
                            ${module.total_usuarios} usuarios activos
                        </span>
                        <span class="text-sm font-semibold text-pink-600">
                            ${module.costo} coins
                        </span>
                    </div>
                </div>
            `).join('');
        }

        // Gráfico de progreso
        if (progressChart && progressData?.length) {
            const chart = echarts.init(progressChart, currentTheme());
            chart.setOption({
                backgroundColor: currentTheme() === 'dark' ? '#1f2937' : '#ffffff',
                title: {
                    text: 'Progreso Promedio por Módulo',
                    left: 'center',
                    textStyle: { color: '#000000' }
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c}%'
                },
                xAxis: {
                    type: 'category',
                    data: progressData.map(m => m.nombre_mod),
                    axisLabel: { color: '#000000' }
                },
                yAxis: {
                    type: 'value',
                    max: 100,
                    axisLabel: {
                        formatter: '{value}%',
                        color: '#000000'
                    }
                },
                series: [{
                    data: progressData.map(m => (m.promedio_progreso * 100).toFixed(1)),
                    type: 'bar',
                    showBackground: true,
                    backgroundStyle: {
                        color: 'rgba(180, 180, 180, 0.2)'
                    }
                }]
            });

            window.addEventListener('resize', () => chart.resize());
        }

        // Gráfico de preguntas
        if (questionsChart && questionsData?.length) {
            const chart = echarts.init(questionsChart, currentTheme());
            chart.setOption({
                backgroundColor: currentTheme() === 'dark' ? '#1f2937' : '#ffffff',
                title: {
                    text: 'Preguntas por Módulo',
                    left: 'center',
                    textStyle: { color: '#000000' }
                },
                tooltip: {
                    trigger: 'item'
                },
                series: [{
                    type: 'pie',
                    radius: '50%',
                    data: questionsData.map(m => ({
                        value: m.total_preguntas,
                        name: m.nombre_mod
                    })),
                    label: {
                        color: '#000000'
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            });

            window.addEventListener('resize', () => chart.resize());
        }

    } catch (err) {
        console.error('Error loading modules:', err);
        if (errorBox) {
            errorBox.classList.remove('hidden');
            errorBox.textContent = 'Error al cargar los datos de los módulos.';
        }
    }
}

function currentTheme() {
    const html = document.documentElement;
    return html.classList.contains('dark') ? 'dark' : 'light';
}

export { initModules };
