const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { enviarCorreo } = require('./email');
const { revisarExtintores } = require('./alertas');

const extintoresRoutes = require('./routes/extintores');

const app = express();

app.use(cors());
app.use(express.json());


// Ruta de los extintores
app.use('/extintores', extintoresRoutes);


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


// Probar envío de correo
app.get('/prueba-correo', async (req, res) => {
    try {
        await enviarCorreo(
            process.env.EMAIL_USER,
            'Prueba - Sistema de Extintores',
            'Este es un correo de prueba del sistema de control de extintores.'
        );

        res.json({
            mensaje: 'Correo enviado correctamente'
        });

    } catch (error) {
        res.status(500).json({
            mensaje: 'No se pudo enviar el correo'
        });
    }
});


// Revisar alertas manualmente
app.get('/revisar-alertas', async (req, res) => {
    await revisarExtintores();

    res.json({
        mensaje: 'Revisión de alertas realizada'
    });
});


// Revisar alertas al iniciar el servidor
revisarExtintores();


// Revisar alertas automáticamente cada 24 horas
setInterval(() => {
    revisarExtintores();
}, 24 * 60 * 60 * 1000);


// Iniciar servidor
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
