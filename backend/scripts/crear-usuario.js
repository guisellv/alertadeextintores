// Crea un usuario para entrar al sistema (o cambia su contraseña si ya existe).
//
// Uso:
//   npm run crear-usuario -- nombre contraseña
//   npm run crear-usuario            (te pregunta los datos)
//
// Usa la base de datos configurada en el archivo .env
// (para la nube, pon ahí DATABASE_URL de Neon).

const readline = require('readline/promises');
const pool = require('../src/db');
const { cifrarPassword } = require('../src/auth');

async function preguntar(texto) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const respuesta = await rl.question(texto);
    rl.close();
    return respuesta;
}

async function main() {
    let [usuario, password] = process.argv.slice(2);

    if (!usuario) usuario = await preguntar('Usuario: ');
    if (!password) password = await preguntar('Contraseña: ');

    usuario = String(usuario).trim().toLowerCase();

    if (!usuario) throw new Error('El usuario no puede estar vacío.');
    if (String(password).length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id            SERIAL PRIMARY KEY,
            usuario       VARCHAR(50)  NOT NULL UNIQUE,
            password_hash VARCHAR(200) NOT NULL,
            creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
    `);

    const resultado = await pool.query(
        `INSERT INTO usuarios (usuario, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (usuario) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING (xmax = 0) AS nuevo`,
        [usuario, cifrarPassword(password)]
    );

    console.log(resultado.rows[0].nuevo
        ? `Usuario "${usuario}" creado.`
        : `Contraseña de "${usuario}" actualizada.`);
}

main()
    .catch(error => {
        console.error('Error:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
