
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function enviarCorreo(destinatario, asunto, mensaje) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: asunto,
            text: mensaje
        });

        console.log(`Correo enviado a ${destinatario}`);

    } catch (error) {
        console.error('Error al enviar correo:', error);
        throw error;
    }
}

module.exports = {
    enviarCorreo
};
