-- Ejecuta esto UNA vez en la base de datos de la nube
-- (en Neon: menú "SQL Editor", pegar y presionar "Run").
-- Nota: el servidor también crea o actualiza estas tablas solo (src/esquema.js).

CREATE TABLE IF NOT EXISTS extintores (
    id                SERIAL PRIMARY KEY,
    codigo            VARCHAR(50)  NOT NULL,
    tipo              VARCHAR(50),             -- PQS, CO2, agua, etc.
    ubicacion         VARCHAR(150) NOT NULL,
    capacidad         NUMERIC(6,2),
    fecha_vencimiento DATE         NOT NULL,
    ultima_mantencion DATE,
    estado            VARCHAR(30)  NOT NULL DEFAULT 'vigente',
    observaciones     TEXT,
    creado_por        VARCHAR(50),             -- usuario que lo agregó
    creado_en         TIMESTAMPTZ,
    aviso_nuevo_enviado BOOLEAN NOT NULL DEFAULT TRUE
);

-- El código de cada extintor no se puede repetir
-- (no importan mayúsculas ni espacios al inicio o al final).
CREATE UNIQUE INDEX IF NOT EXISTS extintores_codigo_unico
    ON extintores (UPPER(TRIM(codigo)));

-- Registro de avisos ya enviados (para no repetir correos).
-- El script de alertas también la crea solo si no existe.
CREATE TABLE IF NOT EXISTS alertas_enviadas (
    id                SERIAL PRIMARY KEY,
    extintor_id       BIGINT  NOT NULL,
    umbral            INTEGER NOT NULL,
    fecha_vencimiento DATE    NOT NULL,
    enviada_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (extintor_id, umbral, fecha_vencimiento)
);

-- Usuarios que pueden entrar al sistema.
-- Para crear uno usa:  npm run crear-usuario -- nombre contraseña
-- (el script también crea esta tabla si no existe).
CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    usuario       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    email         VARCHAR(254),               -- aquí le llegan las notificaciones
    creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
