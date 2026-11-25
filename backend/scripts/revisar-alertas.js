// Revisa los extintores y envía los avisos por correo.
// Lo ejecuta GitHub Actions todos los días (.github/workflows/alertas.yml).
// También puedes probarlo en tu PC con:  npm run alertas

const pool = require('../src/db');
const { revisarExtintores } = require('../src/alertas');

revisarExtintores()
    .catch(error => {
        console.error('Error al revisar extintores:', error);
        // Hace que GitHub Actions marque la ejecución como fallida
        // (y te avise por correo).
        process.exitCode = 1;
    })
    .finally(() => pool.end());
