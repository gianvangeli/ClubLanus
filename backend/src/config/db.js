const mysql = require("mysql2/promise");

// Aiven (y la mayoría de los MySQL gestionados) exigen conexión SSL con su
// propio certificado de CA (no firmado por una autoridad pública), así que
// hace falta pasárselo explícitamente en DB_CA_CERT. En local no hace falta:
// se activa solo si DB_SSL=true en el .env.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }
      : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;