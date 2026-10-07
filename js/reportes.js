/* =========================================================================
   BITACORA 24RU1 - Documentos imprimibles (reporte de turno, historial,
   concentrados y asistencia/horas extra). Membrete y pie en cada hoja.
   ========================================================================= */
"use strict";
B.rep = {};
const IMG = n => new URL("img/" + n, location.href).href;      // funciona con servidor y sin servidor

B.rep.documento = function (titulo, cuerpo, horizontal) {
  const anchoM = horizontal ? 8.6 : 7.4, anchoP = horizontal ? 9.4 : 7.4;
  const altoM = Math.min(anchoM * B.imgs.aspM, 2.2), altoP = Math.min(anchoP * B.imgs.aspP, 2.2);
  const cab = (altoM + 0.15).toFixed(2), pie = (altoP + 0.1).toFixed(2);
  const disp = ((horizontal ? 8.5 : 11) - 0.58 - (+cab) - (+pie)) * 96;
  const css = `
  @page { size: letter ${horizontal ? "landscape" : "portrait"}; margin: 0.3in 0.5in 0.28in 0.5in;
    @top-right { content: "Pág. " counter(page) " de " counter(pages); font-family: Arial, sans-serif; font-size: 7pt; color: #666; } }
  html, body { margin: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .membrete { position: fixed; top: 0; left: 0; right: 0; text-align: center; }
  .membrete img { width: ${anchoM}in; height: ${altoM.toFixed(2)}in; object-fit: contain; display: block; margin: 0 auto; }
  .pie { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; }
  .pie img { width: ${anchoP}in; height: ${altoP.toFixed(2)}in; object-fit: contain; display: block; margin: 0 auto; }
  table.pagina { width: 100%; border-collapse: collapse; }
  table.pagina > thead > tr > td { height: ${cab}in; padding: 0; }
  table.pagina > tfoot > tr > td { height: ${pie}in; padding: 0; }
  table.pagina > tbody > tr > td { padding: 0; vertical-align: top; }
  .contenido { width: ${horizontal ? "10in" : "7.5in"}; margin: 0 auto; }
  @media screen {
    body { padding: 0.3in 0.5in; background: #fff; display: flex; flex-direction: column; min-height: 10.4in; }
    .membrete, .pie { position: static; }
    .membrete { order: 0; } table.pagina { order: 1; } .pie { order: 2; margin-top: auto; padding-top: 12px; }
    table.pagina > thead > tr > td, table.pagina > tfoot > tr > td { height: 10px; }
  }
  .titulo { text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline; margin: 2px 0 4px; }
  .rojo { color: #FF0000; }
  .sub { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .sub .izq { color: #595959; font-size: 8pt; }
  .sub .fecha { color: #FF0000; font-weight: bold; font-size: 11pt; }
  .resumen { background: #F2F2F2; border: 1px solid #BFBFBF; color: #691C32; font-weight: bold; font-size: 7pt; text-align: center; padding: 3px 4px; margin-bottom: 6px; }
  table.sec { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 6px; page-break-inside: auto; }
  table.sec td, table.sec th { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; word-wrap: break-word; font-size: 8pt; }
  table.sec th { background: #D9D9D9; font-size: 7pt; font-weight: bold; text-align: center; }
  table.sec tr { page-break-inside: avoid; }
  table.sec td.lbl { font-weight: bold; text-align: center; vertical-align: middle; font-size: 8pt; }
  table.sec td.lbl img { display: block; margin: 2px auto 6px; }
  .c { text-align: center; }
  .b { font-weight: bold; }
  .fuera { color: #C00000; font-weight: bold; background: #FFD2D2; }
  .lineas div { margin: 1px 0; }
  .firmas td { text-align: center; }
  table.firmas { page-break-inside: avoid; break-inside: avoid; }
  h2.doc { text-align: center; font-size: 14pt; margin: 2px 0 2px; color: #404040; }
  .doc-sub { text-align: center; color: #691C32; font-weight: bold; font-size: 8.5pt; margin-bottom: 6px; }
  table.dat { width: 100%; border-collapse: collapse; }
  table.dat th { background: #C6E0B4; border: 1px solid #808080; font-size: 7pt; padding: 3px 2px; }
  table.dat td { border: 1px solid #A6A6A6; font-size: 7.5pt; padding: 2px 3px; text-align: center; vertical-align: middle; }
  table.dat thead { display: table-header-group; }
  table.dat tr { page-break-inside: avoid; }
  table.dat.guinda th { background: #691C32; color: #fff; }
  .izq { text-align: left !important; }
  .nota { font-size: 6.5pt; color: #595959; font-style: italic; margin-top: 4px; }
  .verde { color: #1E6B4A; } .gris { color: #777; }
  td.amarillo { background: #FFF2CC; }
  tr.falta td { background: #FFF2CC; }
  .faltan { color: #C00000; font-weight: bold; font-size: 6.5pt; }
  .com { color: #404040; font-size: 7pt; margin-top: 1px; }
  .com.obs { font-size: 6.5pt; line-height: 1.15; }
  .est { font-weight: bold; font-size: 7pt; text-align: center; }
  `;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${U.esc(titulo)}</title><style>${css}</style></head>
  <body><div class="membrete"><img src="${B.imgUrl("membrete")}"></div><div class="pie"><img src="${B.imgUrl("pie")}"></div>
  <table class="pagina"><thead><tr><td></td></tr></thead><tfoot><tr><td></td></tr></tfoot><tbody><tr><td><div class="contenido">${cuerpo}</div></td></tr></tbody></table>
  <script>
  // Si el contenido rebasa ligeramente una hoja, se reduce para que quepa en una sola
  function ajustar() {
    var c = document.querySelector(".contenido"), disp = ${disp.toFixed(1)};
    c.style.zoom = "";
    // renglones opcionales (4o y 5o de "ultimos espacios confinados"): se quitan si el reporte no cabe en una hoja
    var op = c.querySelectorAll("tr.opc"), i;
    for (i = 0; i < op.length; i++) op[i].style.display = "";
    for (i = 0; i < op.length && c.scrollHeight > disp; i++) op[i].style.display = "none";
    var h = c.scrollHeight;
    if (h > disp && h <= disp * 1.25) c.style.zoom = (disp / h * 0.96).toFixed(3);
  }
  if (document.readyState === "complete") ajustar(); else window.addEventListener("load", ajustar);
  </script></body></html>`;
};

const pct = a => `<colgroup>${a.map(x => `<col style="width:${x}%">`).join("")}</colgroup>`;
const lineas = arr => `<div class="lineas">${arr.map(x => `<div>• ${U.br(x)}</div>`).join("")}</div>`;
const firma = ini => { const p = ini && B.dom.persona(ini); return p ? `${U.esc(p.nombre)}<br>RPE: ${U.esc(p.rpe)} &nbsp; (${U.esc(p.ini)})` : (ini ? U.esc(ini) : "&nbsp;<br>&nbsp;"); };

/* ---------------------------------------------------------------- reporte del turno */
B.rep.turno = function (f, t) {
  const d = B.dom.reporte(f, t), c = B.estado.config;
  let h = `<div class="titulo">NOTAS DEL TURNO <span class="rojo">${t} ${U.esc(B.t.nombre(t))}</span></div>
  <div class="sub"><span class="izq">${U.esc(B.t.periodo())} &nbsp;|&nbsp; Horario: ${U.esc(B.t.horario(t))}</span><span class="fecha">${U.larga(f)}</span></div>
  <div class="resumen">RESUMEN: &nbsp;Esp. confinados liberados: ${d.ec.length} (acumulado: ${d.acum}) &nbsp;|&nbsp; Vigilancias C.I.: ${d.vig.length}
   &nbsp;|&nbsp; Realizadas: ${d.nReal} &nbsp;|&nbsp; En proceso: ${d.nProc} &nbsp;|&nbsp; Pendientes: ${d.nPend} &nbsp;|&nbsp; Personal: ${d.nPers}</div>`;
  let algo = false;
  if (d.vig.length) {
    algo = true;
    h += `<table class="sec">${pct([14.4, 4.3, 23.5, 16.9, 11.1, 29.8])}
      <tr><td class="lbl" rowspan="${d.vig.length + 1}"><img src="${IMG("ico1.png")}" width="30">VIGILANCIA C.I.<br>CADA HORA</td>
      <th># VIG.</th><th>DESCRIPCIÓN</th><th>FECHA DE INICIO Y HORA</th><th># DE INOP</th><th>UBICACIÓN</th></tr>` +
      d.vig.map(v => {
        const fin = B.t.fin(f, t);
        const desc = v.desc + (v.obs ? " - " + v.obs : "") + (v.retiro && v.retiro <= fin ? "  (RETIRADA " + U.fh(v.retiro) + ")" : "");
        return `<tr><td class="c">${v.num}</td><td>${U.esc(desc)}</td><td class="c">${U.fh(v.inicio)}</td><td class="c">${U.esc(v.inop)}</td><td>${U.esc([v.ubic, v.comp].filter(Boolean).join(" / "))}</td></tr>`;
      }).join("") + `</table>`;
  }
  const faltan = e => { const x = B.dom.ecFaltan(e); return x.length ? `<div class="faltan">FALTA: ${x.join(", ")}</div>` : ""; };
  if (d.ec.length) {
    algo = true;
    h += `<table class="sec">${pct([14.4, 4.3, 17.2, 5.6, 5.6, 5.6, 5.6, 5.6, 5.6, 11.1, 19.4])}
      <tr><td class="lbl" rowspan="${d.ec.length + 1}"><img src="${IMG("ico2.png")}" width="34">ESPACIOS<br>CONFINADOS<br>LIBERADOS<br>EN EL TURNO</td>
      <th>#</th><th>ESPACIO CONFINADO</th><th>O2<br>(%)</th><th>HR<br>(%)</th><th>TEMP<br>(°C)</th><th>LEL<br>(%)</th><th>CO<br>(ppm)</th><th>H2S<br>(ppm)</th>
      <th>DÍA QUE SE LIBERÓ / HORA</th><th>PERSONAL TSI / OBSERVACIONES</th></tr>` +
      d.ec.map(e => `<tr class="${B.dom.ecFaltan(e).length ? "falta" : ""}"><td class="c b">${U.esc(B.dom.ecNum(e))}</td><td class="c">${U.esc(e.esp)}${faltan(e)}</td>` +
        ["o2", "hr", "temp", "lel", "co", "h2s"].map(k => `<td class="c ${B.dom.rango(k, e[k]) ? "fuera" : ""}">${U.esc(e[k])}</td>`).join("") +
        `<td class="c">${U.fh(e.lib)}</td><td class="c">${U.esc(e.pers)}${e.obs ? `<div class="com obs">${U.esc(e.obs)}</div>` : ""}</td></tr>`).join("") + `</table>`;
  }
  if (d.ultEc.length) {
    // completa hasta 5 con los ultimos liberados en turnos anteriores (en orden de #); los mas antiguos ("opc")
    // se quitan solos si el reporte no cabe en una hoja carta, dejando minimo 3 espacios a la vista
    h += `<table class="sec">${pct([14.4, 5.3, 39.3, 16.7, 24.3])}
      <tr><td class="lbl" rowspan="${d.ultEc.length + 1}">ÚLTIMOS<br>ESPACIOS<br>CONFINADOS<br>LIBERADOS</td>
      <th>#</th><th>ESPACIO CONFINADO / UBICACIÓN</th><th>DÍA QUE SE LIBERÓ / HORA</th><th>LIBERÓ (PERSONAL TSI)</th></tr>` +
      d.ultEc.map((e, i) => `<tr class="${i < d.ultOpc ? "opc " : ""}${B.dom.ecFaltan(e).length ? "falta" : ""}"><td class="c b">${U.esc(B.dom.ecNum(e))}</td><td>${U.esc(e.esp)}${faltan(e)}</td>
        <td class="c">${e.lib ? U.fh(e.lib) : U.corta(e.fecha) + " " + e.turno}</td><td class="c">${U.esc(e.pers || e.capt || "")}</td></tr>`).join("") + `</table>`;
  }
  if (d.acts.length) {
    algo = true;
    h += `<table class="sec">${pct([14.4, 10.8, 63.8, 11])}
      <tr><td class="lbl" rowspan="${d.acts.length + 1}">ACTIVIDADES<br>DEL TURNO</td><th>INICIALES</th><th>ACTIVIDAD</th><th>ESTATUS</th></tr>` +
      (() => {      // las actividades del mismo equipo o persona van juntas, con UN solo cuadro de iniciales
        const gr = new Map(); for (const x of d.acts) { if (!gr.has(x.inis)) gr.set(x.inis, []); gr.get(x.inis).push(x); }
        return [...gr.values()].flatMap(l => l.map((x, i) => ({ ...x, n: i ? 0 : l.length })));
      })().map(x => `<tr>${x.n ? `<td class="c b" style="font-size:7.5pt" rowspan="${x.n}">${x.inis ? U.esc(x.inis).replace(/\//g, "/<wbr>") : "POR<br>ASIGNAR"}</td>` : ""}
        <td>${U.br(x.txt)}${x.desde ? ` <span class="gris">(desde ${x.desde})</span>` : ""}${x.coms.map(c => `<div class="com">↳ ${c.inis ? "<b>" + U.esc(c.inis) + ":</b> " : ""}${U.esc(c.txt)}</div>`).join("")}</td>
        <td class="est">${U.esc(x.est.toUpperCase())}</td></tr>`).join("") + `</table>`;
  }
  if (d.dif) h += `<table class="sec">${pct([14.4, 85.6])}<tr><td class="lbl"><img src="${IMG("ico3.png")}" width="26">DIFUSIÓN</td><td>${lineas([d.dif])}</td></tr></table>`;
  if (d.nPers) {
    const g = d.grupos.map(x => x.map((n, i) => (i + 1) + ". " + U.esc(n)).join("<br>"));
    h += `<table class="sec">${pct([14.4, 21.9, 22.4, 22.2, 19.1])}
      <tr><td class="lbl" rowspan="2">PERSONAL<br>QUE<br>ESTUVO EN<br>EL TURNO</td><th>TÉCNICOS DE BASE/TEMPORAL</th><th>TÉCNICOS DE C-42</th><th>ESPECIALIZADO</th><th>SUPERVISOR</th></tr>
      <tr>${g.map(x => `<td style="vertical-align:top">${x}</td>`).join("")}</tr></table>`;
  }
  if (d.notas) { algo = true; h += `<table class="sec">${pct([14.4, 85.6])}<tr><td class="lbl">NOTAS<br>ADICIONALES</td><td>${lineas(d.notas.split("\n").filter(x => x.trim()))}</td></tr></table>`; }
  h += `<table class="sec firmas">${pct([50, 50])}<tr><th>ELABORÓ</th><th>REVISÓ</th></tr><tr><td style="height:24px">${firma(d.elab)}</td><td>${firma(d.rev)}</td></tr></table>`;
  return { html: B.rep.documento("Bitácora " + t + " " + U.corta(f), h), nombre: `BITACORA ${c.proyecto} ${t} ${U.corta(f).replace(/\//g, ".")}`, carpeta: "", tipo: "turno", f, t, algo };
};

/* ---------------------------------------------------------------- historial */
B.rep.historial = function (ini, d1, d2) {
  const p = B.dom.persona(ini), r = B.dom.historial(ini, d1, d2), c = B.estado.config;
  const turnos = new Set(r.map(x => x.f + x.t)).size;
  const act = r.filter(x => x.tipo === "Actividad");
  const he = r.filter(x => x.tipo === "Horas extra").reduce((s, x) => s + (U.num(x.desc) || 0), 0);
  let h = `<h2 class="doc">HISTORIAL DE ACTIVIDADES - ${U.esc(B.t.periodo().toUpperCase())}</h2>
  <div class="doc-sub">${U.esc(p ? p.nombre : ini)} &nbsp;|&nbsp; RPE: ${U.esc(p ? p.rpe : "")} &nbsp;|&nbsp; ${U.esc(ini)} &nbsp;|&nbsp; ${U.esc(p ? p.cat : "")}</div>
  <div class="c" style="margin-bottom:8px">Periodo: ${U.corta(d1)} al ${U.corta(d2)} &nbsp;|&nbsp; Turnos con registro: ${turnos} &nbsp;|&nbsp; Actividades: ${act.length}
   (realizadas ${act.filter(x => x.est === "Realizada").length}) &nbsp;|&nbsp; Esp. confinados: ${r.filter(x => x.tipo === "Espacio confinado").length}
   &nbsp;|&nbsp; Vigilancias: ${r.filter(x => x.tipo.startsWith("Vigilancia")).length} &nbsp;|&nbsp; Horas extra: ${U.fmtNum(he)}</div>
  <table class="dat guinda"><thead><tr><th style="width:11%">FECHA</th><th style="width:6%">TURNO</th><th style="width:14%">TIPO</th><th>DESCRIPCIÓN</th><th style="width:12%">ESTATUS</th><th style="width:8%">REF.</th></tr></thead><tbody>` +
    (r.length ? r.map(x => `<tr><td>${U.corta(x.f)}</td><td>${x.t}</td><td>${U.esc(x.tipo)}</td><td class="izq">${U.br(x.desc)}</td><td>${U.esc(x.est)}</td><td>${U.esc(x.ref)}</td></tr>`).join("")
      : `<tr><td colspan="6">Sin registros en el periodo.</td></tr>`) + `</tbody></table>`;
  return { html: B.rep.documento("Historial " + ini, h), nombre: `HISTORIAL ${ini} ${c.proyecto} ${U.corta(d1).replace(/\//g, ".")} al ${U.corta(d2).replace(/\//g, ".")}`, carpeta: "HISTORIALES", tipo: "historial" };
};

/* ---------------------------------------------------------------- concentrados */
B.rep.concEC = function (lista, d1, d2) {
  const c = B.estado.config;
  let h = `<h2 class="doc">LISTADO DE ESPACIO CONFINADOS</h2><div class="doc-sub">${U.esc(B.t.periodo().toUpperCase())}${d1 ? " &nbsp;|&nbsp; del " + U.corta(d1) + " al " + U.corta(d2) : ""}</div>
  <table class="dat"><thead><tr><th style="width:6.5%">#</th><th style="width:29%">ESPACIO CONFINADO</th><th>O2<br>(%)</th><th>HR<br>(%)</th><th>TEMP<br>(°C)</th><th>LEL<br>(%)</th><th>CO<br>(ppm)</th><th>H2S<br>(ppm)</th>
  <th style="width:17%">DÍA QUE SE LIBERO</th><th style="width:14%">PERSONAL TSI</th></tr></thead><tbody>` +
    lista.map(e => `<tr><td class="b">${U.esc(B.dom.ecNum(e))}</td><td>${U.esc(e.esp)}${e.obs ? `<div class="gris" style="font-size:6.5pt">${U.esc(e.obs)}</div>` : ""}</td>` + ["o2", "hr", "temp", "lel", "co", "h2s"].map(k => `<td class="${B.dom.rango(k, e[k]) ? "fuera" : ""}">${U.esc(e[k])}</td>`).join("") +
      `<td>${U.fh(e.lib)}</td><td>${U.esc(e.pers)}</td></tr>`).join("") + `</tbody></table>`;
  return { html: B.rep.documento("Concentrado EC", h), nombre: `CONCENTRADO ESPACIOS CONFINADOS ${c.proyecto}${d1 ? " del " + U.corta(d1).replace(/\//g, ".") + " al " + U.corta(d2).replace(/\//g, ".") : ""}`, carpeta: "", tipo: "concentrado" };
};
B.rep.concVig = function (lista, d1, d2) {
  const c = B.estado.config;
  let h = `<h2 class="doc">CONTROL DE VIGILANCIAS C.I.</h2><div class="doc-sub">CONCENTRADO GENERAL - ${U.esc(B.t.periodo().toUpperCase())}${d1 ? " &nbsp;|&nbsp; del " + U.corta(d1) + " al " + U.corta(d2) : ""}</div>
  <table class="dat"><thead><tr><th style="width:6%"># VIG.</th><th style="width:24%">DESCRIPCIÓN</th><th>FECHA Y HORA DE INICIO</th><th># DE INOP</th><th>UBICACIÓN</th><th>COMPONENTE</th><th>FECHA Y HORA DE RETIRO</th><th>ESTATUS</th><th>OBSERVACIONES</th></tr></thead><tbody>` +
    lista.map(v => `<tr><td class="b">${v.num}</td><td class="izq">${U.esc(v.desc)}</td><td>${U.fh(v.inicio)}</td><td>${U.esc(v.inop)}</td><td>${U.esc(v.ubic)}</td><td>${U.esc(v.comp)}</td><td>${U.fh(v.retiro)}</td><td>${U.esc(v.est)}</td><td>${U.esc(v.obs)}</td></tr>`).join("") + `</tbody></table>`;
  return { html: B.rep.documento("Concentrado vigilancias", h), nombre: `CONCENTRADO VIGILANCIAS ${c.proyecto}${d1 ? " del " + U.corta(d1).replace(/\//g, ".") + " al " + U.corta(d2).replace(/\//g, ".") : ""}`, carpeta: "", tipo: "concentrado" };
};

/* ---------------------------------------------------------------- asistencia / horas extra semanal */
B.rep.semana = function (lunes) {
  const c = B.estado.config, filas = B.dom.semana(lunes);
  let tHe = 0, tRef = 0, tT = 0;
  let h = `<h2 class="doc" style="font-size:12pt">CONCENTRADO SEMANAL DE ASISTENCIA Y HORAS EXTRA - ${U.esc(B.t.periodo().toUpperCase())}</h2>
  <div class="doc-sub">Semana del lunes ${U.corta(lunes)} al domingo ${U.corta(U.sumar(lunes, 6))} &nbsp; (referencia: ${c.heTurno} h por turno, ${c.heDescanso} h en día de descanso)</div>
  <table class="dat guinda"><thead><tr><th style="width:3%">#</th><th style="width:19%">NOMBRE</th><th style="width:6%">RPE</th><th style="width:9%">CATEGORÍA</th>` +
    Array.from({ length: 7 }, (_, i) => { const f = U.sumar(lunes, i); return `<th>${U.diaSemana(f)}<br>${U.cortaDM(f)}</th>`; }).join("") +
    `<th style="width:5%">TURNOS</th><th style="width:6%">H.E.<br>CAPTURADAS</th><th style="width:6%">H.E.<br>REFERENCIA</th><th style="width:5%">DIF.</th><th style="width:5%">VERIF.</th></tr></thead><tbody>`;
  filas.forEach((x, i) => {
    const p = B.dom.persona(x.ini);
    tHe += x.he; tRef += x.ref; tT += x.turnos;
    const dif = x.tieneHE && x.tieneRef ? x.he - x.ref : null;
    h += `<tr><td>${i + 1}</td><td class="izq">${U.esc(p ? p.nombre : x.ini)}</td><td>${U.esc(p ? p.rpe : "")}</td><td>${U.esc(p ? B.dom.catCorta(p.cat) : "")}</td>` +
      x.dias.map(dd => `<td>${dd.map(r => r.t + " · " + (r.he != null ? U.fmtNum(r.he) + " h" : "—")).join("<br>")}</td>`).join("") +
      `<td>${x.turnos}</td><td class="${x.sinHE ? "amarillo" : ""}">${x.tieneHE ? U.fmtNum(x.he) : ""}</td><td>${x.tieneRef ? U.fmtNum(x.ref) : ""}</td>
      <td class="${dif ? "fuera" : ""}">${dif != null ? U.fmtNum(dif) : ""}</td><td class="${x.verif ? "verde b" : "rojo"}">${x.verif ? "SI" : "NO"}</td></tr>`;
  });
  if (!filas.length) h += `<tr><td colspan="16">Sin registros de asistencia en la semana.</td></tr>`;
  h += `<tr class="b"><td></td><td class="izq b">TOTALES</td><td colspan="9"></td><td class="b">${tT}</td><td class="b">${U.fmtNum(tHe)}</td><td class="b">${U.fmtNum(tRef)}</td><td class="b">${U.fmtNum(tHe - tRef)}</td><td></td></tr></tbody></table>
  <div class="nota">Cada día muestra: TURNO · horas extra capturadas por el trabajador (— = no capturó horas). REFERENCIA = conteo automático por turno asistido según la configuración.
  DIF. = capturadas − referencia (en rojo cuando no coinciden). Las fechas son FECHAS DE REPORTE (el T1 se registra en el día de salida).</div>`;
  return { html: B.rep.documento("Asistencia semanal", h, true), nombre: `ASISTENCIA Y HORAS EXTRA ${c.proyecto} SEMANA ${U.corta(lunes).replace(/\//g, ".")} AL ${U.corta(U.sumar(lunes, 6)).replace(/\//g, ".")}`, carpeta: "HORAS EXTRA", tipo: "semana", horizontal: true };
};

/* ---------------------------------------------------------------- acciones */
B.rep.previa = function (cont, doc) {
  cont.className = "hoja-previa" + (doc.horizontal ? " horizontal" : "");
  cont.innerHTML = `<iframe title="Vista previa"></iframe>`;
  const fr = cont.querySelector("iframe");
  fr.srcdoc = doc.html;
  fr.onload = () => { try { fr.style.height = Math.max(fr.contentDocument.body.scrollHeight + 40, doc.horizontal ? 816 : 1056) + "px"; } catch (e) { } };
};
B.rep.imprimir = function (doc) {
  const w = window.open("", "_blank");
  if (!w) { B.ui.toast("Permite las ventanas emergentes para imprimir.", "aviso"); return; }
  w.document.open(); w.document.write(doc.html); w.document.close();
  w.onload = () => setTimeout(() => w.print(), 300);
};
B.rep.pdf = async function (doc, boton) {
  if (B.modoLocal) {
    B.rep.imprimir(doc);
    B.ui.toast("Se abrió la ventana de impresión: en <b>Destino</b> elige <b>Guardar como PDF</b> y en Más opciones desactiva <b>Encabezados y pies de página</b>. Nombre sugerido:<br><b>" + U.esc(doc.nombre) + "</b>", "aviso", 12000);
    return null;
  }
  const txt = boton ? boton.innerHTML : "";
  if (boton) { boton.disabled = true; boton.innerHTML = '<span class="giro" style="width:16px;height:16px;border-width:2px"></span> Generando…'; }
  try {
    const r = await B.api.llamar("pdf", { tipo: doc.tipo, nombre: doc.nombre, carpeta: doc.carpeta, html: doc.html, fecha: doc.f, turno: doc.t });
    const url = r.url + "?t=" + encodeURIComponent(B.token);
    B.ui.toast(`PDF guardado en:<br><b>${U.esc(r.ruta)}</b><br><a href="${url}" target="_blank" style="color:#fff;text-decoration:underline">Abrir PDF</a>`, "ok", 9000);
    window.open(url, "_blank");
    return r;
  } catch (e) { B.ui.error(e); }
  finally { if (boton) { boton.disabled = false; boton.innerHTML = txt; } }
};
