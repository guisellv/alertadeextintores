// Crea o actualiza las tablas de la base de datos automáticamente.
// Se puede ejecutar muchas veces: solo agrega lo que falta.

const pool = require('./db');

const SQL = `
    CREATE TABLE IF NOT EXISTS extintores (
        id                SERIAL PRIMARY KEY,
        codigo            VARCHAR(50)  NOT NULL,
        ubicacion         VARCHAR(150) NOT NULL,
        capacidad         NUMERIC(6,2),
        fecha_vencimiento DATE         NOT NULL,
        ultima_mantencion DATE,
        estado            VARCHAR(30)  NOT NULL DEFAULT 'vigente',
        observaciones     TEXT
    );

    -- Quién y cuándo agregó cada extintor
    ALTER TABLE extintores ADD COLUMN IF NOT EXISTS creado_por VARCHAR(50);
    -- (sin valor por defecto, para que los antiguos queden sin fecha)
    ALTER TABLE extintores ADD COLUMN IF NOT EXISTS creado_en  TIMESTAMPTZ;

    -- Si ya se mandó el correo de "extintor agregado".
    -- Los extintores que ya existían quedan en TRUE para no avisar de ellos.
    ALTER TABLE extintores ADD COLUMN IF NOT EXISTS aviso_nuevo_enviado BOOLEAN NOT NULL DEFAULT TRUE;

    CREATE TABLE IF NOT EXISTS usuarios (
        id            SERIAL PRIMARY KEY,
        usuario       VARCHAR(50)  NOT NULL UNIQUE,
        password_hash VARCHAR(200) NOT NULL,
        creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- Correo donde le llegan las notificaciones a cada usuario
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(254);

    CREATE TABLE IF NOT EXISTS alertas_enviadas (
        id                SERIAL PRIMARY KEY,
        extintor_id       BIGINT  NOT NULL,
        umbral            INTEGER NOT NULL,
        fecha_vencimiento DATE    NOT NULL,
        enviada_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (extintor_id, umbral, fecha_vencimiento)
    );
`;

let listo = null;

function asegurarEsquema() {
    if (!listo) {
        listo = pool.query(SQL).catch(error => {
            listo = null; // reintentar la próxima vez
            throw error;
        });
    }
    return listo;
}

module.exports = { asegurarEsquema };
