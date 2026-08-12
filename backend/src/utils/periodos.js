// Agrupamiento de fechas en "períodos" (semana ISO 8601, quincena o mes),
// compartido por todos los reportes grupales/comparativos de la app
// (nutrición, cargas físicas...). Formato de clave zero-padded para que
// ordenar las claves como strings alcance para ordenarlas cronológicamente.
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const claveDePeriodo = (fecha, periodo) => {
  const d = new Date(fecha);
  const anio = d.getUTCFullYear();
  const mes = d.getUTCMonth();
  const dia = d.getUTCDate();

  if (periodo === "mes") return `${anio}-${String(mes + 1).padStart(2, "0")}`;
  if (periodo === "quincena") return `${anio}-${String(mes + 1).padStart(2, "0")}-${dia <= 15 ? "1" : "2"}`;

  // Semana ISO 8601: el jueves de esa semana cae en el año/semana que le da nombre.
  const fechaUtc = new Date(Date.UTC(anio, mes, dia));
  const diaSemana = (fechaUtc.getUTCDay() + 6) % 7; // lunes = 0
  fechaUtc.setUTCDate(fechaUtc.getUTCDate() - diaSemana + 3);
  const primerJueves = new Date(Date.UTC(fechaUtc.getUTCFullYear(), 0, 4));
  const semana =
    1 + Math.round(((fechaUtc - primerJueves) / 86400000 - 3 + ((primerJueves.getUTCDay() + 6) % 7)) / 7);
  return `${fechaUtc.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
};

const etiquetaDePeriodo = (clave, periodo) => {
  if (periodo === "mes") {
    const [anio, mes] = clave.split("-");
    return `${MESES[Number(mes) - 1]}-${anio.slice(2)}`;
  }
  if (periodo === "quincena") {
    const [anio, mes, mitad] = clave.split("-");
    return `${mitad === "1" ? "1ra" : "2da"} quinc. ${MESES[Number(mes) - 1]}-${anio.slice(2)}`;
  }
  const [anio, semana] = clave.split("-W");
  return `Sem ${semana} (${anio})`;
};

module.exports = { claveDePeriodo, etiquetaDePeriodo };
