import mysql from 'mysql2/promise';
import { verifyToken } from './authUtils.js';

export const handler = async (event) => {
  try {
    console.log("Raw headers:", event.headers);

    // Soporte para Authorization y authorization
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Token no proporcionado' }) };
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // Verifica el JWT
    const decoded = verifyToken(token);
    const userId = decoded.id;
    if (!userId) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Token inválido: ID no presente' }) };
    }

    const data = JSON.parse(event.body);
    console.log("Payload recibido:", data);

    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DB,
    });

    let query = 'UPDATE UsuariosAdmin SET ';
    const params = [];

    if (data.username) { query += 'username = ?, '; params.push(data.username); }
    if (data.email) { query += 'email = ?, '; params.push(data.email); }
    if (data.twitter) { query += 'twitter = ?, '; params.push(data.twitter); }
    if (data.linkedin) { query += 'linkedin = ?, '; params.push(data.linkedin); }
    if (data.github) { query += 'github = ?, '; params.push(data.github); }
    if (data.avatar_url) { query += 'avatar_url = ?, '; params.push(data.avatar_url); }

    if (params.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No se enviaron campos para actualizar' }) };
    }

    query = query.slice(0, -2) + ' WHERE id_usuario_admin = ?';
    params.push(userId);

    const [result] = await conn.execute(query, params);
    await conn.end();

    if (result.affectedRows === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Usuario no encontrado o sin cambios' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Perfil actualizado correctamente' }) };
  } catch (err) {
    console.error('Error al actualizar:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error interno',
        detail: err.message
      })
    };
  }
};