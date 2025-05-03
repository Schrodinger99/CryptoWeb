import { OpenAI } from 'openai';
import mysql from 'mysql2/promise';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TABLAS_SENSIBLES = ['Usuarios', 'Progreso', 'Item_Usuario'];


export const handler = async (event) => {

  try {
    const body = JSON.parse(event.body || '{}');
    const userMessage = body.message || '';
    const confirm = body.confirm === true;
    const history = body.history || [];

    // Normalizar sinónimos: mapear "país"/"country" a "nacionalidad"
    const synonyms = [
      { regex: /\bpa[ií]s(es)?\b/gi, replace: 'nacionalidad' },
      { regex: /\bcountry(es)?\b/gi, replace: 'nacionalidad' }
    ];
    let normalizedMessage = userMessage;
    for (const { regex, replace } of synonyms) {
      normalizedMessage = normalizedMessage.replace(regex, replace);
    }

    const trimmed = userMessage.trim();
    const isSQLQuery = /^(SELECT|INSERT|UPDATE|DELETE|ALTER|DROP|SHOW|DESC)\s+/i.test(trimmed)
      || /^CREATE\s+(?:TABLE|DATABASE|INDEX|VIEW|FUNCTION|PROCEDURE|TRIGGER)\s+/i.test(trimmed);

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

      let result;
      
      if (!isSQLQuery) {
        // Usar el LLM para clasificar la intención o generar un servicio dinámico
        // Mejor prompt y system message para clasificación
        const classificationPrompt = `
Analiza el idioma y clasifica la intención de la siguiente petición. Responde SOLO JSON con los campos:
- intent: intención detectada
- explanation: explicación breve
- language: idioma detectado ('es' o 'en')

Ejemplos:
"¿Cuántos usuarios tengo?" => {
  "intent": "list_users",
  "explanation": "Contar usuarios registrados",
  "language": "es"
}
"How many users do I have?" => {
  "intent": "list_users",
  "explanation": "Count registered users",
  "language": "en"
}

Petición actual: "${normalizedMessage}"
JSON:
`;
        const classResp = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Eres Cripty, un asistente conversacional de datos para CryptoChicks con experiencia en estrategias de crecimiento de usuarios. Para respuestas de negocio, utiliza un tono profesional y persuasivo, explicando por qué cada decisión o recomendación es adecuada. Para interacciones informales, adopta un tono cálido y amigable. Responde siempre en el mismo idioma en que se reciba la última petición del usuario (español o inglés).' },
            { role: 'user', content: classificationPrompt.trim() }
          ]
        });
        console.log('Classification response:', classResp.choices[0].message.content);
        let intent = 'custom';
        let intentExplanation = '';
        let detectedLanguage = 'en';
        try {
          if (parsed.intent) intent = parsed.intent;
          if (parsed.explanation) intentExplanation = parsed.explanation;
          if (parsed.language) detectedLanguage = parsed.language;
          // Fallback for language detection if invalid
          if (!['es','en'].includes(detectedLanguage)) {
            detectedLanguage = /[a-zA-Z]+/.test(normalizedMessage) ? 'en' : 'es';
          }
        } catch (e) {
          console.error('Classification parse error:', e);
        }
        // Fallback: if classification falls to custom but message mentions "strategy" or "estrategia"
        if (intent === 'custom' && /strategi|estrategi/i.test(normalizedMessage)) {
          intent = 'strategy';
          intentExplanation = 'Detección por palabra clave de solicitud de estrategia';
        }

        // Añadir el mensaje actual al historial
        history.push({ message: userMessage });
        // Manejadores fijos para intents predefinidos
        switch (intent) {
          case 'list_users':
            {
              const [rows] = await connection.execute(
                `SELECT id_usuario,nombre_user,correo,nacionalidad,genero,fecha_registro FROM Usuarios;`
              );
              await connection.end();
              return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ result: rows, history }) };
            }
          case 'users_by_nationality':
            {
              const [rows] = await connection.execute(
                `SELECT u.nacionalidad, COUNT(u.id_usuario) AS total_usuarios,
                        ROUND(AVG(p.porce_complet)*100,2) AS promedio_progreso_pct,
                        COUNT(CASE WHEN p.porce_complet=1.00 THEN 1 END) AS usuarios_completaron
                 FROM Usuarios u LEFT JOIN Progreso p ON u.id_usuario=p.id_usuario
                 GROUP BY u.nacionalidad ORDER BY promedio_progreso_pct DESC;`
              );
              await connection.end();
              return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ result: rows, history }) };
            }
          case 'summary_general':
            {
              const [[summary]] = await connection.execute(
                `SELECT
                  (SELECT COUNT(*) FROM Usuarios) AS total_usuarios,
                  (SELECT COUNT(*) FROM Modulos) AS total_modulos,
                  (SELECT COUNT(*) FROM Quizzes) AS total_quizzes,
                  (SELECT ROUND(AVG(porce_complet) * 100, 2) FROM Progreso) AS promedio_progreso_pct;`
              );
              await connection.end();
              return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ result: summary, history }) };
            }
          case 'top_modules':
            {
              const [rows] = await connection.execute(
                `SELECT m.id_modulo, m.nombre_mod,
                        COUNT(*) AS usuarios_completaron
                 FROM Progreso p
                 JOIN Modulos m ON p.id_modulo = m.id_modulo
                 WHERE p.porce_complet = 1.00
                 GROUP BY m.id_modulo, m.nombre_mod
                 ORDER BY usuarios_completaron DESC
                 LIMIT 5;`
              );
              await connection.end();
              return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ result: rows, history }) };
            }
          case 'top_quizzes':
            {
              const [rows] = await connection.execute(
                `SELECT q.id_quiz, q.nombre_quiz,
                        ROUND(AVG(qu.puntos), 2) AS promedio_puntos
                 FROM Quiz_Usuario qu
                 JOIN Quizzes q ON qu.id_quiz = q.id_quiz
                 GROUP BY q.id_quiz, q.nombre_quiz
                 ORDER BY promedio_puntos DESC
                 LIMIT 5;`
              );
              await connection.end();
              return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ result: rows, history }) };
            }
          case 'users_without_progress':
            {
              const [rows] = await connection.execute(
                `SELECT u.id_usuario, u.nombre_user
                 FROM Usuarios u
                 LEFT JOIN Progreso p ON u.id_usuario = p.id_usuario
                 WHERE p.id_usuario IS NULL;`
              );
              await connection.end();
              return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ result: rows, history }) };
            }
          case 'retention_weekly':
            {
              // Ejemplo: Retención semanal de usuarios (ajustar según el esquema real)
              const [rows] = await connection.execute(
                `SELECT YEARWEEK(fecha_registro, 1) AS semana, COUNT(*) AS nuevos_usuarios
                 FROM Usuarios
                 GROUP BY semana
                 ORDER BY semana DESC
                 LIMIT 10;`
              );
              await connection.end();
              return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ result: rows, history }) };
            }
          case 'greeting': {
            const greetPrompt = `
Eres Cripty, un asistente conversacional de datos para CryptoChicks.
Responde SOLO en ${detectedLanguage === 'es' ? 'español' : 'English'}.

${detectedLanguage === 'es' ? 
  'Saluda de forma amigable y profesional, mencionando que puedes ayudar con datos y análisis.' : 
  'Greet in a friendly and professional way, mentioning that you can help with data and analysis.'}

Petición: "${userMessage}"
Respuesta:
`.trim();
            const greetResp = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [{ role: 'system', content: greetPrompt }]
            });
            const greetText = greetResp.choices[0].message.content;
            await connection.end();
            return {
              statusCode: 200,
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ response: greetText, history })
            };
          }
          case 'strategy': {
            // Ejecutar directamente la consulta y construir el análisis de estrategia
            const sql = `
    SELECT u.nacionalidad, COUNT(u.id_usuario) AS total_usuarios
    FROM Usuarios u
    GROUP BY u.nacionalidad;
  `.trim();
            const [rows] = await connection.execute(sql);
            const strategyPrompt = `
Eres Cripty, un experto en estrategias de crecimiento de usuarios y marketing gamificado.
Responde SOLO en ${detectedLanguage === 'es' ? 'español' : 'English'}.

${detectedLanguage === 'es' ? 
  'Datos de volumen de usuarios por nacionalidad:' : 
  'User volume data by nationality:'}

${JSON.stringify(rows, null, 2)}

${detectedLanguage === 'es' ? 
  'Elabora un plan detallado con tácticas específicas para aumentar el volumen de usuarios en base a estos datos. Al final, explica por qué cada táctica es adecuada para este contexto.' : 
  'Create a detailed plan with specific tactics to increase user volume based on this data. At the end, explain why each tactic is suitable for this context.'}
`.trim();
            const stratResp = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: strategyPrompt }
              ]
            });
            const strategyText = stratResp.choices[0].message.content;
            await connection.end();
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ response: strategyText, history })
            };
          }
          case 'strategy_expand': {
            // Ampliar estrategia previa con más detalles
            const expandPrompt = `
Eres Cripty, un experto en estrategias de crecimiento de usuarios y marketing gamificado.
Responde SOLO en ${detectedLanguage === 'es' ? 'español' : 'English'}.

${detectedLanguage === 'es' ? 
  'Has proporcionado una estrategia previamente. El usuario solicita más detalles. Proporciona un plan ampliado con:' : 
  'You have previously provided a strategy. The user requests more details. Provide an expanded plan with:'}

${detectedLanguage === 'es' ? `
- Tácticas adicionales
- Métricas de seguimiento
- Ejemplos específicos
- Justificaciones de cada táctica
- Cómo refuerza la estrategia principal` : `
- Additional tactics
- Tracking metrics
- Specific examples
- Justifications for each tactic
- How it reinforces the main strategy`}

Historial de conversación:
${history.map(item => `${item.role}: "${item.message}"`).join('\n')}

Petición actual: "${userMessage}"
`.trim();
            const expandResp = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: expandPrompt }
              ]
            });
            const detailed = expandResp.choices[0].message.content;
            await connection.end();
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ response: detailed, history })
            };
          }
          default:
            // Generar servicio dinámico con LLM (prompt mejorado y con few-shot)
            const servicePrompt = `
Eres Cripty, un asistente conversacional que interpreta peticiones de usuarios sin conocimientos técnicos y responde SOLO JSON.
Ejemplos:
Usuario: "¿Cuántos usuarios tengo?"
Respuesta:
{"action":"sql","query":"SELECT COUNT(*) AS total FROM Usuarios;","explanation":"Cuenta el número total de usuarios","response":null}
Usuario: "¿Cómo estás Cripty?"
Respuesta:
{"action":"talk","query":null,"explanation":null,"response":"¡Hola! Estoy muy bien 😊 ¿En qué puedo ayudarte hoy?"}
Usuario: "Quiero ver los módulos más populares"
Respuesta:
{"action":"sql","query":"SELECT m.nombre_mod AS modulo, COUNT(*) AS completaron FROM Progreso p JOIN Modulos m ON p.id_modulo = m.id_modulo WHERE p.porce_complet = 1.00 GROUP BY m.nombre_mod ORDER BY completaron DESC LIMIT 5;","explanation":"Módulos con más completitud","response":null}
Usuario: "How many users do I have?"
Respuesta:
{"action":"sql","query":"SELECT COUNT(*) AS total FROM Usuarios;","explanation":"Count registered users","response":null}
Usuario: "Design a strategy to grow users in the country with fewest users"
Respuesta:
{"action":"talk","query":null,"explanation":"Design a strategy to increase users in the country with the fewest users","response":null}
Petición: "${normalizedMessage}"
JSON:
`;
            const serviceResp = await openai.chat.completions.create({
              model: 'gpt-4o',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: 'Eres Cripty, un asistente conversacional para CryptoChicks con experiencia en estrategias de crecimiento de usuarios y marketing gamificado. Para peticiones de negocio, mantén un tono profesional y convincente, explicando por qué tus decisiones son apropiadas. Para conversaciones casuales, sé amigable y cercano. Responde siempre en el mismo idioma en que se reciba la última petición del usuario (español o inglés).' },
                { role: 'user', content: servicePrompt.trim() }
              ]
            });
            console.log('Service response:', serviceResp.choices[0].message.content);
            let serviceObj = {};
            try {
              serviceObj = JSON.parse(serviceResp.choices[0].message.content);
            } catch (e) {
              console.error('Service JSON parse error:', e);
            }

            if (serviceObj.action === 'talk' && serviceObj.response) {
              await connection.end();
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ response: serviceObj.response, history })
            };
            }
            if (serviceObj.action === 'sql' && serviceObj.query) {
              // Validación ligera: solo SELECT para evitar ACID
              if (/^SELECT/i.test(serviceObj.query.trim())) {
                const [rows] = await connection.execute(serviceObj.query);
                await connection.end();
                return { statusCode:200, headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ result: rows, explanation: serviceObj.explanation, history }) };
              }
            }
            // Si no es SQL ejecutable, o es análisis:
            await connection.end();
            return { statusCode:200, headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ response: serviceObj.explanation || 'No se pudo generar el servicio.', history }) };
        }
      } else {
        // Modo SQL - usar el código existente del modo sql
        // Si el usuario menciona exactamente el nombre de una tabla, mostrar sus primeras filas
        if (schema[userMessage.trim()]) {
          const table = userMessage.trim();
          const [rows] = await connection.execute(`SELECT * FROM \`${table}\` LIMIT 10`);
          await connection.end();
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
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
            { role: 'system', content: 'Eres un generador de SQL que devuelve solo objetos JSON. Responde en el mismo idioma de la petición del usuario.' },
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
            { role: 'system', content: 'Eres un explicador de queries SQL que devuelve solo JSON. Responde en el mismo idioma de la petición del usuario.' },
            { role: 'user', content: naturalPrompt }
          ]
        });

        const naturalJson = JSON.parse(explanationCompletion.choices[0].message.content || '{}');
        const { explicacion } = naturalJson;

        if (!confirm) {
          await connection.end();
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: explicacion || 'Se ha generado una consulta SQL.',
              disclaimer: disclaimer || null,
              confirm_required: !query.trim().toUpperCase().startsWith('SELECT'),
              query,
              explanation: explicacion,
            })
          };
        }

        try {
          [result] = await connection.execute(query);
        } catch (sqlError) {
          console.error('SQL Error:', sqlError);
          await connection.end();
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              error: sqlError.sqlMessage || 'Error al ejecutar la query',
              query
            })
          };
        }

        await connection.end();

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Query ejecutada con éxito.',
            result,
            query,
            explanation: explicacion,
            confirm_required: false,
          })
        };
      }

      await connection.end();
      return result;

    } catch (innerErr) {
      await connection.end();
      throw innerErr;
    }
  } catch (err) {
    console.error('Error Lambda:', err.message, err.stack);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Error al procesar la consulta',
        details: err.message
      })
    };
  }
};