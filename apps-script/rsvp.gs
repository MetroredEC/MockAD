/* Metrored · Lanzamiento Iñaquito & San Luis — RSVP (versión final) */
var CUPO = 100;   // personas en total, incluidos acompañantes (0 = sin límite)
var LANDING = 'https://metroredec.github.io/MockAD/lanzamiento.html';
var LOGO = 'https://metroredec.github.io/MockAD/assets/metrored-logo-white.png';
var MAPA = 'https://www.google.com/maps/search/?api=1&query=San+Luis+Shopping+Sangolqu%C3%AD';

/* ───────── Web app ───────── */

/* Conteos públicos para la constelación y el cupo: solo números, nunca nombres */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify(estadisticas()))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return ContentService.createTextOutput('ok');                 // bot: se descarta
  if (p.tipo === 'frase') { guardarFrase(p); return ContentService.createTextOutput('ok'); }
  if (!String(p.nombre || '').trim()) return ContentService.createTextOutput('ok'); // sin datos (p. ej. ejecución manual)
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // cupo exacto: el invitado y su acompañante deben caber juntos
    var pide = 1 + (Number(p.acompanantes) || 0);
    if (p.asistencia === 'Sí' && CUPO > 0 && estadisticas(true).quedan < pide) p.asistencia = 'Lista de espera';
    var tel = limpio(p.telefono);
    if (tel && tel.charAt(0) !== "'") tel = "'" + tel;                          // conserva el 0 inicial
    hojaRespuestas().appendRow([
      new Date(), limpio(p.nombre), limpio(p.apellido), limpio(p.email), tel,
      limpio(p.empresa), limpio(p.asistencia), Number(p.acompanantes) || 0,
      limpio(p.notas), limpio(p.invitacion)
    ]);
    CacheService.getScriptCache().remove('stats');
  } finally {
    lock.releaseLock();
  }
  try { enviarConfirmacion(p); } catch (err) { console.error(err); }          // un fallo de correo no pierde la fila
  return ContentService.createTextOutput('ok');
}

function estadisticas(fresco) {
  var cache = CacheService.getScriptCache();
  if (!fresco) { var c = cache.get('stats'); if (c) return JSON.parse(c); }
  var sh = hojaRespuestas(), n = sh.getLastRow();
  var filas = n > 1 ? sh.getRange(2, 1, n - 1, 8).getValues() : [];
  var invitados = 0, personas = 0;
  filas.forEach(function (r) { if (r[6] === 'Sí') { invitados++; personas += 1 + (Number(r[7]) || 0); } });
  var out = { invitados: invitados, confirmados: personas, cupo: CUPO, quedan: CUPO > 0 ? Math.max(0, CUPO - personas) : null };
  cache.put('stats', JSON.stringify(out), 30);
  return out;
}

function guardarFrase(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Frases') || ss.insertSheet('Frases', ss.getNumSheets());
  if (sh.getLastRow() === 0) sh.appendRow(['Fecha', 'Nombre', 'Frase']);
  sh.appendRow([new Date(), limpio(String(p.nombre || '').slice(0, 24)), limpio(String(p.frase || '').slice(0, 24))]);
}

/* ───────── Correo de confirmación ───────── */

function enviarConfirmacion(p) {
  var email = String(p.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  var nombre = esc(String(p.nombre || '').slice(0, 40));
  var estado = p.asistencia === 'Sí' ? 'si' : p.asistencia === 'Lista de espera' ? 'espera' : 'no';
  var asunto = {
    si: 'Tu lugar está confirmado · Lanzamiento Metrored',
    espera: 'Estás en la lista de espera · Lanzamiento Metrored',
    no: 'Gracias por avisarnos · Lanzamiento Metrored'
  }[estado];
  var opciones = { htmlBody: plantilla(nombre, estado, Number(p.acompanantes) === 1), name: 'Metrored Centros Médicos' };
  if (estado === 'si') opciones.attachments = [Utilities.newBlob(ics(), 'text/calendar', 'lanzamiento-metrored.ics')];
  MailApp.sendEmail(email, asunto, asunto + ' — Jueves 26 de noviembre, 10h00, San Luis Shopping.', opciones);
}

function plantilla(nombre, estado, acomp) {
  var fila = function (k, v) {
    return '<tr><td style="padding:12px 0;border-bottom:1px solid #e3edf7;color:#7690ac;font-size:14px">' + k +
      '</td><td style="padding:12px 0;border-bottom:1px solid #e3edf7;color:#0c2f5c;font-size:14px;text-align:right">' + v + '</td></tr>';
  };
  var titulo = function (a) { return '<p style="margin:0 0 6px;font-size:28px;line-height:1.15;color:#0c2f5c;font-weight:300">' + a + ' <b style="color:#1686f2;font-weight:600">' + nombre + '.</b></p>'; };
  var parrafo = function (t) { return '<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3c5878">' + t + '</p>'; };
  var cuerpo;
  if (estado === 'si') {
    cuerpo = titulo('Te esperamos,') +
      parrafo((acomp ? 'Tu asistencia y la de tu acompañante están confirmadas.' : 'Tu asistencia está confirmada.') + ' Adjuntamos la invitación para tu calendario.') +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e3edf7">' +
      fila('Fecha', 'Jueves 26 de noviembre, 2026') + fila('Hora', '10h00') + fila('Lugar', 'San Luis Shopping') + fila('Vestimenta', 'Smart casual') + '</table>' +
      '<p style="margin:28px 0 0"><a href="' + MAPA + '" style="display:inline-block;background:#1686f2;color:#fff;text-decoration:none;padding:13px 24px;border-radius:99px;font-size:15px">Cómo llegar</a></p>';
  } else if (estado === 'espera') {
    cuerpo = titulo('Estás en la lista,') + parrafo('El cupo del lanzamiento está completo. Si se libera un lugar, te escribiremos a este correo.');
  } else {
    cuerpo = titulo('Gracias por avisarnos,') + parrafo('Lamentamos que no puedas acompañarnos. Te esperamos pronto en Metrored Iñaquito y San Luis.');
  }
  return '<div style="background:#eef9ff;padding:32px 12px;font-family:Poppins,Arial,sans-serif">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden">' +
    '<tr><td style="background:#1686f2;padding:28px 32px"><img src="' + LOGO + '" alt="Metrored Centros Médicos" height="44" style="display:block;height:44px"></td></tr>' +
    '<tr><td style="padding:32px">' + cuerpo + '</td></tr>' +
    '<tr><td style="padding:20px 32px;background:#f6fbff;color:#7690ac;font-size:12px;line-height:1.5">Nuevo Metrored Iñaquito: Av. Juan Diguja y Vozandes<br>Grupo Hospital Metropolitano</td></tr>' +
    '</table></div>';
}

function ics() {
  var ahora = Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Metrored//Lanzamiento//ES', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:lanzamiento-inaquito-sanluis-20261126@metrored', 'DTSTAMP:' + ahora,
    'DTSTART:20261126T150000Z', 'DTEND:20261126T180000Z',
    'SUMMARY:Lanzamiento Metrored Iñaquito y San Luis', 'LOCATION:San Luis Shopping\\, Sangolquí\\, Ecuador',
    'DESCRIPTION:Vestimenta: smart casual.',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Lanzamiento Metrored', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

/* ───────── Pestaña Invitados: links personales automáticos ───────── */

function prepararInvitados() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  hojaRespuestas();
  var sh = ss.getSheetByName('Invitados') || ss.insertSheet('Invitados', ss.getNumSheets());
  sh.getRange(1, 1, 1, 4).setValues([['Nombre', 'Apellido', 'Notas', 'Link personal']]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.setColumnWidth(4, 520);
  actualizarLinks();
}

function linkPara(n, a) {
  n = String(n || '').trim(); a = String(a || '').trim();
  if (!n) return '';
  return LANDING + '?n=' + encodeURIComponent(n) + (a ? '&a=' + encodeURIComponent(a) : '');
}

function onEdit(e) {                       // se ejecuta solo al escribir o pegar nombres en Invitados
  var sh = e.range.getSheet();
  if (sh.getName() !== 'Invitados') return;
  var r0 = Math.max(2, e.range.getRow()), r1 = e.range.getLastRow();
  if (r1 < r0) return;
  var vals = sh.getRange(r0, 1, r1 - r0 + 1, 2).getValues();
  sh.getRange(r0, 4, vals.length, 1).setValues(vals.map(function (v) { return [linkPara(v[0], v[1])]; }));
}

function actualizarLinks() {               // regenera todos los links (y limpia el #ERROR! anterior)
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Invitados');
  if (!sh) return;
  sh.getRange('D2:D').clearContent();
  var n = sh.getLastRow();
  if (n < 2) return;
  var vals = sh.getRange(2, 1, n - 1, 2).getValues();
  sh.getRange(2, 4, n - 1, 1).setValues(vals.map(function (v) { return [linkPara(v[0], v[1])]; }));
}

/* ───────── Pruebas ───────── */

function probarCorreo() {
  enviarConfirmacion({ email: Session.getEffectiveUser().getEmail(), nombre: 'Prueba', asistencia: 'Sí', acompanantes: '0' });
}

function diagnostico() {
  Logger.log('Cuenta: ' + Session.getEffectiveUser().getEmail());
  Logger.log('Correos disponibles hoy: ' + MailApp.getRemainingDailyQuota());
  Logger.log('Conteos: ' + JSON.stringify(estadisticas(true)));
  probarCorreo();
  Logger.log('Correo de prueba enviado');
}

/* ───────── Utilidades ───────── */

/* La hoja de respuestas se busca por su encabezado: no importa el orden de las pestañas */
function hojaRespuestas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojas = ss.getSheets(), sh = hojas[0];
  for (var i = 0; i < hojas.length; i++) {
    if (hojas[i].getRange(1, 1).getValue() === 'Fecha de registro') { sh = hojas[i]; break; }
  }
  if (sh.getRange(1, 10).getValue() === '') sh.getRange(1, 10).setValue('Invitación');
  return sh;
}
function limpio(v) { v = String(v || '').slice(0, 500); return /^[=+\-@]/.test(v) ? "'" + v : v; }   // evita fórmulas inyectadas
function esc(v) { return v.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
