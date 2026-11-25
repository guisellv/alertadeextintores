// Login: contraseñas cifradas con scrypt y tokens firmados con HMAC.
// Solo usa el módulo "crypto" de Node (no hay que instalar nada).

const crypto = require('crypto');
const express = require('express');
const pool = require('./db');

const DURACION_TOKEN_MS = 12 * 60 * 60 * 1000; // la sesión dura 12 horas

// AUTH_SECRET firma los tokens. Debe ser un texto largo y secreto.
// Si no se define, se inventa uno al arrancar (las sesiones se cierran
// cada vez que el servidor se reinicia).
let SECRETO = process.env.AUTH_SECRET;
if (!SECRETO) {
    SECRETO = crypto.randomBytes(32).toString('hex');
    console.warn('AVISO: falta AUTH_SECRET; las sesiones se cerrarán al reiniciar el servidor.');
}


// ---------- Contraseñas ----------

function cifrarPassword(password) {
    const sal = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, sal, 64).toString('hex');
    return `scrypt$${sal}$${hash}`;
}

function verificarPassword(password, guardado) {
    const [tipo, sal, hash] = String(guardado).split('$');
    if (tipo !== 'scrypt' || !sal || !hash) return false;

    const esperado = Buffer.from(hash, 'hex');
    const calculado = crypto.scryptSync(password, sal, esperado.length);
    return crypto.timingSafeEqual(esperado, calculado);
}

// Para comparar en tiempo parecido aunque el usuario no exista
const HASH_FALSO = cifrarPassword(crypto.randomBytes(16).toString('hex'));


// ---------- Tokens ----------

function firmar(texto) {
    return crypto.createHmac('sha256', SECRETO).update(texto).digest('base64url');
}

function crearToken(usuario) {
    const datos = Buffer.from(JSON.stringify({
        id: usuario.id,
        usuario: usuario.usuario,
        exp: Date.now() + DURACION_TOKEN_MS
    })).toString('base64url');

    return `${datos}.${firmar(datos)}`;
}

function leerToken(token) {
    const [datos, firma] = String(token).split('.');
    if (!datos || !firma) return null;

    const firmaEsperada = Buffer.from(firmar(datos));
    const firmaRecibida = Buffer.from(firma);
    if (firmaEsperada.length !== firmaRecibida.length ||
        !crypto.timingSafeEqual(firmaEsperada, firmaRecibida)) {
        return null;
    }

    try {
        const contenido = JSON.parse(Buffer.from(datos, 'base64url').toString());
        if (!contenido.exp || contenido.exp < Date.now()) return null;
        return contenido;
    } catch {
        return null;
    }
}


// ---------- Middleware: exige haber iniciado sesión ----------

function requiereLogin(req, res, next) {
    const cabecera = req.headers.authorization || '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
    const sesion = token && leerToken(token);

    if (!sesion) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión' });
    }

    req.usuario = sesion;
    next();
}


// ---------- Límite de intentos fallidos (en memoria) ----------

const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map();

function demasiadosIntentos(clave) {
    const registro = intentos.get(clave);
    if (!registro) return false;
    if (Date.now() - registro.desde > VENTANA_MS) {
        intentos.delete(clave);
        return false;
    }
    return registro.cantidad >= MAX_INTENTOS;
}

function anotarFallo(clave) {
    const registro = intentos.get(clave);
    if (!registro || Date.now() - registro.desde > VENTANA_MS) {
        intentos.set(clave, { cantidad: 1, desde: Date.now() });
    } else {
        registro.cantidad++;
    }
}


// ---------- Tabla de usuarios (se crea sola si no existe) ----------

let tablaLista = null;

function asegurarTablaUsuarios() {
    if (!tablaLista) {
        tablaLista = pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id            SERIAL PRIMARY KEY,
                usuario       VARCHAR(50)  NOT NULL UNIQUE,
                password_hash VARCHAR(200) NOT NULL,
                creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
        `).catch(error => {
            tablaLista = null; // reintentar la próxima vez
            throw error;
        });
    }
    return tablaLista;
}


// ---------- Rutas: /auth/login, /auth/registro y /auth/yo ----------

const router = express.Router();

// Máximo de cuentas nuevas por IP cada hora (para evitar spam)
const MAX_REGISTROS_POR_HORA = 5;
const registros = new Map();

router.post('/registro', async (req, res) => {
    const usuario = String(req.body?.usuario || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
        return res.status(400).json({
            mensaje: 'El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo (sin espacios ni tildes).'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            mensaje: 'La contraseña debe tener al menos 8 caracteres.'
        });
    }

    const registro = registros.get(req.ip);
    if (registro && Date.now() - registro.desde < 60 * 60 * 1000) {
        if (registro.cantidad >= MAX_REGISTROS_POR_HORA) {
            return res.status(429).json({
                mensaje: 'Se crearon demasiadas cuentas desde aquí. Intenta más tarde.'
            });
        }
    } else {
        registros.set(req.ip, { cantidad: 0, desde: Date.now() });
    }

    try {
        await asegurarTablaUsuarios();

        const resultado = await pool.query(
            `INSERT INTO usuarios (usuario, password_hash)
             VALUES ($1, $2)
             ON CONFLICT (usuario) DO NOTHING
             RETURNING id, usuario`,
            [usuario, cifrarPassword(password)]
        );

        if (resultado.rows.length === 0) {
            return res.status(409).json({
                mensaje: 'Ese nombre de usuario ya existe. Elige otro.'
            });
        }

        registros.get(req.ip).cantidad++;

        const nuevo = resultado.rows[0];

        // Queda con la sesión iniciada directamente
        res.status(201).json({
            token: crearToken(nuevo),
            usuario: nuevo.usuario
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al crear la cuenta' });
    }
});

router.post('/login', async (req, res) => {
    const usuario = String(req.body?.usuario || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!usuario || !password) {
        return res.status(400).json({ mensaje: 'Escribe usuario y contraseña' });
    }

    const clave = `${req.ip}|${usuario}`;
    if (demasiadosIntentos(clave)) {
        return res.status(429).json({
            mensaje: 'Demasiados intentos fallidos. Espera 15 minutos.'
        });
    }

    try {
        await asegurarTablaUsuarios();

        const resultado = await pool.query(
            'SELECT id, usuario, password_hash FROM usuarios WHERE usuario = $1',
            [usuario]
        );
        const encontrado = resultado.rows[0];

        const correcto = verificarPassword(
            password,
            encontrado ? encontrado.password_hash : HASH_FALSO
        );

        if (!encontrado || !correcto) {
            anotarFallo(clave);
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        intentos.delete(clave);

        res.json({
            token: crearToken(encontrado),
            usuario: encontrado.usuario
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al iniciar sesión' });
    }
});

router.get('/yo', requiereLogin, (req, res) => {
    res.json({ usuario: req.usuario.usuario });
});


module.exports = { router, requiereLogin, cifrarPassword, asegurarTablaUsuarios };
