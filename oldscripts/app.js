const express = require('express');
const app = express();
const PORT = 5500;

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/views/dashboard', (req, res) => {
    res.render('dashboard', {
        usuariosActivos: 132,
        totalUsuarios: 248,
        totalAccesos: 1235
    });
});

app.listen(PORT, () => {console.log(`Servidor corriendo en http://localhost:${5500}`);});