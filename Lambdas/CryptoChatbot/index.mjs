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
    const confirm = body.confirm === true;

    // Detectar si el mensaje es una consulta SQL explícita
    const isSQLQuery = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SHOW|DESC)\s+/i.test(userMessage.trim());

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    try {

    // Obtener esquema de la base de datos para validación y sugerencias
    const [schemaRows] = await connection.execute(
      `SELECT TABLE_NAME, COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ?`, 
      [process.env.DB_NAME]
    );
    const schema = schemaRows.reduce((acc, {TABLE_NAME, COLUMN_NAME}) => {
      if (!acc[TABLE_NAME]) acc[TABLE_NAME] = new Set();
      acc[TABLE_NAME].add(COLUMN_NAME);
      return acc;
    }, {});

    if (!isSQLQuery) {
      // Primero, intentar interpretar la intención del usuario con GPT
      const intentionPrompt = `
        Analiza estrictamente esta pregunta: "${userMessage}"
        Contexto: sistema educativo con tablas Usuarios, Progreso, Modulos, Quizzes y Contenido.

        Devuelve SOLO un objeto JSON con estos campos exactos:
          - entity: nombre de la entidad (usuarios, modulos, quizzes, progreso, general)
          - analysis: tipo de análisis (conteo, promedio, ranking, status, overview)
          - metric: métrica específica o null si no aplica

        No incluyas texto adicional fuera del JSON.
      `;

      const intentionCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: 'Eres un experto analizador de intenciones que responde solo JSON.' },
          { role: 'user', content: intentionPrompt }
        ]
      });

      let intention;
      try {
        intention = JSON.parse(intentionCompletion.choices[0].message.content);
      } catch (e) {
        console.error('Intention JSON parse error:', e.message);
        // Fallback a entidad general si falla el parseo
        intention = { entity: 'general', analysis: 'overview', metric: null };
      }
      let resumen = '';
      let rows = [];

      // Mapear la intención a consultas específicas
      switch(intention.entity) {
        case 'usuarios':
          if (intention.analysis === 'progreso') {
            [rows] = await connection.execute(`
              SELECT 
                nacionalidad,
                COUNT(*) as total_usuarios,
                ROUND(AVG(porce_complet), 2) as promedio_progreso,
                COUNT(CASE WHEN porce_complet = 100 THEN 1 END) as completados
              FROM Usuarios
              LEFT JOIN Progreso USING(id_usuario)
              GROUP BY nacionalidad
              ORDER BY promedio_progreso DESC;
            `);
            resumen = rows.map(r => 
              `${r.nacionalidad}: ${r.total_usuarios} usuarios, ${r.promedio_progreso}% promedio de progreso, ${r.completados} completados`
            ).join('\n');
          } else if (intention.analysis === 'engagement') {
            [rows] = await connection.execute(`
              SELECT 
                u.nombre_user,
                COUNT(DISTINCT p.id_modulo) as modulos_iniciados,
                COUNT(DISTINCT qu.id_quiz) as quizzes_intentados,
                COUNT(DISTINCT up.id_pregunta) as preguntas_respondidas
              FROM Usuarios u
              LEFT JOIN Progreso p USING(id_usuario)
              LEFT JOIN Quiz_Usuario qu USING(id_usuario)
              LEFT JOIN Usuario_Pregunta up USING(id_usuario)
              GROUP BY u.nombre_user
              ORDER BY modulos_iniciados DESC, quizzes_intentados DESC
              LIMIT 5;
            `);
            resumen = rows.map(r => 
              `${r.nombre_user}: ${r.modulos_iniciados} módulos, ${r.quizzes_intentados} quizzes, ${r.preguntas_respondidas} preguntas`
            ).join('\n');
          }
          break;

        case 'general':
          [rows] = await Promise.all([
            connection.execute(`
              SELECT 
                COUNT(DISTINCT id_usuario) as total_usuarios,
                COUNT(DISTINCT id_modulo) as total_modulos,
                COUNT(DISTINCT id_quiz) as total_quizzes
              FROM Usuarios
              CROSS JOIN Modulos
              CROSS JOIN Quizzes;
            `),
            connection.execute(`
              SELECT ROUND(AVG(porce_complet), 2) as promedio_general
              FROM Progreso;
            `)
          ]);
          resumen = `Resumen general:\n` +
                    `- Total usuarios: ${rows[0][0].total_usuarios}\n` +
                    `- Total módulos: ${rows[0][0].total_modulos}\n` +
                    `- Total quizzes: ${rows[0][0].total_quizzes}\n` +
                    `- Progreso promedio: ${rows[1][0].promedio_general}%`;
          break;

        // ... existing cases for other entities ...

        default:
          // Usar el sistema existente de patrones regex como fallback
          if (/usuarios?/i.test(userMessage)) {
            [rows] = await connection.execute(`
              SELECT nacionalidad, COUNT(*) as cantidad
              FROM Usuarios
              GROUP BY nacionalidad
              ORDER BY cantidad DESC
              LIMIT 5;
            `);
            resumen = rows.map(r => `${r.nacionalidad}: ${r.cantidad} usuarios`).join('\n');

          } else if (/modu/i.test(userMessage)) {
            [rows] = await connection.execute(`
              SELECT id_modulo, nombre_mod, COUNT(*) as usuarios_completaron
              FROM Progreso
              JOIN Modulos USING(id_modulo)
              WHERE porce_complet = 100
              GROUP BY id_modulo, nombre_mod
              ORDER BY usuarios_completaron DESC
              LIMIT 5;
            `);
            if (!rows || rows.length === 0) {
              return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                  message: 'No se encontraron registros de módulos completados.'
                })
              };
            }
            resumen = rows.map(r => `Módulo "${r.nombre_mod}" completado por ${r.usuarios_completaron} usuarios`).join('\n');

          } else if (/quizzes?/i.test(userMessage)) {
            [rows] = await connection.execute(`
              SELECT 
                qu.nombre_quiz, 
                ROUND(AVG(qu.puntos), 2) AS promedio_puntos
              FROM Quiz_Usuario qu
              JOIN Quizzes q USING(id_quiz)
              GROUP BY qu.nombre_quiz
              ORDER BY promedio_puntos DESC
              LIMIT 5;
            `);
            resumen = rows.map(r => `${r.nombre_quiz}: ${r.promedio_puntos}% promedio de puntos`).join('\n');
          } else if (/sin progreso|no han iniciado/i.test(userMessage)) {
            [rows] = await connection.execute(`
              SELECT nombre_user
              FROM Usuarios
              WHERE id_usuario NOT IN (
                SELECT DISTINCT id_usuario FROM Progreso
              )
              LIMIT 5;
            `);
            resumen = rows.map(r => `Usuario sin progreso: ${r.nombre_user}`).join('\n');

          } else if (/quests?.*(reclamadas|completadas)/i.test(userMessage)) {
            // Quests no implementadas en el esquema de base de datos actual
            resumen = "Funcionalidad de quests no disponible en este momento.";
          } else if (/duraci[oó]n.*contenido/i.test(userMessage)) {
            [rows] = await connection.execute(`
              SELECT id_quiz, ROUND(AVG(duracion),1) as promedio_duracion, COUNT(*) as total
              FROM Contenido
              GROUP BY id_quiz
              ORDER BY promedio_duracion DESC
              LIMIT 5;
            `);
            resumen = rows.map(r => `Quiz ${r.id_quiz}: duración promedio ${r.promedio_duracion} segundos (${r.total} contenidos)`).join('\n');

          } else {
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
    } else {
      // Modo SQL - usar el código existente del modo sql
      // modo === 'sql'
      // Si el usuario menciona exactamente el nombre de una tabla, mostrar sus primeras filas
      if (schema[userMessage.trim()]) {
        const table = userMessage.trim();
        const [rows] = await connection.execute(`SELECT * FROM \`${table}\` LIMIT 10`);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            response: rows,
            message: `Primeras filas de la tabla ${table}`
          })
        };
      }

      const prompt = `
        Interpreta esta instrucción en lenguaje natural: "${userMessage}".
        Genera una única query SQL usando las tablas y columnas disponibles:
        ${Object.entries(schema).map(([t, cols]) => `${t}(${[...cols].join(',')})`).join('; ')}.
        NO la expliques.
        Si la query afecta datos de tablas como ${TABLAS_SENSIBLES.join(', ')}, añade un disclaimer que indique que puede afectar a usuarios directamente.
        Responde en JSON estricto con los campos: query, disclaimer (si aplica).
      `;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Eres un generador de SQL que devuelve solo objetos JSON.' },
          { role: 'user', content: prompt }
        ]
      });

      const json = JSON.parse(completion.choices[0].message.content || '{}');
      const { query, disclaimer } = json;

      // Validar que todas las tablas y columnas en la query existen en el esquema
      const identifierRegex = /\bFROM\s+`?(\w+)`?|\bJOIN\s+`?(\w+)`?|\bSELECT\s+([\w\.]+)/gi;
      let match;
      while ((match = identifierRegex.exec(query))) {
        const table = match[1] || match[2];
        const colPart = match[3];
        if (table && !schema[table]) throw new Error(`Tabla no existe: ${table}`);
        if (colPart) {
          const [tbl, col] = colPart.split('.');
          if (col && schema[tbl] && !schema[tbl].has(col)) {
            throw new Error(`Columna no existe: ${col} en tabla ${tbl}`);
          }
        }
      }

      const naturalPrompt = `
        El usuario dijo: "${userMessage}".
        Explica en lenguaje natural lo que hace esta query SQL:
        ${query}
        Devuelve solo el campo 'explicacion' en formato JSON.
      `;

      const explanationCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Eres un explicador de queries SQL en español. Devuelve solo JSON.' },
          { role: 'user', content: naturalPrompt }
        ]
      });

      const naturalJson = JSON.parse(explanationCompletion.choices[0].message.content || '{}');
      const { explicacion } = naturalJson;

      if (!confirm) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            message: explicacion || 'Se ha generado una consulta SQL.',
            disclaimer: disclaimer || null,
            confirm_required: !query.trim().toUpperCase().startsWith('SELECT')
          })
        };
      }

      let result;
      try {
        [result] = await connection.execute(query);
      } catch (sqlError) {
        console.error('SQL Error:', sqlError);
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: sqlError.sqlMessage || 'Error al ejecutar la query',
            query
          })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Query ejecutada con éxito.', result })
      };
    }
  } finally {
    await connection.end();
  }
  } catch (err) {
    console.error('Error Lambda:', err.message, err.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Error al procesar la consulta',
        details: err.message 
      })
    };
  }
};
