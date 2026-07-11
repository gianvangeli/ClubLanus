const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const bibliotecaRoutes = require("./routes/bibliotecaRoutes");
const jugadoresRoutes = require("./routes/jugadoresRoutes");
const entrenamientosRoutes = require("./routes/entrenamientosRoutes");
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/biblioteca", bibliotecaRoutes);
app.use("/api/jugadores", jugadoresRoutes);
app.use("/api/entrenamientos", entrenamientosRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend funcionando correctamente" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

const db = require("./config/db");

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS resultado");

    res.json({
      message: "Conexión a MySQL correcta",
      resultado: rows[0].resultado,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error conectando a MySQL",
      error: error.message,
    });
  }
});

// Errores de subida de archivos (multer): tamaño excedido, tipo inválido, etc.
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message || "Error al procesar el archivo" });
  }
  next();
});

