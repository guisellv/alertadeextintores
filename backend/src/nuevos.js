const pool = require('./db');
const { enviarAviso } = require('./email');
const { asegurarEsquema } = require('./esquema');

// Envía UN correo con todos los extintores agregados que aún no se han avisado,
// indicando quién agregó cada uno.

function fechaHora(valor) {
    if (!valor) return 'fecha desconocida';
    return new Date(valor).toLocaleString('es-CL', {
        timeZone: process.env.ZONA_HORARIA || 'America/Santiago',
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

function describir(e) {
    return [
        `- ${e.codigo} (${e.ubicacion})`,
        `    Tipo: ${e.tipo || 'no indicado'}`,
        `    Agregado por: ${e.creado_por || 'desconocido'} el ${fechaHora(e.creado_en)}`,
        `    Vencimiento: ${e.fecha_vencimiento}`,
        `    Capacidad: ${e.capacidad ? e.capacidad + ' kg' : 'no indicada'}`,
        `    Prueba hidrostática: ${e.ultima_mantencion || 'no registrada'}`,
        `    Observaciones: ${e.observaciones || 'ninguna'}`
    ].join('\n');
}

async function enviarAvisosNuevos() {
    await asegurarEsquema();

    const resultado = await pool.query(`
        SELECT * FROM extintores
        WHERE aviso_nuevo_enviado = FALSE
        ORDER BY creado_en, id
    `);

    const nuevos = resultado.rows;

    if (nuevos.length === 0) {
        console.log('No hay extintores nuevos por avisar.');
        return;
    }

    const asunto = nuevos.length === 1
        ? `Nuevo extintor ${nuevos[0].codigo} agregado por ${nuevos[0].creado_por || 'desconocido'}`
        : `${nuevos.length} extintores nuevos agregados`;

    const mensaje = 'Sistema de control de extintores\n\n' +
        (nuevos.length === 1 ? 'Se agregó un extintor:\n\n' : 'Se agregaron estos extintores:\n\n') +
        nuevos.map(describir).join('\n\n') + '\n';

    // Si el correo falla, no se marcan como avisados y se reintenta después
    await enviarAviso(asunto, mensaje);

    await pool.query(
        'UPDATE extintores SET aviso_nuevo_enviado = TRUE WHERE id = ANY($1)',
        [nuevos.map(e => e.id)]
    );

    console.log(`Aviso de ${nuevos.length} extintor(es) nuevo(s) enviado.`);
}

module.exports = { enviarAvisosNuevos };
