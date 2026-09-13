require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend activo' });
});

app.post('/api/send-mail', async (req, res) => {
  try {
    const { to, subject, message, html } = req.body || {};

    if (!to || !subject || !message) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan campos: to, subject y message son requeridos.'
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: message,
      html: html || `<pre style="font-family:Arial, sans-serif; white-space:pre-wrap;">${String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted || [to]
    });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    res.status(500).json({
      ok: false,
      message: 'No se pudo enviar el correo.',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
