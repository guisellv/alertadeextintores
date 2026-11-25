const express = require('express');
const cors = require('cors');
const pool = require('./db');

const extintoresRoutes = require('./routes/extintores');
const auth = require('./auth');

const app = express();

// Render está detrás de un proxy: así req.ip es la IP real del visitante
app.set('trust proxy', 1);

// CORS_ORIGIN: la dirección de tu GitHub Pages, por ejemplo
// https://tu-usuario.github.io  (si no se define, se permite cualquier origen)
app.use(cors({
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : true
}));
app.use(express.json());


// Login (POST /auth/login)
app.use('/auth', auth.router);

// Ruta de los extintores (solo con sesión iniciada)
app.use('/extintores', auth.requiereLogin, extintoresRoutes);


// Ruta principal
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API de control de extintores funcionando'
    });
});


// Probar conexión con PostgreSQL
app.get('/prueba-db', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT NOW()');

        res.json({
            mensaje: 'Conexión con PostgreSQL funcionando',
            fecha: resultado.rows[0].now
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al conectar con PostgreSQL'
        });
    }
});


// Las alertas por correo ya NO se envían desde este servidor.
// Las envía una vez al día GitHub Actions con el script:
//   npm run alertas   (backend/scripts/revisar-alertas.js)
// Motivo: Render gratis se duerme y bloquea el envío por SMTP (Gmail).


// Iniciar servidor (Render asigna el puerto en la variable PORT)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});
