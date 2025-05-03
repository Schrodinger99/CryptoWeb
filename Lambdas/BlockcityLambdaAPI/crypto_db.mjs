import mysql from 'mysql2/promise';

async function connect() {
  return await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: 'CryptoGame' // cambiar a nombre de tu base de datos
  });
}

// =============================================
// ================= Dashboard =================
// =============================================

// Devuelve la cantidad de filas en la tabla Usuarios
async function getConteoUsuarios(connection) {
  const sql = 'SELECT COUNT(*) AS total FROM Usuarios';
  const [rows] = await connection.execute(sql);
  return rows[0].total;       // ← Un número entero
}

async function getQuestCompleted(connection) {
  const sql = 'CALL getQuestCompleted ';
  const [rows] = await connection.execute(sql);
  return rows;
}

async function getWeeklyRetention(connection) {
  const sql = 'CALL getWeeklyRetention';
  const [rows] = await connection.execute(sql);
  return rows;
}

// Devuelve un arreglo de objetos { nacionalidad, total }
async function getUsuariosPorNacionalidad(connection) {
  const sql = `
    SELECT nacionalidad,
           COUNT(*) AS total
    FROM   Usuarios
    GROUP  BY nacionalidad
    ORDER  BY total DESC;
  `;
  const [rows] = await connection.execute(sql);
  return rows;            // p.ej. [ { nationality: 'MX', total: 32 }, … ]
}

// Devuelve el Promedio del procentaje de avance por modulos
async function getPromedioProgresoPorModulo(connection) {
  const sql = `
    SELECT id_modulo,
           ROUND(AVG(porce_complet) * 100, 2) AS promedio_pct
    FROM   Progreso
    GROUP  BY id_modulo
    ORDER  BY id_modulo;
  `;
  const [rows] = await connection.execute(sql);
  return rows;
}

// Devuelve el total de usuarios que han completado los minijuegos
async function getUsuariosResueltosPorJuego(connection) {
  const sql = `
    SELECT 'Ahorcado' AS juego,
           COUNT(DISTINCT id_usuario) AS total_usuarios
    FROM   Usuario_Ahorcado
    WHERE  resuelta = TRUE
    UNION ALL
    SELECT 'Memorama' AS juego,
           COUNT(DISTINCT id_usuario) AS total_usuarios
    FROM   Usuario_Memorama
    WHERE  resuelta = TRUE;
  `;
  const [rows] = await connection.execute(sql);
  return rows;
}


// =================================================
// ================= User activity =================
// =================================================

// Heatmap: progreso por usuario y módulo
async function getMapaCalorProgreso(connection) {
  const sql = `CALL sp_get_mapa_calor();`;
  const [rows] = await connection.execute(sql);
  return rows;
}

// Desbloqueos totales de modulos por día
async function getHistorialDesbloqueos(connection, dias = 30) {
  const sql = `
    SELECT DATE(fecha_desbloqueo) AS fecha,
           COUNT(*)               AS total
    FROM   Progreso
    WHERE  fecha_desbloqueo >= CURDATE() - INTERVAL ? DAY
    GROUP  BY fecha
    ORDER  BY fecha;
  `;
  const [rows] = await connection.execute(sql, [dias]);
  return rows;            // [{ fecha:'2025-04-01', total:2 }, … ]
}

// ==============================================
// ================== Modules ==================
// ==============================================

async function getModulosProgreso(connection) {
  const sql = `
    SELECT m.id_modulo,
           m.nombre_mod,
           m.descrip_mod,
           m.costo,
           ROUND(AVG(p.porce_complet), 2) AS promedio_progreso,
           COUNT(DISTINCT p.id_usuario) AS total_usuarios
    FROM   Modulos m
    LEFT JOIN Progreso p ON m.id_modulo = p.id_modulo
    GROUP BY m.id_modulo
    ORDER BY m.id_modulo;
  `;
  const [rows] = await connection.execute(sql);
  return rows;
}

async function getModulosPreguntas(connection) {
  const sql = `
    SELECT m.id_modulo,
           m.nombre_mod,
           COUNT(DISTINCT p.id_pregunta) AS total_preguntas,
           COUNT(DISTINCT CASE WHEN up.resuelta = TRUE THEN up.id_pregunta END) AS preguntas_resueltas
    FROM   Modulos m
    LEFT JOIN Quizzes q ON m.id_modulo = q.id_modulo
    LEFT JOIN Preguntas p ON q.id_quiz = p.id_quiz
    LEFT JOIN Usuario_Pregunta up ON p.id_pregunta = up.id_pregunta
    GROUP BY m.id_modulo
    ORDER BY m.id_modulo;
  `;
  const [rows] = await connection.execute(sql);
  return rows;
}

// Añade al export
export default {
  connect,

  // dashboard
  getConteoUsuarios,
  getQuestCompleted,
  getWeeklyRetention,
  getUsuariosPorNacionalidad,
  getPromedioProgresoPorModulo,
  getUsuariosResueltosPorJuego,

  // useractivity
  getMapaCalorProgreso,
  getHistorialDesbloqueos,

  // modules
  getModulosProgreso,
  getModulosPreguntas,
};