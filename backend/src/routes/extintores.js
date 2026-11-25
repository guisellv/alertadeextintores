
const express = require('express');
const router = express.Router();

const pool = require('../db');
const { asegurarEsquema } = require('../esquema');
const { dispararAvisoNuevo } = require('../disparar-aviso');


// Antes de cualquier ruta: asegurar que existan las columnas nuevas
router.use(async (req, res, next) => {
    try {
        await asegurarEsquema();
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al conectar con la base de datos' });
    }
});


// Calcular el estado según la fecha de vencimiento
function calcularEstado(fechaVencimiento) {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);

    const diferencia = vencimiento - hoy;
    const diasRestantes = Math.ceil(
        diferencia / (1000 * 60 * 60 * 24)
    );

    if (diasRestantes < 0) {
        return 'vencido';
    }

    if (diasRestantes <= 30) {
        return 'próximo a vencer';
    }

    return 'vigente';
}


// Obtener todos los extintores
router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT * FROM extintores ORDER BY id'
        );

        const extintores = resultado.rows.map(extintor => {

            // Si está marcado como vacío, mantenemos ese estado
            if (extintor.estado === 'vacío') {
                return extintor;
            }

            // Si no está vacío, calculamos el estado automáticamente
            extintor.estado = calcularEstado(
                extintor.fecha_vencimiento
            );

            return extintor;
        });

        res.json(extintores);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al obtener los extintores'
        });
    }
});


// Registrar un nuevo extintor
router.post('/', async (req, res) => {
    try {
        const {
            codigo,
            ubicacion,
            capacidad,
            fecha_vencimiento,
            ultima_mantencion,
            observaciones
        } = req.body;

        // Los campos opcionales vacíos del formulario llegan como "":
        // PostgreSQL no acepta "" como fecha o número, así que se guardan como NULL
        const vacioANull = valor => (valor === '' || valor === undefined ? null : valor);

        // El estado se calcula automáticamente
        const estado = calcularEstado(fecha_vencimiento);

        const resultado = await pool.query(
            `INSERT INTO extintores
            (codigo, ubicacion, capacidad, fecha_vencimiento,
             ultima_mantencion, estado, observaciones,
             creado_por, creado_en, aviso_nuevo_enviado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), FALSE)
            RETURNING *`,
            [
                codigo,
                ubicacion,
                vacioANull(capacidad),
                fecha_vencimiento,
                vacioANull(ultima_mantencion),
                estado,
                vacioANull(observaciones),
                req.usuario.usuario // quien inició sesión
            ]
        );

        // Pedir el correo de aviso a GitHub y contarle a la página cómo resultó
        const aviso = await dispararAvisoNuevo();

        res.status(201).json({ ...resultado.rows[0], aviso });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al registrar el extintor'
        });
    }
});


// Marcar un extintor como vacío
router.put('/:id/vacio', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `UPDATE extintores
             SET estado = 'vacío'
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Extintor no encontrado'
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al marcar el extintor como vacío'
        });
    }
});


// Volver un extintor al estado automático
router.put('/:id/automatico', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `UPDATE extintores
             SET estado = CASE
                WHEN fecha_vencimiento < CURRENT_DATE
                    THEN 'vencido'
                WHEN fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days'
                    THEN 'próximo a vencer'
                ELSE 'vigente'
             END
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Extintor no encontrado'
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al actualizar el estado'
        });
    }
});


module.exports = router;

