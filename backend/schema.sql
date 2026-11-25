-- Ejecuta esto UNA vez en la base de datos de la nube
-- (en Neon: menú "SQL Editor", pegar y presionar "Run").

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
