import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET; // Configurado en las variables de entorno de Lambda

export const handler = async (event) => {
  try {
    // Obtener el token del encabezado Authorization
    const authHeader = event.headers.Authorization || event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'No token provided' }) };
    }

    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Conexión a la base de datos
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DB,
    });

    // Obtener la información del usuario
    const [rows] = await conn.execute(
      `SELECT id_usuario_admin, username, email, fecha_registro,
       COALESCE(twitter, 'No disponible') AS twitter,
       COALESCE(linkedin, 'No disponible') AS linkedin,
       COALESCE(github, 'No disponible') AS github,
       COALESCE(avatar_url, 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png') AS avatar_url
        FROM UsuariosAdmin
        WHERE id_usuario_admin = ?`, [decoded.id]
    );

    await conn.end();

    if (rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }

    const user = rows[0];
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: user.id_usuario_admin,
        username: user.username,
        email: user.email,
        fecha_registro: user.fecha_registro,
        twitter: user.twitter,
        linkedin: user.linkedin,
        github: user.github,
        avatar_url: user.avatar_url
      })
    };
  } catch (err) {
    console.error('Error fetching user info:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching user info' })
    };
  }
};