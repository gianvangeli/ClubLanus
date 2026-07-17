const fs = require("fs");
const path = require("path");

// Capa de almacenamiento de archivos (videos, imágenes, PDFs).
//
// En desarrollo local (sin credenciales de B2) se guarda todo en disco,
// como siempre. En producción, con las variables B2_* configuradas, los
// archivos se suben a Backblaze B2 (compatible con S3) porque hosts como
// Render no ofrecen disco persistente gratis: cualquier archivo escrito en
// disco se pierde en cada reinicio del servidor.
const modoNube = Boolean(process.env.B2_KEY_ID && process.env.B2_APP_KEY && process.env.B2_BUCKET);

const uploadsDir = path.join(__dirname, "..", "..", "uploads");

const nombreUnico = (nombreOriginal) => {
  const ext = path.extname(nombreOriginal);
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
};

let s3Client;
const getClienteS3 = () => {
  if (!s3Client) {
    const { S3Client } = require("@aws-sdk/client-s3");
    s3Client = new S3Client({
      endpoint: process.env.B2_ENDPOINT,
      region: process.env.B2_REGION || "auto",
      credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APP_KEY,
      },
    });
  }
  return s3Client;
};

// Guarda un archivo (buffer en memoria, subido vía multer.memoryStorage) y
// devuelve la "key" con la que se lo va a identificar después (servir/borrar).
const guardarArchivo = async (buffer, carpeta, nombreOriginal) => {
  const key = `${carpeta}/${nombreUnico(nombreOriginal)}`;

  if (!modoNube) {
    const rutaCarpeta = path.join(uploadsDir, carpeta);
    fs.mkdirSync(rutaCarpeta, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, key), buffer);
    return `/uploads/${key}`;
  }

  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  await getClienteS3().send(
    new PutObjectCommand({
      Bucket: process.env.B2_BUCKET,
      Key: key,
      Body: buffer,
    })
  );
  return key;
};

// Envía el archivo al cliente: en disco lo manda directo, en la nube
// redirige a una URL firmada (temporal) para no hacer pasar el video/PDF
// entero por el servidor.
const servirArchivo = async (req, res, key) => {
  if (!modoNube) {
    const rutaArchivo = path.join(__dirname, "..", "..", key);
    return res.sendFile(rutaArchivo, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ message: "Archivo no encontrado en el servidor" });
      }
    });
  }

  const { GetObjectCommand } = require("@aws-sdk/client-s3");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  const url = await getSignedUrl(
    getClienteS3(),
    new GetObjectCommand({ Bucket: process.env.B2_BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
  res.redirect(302, url);
};

// Borra el archivo. No hace falta esperarlo (fire and forget), igual que
// antes con fs.unlink.
const eliminarArchivo = (key) => {
  if (!modoNube) {
    fs.unlink(path.join(__dirname, "..", "..", key), () => {});
    return;
  }

  const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
  getClienteS3()
    .send(new DeleteObjectCommand({ Bucket: process.env.B2_BUCKET, Key: key }))
    .catch(() => {});
};

module.exports = { guardarArchivo, servirArchivo, eliminarArchivo, modoNube };
