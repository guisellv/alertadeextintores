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

module.exports = {
    enviarCorreo
};
