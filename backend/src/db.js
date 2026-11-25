const { Pool, types } = require('pg');
const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '../../.env'),
    quiet: true
});

// Devolver las columnas DATE como texto 'AAAA-MM-DD' (sin hora ni zona horaria)
types.setTypeParser(1082, valor => valor);

// En la nube (Neon, Supabase, Render...) se usa DATABASE_URL.
// En tu PC puedes seguir usando DB_USER, DB_HOST, etc.
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })
    : new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT
    });

module.exports = pool;
