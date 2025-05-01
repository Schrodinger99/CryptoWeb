import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const JWT_SECRET = process.env.JWT_SECRET;

export const handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return { statusCode: 400, body: 'Faltan email o password' };
    }

    const conn = await mysql.createConnection({
      host:     process.env.MYSQL_HOST,
      user:     process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DB,
    });

    const [rows] = await conn.execute(
      `SELECT id_usuario_admin AS id, contrasena_hash, username, rol
         FROM UsuariosAdmin
        WHERE email = ?`,
      [email]
    );
    await conn.end();

    if (rows.length === 0) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Usuario no encontrado' }) };
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.contrasena_hash);
    if (!valid) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Contraseña inválida' }) };
    }

    // Generar JWT con id, username, email y rol
    const token = jwt.sign(
      {
        id:       user.id,
        username: user.username,
        email,
        rol:      user.rol
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ token })
    };
  } catch (err) {
    console.error('Error en CryptoLoginUser:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};