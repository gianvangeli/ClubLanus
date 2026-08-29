# Plataforma de Jugadores — Club Atlético Lanús

Aplicación web para la gestión del plantel de jugadores: fichas de jugador, biblioteca de videos, entrenamientos con planificación táctica y cargas físicas. Pensada para dos tipos de usuario: el **cuerpo técnico** (admin, entrenador, preparador físico), que carga y gestiona la información, y el **jugador**, que consulta su ficha, sus videos y sus entrenamientos.

## Demo en producción

- **App**: https://club-lanus.vercel.app
- **Backend (API)**: https://lanus-backend.onrender.com

El backend está en el plan gratuito de Render, así que si nadie lo usó en un rato "se duerme" y la primera carga tarda entre 30 y 60 segundos en volver a levantar. Después de esa primera carga anda normal.

## Funcionalidades

### Jugadores (cuerpo técnico)
- Alta, edición y ficha completa de cada jugador: datos personales, nacionalidad, contrato, agente, contacto de emergencia, composición corporal, partidos jugados, posiciones en cancha (selección múltiple sobre un diagrama de campo).
- Creación de una cuenta de acceso para que el jugador pueda loguearse (usuario + contraseña generada, se muestra una sola vez).
- **Cargas físicas**: carga de PDFs por jugador, mostrados en formato de agenda ("Cargas físicas día DD/MM").

### Biblioteca de videos
- El cuerpo técnico publica videos (archivo subido o link de YouTube) con título y descripción.
- Los videos de YouTube se embeben en la app (no salen a una pestaña externa) y se sigue registrando cuándo el jugador los abre, pausa o termina de ver, igual que con un video propio.
- El jugador ve solo las publicaciones que le corresponden.

### Entrenamientos
- **Agenda diaria**: cada sesión de entrenamiento tiene su propia página (no un desplegable), con un título visible para el jugador, planificación (visible solo para el cuerpo técnico) y un video del día (opcional — se puede guardar una sesión solo con información, sin archivo).
- **Ejercicios**: dentro de cada entrenamiento, el cuerpo técnico puede agregar "ejercicios" en formato de planilla (como la planilla en papel del club): tipo de trabajo, espacio, materiales, objetivo, cantidad de jugadores, duración, puntuación, entrenador a cargo. Incluye un **editor táctico interactivo** (dibujo sobre la cancha: jugadores arrastrables por equipo, flechas curvas/punteadas, formas, borrador, distintos tipos de cancha), inspirado en apps de pizarra táctica.
- **Reflexión del entrenamiento**: una página por sesión donde el cuerpo técnico completa una autoevaluación guiada (¿se logró el objetivo?, ¿cómo respondieron los jugadores?, cómo fue la intervención del CT, qué modificar para la próxima).
- **Entrenamientos extra / rutinas**: rutinas generales o individuales para trabajar fuera del club, con seguimiento de cumplimiento por jugador.

### Diagnóstico con IA
- A partir de la última evaluación nutricional y el historial de lesiones de un jugador, se puede generar un diagnóstico de su estado actual con pasos concretos para evolucionar, usando la API gratuita de Google Gemini.
- Cada generación queda guardada como un registro nuevo (se acumulan cronológicamente), para poder ver la evolución de los diagnósticos en el tiempo.

### Roles y accesos
- `admin`, `entrenador`, `preparador_fisico`: acceso completo a jugadores, biblioteca (carga) y entrenamientos.
- `jugador`: acceso de solo lectura a su propia ficha (parcial), su biblioteca y los entrenamientos/rutinas que le corresponden.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite, React Router, Axios, Konva (editor táctico) |
| Backend | Node.js + Express, JWT para auth, Multer para uploads |
| Base de datos | MySQL (Aiven, plan gratuito) |
| Archivos (videos, PDFs, dibujos) | Backblaze B2 (S3-compatible) en producción, disco local en desarrollo |
| Hosting | Vercel (frontend, plan gratuito) + Render (backend como Web Service, plan gratuito) |

### Por qué esta combinación
Todo el stack se eligió para no pagar nada ni pedir tarjeta/verificación de identidad:
- **Render** free tier no ofrece disco persistente (cualquier archivo escrito en disco se pierde en cada reinicio), por eso los archivos subidos se guardan en **Backblaze B2** en vez del filesystem del servidor.
- El backend detecta solo si hay que usar B2 o disco local: si están configuradas las variables `B2_KEY_ID`, `B2_APP_KEY` y `B2_BUCKET` usa B2 (producción); si no, usa disco (desarrollo). Ver `backend/src/config/storage.js`.
- **Aiven** ofrece MySQL gratis de por vida (1GB) sin tarjeta, usado como base de datos de producción. La conexión requiere SSL con el certificado propio de Aiven (`DB_CA_CERT`), ver `backend/src/config/db.js`.
- El frontend se despliega en **Vercel** (build estático de Vite) en vez de Render: el rewrite de rutas configurado en `frontend/vercel.json` resuelve las rutas de React Router al recargar la página, y Vercel redespliega automáticamente en cada push sin la fricción de acceso al repo que da Render (ver más abajo).

## Estructura del repositorio

```
backend/
  src/
    controllers/    lógica de cada recurso (jugadores, biblioteca, entrenamientos, ejercicios, rutinas, auth)
    routes/          rutas de la API, agrupadas por recurso
    middlewares/      auth (JWT + roles) y subida de archivos (multer)
    config/          conexión a la base (db.js) y almacenamiento de archivos (storage.js)
  sql/
    schema.sql       volcado completo del esquema de la base (para crear una base nueva desde cero)
    migrations/      cambios incrementales aplicados sobre el esquema a lo largo del desarrollo
frontend/
  src/
    pages/           una página por vista (Jugadores, Biblioteca, Entrenamientos, Ejercicio, Reflexión, etc.)
    components/      piezas reutilizables (editor táctico, reproductor de YouTube, layout, rutas protegidas)
    api/client.js    cliente de axios, con la URL del backend configurable por variable de entorno
    context/         contexto de autenticación
```

## Correr el proyecto en local

### Backend
```bash
cd backend
npm install
cp .env.example .env   # completar con los datos de tu MySQL local
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
El frontend corre en `http://localhost:5173` y ya tiene configurado un proxy a `http://localhost:3000` para `/api` (ver `vite.config.js`), así que no hace falta ninguna variable de entorno en desarrollo.

## Variables de entorno (backend)

Ver `backend/.env.example` para la lista completa. Las más importantes:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`: conexión a MySQL.
- `DB_SSL` / `DB_CA_CERT`: necesarias solo contra una base gestionada (Aiven, etc.) que exige SSL.
- `JWT_SECRET`: clave para firmar los tokens de sesión.
- `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`, `B2_ENDPOINT`, `B2_REGION`: credenciales de Backblaze B2. Si se dejan vacías, los archivos se guardan en disco local (solo para desarrollo).
- `GEMINI_API_KEY`: key gratuita de Google Gemini (se saca en https://aistudio.google.com/apikey), usada para el diagnóstico con IA del jugador. Sin esta variable, ese módulo devuelve error al generar.

## Variables de entorno (frontend)

- `VITE_API_URL`: URL completa del backend desplegado (ej. `https://lanus-backend.onrender.com`). En desarrollo se deja vacía porque se usa el proxy de Vite. En Vercel se carga como variable de entorno del proyecto (build time).

## Despliegue (resumen)

1. **Aiven**: crear un servicio MySQL free plan, aplicar `backend/sql/schema.sql` para crear las tablas.
2. **Backblaze B2**: crear un bucket privado y una Application Key con acceso a ese bucket.
3. **Render**: crear un Web Service para `backend/` (root directory `backend`, build `npm install`, start `node src/app.js`), cargando las variables de entorno de los dos pasos anteriores.
4. **Vercel**: importar el repo, con root directory `frontend` (build `npm run build`, output `dist`), cargando `VITE_API_URL` apuntando al backend de Render. El rewrite de SPA queda resuelto por `frontend/vercel.json`.

Render no tiene el acceso completo a este repositorio configurado (aparece el aviso "It looks like we don't have access to your repo" en los logs de build), así que los despliegues automáticos por push del **backend** no están garantizados: después de cada `git push` puede hacer falta un **Manual Deploy → Deploy latest commit** desde el dashboard de Render. Vercel sí redespliega el frontend automáticamente en cada push a `master`.
