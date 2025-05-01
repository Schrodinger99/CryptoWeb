/* global fetch */
import API_URL from './api_url.mjs';

// Elementos del DOM
const totalSpan = document.getElementById('totalUsuarios');
const natBody = document.getElementById('nacionalidadesBody');
const progBody = document.getElementById('modulosBody');
const juegosBody = document.getElementById('juegosBody');
const errorBox = document.getElementById('errorBox');

document.addEventListener('DOMContentLoaded', cargarEstadisticas);

async function cargarEstadisticas() {
  try {
    // Disparo paralelo de las peticiones
    const [countRes, natRes, progRes, gamesRes] = await Promise.all([
      fetch(`${API_URL}/usuarios/count`),
      fetch(`${API_URL}/usuarios/nacionalidad`),
      fetch(`${API_URL}/progreso/modulos`),
      fetch(`${API_URL}/juegos/resueltos`)
    ]);

    // A JSON al unísono
    const [count, nacionalidades, modulos, juegos] = await Promise.all([
      countRes.json(),
      natRes.json(),
      progRes.json(),
      gamesRes.json()
    ]);

    // 1) Total de usuarios
    totalSpan.textContent = count.total ?? '—';

    // 2) Usuarios por nacionalidad
    natBody.innerHTML = nacionalidades.map(n => `
      <tr>
        <td>${n.nacionalidad}</td>
        <td class="text-right">${n.total}</td>
      </tr>
    `).join('');

    // 3) Avance por módulo
    progBody.innerHTML = modulos.map(m => `
      <tr>
        <td>Módulo&nbsp;${m.id_modulo}</td>
        <td class="text-right">${m.promedio_pct}%</td>
      </tr>
    `).join('');

    // 4) Minijuegos resueltos
    juegosBody.innerHTML = juegos.map(j => `
      <tr>
        <td>${j.juego}</td>
        <td class="text-right">${j.total_usuarios}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Error fetching stats:', err);
    if (errorBox) {
      errorBox.textContent = 'No se pudieron cargar las estadísticas.';
      errorBox.style.display = 'block';
    }
  }
}

export { cargarEstadisticas };