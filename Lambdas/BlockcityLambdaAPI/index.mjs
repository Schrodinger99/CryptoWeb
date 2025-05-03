import cors from 'cors';
import express from 'express';
import serverlessExpress from '@codegenie/serverless-express';
import db from './crypto_db.mjs';

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://cryptochicks-web-v02.s3-website-us-east-1.amazonaws.com'],
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));       // Permite CORS desde cualquier origen
app.use(express.json()); // Parseo de JSON en request bodies

// Ruta raíz de comprobación
app.get('/', (req, res) => {
  res.json({ message: 'CryptoGame API está activa' });
});

// =============================================
// ================= Dashboard =================
// =============================================

// Total de usuarios
app.get('/usuarios/count', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const total = await db.getConteoUsuarios(connection);
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/usuarios/quest', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const data = await db.getQuestCompleted(connection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/usuarios/weekly', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const data = await db.getWeeklyRetention(connection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Usuarios por nacionalidad
app.get('/usuarios/nacionalidad', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const data = await db.getUsuariosPorNacionalidad(connection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Avance promedio por módulo
app.get('/progreso/modulos', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const data = await db.getPromedioProgresoPorModulo(connection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Minijuegos resueltos por tipo
app.get('/juegos/resueltos', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const data = await db.getUsuariosResueltosPorJuego(connection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// =============================================
// =============== User Activity ===============
// =============================================

app.get('/useractivity/mapa-calor', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const data = await db.getMapaCalorProgreso(connection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/useractivity/desbloqueos', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const data = await db.getHistorialDesbloqueos(connection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// =============================================
// ================= Modules ==================
// =============================================

app.get('/modulos/progreso', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const data = await db.getModulosProgreso(connection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/modulos/preguntas', async (req, res) => {
  let connection;
  try {
    connection = await db.connect();
    const data = await db.getModulosPreguntas(connection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Ruta ${req.originalUrl} no encontrada.` });
});

// Handler para AWS Lambda
export const handler = serverlessExpress({ app });