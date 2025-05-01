// IMPORTAR jsonwebtoken
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const handler = async (event) => {
  try {
    const headers = event.headers || {};
    const authHeader = headers.Authorization || headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    console.log('🔑 JWT_SECRET en checkAuth:', JWT_SECRET);
    console.log('🔍 Token recibido en checkAuth:', token);

    if (!token) {
      return { statusCode: 401, body: 'No hay token' };
    }

    // USAR jwt.verify (ahora sí definido)
    const data = jwt.verify(token, JWT_SECRET);

    return {
      statusCode: 200,
      body: JSON.stringify({
        id:       data.id,
        username: data.username,
        email:    data.email,
        rol:      data.rol
      })
    };
  } catch (err) {
    console.error('🚨 Error verificando token en checkAuth:', err.message);
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Token inválido o expirado' })
    };
  }
};