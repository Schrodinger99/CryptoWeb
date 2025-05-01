import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

export const handler = async (event) => {
  try {
    const { email, password, username, rol } = JSON.parse(event.body);

    if (!email || !password || !username || !rol) {
      return { statusCode: 400, body: 'Faltan datos obligatorios' };
    }

    // Generar hash de la contraseña
    const hash = await bcrypt.hash(password, 10);

    // Conexión a MySQL
    const conn = await mysql.createConnection({
      host:     process.env.MYSQL_HOST,
      user:     process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DB,
    });

    // Insertar en UsuariosAdmin
    await conn.execute(
      `INSERT INTO UsuariosAdmin
         (email, contrasena_hash, username, rol)
       VALUES (?, ?, ?, ?)`,
      [email, hash, username, rol]
    );

    await conn.end();
    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Admin registrado' })
    };
  } catch (err) {
    console.error('🔴 Error en CryptoRegistro:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};