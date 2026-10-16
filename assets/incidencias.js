/* Puntonet · Control de incidencias — lógica compartida por incidencias.html (panel) y queja.html (formulario) */

/* URL /exec del Apps Script (apps-script/incidencias.gs). Vacío = modo demo, los datos quedan solo en este navegador. */
const ENDPOINT = '';

const CATEGORIAS = ['Radiografía', 'Audiometría', 'Optometría', 'Resultados', 'Agendamiento', 'Tiempo de respuesta', 'Atención en sucursal', 'Plataforma', 'Confidencialidad', 'Otros'];
const ESTADOS = ['Abierta', 'En gestión', 'Cerrada'];
const LS_DATOS = 'pn_incidencias_v1', LS_CLAVE = 'pn_incidencias_clave';

/* Histórico 2026 (mismo contenido que HISTORICO en apps-script/incidencias.gs), usado solo en modo demo */
const HISTORICO = [
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

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = v => String(v ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
const hoy = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmtFecha = f => f ? f.split('-').reverse().join('/') : '';

/* ───────── Almacenamiento ───────── */

const local = {
  async listar() {
    try {
      const s = localStorage.getItem(LS_DATOS);
      if (s) return JSON.parse(s);
    } catch (e) {}
    const ahora = new Date().toISOString();
    const semilla = HISTORICO.map((h, i) => ({ id: 'h' + (i + 1), fecha: h[0], descripcion: h[1], sucursal: h[2], reporta: h[3], reportado: h[4], categoria: h[5], estado: 'Abierta', seguimiento: '', creado: ahora, actualizado: ahora }));
    this.escribir(semilla);
    return semilla;
  },
  escribir(lista) { try { localStorage.setItem(LS_DATOS, JSON.stringify(lista)); } catch (e) {} },
  async guardar(inc) {
    const lista = await this.listar(), i = lista.findIndex(x => x.id === inc.id), ahora = new Date().toISOString();
    if (i >= 0) lista[i] = { ...lista[i], ...inc, actualizado: ahora };
    else lista.push({ ...inc, creado: ahora, actualizado: ahora });
    this.escribir(lista);
    return lista;
  },
  async eliminar(id) {
    const lista = (await this.listar()).filter(x => x.id !== id);
    this.escribir(lista);
    return lista;
  }
};

const remoto = {
  clave() {
    let c = '';
    try { c = localStorage.getItem(LS_CLAVE) || ''; } catch (e) {}
    if (!c) {
      c = prompt('Clave de acceso de Puntonet:') || '';
      try { localStorage.setItem(LS_CLAVE, c); } catch (e) {}
    }
    return c;
  },
  olvidarClave() { try { localStorage.removeItem(LS_CLAVE); } catch (e) {} },
  async listar() {
    const r = await fetch(ENDPOINT + '?clave=' + encodeURIComponent(this.clave()), { cache: 'no-store' });
    const j = await r.json();
    if (j.error === 'clave') { this.olvidarClave(); throw new Error('clave'); }
    return j.incidencias || [];
  },
  async enviar(campos) {
    await fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ clave: this.clave(), ...campos }) });
    return this.listar();
  },
  guardar(inc) { return this.enviar(inc); },
  eliminar(id) { return this.enviar({ accion: 'eliminar', id }); }
};

const store = ENDPOINT ? remoto : local;

const nuevoId = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);

/* Sugerencia de categoría por palabras clave mientras se escribe la descripción */
function sugerirCategoria(t) {
  t = norm(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const reglas = [
    [/RESULTADOS DE OTRA|LES LLEGAN RESULTADOS|CONFIDENCIAL/, 'Confidencialidad'],
    [/PLATAFORMA|MIGRACION|ACCESOS/, 'Plataforma'],
    [/\bRX\b|RADIOGRAF|COBB|ANGULO/, 'Radiografía'],
    [/AGENDA/, 'Agendamiento'],
    [/NO SE TIENE RESPUESTA|SIN RESPUESTA|LLAMADAS|NO ENVIAN|DEMORA|TIEMPO DE ENTREGA/, 'Tiempo de respuesta'],
    [/RESULTADO|CARGAD|INCOMPLET/, 'Resultados'],
    [/AUDIOMETR|AUDITIV/, 'Audiometría'],
    [/OPTOMETR/, 'Optometría'],
    [/TURNO|ABIERTO|ATENCION/, 'Atención en sucursal']
  ];
  const r = reglas.find(([re]) => re.test(t));
  return r ? r[1] : 'Otros';
}
