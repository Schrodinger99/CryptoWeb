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

// ==============================================
// ================== Settings ==================
// ==============================================

// Crear nuevo usuario
app.post('/usuarios/admin', async (req, res) => {
  let connection;
  try {
    const { username, email, role, password } = req.body;

    // Validaciones básicas
    if (!username || !email || !role || !password) {
      return res.status(400).json({
        error: 'Todos los campos son requeridos'
      });
    }

    connection = await db.connect();

    // Verificar si ya existe
    const exists = await db.getUsuarioPorCorreo(connection, email);
    if (exists) {
      return res.status(409).json({
        error: 'Ya existe un usuario con ese correo'
      });
    }

    // Crear usuario
    await db.createUsuario(connection, {
      username,
      email,
      role,
      password
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente'
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Eliminación de usuario por correo
app.delete('/usuarios/admin/:correo', async (req, res) => {
  let connection;
  try {
    const { correo } = req.params;
    connection = await db.connect();

    const deleted = await db.deleteUsuarioPorCorreo(connection, correo);

    if (!deleted) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      message: 'Usuario eliminado exitosamente'
    });

  } catch (err) {
    console.error('Error eliminando usuario:', err);
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