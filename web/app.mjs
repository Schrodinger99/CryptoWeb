import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ?? 8080;
const ipAddress = process.env.C9_HOSTNAME ?? 'localhost';

// Set the views directory path
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Update static file serving
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'views/img')));
app.use('/partials', express.static(path.join(__dirname, 'views/partials')));
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

// Datos de ejemplo para el dashboard
// (esto debería ser reemplazado por datos reales de la base de datos)
const mockDashboardData = {
    statsCards: {
        totalUsers: {
            value: 1234,
            change: 8.5,
            trend: 'up',
            period: 'yesterday'
        },
        questsCompleted: {
            value: 128,
            change: 1.3,
            trend: 'up',
            period: 'past week'
        },
        weeklyRetention: {
            value: 73,
            change: 4.3,
            trend: 'down',
            period: 'yesterday'
        }
    },
    nationalityDistribution: [
        { value: 735, name: 'México' },
        { value: 580, name: 'Estados Unidos' },
        { value: 484, name: 'Europa' },
        { value: 300, name: 'Sudamerica' }
    ],
    questsByDay: {
        days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        data: {
            Trivia: [12, 15, 18, 14, 16, 9, 10],
            Memorama: [10, 11, 9, 13, 14, 7, 8],
            Lección: [20, 22, 21, 23, 25, 18, 19],
            Exploración: [8, 7, 9, 6, 5, 4, 6]
        }
    },
    moduleProgress: [
        { modulo: 'Modulo 1', porcentaje: 92 },
        { modulo: 'Modulo 2', porcentaje: 75 },
        { modulo: 'Modulo 3', porcentaje: 83 },
        { modulo: 'Modulo 4', porcentaje: 68 }
    ],
    questTypes: {
        types: ['Ahorcados', 'Memoramas', 'Leccion', 'ejemplo4'],
        completed: [120, 200, 150, 80]
    }
};

// Rutas principales
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
    
    // Test credentials
    const validCredentials = [
        { username: 'admin', password: '123456', role: 'admin' },
        { username: 'analyst', password: '123456', role: 'analyst' }
    ];

    const user = validCredentials.find(u => 
        u.username === username && u.password === password
    );

    if (user) {
        req.session.userId = 1;
        req.session.username = user.username;
        req.session.role = user.role;
        res.redirect('/dashboard');
    } else {
        res.render('login', { 
            error: 'Invalid credentials. Try admin/123456 or analyst/123456' 
        });
    }
});

// Forgot Password routes
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { 
        error: null, 
        success: null 
    });
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    // For now, just show success message
    // In a real implementation, you would:
    // 1. Verify email exists in database
    // 2. Generate reset token
    // 3. Send email with reset link
    res.render('forgot-password', {
        error: null,
        success: 'If this email is registered, you will receive password reset instructions shortly.'
    });
});

// Dashboard route - simplificado para pruebas
app.get('/dashboard', (req, res) => {
    try {
        res.render('dashboard', {
            username: req.session?.username || 'Demo User',
            role: req.session?.role || 'admin',
            data: mockDashboardData
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// Ruta para cargar el navbar
app.get('/partials/navbar', (req, res) => {
    res.render('partials/navbar', {
        username: req.session?.username || 'Demo User',
        role: req.session?.role || 'admin'
    });
});

// Modules route
app.get('/modules', (req, res) => {
    try {
        const moduleData = {
            username: req.session?.username || 'Demo User',
            role: req.session?.role || 'admin',
            modules: [
                {
                    id: 1,
                    name: 'Introducción a Blockchain',
                    progress: 85,
                    status: 'Completed',
                    quizzes: 4,
                    activities: 6
                },
                {
                    id: 2,
                    name: 'Criptomonedas Básicas',
                    progress: 60,
                    status: 'In Progress',
                    quizzes: 3,
                    activities: 5
                },
                {
                    id: 3,
                    name: 'Smart Contracts',
                    progress: 30,
                    status: 'In Progress',
                    quizzes: 5,
                    activities: 8
                }
            ]
        };
        res.render('modules', moduleData);
    } catch (error) {
        console.error('Error loading modules:', error);
        res.status(500).send('Error loading modules');
    }
});

// Settings route
app.get('/settings', (req, res) => {  // Removido requireAuth temporalmente para pruebas
    try {
        res.render('settings', { 
            username: req.session?.username || 'Demo User',
            role: req.session?.role || 'admin'
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).send('Error loading settings');
    }
});

// User activity route
app.get('/useractivity', (req, res) => {
    try {
        // Aquí podrías obtener datos reales de la base de datos
        const activityData = {
            username: req.session?.username || 'Demo User',
            role: req.session?.role || 'admin',
            // Añadir más datos según sea necesario
        };
        res.render('useractivity', activityData);
    } catch (error) {
        console.error('Error loading user activity:', error);
        res.status(500).send('Error loading user activity');
    }
});

// Logout
app.get('/logout', (req, res) => {
    try {
        req.session.destroy(() => {
            res.render('logout');  // Primero muestra la página de logout
        });
    } catch (error) {
        console.error('Error during logout:', error);
        res.redirect('/login');
    }
});

// Página 404
app.use((req, res) => {
    const url = req.originalUrl;
    res.status(404).render('not_found', { url });
});

app.listen(port, () => {
    console.log(`Servidor en: http://${ipAddress}:${port}`);
});