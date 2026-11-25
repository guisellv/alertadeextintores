# Cómo publicar el sistema de extintores (gratis)

```
GitHub Pages (frontend)  ──>  Render (API)  ──>  Neon (PostgreSQL)
                                                     ▲
GitHub Actions (todos los días) ── revisa ───────────┘
        └── envía el correo con Gmail
```

- **GitHub Pages**: la página web.
- **Render (gratis)**: la API que guarda y lee los extintores. Se duerme tras 15 min sin uso; la primera carga puede tardar ~1 minuto.
- **Neon (gratis)**: la base de datos PostgreSQL en la nube.
- **GitHub Actions (gratis)**: una vez al día revisa los vencimientos y manda el correo.
  Se hace aquí y no en Render porque Render gratis **bloquea el envío por Gmail (SMTP)** y además se duerme.

Avisos que se envían: **30 días antes**, **7 días antes** y **el día que vence** (o apenas se detecte que ya venció).
Cada aviso llega una sola vez y, si hay varios extintores, llegan juntos en un solo correo.

---

## 1. Subir el proyecto a GitHub

1. Crea un repositorio **público** (GitHub Pages gratis lo requiere). Ej: `control-extintores`.
2. Sube el **contenido** de esta carpeta (la que tiene `backend/`, `frontend/` y `.github/`) a la raíz del repositorio.
3. Verifica que **NO** se haya subido el archivo `.env` (el `.gitignore` ya lo excluye).

```bash
git init
git add .
git commit -m "Primera versión"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/control-extintores.git
git push -u origin main
```

## 2. Crear la base de datos en Neon

1. Entra a https://neon.com y crea una cuenta y un proyecto.
2. Copia la **connection string** (empieza con `postgresql://...`). Esa es tu `DATABASE_URL`.
3. Abre **SQL Editor**, pega el contenido de `backend/schema.sql` y presiona **Run**.

> ¿Ya tienes extintores en tu PostgreSQL local? Puedes copiarlos con:
> `pg_dump --data-only -t extintores TU_BD_LOCAL | psql "TU_DATABASE_URL"`

## 3. Publicar la API en Render

1. Entra a https://render.com → **New** → **Web Service** → conecta tu repositorio.
2. Configura:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
3. En **Environment Variables** agrega:
   - `DATABASE_URL` = la connection string de Neon
   - `CORS_ORIGIN` = `https://TU-USUARIO.github.io`
4. Crea el servicio. Cuando termine, abre `https://TU-APP.onrender.com/prueba-db`: debe decir *"Conexión con PostgreSQL funcionando"*.

## 4. Conectar el frontend con la API

En `frontend/app.js` cambia esta línea por la dirección real de Render:

```js
const URL_BACKEND_PRODUCCION = 'https://TU-APP.onrender.com';
```

Haz commit y push.

## 5. Activar GitHub Pages

En el repositorio: **Settings → Pages → Source: GitHub Actions**.
Luego ve a **Actions → "Publicar frontend en GitHub Pages" → Run workflow**.
Tu página quedará en `https://TU-USUARIO.github.io/control-extintores/`.

## 6. Activar los correos automáticos

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**. Crea:

| Nombre | Valor |
|---|---|
| `DATABASE_URL` | la connection string de Neon |
| `EMAIL_USER` | tu Gmail, ej. `tucorreo@gmail.com` |
| `EMAIL_PASSWORD` | tu **contraseña de aplicación** de Gmail (16 letras) |
| `ALERTA_EMAIL_DESTINO` | *(opcional)* a quién llegan los avisos; varios separados por coma |

> Contraseña de aplicación: https://myaccount.google.com/apppasswords (requiere tener activada la verificación en 2 pasos).

**Probarlo ahora**: Actions → **"Alertas de extintores"** → **Run workflow**.
Si hay extintores que vencen en 30 días o menos, te llegará el correo en un minuto.
Si algo falla, la ejecución aparece en rojo y GitHub te avisa por correo.

Después se ejecuta solo todos los días a las 07:17 (hora UTC-4).

---

## Cosas a tener en cuenta

- **60 días sin cambios**: en repositorios públicos GitHub pausa las tareas programadas si no hay actividad (commits) en 60 días. Te manda un correo antes; basta con entrar a Actions y presionar **Enable workflow**, o hacer cualquier commit.
- **Sin login**: cualquiera que tenga el enlace de la página puede agregar o modificar extintores.
- **Probar en tu PC**: `cd backend && npm install && npm run dev` (API) y `npm run alertas` (revisión de correos). Usa el archivo `.env` (ver `.env.example`).
