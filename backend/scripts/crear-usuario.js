// Crea un usuario para entrar al sistema (o cambia su contraseña y correo si ya existe).
//
// Uso:
//   npm run crear-usuario -- nombre contraseña correo@ejemplo.com
//   npm run crear-usuario            (te pregunta los datos)
//
// Usa la base de datos configurada en el archivo .env
// (para la nube, pon ahí DATABASE_URL de Neon).

const readline = require('readline/promises');
const pool = require('../src/db');
const { cifrarPassword } = require('../src/auth');
const { asegurarEsquema } = require('../src/esquema');

async function preguntar(texto) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const respuesta = await rl.question(texto);
    rl.close();
    return respuesta;
}

async function main() {
    let [usuario, password, email] = process.argv.slice(2);

    if (!usuario) usuario = await preguntar('Usuario: ');
    if (!password) password = await preguntar('Contraseña: ');
    if (!email) email = await preguntar('Correo para las notificaciones: ');

    usuario = String(usuario).trim().toLowerCase();
    email = String(email).trim().toLowerCase();

    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
        throw new Error('El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.');
    }
    if (String(password).length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('El correo no es válido.');
    }

    await asegurarEsquema();

    const resultado = await pool.query(
        `INSERT INTO usuarios (usuario, password_hash, email)
         VALUES ($1, $2, $3)
         ON CONFLICT (usuario) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                email = EXCLUDED.email
         RETURNING (xmax = 0) AS nuevo`,
        [usuario, cifrarPassword(password), email]
    );

    console.log(resultado.rows[0].nuevo
        ? `Usuario "${usuario}" creado.`
        : `Contraseña y correo de "${usuario}" actualizados.`);
}

main()
    .catch(error => {
        console.error('Error:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
