const pool = require('./db');
const { enviarCorreo } = require('./email');

// Resumen mensual: un correo con el estado de TODOS los extintores.
// Lo envía GitHub Actions el día 1 de cada mes.

function linea(e) {
    const dias = e.dias_restantes;
    let detalle;

    if (dias > 0) {
        detalle = `vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
    } else if (dias === 0) {
        detalle = 'vence HOY';
    } else {
        detalle = `venció hace ${-dias} ${dias === -1 ? 'día' : 'días'}`;
    }

    return `- ${e.codigo} (${e.ubicacion}): ${detalle} (${e.fecha_vencimiento})`;
}

function seccion(titulo, lista) {
    if (lista.length === 0) return '';
    return `${titulo} (${lista.length}):\n${lista.map(linea).join('\n')}\n\n`;
}

async function enviarResumenMensual() {
    const resultado = await pool.query(`
        SELECT codigo, ubicacion, fecha_vencimiento, estado,
               (fecha_vencimiento - CURRENT_DATE) AS dias_restantes
        FROM extintores
        ORDER BY fecha_vencimiento
    `);

    const todos = resultado.rows;
    const vacios = todos.filter(e => e.estado === 'vacío');
    const resto = todos.filter(e => e.estado !== 'vacío');

    const vencidos = resto.filter(e => e.dias_restantes <= 0);
    const proximos = resto.filter(e => e.dias_restantes > 0 && e.dias_restantes <= 30);
    const vigentes = resto.filter(e => e.dias_restantes > 30);

    let mensaje = `Resumen mensual del sistema de extintores\n` +
        `Total registrados: ${todos.length}\n\n`;

    if (todos.length === 0) {
        mensaje += 'No hay extintores registrados.\n';
    }

    mensaje += seccion('VENCIDOS', vencidos);
    mensaje += seccion('PRÓXIMOS A VENCER (30 días o menos)', proximos);
    mensaje += seccion('VACÍOS', vacios);
    mensaje += seccion('VIGENTES', vigentes);

    const atencion = vencidos.length + proximos.length + vacios.length;
    const asunto = atencion > 0
        ? `Resumen mensual de extintores: ${atencion} requieren atención`
        : 'Resumen mensual de extintores: todo en orden';

    const destino = process.env.ALERTA_EMAIL_DESTINO || process.env.EMAIL_USER;

    await enviarCorreo(destino, asunto, mensaje);

    console.log(`Resumen mensual enviado (${todos.length} extintores).`);
}

module.exports = {
    enviarResumenMensual
};
