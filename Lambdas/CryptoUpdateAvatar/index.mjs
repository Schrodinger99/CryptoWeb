import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";
import Busboy from "busboy";
import { verifyToken } from './authUtils.js';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Token no proporcionado' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    const userId = decoded.id;
    if (!userId) return { statusCode: 403, body: JSON.stringify({ error: 'Token inválido' }) };

    const buffer = Buffer.from(event.body, 'base64');

    const contentType = event.headers["Content-Type"] || event.headers["content-type"];
    const busboy = Busboy({ headers: { "content-type": contentType } });

    const parts = [];

    const parsePromise = new Promise((resolve, reject) => {
      busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        const chunks = [];
        file.on("data", chunk => chunks.push(chunk));
        file.on("end", () => {
          parts.push({ filename, mimetype, buffer: Buffer.concat(chunks) });
        });
      });

      busboy.on("finish", resolve);
      busboy.on("error", reject);

      busboy.end(buffer);
    });

    await parsePromise;

    if (parts.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No se subió ningún archivo' }) };
    }

    const { filename, buffer: fileBuffer, mimetype } = parts[0];

    const key = `avatars/${userId}_${Date.now()}_${filename}`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype
    }));

    const avatarUrl = `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${key}`;

    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DB
    });

    await conn.execute(
      "UPDATE UsuariosAdmin SET avatar_url = ? WHERE id_usuario_admin = ?",
      [avatarUrl, userId]
    );
    await conn.end();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({ message: 'Avatar actualizado', avatar_url: avatarUrl })
    };
  } catch (err) {
    console.error('Error en update-avatar:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno', detail: err.message }) };
  }
};