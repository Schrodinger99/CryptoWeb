import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';

const app = express();
const port = process.env.PORT ?? 8080;
const ipAddress = process.env.C9_HOSTNAME ?? 'localhost';

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Sesiones
app.use(session({
    secret: 'secreto_seguro',
    resave: false,
    saveUninitialized: false
}));

async function dbConnect() {
    return await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: 'web_database'
    });
}

// Middleware para proteger rutas
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
    res.redirect('/login');
    }
}

// Página de inicio
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Registro
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    if (!['admin', 'analyst'].includes(role)) {
    return res.status(400).send('Rol inválido.');
    }

    let connection;
    try {
    connection = await dbConnect();
    await connection.execute(
        'INSERT INTO Jugadores (nombre_usuario, correo, contrasena, rol) VALUES (?, ?, ?, ?)',
        [username.trim(), email.trim(), password.trim(), role]
    );
    res.redirect('/login');
    } catch (err) {
        res.status(500).send('Error al registrar usuario.');
    } finally {
        if (connection) await connection.end();
    }
});

// Login
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    let connection;

    try {
        connection = await dbConnect();
        const [rows] = await connection.execute(
            'SELECT * FROM users WHERE username = ? AND password = ?',
        [username.trim(), password.trim()]
    );

    if (rows.length === 1) {
        req.session.userId = rows[0].id;
        req.session.username = rows[0].username;
        req.session.role = rows[0].role;
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Credenciales inválidas' });
    }
    } catch (err) {
    res.status(500).send('Error al iniciar sesión.');
    } finally {
    if (connection) await connection.end();
    }
});

// Dashboard (visualizaciones)
app.get('/dashboard', requireAuth, async (req, res) => {
    const { username, role } = req.session;
    const isAnalyst = role === 'analyst';
    res.render('dashboard', { username, role, isAnalyst });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
    res.redirect('/login');
    });
});

// Página 404
app.use((req, res) => {
    const url = req.originalUrl;
    res.status(404).render('not_found', { url });
});

app.listen(port, () => {
    console.log(`Servidor en: http://${ipAddress}:${port}`);
});