const pool = require('./db');
const { enviarCorreo } = require('./email');

// Avisos: 30 días antes, 7 días antes y el día del vencimiento (o después).
//
// Antes se comparaba "diasRestantes === 30": si ese día justo no se ejecutaba
// la revisión, el aviso se perdía. Ahora se usa "faltan 30 días o menos" y se
// guarda en la tabla alertas_enviadas qué aviso ya se mandó, así:
//   - nunca se pierde un aviso aunque un día no se ejecute la revisión;
//   - nunca llega el mismo aviso dos veces.

async function asegurarTablaAlertas() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS alertas_enviadas (
            id                SERIAL PRIMARY KEY,
            extintor_id       BIGINT  NOT NULL,
            umbral            INTEGER NOT NULL,
            fecha_vencimiento DATE    NOT NULL,
            enviada_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (extintor_id, umbral, fecha_vencimiento)
        )
    `);
}

// En qué etapa está un extintor según los días que le quedan
function umbralActual(dias) {
    if (dias <= 0) return 0;
    if (dias <= 7) return 7;
    if (dias <= 30) return 30;
    return null;
}

function describir(extintor) {
    const dias = extintor.dias_restantes;
    let cuando;

    if (dias > 0) {
        cuando = `vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
    } else if (dias === 0) {
        cuando = 'vence HOY';
    } else {
        cuando = `VENCIÓ hace ${-dias} ${dias === -1 ? 'día' : 'días'}`;
    }

    return `- ${extintor.codigo} (${extintor.ubicacion}): ${cuando}` +
        ` (fecha de vencimiento: ${extintor.fecha_vencimiento})`;
}


// Revisar los extintores y enviar UN correo con todos los avisos pendientes
async function revisarExtintores() {
    await asegurarTablaAlertas();

    const resultado = await pool.query(`
        SELECT id, codigo, ubicacion, fecha_vencimiento, estado,
               (fecha_vencimiento - CURRENT_DATE) AS dias_restantes
        FROM extintores
        WHERE estado IS DISTINCT FROM 'vacío'
          AND fecha_vencimiento IS NOT NULL
        ORDER BY fecha_vencimiento
    `);

    const enviadas = await pool.query(
        'SELECT extintor_id, umbral, fecha_vencimiento FROM alertas_enviadas'
    );
    const yaEnviada = new Set(
        enviadas.rows.map(a => `${a.extintor_id}|${a.umbral}|${a.fecha_vencimiento}`)
    );

    const pendientes = [];

    for (const extintor of resultado.rows) {
        const umbral = umbralActual(extintor.dias_restantes);

        if (umbral === null) continue;

        const clave = `${extintor.id}|${umbral}|${extintor.fecha_vencimiento}`;

        if (!yaEnviada.has(clave)) {
            pendientes.push({ ...extintor, umbral });
        }
    }

    if (pendientes.length === 0) {
        console.log(`Revisados ${resultado.rows.length} extintores: no hay avisos nuevos.`);
        return { revisados: resultado.rows.length, avisos: 0 };
    }

    const vencidos = pendientes.filter(e => e.umbral === 0);
    const proximos = pendientes.filter(e => e.umbral !== 0);

    let mensaje = 'Sistema de control de extintores\n\n';

    if (vencidos.length > 0) {
        mensaje += 'VENCIDOS O QUE VENCEN HOY:\n' +
            vencidos.map(describir).join('\n') + '\n\n';
    }

    if (proximos.length > 0) {
        mensaje += 'PRÓXIMOS A VENCER:\n' +
            proximos.map(describir).join('\n') + '\n\n';
    }

    const asunto = pendientes.length === 1
        ? `Extintor ${pendientes[0].codigo}: ${pendientes[0].umbral === 0 ? 'vencido' : 'próximo a vencer'}`
        : `${pendientes.length} extintores requieren atención`;

    // Destinatario(s): ALERTA_EMAIL_DESTINO (puede ser una lista separada por comas)
    // o, si no existe, el mismo correo que envía.
    const destino = process.env.ALERTA_EMAIL_DESTINO || process.env.EMAIL_USER;

    // Si el correo falla, se lanza el error y NO se marca como enviado,
    // así se reintenta en la próxima revisión.
    await enviarCorreo(destino, asunto, mensaje);

    for (const e of pendientes) {
        await pool.query(
            `INSERT INTO alertas_enviadas (extintor_id, umbral, fecha_vencimiento)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [e.id, e.umbral, e.fecha_vencimiento]
        );
    }

    console.log(`Revisados ${resultado.rows.length} extintores: ${pendientes.length} aviso(s) enviado(s).`);
    return { revisados: resultado.rows.length, avisos: pendientes.length };
}


module.exports = {
    revisarExtintores
};
