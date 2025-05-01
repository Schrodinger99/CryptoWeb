import dotenv from 'dotenv';
dotenv.config();
import { OpenAI } from 'openai';
import mysql from 'mysql2/promise';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TABLAS_SENSIBLES = ['Usuarios', 'Progreso', 'Item_Usuario'];

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const userMessage = body.message || '';
    const modo = body.modo || 'consulta';  // 
    const confirm = body.confirm === true;

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    if (modo === 'consulta') {
      let resumen = '';
      let rows = [];

      if (/usuarios?/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT nacionalidad, COUNT(*) as cantidad
          FROM Usuarios
          GROUP BY nacionalidad
          ORDER BY cantidad DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `${r.nacionalidad}: ${r.cantidad} usuarios`).join('\n');

      } else if (/m[oó]dulos?/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT id_modulo, nombre_mod, COUNT(*) as usuarios_completaron
          FROM Progreso
          JOIN Modulos USING(id_modulo)
          WHERE porce_complet = 100
          GROUP BY id_modulo, nombre_mod
          ORDER BY usuarios_completaron DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Módulo "${r.nombre_mod}" completado por ${r.usuarios_completaron} usuarios`).join('\n');

      } else if (/quizzes?/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT nombre_quiz, AVG(puntos) as promedio_puntos
          FROM Quiz_Usuario
          JOIN Quizzes USING(id_quiz)
          GROUP BY nombre_quiz
          ORDER BY promedio_puntos DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Quiz "${r.nombre_quiz}" con promedio de ${Math.round(r.promedio_puntos)} puntos`).join('\n');

      } else if (/preguntas?/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT pregunta, AVG(estrellas) as promedio_estrellas
          FROM Usuario_Pregunta
          JOIN Preguntas USING(id_pregunta)
          GROUP BY pregunta
          ORDER BY promedio_estrellas ASC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Pregunta: "${r.pregunta}" con ${Math.round(r.promedio_estrellas)} estrellas`).join('\n');

      } else if (/quests?/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT descrip_quest, COUNT(*) as completados
          FROM Usuario_quest
          JOIN Quests USING(id_quest)
          WHERE completado = 1
          GROUP BY descrip_quest
          ORDER BY completados DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Quest "${r.descrip_quest}" completada por ${r.completados} usuarios`).join('\n');

      } else if (/items?/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT descrip_item, SUM(cantidad) as total_usado
          FROM Item_Usuario
          JOIN Items USING(id_item)
          GROUP BY descrip_item
          ORDER BY total_usado DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Ítem "${r.descrip_item}" con ${r.total_usado} usos`).join('\n');

      } else if (/contenido|videos?|material/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT url, duracion
          FROM Contenido
          ORDER BY duracion DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Contenido de duración ${r.duracion} segs: ${r.url}`).join('\n');

      } else if (/memorama/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT id_memorama, AVG(intentos) as promedio_intentos
          FROM Usuario_Memorama
          GROUP BY id_memorama
          ORDER BY promedio_intentos DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Memorama ${r.id_memorama} con ${Math.round(r.promedio_intentos)} intentos promedio`).join('\n');

      } else if (/ahorcado/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT id_ahorcado, AVG(intentos) as promedio_intentos
          FROM Usuario_Ahorcado
          GROUP BY id_ahorcado
          ORDER BY promedio_intentos DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Ahorcado ${r.id_ahorcado} con ${Math.round(r.promedio_intentos)} intentos promedio`).join('\n');

      // --- NUEVAS CONSULTAS COMPLEJAS ---
      } else if (/falladas|difíciles|errores/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT pregunta, AVG(estrellas) as promedio_estrellas, COUNT(*) as veces
          FROM Usuario_Pregunta
          JOIN Preguntas USING(id_pregunta)
          GROUP BY pregunta
          HAVING promedio_estrellas < 2
          ORDER BY promedio_estrellas ASC, veces DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Pregunta difícil: "\${r.pregunta}" (⭐️\${r.promedio_estrellas.toFixed(1)}, intentos: \${r.veces})`).join('\n');

      } else if (/progreso.*pa[ií]s|nacionalidad/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT nacionalidad, AVG(porce_complet) as promedio
          FROM Progreso
          JOIN Usuarios USING(id_usuario)
          GROUP BY nacionalidad
          ORDER BY promedio DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `\${r.nacionalidad}: \${Math.round(r.promedio)}% promedio de progreso`).join('\n');

      } else if (/sin progreso|no han iniciado/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT nombre_user
          FROM Usuarios
          WHERE id_usuario NOT IN (
            SELECT DISTINCT id_usuario FROM Progreso
          )
          LIMIT 5;
        `);
        resumen = rows.map(r => `Usuario sin progreso: \${r.nombre_user}`).join('\n');

      } else if (/quests?.*(reclamadas|completadas)/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT descrip_quest,
                 SUM(completado) as completadas,
                 SUM(reclamado) as reclamadas
          FROM Usuario_quest
          JOIN Quests USING(id_quest)
          GROUP BY descrip_quest
          ORDER BY completadas DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Quest "\${r.descrip_quest}": \${r.completadas} completadas, \${r.reclamadas} reclamadas`).join('\n');

      } else if (/duraci[oó]n.*contenido/i.test(userMessage)) {
        [rows] = await connection.execute(`
          SELECT id_quiz, ROUND(AVG(duracion),1) as promedio_duracion, COUNT(*) as total
          FROM Contenido
          GROUP BY id_quiz
          ORDER BY promedio_duracion DESC
          LIMIT 5;
        `);
        resumen = rows.map(r => `Quiz \${r.id_quiz}: duración promedio \${r.promedio_duracion} segundos (\${r.total} contenidos)`).join('\n');

      } else {
        await connection.end();
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            message: "No se pudo determinar el tipo de consulta. Por favor sé más específico (por ejemplo: 'usuarios', 'quizzes', 'módulos'...)"
          })
        };
      }

      await connection.end();

      const prompt = `
        El usuario preguntó: "${userMessage}"
        Aquí están los datos relevantes:
        ${resumen}
        Proporciona una interpretación clara y una recomendación de negocio.
        Si es posible, sugiere también acciones concretas, riesgos potenciales u oportunidades que la empresa debería considerar.
      `;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Eres un asesor de negocios experto en análisis de datos.' },
          { role: 'user', content: prompt }
        ]
      });

      const aiResponse = completion.choices[0].message.content;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ response: aiResponse })
      };
    }

    // modo === 'sql'
    const prompt = `
      Interpreta esta instrucción en lenguaje natural: "${userMessage}".
      Genera una única query SQL. NO la expliques.
      Si la query afecta datos de tablas como ${TABLAS_SENSIBLES.join(', ')}, añade un disclaimer que indique que puede afectar a usuarios directamente.
      Responde en JSON estricto con los campos: query, disclaimer (si aplica).
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: 'json',
      messages: [
        { role: 'system', content: 'Eres un generador de SQL que devuelve solo objetos JSON.' },
        { role: 'user', content: prompt }
      ]
    });

    const json = JSON.parse(completion.choices[0].message.content || '{}');
    const { query, disclaimer } = json;

    if (!confirm) {
      await connection.end();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          message: '¿Deseas ejecutar esta query?',
          query,
          disclaimer: disclaimer || null
        })
      };
    }

    const [result] = await connection.execute(query);
    await connection.end();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Query ejecutada con éxito.', result })
    };
  } catch (err) {
    console.error('Error Lambda:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Error interno en Lambda' })
    };
  }
};
