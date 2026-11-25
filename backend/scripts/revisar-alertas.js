const pool = require('../src/db');
const { revisarExtintores } = require('../src/alertas');
const { enviarResumenMensual } = require('../src/resumen');
const { enviarAvisosNuevos } = require('../src/nuevos');

// TIPO_AVISO:
//   "nuevos"  -> solo el correo de extintores recién agregados
//                (lo pide el servidor cada vez que se agrega uno)
//   "resumen" -> resumen mensual
//   otro      -> revisión diaria: vencimientos + extintores nuevos
//                que no se hayan avisado todavía
async function main() {
    const tipo = process.env.TIPO_AVISO;

    if (tipo === 'resumen') {
        await enviarResumenMensual();
    } else if (tipo === 'nuevos') {
        await enviarAvisosNuevos();
    } else {
        await enviarAvisosNuevos();
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
