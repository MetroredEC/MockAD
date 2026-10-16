/* Puntonet · Control de incidencias Metrored — backend en Google Sheets
 *
 * Instalación:
 *  1. Crear una hoja de cálculo nueva → Extensiones → Apps Script → pegar este archivo.
 *  2. Cambiar CLAVE por una clave propia (la que usará el equipo de Puntonet en la página).
 *  3. Ejecutar una vez cargarHistorico() para subir las incidencias del 2026 ya registradas.
 *  4. Implementar → Nueva implementación → Aplicación web
 *     (Ejecutar como: yo · Quién tiene acceso: cualquier persona).
 *  5. Copiar la URL /exec en ENDPOINT dentro de incidencias.html.
 */
var CLAVE = 'cambiar-esta-clave';
var HOJA = 'Incidencias';
var COLS = ['id', 'fecha', 'descripcion', 'sucursal', 'reporta', 'reportado', 'categoria', 'estado', 'seguimiento', 'creado', 'actualizado'];
var CAMPOS = ['fecha', 'descripcion', 'sucursal', 'reporta', 'reportado', 'categoria', 'estado', 'seguimiento'];

/* ───────── Web app ───────── */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.clave !== CLAVE) return json({ error: 'clave' });
  return json({ incidencias: leer() });
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.clave !== CLAVE) return json({ error: 'clave' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (p.accion === 'eliminar') eliminar(p.id);
    else guardar(p);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

/* ───────── Datos ───────── */

function hoja() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(HOJA) || ss.insertSheet(HOJA, 0);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLS.length).setFontWeight('bold');
    sh.getRange('B:B').setNumberFormat('@');                        // la fecha se guarda tal cual (AAAA-MM-DD)
  }
  return sh;
}

function leer() {
  var sh = hoja(), n = sh.getLastRow();
  if (n < 2) return [];
  var tz = Session.getScriptTimeZone();
  return sh.getRange(2, 1, n - 1, COLS.length).getValues().map(function (r) {
    var o = {};
    COLS.forEach(function (c, i) {
      var v = r[i];
      o[c] = v instanceof Date ? Utilities.formatDate(v, tz, c === 'fecha' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss") : String(v);
    });
    return o;
  });
}

function fila(id) {
  var sh = hoja(), n = sh.getLastRow();
  if (!id || n < 2) return 0;
  var ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function guardar(p) {
  if (!String(p.descripcion || '').trim()) return;
  var sh = hoja(), ahora = new Date(), r = fila(p.id);
  var valores = CAMPOS.map(function (c) { return limpio(p[c]); });
  if (r) {
    sh.getRange(r, 2, 1, CAMPOS.length).setValues([valores]);
    sh.getRange(r, COLS.indexOf('actualizado') + 1).setValue(ahora);
  } else {
    sh.appendRow([p.id || Utilities.getUuid()].concat(valores, [ahora, ahora]));
  }
}

function eliminar(id) {
  var r = fila(id);
  if (r) hoja().deleteRow(r);
}

/* ───────── Histórico 2026 (ejecutar una sola vez) ───────── */

function cargarHistorico() {
  var sh = hoja();
  if (sh.getLastRow() > 1) throw new Error('La hoja ya tiene incidencias; no se duplica el histórico.');
  var ahora = new Date();
  var filas = HISTORICO.map(function (h, i) {
    return ['h' + (i + 1), h[0], h[1], h[2], h[3], h[4], h[5], 'Abierta', '', ahora, ahora];
  });
  sh.getRange(2, 1, filas.length, COLS.length).setValues(filas);
}

/* fecha · descripción · sucursal · reporta · reportado · categoría
 * Los nombres de pacientes se reservan porque este archivo vive en un repositorio público. */
var HISTORICO = [
  ['2026-02-02', 'RADIOGRAFIA DE MALA CALIDAD, PIDEN ENVIAR REQUERIMIENTO POR CORREO PARA COORDINAR OTRA CITA', 'MANTA', 'MILENA ANDRADE', 'SI', 'Radiografía'],
  ['2026-02-23', 'NO SE CARGABAN LOS RESULTADOS DE UN COLABORADOR, FUERON CARGADOS DESPUES DE LA JORNADA DEL MEDICO DE GUAYAQUIL', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Resultados'],
  ['2026-03-06', 'RADIOGRAFIA INDICABA DESVIACION DE COLUMNA SIN PONER LOS ANGULOS, SE SOLICITO AYUDA DONDE INDICARON MANDAR CORREO A MI EXPERIENCIA METRORED PARA QUE REVISE GERENCIAL', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Radiografía'],
  ['2026-03-17', 'RADIOGRAFIAS DE MALA CALIDAD (BAJA CALIDAD Y FALTA DE NITIDEZ)', 'QUITO', 'MISHEL CARDENAS', 'SI', 'Radiografía'],
  ['2026-03-27', 'DEJAN PENDIENTE DE AGENDAMIENTO AUDIOMETRÍAS, NUNCA LAS AGENDAN SE RETRASA 1 SEMANA EL PROCESO DE SELECCIÓN', 'QUITO', 'EMILIA LAGOS / MISHEL CARDENAS', 'SI', 'Agendamiento'],
  ['2026-03-30', 'EXAMENES DE DROGAS INCOMPLETOS', 'EL COCA', 'MILENA ANDRADE', 'SI', 'Resultados'],
  ['2026-03-31', 'EXAMENES NO ESTABAN COMPLETOS, ERA FICHA PERIODICA. ESPERAMOS 35 MINUTOS PARA LA SUBIDA COMPLETA DE RESULTADOS HECHOS HACE MAS DE 5 MESES', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Resultados'],
  ['2026-04-01', 'NO LES AGENDARON AUDIOMETRIA A DOS CANDIDATOS, SE AGENDARON AL DIA SIGUIENTE', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Agendamiento'],
  ['2026-04-03', 'SE SOLICITA RADIOGRAFIAS LUMBARES Y REALIZAN RADIOGRAFIAS CERVICALES, SE REAGENDA Y SE VUELVE A HACER LA RX DIAS DESPUES', 'QUITO', 'MISHEL CARDENAS', 'SI', 'Radiografía'],
  ['2026-04-09', 'CANDIDATA LLEGA A LA HORA AGENDADA Y EL CENTRO MEDICO NO SE ENCUENTRA ABIERTO, SE RETRASA SU OPTOMETRIA PORQUE LE HACEN TOMAR TURNO Y LUEGO LE INFORMAN QUE YA PASO SU TURNO PARA LA OPTOMETRIA', 'LA CAROLINA', 'ISABEL CAJO / MISHEL CARDENAS', 'SI', 'Atención en sucursal'],
  ['2026-04-17', 'ENVIAN SOLICITUD DE EXAMENES DIA VIERNES 17 Y NO SE TIENE RESPUESTA HASTA EL LUNES 20 HASTA LAS 12, SE DEBE SOLICITAR QUE POR FAVOR NOS AYUDEN PARA OBTENER UNA RESPUESTA', 'QUITO', 'HENRY ULLAURI / MISHEL CARDENAS', 'SI', 'Tiempo de respuesta'],
  ['2026-04-24', 'MALA CALIDAD EN REPORTES DE RX (REPORTAN UN DX SIN EMBARGO NO COLOCAN ANGULOS EN EL REPORTE)', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Radiografía'],
  ['2026-05-06', 'LES LLEGAN RESULTADOS DE LOS EXAMENES A LOS POSTULANTES', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Confidencialidad'],
  ['2026-05-21', 'NO SE ESTA PONIENDO ANGULOS EN LAS RADIOGRAFIAS DE QUITO', 'QUITO', 'MILENA ANDRADE', 'SI', 'Radiografía'],
  ['2026-05-26', 'EXAMEN AUDITIVO REALIZADO A PESAR DE INDICACIONES DE NO REALIZAR, DENTRO DE LA CABINA AUN SE ESCUCHABAN RUIDOS EXTERNOS', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Audiometría'],
  ['2026-05-26', 'RX CON ALTERACIÓN ANATÓMICA EVIDENTE, SIN EMBARGO NO SE REPORTA EN EL INFORME', 'LA CAROLINA', 'SILVIA MERA', 'NO', 'Radiografía'],
  ['2026-05-27', 'AUN SE DEBE SOLICITAR EXAMENES A PESAR DE HABER PASADO EL TIEMPO DE ENTREGA', '', 'MISHEL CARDENAS', '', 'Tiempo de respuesta'],
  ['2026-05-28', 'RX LATERAL DE COLUMNA LUMBAR ES TOTALMENTE ILEGIBLE', 'QUITO', 'SILVIA MERA', 'SI', 'Radiografía'],
  ['2026-06-01', 'SE SOLICITA EXAMENES EN HORARIO ACORDADO Y NO SE TIENE RESPUESTA', 'NACIONAL', 'MISHEL CARDENAS', 'SI', 'Tiempo de respuesta'],
  ['2026-06-02', 'NO SE TIENE RESPUESTA DE LA SOLICITUD DEL 01/02/2026 HASTA LA 1PM SE HACE UNA NUEVA SOLICITUD A LAS 3PM Y NO SE TIENE RESPUESTA SE INTENTA CONTACTAR CON JULY SIN RESPUESTA ALGUNA', 'NACIONAL', 'MISHEL CARDENAS', 'SI', 'Tiempo de respuesta'],
  ['2026-06-03', 'NO SE TIENE RESPUESTA DE LA SOLICITUD DEL 02/06/2026 HASTA LAS 10:30AM', 'NACIONAL', 'MISHEL CARDENAS', 'SI', 'Tiempo de respuesta'],
  ['2026-06-03', 'NO SE ATIENDEN LAS LLAMADAS DE PARTE DE LA PERSONA ENCARGADA', 'NACIONAL', 'MISHEL CARDENAS', '', 'Tiempo de respuesta'],
  ['2026-06-04', '8:37 AM NO SE SUBEN LOS RESULTADOS, NO HAY RESPUESTA TELEFONICA POR PARTE DE LA ENCARGADA, SUBEN RESULTADOS SIN OPTOMETRIAS NI AUDIOMETRIAS A PESAR DE HABER HABLADO CON ELLOS E INDICADO QUE SE NECESITABA ESOS RESULTADOS CON URGENCIA', 'NACIONAL', 'MISHEL CARDENAS', 'NO', 'Resultados'],
  ['2026-06-04', 'NO ESTUVIERON CARGADOS LOS RESULTADOS DE EXÁMENES AGENDADOS PREVIAMENTE', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Resultados'],
  ['2026-06-05', 'NO ESTUVIERON CARGADOS LOS RESULTADOS DE EXÁMENES AGENDADOS PREVIAMENTE', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Resultados'],
  ['2026-06-05', 'EN LOS RESULTADOS DE UNA COLABORADORA DE GUAYAQUIL [NOMBRE RESERVADO] ESTÁN LOS RESULTADOS DE OTRA PERSONA', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Confidencialidad'],
  ['2026-06-05', 'SOLICITAN INFORMACIÓN DEL PACIENTE [NOMBRE RESERVADO]: INDICA QUE SÍ SE HIZO SU AUDIOMETRÍA, SIN EMBARGO NO ESTÁ CARGADA', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Resultados'],
  ['2026-06-05', 'SE SOLICITA QUE ENVÍEN LA AUDIOMETRÍA DEL MISMO PACIENTE [NOMBRE RESERVADO] EL DÍA SÁBADO Y NO ENVÍAN; SE RECIBE EL DÍA DOMINGO', 'GUAYAQUIL', 'MISHEL CARDENAS', 'NO', 'Tiempo de respuesta'],
  ['2026-06-08', 'POR CAMBIO DE PLATAFORMAS NO CUENTAN CON EXAMENES SOLICITADOS, NO SE TIENE LOS ACCESOS PARA LOS MISMOS', 'QUITO', 'MISHEL CARDENAS', 'SI', 'Plataforma'],
  ['2026-06-09', 'NO HAY MIGRACIÓN DE EXAMENES ANTERIORES EN LA NUEVA PLATAFORMA', 'NACIONAL', 'MISHEL CARDENAS', 'SI', 'Plataforma'],
  ['2026-06-09', 'RADIOGRAFÍA DE COLABORADOR CON ÁNGULO DE COBB DE 13 GRADOS REPORTADO POR METRORED EN 2025 Y 2026. EN 2023 TIENE RADIOGRAFÍA CON ÁNGULO DE COBB DE 5 GRADOS Y EN 2024 DE 6 GRADOS. POSTERIOR A LA RADIOGRAFÍA DE METRORED ACUDIÓ A OTRO PROVEEDOR: ÁNGULO DE COBB DE 5 GRADOS', 'GUAYAQUIL', 'MILENA ANDRADE', 'SI', 'Radiografía']
];

/* ───────── Utilidades ───────── */

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function limpio(v) { v = String(v == null ? '' : v).slice(0, 2000); return /^[=+\-@]/.test(v) ? "'" + v : v; }   // evita fórmulas inyectadas
