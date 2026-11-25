const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '../../.env'),
    quiet: true
});

// EMAIL_PASSWORD debe ser una "contraseña de aplicación" de Gmail (16 letras),
// no tu contraseña normal.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function enviarCorreo(destinatario, asunto, mensaje) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: destinatario,
        subject: asunto,
        text: mensaje
    });

    console.log(`Correo enviado a ${destinatario}`);
}

// A quién llegan las notificaciones:
//   - el correo de cada usuario registrado
//   - más ALERTA_EMAIL_DESTINO (opcional, lista separada por comas)
// Si no hay ninguno, llega a EMAIL_USER.
async function obtenerDestinatarios() {
    // Se carga aquí para que este archivo no dependa de la base de datos al iniciarse
    const pool = require('./db');

    const resultado = await pool.query(
        "SELECT email FROM usuarios WHERE email IS NOT NULL AND email <> ''"
    );

    const extra = (process.env.ALERTA_EMAIL_DESTINO || '').split(',');

    const todos = [...resultado.rows.map(r => r.email), ...extra]
        .map(correo => correo.trim().toLowerCase())
        .filter(Boolean);

    const unicos = [...new Set(todos)];

    return unicos.length > 0 ? unicos : [process.env.EMAIL_USER];
}

// Envía una notificación a todos los destinatarios.
// Van en copia oculta (CCO) para que nadie vea el correo de los demás.
async function enviarAviso(asunto, mensaje) {
    const destinatarios = await obtenerDestinatarios();

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        bcc: destinatarios,
        subject: asunto,
        text: mensaje
    });

    console.log(`Aviso enviado a ${destinatarios.length} destinatario(s).`);
}

module.exports = {
    enviarCorreo,
    enviarAviso
};
