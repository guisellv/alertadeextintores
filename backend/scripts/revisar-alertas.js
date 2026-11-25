const pool = require('../src/db');
const { revisarExtintores } = require('../src/alertas');
const { enviarResumenMensual } = require('../src/resumen');

async function main() {
    if (process.env.TIPO_AVISO === 'resumen') {
        await enviarResumenMensual();
    } else {
        await revisarExtintores();
    }
}

main()
    .catch(error => {
        console.error('Error al revisar extintores:', error);
        // Hace que GitHub Actions marque la ejecución como fallida
        // (y te avise por correo).
        process.exitCode = 1;
    })
    .finally(() => pool.end());
