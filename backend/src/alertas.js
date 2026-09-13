const pool = require('./db');
const { enviarCorreo } = require('./email');


// Revisar los extintores y enviar alertas
async function revisarExtintores() {
    try {
        const resultado = await pool.query(
            `SELECT * FROM extintores`
        );

        const extintores = resultado.rows;

        for (const extintor of extintores) {

            // Si está vacío, no revisamos la fecha
            if (extintor.estado === 'vacío') {
                continue;
            }

            const hoy = new Date();
            const vencimiento = new Date(extintor.fecha_vencimiento);

            const diferencia = vencimiento - hoy;

            const diasRestantes = Math.ceil(
                diferencia / (1000 * 60 * 60 * 24)
            );

            // 30 días antes
            if (diasRestantes === 30) {

                await enviarCorreo(
                    process.env.EMAIL_USER,
                    `Extintor ${extintor.codigo} próximo a vencer`,
                    `El extintor ${extintor.codigo}, ubicado en ${extintor.ubicacion}, vence en 30 días.`
                );
            }

            // 7 días antes
            if (diasRestantes === 7) {

                await enviarCorreo(
                    process.env.EMAIL_USER,
                    `Extintor ${extintor.codigo} vence pronto`,
                    `El extintor ${extintor.codigo}, ubicado en ${extintor.ubicacion}, vence en 7 días.`
                );
            }

            // Día del vencimiento
            if (diasRestantes === 0) {

                await enviarCorreo(
                    process.env.EMAIL_USER,
                    `Extintor ${extintor.codigo} vencido`,
                    `El extintor ${extintor.codigo}, ubicado en ${extintor.ubicacion}, vence hoy.`
                );
            }
        }

    } catch (error) {
        console.error('Error al revisar extintores:', error);
    }
}


module.exports = {
    revisarExtintores
};