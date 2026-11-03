// Reparación de una sola vez para el bug de doble-stringify en
// actualizarEjercicioTactico (ver ejerciciosTacticosController.js): cualquier
// fila de ejercicios_tacticos a la que se le haya dibujado y guardado algo
// ANTES del fix quedó con dibujo_json doble-encodeado (un string JSON que
// contiene, como texto, otro string JSON) — eso hace que la pizarra se vea
// en blanco al recargar, aunque el dibujo en sí nunca se perdió.
//
// Este script recorre todas las filas, intenta JSON.parse dos veces sobre
// cada dibujo_json no nulo: si la primera vuelta ya da un objeto, la fila
// está sana y se deja intacta; si da un string, significa que estaba
// doble-encodeada, y se re-guarda la versión correcta (un solo stringify).
//
// Se corre a mano una sola vez después de deployar el fix de código:
//   node scripts/reparar-dibujo-json-tacticos.js
// No es una migración SQL porque es lógica (parsear/detectar/corregir), no
// un cambio de esquema.

require("dotenv").config({ quiet: true });
const db = require("../src/config/db");

async function main() {
  const [filas] = await db.query(
    "SELECT id, dibujo_json FROM ejercicios_tacticos WHERE dibujo_json IS NOT NULL"
  );

  let revisadas = 0;
  let reparadas = 0;
  let invalidas = 0;

  for (const fila of filas) {
    revisadas++;
    let primerParse;
    try {
      primerParse = JSON.parse(fila.dibujo_json);
    } catch {
      invalidas++;
      console.warn(`[invalida] ejercicio_tactico ${fila.id}: dibujo_json no es ni siquiera JSON válido, se deja intacto`);
      continue;
    }

    if (typeof primerParse !== "string") {
      // Ya es un objeto: la fila está sana, no hace falta tocarla.
      continue;
    }

    let segundoParse;
    try {
      segundoParse = JSON.parse(primerParse);
    } catch {
      invalidas++;
      console.warn(`[invalida] ejercicio_tactico ${fila.id}: doble-encodeada pero el contenido interno no parsea, se deja intacta`);
      continue;
    }

    if (segundoParse && typeof segundoParse === "object") {
      await db.query("UPDATE ejercicios_tacticos SET dibujo_json = ? WHERE id = ?", [
        JSON.stringify(segundoParse),
        fila.id,
      ]);
      reparadas++;
      console.log(`[reparada] ejercicio_tactico ${fila.id}`);
    }
  }

  console.log(`\nListo. Revisadas: ${revisadas} · Reparadas: ${reparadas} · Inválidas (sin tocar): ${invalidas}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Error al reparar dibujo_json:", error);
  process.exit(1);
});
