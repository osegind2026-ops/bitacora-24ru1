window.B24_MOVIL = true;
/* ---- nucleo.js ---- */
/* =========================================================================
   BITACORA 24RU1 - Nucleo: utilerias, API y reglas de negocio
   ========================================================================= */
"use strict";
const B = window.B = { estado: null, usuario: null, token: null };
/* Membrete y pie: los originales vienen en app/img; el supervisor puede reemplazarlos desde
   Configuracion (se guardan con los datos en imagenes.json y se usan en el sitio y los reportes). */
B.imgs = { membrete: "", pie: "", ofIzq: "", ofDer: "", ofPie: "", ver: null, aspM: 192 / 1600, aspP: 258 / 2260 };
B.imgUrl = tipo => B.imgs[tipo] || new URL("img/" + tipo + ".png", location.href).href;
B.cargarImagenes = async function (ver) {
  if (ver !== undefined && ver === B.imgs.ver) return;
  try {
    const r = B.modoLocal ? await B.local.llamar("imagenes") : await (await fetch("api/imagenes")).json();
    for (const k of ["membrete", "pie", "ofIzq", "ofDer", "ofPie"]) B.imgs[k] = r[k] || "";
    B.imgs.ver = r.ver || "";
  } catch (e) { }
  const prop = async url => { try { const i = new Image(); i.src = url; await Promise.race([i.decode(), new Promise(r => setTimeout(r, 2500))]); return i.naturalWidth ? i.naturalHeight / i.naturalWidth : null; } catch (e) { return null; } };
  B.imgs.aspM = (await prop(B.imgUrl("membrete"))) || 192 / 1600;
  B.imgs.aspP = (await prop(B.imgUrl("pie"))) || 258 / 2260;
};

/* ---------------------------------------------------------------- utilerias */
const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
const DIAS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const pad = n => String(n).padStart(2, "0");
B.u = {
  esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
  br(s) { return B.u.esc(s).replace(/\n/g, "<br>"); },
  norm(s) { return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim(); },
  iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); },
  isoFH(d) { return B.u.iso(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); },
  fecha(s) { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); },
  sumar(s, n) { const d = B.u.fecha(s); d.setDate(d.getDate() + n); return B.u.iso(d); },
  dia(s) { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); },
  corta(s) { if (!s) return ""; const [y, m, d] = String(s).slice(0, 10).split("-"); return d + "/" + m + "/" + y; },
  cortaDM(s) { if (!s) return ""; const [, m, d] = String(s).slice(0, 10).split("-"); return d + "/" + m; },
  larga(s) { const d = B.u.fecha(s); return pad(d.getDate()) + " DE " + MESES[d.getMonth()] + " DE " + d.getFullYear(); },
  fh(s) { if (!s) return ""; return B.u.corta(s) + (String(s).length > 10 ? " " + String(s).slice(11, 16) : ""); },
  hora(s) { return String(s || "").slice(11, 16); },
  diaSemana(s) { return DIAS[B.u.fecha(s).getDay()]; },
  num(v) { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n; },
  fmtNum(n) { return n == null ? "" : (Math.round(n * 100) / 100).toString(); },
  ini(s) { return String(s || "").trim().toUpperCase(); },
  ahoraISO() { return B.u.isoFH(new Date()); },
  descargar(nombre, contenido, tipo) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([contenido], { type: tipo || "text/plain" }));
    a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  csv(nombre, encabezados, filas) {
    const q = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const txt = "﻿" + [encabezados, ...filas].map(r => r.map(q).join(",")).join("\r\n");
    B.u.descargar(nombre + ".csv", txt, "text/csv;charset=utf-8");
  },
  // Hora en formato de 24 horas: acepta "7", "730", "0730", "19:30", "7.30"... y devuelve "HH:MM" (null si no es valida)
  hora24(v, con24) {
    v = String(v || "").trim().replace(/[.\s,;h]/gi, ":").replace(/[^\d:]/g, "");
    if (!v) return null;
    let h, m;
    if (v.includes(":")) { const p = v.split(":"); h = p[0]; m = p[1] || "0"; }
    else if (v.length <= 2) { h = v; m = "0"; }
    else if (v.length === 3) { h = v.slice(0, 1); m = v.slice(1); }
    else if (v.length === 4) { h = v.slice(0, 2); m = v.slice(2); }
    else return null;
    if (h === "" || m.length > 2) return null;
    h = +h; m = +m;
    if (isNaN(h) || isNaN(m) || m > 59 || h > 24 || (h === 24 && (m !== 0 || !con24))) return null;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  },
  debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
};
const U = B.u;

/* ---------------------------------------------------------------- turnos
   T1 = NOCTURNO 19:00-07:00 (se rotula con la fecha de SALIDA); T2 = DIURNO 07:00-19:00 */
B.t = {
  clave(f, t) { return U.dia(f) * 2 + (t === "T2" ? 1 : 0); },
  inicio(f, t) { return t === "T1" ? U.sumar(f, -1) + "T19:00" : f + "T07:00"; },
  fin(f, t) { return t === "T1" ? f + "T07:00" : f + "T19:00"; },
  de(fh) {                       // turno al que pertenece un instante "YYYY-MM-DDTHH:MM"
    const f = fh.slice(0, 10), h = parseInt(fh.slice(11, 13) || "0", 10);
    if (h < 7) return { f, t: "T1" };
    if (h < 19) return { f, t: "T2" };
    return { f: U.sumar(f, 1), t: "T1" };
  },
  actual() { return B.t.de(U.ahoraISO()); },
  fechaHora(f, t, hhmm) {        // hora capturada dentro de un turno -> fecha y hora reales
    const h = parseInt(hhmm.slice(0, 2), 10);
    return (t === "T1" && h >= 12 ? U.sumar(f, -1) : f) + "T" + hhmm.slice(0, 5);
  },
  periodo() { const c = B.estado?.config || {}; return c.periodo || ("Recarga " + (c.proyecto || "24RU1")); },
  nombre(t) { const c = B.estado?.config || {}; return t === "T1" ? (c.t1Nombre || "NOCTURNO") : (c.t2Nombre || "DIURNO"); },
  horario(t) { const c = B.estado?.config || {}; return t === "T1" ? (c.t1Horario || "19:00 a 07:00 hrs") : (c.t2Horario || "07:00 a 19:00 hrs"); },
  corto(f, t) { return U.cortaDM(f) + " " + t; },
  primeroUltimo() {
    const c = B.estado.config;
    const a = B.t.de(c.inicio || "2026-10-04T19:00"), b = c.fin ? B.t.de(restarMin(c.fin)) : B.t.actual();
    return { fi: a.f, ti: a.t, ff: b.f, tf: b.t };
  }
};
function restarMin(fh) { const d = new Date(fh); d.setMinutes(d.getMinutes() - 1); return U.isoFH(d); }

/* ---------------------------------------------------------------- API */
B.api = {
  async llamar(ruta, cuerpo, metodo) {
    if (B.modoLocal) return B.local.llamar(ruta, cuerpo);
    const op = { method: metodo || (cuerpo ? "POST" : "GET"), headers: {} };
    if (B.token) op.headers["X-Token"] = B.token;
    if (cuerpo) { op.headers["Content-Type"] = "application/json"; op.body = JSON.stringify(cuerpo); }
    let r;
    try { r = await fetch("/api/" + ruta, op); }
    catch (e) { throw new Error("No hay conexión con el servidor de la bitácora. Verifica que la ventana del servidor siga abierta."); }
    let d = {};
    try { d = await r.json(); } catch (e) { }
    if (r.status === 401) { B.app && B.app.sesionExpirada(); throw new Error(d.error || "Sesión expirada"); }
    if (!d.ok) { const e = new Error(d.error || ("Error " + r.status)); e.datos = d; throw e; }
    return d;
  },
  async op(col, accion, datos) { await B.api.verificarTurno(col, accion); return B.api.llamar("op", { col, accion, datos }); },
  /* Antes de guardar una captura del turno: si el turno elegido no coincide con la hora o con el rol del tecnico, se le pregunta.
     Solo tecnicos (el supervisor corrige turnos anteriores a menudo); una vez confirmado ese turno no se vuelve a preguntar en la sesion. */
  CAPTURA: new Set(["actividades.guardarTurno", "actividades.tomar", "actividades.seguimiento", "ec.crear", "vig.crear"]),
  turnoOk: new Set(),
  async verificarTurno(col, accion) {
    if (!this.CAPTURA.has(col + "." + accion) || !B.usuario || !B.estado || B.dom.esSup() || !B.app || !B.app.trabajo) return;
    const { f, t } = B.app.trabajo, k = B.usuario.ini + f + t;
    if (this.turnoOk.has(k)) return;
    const duda = B.dom.turnoDudoso(f, t, B.usuario.ini);
    if (!duda) return;
    const noche = t === "T1";
    const ok = await B.ui.confirmar(`${duda}<br><br>Vas a guardar en <b style="padding:2px 8px;border-radius:6px;${noche ? "background:#24376B;color:#fff" : "background:#F6C445;color:#4A3200"}">${t} ${B.u.esc(B.t.nombre(t))} · ${B.u.corta(f)}</b>. ¿Es correcto?<br>
      <span class="muted peque">Si no, cancela y cambia la fecha o el turno arriba a la derecha.</span>`, "Confirma el turno", "Sí, es correcto: guardar", true);
    if (!ok) throw new Error("No se guardó. Revisa la fecha y el turno (arriba a la derecha) y vuelve a guardar.");
    this.turnoOk.add(k);
  },
  async recargar() {
    const d = await B.api.llamar("estado"); B.estado = d; B.usuario = d.usuario; B.dom.indexar();
    if ((d.imgVer || "") !== (B.imgs.ver || "")) await B.cargarImagenes(d.imgVer || "");
    return d;
  }
};

/* ---------------------------------------------------------------- reglas */
B.dom = {
  idx: {},
  indexar() {
    const e = B.estado;
    this.idx.personal = new Map(e.personal.map(p => [U.ini(p.ini), p]));
    this.idx.cambios = (e.cambios || []).filter(c => c.ini && c.desde && c.turno);
  },
  esSup() { return B.usuario && B.usuario.rol === "supervisor"; },
  persona(ini) { return this.idx.personal.get(U.ini(ini)); },
  nombre(ini) { const p = this.persona(ini); return p ? p.nombre : ini; },
  catOrden(cat) {
    cat = U.norm(cat);
    if (cat.includes("BASE")) return 1; if (cat.includes("C-42") || cat.includes("C42")) return 2;
    if (cat.includes("ESPECIAL")) return 3; if (cat.includes("SUPERV")) return 4; return 5;
  },
  catCorta(cat) { return ["", "Base / Temporal", "C-42", "Especializado", "Supervisor", cat][this.catOrden(cat)]; },
  activos() { return B.estado.personal.filter(p => U.norm(p.activo) !== "NO"); },
  ordenados(lista) {
    const orden = new Map(B.estado.personal.map((p, i) => [U.ini(p.ini), i]));
    return [...lista].sort((a, b) => {
      const pa = this.persona(a), pb = this.persona(b);
      const ca = pa ? this.catOrden(pa.cat) : 9, cb = pb ? this.catOrden(pb.cat) : 9;
      return ca - cb || (orden.get(U.ini(a)) ?? 999) - (orden.get(U.ini(b)) ?? 999);
    });
  },
  turnoEfectivo(ini, f) {
    const p = this.persona(ini); if (!p) return "";
    let r = U.ini(p.turno);
    for (const c of this.idx.cambios)
      if (U.ini(c.ini) === U.ini(ini) && f >= c.desde && (!c.hasta || f <= c.hasta)) r = U.ini(c.turno);
    return r;
  },
  personalDelTurno(f, t) { return this.activos().filter(p => this.turnoEfectivo(p.ini, f) === t).map(p => U.ini(p.ini)); },
  turnoDatos(f, t) { return (B.estado.turnos || []).find(x => x.fecha === f && x.turno === t) || null; },
  rango(campo, v) {
    const c = B.estado.config, n = U.num(v); if (n == null) return false;
    switch (campo) {
      case "o2": return n < +c.o2Min || n > +c.o2Max;
      case "lel": return n > +c.lelMax;
      case "co": return n > +c.coMax;
      case "h2s": return n > +c.h2sMax;
    }
    return false;
  },
  tokensIni(s) { return String(s || "").toUpperCase().split(/[\/,;\-\s|.]+/).filter(Boolean); },

  /* Registros de cada persona en un turno (actividades, cierres, EC, vigilancias, horas extra) */
  registros(f, t) {
    const d = new Map(), sumar = ini => { ini = U.ini(ini); if (ini && this.persona(ini)) d.set(ini, (d.get(ini) || 0) + 1); };
    for (const a of B.estado.actividades) {
      if (a.fecha === f && a.turno === t) sumar(a.ini);
      if (a.fCierre === f && a.tCierre === t) sumar(a.cerro);
    }
    for (const e of B.estado.ec) if (e.fecha === f && e.turno === t) {
      sumar(e.capt);
      for (const x of this.tokensIni(e.pers)) if (x !== U.ini(e.capt)) sumar(x);
    }
    for (const v of B.estado.vig) {
      if (v.fecha === f && v.turno === t) sumar(v.capAlta);
      if (v.retiro) { const r = B.t.de(v.retiro); if (r.f === f && r.t === t) sumar(v.capRet); }
    }
    for (const h of B.estado.he) if (h.fecha === f && h.turno === t && String(h.he) !== "") sumar(h.ini);
    return d;
  },
  /* Presentes: quien capturo + marcados por el supervisor + elaboro/reviso */
  presentes(f, t) {
    const regs = this.registros(f, t), td = this.turnoDatos(f, t), m = new Map();
    if (td) {
      for (const x of (td.pres || [])) if (this.persona(x)) m.set(U.ini(x), "Marcado presente");
      for (const x of [td.elab, td.rev]) if (x && this.persona(x)) m.set(U.ini(x), "Supervisor del turno");
    }
    for (const [k] of regs) m.set(k, "Capturó registros");
    return m;
  },
  sinCaptura(f, t) {
    const pres = this.presentes(f, t);
    return this.personalDelTurno(f, t).filter(i => !pres.has(i));
  },
  heRef(ini, f) {
    const c = B.estado.config, v = this.turnoEfectivo(ini, f) === "DESCANSO" ? c.heDescanso : c.heTurno;
    return U.num(v);
  },
  // horas entre dos horas HH:MM (cruza medianoche); null si falta alguna
  horasEntre(de, a) {
    const m = x => { const r = /^(\d{1,2}):(\d{2})$/.exec(x || ""); return r ? +r[1] * 60 + +r[2] : null; };
    const x = m(de), y = m(a); if (x == null || y == null) return null;
    let d = y - x; if (d <= 0) d += 1440;
    return Math.round(d / 60 * 100) / 100;
  },
  // Horas extra: puede haber varios registros (tramos) el mismo dia y turno; los antiguos sin "tramo" son el 1
  tramo(h) { return String(h.tramo || "1"); },
  hesDe(f, t, ini) {
    return B.estado.he.filter(h => h.fecha === f && h.turno === t && U.ini(h.ini) === U.ini(ini)).sort((a, b) => +this.tramo(a) - +this.tramo(b));
  },
  heDe(f, t, ini) { return this.hesDe(f, t, ini)[0] || null; },
  heTotal(f, t, ini) { const l = this.hesDe(f, t, ini).filter(h => U.num(h.he) != null); return l.length ? l.reduce((n, h) => n + U.num(h.he), 0) : null; },
  // justificacion general del tiempo extra (se cambia en Configuracion)
  heJust() {
    const c = B.estado.config || {};
    const m = /^(\d+)RU(\d+)$/i.exec(String(c.proyecto || "").trim());
    return c.heJust || ("Soporte de Seguridad Industrial y protección contra incendios en las actividades de la " + (m ? "U" + m[2] + "-" + m[1] + "R" : (c.proyecto || "recarga")) + ".");
  },
  // opciones de hora en pasos de 30 minutos
  horasMedias() { const r = []; for (let h = 0; h < 24; h++) for (const m of ["00", "30"]) r.push(String(h).padStart(2, "0") + ":" + m); return r; },

  // ¿El turno elegido (f, t) no coincide con la hora del reloj o con el rol de la persona? Devuelve el motivo (HTML) o "".
  // Se acepta el turno que corre y, hasta 3 horas despues de su salida, el turno que acaba de terminar.
  turnoDudoso(f, t, ini) {
    const ahora = U.ahoraISO(), act = B.t.actual(), m = [];
    const finMas = (() => { const d = new Date(B.t.fin(f, t) + ":00"); d.setHours(d.getHours() + 3); return U.isoFH(d); })();
    const porHora = (act.f === f && act.t === t) || (ahora >= B.t.fin(f, t) && ahora <= finMas);
    if (!porHora) m.push(`Son las <b>${ahora.slice(11, 16)}</b> del ${U.cortaDM(ahora)}: por la hora corresponde el <b>${act.t} ${U.esc(B.t.nombre(act.t))} del ${U.cortaDM(act.f)}</b>.`);
    const rol = this.turnoEfectivo(ini, f);
    if ((rol === "T1" || rol === "T2") && rol !== t) m.push(`Tu rol para el ${U.cortaDM(f)} indica <b>${rol} ${U.esc(B.t.nombre(rol))}</b>.`);
    return m.join("<br>");
  },
  // Todas las actividades que conoce esta sesion: las propias y (tecnicos) las del equipo
  todas() { return [...B.estado.actividades, ...(B.estado.equipo || [])]; },
  /* ---- Actividades parecidas (para no duplicar): misma logica que Servidor.cs */
  VACIAS: new Set(["DE", "DEL", "LA", "LAS", "EL", "LOS", "EN", "Y", "A", "AL", "PARA", "POR", "CON", "SE", "UN", "UNA", "QUE", "E", "O"]),
  fichas(s) { return [...new Set(U.norm(s).replace(/[^A-Z0-9]/g, " ").split(" ").filter(x => x && !this.VACIAS.has(x)))]; },
  fichaIgual(a, b) { if (a === b) return true; if (/\d/.test(a) || /\d/.test(b)) return false; return a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5); },
  // 2 = es la misma actividad; 1 = parecida; 0 = distinta
  parecido(a, b) {
    const A = this.fichas(a), Bf = this.fichas(b);
    if (!A.length || !Bf.length) return 0;
    if (A.join(" ") === Bf.join(" ")) return 2;
    const num = x => /\d/.test(x);
    if (A.filter(num).some(x => !Bf.includes(x)) || Bf.filter(num).some(x => !A.includes(x))) return 0;
    const men = A.length <= Bf.length ? A : Bf, may = A.length <= Bf.length ? Bf : A;
    if (men.length < 3) return 0;
    const c = men.filter(x => may.some(y => this.fichaIgual(x, y))).length;
    if (c === men.length && c >= 0.6 * may.length) return 2;
    if (c >= 0.75 * men.length && c >= 0.6 * may.length) return 1;
    return 0;
  },
  // Actividades ya capturadas a las que alguien puede unirse al capturar el turno (f, t): las del turno,
  // las pendientes / en proceso de turnos anteriores y las por asignar. Una por actividad (no por persona).
  existentes(f, t, ini) {
    const m = new Map();
    for (const a of this.todas().sort((x, y) => x.id - y.id)) {
      if (!((a.fecha === f && a.turno === t) || a.est === "Pendiente" || a.est === "En proceso")) continue;
      const k = a.grupo ? "g" + a.grupo : "t" + U.norm(a.txt);
      if (!m.has(k)) m.set(k, { id: a.id, txt: a.txt, inis: [], est: !a.ini ? "Por asignar" : a.est, fecha: a.fecha, turno: a.turno, mia: false });
      const g = m.get(k), i = U.ini(a.ini);
      if (i && !g.inis.includes(i)) g.inis.push(i);
      if (i === U.ini(ini) && a.fecha === f && a.turno === t) g.mia = true;
    }
    return [...m.values()].filter(g => !g.mia).map(g => ({ ...g, inis: this.ordenados(g.inis).join("/") }));
  },

  /* Actividades abiertas (pendiente / en proceso) visibles al cierre del turno K */
  abiertas(K, filtroIni) {
    const r = [];
    for (const a of B.estado.actividades) {
      if (filtroIni && U.ini(a.ini) !== U.ini(filtroIni)) continue;
      const ck = B.t.clave(a.fecha, a.turno), zk = a.fCierre ? B.t.clave(a.fCierre, a.tCierre) : 0;
      if (ck > K) continue;
      if (a.est === "Pendiente" || a.est === "En proceso" || (a.est === "Concluida" && zk > K)) r.push(a);
    }
    return r;
  },
  pendientesActuales(ini) {
    return B.estado.actividades.filter(a => (a.est === "Pendiente" || a.est === "En proceso") && (!ini ? !!a.ini : U.ini(a.ini) === U.ini(ini)))
      .sort((a, b) => B.t.clave(a.fecha, a.turno) - B.t.clave(b.fecha, b.turno));
  },
  /* Ultimo seguimiento registrado hasta el turno K (las lineas inician con "dd/mm Tn") */
  ultimaLineaHasta(seg, K, fechaBase) {
    const y = String(fechaBase || "").slice(0, 4);
    const l = String(seg || "").split("\n").filter(Boolean).filter(x => {
      const m = /^(\d{2})\/(\d{2}) (T[12])/.exec(x);
      return !m || B.t.clave(y + "-" + m[2] + "-" + m[1], m[3]) <= K;
    });
    return l.length ? l[l.length - 1] : "";
  },
  ultimaLinea(s) { const l = String(s || "").split("\n").filter(Boolean); return l.length ? l[l.length - 1] : ""; },
  vigActivas(f, t) {
    const ini = B.t.inicio(f, t), fin = B.t.fin(f, t);
    return B.estado.vig.filter(v => v.inicio && v.inicio <= fin && (!v.retiro || v.retiro >= ini)).sort((a, b) => a.num - b.num);
  },
  // # de espacio confinado como se muestra: los de pre-recarga llevan su marca (PR 121)
  ecNum(e) { return e.noLib ? "NL-" + (e.num - 900000) : (e.pre ? e.pre + " " : "") + e.num; },
  // NO LIBERADOS (prueba no satisfactoria): se guardan con su monitoreo, pero no cuentan ni salen como espacios liberados
  ecNoLiberados() { return B.estado.ec.filter(e => e.noLib).sort((a, b) => a.num - b.num); },
  ecDelTurno(f, t) { return B.estado.ec.filter(e => !e.noLib && e.fecha === f && e.turno === t).sort((a, b) => a.num - b.num); },
  /* ---- Monitoreo de espacios confinados mientras siguen liberados (al menos uno por turno).
     El primer "monitoreo" de un espacio es su liberacion; los siguientes estan en e.mon con su fecha y hora real. */
  LECT: [["o2", "O2"], ["hr", "HR"], ["temp", "TEMP"], ["lel", "LEL"], ["co", "CO"], ["h2s", "H2S"]],
  ecLibFH(e) { return String(e.lib || "").length >= 16 ? e.lib : (e.fecha ? B.t.inicio(e.fecha, e.turno || "T2") : ""); },
  ecMons(e) {
    const l = [{ id: 0, lib: true, fh: this.ecLibFH(e), elev: this.ecPorElev(e) ? String(e.elev || "").trim() : "", o2: e.o2, hr: e.hr, temp: e.temp, lel: e.lel, co: e.co, h2s: e.h2s, pers: e.pers || e.capt || "", obs: e.obs || "" }];
    for (const m of e.mon || []) l.push(m);
    return l.sort((a, b) => String(a.fh).localeCompare(String(b.fh)) || (a.lib ? -1 : 1));
  },
  // El POZO SECO es un solo espacio confinado, pero se monitorea y se registra por ELEVACION
  ecPorElev(e) { return !!(B.ecLista && B.ecLista.esPozo(e.esp)); },
  ecElevs(e) {
    if (!this.ecPorElev(e)) return [];
    const m = new Map(); for (const x of this.ecMons(e)) { const v = String(x.elev || "").trim(); if (!m.has(U.norm(v))) m.set(U.norm(v), v); }
    const l = [...m.values()].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b));
    return l.length > 1 ? l.filter(Boolean).concat(l.includes("") && this.ecMons(e).some(x => !x.lib && !String(x.elev || "").trim()) ? [""] : []) : l;
  },
  ecUltimoMon(e, hasta) { const l = this.ecMons(e).filter(m => !hasta || m.fh <= hasta); return l.length ? l[l.length - 1] : null; },
  ecMonEnTurno(e, f, t) { const a = B.t.inicio(f, t), b = B.t.fin(f, t); return this.ecMons(e).some(m => m.fh >= a && m.fh <= b); },
  ecAbiertoEn(e, fh) { return !e.cierre || e.cierre > fh; },
  ecAbiertos() { return B.estado.ec.filter(e => !e.cierre && !e.noLib).sort((a, b) => a.num - b.num); },
  // espacios que siguen liberados al cierre del turno (f, t), liberados en ese turno o antes, con su ultimo monitoreo hasta entonces
  ecSeguimiento(f, t, soloAnteriores) {
    const K = B.t.clave(f, t), fin = B.t.fin(f, t);
    return B.estado.ec.filter(e => !e.noLib && e.fecha && (soloAnteriores ? B.t.clave(e.fecha, e.turno) < K : B.t.clave(e.fecha, e.turno) <= K) && this.ecAbiertoEn(e, fin))
      .sort((a, b) => a.num - b.num).map(e => {
        // pozo seco: un renglon por elevacion, cada una con su ultimo monitoreo y su aviso del turno
        const ini = B.t.inicio(f, t), els = this.ecElevs(e).map(el => {
          const l = this.ecMons(e).filter(m => U.norm(m.elev || "") === U.norm(el) && m.fh <= fin);
          return l.length ? { elev: el, u: l[l.length - 1], ok: l.some(m => m.fh >= ini) } : null; }).filter(Boolean);
        return { e, u: this.ecUltimoMon(e, fin), ok: els.length > 1 ? els.every(x => x.ok) : this.ecMonEnTurno(e, f, t), elevs: els.length > 1 || (els.length === 1 && els[0].elev) ? els : [] };
      });
  },
  // lo mismo, en renglones para los reportes (el pozo seco se abre en un renglon por elevacion)
  ecFilasMon(f, t, soloAnteriores) {
    return this.ecSeguimiento(f, t, soloAnteriores).flatMap(x => x.elevs.length ? x.elevs.map(v => ({ e: x.e, u: v.u, ok: v.ok, elev: v.elev })) : [{ e: x.e, u: x.u, ok: x.ok, elev: "" }]);
  },

  /* Datos completos para el reporte del turno */
  reporte(f, t) {
    // ACTIVIDADES EN UN SOLO APARTADO: un renglon por actividad (iniciales de todos | actividad | estatus).
    // Entran: lo realizado/concluido en el turno, lo que sigue en proceso o pendiente (tambien de turnos
    // anteriores) y lo que esta por asignar. Los comentarios individuales se juntan; si son iguales, se unifican.
    const K = B.t.clave(f, t), filas = new Map(), ORDEN = ["Realizada", "Concluida", "En proceso", "Pendiente", "Por asignar"];
    const acts = [...B.estado.actividades].sort((a, b) => a.id - b.id);
    for (const a of acts) {
      const ck = B.t.clave(a.fecha, a.turno), zk = a.fCierre ? B.t.clave(a.fCierre, a.tCierre) : 0;
      let est;
      if (ck === K && a.est === "Realizada") est = "Realizada";
      else if (a.est === "Concluida" && zk === K) est = "Realizada";          // concluida en el turno = REALIZADA en el reporte
      else if (ck <= K && (a.est === "Pendiente" || a.est === "En proceso" || (a.est === "Concluida" && zk > K))) {
        if (!a.ini && !a.rep) continue;            // por asignar: solo sale si el supervisor la marco para el reporte (como pendiente)
        est = !a.ini ? "Pendiente" : (a.est === "Concluida" ? (a.estOrig || "Pendiente") : a.est);
      }
      else continue;
      const k = est + "|" + U.norm(a.txt);
      if (!filas.has(k)) filas.set(k, { txt: a.txt, est, inis: [], ck, f: a.fecha, t: a.turno, coms: new Map(), uni: a.uni || "" });
      const g = filas.get(k), ini = U.ini(a.ini);
      if (ini && !g.inis.includes(ini)) g.inis.push(ini);
      if (ck < g.ck) { g.ck = ck; g.f = a.fecha; g.t = a.turno; }
      const com = (quien, texto) => {
        texto = String(texto || "").trim(); if (!texto) return;
        const kc = U.norm(texto); if (!g.coms.has(kc)) g.coms.set(kc, { txt: texto, inis: [] });
        quien = U.ini(quien); if (quien && !g.coms.get(kc).inis.includes(quien)) g.coms.get(kc).inis.push(quien);
      };
      com(a.ini, a.com);
      for (const l of String(a.seg || "").split("\n").filter(Boolean)) {
        const m = /^(\d{2})\/(\d{2}) (T[12]) ([^:]+): (?:(?:CONCLUIDA|EN PROCESO|PENDIENTE)(?: - )?)?(.*)$/.exec(l);
        if (!m) { com("", l); continue; }
        if (B.t.clave(String(a.fecha).slice(0, 4) + "-" + m[2] + "-" + m[1], m[3]) <= K) com(m[4], m[5]);
      }
    }
    const lista = [...filas.values()].sort((a, b) => ORDEN.indexOf(a.est) - ORDEN.indexOf(b.est)).map(g => ({
      inis: this.ordenados(g.inis).join("/"), txt: g.txt, est: g.est, uni: g.uni, desde: g.ck < K ? B.t.corto(g.f, g.t) : "",
      coms: [...g.coms.values()].map(c => ({ inis: this.ordenados(c.inis.filter(i => !g.inis.includes(i))).join("/"), txt: c.txt }))
    }));
    const td = this.turnoDatos(f, t) || {};
    const pres = this.presentes(f, t);
    const grupos = [[], [], [], []];
    for (const ini of this.ordenados([...pres.keys()])) {
      const p = this.persona(ini); if (!p) continue;
      let c = this.catOrden(p.cat); if (c > 4) c = 1;
      grupos[c - 1].push(p.nombre);
    }
    // ESPACIOS CONFINADOS: todos los del turno (por #). Si son menos de 5, se completa con los ultimos
    // liberados en turnos anteriores, en orden de # de liberacion, para tener a la vista los mas recientes.
    const ec = this.ecDelTurno(f, t);
    const acum = B.estado.ec.filter(e => !e.pre && !e.noLib && e.fecha && B.t.clave(e.fecha, e.turno) <= K).length;
    // Espacios de turnos anteriores que SIGUEN LIBERADOS al cierre del turno, con su ultimo monitoreo. No entran los de
    // pre-recarga (PR) ni los ya cerrados. Van en la misma hoja si caben; si son muchos, pasan a una segunda hoja.
    const ecMon = this.ecFilasMon(f, t, true).filter(x => !x.e.pre);
    const ultEc = ec.length >= 5 ? [] : B.estado.ec.filter(e => !e.noLib && e.fecha && B.t.clave(e.fecha, e.turno) < K)
      .sort((a, b) => b.num - a.num).slice(0, 5 - ec.length).sort((a, b) => a.num - b.num);
    const n = e => lista.filter(x => e.includes(x.est)).length;
    return {
      f, t, vig: this.vigActivas(f, t), ec, acum, ecMon, ultEc, ultOpc: Math.max(0, Math.min(ultEc.length, ec.length + ultEc.length - 3)), acts: lista, grupos,
      dif: td.dif || "", notas: td.notas || "", elab: td.elab || "", rev: td.rev || "",
      nReal: n(["Realizada", "Concluida"]), nProc: n(["En proceso"]), nPend: n(["Pendiente", "Por asignar"]), nPers: grupos.reduce((s, g) => s + g.length, 0)
    };
  },
  // Informacion basica que le falta a un espacio confinado (para darle seguimiento)
  ecFaltan(e) {
    const f = [];
    // si el espacio esta en la lista oficial (Anexo SI-9974-2) solo se exigen las lecturas de su requisito de muestreo
    const of = B.ecLista ? B.ecLista.buscar(e.esp) : null;
    for (const [k, n] of [["o2", "O2"], ["hr", "HR"], ["temp", "TEMP"], ["lel", "LEL"], ["co", "CO"], ["h2s", "H2S"]]) if ((!of || of.campos.includes(k)) && String(e[k] ?? "").trim() === "") f.push(n);
    if (!e.lib || String(e.lib).length <= 10) f.push("HORA");
    if (!String(e.pers || "").trim()) f.push("PERSONAL");
    return f;
  },
  // Comentarios de una actividad (el de la actividad y los de sus seguimientos) y si esta sesion puede modificarlos:
  // cada quien los suyos; el supervisor, los de cualquiera.
  comentarios(a) {
    const sup = this.esSup(), yoI = U.ini(B.usuario.ini), r = [];
    if (String(a.com || "").trim()) { const por = U.ini(a.comPor); r.push({ tipo: "com", txt: a.com, por, cuando: "", acc: "", puede: sup || !por || por === yoI }); }
    for (const l of String(a.seg || "").split("\n").filter(Boolean)) {
      const m = /^(\d{2}\/\d{2} T[12]) ([^:]+): (?:(CONCLUIDA|EN PROCESO|PENDIENTE)(?: - )?)?(.*)$/.exec(l);
      if (!m) { r.push({ tipo: "seg", linea: l, txt: l, por: "", cuando: "", acc: "", puede: sup }); continue; }
      if (!m[4].trim()) continue;
      r.push({ tipo: "seg", linea: l, txt: m[4].trim(), por: U.ini(m[2]), cuando: m[1], acc: m[3] || "", puede: sup || U.ini(m[2]) === yoI });
    }
    return r;
  },
  // Pendientes agrupados: una actividad asignada a varias personas es UN solo renglon
  pendientesGrupos(ini) {
    const m = new Map();
    for (const a of this.pendientesActuales(ini)) {
      const k = a.grupo ? "g" + a.grupo : "i" + a.id;
      if (!m.has(k)) m.set(k, { a, inis: [], regs: [] });
      const g = m.get(k); g.regs.push(a); if (!g.inis.includes(U.ini(a.ini))) g.inis.push(U.ini(a.ini));
    }
    return [...m.values()];
  },
  // quita de una linea de seguimiento la palabra del estatus ("05/10 T2 KMH: CONCLUIDA - texto" -> "05/10 T2 KMH: texto")
  sinEstatus(linea) {
    const m = /^(\d{2}\/\d{2} T[12] [^:]+): (?:(?:CONCLUIDA|EN PROCESO|PENDIENTE)(?: - )?)?(.*)$/.exec(linea || "");
    if (!m) return linea || "";
    return m[2].trim() ? m[1] + ": " + m[2].trim() : "";
  },
  // actividades que el supervisor dejo sin responsable ("por asignar")
  porAsignar() { return B.estado.actividades.filter(a => !a.ini && (a.est === "Pendiente" || a.est === "En proceso")).sort((a, b) => a.id - b.id); },

  /* Asistencia de un turno (persona -> origen, horas extra, referencia) */
  asistenciaTurno(f, t) {
    const pres = this.presentes(f, t), filas = [];
    for (const h of B.estado.he) if (h.fecha === f && h.turno === t && !pres.has(U.ini(h.ini))) pres.set(U.ini(h.ini), "Solo horas extra");
    for (const ini of this.ordenados([...pres.keys()])) {
      const hs = this.hesDe(f, t, ini), h = hs[0], ref = this.heRef(ini, f), he = this.heTotal(f, t, ini);
      filas.push({ f, t, ini, origen: pres.get(ini), he, n: hs.length, tramo: h ? this.tramo(h) : "1",
        horarios: hs.filter(x => x.de).map(x => x.de + "-" + x.a).join(", "),
        mot: [...new Set(hs.map(x => (x.mot || "").trim()).filter(Boolean))].join(" / "), ref, dif: he != null && ref != null ? he - ref : null,
        verif: hs.length && hs.every(x => U.norm(x.verif) === "SI") ? "SI" : "", obs: [...new Set(hs.map(x => x.obs || "").filter(Boolean))].join(" / ") });
    }
    return filas;
  },
  lunes(f) { const d = U.fecha(f); const w = (d.getDay() + 6) % 7; return U.sumar(f, -w); },
  semana(lunes) {
    const filas = new Map();
    for (let i = 0; i < 7; i++) {
      const f = U.sumar(lunes, i);
      for (const t of ["T1", "T2"]) for (const r of this.asistenciaTurno(f, t)) {
        if (!filas.has(r.ini)) filas.set(r.ini, { ini: r.ini, dias: Array.from({ length: 7 }, () => []), he: 0, ref: 0, tieneHE: false, tieneRef: false, turnos: 0, sinHE: false, verif: true, regs: [] });
        const x = filas.get(r.ini);
        x.dias[i].push(r); x.turnos++; x.regs.push(r);
        if (r.he != null) { x.he += r.he; x.tieneHE = true; } else x.sinHE = true;
        if (r.ref != null) { x.ref += r.ref; x.tieneRef = true; }
        if (U.norm(r.verif) !== "SI") x.verif = false;
      }
    }
    return this.ordenados([...filas.keys()]).map(i => filas.get(i));
  },
  historial(ini, d1, d2) {
    ini = U.ini(ini); const r = [], dentro = f => f && f >= d1 && f <= d2;
    for (const a of B.estado.actividades) {
      if (U.ini(a.ini) === ini && dentro(a.fecha)) r.push({ f: a.fecha, t: a.turno, tipo: "Actividad", desc: a.txt + (a.seg ? "\nSeguimiento: " + a.seg.replace(/\n/g, " | ") : ""), est: a.est + (a.est === "Concluida" && a.fCierre ? " " + B.t.corto(a.fCierre, a.tCierre) : ""), ref: "ACT " + a.id, k: "act:" + a.id });
      if (U.ini(a.cerro) === ini && U.ini(a.ini) !== ini && dentro(a.fCierre)) r.push({ f: a.fCierre, t: a.tCierre, tipo: "Cierre de pendiente", desc: a.txt + "  (registrado por " + a.ini + ")", est: "Concluida", ref: "ACT " + a.id });
    }
    for (const e of B.estado.ec) if (dentro(e.fecha) && (U.ini(e.capt) === ini || this.tokensIni(e.pers).includes(ini)))
      r.push({ f: e.fecha, t: e.turno, tipo: "Espacio confinado", desc: e.esp + "  |  O2 " + e.o2 + "%  LEL " + e.lel + "%  CO " + e.co + "  H2S " + e.h2s + (e.lib ? "  |  Liberado " + U.fh(e.lib) : ""), est: e.noLib ? "No liberado" : "Liberado", ref: "EC " + this.ecNum(e), k: "ec:" + e.num });
    for (const v of B.estado.vig) {
      if (U.ini(v.capAlta) === ini && dentro(v.fecha)) r.push({ f: v.fecha, t: v.turno, tipo: "Vigilancia (alta)", desc: v.desc + "  |  " + v.ubic + "  |  INOP " + v.inop, est: v.est, ref: "VIG " + v.num, k: "vig:" + v.num });
      if (U.ini(v.capRet) === ini && v.retiro) { const s = B.t.de(v.retiro); if (dentro(s.f)) r.push({ f: s.f, t: s.t, tipo: "Vigilancia (retiro)", desc: v.desc + "  |  Retirada " + U.fh(v.retiro), est: "RETIRADA", ref: "VIG " + v.num }); }
    }
    for (const h of B.estado.he) if (U.ini(h.ini) === ini && dentro(h.fecha) && String(h.he) !== "")
      r.push({ f: h.fecha, t: h.turno, tipo: "Horas extra", desc: h.he + " h" + (h.de ? " (" + h.de + " a " + h.a + ")" : "") + (h.mot ? "  |  " + h.mot : ""), est: U.norm(h.verif) === "SI" ? "Verificada" : "Por verificar", ref: "", k: "he:" + h.fecha + ":" + h.turno + ":" + this.tramo(h) });
    return r.sort((a, b) => B.t.clave(a.f, a.t) - B.t.clave(b.f, b.t));
  }
};
;
/* ---- ec_lista.js ---- */
/* =========================================================================
   BITACORA 24RU1 - LISTA DE ESPACIOS CONFINADOS (Anexo SI-9974-2, Rev. 5)
   Base de datos de los espacios confinados de la CNLV U1 y U2 con su edificio,
   nivel y requisito de muestreo ambiental. Se sugieren al capturar una liberación.
   La lista NO incluye necesariamente todos los espacios: se puede escribir otro.
   Requisito: O = Oxígeno, C = Combustibilidad, T = Temperatura, H = humedad, S = H2S, M = CO
   ========================================================================= */
"use strict";
B.ecArmar = () => {
  const R = { O: "Oxígeno", C: "Combustibilidad", T: "Temperatura", H: "humedad", S: "H2S", M: "CO" };
  const GRUPOS = B.EC_GRUPOS || [];      // datos en ec_datos.js (PC) o en el paquete de datos (celular)
  const CAMPO = { O: "o2", C: "lel", T: "temp", H: "hr", S: "h2s", M: "co" };
  const lista = [];
  for (const [edif, uni, items] of GRUPOS) for (const [esp, nivel, req] of items)
    lista.push({ esp, edif, uni, nivel, req, reqTxt: [...req].map(k => R[k]).join(", "), campos: [...req].map(k => CAMPO[k]) });
  const idx = new Map(lista.map(x => [B.u.norm(x.esp), x]));
  const pozo = x => /^POZO SECO/.test(B.u.norm(x));
  return {
    lista,
    // busca un espacio por su nombre; el pozo seco se reconoce aunque el nombre lleve otra elevacion ("POZO SECO U1 ELEV. 10.15")
    buscar(nombre) {
      const k = B.u.norm(nombre); if (!k) return null;
      if (idx.has(k)) return idx.get(k);
      if (pozo(k)) return idx.get(/\bU ?-?2\b/.test(k) ? "POZO SECO U2" : "POZO SECO U1");
      return null;
    },
    esPozo: pozo,
    // opciones para el buscador: primero las de la lista oficial, luego las del catalogo propio que no esten en ella
    opciones(catalogo) {
      const r = lista.map(x => ({ value: x.esp, label: x.esp, sub: x.edif + " · nivel " + x.nivel + " · " + x.reqTxt }));
      for (const c of catalogo || []) { const t = typeof c === "string" ? c : (c && c.txt) || ""; if (t && !idx.has(B.u.norm(t))) r.push({ value: t, label: t, sub: "catálogo propio" }); }
      return r;
    }
  };
};
B.ecLista = B.ecArmar();
;
/* ---- local.js ---- */
/* =========================================================================
   BITACORA 24RU1 - PLAN B: modo SIN SERVIDOR (doble clic en el HTML)
   Lee y escribe directamente los archivos de la carpeta datos\ con la
   API de acceso a archivos de Edge/Chrome (sin permisos de administrador).
   Usa el MISMO formato de datos que el servidor: ambos modos son compatibles.
   Varias ventanas pueden estar abiertas: cada guardado vuelve a leer el
   archivo, aplica el cambio y lo escribe (con bloqueo entre pestanas).
   ========================================================================= */
"use strict";
// Version para celular (pagina publicada): misma aplicacion, datos guardados en el telefono (ver movil.js)
B.modoMovil = !!window.B24_MOVIL || /[?&]modo=movil/.test(location.search);
B.modoLocal = B.modoMovil || location.protocol === "file:" || /[?&]modo=local/.test(location.search);

B.local = {
  raiz: null, sub: "datos", sesion: null, tabId: Math.random().toString(36).slice(2),
  LISTAS: ["personal", "usuarios", "cambios", "actividades", "ec", "vig", "turnos", "he", "hojas"],
  OBJETOS: ["config", "catalogos", "imagenes"],

  /* ---------------------------------------------------------- carpeta */
  soportado() { return typeof window.showDirectoryPicker === "function"; },
  async idb(op, valor) {
    return new Promise(res => {
      setTimeout(() => res(null), 2500);          // si el navegador no responde, se pide la carpeta
      try {
        const r = indexedDB.open("bitacora24ru1", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("k");
        r.onerror = () => res(null);
        r.onsuccess = () => {
          const tx = r.result.transaction("k", op === "get" ? "readonly" : "readwrite"), st = tx.objectStore("k");
          const q = op === "get" ? st.get("carpeta") : st.put(valor, "carpeta");
          q.onsuccess = () => res(op === "get" ? q.result : true); q.onerror = () => res(null);
        };
      } catch (e) { res(null); }
    });
  },
  async carpetaGuardada() { return await this.idb("get"); },
  async permiso(h, pedir) {
    const o = { mode: "readwrite" };
    if (await h.queryPermission(o) === "granted") return true;
    return pedir ? (await h.requestPermission(o)) === "granted" : false;
  },
  async elegirCarpeta() {
    const h = await window.showDirectoryPicker({ id: "bitacora24ru1", mode: "readwrite" });
    await this.idb("put", h);
    return h;
  },
  async conectar(h, demo) {
    let d;
    try { d = await h.getDirectoryHandle(demo ? "datos_demo" : "datos"); }
    catch (e) { throw new Error(`En la carpeta "${h.name}" no existe la subcarpeta ${demo ? "datos_demo" : "datos"}. Selecciona la carpeta Bitacora24RU1 (la que contiene INICIAR BITACORA y la carpeta datos).`); }
    try { await d.getFileHandle("personal.json"); } catch (e) { throw new Error("La carpeta de datos no contiene personal.json. Verifica que seleccionaste la carpeta Bitacora24RU1 correcta."); }
    this.raiz = h; this.sub = demo ? "datos_demo" : "datos";
    sessionStorage.setItem("b_local_demo", demo ? "1" : "");
    await this.bloquear(async () => { const db = await this.cargar(); if (await this.asegurarUsuarios(db)) await this.escribir("usuarios", db.usuarios); });
    await this.respaldoDiario("inicio");
  },

  /* ---------------------------------------------------------- archivos */
  async dirDatos() { return this.raiz.getDirectoryHandle(this.sub, { create: true }); },
  async dirRuta(partes) { let d = this.raiz; for (const p of partes) d = await d.getDirectoryHandle(p, { create: true }); return d; },
  async leer(n) {
    try {
      const fh = await (await this.dirDatos()).getFileHandle(n + ".json");
      const t = await (await fh.getFile()).text();
      return t.trim() ? JSON.parse(t) : null;
    } catch (e) { if (e instanceof SyntaxError) throw new Error("El archivo " + n + ".json está dañado. Restaura un respaldo."); return null; }
  },
  async escribirArchivo(dir, nombre, texto) {
    const fh = await dir.getFileHandle(nombre, { create: true });
    const w = await fh.createWritable();
    await w.write(texto); await w.close();
  },
  async escribir(n, obj) {
    const txt = JSON.stringify(obj);
    await this.escribirArchivo(await this.dirDatos(), n + ".json", txt);
    try { (this._canal = this._canal || new BroadcastChannel("bitacora24ru1")).postMessage({ n, tab: this.tabId }); } catch (e) { }
    if (B.modoMovil) return;                 // en el celular no se guardan copias por cambio (el respaldo es la PC)
    try {
      const d = await this.dirRuta(["respaldos", this.sub, "por_cambio"]);
      const ahora = new Date(), p = x => String(x).padStart(2, "0");
      const sello = ahora.getFullYear() + p(ahora.getMonth() + 1) + p(ahora.getDate()) + "_" + p(ahora.getHours()) + p(ahora.getMinutes()) + p(ahora.getSeconds()) + "_" + String(ahora.getMilliseconds()).padStart(3, "0");
      await this.escribirArchivo(d, n + "_" + sello + ".json", txt);
      const nombres = [];
      for await (const [k] of d.entries()) if (k.startsWith(n + "_")) nombres.push(k);
      nombres.sort().reverse().slice(40).forEach(k => d.removeEntry(k).catch(() => { }));
      await this.respaldoDiario("diario");
    } catch (e) { console.warn("respaldo", e); }
  },
  async respaldoDiario(motivo) {
    try {
      const hoy = U.iso(new Date());
      if (motivo === "diario" && this._diario === hoy) return;
      this._diario = hoy;
      const base = await this.dirRuta(["respaldos", this.sub, "diario"]);
      const nombre = hoy + (motivo === "inicio" ? "_inicio_" + U.ahoraISO().slice(11, 16).replace(":", "") : "");
      if (motivo === "diario") { try { await base.getDirectoryHandle(nombre); return; } catch (e) { } }
      const d = await base.getDirectoryHandle(nombre, { create: true });
      for await (const [k, h] of (await this.dirDatos()).entries())
        if (h.kind === "file" && k.endsWith(".json") && !k.startsWith(".")) await this.escribirArchivo(d, k, await (await h.getFile()).text());
    } catch (e) { console.warn("respaldo diario", e); }
  },
  async cargar() {
    const db = {};
    for (const n of this.LISTAS) db[n] = (await this.leer(n)) || [];
    for (const n of this.OBJETOS) db[n] = (await this.leer(n)) || {};
    return db;
  },
  /* Bloqueo en 2 niveles:
     1) entre pestanas del mismo navegador (navigator.locks)
     2) entre EQUIPOS que comparten la carpeta (ficha .bitacora_planb.json + respeto del
        bloqueo exclusivo .bitacora.lock que usan los servidores de la forma normal) */
  bloquear(fn) {
    const conArchivo = () => B.modoMovil ? fn() : this.bloqueoArchivo(fn);
    if (navigator.locks && navigator.locks.request) return navigator.locks.request("bitacora24ru1_datos", conArchivo);
    return conArchivo();
  },
  async bloqueoArchivo(fn) {
    const d = await this.dirDatos(), yo = this.tabId + "-" + Math.random().toString(36).slice(2);
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const servidorOcupado = async () => {
      try { const h = await d.getFileHandle(".bitacora.lock"); await (await h.getFile()).slice(0, 1).text(); return false; }
      catch (e) { return e.name === "NotReadableError" || e.name === "NoModificationAllowedError" || e.name === "InvalidStateError"; }
    };
    const leerFicha = async () => { try { const t = await (await (await d.getFileHandle(".bitacora_planb.json")).getFile()).text(); return t ? JSON.parse(t) : null; } catch (e) { return null; } };
    const soltar = async () => { try { const t = await leerFicha(); if (t && t.dueno === yo) await d.removeEntry(".bitacora_planb.json"); } catch (e) { } };
    const limite = Date.now() + 25000;
    let tengo = false;
    while (!tengo) {
      if (!(await servidorOcupado())) {
        const t = await leerFicha();
        if (!t || t.expira < Date.now() || t.dueno === yo) {
          await this.escribirArchivo(d, ".bitacora_planb.json", JSON.stringify({ dueno: yo, expira: Date.now() + 15000 }));
          await espera(150);
          const t2 = await leerFicha();
          if (t2 && t2.dueno === yo) {
            if (!(await servidorOcupado())) tengo = true;
            else await soltar();
          }
        }
      }
      if (!tengo) {
        if (Date.now() > limite) throw new Error("La bitácora está ocupada por otro equipo. Intenta de nuevo en unos segundos.");
        await espera(100 + Math.random() * 250);
      }
    }
    try { return await fn(); }
    finally { await soltar(); }
  },

  /* ---------------------------------------------------------- seguridad */
  async hash(salt, clave) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + "|" + clave));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  },
  aleatorio(n) {
    const b = crypto.getRandomValues(new Uint8Array(n));
    return btoa(String.fromCharCode(...b)).replace(/\+/g, "A").replace(/\//g, "B").replace(/=/g, "");
  },
  rolDe(p) { return U.norm(p.cat).includes("SUPERV") ? "supervisor" : "tecnico"; },
  claveInicial(p) { return this.rolDe(p) === "supervisor" ? "24RU1" : (String(p.rpe) + String(p.ini)).toUpperCase(); },
  async asegurarUsuarios(db) {
    let cambio = false;
    for (const p of db.personal) {
      const rpe = U.ini(p.rpe); if (!rpe) continue;
      let u = db.usuarios.find(x => U.ini(x.rpe) === rpe);
      if (!u) {
        const salt = this.aleatorio(12);
        u = { rpe, salt, hash: await this.hash(salt, this.claveInicial(p)), cambiada: false, ultimo: "" };
        db.usuarios.push(u); cambio = true;
      }
      if (u.rol !== this.rolDe(p)) { u.rol = this.rolDe(p); cambio = true; }
    }
    return cambio;
  },
  async validar(u, clave) {
    if (await this.hash(u.salt, clave) === u.hash) return true;
    return !u.cambiada && await this.hash(u.salt, clave.toUpperCase()) === u.hash;
  },

  /* Sesion: en la PC dura lo que la pestana; en el CELULAR se conserva 12 horas aunque se cierre la aplicacion,
     para no tener que entrar de nuevo cada vez que se abre durante el turno. */
  guardaSesion() {
    sessionStorage.setItem("b_local_sesion", JSON.stringify(this.sesion));
    if (B.modoMovil) try { localStorage.setItem("b_movil_sesion", JSON.stringify({ s: this.sesion, exp: Date.now() + 12 * 3600000 })); } catch (e) { }
  },
  leeSesion() {
    const s = JSON.parse(sessionStorage.getItem("b_local_sesion") || "null");
    if (s || !B.modoMovil) return s;
    try { const o = JSON.parse(localStorage.getItem("b_movil_sesion") || "null"); if (o && o.s && o.exp > Date.now()) return o.s; localStorage.removeItem("b_movil_sesion"); } catch (e) { }
    return null;
  },
  borraSesion() { sessionStorage.removeItem("b_local_sesion"); try { localStorage.removeItem("b_movil_sesion"); } catch (e) { } },

  /* ---------------------------------------------------------- API equivalente al servidor */
  async llamar(ruta, b) {
    b = b || {};
    if (ruta === "info") return { ok: true, proyecto: "24RU1", version: "2.5", enRed: false, urls: [], demo: this.sub === "datos_demo", local: true };
    if (ruta === "login") return this.login(b);
    if (ruta === "imagenes") { const im = (await this.leer("imagenes")) || {}; return { ok: true, membrete: im.membrete || "", pie: im.pie || "", ofIzq: im.ofIzq || "", ofDer: im.ofDer || "", ofPie: im.ofPie || "", ver: im.ver || "" }; }
    if (!this.sesion) this.sesion = this.leeSesion();
    const s = this.sesion;
    if (!s) { B.app && B.app.sesionExpirada(); throw new Error("La sesión expiró. Vuelve a iniciar sesión."); }
    const sup = s.rol === "supervisor";
    switch (ruta) {
      case "logout": this.sesion = null; this.borraSesion(); return { ok: true };
      case "estado": return this.estado(s);
      case "clave": if (B.modoMovil) throw new Error("La contraseña se cambia en la bitácora de la PC; el celular la recibe con el siguiente paquete de datos."); return this.bloquear(() => this.cambiarClave(s, b));
      case "op": return this.bloquear(() => this.opComo(s, sup, b));
      case "respaldo": if (!sup) throw new Error("Solo supervisores."); if (B.modoMovil) throw new Error("Los respaldos se hacen en la bitácora de la PC."); { const db = await this.cargar(); db._generado = U.ahoraISO(); return db; }
      case "restaurar": if (!sup) throw new Error("Solo supervisores."); if (B.modoMovil) throw new Error("Solo disponible en la bitácora de la PC."); return this.bloquear(() => this.restaurar(b.db));
      case "pdf": throw new Error("En el modo sin servidor usa Imprimir y elige 'Guardar como PDF'.");
    }
    throw new Error("Ruta no válida");
  },

  /* Una operacion puede ejecutarse a nombre de otra persona ("como") al importar capturas de celular (solo supervisores).
     En el celular, cada operacion permitida se anota ademas en la lista de pendientes para enviarla a la PC. */
  async opComo(s, sup, b) {
    let s2 = s, sup2 = sup; const como = U.ini(b.como), d = b.datos || {}, key = b.col + "." + b.accion;
    if (como && como !== s.ini) {
      if (!sup) throw new Error("Solo un supervisor puede importar capturas de otra persona.");
      const p = (await this.leer("personal") || []).find(x => U.ini(x.ini) === como);
      if (!p) throw new Error("Iniciales no encontradas en el personal: " + como);
      s2 = { rpe: U.ini(p.rpe), ini: como, rol: this.rolDe(p), nombre: p.nombre }; sup2 = s2.rol === "supervisor";
    }
    if (!B.modoMovil) return this.operacion(s2, sup2, b.col, b.accion, d);
    if (!B.inter.permitida(key)) throw new Error("Esta función solo está disponible en la bitácora de la PC.");
    const refs = B.inter.seRegistra(key) ? B.inter.huellas({ actividades: await this.leer("actividades") || [], ec: await this.leer("ec") || [], vig: await this.leer("vig") || [] }, b.col, d) : {};
    const r = await this.operacion(s2, sup2, b.col, b.accion, d);
    if (B.inter.seRegistra(key)) {
      const P = (await this.leer("pendientes")) || [];
      P.push({ uid: B.inter.uid(), t: U.ahoraISO(), ini: s2.ini, col: b.col, accion: b.accion, datos: JSON.parse(JSON.stringify(d)), refs });
      await this.escribir("pendientes", P);
    }
    return r;
  },

  /* Cargas iniciales (servidor/cargas/*.json): misma logica que Servidor.cs; una sola vez y nunca en los datos demo */
  async aplicarCargas(db) {
    try {
      if (this.sub !== "datos" || !this.raiz) return;
      let dir; try { dir = await (await this.raiz.getDirectoryHandle("servidor")).getDirectoryHandle("cargas"); } catch (e) { return; }
      const cfg = db.config || {}, hechas = [...(cfg.cargas || [])], archivos = [];
      for await (const [n, h] of dir.entries()) if (h.kind === "file" && n.toLowerCase().endsWith(".json")) archivos.push([n, h]);
      archivos.sort((a, b) => a[0].localeCompare(b[0]));
      for (const [, h] of archivos) {
        const c = JSON.parse(await (await h.getFile()).text());
        if (!c.id || hechas.includes(c.id)) continue;
        const L = db.ec, cat = db.catalogos || {}, tocados = [], inicio = +c.ecInicio || 0;
        for (const it of c.ec || []) {
          let e = L.find(x => x.fecha === it.fecha && U.norm(x.esp) === U.norm(it.esp));
          if (!e) {
            e = { obs: "", capt: U.ini(String(it.pers || "").split("/")[0]), reg: U.ahoraISO() + ":00", carga: c.id };
            for (const k of ["esp", "o2", "hr", "temp", "lel", "co", "h2s", "lib", "pers", "fecha", "turno"]) e[k] = String(it[k] ?? "");
            L.push(e);
          } else if (+e.num !== +it.num) e.numAnt = e.num;
          e.num = +it.num; e.pre = it.pre || "";
          tocados.push(e); this.agregarCatalogo(cat, "espacios", it.esp);
        }
        const ocupados = new Set(tocados.map(x => +x.num));
        const mover = L.filter(x => !tocados.includes(x) && (ocupados.has(+x.num) || (!x.pre && +x.num < inicio)))
          .sort((a, b) => String(a.lib || a.fecha).localeCompare(String(b.lib || b.fecha)) || a.num - b.num);
        let sig = Math.max(inicio, Math.max(0, ...L.filter(x => !mover.includes(x)).map(x => +x.num)) + 1);
        for (const x of mover) { x.numAnt = x.num; x.num = sig++; }
        if (inicio > 0) cfg.ecInicio = inicio;
        hechas.push(c.id); cfg.cargas = hechas; db.config = cfg;
        await this.escribir("ec", L); await this.escribir("catalogos", cat); await this.escribir("config", cfg);
      }
    } catch (e) { console.warn("carga inicial:", e); }
  },
  async login(b) {
    return this.bloquear(async () => {
      const db = await this.cargar();
      if (await this.asegurarUsuarios(db)) await this.escribir("usuarios", db.usuarios);
      if (!B.modoMovil) await this.aplicarCargas(db);
      const rpe = U.ini(b.rpe), p = db.personal.find(x => U.ini(x.rpe) === rpe), u = db.usuarios.find(x => U.ini(x.rpe) === rpe);
      if (!p || !u || !(await this.validar(u, String(b.clave || "")))) throw new Error("RPE o contraseña incorrectos.");
      if (U.norm(p.activo) === "NO") throw new Error("Usuario inactivo. Consulta a tu supervisor.");
      u.ultimo = U.ahoraISO() + ":00";
      await this.escribir("usuarios", db.usuarios);
      this.sesion = { rpe, ini: U.ini(p.ini), rol: this.rolDe(p), nombre: p.nombre };
      this.guardaSesion();
      return { ok: true, token: "local", usuario: this.infoUsuario(this.sesion, u) };
    });
  },
  infoUsuario(s, u) { return { rpe: s.rpe, ini: s.ini, nombre: s.nombre, rol: s.rol, cambiada: !!(u && u.cambiada), tours: (u && u.tours) || "", ofCat: (u && u.ofCat) || "", ofTit: (u && u.ofTit) || "", ofDepto: (u && u.ofDepto) || "" }; },

  async estado(s) {
    const db = await this.cargar(), sup = s.rol === "supervisor";
    const u = db.usuarios.find(x => U.ini(x.rpe) === s.rpe);
    const mias = a => U.ini(a.ini) === s.ini;
    const sug = new Map();
    for (const a of db.actividades) {
      const t = String(a.txt || "").replace(/\n/g, " ").trim(); if (!t) continue;
      const k = U.norm(t); if (!sug.has(k)) sug.set(k, { t, n: 0, mia: false });
      const e = sug.get(k); e.n++; if (mias(a)) e.mia = true;
    }
    return {
      ok: true, usuario: this.infoUsuario(s, u), config: db.config, catalogos: db.catalogos, imgVer: (db.imagenes && db.imagenes.ver) || "", personal: db.personal, cambios: db.cambios,
      ec: db.ec, vig: db.vig, actividades: sup ? db.actividades : db.actividades.filter(a => mias(a) || !a.ini), he: sup ? db.he : db.he.filter(mias),
      turnos: sup ? db.turnos : [], hojas: db.hojas || [],
      equipo: sup ? undefined : db.actividades.filter(a => a.ini && !mias(a) && (a.est === "Pendiente" || a.est === "En proceso" || a.fecha >= U.sumar(U.iso(new Date()), -3))),
      sugerencias: [...sug.values()].sort((a, b) => (b.mia - a.mia) || (b.n - a.n)).slice(0, 1500),
      usuarios: sup ? db.usuarios.map(x => ({ rpe: x.rpe, rol: x.rol, cambiada: !!x.cambiada, ultimo: x.ultimo || "", ofCat: x.ofCat || "", ofTit: x.ofTit || "", ofDepto: x.ofDepto || "" })) : undefined,
      servidor: { local: true, enRed: false, urls: [], edge: false, demo: this.sub === "datos_demo",
        reportes: "Imprimir → Guardar como PDF", datos: this.raiz.name + "\\" + this.sub, respaldos: this.raiz.name + "\\respaldos\\" + this.sub }
    };
  },

  async cambiarClave(s, b) {
    const usuarios = (await this.leer("usuarios")) || [], u = usuarios.find(x => U.ini(x.rpe) === s.rpe);
    if (!u) throw new Error("Usuario no encontrado.");
    if (!(await this.validar(u, String(b.actual || "")))) throw new Error("La contraseña actual no es correcta.");
    if (String(b.nueva || "").length < 5) throw new Error("La nueva contraseña debe tener al menos 5 caracteres.");
    u.salt = this.aleatorio(12); u.hash = await this.hash(u.salt, b.nueva); u.cambiada = true;
    await this.escribir("usuarios", usuarios);
    return { ok: true };
  },

  async restaurar(db) {
    if (!db || typeof db !== "object") throw new Error("Archivo de respaldo no válido.");
    await this.respaldoDiario("inicio");
    for (const n of this.LISTAS) if (Array.isArray(db[n])) await this.escribir(n, db[n]);
    for (const n of this.OBJETOS) if (db[n] && typeof db[n] === "object") await this.escribir(n, db[n]);
    return { ok: true };
  },

  agregarCatalogo(cat, tipo, texto, item) {
    if (!["espacios", "vigilancias", "difusion"].includes(tipo) || !String(texto || "").trim()) return false;
    const l = cat[tipo] = cat[tipo] || [], k = U.norm(texto);
    if (l.some(x => U.norm(typeof x === "string" ? x : (x.desc || x.txt)) === k)) return false;
    l.push(tipo === "espacios" ? texto.trim() : tipo === "vigilancias" ? (item || { desc: texto.trim() }) : { txt: texto.trim(), tema: "" });
    return true;
  },

  /* Misma logica y permisos que el servidor (Servidor.cs) */
  async operacion(s, sup, col, acc, d) {
    const ahora = () => U.ahoraISO() + ":00", sig = (l, c) => l.reduce((m, x) => Math.max(m, +x[c] || 0), 0) + 1;
    const puede = ini => sup || U.ini(ini) === s.ini, soloSup = () => { if (!sup) throw new Error("Solo supervisores."); };
    // pasa un espacio NO LIBERADO a liberado con las lecturas de "src" (misma logica que LiberarNucleo del servidor)
    const liberarNuc = (L, e, fh, src, pers, auto, inicio) => {
      const tt = B.t.de(fh), ke = U.norm(e.esp), otro = L.find(x => x !== e && x.fecha === tt.f && U.norm(x.esp) === ke);
      if (otro) return "Ese espacio ya tiene otro registro el " + tt.f + " (EC #" + otro.num + ").";
      const mon = Array.isArray(e.mon) ? e.mon : [], lib0 = String(e.lib || "").slice(0, 16);
      for (const x of mon) if (x.fh < fh) x.nl = true;
      const m0 = { id: mon.reduce((m, x) => Math.max(m, +x.id || 0), 0) + 1, fh: lib0.length === 16 ? lib0 : e.fecha + "T00:00", nl: true };
      for (const k of ["o2", "hr", "temp", "lel", "co", "h2s", "obs", "pers", "capt"]) m0[k] = String(e[k] ?? "");
      if (e.elev) m0.elev = e.elev;
      mon.push(m0); e.mon = mon.sort((a, b) => a.fh.localeCompare(b.fh));
      for (const k of ["o2", "hr", "temp", "lel", "co", "h2s", "obs"]) e[k] = String(src[k] ?? "").trim();
      if (String(src.elev || "").trim()) e.elev = String(src.elev).trim();
      e.pers = U.ini(pers) || s.ini; e.lib = fh; e.fecha = tt.f; e.turno = tt.t;
      e.nlNum = e.num; delete e.noLib; e.num = sigEc(L.filter(x => x !== e), false, inicio);
      e.liberoPor = auto ? "AUTO" : s.ini; e.mod = ahora() + " " + s.ini;
      return null;
    };
    // consecutivo de espacios confinados: liberados por un lado; NO LIBERADOS con folios 900001... (se muestran NL-n)
    const sigEc = (L, nl, inicio) => nl ? Math.max(900000, ...L.map(x => +(x.noLib ? x.num : x.nlNum) || 0)) + 1
      : Math.max(L.filter(x => !x.noLib && +x.num <= 900000).reduce((m, x) => Math.max(m, +x.num || 0), 0) + 1, inicio || 0);
    const key = col + "." + acc;
    // una actividad asignada a varias personas es UNA sola: sus registros comparten "grupo"
    const grupoDe = (L, a) => a.grupo ? L.filter(x => x.grupo === a.grupo) : [a];
    switch (key) {
      case "actividades.guardarTurno": {
        const ini = U.ini(d.ini);
        if (!puede(ini)) throw new Error("Solo puedes capturar tus propias actividades.");
        const L = await this.leer("actividades") || [], per = (await this.leer("personal") || []).find(p => U.ini(p.ini) === ini);
        if (!per) throw new Error("Iniciales no encontradas en el personal.");
        let nNew = 0, nUpd = 0, nDel = 0, nUni = 0;
        // actividades nuevas que ya existen: se unen (texto igual) o se detiene el guardado (parecidas), igual que en el servidor
        const cand = x => (x.fecha === d.fecha && x.turno === d.turno) || x.est === "Pendiente" || x.est === "En proceso";
        const planes = new Map(), parecidas = [];
        for (const it of d.items || []) {
            const tx = String(it.txt || "").trim(); if (+it.id > 0 || !tx) continue;
            let tg = null;
            if (+it.unir > 0) { tg = L.find(x => +x.id === +it.unir); if (!tg || !cand(tg)) throw new Error("La actividad a la que querías unirte ya no está disponible. Actualiza la página e inténtalo de nuevo."); }
            else {
              const ig = L.filter(x => cand(x) && U.norm(x.txt) === U.norm(tx));
              tg = ig.find(x => U.ini(x.ini) === ini) || ig[0] || null;
              if (!tg) {
                const vistos = new Set();
                for (const x of L.filter(cand)) {
                  const g = B.dom.parecido(tx, x.txt);
                  if (!g || (g === 1 && it.distinta === true) || (g === 2 && it.distinta === true && sup)) continue;
                  const kk = x.grupo ? "g" + x.grupo : U.norm(x.txt); if (vistos.has(kk)) continue; vistos.add(kk);
                  parecidas.push({ para: tx, id: x.id, txt: x.txt, est: !x.ini ? "Por asignar" : x.est, inis: [...new Set(grupoDe(L, x).map(y => U.ini(y.ini)).filter(Boolean))].join("/"), fecha: x.fecha, turno: x.turno, igual: g === 2 });
                }
              }
            }
            planes.set(it, tg);
        }
        if (parecidas.length) { const e = new Error("Ya hay una actividad igual o muy parecida capturada. Únete a ella en lugar de duplicarla."); e.datos = { parecidas }; throw e; }
        const nuevasK = new Set();
        const unir = (a0, est, com) => {
          const mismo = a0.fecha === d.fecha && a0.turno === d.turno;
          if (!a0.ini) {
            Object.assign(a0, { ini, nombre: per.nombre, tomo: s.ini, mod: ahora() });
            if (est === "Realizada") { a0.fecha = d.fecha; a0.turno = d.turno; }
            a0.est = est; a0.estOrig = est; if (com) { a0.com = com; a0.comPor = s.ini; } return;
          }
          if (!a0.grupo) a0.grupo = Date.now() + "u" + a0.id;
          const grp = grupoDe(L, a0);
          if (!grp.some(x => U.ini(x.ini) === ini)) { const n = { ...a0, id: sig(L, "id"), ini, nombre: per.nombre, reg: ahora(), capturo: s.ini, unio: s.ini }; delete n.tomo; L.push(n); grp.push(n); }
          const linea = (!mismo && (est === "Realizada" || com)) ? U.cortaDM(d.fecha) + " " + d.turno + " " + s.ini + ": " + (est === "Realizada" ? "CONCLUIDA" : est.toUpperCase()) + (com ? " - " + com : "") : "";
          for (const x of grp) {
            if (mismo) { if (!(x.est === "Realizada" && est !== "Realizada") && x.est !== "Concluida") { x.est = est; x.estOrig = est; } if (com) { x.com = com; x.comPor = s.ini; } }
            else {
              if (est === "Realizada") Object.assign(x, { est: "Concluida", fCierre: d.fecha, tCierre: d.turno, cerro: s.ini }); else if (x.est !== "Concluida") x.est = est;
              if (linea) x.seg = (x.seg ? x.seg + "\n" : "") + linea;
            }
            x.mod = ahora();
          }
        };
        for (const id of d.borrar || []) { const i = L.findIndex(x => +x.id === +id && U.ini(x.ini) === ini); if (i >= 0) { L.splice(i, 1); nDel++; } }
        for (const it of d.items || []) {
          const txt = String(it.txt || "").trim(), est = it.est || "Realizada"; if (!txt) continue;
          if (+it.id > 0) {
            const a = L.find(x => +x.id === +it.id && U.ini(x.ini) === ini); if (!a) continue;
            const grp = grupoDe(L, a), t2 = grp.length > 1 ? a.txt : txt;
            let cambio = false;
            if ("com" in it && (a.com || "") !== (it.com || "") && (sup || !a.com || !a.comPor || U.ini(a.comPor) === s.ini)) { for (const x of grp) { x.com = it.com || ""; x.comPor = it.com ? s.ini : ""; } cambio = true; }
            if (a.txt !== t2 || a.est !== est) { for (const x of grp) { if (x === a) x.txt = t2; x.est = est; if (est !== "Concluida") x.estOrig = est; x.mod = ahora(); } cambio = true; }
            if (cambio) { a.mod = ahora(); nUpd++; }
          } else {
            if (nuevasK.has(U.norm(txt))) continue; nuevasK.add(U.norm(txt));
            const tg = planes.get(it);
            if (tg) { if (!(U.ini(tg.ini) === ini && tg.fecha === d.fecha && tg.turno === d.turno)) { unir(tg, est, it.com || ""); nUni++; } continue; }
            L.push({ id: sig(L, "id"), fecha: d.fecha, turno: d.turno, ini, nombre: per.nombre, txt, est, estOrig: est, seg: "", fCierre: "", tCierre: "", cerro: "", reg: ahora(), capturo: s.ini, ...(it.com ? { com: it.com, comPor: s.ini } : {}) });
            nNew++;
          }
        }
        await this.escribir("actividades", L);
        return { ok: true, nuevas: nNew, modificadas: nUpd, eliminadas: nDel, unidas: nUni };
      }
      case "actividades.asignar": {
        soloSup();
        let txt = String(d.txt || "").trim();
        let est = ["Realizada", "En proceso", "Pendiente"].includes(d.est) ? d.est : "Realizada", uni = ["U1", "U2"].includes(d.uni) ? d.uni : "";
        if (!d.fecha || !["T1", "T2"].includes(d.turno)) throw new Error("Fecha o turno no válidos.");
        if (!txt) throw new Error("Escribe la actividad.");
        const L = await this.leer("actividades") || [], per = await this.leer("personal") || [];
        let grupo = String(Date.now());
        const k = U.norm(txt), creadas = [], omitidas = [];
        if (d.libre === true) {
          if (L.some(x => !x.ini && U.norm(x.txt) === k && x.est === "Pendiente")) throw new Error("Esa actividad ya está en la lista de actividades por asignar.");
          const n = { id: sig(L, "id"), fecha: d.fecha, turno: d.turno, ini: "", nombre: "", txt, est: "Pendiente", estOrig: "Pendiente", seg: "", fCierre: "", tCierre: "", cerro: "", reg: ahora(), capturo: s.ini, asig: s.ini, grupo, uni, ...(d.rep === true ? { rep: true } : {}) };
          L.push(n); await this.escribir("actividades", L);
          return { ok: true, creadas, omitidas, libre: n.id };
        }
        let libre = +d.id > 0 ? L.find(x => +x.id === +d.id && !x.ini) : null;
        if (libre) { if (!libre.grupo) libre.grupo = grupo; grupo = libre.grupo; if (!uni) uni = libre.uni || ""; }
        else {
          const ya = L.find(x => x.fecha === d.fecha && x.turno === d.turno && x.ini && U.norm(x.txt) === k && x.est !== "Concluida");
          if (ya) { if (!ya.grupo) ya.grupo = grupo; grupo = ya.grupo; est = ya.est; txt = ya.txt; if (!uni) uni = ya.uni || ""; }
        }
        for (const o of d.inis || []) {
          const ini = U.ini(o); if (!ini || creadas.includes(ini) || omitidas.includes(ini)) continue;
          const p = per.find(x => U.ini(x.ini) === ini);
          if (!p || L.some(x => x.fecha === d.fecha && x.turno === d.turno && U.ini(x.ini) === ini && U.norm(x.txt) === k)) { omitidas.push(ini); continue; }
          if (libre) { Object.assign(libre, { ini, nombre: p.nombre, fecha: d.fecha, turno: d.turno, txt, est, estOrig: est, asig: s.ini, mod: ahora(), uni }); libre = null; creadas.push(ini); continue; }
          L.push({ id: sig(L, "id"), fecha: d.fecha, turno: d.turno, ini, nombre: p.nombre, txt, est, estOrig: est, seg: "", fCierre: "", tCierre: "", cerro: "", reg: ahora(), capturo: s.ini, asig: s.ini, grupo, uni });
          creadas.push(ini);
        }
        if (!creadas.length && !omitidas.length) throw new Error("Elige al menos una persona.");
        if (creadas.length) await this.escribir("actividades", L);
        return { ok: true, creadas, omitidas };
      }
      case "actividades.tomar": {
        const L = await this.leer("actividades") || [], a = L.find(x => +x.id === +d.id);
        if (!a) throw new Error("Actividad no encontrada.");
        if (a.ini) throw new Error("Esta actividad ya la tomó " + a.ini + ".");
        const ini = sup && d.ini ? U.ini(d.ini) : s.ini, p = (await this.leer("personal") || []).find(x => U.ini(x.ini) === ini);
        if (!p) throw new Error("Iniciales no encontradas en el personal.");
        if (d.hecha === true && (!d.fecha || !["T1", "T2"].includes(d.turno))) throw new Error("Fecha o turno no válidos.");
        Object.assign(a, { ini, nombre: p.nombre, tomo: s.ini, mod: ahora() });
        if (d.hecha === true) Object.assign(a, { fecha: d.fecha, turno: d.turno, est: "Realizada", estOrig: "Realizada" });
        await this.escribir("actividades", L); return { ok: true };
      }
      case "actividades.unidad": {
        soloSup();
        const L = await this.leer("actividades") || [], a = L.find(x => +x.id === +d.id);
        if (!a) throw new Error("Actividad no encontrada.");
        const u = ["U1", "U2"].includes(d.uni) ? d.uni : "", k = U.norm(a.txt);
        for (const x of L) if (x === a || (a.grupo && x.grupo === a.grupo) || (U.norm(x.txt) === k && x.est !== "Concluida" && x.est !== "Realizada")) x.uni = u;
        await this.escribir("actividades", L); return { ok: true };
      }
      case "actividades.reasignar": {
        if (!sup) throw new Error("Solo supervisores pueden reasignar actividades.");
        const L = await this.leer("actividades") || [], per = await this.leer("personal") || [], a = L.find(x => +x.id === +d.id);
        if (!a) throw new Error("Actividad no encontrada.");
        const inis = [];
        for (const o of d.inis || []) { const i = U.ini(o); if (!i || inis.includes(i)) continue; if (!per.some(p => U.ini(p.ini) === i)) throw new Error("Iniciales no encontradas en el personal: " + i); inis.push(i); }
        const nom = i => per.find(p => U.ini(p.ini) === i).nombre;
        if (!a.grupo && inis.length > 1) a.grupo = Date.now() + "r" + a.id;
        const grp = grupoDe(L, a), quedan = grp.filter(x => inis.includes(U.ini(x.ini))), quitar = grp.filter(x => !inis.includes(U.ini(x.ini)));
        const faltan = inis.filter(i => !quedan.some(x => U.ini(x.ini) === i)), base = quedan[0] || a;
        let primero = true;
        for (const x of quitar) {
          if (faltan.length) { const i = faltan.shift(); x.ini = i; x.nombre = nom(i); }
          else if (!inis.length && primero) { x.ini = ""; x.nombre = ""; }
          else { L.splice(L.indexOf(x), 1); primero = false; continue; }
          primero = false; x.asig = s.ini; x.mod = ahora() + " " + s.ini;
        }
        for (const i of faltan) { const n = { ...base, id: sig(L, "id"), ini: i, nombre: nom(i), reg: ahora(), capturo: s.ini, asig: s.ini }; delete n.tomo; L.push(n); }
        await this.escribir("actividades", L); return { ok: true, inis };
      }
      case "actividades.estatus": {
        if (!sup) throw new Error("Solo supervisores pueden cambiar el estatus de una actividad guardada.");
        const L = await this.leer("actividades") || [], a = L.find(x => +x.id === +d.id);
        if (!a) throw new Error("Actividad no encontrada.");
        const est = d.est, txt = String(d.txt || "").trim();
        if (!["Realizada", "En proceso", "Pendiente", "Concluida"].includes(est)) throw new Error("Estatus no válido.");
        if (!a.ini && est !== "Pendiente" && est !== a.est) throw new Error("Una actividad por asignar solo puede estar Pendiente: asígnala primero.");
        if (est === "Concluida" && (!d.fecha || !["T1", "T2"].includes(d.turno))) throw new Error("Fecha o turno no válidos.");
        for (const x of grupoDe(L, a)) {
          if (est === "Concluida") {
            Object.assign(x, { est: "Concluida", fCierre: d.fecha, tCierre: d.turno, cerro: x.ini });
            if (!x.estOrig || x.estOrig === "Realizada" || x.estOrig === "Concluida") x.estOrig = "Pendiente";
          } else Object.assign(x, { est, estOrig: est, fCierre: "", tCierre: "", cerro: "" });
          if (txt) x.txt = txt;
          if ("uni" in d) x.uni = ["U1", "U2"].includes(d.uni) ? d.uni : "";
          if ("rep" in d) x.rep = d.rep === true;
          x.mod = ahora() + " " + s.ini;
        }
        await this.escribir("actividades", L); return { ok: true };
      }
      case "actividades.comentario": {
        const L = await this.leer("actividades") || [], a = L.find(x => +x.id === +d.id);
        if (!a) throw new Error("Actividad no encontrada.");
        const grp = grupoDe(L, a), miembro = grp.some(x => U.ini(x.ini) === s.ini), nuevo = String(d.texto || "").replace(/[\r\n]+/g, " ").trim();
        const NO = "Solo quien escribió el comentario o un supervisor puede modificarlo.";
        if (d.tipo === "com") {
          const por = U.ini(a.comPor);
          if (!sup && !(miembro && (!por || por === s.ini))) throw new Error(NO);
          for (const x of grp) { x.com = nuevo; x.comPor = nuevo ? (por || s.ini) : ""; x.mod = ahora() + " " + s.ini; }
        } else {
          const orig = String(d.linea || ""), m = /^(\d{2}\/\d{2} T[12]) ([^:]+): (?:(CONCLUIDA|EN PROCESO|PENDIENTE)(?: - )?)?(.*)$/.exec(orig);
          if (!sup && !(miembro && m && U.ini(m[2]) === s.ini)) throw new Error(NO);
          const nl = !m ? nuevo : (!m[3] && !nuevo) ? "" : m[1] + " " + m[2] + ": " + (m[3] ? m[3] + (nuevo ? " - " : "") : "") + nuevo;
          let hecho = false;
          for (const x of grp) {
            const ls = String(x.seg || "").split("\n"), i = ls.indexOf(orig); if (i < 0) continue;
            if (nl) ls[i] = nl; else ls.splice(i, 1);
            x.seg = ls.join("\n"); x.mod = ahora() + " " + s.ini; hecho = true;
          }
          if (!hecho) throw new Error("Ese comentario ya no existe. Actualiza la página.");
        }
        await this.escribir("actividades", L); return { ok: true };
      }
      case "actividades.seguimiento": {
        const L = await this.leer("actividades") || [], a = L.find(x => +x.id === +d.id);
        if (!a) throw new Error("Actividad no encontrada.");
        if (!puede(a.ini)) throw new Error("Solo puedes dar seguimiento a tus propias actividades.");
        const accion = d.accion || "", com = d.comentario || "";
        if (!accion && !com) throw new Error("Elige una acción o escribe un comentario.");
        const linea = U.cortaDM(d.fecha) + " " + d.turno + " " + s.ini + ": " + (accion ? accion.toUpperCase() + (com ? " - " : "") : "") + com;
        for (const x of grupoDe(L, a)) {
          x.seg = (x.seg ? x.seg + "\n" : "") + linea;
          if (accion === "Concluida") { x.est = "Concluida"; x.fCierre = d.fecha; x.tCierre = d.turno; x.cerro = s.ini; }
          else if (accion === "En proceso" || accion === "Pendiente") x.est = accion;
          x.mod = ahora();
        }
        await this.escribir("actividades", L); return { ok: true };
      }
      case "actividades.borrar": { soloSup(); const L = (await this.leer("actividades") || []).filter(x => +x.id !== +d.id); await this.escribir("actividades", L); return { ok: true }; }
      case "he.guardar": case "he.supervisar": {
        const ini = U.ini(d.ini);
        if (acc === "supervisar") soloSup();
        if (!puede(ini)) throw new Error("Solo puedes capturar tus propias horas extra.");
        const he = String(d.he ?? "").trim();
        if (he !== "" && (isNaN(+he) || +he < 0 || +he > 24)) throw new Error("Horas extra: escribe un número entre 0 y 24.");
        for (const k of ["de", "a"]) if (d[k] && !(k === "a" && d[k] === "24:00") && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(d[k])) throw new Error("Horario de horas extra: escribe la hora como HH:MM (ej. 19:30).");
        const L = await this.leer("he") || [], tramo = String(d.tramo || "1"), tr = x => String(x.tramo || "1");
        if (d.de && d.a) {
          if (!/:(00|30)$/.test(d.de) || !/:(00|30)$/.test(d.a)) throw new Error("El horario de tiempo extra se registra en horas o medias horas (ej. 19:00 o 19:30).");
          const min = x => +x.split(":")[0] * 60 + +x.split(":")[1];
          let x1 = min(d.de), x2 = min(d.a); if (x2 <= x1) x2 += 1440;
          for (const o of L) {
            if (o.fecha !== d.fecha || U.ini(o.ini) !== ini || !o.de || !o.a || (o.turno === d.turno && tr(o) === tramo)) continue;
            let y1 = min(o.de), y2 = min(o.a); if (y2 <= y1) y2 += 1440;
            if (x1 < y2 && y1 < x2) throw new Error("Ese horario se traslapa con otro registro de tiempo extra del mismo día (" + o.de + " a " + o.a + "). Corrige el horario o edita ese registro.");
          }
        }
        let h = L.find(x => x.fecha === d.fecha && x.turno === d.turno && U.ini(x.ini) === ini && tr(x) === tramo);
        if (!h) { h = { fecha: d.fecha, turno: d.turno, ini, tramo, he: "", mot: "", verif: "", obs: "" }; L.push(h); }
        if ("he" in d) h.he = he; if ("mot" in d) h.mot = d.mot || "";
        for (const k of ["de", "a", "alD", "alC", "alCe"]) if (k in d) h[k] = String(d[k] || "");
        if (acc === "supervisar") { if ("verif" in d) h.verif = d.verif || ""; if ("obs" in d) h.obs = d.obs || ""; }
        h.mod = ahora() + " " + s.ini;
        const L2 = (!h.he && !h.mot && !h.verif && !h.obs && !h.de && !h.a) ? L.filter(x => x !== h) : L;
        await this.escribir("he", L2); return { ok: true };
      }
      case "he.justificar": {
        const ini = U.ini(d.ini), mot = String(d.mot || "").trim();
        if (!puede(ini)) throw new Error("Solo puedes cambiar tus propias horas extra.");
        if (!mot) throw new Error("Escribe la justificación.");
        const L = await this.leer("he") || []; let n = 0;
        for (const h of L) if (U.ini(h.ini) === ini && h.fecha >= d.d1 && h.fecha <= d.d2 && (h.he || h.de) && h.mot !== mot) { h.mot = mot; h.mod = ahora() + " " + s.ini; n++; }
        if (n) await this.escribir("he", L);
        return { ok: true, n };
      }
      case "he.verificar": {
        soloSup();
        const L = await this.leer("he") || [];
        for (const it of d.items || []) {
          let hs = L.filter(x => x.fecha === it.fecha && x.turno === it.turno && U.ini(x.ini) === U.ini(it.ini));
          if (!hs.length) { const h = { fecha: it.fecha, turno: it.turno, ini: U.ini(it.ini), tramo: "1", he: "", mot: "", verif: "", obs: "" }; L.push(h); hs = [h]; }
          for (const h of hs) { h.verif = d.verif || "SI"; h.mod = ahora(); }
        }
        await this.escribir("he", L); return { ok: true, n: (d.items || []).length };
      }
      case "ec.liberar": {
        if (!sup) throw new Error("Solo un supervisor puede liberar manualmente. El espacio se libera solo al capturar una prueba con todos sus parámetros satisfactorios.");
        const L = await this.leer("ec") || [], e = L.find(x => +x.num === +d.num);
        if (!e) throw new Error("Registro no encontrado.");
        if (!e.noLib) throw new Error("Ese espacio ya está liberado (EC #" + e.num + ").");
        const fh = String(d.lib || "");
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fh)) throw new Error("Fecha u hora de liberación no válida.");
        if (fh > U.isoFH(new Date(Date.now() + 15 * 60000))) throw new Error("La fecha y hora de liberación no puede ser futura.");
        const mon = Array.isArray(e.mon) ? e.mon : [], lib0 = String(e.lib || "").slice(0, 16);
        const ult = [...mon.map(x => x.fh), lib0].sort().pop();
        if (ult && fh <= ult) throw new Error("La liberación debe ser posterior a la última prueba registrada (" + ult.replace("T", " ") + ").");
        const mal = liberarNuc(L, e, fh, d, d.pers, false, +((await this.leer("config")) || {}).ecInicio || 0);
        if (mal) throw new Error(mal);
        await this.escribir("ec", L); return { ok: true, num: e.num };
      }
      case "ec.crear": {
        const capt = sup && d.capt ? U.ini(d.capt) : s.ini, L = await this.leer("ec") || [], cat = await this.leer("catalogos") || {}, nums = [];
        if (capt !== s.ini && !(await this.leer("personal") || []).some(p => U.ini(p.ini) === capt)) throw new Error("Iniciales no encontradas en el personal: " + capt);
        const vistosEc = [];
        for (const it of d.items || []) {
          if (!it.esp) continue;
          const ke = U.norm(it.esp), ya = L.find(x => x.fecha === d.fecha && U.norm(x.esp) === ke);
          if (ya && ya.noLib) throw new Error(`El espacio "${it.esp}" ya está registrado ese día como NO LIBERADO. Entra a Monitoreo de E.C. para capturar la nueva prueba o liberarlo.`);
          if (ya) throw new Error(`El espacio "${it.esp}" ya está registrado ese día (EC #${ya.num}, capturado por ${ya.capt}). No se guardó nada para evitar duplicados.`);
          if (vistosEc.includes(ke)) throw new Error(`El espacio "${it.esp}" está repetido en la captura.`);
          vistosEc.push(ke);
        }
        let catCambio = false;
        for (const it of d.items || []) {
          if (!it.esp) continue;
          const e = { num: sigEc(L, it.noLib === true, +((await this.leer("config")) || {}).ecInicio || 0) };
          if (it.noLib === true) e.noLib = true;
          for (const k of ["esp", "o2", "hr", "temp", "lel", "co", "h2s", "lib", "pers", "obs"]) e[k] = String(it[k] ?? "");
          for (const k of ["edif", "elev", "equipo", "cuarto", "ilum", "ruido", "otros", "epp", "tLig", "tMod", "tPes", "tDesc"]) if (it[k]) e[k] = String(it[k]);
          if (!e.pers) e.pers = capt;
          Object.assign(e, { fecha: d.fecha, turno: d.turno, capt, reg: ahora() });
          if (capt !== s.ini) e.regPor = s.ini;
          L.push(e); nums.push(e.num);
          catCambio = this.agregarCatalogo(cat, "espacios", it.esp) || catCambio;
        }
        if (!nums.length) throw new Error("No hay espacios confinados para registrar.");
        await this.escribir("ec", L); if (catCambio) await this.escribir("catalogos", cat);
        return { ok: true, nums };
      }
      case "ec.actualizar": case "vig.actualizar": {
        soloSup();
        const n = col, L = await this.leer(n) || [], x = L.find(y => +y.num === +d.num);
        if (!x) throw new Error("Registro no encontrado.");
        const campos = n === "ec" ? ["esp", "o2", "hr", "temp", "lel", "co", "h2s", "lib", "pers", "obs", "fecha", "turno", "edif", "elev", "equipo", "cuarto", "ilum", "ruido", "otros", "epp", "tLig", "tMod", "tPes", "tDesc"] : ["desc", "inicio", "inop", "ubic", "comp", "retiro", "obs", "fecha", "turno"];
        for (const k of campos) if (k in d) x[k] = d[k];
        if (n === "ec" && "pre" in d) x.pre = String(d.pre || "").toUpperCase();
        if (n === "ec" && d.numNuevo && String(d.numNuevo) !== String(x.num)) {
          const nn = +d.numNuevo;
          if (!Number.isInteger(nn) || nn < 1 || nn > 999999) throw new Error("El # de espacio confinado debe ser un número entero mayor que cero.");
          const otro = L.find(y => y !== x && +y.num === nn);
          if (otro) throw new Error("El # " + nn + " ya lo tiene otro espacio (" + otro.esp + "). Cambia primero ese registro o elige otro número.");
          if (!("numAnt" in x)) x.numAnt = x.num;
          x.num = nn;
        }
        if (n === "vig") x.est = x.retiro ? "RETIRADA" : "ACTIVA"; else x.mod = ahora() + " " + s.ini;
        await this.escribir(n, L); return { ok: true };
      }
      case "ec.borrar": case "vig.borrar": { soloSup(); const L = (await this.leer(col) || []).filter(x => +x.num !== +d.num); await this.escribir(col, L); return { ok: true }; }
      case "vig.crear": {
        const L = await this.leer("vig") || [], cat = await this.leer("catalogos") || {}, nums = [];
        const capt = sup && d.capt ? U.ini(d.capt) : s.ini;
        if (capt !== s.ini && !(await this.leer("personal") || []).some(p => U.ini(p.ini) === capt)) throw new Error("Iniciales no encontradas en el personal: " + capt);
        const vistosV = [];
        for (const it of d.items || []) {
          if (!it.desc) continue;
          const kv = U.norm(it.desc) + "|" + U.norm(it.inop || ""), ya = L.find(x => !x.retiro && U.norm(x.desc) + "|" + U.norm(x.inop || "") === kv);
          if (ya) throw new Error(`Esa vigilancia ya está ACTIVA (VIG #${ya.num}, alta de ${ya.capAlta}). No se guardó nada para evitar duplicados.`);
          if (vistosV.includes(kv)) throw new Error(`La vigilancia "${it.desc}" está repetida en la captura.`);
          vistosV.push(kv);
        }
        let catCambio = false;
        for (const it of d.items || []) {
          if (!it.desc) continue;
          const v = { num: sig(L, "num") };
          for (const k of ["desc", "inicio", "inop", "ubic", "comp", "obs"]) v[k] = String(it[k] ?? "");
          Object.assign(v, { retiro: "", est: "ACTIVA", capAlta: capt, capRet: "", fecha: d.fecha, turno: d.turno, reg: ahora() });
          if (capt !== s.ini) v.regPor = s.ini;
          L.push(v); nums.push(v.num);
          catCambio = this.agregarCatalogo(cat, "vigilancias", it.desc, { desc: it.desc, inop: it.inop || "", ubic: it.ubic || "", comp: it.comp || "" }) || catCambio;
        }
        if (!nums.length) throw new Error("No hay vigilancias para registrar.");
        await this.escribir("vig", L); if (catCambio) await this.escribir("catalogos", cat);
        return { ok: true, nums };
      }
      case "vig.retirar": {
        const L = await this.leer("vig") || [], v = L.find(x => +x.num === +d.num);
        if (!v) throw new Error("Vigilancia no encontrada.");
        if (!d.retiro) throw new Error("Captura la fecha y hora de retiro.");
        const capRet = sup && d.capt ? U.ini(d.capt) : s.ini;
        Object.assign(v, { retiro: d.retiro, est: "RETIRADA", capRet, mod: ahora() });
        if (capRet !== s.ini) v.regRet = s.ini;
        await this.escribir("vig", L); return { ok: true };
      }
      case "hojas.guardar": {
        soloSup();
        if (!d.hoja || !d.fecha || !["T1", "T2"].includes(d.turno)) throw new Error("Datos no válidos.");
        const L = (await this.leer("hojas") || []).filter(x => !(x.fecha === d.fecha && x.turno === d.turno));
        L.push({ ...d.hoja, fecha: d.fecha, turno: d.turno, mod: ahora() + " " + s.ini });
        await this.escribir("hojas", L); return { ok: true };
      }
      case "ec.monitoreo": case "ec.monEditar": {
        const L = await this.leer("ec") || [], e = L.find(x => +x.num === +d.num);
        if (!e) throw new Error("Registro no encontrado.");
        const mon = Array.isArray(e.mon) ? e.mon : [], esFH = x => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(x || ""));
        const mal = fh => !esFH(fh) ? "Fecha u hora del monitoreo no válida."
          : e.cierre && fh > e.cierre ? "El espacio se cerró el " + e.cierre.replace("T", " ") + ": no admite monitoreos posteriores."
          : B.dom.ecLibFH(e) && fh < B.dom.ecLibFH(e) ? "El monitoreo (" + fh.replace("T", " ") + ") no puede ser anterior a la liberación del espacio (" + B.dom.ecLibFH(e).replace("T", " ") + ")."
          : fh > U.isoFH(new Date(Date.now() + 15 * 60000)) ? "La fecha y hora del monitoreo (" + fh.replace("T", " ") + ") no puede ser futura." : null;
        const CAM = ["o2", "hr", "temp", "lel", "co", "h2s", "obs"];
        if (acc === "monitoreo") {
          let n = 0, id = mon.reduce((m, x) => Math.max(m, +x.id || 0), 0); const repetidos = [], nuevos = [];
          for (const it of d.items || []) {
            const fh = String(it.fh || ""), m = mal(fh); if (m) throw new Error(m);
            const el = String(it.elev ?? "").trim();
            if (mon.some(x => x.fh === fh && (x.elev || "") === el)) { repetidos.push(fh); continue; }
            const r = { id: ++id, fh, ...(el ? { elev: el } : {}) }; for (const k of CAM) r[k] = String(it[k] ?? "").trim();
            r.pers = U.ini(it.pers) || s.ini; r.capt = s.ini; r.reg = ahora(); mon.push(r); nuevos.push(r); n++;
          }
          if (!n && !repetidos.length) throw new Error("Captura al menos un monitoreo.");
          let liberado = 0, aviso = "";
          if (n) {
            e.mon = mon.sort((a, b) => a.fh.localeCompare(b.fh));
            if (e.noLib) {       // la primera prueba nueva con todos sus parametros satisfactorios libera el espacio
              const req = (d.req && d.req.length ? d.req : ["o2", "lel"]), cfg = (await this.leer("config")) || {};
              const fuera = (k, v) => { const x = U.num(v); if (x == null) return false; return k === "o2" ? x < +cfg.o2Min || x > +cfg.o2Max : k === "lel" ? x > +cfg.lelMax : k === "co" ? x > +cfg.coMax : k === "h2s" ? x > +cfg.h2sMax : false; };
              const buena = nuevos.sort((a, b) => a.fh.localeCompare(b.fh)).find(m => req.every(k => String(m[k] ?? "").trim() !== "") && !["o2", "lel", "co", "h2s"].some(k => fuera(k, m[k])));
              if (buena) {
                e.mon = e.mon.filter(x => x !== buena);
                const mal = liberarNuc(L, e, buena.fh, buena, buena.pers, true, +cfg.ecInicio || 0);
                if (mal) { e.mon.push(buena); e.mon.sort((a, b) => a.fh.localeCompare(b.fh)); aviso = mal; } else liberado = e.num;
              }
            }
            await this.escribir("ec", L);
          }
          return { ok: true, n, repetidos, liberado, aviso };
        }
        const m = mon.find(x => +x.id === +d.id && (!d.fhOrig || x.fh === d.fhOrig)) || (d.fhOrig ? mon.find(x => x.fh === d.fhOrig) : null);
        if (!m) throw new Error("Ese monitoreo ya no existe. Actualiza la página.");
        if (!sup && U.ini(m.capt) !== s.ini && !String(m.pers || "").toUpperCase().split(/[\/,; ]+/).includes(s.ini)) throw new Error("Solo quien capturó el monitoreo o un supervisor puede modificarlo.");
        if (d.borrar === true) mon.splice(mon.indexOf(m), 1);
        else {
          const fh = String(d.fh || ""), x = mal(fh); if (x) throw new Error(x);
          const el = "elev" in d ? String(d.elev ?? "").trim() : (m.elev || "");
          if (mon.some(y => y !== m && y.fh === fh && (y.elev || "") === el)) throw new Error("Ya hay otro monitoreo con esa misma fecha y hora.");
          m.fh = fh; m.elev = el; for (const k of CAM) if (k in d) m[k] = String(d[k] ?? "").trim();
          if (U.ini(d.pers)) m.pers = U.ini(d.pers); m.mod = ahora() + " " + s.ini;
        }
        e.mon = mon.sort((a, b) => a.fh.localeCompare(b.fh)); await this.escribir("ec", L); return { ok: true };
      }
      case "ec.cerrar": {
        if (!sup) throw new Error("Solo un supervisor puede cerrar un espacio confinado.");
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(d.cierre || ""))) throw new Error("Fecha u hora de cierre no válida.");
        const L = await this.leer("ec") || []; let n = 0;
        for (const o of d.nums || []) {
          const e = L.find(x => +x.num === +o); if (!e) continue;
          if (String(e.lib || "").length >= 16 && d.cierre < e.lib) throw new Error("El cierre del EC #" + o + " no puede ser anterior a su liberación (" + e.lib.replace("T", " ") + ").");
          const um = (e.mon || []).map(x => x.fh).sort().pop();
          if (um && d.cierre < um) throw new Error("El EC #" + o + " tiene un monitoreo posterior a esa hora (" + um.replace("T", " ") + ").");
          e.cierre = d.cierre; e.cerro = s.ini; e.mod = ahora() + " " + s.ini; n++;
        }
        if (!n) throw new Error("Elige al menos un espacio.");
        await this.escribir("ec", L); return { ok: true, n };
      }
      case "ec.reabrir": {
        if (!sup) throw new Error("Solo un supervisor puede reabrir un espacio confinado.");
        const L = await this.leer("ec") || [], e = L.find(x => +x.num === +d.num);
        if (!e) throw new Error("Registro no encontrado.");
        e.cierre = ""; e.cerro = ""; e.mod = ahora() + " " + s.ini;
        await this.escribir("ec", L); return { ok: true };
      }
      case "ec.sumarme": {
        const L = await this.leer("ec") || [], e = L.find(x => +x.num === +d.num);
        if (!e) throw new Error("Registro no encontrado.");
        const pers = String(e.pers || "").toUpperCase().split(/[\/,; ]+/).filter(Boolean);
        if (!pers.includes(s.ini)) { pers.push(s.ini); e.pers = pers.join("/"); e.mod = ahora() + " " + s.ini; await this.escribir("ec", L); }
        return { ok: true };
      }
      case "turnos.guardar": {
        soloSup();
        const L = await this.leer("turnos") || [];
        let t = L.find(x => x.fecha === d.fecha && x.turno === d.turno);
        if (!t) { t = {}; L.push(t); }
        for (const k of ["fecha", "turno", "dif", "notas", "elab", "rev", "pres", "pdf"]) if (k in d) t[k] = d[k];
        t.mod = ahora() + " " + s.ini;
        await this.escribir("turnos", L);
        if (d.dif) { const cat = await this.leer("catalogos") || {}; if (this.agregarCatalogo(cat, "difusion", d.dif)) await this.escribir("catalogos", cat); }
        return { ok: true };
      }
      case "personal.reemplazar": case "cambios.reemplazar": {
        soloSup();
        await this.escribir(col, d.lista || []);
        if (col === "personal") { const db = await this.cargar(); if (await this.asegurarUsuarios(db)) await this.escribir("usuarios", db.usuarios); }
        return { ok: true };
      }
      case "catalogos.reemplazar": soloSup(); await this.escribir("catalogos", d.catalogos || {}); return { ok: true };
      case "catalogos.agregar": { const cat = await this.leer("catalogos") || {}; if (this.agregarCatalogo(cat, d.tipo, d.texto, d.item)) await this.escribir("catalogos", cat); return { ok: true }; }
      case "config.guardar": { soloSup(); const ant = (await this.leer("config")) || {}, c = d.config || {}; for (const k of ["recibidos", "cargas"]) if (k in ant) c[k] = ant[k]; await this.escribir("config", c); return { ok: true }; }
      case "intercambio.registrar": {
        const c = (await this.leer("config")) || {}; let l = (c.recibidos || []).map(String);
        for (const u of d.uids || []) { const x = String(u); if (x && x.length <= 40 && !l.includes(x)) l.push(x); }
        if (l.length > 5000) l = l.slice(-5000);
        c.recibidos = l; await this.escribir("config", c); return { ok: true, n: l.length };
      }
      case "imagenes.guardar": {
        soloSup();
        if (!["membrete", "pie", "ofIzq", "ofDer", "ofPie"].includes(d.tipo)) throw new Error("Tipo de imagen no válido.");
        const dato = String(d.dato || "");
        if (dato && (!dato.startsWith("data:image/") || dato.length > 6000000)) throw new Error("La imagen no es válida o es demasiado grande (máx. 4 MB).");
        const im = (await this.leer("imagenes")) || {};
        im[d.tipo] = dato; im.ver = String(Date.now()); im.mod = ahora() + " " + s.ini;
        await this.escribir("imagenes", im); return { ok: true };
      }
      case "perfil.guardar": {
        const rpe = sup && d.rpe ? U.ini(d.rpe) : s.rpe;
        const L = await this.leer("usuarios") || [];
        const u = L.find(x => U.ini(x.rpe) === rpe);
        if (!u) throw new Error("Usuario no encontrado.");
        for (const k of ["ofCat", "ofTit", "ofDepto"]) if (k in d) u[k] = String(d[k] || "").trim();
        await this.escribir("usuarios", L); return { ok: true };
      }
      case "usuarios.tourVisto": {
        const us = await this.leer("usuarios") || [], u = us.find(x => U.ini(x.rpe) === s.rpe);
        if (u) { const v = (u.tours || "").split(",").filter(Boolean); if (!v.includes(d.tour)) v.push(d.tour); u.tours = v.join(","); await this.escribir("usuarios", us); }
        return { ok: true };
      }
      case "usuarios.restablecer": {
        soloSup();
        const us = await this.leer("usuarios") || [], per = await this.leer("personal") || [];
        const u = us.find(x => U.ini(x.rpe) === U.ini(d.rpe)), p = per.find(x => U.ini(x.rpe) === U.ini(d.rpe));
        if (!u || !p) throw new Error("Usuario no encontrado.");
        u.salt = this.aleatorio(12); u.hash = await this.hash(u.salt, this.claveInicial(p)); u.cambiada = false;
        await this.escribir("usuarios", us);
        return { ok: true, clave: this.claveInicial(p) };
      }
    }
    throw new Error("Operación no válida: " + key);
  }
};
;
/* ---- ui.js ---- */
/* =========================================================================
   BITACORA 24RU1 - Componentes de interfaz
   ========================================================================= */
"use strict";
const ICO = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
  escudo: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/>',
  fuego: '<path d="M12 3s5 4.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 1.5-4S9 11 11 11c0-3 1-8 1-8z"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alerta: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.01"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.7 3.5 6"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  grafica: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  engrane: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  salir: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  ok: '<path d="m5 12 5 5 9-10"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  imprimir: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  descargar: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  subir: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
  pdf: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-3zM9 16v2"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  llave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  historial: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/>',
  reutilizar: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  red: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M10 6.5h4a2.5 2.5 0 0 1 2.5 2.5V14M14 17.5h-4A2.5 2.5 0 0 1 7.5 15v-5"/>'
};
B.ico = (n, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra || ""}>${ICO[n] || ""}</svg>`;

// texto secundario de una opcion (las opciones de texto simple no tienen; ojo: "x".sub es una funcion de String)
const subDe = it => (it && typeof it === "object" && typeof it.sub === "string") ? it.sub : "";
B.ui = {
  $(sel, raiz) { return (raiz || document).querySelector(sel); },
  $$(sel, raiz) { return [...(raiz || document).querySelectorAll(sel)]; },

  toast(msg, tipo, ms) {
    let c = document.querySelector(".toasts");
    if (!c) { c = document.createElement("div"); c.className = "toasts"; document.body.appendChild(c); }
    const t = document.createElement("div");
    t.className = "toast " + (tipo || "");
    t.innerHTML = B.ico(tipo === "error" ? "alerta" : tipo === "ok" ? "ok" : "info") + "<div>" + msg + "</div>";
    c.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 320); }, ms || (tipo === "error" ? 6000 : 3800));
  },
  error(e) { B.ui.toast(U.esc(e && e.message ? e.message : e), "error"); },

  /* Campos de hora (.h24): siempre en formato de 24 horas, sin AM / PM. Se escriben como 0730 o 19:30 y se acomodan solos. */
  iniciarHoras() {
    if (this._h24) return; this._h24 = true;
    document.addEventListener("input", e => {
      const i = e.target; if (!i.classList || !i.classList.contains("h24")) return;
      if (/^\d{4}$/.test(i.value)) { const v = U.hora24(i.value, i.dataset.h24 === "24"); if (v) i.value = v; }
    }, true);
    // en captura: el valor ya queda normalizado antes de que lo lea el formulario
    document.addEventListener("change", e => {
      const i = e.target; if (!i.classList || !i.classList.contains("h24") || !i.value.trim()) return;
      const v = U.hora24(i.value, i.dataset.h24 === "24");
      if (v) i.value = v;
      else { i.value = ""; B.ui.toast("Hora no válida. Escríbela en formato de 24 horas, por ejemplo <b>07:30</b> o <b>19:30</b>.", "error"); }
    }, true);
  },
  modal({ titulo, html, botones, ancho, alAbrir, icono }) {
    return new Promise(res => {
      const v = document.createElement("div");
      v.className = "velo";
      v.innerHTML = `<div class="modal ${ancho ? "ancho" : ""}" role="dialog" aria-modal="true">
        <div class="modal-cab">${icono ? `<div class="ico-tarjeta g">${B.ico(icono)}</div>` : ""}<h2>${titulo || ""}</h2>
        <button class="btn fantasma btn-icono" data-x style="margin-left:auto" title="Cerrar">${B.ico("cerrar")}</button></div>
        <div class="modal-cuerpo">${html || ""}</div>
        <div class="modal-pie">${(botones || [{ t: "Aceptar", v: true }]).map((b, i) => `<button class="btn ${b.c || ""}" data-i="${i}">${b.t}</button>`).join("")}</div></div>`;
      document.body.appendChild(v);
      const cerrar = val => { v.remove(); document.removeEventListener("keydown", tecla); res(val); };
      const tecla = e => { if (e.key === "Escape") cerrar(null); };
      document.addEventListener("keydown", tecla);
      v.querySelector("[data-x]").onclick = () => cerrar(null);
      v.addEventListener("mousedown", e => { if (e.target === v) cerrar(null); });
      (botones || [{ t: "Aceptar", v: true }]).forEach((b, i) => {
        v.querySelector(`[data-i="${i}"]`).onclick = async () => {
          if (b.antes) { const ok = await b.antes(v); if (ok === false) return; }
          cerrar(typeof b.v === "function" ? b.v(v) : b.v);
        };
      });
      if (alAbrir) alAbrir(v);
      const f = v.querySelector("input,textarea,select"); if (f) setTimeout(() => f.focus(), 50);
    });
  },
  confirmar(msg, titulo, tSi, peligro) {
    return B.ui.modal({ titulo: titulo || "Confirmar", html: `<p style="line-height:1.55;margin:0">${msg}</p>`, icono: peligro ? "alerta" : "info",
      botones: [{ t: "Cancelar", c: "sec", v: false }, { t: tSi || "Aceptar", c: peligro ? "peligro" : "", v: true }] });
  },

  /* Combobox con busqueda (sin acentos, varias palabras) */
  combo(input, { items, estricto = true, nuevo = false, alElegir, max = 60, texto }) {
    const cont = document.createElement("div");
    cont.className = "combo";
    input.parentNode.insertBefore(cont, input);
    cont.appendChild(input);
    input.setAttribute("autocomplete", "off");
    let lista = null, sel = 0, vis = [], todo = false;
    const etiqueta = it => (typeof it === "string" ? it : it.label);
    const valor = it => (typeof it === "string" ? it : it.value);
    const resaltar = (txt, tks) => {
      let s = U.esc(txt);
      for (const tk of tks) {
        if (!tk) continue;
        const n = U.norm(txt); const i = n.indexOf(tk);
        if (i >= 0) { const orig = txt.substr(i, tk.length); s = s.replace(U.esc(orig), "<mark>" + U.esc(orig) + "</mark>"); }
      }
      return s;
    };
    const cerrar = () => { if (lista) { lista.remove(); lista = null; } };
    const filtrar = () => {
      // al entrar al campo se muestra la lista completa (aunque ya tenga un valor); al escribir, se filtra
      const tks = todo ? [] : U.norm(input.value).split(" ").filter(Boolean);
      const todos = (typeof items === "function" ? items() : items) || [];
      vis = todos.filter(it => { const n = U.norm(etiqueta(it) + " " + subDe(it)); return tks.every(t => n.includes(t)); }).slice(0, max);
      return tks;
    };
    const pintar = () => {
      const tks = filtrar();
      if (!lista) { lista = document.createElement("div"); lista.className = "combo-lista"; cont.appendChild(lista); }
      sel = Math.min(sel, Math.max(vis.length - 1, 0));
      let h = vis.map((it, i) => `<div class="combo-op ${i === sel ? "sel" : ""}" data-i="${i}">${resaltar(etiqueta(it), tks)}${subDe(it) ? `<small>${U.esc(subDe(it))}</small>` : ""}</div>`).join("");
      const exacto = vis.some(it => U.norm(etiqueta(it)) === U.norm(input.value));
      if (nuevo && input.value.trim() && !exacto) h += `<div class="combo-op nuevo" data-i="nuevo">+ Usar "${U.esc(input.value.trim())}" (nuevo)</div>`;
      if (!h) h = `<div class="combo-vacio">Sin coincidencias</div>`;
      lista.innerHTML = h;
      lista.querySelectorAll(".combo-op").forEach(o => o.onmousedown = e => { e.preventDefault(); elegir(o.dataset.i); });
    };
    const elegir = i => {
      if (i === "nuevo") { input.classList.remove("invalido"); cerrar(); alElegir && alElegir(input.value.trim(), null); return; }
      const it = vis[+i]; if (!it) return;
      input.value = texto ? texto(it) : etiqueta(it);
      input.dataset.valor = valor(it);
      input.classList.remove("invalido");
      cerrar(); alElegir && alElegir(valor(it), it);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    input.addEventListener("focus", () => { sel = 0; todo = !!input.value; pintar(); if (input.value) setTimeout(() => { try { input.select(); } catch (e) { } }, 0); });
    input.addEventListener("input", () => { sel = 0; todo = false; delete input.dataset.valor; pintar(); });
    input.addEventListener("keydown", e => {
      if (!lista && (e.key === "ArrowDown")) { pintar(); return; }
      if (!lista) return;
      if (e.key === "ArrowDown") { sel = Math.min(sel + 1, vis.length - 1); pintar(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); pintar(); e.preventDefault(); }
      else if (e.key === "Enter") { if (vis.length) { elegir(sel); e.preventDefault(); } else if (nuevo && input.value.trim()) { elegir("nuevo"); e.preventDefault(); } }
      else if (e.key === "Escape") cerrar();
    });
    input.addEventListener("blur", () => setTimeout(() => {
      cerrar();
      const v = input.value.trim();
      if (!v) { delete input.dataset.valor; input.classList.remove("invalido"); return; }
      if (input.dataset.valor) return;
      if (todo) return;                    // solo entro y salio sin escribir: no cambia nada
      filtrar();
      const exact = vis.find(it => U.norm(etiqueta(it)) === U.norm(v) || U.norm(valor(it)) === U.norm(v));
      if (exact) { input.value = texto ? texto(exact) : etiqueta(exact); input.dataset.valor = valor(exact); alElegir && alElegir(valor(exact), exact); return; }
      if (vis.length === 1 && estricto) { elegir(0); return; }
      if (estricto) input.classList.add("invalido");
      else alElegir && alElegir(v, null);
    }, 120));
    return { cerrar, elegir };
  },

  /* Items de personas para combos */
  personas(filtro, todos) {
    // todos = true: consulta del supervisor (incluye personal dado de baja)
    const base = todos ? B.estado.personal : B.dom.activos();
    return B.dom.ordenados(base.filter(filtro || (() => true)).map(p => p.ini)).map(i => {
      const p = B.dom.persona(i), baja = U.norm(p.activo) === "NO";
      return { value: i, label: i + " - " + p.nombre + (baja ? " (baja)" : ""), sub: B.dom.catCorta(p.cat) + " · RPE " + p.rpe + " · " + (baja ? "inactivo" : (B.dom.turnoEfectivo(i, B.app.trabajo.f) || "")) };
    });
  },
  seg(nombre, opciones, valor, clase) {
    return `<div class="seg ${clase || ""}" data-seg="${nombre}">${opciones.map(o => `<button type="button" data-v="${U.esc(o)}" class="${o === valor ? "on" : ""}">${U.esc(o)}</button>`).join("")}</div>`;
  },
  segValor(el) { const b = el.querySelector("button.on"); return b ? b.dataset.v : ""; },
  activarSeg(raiz, cb) {
    raiz.querySelectorAll(".seg").forEach(s => s.querySelectorAll("button").forEach(b => b.onclick = () => {
      s.querySelectorAll("button").forEach(x => x.classList.remove("on")); b.classList.add("on"); cb && cb(s, b.dataset.v);
    }));
  },
  vacio(msg, ico) { return `<div class="vacio">${B.ico(ico || "info")}${msg}</div>`; },
  estatusBadge(est) {
    const c = { "Realizada": "v", "En proceso": "d", "Pendiente": "r", "Concluida": "a", "ACTIVA": "r", "RETIRADA": "n", "Liberado": "v" }[est] || "n";
    return `<span class="badge ${c}">${U.esc(est)}</span>`;
  }
};
;
/* ---- reportes.js ---- */
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
  .ecmon .tit2 { display: none; text-align: center; font-weight: bold; font-size: 11pt; margin: 2px 0 6px; }
  .ecmon.aparte { page-break-before: always; break-before: page; }
  .ecmon.aparte .tit2 { display: block; }
  table.bit { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.bit th { background: #D9D9D9; border: 1px solid #000; font-size: 7pt; padding: 3px 2px; }
  table.bit td { border: 1px solid #000; font-size: 8pt; padding: 1px 3px; text-align: center; height: 0.27in; }
  table.bit thead { display: table-header-group; } table.bit tr { page-break-inside: avoid; }
  table.bitcab { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.bitcab td { border: 1px solid #000; font-size: 8pt; padding: 3px 5px; }
  table.bitcab td.e { background: #F2F2F2; font-weight: bold; font-size: 7pt; width: 13%; }
  .bitEC { page-break-after: always; break-after: page; } .bitEC:last-child { page-break-after: auto; break-after: auto; }
  `;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${U.esc(titulo)}</title><style>${css}</style></head>
  <body><div class="membrete"><img src="${B.imgUrl("membrete")}"></div><div class="pie"><img src="${B.imgUrl("pie")}"></div>
  <table class="pagina"><thead><tr><td></td></tr></thead><tfoot><tr><td></td></tr></tfoot><tbody><tr><td><div class="contenido">${cuerpo}</div></td></tr></tbody></table>
  <script>
  // Si el contenido rebasa ligeramente una hoja, se reduce para que quepa en una sola
  function ajustar() {
    var c = document.querySelector(".p1") || document.querySelector(".contenido"), disp = ${disp.toFixed(1)};
    c.style.zoom = "";
    // renglones opcionales (4o y 5o de "ultimos espacios confinados"): se quitan si el reporte no cabe en una hoja
    var op = c.querySelectorAll("tr.opc"), i;
    var lim = disp * 0.97;      // pequeno margen: evita que el ultimo cuadro (firmas) brinque solo a otra hoja
    function medir() {
      for (i = 0; i < op.length; i++) op[i].style.display = "";
      for (i = 0; i < op.length && c.scrollHeight > lim; i++) op[i].style.display = "none";
      return c.scrollHeight;
    }
    var h = medir();
    // monitoreo de los espacios que siguen liberados: si ya son muchos y el reporte no cabe en la hoja, pasa completo a una segunda hoja
    var m = c.querySelector(".ecmon");
    if (m && h > disp * 1.12) { m.classList.add("aparte"); c.parentNode.appendChild(m); h = medir(); }
    if (h > lim && h <= disp * 1.25) c.style.zoom = (disp / h * 0.95).toFixed(3);
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
  <div class="resumen">RESUMEN: &nbsp;Esp. confinados liberados: ${d.ec.length} (acumulado: ${d.acum})${d.ecMon.length ? ` &nbsp;|&nbsp; Siguen liberados: ${d.ecMon.length}${d.ecMon.some(x => !x.ok) ? " (sin monitoreo en el turno: " + d.ecMon.filter(x => !x.ok).length + ")" : ""}` : ""} &nbsp;|&nbsp; Vigilancias C.I.: ${d.vig.length}
   &nbsp;|&nbsp; Realizadas: ${d.nReal} &nbsp;|&nbsp; En proceso: ${d.nProc} &nbsp;|&nbsp; Pendientes: ${d.nPend} &nbsp;|&nbsp; Personal: ${d.nPers}</div>`;
  let algo = false, hMon = "";
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
  if (d.ecMon.length) {
    // espacios de turnos anteriores que siguen liberados: valores de su ULTIMO monitoreo; se resalta el que no tuvo monitoreo en el turno
    algo = true;
    h += `<div class="ecmon"><div class="tit2">ESPACIOS CONFINADOS QUE SIGUEN LIBERADOS · ÚLTIMO MONITOREO &nbsp; <span class="rojo">${t} ${U.corta(f)}</span></div>
      <table class="sec">${d.ecMon.length > 10 ? pct([5, 20.1, 6.6, 6.6, 6.6, 6.6, 6.6, 6.6, 13, 22.3]) : pct([14.4, 4.3, 17.2, 5.6, 5.6, 5.6, 5.6, 5.6, 5.6, 11.1, 19.4])}
      ${d.ecMon.length > 10 ? `<tr><th colspan="10" style="font-size:8pt">ESPACIOS CONFINADOS QUE SIGUEN LIBERADOS (ÚLTIMO MONITOREO)</th></tr><tr>`   /* tabla larga: sin la celda lateral, para que pueda continuar en otra hoja */
        : `<tr><td class="lbl" rowspan="${d.ecMon.length + 1}">ESPACIOS<br>CONFINADOS<br>QUE SIGUEN<br>LIBERADOS<br><span style="font-weight:normal;font-size:7pt">(último monitoreo)</span></td>`}
      <th>#</th><th>ESPACIO CONFINADO</th><th>O2<br>(%)</th><th>HR<br>(%)</th><th>TEMP<br>(°C)</th><th>LEL<br>(%)</th><th>CO<br>(ppm)</th><th>H2S<br>(ppm)</th>
      <th>ÚLTIMO MONITOREO</th><th>PERSONAL TSI / OBSERVACIONES</th></tr>` +
      d.ecMon.map(({ e, u, ok, elev }) => `<tr class="${ok ? "" : "falta"}"><td class="c b">${U.esc(B.dom.ecNum(e))}</td><td class="c">${U.esc(e.esp)}${elev ? `<div class="b">ELEV. ${U.esc(elev)}</div>` : ""}${ok ? "" : `<div class="faltan">SIN MONITOREO EN EL TURNO</div>`}</td>` +
        ["o2", "hr", "temp", "lel", "co", "h2s"].map(k => `<td class="c ${B.dom.rango(k, u[k]) ? "fuera" : ""}">${U.esc(u[k])}</td>`).join("") +
        `<td class="c">${U.fh(u.fh)}${u.lib ? `<div class="com obs">liberación</div>` : ""}</td><td class="c">${U.esc(u.pers)}${u.obs && !u.lib ? `<div class="com obs">${U.esc(u.obs)}</div>` : ""}</td></tr>`).join("") + `</table></div>`;
  }
  if (d.acts.length) {
    algo = true;
    h += `<table class="sec">${pct([14.4, 10.8, 63.8, 11])}
      <tr><td class="lbl" rowspan="${d.acts.length + 1}">ACTIVIDADES<br>DEL TURNO</td><th>INICIALES</th><th>ACTIVIDAD</th><th>ESTATUS</th></tr>` +
      (() => {      // las actividades del mismo equipo o persona van juntas, con UN solo cuadro de iniciales
        const gr = new Map(); for (const x of d.acts) { if (!gr.has(x.inis)) gr.set(x.inis, []); gr.get(x.inis).push(x); }
        return [...gr.values()].flatMap(l => l.map((x, i) => ({ ...x, n: i ? 0 : l.length })));
      })().map(x => `<tr>${x.n ? `<td class="c b" style="font-size:7.5pt" rowspan="${x.n}">${x.inis ? U.esc(x.inis).replace(/\//g, "/<wbr>") : "SIN<br>ASIGNAR"}</td>` : ""}
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
  // primera hoja: el reporte de siempre; segunda hoja: monitoreo de los espacios que siguen liberados
  return { html: B.rep.documento("Bitácora " + t + " " + U.corta(f), `<div class="p1">${h}</div>${hMon}`), nombre: `BITACORA ${c.proyecto} ${t} ${U.corta(f).replace(/\//g, ".")}`, carpeta: "", tipo: "turno", f, t, algo };
};

/* ---------------------------------------------------------------- bitacora de monitoreo por espacio confinado (para llenar a mano) */
B.rep.ecBitacora = function (lista, vacia) {
  const c = B.estado.config, D = B.dom, k = v => U.esc(v ?? "");
  const una = e => {
    const of = B.ecLista.buscar(e.esp), mons = vacia ? D.ecMons(e).filter(m => m.lib) : D.ecMons(e), blancos = Math.max(6, 23 - mons.length), pe = D.ecPorElev(e);
    return `<div class="bitEC"><div class="titulo">BITÁCORA DE MONITOREO DE ESPACIO CONFINADO</div>
      <table class="bitcab"><tr><td class="e">EC #</td><td style="width:12%;font-size:12pt" class="b c">${k(D.ecNum(e))}</td><td class="e">ESPACIO CONFINADO</td><td class="b" style="font-size:10pt">${k(e.esp)}</td></tr>
        <tr><td class="e">EDIFICIO</td><td colspan="1">${k(e.edif || (of && of.edif))}</td><td class="e">NIVEL / ELEVACIÓN</td><td>${k(e.elev || (of && of.nivel))}${e.equipo ? " &nbsp;·&nbsp; Equipo: " + k(e.equipo) : ""}</td></tr>
        <tr><td class="e">${e.noLib ? "NO LIBERADO · 1ª PRUEBA" : "LIBERADO"}</td><td>${e.lib ? U.fh(e.lib) : U.corta(e.fecha) + " " + k(e.turno)}</td><td class="e">MUESTREO REQUERIDO</td><td>${k(of ? of.reqTxt : "Oxígeno, Combustibilidad, Temperatura, humedad, CO, H2S")}</td></tr>
        <tr><td class="e">LIBERÓ</td><td>${k(e.pers || e.capt)}</td><td class="e">RANGOS DE REFERENCIA</td><td>O2 ${k(c.o2Min)}–${k(c.o2Max)} % &nbsp;·&nbsp; LEL ≤ ${k(c.lelMax)} % &nbsp;·&nbsp; CO ≤ ${k(c.coMax)} ppm &nbsp;·&nbsp; H2S ≤ ${k(c.h2sMax)} ppm</td></tr></table>
      <table class="bit"><colgroup><col style="width:11%"><col style="width:8%">${pe ? '<col style="width:9%">' : ""}<col style="width:7%"><col style="width:7%"><col style="width:7%"><col style="width:7%"><col style="width:7%"><col style="width:7%"><col style="width:11%"><col></colgroup>
        <thead><tr><th>FECHA</th><th>HORA<br>(24 h)</th>${pe ? "<th>ELEVACIÓN</th>" : ""}<th>O2<br>(%)</th><th>HR<br>(%)</th><th>TEMP<br>(°C)</th><th>LEL<br>(%)</th><th>CO<br>(ppm)</th><th>H2S<br>(ppm)</th><th>INICIALES</th><th>OBSERVACIONES</th></tr></thead><tbody>` +
      mons.map(m => `<tr><td>${U.corta(m.fh)}</td><td>${U.hora(m.fh)}</td>${pe ? `<td class="b">${k(m.elev)}</td>` : ""}` + ["o2", "hr", "temp", "lel", "co", "h2s"].map(x => `<td class="${D.rango(x, m[x]) ? "fuera" : ""}">${k(m[x])}</td>`).join("") +
        `<td>${k(m.pers)}</td><td class="izq" style="font-size:7pt">${m.lib ? (e.noLib ? "NO LIBERADO" : "LIBERACIÓN") + (m.obs ? " · " + k(m.obs) : "") : (m.nl ? "NO LIBERADO" + (m.obs ? " · " : "") : "") + k(m.obs)}</td></tr>`).join("") +
      Array.from({ length: blancos }, () => `<tr>${"<td></td>".repeat(pe ? 11 : 10)}</tr>`).join("") + `</tbody></table>
      <div class="nota">${pe ? "POZO SECO: es un solo espacio confinado; anota la ELEVACIÓN de cada monitoreo (un registro por elevación). " : ""}Monitorear al menos UNA VEZ POR TURNO mientras el espacio siga liberado (lo ideal: cada 8 horas). Anota fecha, hora en formato de 24 h, lecturas e iniciales, y transcríbelo a la bitácora electrónica al terminar el turno.
        Si una lectura queda fuera de rango, suspende el ingreso y avisa al supervisor de Seguridad Industrial.${e.cierre ? " &nbsp; ESPACIO CERRADO: " + U.fh(e.cierre) + " (" + k(e.cerro) + ")." : ""}</div></div>`;
  };
  const uno = lista.length === 1 ? lista[0] : null;
  return { html: B.rep.documento("Bitácora de monitoreo EC", lista.map(una).join("")),
    nombre: uno ? `BITACORA MONITOREO EC ${D.ecNum(uno)} ${String(uno.esp).replace(/[\\/:*?"<>|]/g, "-").slice(0, 50)}` : `BITACORAS MONITOREO EC (${lista.length}) ${U.corta(U.iso(new Date())).replace(/\//g, ".")}`,
    carpeta: "ESPACIOS CONFINADOS", tipo: "concentrado" };
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
  lista = lista.filter(e => !e.noLib);
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
;
/* ---- vistas_tec.js ---- */
/* =========================================================================
   BITACORA 24RU1 - Vistas del tecnico (y comunes)
   ========================================================================= */
"use strict";
B.vistas = B.vistas || {};
const V = B.vistas, ui = B.ui;
const T = () => B.app.trabajo;
const yo = () => B.usuario.ini;

function cab(ico, color, titulo, sub, acciones, tour) {
  return `<div class="tarjeta-cab" ${tour ? `data-tour="${tour}"` : ""}><div class="ico-tarjeta ${color}">${B.ico(ico)}</div><div><h2>${titulo}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${acciones ? `<div class="acciones">${acciones}</div>` : ""}</div>`;
}
async function ejecutar(fn, ok) {
  try { const r = await fn(); await B.app.refrescar(); if (ok) ui.toast(typeof ok === "function" ? ok(r) : ok, "ok"); return r; }
  catch (e) { ui.error(e); return null; }
}
function diaRecarga(f) {
  const p = B.t.primeroUltimo();
  if (f < p.fi || f > p.ff) return "";
  return `Día ${U.dia(f) - U.dia(p.fi) + 1} de ${U.dia(p.ff) - U.dia(p.fi) + 1}`;
}

/* ===================================================================== INICIO */
V.inicio = {
  titulo: "Inicio",
  render(c) {
    const { f, t } = T(), sup = B.dom.esSup(), K = B.t.clave(f, t);
    const misAct = B.estado.actividades.filter(a => a.fecha === f && a.turno === t && U.ini(a.ini) === yo());
    const misPend = B.dom.pendientesActuales(yo());
    const ec = B.dom.ecDelTurno(f, t), vig = B.dom.vigActivas(f, t).filter(v => !v.retiro || v.retiro > B.t.fin(f, t));
    const acum = B.estado.ec.filter(e => !e.pre && !e.noLib && B.t.clave(e.fecha, e.turno) <= K).length;
    const he = B.dom.heDe(f, t, yo());
    const nombre = (B.usuario.nombre || "").split(" ")[0];
    const dia = diaRecarga(f);
    let h = `<div class="bienvenida" data-tour="bienvenida"><h2>Hola, ${U.esc(nombre)}</h2>
      <p>${sup ? "Panel de supervisión del turno." : "Aquí tienes el resumen de tu turno. Usa el menú de la izquierda para capturar."}</p>
      <div class="chips"><span class="chip">${t} ${U.esc(B.t.nombre(t))} · ${U.esc(B.t.horario(t))}</span><span class="chip">${U.larga(f)}</span>${dia ? `<span class="chip">${dia} · ${U.esc(B.t.periodo())}</span>` : `<span class="chip">${U.esc(B.t.periodo())}</span>`}${B.estado.servidor.demo ? '<span class="chip">VERSIÓN DEMO</span>' : ""}</div></div>`;
    const nLibres = B.dom.porAsignar().length;
    if (nLibres) h += `<a class="aviso d" href="#/actividades" style="margin-top:14px;text-decoration:none;color:inherit">${B.ico("usuarios")}<div><b>${nLibres} actividad${nLibres === 1 ? "" : "es"} del día por asignar.</b>
      ${sup ? "Asígnalas al personal en Mis actividades." : "Si vas a realizar alguna, tómala en Mis actividades."}</div></a>`;
    h += `<div class="cuadricula" data-tour="kpis">`;
    const kpi = (ico, color, valor, et, det, ruta) => `<a class="tarjeta c3" href="#/${ruta}" style="color:inherit"><div class="kpi"><div class="ico-tarjeta ${color}">${B.ico(ico)}</div>
      <div class="valor tnum">${valor}</div><div class="etiqueta">${et}</div><div class="detalle">${det}</div></div></a>`;
    if (sup) {
      const pres = B.dom.presentes(f, t), asign = B.dom.personalDelTurno(f, t), sin = B.dom.sinCaptura(f, t);
      h += kpi("usuarios", "g", `${pres.size}<span class="muted" style="font-size:16px"> / ${asign.length}</span>`, "Personal con registro", sin.length ? sin.length + " asignados sin captura" : "Todos capturaron", "turno");
      h += kpi("reloj", "r", B.dom.pendientesGrupos().length, "Pendientes abiertos", "de todo el personal", "pendientes");
    } else {
      h += kpi("lista", "g", misAct.length, "Mis actividades del turno", "en " + B.t.corto(f, t), "actividades");
      h += kpi("reloj", "r", misPend.length, "Mis pendientes abiertos", "se repiten hasta concluirlos", "pendientes");
    }
    h += kpi("escudo", "v", ec.length, "Espacios liberados en el turno", "Acumulado del periodo: " + acum, "espacios");
    if (sup) h += kpi("fuego", "d", vig.length, "Vigilancias C.I. activas", "al cierre del turno", "vigilancias") + `</div>`;
    else h += kpi("calendario", "d", U.fmtNum(V.horasextra.totalSemana(yo(), B.dom.lunes(f))) + '<span class="muted" style="font-size:16px"> h</span>', "Mis horas extra de la semana",
      he ? "En este turno: " + U.fmtNum(U.num(he.he)) + " h" : "Regístralas en Mis horas extra", "horasextra") + `</div>`;

    h += `<div class="cuadricula" style="margin-top:18px">`;
    if (sup) {
      const sin = B.dom.sinCaptura(f, t);
      h += `<div class="tarjeta c7">${cab("usuarios", "g", "Captura del turno", "Personal asignado que aún no registra nada", `<a class="btn chico sec" href="#/turno">Datos del turno</a><a class="btn chico" href="#/reporte">${B.ico("pdf")} Reporte</a>`)}
        ${sin.length ? `<div class="lista">${sin.map(i => `<div class="item"><span class="badge r">SIN CAPTURA</span><div class="cuerpo"><div class="tit">${U.esc(i)} · ${U.esc(B.dom.nombre(i))}</div></div></div>`).join("")}</div>`
          : ui.vacio("Todo el personal asignado tiene registros o está marcado como presente.", "ok")}</div>`;
    } else {
      h += `<div class="tarjeta c7">${cab("lista", "g", "Mis actividades del turno", U.esc(B.app.textoTurno()), `<a class="btn chico" href="#/actividades">${B.ico("mas")} Capturar</a>`)}
        ${misAct.length ? `<div class="lista">${misAct.map(a => `<div class="item"><div class="cuerpo"><div class="tit">${U.esc(a.txt)}</div></div>${ui.estatusBadge(a.est)}</div>`).join("")}</div>`
          : ui.vacio("Aún no capturas actividades en este turno.", "lista")}</div>`;
    }
    const pend = sup ? B.dom.pendientesGrupos().slice(0, 6).map(g => ({ ...g.a, ini: B.dom.ordenados(g.inis).join("/") })) : misPend.slice(0, 6);
    h += `<div class="tarjeta c5">${cab("reloj", "r", sup ? "Pendientes abiertos" : "Mis pendientes", "Pendientes y en proceso", `<a class="btn chico sec" href="#/pendientes">Ver todos</a>`)}
      ${pend.length ? `<div class="lista">${pend.map(a => `<div class="item"><div class="cuerpo"><div class="tit">${U.esc(a.txt)}</div>
        <div class="meta"><span>${U.esc(a.ini)}</span><span>desde ${B.t.corto(a.fecha, a.turno)}</span></div></div>${ui.estatusBadge(a.est)}</div>`).join("")}</div>` : ui.vacio("Sin pendientes abiertos.", "ok")}</div>`;
    h += `<div class="tarjeta c6">${cab("escudo", "v", "Espacios confinados del turno", "Liberados en " + B.t.corto(f, t), `<a class="btn chico sec" href="#/espacios">Registrar</a>`)}
      ${ec.length ? `<div class="lista">${ec.map(e => `<div class="item"><span class="badge g">EC #${U.esc(B.dom.ecNum(e))}</span><div class="cuerpo"><div class="tit">${U.esc(e.esp)}</div>
        <div class="meta"><span>O2 ${U.esc(e.o2)}%</span><span>LEL ${U.esc(e.lel)}%</span><span>${U.fh(e.lib)}</span><span>${U.esc(e.pers)}</span></div></div></div>`).join("")}</div>` : ui.vacio("Sin liberaciones en este turno.", "escudo")}</div>`;
    h += `<div class="tarjeta c6">${cab("fuego", "d", "Vigilancias C.I. activas", "Aparecen en cada reporte hasta su retiro", `<a class="btn chico sec" href="#/vigilancias">Ver</a>`)}
      ${vig.length ? `<div class="lista">${vig.map(v => `<div class="item"><span class="badge r">VIG #${v.num}</span><div class="cuerpo"><div class="tit">${U.esc(v.desc)}</div>
        <div class="meta"><span>${U.esc(v.ubic)}</span><span>INOP ${U.esc(v.inop)}</span><span>desde ${U.fh(v.inicio)}</span></div></div></div>`).join("")}</div>` : ui.vacio("No hay vigilancias activas.", "fuego")}</div>`;
    h += `</div>`;
    c.innerHTML = h;
  }
};

/* ===================================================================== ACTIVIDADES */
V.actividades = {
  titulo: "Mis actividades",
  ini: null,
  render(c) {
    const { f, t } = T(), sup = B.dom.esSup();
    if (!this.ini || !sup) this.ini = yo();
    const ini = this.ini;
    const guardadas = B.estado.actividades.filter(a => a.fecha === f && a.turno === t && U.ini(a.ini) === ini).sort((a, b) => a.id - b.id);
    const quien = sup ? `<div class="campo" style="margin:0;min-width:280px"><input class="inp" id="aQuien" value="${U.esc(ini + " - " + B.dom.nombre(ini))}" placeholder="Capturar como…"></div>` : "";
    const libres = sup ? [] : B.dom.porAsignar();
    c.innerHTML = `
      ${libres.length ? `<div class="tarjeta" data-tour="act-libres">${cab("usuarios", "d", "Actividades del día por asignar (" + libres.length + ")", "El supervisor las registró sin responsable. Si tú la realizas, tómala: pasa a tus actividades y deja de aparecer aquí.")}
        <div class="lista">${libres.map(a => `<div class="item" style="flex-wrap:wrap"><div class="cuerpo" style="min-width:240px"><div class="tit">${U.esc(a.txt)}</div>
          <div class="meta"><span>para ${B.t.corto(a.fecha, a.turno)}</span><span>registró ${U.esc(a.asig || a.capturo || "")}</span></div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn chico verde" data-tomar="${a.id}" data-hecha="1">${B.ico("ok")} Ya la realicé</button>
          <button class="btn chico sec" data-tomar="${a.id}">La tomo (queda pendiente)</button></div></div>`).join("")}</div></div>` : ""}
      <div class="tarjeta">
        ${cab("lista", "g", "Captura de actividades", `${U.esc(B.app.textoTurno())}${ini !== yo() ? " · capturando como <b>" + U.esc(ini) + "</b>" : ""}`, quien)}
        <div class="aviso a">${B.ico("info")}<div>Escribe <b>una actividad por renglón</b> y elige su estatus. Lo <b>Pendiente</b> y <b>En proceso</b> aparece en los siguientes reportes
          hasta que lo marques como concluido en <a href="#/pendientes">Pendientes</a>. ¿Actividad repetida? Usa <b>Actividades anteriores</b>.
          <br><b>No dupliques:</b> si la actividad ya la capturó un compañero o ya la tenías pendiente, al escribirla aparece abajo para que te <b>unas</b> a ella; el estatus y el comentario valen para todo el equipo.</div></div>
        <div id="renglones" data-tour="act-renglones"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn sec chico" id="bAgregar">${B.ico("mas")} Agregar renglón</button>
          <button class="btn sec chico" id="bAnteriores" data-tour="act-anteriores">${B.ico("reutilizar")} Actividades anteriores</button>
        </div>
      </div>
      <div class="barra-guardar" data-tour="act-guardar"><span class="estado" id="aEstado">Sin cambios</span>
        <button class="btn verde" id="bGuardar">${B.ico("ok")} Guardar</button></div>
      ${sup ? `<div class="tarjeta" data-tour="act-asignar" id="asTarjeta" style="margin-top:18px"></div>` : ""}`;
    if (sup) this.asignar(c.querySelector("#asTarjeta"), f, t);
    c.querySelectorAll("[data-tomar]").forEach(b => b.onclick = async () => {
      const a = B.estado.actividades.find(x => x.id === +b.dataset.tomar), hecha = !!b.dataset.hecha; if (!a) return;
      const msg = hecha ? `Se registrará como <b>realizada por ti</b> en ${B.t.corto(f, t)}:` : "Pasará a <b>tus pendientes</b>; márcala como concluida cuando la termines:";
      if (!(await ui.confirmar(`${msg}<br><span class="muted">${U.esc(a.txt)}</span>`, hecha ? "Ya la realicé" : "Tomar actividad", hecha ? "Registrar" : "Tomar"))) return;
      await ejecutar(() => B.api.op("actividades", "tomar", { id: a.id, hecha, fecha: f, turno: t }), hecha ? "Actividad registrada en tu turno." : "Actividad agregada a tus pendientes.");
    });
    const cont = c.querySelector("#renglones");
    const borrar = [];
    let sucio = false;
    const marcar = () => { sucio = true; const e = c.querySelector("#aEstado"); e.textContent = "Cambios sin guardar"; e.classList.add("sucio"); };
    const numerar = () => cont.querySelectorAll(".renglon .num").forEach((n, i) => n.textContent = i + 1);
    const ajustar = ta => { ta.style.height = "auto"; ta.style.height = Math.max(38, ta.scrollHeight) + "px"; };
    const agregar = (a, enfocar) => {
      const r = document.createElement("div");
      r.className = "renglon";
      if (a && a.id) r.dataset.id = a.id;
      // compartida: asignada por el supervisor o con mas personas en el mismo equipo (grupo)
      const otros = a && a.id && a.grupo ? B.dom.ordenados([...new Set(B.dom.todas().filter(x => x.grupo === a.grupo && U.ini(x.ini) !== U.ini(a.ini) && x.ini).map(x => U.ini(x.ini)))]) : [];
      const comp = !!(a && a.id && a.grupo && ((a.asig && U.ini(a.asig) !== U.ini(a.ini)) || otros.length));
      const nCom = a && a.id ? B.dom.comentarios(a).length : 0;
      const ajeno = !!(a && a.id && a.com && a.comPor && U.ini(a.comPor) !== U.ini(B.usuario.ini) && !sup);     // comentario escrito por otro del equipo
      r.innerHTML = `<div class="num"></div><div><textarea rows="1" placeholder="Describe la actividad…" ${comp ? 'readonly style="background:#FAF8F6"' : ""}>${U.esc(a ? a.txt : "")}</textarea>
        ${a && a.id ? "" : `<div class="sug-act"></div>`}
        <input class="inp com" placeholder="Comentario (opcional): sale en el reporte junto a la actividad" value="${U.esc(a ? a.com || "" : "")}" style="margin-top:6px;padding:6px 10px;font-size:12.5px${ajeno ? ";background:#FAF8F6" : ""}" ${ajeno ? `readonly title="Comentario de ${U.esc(a.comPor)}: solo lo modifica quien lo escribió o un supervisor"` : ""}>
        ${a && a.id ? `<div class="guardado">Guardada · ID ${a.id}${nCom ? ` · <a href="#" data-coms="${a.id}">Comentarios (${nCom}): editar o eliminar</a>` : ""}${a.seg && !nCom ? " · con seguimiento" : ""}${ajeno ? " · comentario de " + U.esc(a.comPor) : ""}${comp ? (a.asig && U.ini(a.asig) !== U.ini(a.ini) ? " · asignada por " + U.esc(a.asig) : "") + (otros.length ? " · en equipo con <b>" + U.esc(otros.join("/")) + "</b>" : "") + " · el estatus y el comentario valen para todo el equipo" : ""}</div>` : ""}</div>
        ${ui.seg("est", ["Realizada", "En proceso", "Pendiente"], a ? (a.est === "Concluida" ? a.estOrig : a.est) : "Realizada", "estatus")}
        <button class="btn fantasma btn-icono quitar" title="Quitar">${B.ico("basura")}</button>`;
      cont.appendChild(r);
      const ta = r.querySelector("textarea");
      ta.oninput = () => { ajustar(ta); marcar(); if (sugerir) sugerir(); };
      r.querySelector(".com").oninput = marcar;
      // renglon nuevo: mientras escribe se le muestran las actividades ya capturadas que coinciden, para unirse en lugar de duplicar
      const caja = r.querySelector(".sug-act");
      const sugerir = caja && U.debounce(() => {
        if (r.dataset.unir) return;
        const v = ta.value.trim(), fs = B.dom.fichas(v);
        const l = (fs.length >= 2 || v.length >= 8) ? existentes.map(x => {
          const fx = B.dom.fichas(x.txt), p = B.dom.parecido(v, x.txt);
          const n = fs.filter(k => fx.some(y => y === k || (k.length >= 3 && y.startsWith(k)))).length;
          return { x, p, n };
        }).filter(o => o.p > 0 || (o.n === fs.length && fs.length >= 2) || U.norm(o.x.txt) === U.norm(v)).sort((a, b) => b.p - a.p || b.n - a.n).slice(0, 4) : [];
        caja.innerHTML = l.length ? `<div class="sug-tit">${B.ico("info", 'style="width:13px;height:13px"')} Ya está capturada. Únete en lugar de duplicarla:</div>` + l.map(o => `<button type="button" class="sug-item" data-u="${o.x.id}">
          <span class="t">${U.esc(o.x.txt)}</span><span class="m">${U.esc(o.x.inis || "por asignar")} · ${U.esc(o.x.est === "Concluida" ? "Realizada" : o.x.est)}${o.x.fecha === f && o.x.turno === t ? "" : " · desde " + B.t.corto(o.x.fecha, o.x.turno)}</span><b>Unirme</b></button>`).join("") : "";
        caja.querySelectorAll("[data-u]").forEach(b => b.onclick = () => unirA(existentes.find(x => x.id === +b.dataset.u)));
      }, 250);
      const unirA = x => {
        if (!x || !caja) return;
        r.dataset.unir = x.id; delete r.dataset.distinta; ta.value = x.txt; ta.readOnly = true; ta.style.background = "#FAF8F6"; ajustar(ta); marcar();
        caja.innerHTML = `<div class="sug-unida">${B.ico("ok", 'style="width:13px;height:13px"')} Te unes a la actividad ${x.inis ? "de <b>" + U.esc(x.inis) + "</b>" : "<b>por asignar</b>"}${x.fecha === f && x.turno === t ? "" : " (desde " + B.t.corto(x.fecha, x.turno) + ")"}: no se duplica; el estatus y el comentario que pongas valen para todo el equipo. <a href="#">Deshacer</a></div>`;
        caja.querySelector("a").onclick = e => { e.preventDefault(); delete r.dataset.unir; ta.readOnly = false; ta.style.background = ""; ta.value = ""; caja.innerHTML = ""; ta.focus(); };
      };
      r.unirA = unirA;
      setTimeout(() => ajustar(ta), 0);
      ui.activarSeg(r, marcar);
      const lc = r.querySelector("[data-coms]"); if (lc) lc.onclick = async e => { e.preventDefault(); if (sucio && !(await ui.confirmar("Tienes cambios sin guardar en esta pantalla; si modificas un comentario se perderán. ¿Continuar?", "Cambios sin guardar", "Continuar"))) return; V.actividades.comentarios(+lc.dataset.coms); };
      r.querySelector(".quitar").onclick = () => { if (r.dataset.id) borrar.push(+r.dataset.id); r.remove(); numerar(); marcar(); if (!cont.children.length) agregar(); };
      numerar();
      if (enfocar) ta.focus();
      return r;
    };
    const existentes = B.dom.existentes(f, t, ini);
    guardadas.forEach(a => agregar(a));
    if (!guardadas.length) { agregar(); agregar(); agregar(); }
    c.querySelector("#bAgregar").onclick = () => agregar(null, true);
    c.querySelector("#bAnteriores").onclick = async () => {
      const txt = await V.actividades.elegirAnterior();
      if (!txt) return;
      let r = [...cont.querySelectorAll(".renglon")].find(x => !x.querySelector("textarea").value.trim());
      if (!r) r = agregar();
      const ta = r.querySelector("textarea"); ta.value = txt; ajustar(ta); marcar(); ta.dispatchEvent(new Event("input"));
    };
    if (sup) ui.combo(c.querySelector("#aQuien"), { items: () => ui.personas(), alElegir: v => { if (v) { V.actividades.ini = v; B.app.render(); } } });
    const guardar = async () => {
      const filas = [...cont.querySelectorAll(".renglon")];
      const items = filas.map(r => ({ id: r.dataset.id ? +r.dataset.id : 0, txt: r.querySelector("textarea").value.trim(), est: ui.segValor(r.querySelector(".seg")), com: r.querySelector(".com").value.trim(),
        ...(r.dataset.unir ? { unir: +r.dataset.unir } : {}), ...(r.dataset.distinta ? { distinta: true } : {}) }));
      for (const it of items) if (it.id && !it.txt) borrar.push(it.id);
      if (borrar.length && !(await ui.confirmar(`Se eliminarán ${borrar.length} actividad(es) ya guardadas. ¿Continuar?`, "Eliminar actividades", "Eliminar", true))) return;
      const btn = c.querySelector("#bGuardar"); btn.disabled = true;
      try {
        const r = await B.api.op("actividades", "guardarTurno", { fecha: f, turno: t, ini, items: items.filter(x => x.txt), borrar });
        await B.app.refrescar();
        ui.toast(`Guardado: ${r.nuevas} nuevas, ${r.modificadas} modificadas, ${r.eliminadas} eliminadas.` + (r.unidas ? `<br><b>${r.unidas}</b> ya estaba(n) capturada(s): te uniste a la existente, sin duplicar.` : ""), "ok", r.unidas ? 7000 : undefined);
      } catch (e) {
        btn.disabled = false;
        const par = e.datos && e.datos.parecidas;
        if (!par || !par.length) { ui.error(e); return; }
        // ya existe una actividad igual o parecida: se une a ella (o, si solo es parecida, confirma que es otra distinta)
        let cambio = false;
        for (const txt of [...new Set(par.map(x => x.para))]) {
          const l = par.filter(x => x.para === txt), r0 = filas.find(r => !r.dataset.id && !r.dataset.unir && r.querySelector("textarea").value.trim() === txt);
          if (!r0) continue;
          const puedeNueva = sup || !l.some(x => x.igual);
          let elegida = null;
          const v = await ui.modal({ titulo: "Esta actividad ya está capturada", icono: "alerta", ancho: true,
            html: `<p style="margin:0 0 6px">Escribiste:</p><p style="margin:0 0 12px"><b>${U.esc(txt)}</b></p>
              <p style="margin:0 0 8px">${l.some(x => x.igual) ? "Ya existe la <b>misma actividad</b>" : "Ya existe una actividad <b>muy parecida</b>"}. Para no duplicarla en el reporte, únete a ella: el estatus y el comentario que pongas valen para todo el equipo.</p>
              <div class="lista">${l.map((x, i) => `<div class="item" style="flex-wrap:wrap"><div class="cuerpo" style="min-width:220px"><div class="tit">${U.esc(x.txt)}</div>
                <div class="meta"><span><b>${U.esc(x.inis || "por asignar")}</b></span><span>${U.esc(x.est === "Concluida" ? "Realizada" : x.est)}</span><span>${B.t.corto(x.fecha, x.turno)}</span></div></div>
                <button class="btn chico verde" data-unirme="${i}">${B.ico("ok")} Unirme a esta</button></div>`).join("")}</div>
              ${puedeNueva ? "" : `<p class="muted peque" style="margin:10px 0 0">Si de verdad es otra actividad, descríbela con lo que la distingue (equipo, lugar, nivel) o pide al supervisor que la registre.</p>`}`,
            botones: [...(puedeNueva ? [{ t: "Es otra actividad distinta", c: "sec", v: "distinta" }] : []), { t: "Cancelar", c: "fantasma", v: null }],
            alAbrir: m => m.querySelectorAll("[data-unirme]").forEach(b => b.onclick = () => { elegida = l[+b.dataset.unirme].id; m.querySelector("[data-x]").click(); }) }) || elegida;
          if (v === "distinta") { r0.dataset.distinta = "1"; cambio = true; }
          else if (v) { const x = l.find(y => String(y.id) === String(v)); if (x) { r0.unirA(x); cambio = true; } }
          else return;
        }
        if (cambio) guardar();
      }
    };
    c.querySelector("#bGuardar").onclick = guardar;
    c.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); guardar(); } };
  },
  /* Supervisor: registrar una actividad y asignarla a una o varias personas disponibles en el turno */
  asSel: new Set(), asExtra: [], asTxt: "", asEst: "Realizada", asClave: "", asLibre: 0, asUni: "", asRep: false,
  asignar(c, f, t) {
    const D = B.dom, clave = f + t;
    if (this.asClave !== clave) { this.asClave = clave; this.asSel = new Set(); this.asExtra = []; }
    const pres = D.presentes(f, t);
    const disp = D.ordenados([...new Set([...D.personalDelTurno(f, t), ...pres.keys(), ...this.asExtra])]);
    const asignadas = B.estado.actividades.filter(a => a.fecha === f && a.turno === t && a.asig);
    const grupos = new Map();
    for (const a of asignadas) { if (!a.ini) continue; const k = U.norm(a.txt); if (!grupos.has(k)) grupos.set(k, { txt: a.txt, por: a.asig, items: [] }); grupos.get(k).items.push(a); }
    const corto = i => { const p = D.persona(i); return p ? p.nombre.split(" ").slice(0, 2).join(" ") : ""; };
    const libres = D.porAsignar(), libre = libres.find(a => a.id === this.asLibre);
    if (!libre) this.asLibre = 0;
    c.innerHTML = `${cab("usuarios", "d", "Asignar actividad al personal", "Registra una actividad y asígnala a una o varias personas del turno; si alguien ya la tiene, no se duplica. ¿Aún no sabes quién la hará? Guárdala <b>sin marcar a nadie</b>: queda «por asignar» y aparece en la hoja de asignación; en el reporte del turno solo sale si marcas la casilla de abajo.")}
      ${libre ? `<div class="aviso d" style="margin-bottom:10px">${B.ico("info")}<div>Asignando la actividad por asignar <b>ID ${libre.id}</b> (registrada para ${B.t.corto(libre.fecha, libre.turno)}). Marca quién la realiza y su estatus. <a href="#" id="asCancelar">Cancelar</a></div></div>` : ""}
      <div class="renglon" style="margin-bottom:10px"><div class="num">${B.ico("lista", 'style="width:14px;height:14px"')}</div>
        <div><textarea rows="1" id="asTxt" placeholder="Describe la actividad a asignar…">${U.esc(this.asTxt)}</textarea></div>
        ${ui.seg("asEst", ["Realizada", "En proceso", "Pendiente"], this.asEst, "estatus")}
        <button class="btn fantasma btn-icono" id="asAnt" title="Actividades anteriores">${B.ico("reutilizar")}</button></div>
      <div class="campo" style="margin-top:-2px"><label>Unidad (para la hoja de asignación)</label>${ui.seg("asUni", ["General", "Unidad 1", "Unidad 2"], { "": "General", U1: "Unidad 1", U2: "Unidad 2" }[this.asUni || ""])}</div>
      <div class="campo"><label>Personal disponible en ${B.t.corto(f, t)} (${disp.length}) &nbsp; <a href="#" id="asTodos">Marcar todos</a> · <a href="#" id="asNinguno">Ninguno</a></label>
        <div class="chips-ali" id="asChips">${disp.length ? disp.map(i => `<label class="chip-ali" title="${U.esc(D.nombre(i))}${pres.has(i) ? " · con registro en el turno" : ""}"><input type="checkbox" data-as="${U.esc(i)}" ${this.asSel.has(i) ? "checked" : ""}><span><b>${U.esc(i)}</b>&nbsp;${U.esc(corto(i))}</span></label>`).join("")
          : `<span class="muted peque">Nadie asignado a este turno. Agrega personas con el buscador.</span>`}</div></div>
      <div class="fila he-fila">
        <div class="campo" style="min-width:260px;max-width:380px;margin-bottom:0"><label>Agregar a otra persona (de otro turno)</label><input class="inp" id="asOtro" placeholder="Busca por iniciales o apellido…"></div>
        <label class="chip-ali" id="asRepL" style="margin:0 0 2px auto"><input type="checkbox" id="asRep" ${this.asRep ? "checked" : ""}><span>Si queda sin asignar: mostrarla en el reporte como PENDIENTE</span></label>
        <button class="btn verde" id="asGuardar">${B.ico("ok")} <span id="asN">Asignar</span></button></div>
      ${libres.length ? `<h3 style="font-size:13px;margin:18px 0 8px;color:var(--texto-2)">Por asignar (${libres.length}) · sin responsable todavía</h3><div class="lista" data-tour="act-porasignar">${libres.map(a => `<div class="item" style="flex-wrap:wrap;${a.id === this.asLibre ? "background:var(--dorado-claro);" : ""}">
          <span class="badge d">POR ASIGNAR</span><div class="cuerpo" style="min-width:240px"><div class="tit">${U.esc(a.txt)}</div>${a.com ? `<div class="meta" style="color:var(--texto)">↳ ${U.esc(a.com)}</div>` : ""}<div class="meta"><span>para ${B.t.corto(a.fecha, a.turno)}</span><span>registró ${U.esc(a.asig || a.capturo || "")}</span><span>ID ${a.id}</span><span>${a.rep ? "sale en el reporte como pendiente" : "no sale en el reporte"}</span></div></div>
          <div style="display:flex;gap:6px"><button class="btn chico sec" data-edlibre="${a.id}">${B.ico("editar")} Editar / nota</button><button class="btn chico" data-aslibre="${a.id}">Asignar…</button><button class="btn chico fantasma btn-icono" data-quitar="${a.id}" title="Eliminar">${B.ico("basura")}</button></div></div>`).join("")}</div>` : ""}
      ${grupos.size ? `<h3 style="font-size:13px;margin:18px 0 8px;color:var(--texto-2)">Asignadas en este turno</h3><div class="lista">${[...grupos.values()].map(g => `<div class="item" style="flex-wrap:wrap"><div class="cuerpo" style="min-width:260px">
          <div class="tit">${U.esc(g.txt)}</div><div class="meta"><span>asignó ${U.esc(g.por)}</span><span>${g.items.length} persona(s)</span></div>
          <div class="chips-ali" style="margin-top:6px;min-height:0">${g.items.map(a => `<span class="chip-per">${U.esc(a.ini)} ${ui.estatusBadge(a.est)}<button title="Quitar a ${U.esc(a.ini)}" data-quitar="${a.id}">×</button></span>`).join("")}</div></div></div>`).join("")}</div>` : ""}`;
    const ta = c.querySelector("#asTxt"), ajustar = () => { ta.style.height = "auto"; ta.style.height = Math.max(38, ta.scrollHeight) + "px"; };
    const contar = () => { const n = c.querySelectorAll("[data-as]:checked").length; c.querySelector("#asN").textContent = n ? `Asignar a ${n} persona${n === 1 ? "" : "s"}` : (this.asLibre ? "Asignar" : "Guardar sin asignar"); };
    c.querySelector("#asRep").onchange = e => { this.asRep = e.target.checked; };
    c.querySelectorAll("[data-edlibre]").forEach(b => b.onclick = () => this.editarLibre(+b.dataset.edlibre));
    const bc = c.querySelector("#asCancelar"); if (bc) bc.onclick = e => { e.preventDefault(); this.asLibre = 0; this.asTxt = ""; this.asignar(c, f, t); };
    c.querySelectorAll("[data-aslibre]").forEach(b => b.onclick = () => {
      const a = libres.find(x => x.id === +b.dataset.aslibre); if (!a) return;
      this.asLibre = a.id; this.asTxt = a.txt; this.asEst = "Realizada"; this.asUni = a.uni || ""; this.asignar(c, f, t);
      c.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    ta.oninput = () => { this.asTxt = ta.value; ajustar(); }; setTimeout(ajustar, 0);
    ui.activarSeg(c, (s, v) => { if (s.dataset.seg === "asEst") this.asEst = v; if (s.dataset.seg === "asUni") this.asUni = { General: "", "Unidad 1": "U1", "Unidad 2": "U2" }[v]; });
    const enlazar = () => c.querySelectorAll("[data-as]").forEach(x => x.onchange = () => { x.checked ? this.asSel.add(x.dataset.as) : this.asSel.delete(x.dataset.as); contar(); });
    enlazar(); contar();
    const todos = v => { c.querySelectorAll("[data-as]").forEach(x => { x.checked = v; v ? this.asSel.add(x.dataset.as) : this.asSel.delete(x.dataset.as); }); contar(); };
    c.querySelector("#asTodos").onclick = e => { e.preventDefault(); todos(true); };
    c.querySelector("#asNinguno").onclick = e => { e.preventDefault(); todos(false); };
    c.querySelector("#asAnt").onclick = async () => { const txt = await V.actividades.elegirAnterior(); if (txt) { ta.value = txt; this.asTxt = txt; ajustar(); } };
    ui.combo(c.querySelector("#asOtro"), { items: () => ui.personas(p => !disp.includes(U.ini(p.ini))), alElegir: v => {
      if (!v) return; v = U.ini(v);
      if (!this.asExtra.includes(v)) this.asExtra.push(v); this.asSel.add(v); this.asignar(c, f, t);
    } });
    c.querySelector("#asGuardar").onclick = async () => {
      const txt = ta.value.trim(), inis = [...c.querySelectorAll("[data-as]:checked")].map(x => x.dataset.as);
      if (!txt) { ui.toast("Escribe la actividad.", "error"); ta.focus(); return; }
      if (!inis.length && this.asLibre) { ui.toast("Marca al menos una persona para asignarla.", "error"); return; }
      const b = c.querySelector("#asGuardar"); b.disabled = true;
      if (!inis.length) {       // sin responsable todavia
        try {
          await B.api.op("actividades", "asignar", { fecha: f, turno: t, txt, est: "Pendiente", inis: [], libre: true, uni: this.asUni, rep: this.asRep });
          const enRep = this.asRep; this.asTxt = ""; await B.app.refrescar();
          ui.toast("Actividad guardada <b>por asignar</b>: aparece en la hoja de asignación hasta que alguien la tome o la asignes." + (enRep ? " También sale en el reporte del turno como pendiente." : " No sale en el reporte del turno (puedes cambiarlo con Editar)."), "ok", 7000);
        } catch (e) { ui.error(e); b.disabled = false; }
        return;
      }
      try {
        const r = await B.api.op("actividades", "asignar", { fecha: f, turno: t, txt, est: this.asEst, inis, id: this.asLibre || 0, uni: this.asUni });
        this.asTxt = ""; this.asSel = new Set(); this.asLibre = 0;
        await B.app.refrescar();
        ui.toast(`Actividad asignada a ${r.creadas.length} persona(s)${r.creadas.length ? ": " + r.creadas.join(", ") : ""}.` + (r.omitidas.length ? `<br>Sin duplicar (ya la tenían): <b>${r.omitidas.join(", ")}</b>` : ""), r.creadas.length ? "ok" : "aviso", 7000);
      } catch (e) { ui.error(e); b.disabled = false; }
    };
    c.querySelectorAll("[data-quitar]").forEach(b => b.onclick = async () => {
      const a = B.estado.actividades.find(x => x.id === +b.dataset.quitar); if (!a) return;
      if (!(await ui.confirmar(a.ini ? `¿Quitar esta actividad a <b>${U.esc(a.ini)}</b>?<br><span class="muted">${U.esc(a.txt)}</span>` : `¿Eliminar esta actividad por asignar?<br><span class="muted">${U.esc(a.txt)}</span>`, a.ini ? "Quitar asignación" : "Eliminar actividad", a.ini ? "Quitar" : "Eliminar", true))) return;
      if (a.id === this.asLibre) this.asLibre = 0;
      await ejecutar(() => B.api.op("actividades", "borrar", { id: a.id }), a.ini ? "Asignación quitada." : "Actividad eliminada.");
    });
  },
  /* Supervisor: reasignar o dejar sin asignar una actividad (pendiente, en proceso o realizada) */
  async reasignar(id) {
    const a = B.estado.actividades.find(x => x.id === id); if (!a) return;
    const D = B.dom, grp = a.grupo ? B.estado.actividades.filter(x => x.grupo === a.grupo) : [a];
    const actuales = D.ordenados([...new Set(grp.map(x => U.ini(x.ini)).filter(Boolean))]), sel = new Set(actuales), lista = [...actuales];
    const r = await ui.modal({ titulo: "Reasignar actividad · ID " + a.id, icono: "usuarios", ancho: true,
      html: `<p style="margin:0 0 4px"><b>${U.esc(a.txt)}</b></p>
        <p class="muted peque" style="margin:0 0 12px">${B.t.corto(a.fecha, a.turno)} · ${U.esc(a.est)} · ahora: ${actuales.length ? "<b>" + U.esc(actuales.join("/")) + "</b>" : "<b>sin asignar</b>"}</p>
        <div class="campo"><label>Quién la tiene (desmarca para quitar; sin nadie marcado queda SIN ASIGNAR)</label><div class="chips-ali" id="raChips"></div></div>
        <div class="campo" style="margin-bottom:0"><label>Agregar a otra persona</label><input class="inp" id="raOtro" placeholder="Busca por iniciales o apellido…"></div>
        <p class="muted peque" style="margin:10px 0 0">La actividad sigue siendo una sola: conserva su estatus, comentarios y seguimiento. Deja de aparecer en el historial de quien quites.</p>`,
      alAbrir: v => {
        const caja = v.querySelector("#raChips");
        const pintar = () => { caja.innerHTML = lista.length ? lista.map(i => `<label class="chip-ali" title="${U.esc(D.nombre(i))}"><input type="checkbox" data-i="${U.esc(i)}" ${sel.has(i) ? "checked" : ""}><span><b>${U.esc(i)}</b>&nbsp;${U.esc((D.nombre(i) || "").split(" ").slice(0, 2).join(" "))}</span></label>`).join("") : `<span class="muted peque">Sin asignar. Agrega personas con el buscador.</span>`;
          caja.querySelectorAll("[data-i]").forEach(x => x.onchange = () => x.checked ? sel.add(x.dataset.i) : sel.delete(x.dataset.i)); };
        pintar();
        const io = v.querySelector("#raOtro");
        ui.combo(io, { items: () => ui.personas(p => !lista.includes(U.ini(p.ini))), alElegir: x => { if (!x) return; x = U.ini(x); if (!lista.includes(x)) lista.push(x); sel.add(x); pintar(); io.value = ""; delete io.dataset.valor; } });
      },
      botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Guardar asignación", c: "verde", v: () => [...sel] }] });
    if (!r) return;
    const nuevo = D.ordenados(r);
    if (nuevo.join("/") === actuales.join("/")) { ui.toast("Sin cambios.", ""); return; }
    if (!nuevo.length && !(await ui.confirmar("La actividad quedará <b>sin asignar</b>." + (a.est === "Pendiente" || a.est === "En proceso" ? " Aparecerá en «por asignar» para que alguien la tome." : ""), "Dejar sin asignar", "Dejar sin asignar", true))) return;
    await ejecutar(() => B.api.op("actividades", "reasignar", { id: a.id, inis: nuevo }), nuevo.length ? "Actividad asignada a " + nuevo.join("/") + "." : "Actividad sin asignar.");
  },
  /* Supervisor: editar una actividad POR ASIGNAR (texto, nota, unidad y si sale en el reporte del turno como pendiente) */
  async editarLibre(id) {
    const a = B.estado.actividades.find(x => x.id === id && !x.ini); if (!a) return;
    const r = await ui.modal({ titulo: "Actividad por asignar · ID " + a.id, icono: "editar", ancho: true,
      html: `<div class="campo"><label>Actividad</label><textarea class="inp" id="elTxt" rows="3">${U.esc(a.txt)}</textarea></div>
        <div class="campo"><label>Comentario o nota (opcional)</label><input class="inp" id="elCom" value="${U.esc(a.com || "")}" placeholder="Sale junto a la actividad en la hoja de asignación y en el reporte"></div>
        <div class="campo"><label>Unidad (hoja de asignación)</label>${ui.seg("elUni", ["General", "Unidad 1", "Unidad 2"], { "": "General", U1: "Unidad 1", U2: "Unidad 2" }[a.uni || ""])}</div>
        <label class="chip-ali" style="margin:0"><input type="checkbox" id="elRep" ${a.rep ? "checked" : ""}><span>Mostrar en el <b>reporte del turno</b> como actividad PENDIENTE</span></label>
        <p class="muted peque" style="margin:8px 0 0">En la hoja de asignación siempre aparece mientras no se asigne. En el reporte del turno solo si marcas la casilla.</p>`,
      alAbrir: v => ui.activarSeg(v),
      botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Guardar", c: "verde", v: v => ({ txt: v.querySelector("#elTxt").value.trim(), com: v.querySelector("#elCom").value.trim(), rep: v.querySelector("#elRep").checked,
        uni: { General: "", "Unidad 1": "U1", "Unidad 2": "U2" }[ui.segValor(v.querySelector('[data-seg="elUni"]'))] }) }] });
    if (!r) return;
    if (!r.txt) { ui.toast("La actividad no puede quedar vacía.", "error"); return; }
    await ejecutar(async () => {
      await B.api.op("actividades", "estatus", { id: a.id, est: "Pendiente", txt: r.txt, uni: r.uni, rep: r.rep });
      if (r.com !== (a.com || "")) await B.api.op("actividades", "comentario", { id: a.id, tipo: "com", texto: r.com });
    }, "Actividad actualizada.");
  },
  /* Comentarios de una actividad: cada quien edita o elimina los suyos; el supervisor, los de cualquiera */
  async comentarios(id) {
    const buscar = () => B.dom.todas().find(x => x.id === id);
    let cambio = false;
    const html = () => {
      const a = buscar(); if (!a) return ui.vacio("La actividad ya no existe.");
      const l = B.dom.comentarios(a);
      return `<p style="margin:0 0 4px"><b>${U.esc(a.txt)}</b></p><p class="muted peque" style="margin:0 0 12px">${U.esc(a.ini || "Por asignar")} · ${B.t.corto(a.fecha, a.turno)} · ID ${a.id}${B.dom.esSup() ? " · como supervisor puedes modificar los comentarios de cualquiera" : " · puedes modificar tus propios comentarios"}</p>
        ${l.length ? `<div class="lista">${l.map((c, i) => `<div class="item" style="flex-wrap:wrap;align-items:flex-start" data-c="${i}">
          <div class="cuerpo" style="min-width:240px;flex:1"><div class="meta" style="margin:0 0 4px"><span><b>${U.esc(c.por || "—")}</b></span><span>${c.tipo === "com" ? "comentario de la actividad" : U.esc(c.cuando) + (c.acc ? " · " + U.esc(c.acc.toLowerCase()) : " · comentario de avance")}</span></div>
            ${c.puede ? `<input class="inp" value="${U.esc(c.txt)}" style="padding:7px 10px">` : `<div>${U.esc(c.txt)}</div>`}</div>
          ${c.puede ? `<div style="display:flex;gap:6px;padding-top:20px"><button class="btn chico verde" data-g>${B.ico("ok")} Guardar</button><button class="btn chico fantasma" data-b title="Eliminar comentario">${B.ico("basura")} Eliminar</button></div>` : ""}</div>`).join("")}</div>`
          : ui.vacio("Esta actividad no tiene comentarios.")}`;
    };
    await ui.modal({ titulo: "Comentarios de la actividad", icono: "editar", ancho: true, html: `<div id="comLista">${html()}</div>`, botones: [{ t: "Cerrar", c: "sec", v: null }],
      alAbrir: v => {
        const caja = v.querySelector("#comLista");
        const enlazar = () => caja.querySelectorAll("[data-c]").forEach(it => {
          const c = B.dom.comentarios(buscar())[+it.dataset.c]; if (!c || !c.puede) return;
          const mandar = async texto => {
            try { await B.api.op("actividades", "comentario", { id, tipo: c.tipo, linea: c.linea || "", texto }); await B.api.recargar(); cambio = true; caja.innerHTML = html(); enlazar(); ui.toast(texto ? "Comentario actualizado." : "Comentario eliminado.", "ok", 2500); }
            catch (e) { ui.error(e); }
          };
          it.querySelector("[data-g]").onclick = () => { const t = it.querySelector("input").value.trim(); if (!t) { ui.toast("Escribe el comentario, o usa Eliminar para quitarlo.", "error"); return; } if (t === c.txt) { ui.toast("Sin cambios.", ""); return; } mandar(t); };
          it.querySelector("[data-b]").onclick = async () => { if (await ui.confirmar(`¿Eliminar este comentario?<br><span class="muted">${U.esc(c.txt)}</span>`, "Eliminar comentario", "Eliminar", true)) mandar(""); };
        });
        enlazar();
      } });
    if (cambio) B.app.render();
  },
  async elegirAnterior() {
    const sug = B.estado.sugerencias || [];
    if (!sug.length) { ui.toast("Aún no hay actividades capturadas para reutilizar.", "aviso"); return null; }
    let elegido = null;
    await ui.modal({
      titulo: "Actividades anteriores", icono: "reutilizar", ancho: true,
      html: `<p class="muted peque" style="margin:0 0 10px">Primero aparecen las tuyas, luego las de tus compañeros; de la más frecuente a la menos. Escribe para buscar y haz clic para usarla.</p>
        <div class="buscar campo">${B.ico("buscar")}<input class="inp" id="sBus" placeholder="Buscar (ej. vigilancias, recorrido, reactor)…"></div>
        <div class="lista" id="sLista" style="max-height:52vh;overflow-y:auto"></div>`,
      botones: [{ t: "Cancelar", c: "sec", v: null }],
      alAbrir: v => {
        const pintar = () => {
          const tks = U.norm(v.querySelector("#sBus").value).split(" ").filter(Boolean);
          const l = sug.filter(s => tks.every(k => U.norm(s.t).includes(k))).slice(0, 120);
          v.querySelector("#sLista").innerHTML = l.length ? l.map(s => `<div class="item" style="cursor:pointer" data-i="${sug.indexOf(s)}"><div class="cuerpo"><div class="tit">${U.esc(s.t)}</div></div>
            ${s.mia ? '<span class="badge g">Tuya</span>' : ""}<span class="badge n">${s.n} ${s.n === 1 ? "vez" : "veces"}</span></div>`).join("") : ui.vacio("Sin coincidencias.");
          v.querySelectorAll("#sLista .item").forEach(it => it.onclick = () => { elegido = sug[+it.dataset.i].t; v.querySelector('.modal-pie [data-i="0"]').click(); });
        };
        v.querySelector("#sBus").oninput = pintar;
        pintar();
      }
    });
    return elegido;
  }
};

/* ===================================================================== ESPACIOS CONFINADOS */
V.espacios = {
  titulo: "Espacios confinados",
  EPP: ["Tapón", "Orejera", "Careta facial", "Lentes de seguridad", "Masc. polvos", "Masc. vap. org.", "Masc. humos", "Casco semi-seg.", "Casco", "Arnés", "Arrestador de caídas", "Guantes", "Botas de hule"],
  render(c) {
    const { f, t } = T(), ec = B.dom.ecDelTurno(f, t), cfg = B.estado.config;
    c.innerHTML = `
      <div class="tarjeta" data-tour="ec-form">
        ${cab("escudo", "v", "Registrar liberación", "Cada espacio recibe su # consecutivo del concentrado general. Un registro por espacio y por día (no se duplica).",
          B.dom.esSup() ? `<div class="campo" style="margin:0;min-width:280px" data-tour="ec-asignar"><input class="inp" id="ecCapt" value="${U.esc(this.capt && B.dom.persona(this.capt) ? this.capt + " - " + B.dom.nombre(this.capt) : yo() + " - " + B.dom.nombre(yo()))}" placeholder="Asignar a (técnico que liberó)…"></div>` : "")}
        ${B.dom.esSup() ? `<p class="muted peque" style="margin:-6px 0 10px">Como supervisor puedes <b>asignar el registro a un técnico</b> que no pudo capturarlo: elígelo arriba a la derecha. Queda anotado que tú lo registraste.</p>` : ""}
        <div id="ecT"></div>
        <p class="muted peque">Rangos de referencia: O2 ${cfg.o2Min}–${cfg.o2Max} %, LEL ≤ ${cfg.lelMax} %, CO ≤ ${cfg.coMax} ppm, H2S ≤ ${cfg.h2sMax} ppm. Las lecturas fuera de rango se marcan en rojo.</p>
        <div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">
          <button class="btn sec chico" id="ecMas">${B.ico("mas")} Otro espacio</button>
          <button class="btn verde" id="ecGuardar">${B.ico("ok")} Guardar en concentrado</button></div>
      </div>
      <div class="tarjeta">${cab("lista", "g", "Liberados en este turno", B.t.corto(f, t) + " · " + ec.length + " registro(s)", `<a class="btn chico sec" href="#/concentrados">Concentrado general</a>`)}
        ${ec.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>#</th><th>Espacio</th><th>O2</th><th>HR</th><th>Temp</th><th>LEL</th><th>CO</th><th>H2S</th><th>Liberado</th><th>Personal</th><th>Capturó</th><th>Obs.</th></tr></thead><tbody>
          ${ec.map(e => `<tr style="${B.dom.ecFaltan(e).length ? "background:#FFF7DB" : ""}"><td class="c"><b>${U.esc(B.dom.ecNum(e))}</b></td><td>${U.esc(e.esp)}${B.dom.ecFaltan(e).length ? `<div class="peque" style="color:var(--rojo);font-weight:700">Falta: ${B.dom.ecFaltan(e).join(", ")}</div>` : ""}</td>${["o2", "hr", "temp", "lel", "co", "h2s"].map(k => `<td class="c ${B.dom.rango(k, e[k]) ? "alerta" : ""}">${U.esc(e[k])}</td>`).join("")}
          <td>${U.fh(e.lib)}</td><td>${U.esc(e.pers)}</td><td class="muted peque">${U.esc(e.capt)}${e.regPor ? "<br>registró " + U.esc(e.regPor) : ""}</td><td>${U.esc(e.obs)}</td></tr>`).join("")}</tbody></table></div>` : ui.vacio("Sin liberaciones registradas en este turno.", "escudo")}</div>`;
    const tb = c.querySelector("#ecT");
    const capt = () => (B.dom.esSup() && this.capt && B.dom.persona(this.capt)) ? this.capt : yo();
    if (B.dom.esSup()) ui.combo(c.querySelector("#ecCapt"), { items: () => ui.personas(), alElegir: v => {
      if (!v) return; const antes = capt(); this.capt = U.ini(v);
      tb.querySelectorAll('[data-k="pers"]').forEach(i => { if (!i.value.trim() || U.ini(i.value) === antes) i.value = this.capt; });
    } });
    // Lo capturado en liberaciones anteriores se ofrece para volver a usarlo (lo mas frecuente primero)
    const prev = [...B.estado.ec].sort((a, b) => b.num - a.num);
    const cuenta = vals => { const m = new Map(); for (const v of vals) { const x = String(v || "").trim(); if (!x) continue; const k = U.norm(x); if (!m.has(k)) m.set(k, { t: x, n: 0 }); m.get(k).n++; } return [...m.values()].sort((a, b) => b.n - a.n); };
    const EJ_OBS = "Regla 2 hombres más un observador, hidratación previa, chequeo médico previo";
    const obsPrev = cuenta(prev.map(e => e.obs)).slice(0, 60);
    const obsItems = [...obsPrev.map(o => ({ value: o.t, label: o.t, sub: o.n > 1 ? "usada " + o.n + " veces" : "usada antes" })),
      ...(obsPrev.some(o => U.norm(o.t) === U.norm(EJ_OBS)) ? [] : [{ value: EJ_OBS, label: EJ_OBS, sub: "ejemplo" }])];
    // frases sueltas (separadas por coma) para armar la observacion con toques
    const frases = cuenta([...prev.flatMap(e => String(e.obs || "").split(/[,;]+/)), ...EJ_OBS.split(",")]).filter(o => o.t.length <= 60).slice(0, 8).map(o => o.t);
    const TARJ = [["edif", "Edificio", "TGB"], ["elev", "Elevación", "1.90"], ["equipo", "Equipo", "Caja de agua sur entrada"], ["cuarto", "Cuarto", ""], ["ilum", "Iluminación", "Parcial"], ["ruido", "Ruido (dB)", ""], ["otros", "Otros", ""]];
    const TIEM = [["tLig", "Trabajo ligero", "2 h 30 min"], ["tMod", "Trabajo moderado", "50 min"], ["tPes", "Trabajo pesado", "35 min"], ["tDesc", "Descanso", "30 min"]];
    // listas desplegables de la tarjeta de aviso: valores usados antes + el ejemplo del campo
    const dls = document.createElement("div");
    dls.innerHTML = [...TARJ, ...TIEM].map(([k, , ej]) => { const l = cuenta(prev.map(e => e[k])).slice(0, 25).map(o => o.t); if (ej && !l.some(x => U.norm(x) === U.norm(ej))) l.push(ej);
      return `<datalist id="dlEc_${k}">${l.map(x => `<option value="${U.esc(x)}">`).join("")}</datalist>`; }).join("");
    c.appendChild(dls);
    const fila = () => {
      const tr = document.createElement("div");
      tr.className = "ec-fila";
      tr.innerHTML = `<div class="campo"><label>Espacio confinado</label><input class="inp" data-k="esp" placeholder="Busca o escribe el espacio"></div>
        <div class="campo"><label>Hora en que se liberó · <a href="#" data-ahora title="Poner la hora actual">ahora</a></label><input class="inp tnum h24" type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM (24 h)" autocomplete="off" data-k="hora"></div>
        <div class="campo"><label>Personal TSI</label><input class="inp" data-k="pers" value="${U.esc(capt())}" style="text-transform:uppercase" placeholder="JESC/MAOH"></div>
        <button class="btn fantasma btn-icono quitar" title="Quitar">${B.ico("basura")}</button>
        <div class="campo obs ec-res"><label>Resultado de la prueba</label>${ui.seg("res", ["Liberado", "NO liberado"], "Liberado")}
          <div class="ec-nl oculto">${B.ico("alerta", 'style="width:14px;height:14px;flex:none"')}<span>Se guarda con sus lecturas como <b>NO LIBERADO</b>: no recibe número de espacio confinado ni sale en el reporte de liberados. Queda en <b>Monitoreo de E.C.</b>: ahí se captura la siguiente prueba y se libera solo cuando todos sus parámetros sean satisfactorios.</span></div></div>
        <div class="ec-req"></div>
        <div class="ec-ult"></div>
        <div class="lecturas">${[["o2", "O2 (%)"], ["hr", "HR (%)"], ["temp", "Temp (°C)"], ["lel", "LEL (%)"], ["co", "CO (ppm)"], ["h2s", "H2S (ppm)"]]
          .map(([k, e]) => `<div class="campo"><label>${e}</label><input class="inp tnum" data-k="${k}" inputmode="decimal"></div>`).join("")}</div>
        <div class="campo obs"><label>Observaciones <span style="font-weight:400;text-transform:none;letter-spacing:0">· elige una anterior de la lista, toca las frases o escribe</span></label>
          <input class="inp" data-k="obs" placeholder="Ej. ${U.esc(EJ_OBS)}">
          <div class="ec-frases">${frases.map(x => `<button type="button" class="frase" data-frase="${U.esc(x)}">+ ${U.esc(x)}</button>`).join("")}</div></div>
        <details class="obs tarjeta-aviso"><summary>Datos de la tarjeta de AVISO (opcional): edificio, elevación, equipo, iluminación, ruido, equipo de protección y tiempos de estancia</summary>
          <div class="grid4">${TARJ.map(([k, e, ph]) => `<div class="campo"><label>${e}</label><input class="inp" data-k="${k}" list="dlEc_${k}" placeholder="${ph ? "Ej. " + ph : ""}" autocomplete="off"></div>`).join("")}</div>
          <div class="campo"><label>Equipo de protección requerido</label><div class="chips-ali">${V.espacios.EPP.map(x => `<label class="chip-ali"><input type="checkbox" data-epp="${x}"><span>${x}</span></label>`).join("")}</div></div>
          <div class="campo" style="margin-bottom:0"><label>Tiempo de estancia</label><div class="grid4">${TIEM.map(([k, e, ph]) => `<div class="campo"><label>${e}</label><input class="inp" data-k="${k}" list="dlEc_${k}" placeholder="Ej. ${ph}" autocomplete="off"></div>`).join("")}</div></div>
        </details>`;
      tb.appendChild(tr);
      // se sugiere la lista oficial de espacios confinados (Anexo SI-9974-2) y el catalogo propio; tambien se puede escribir otro
      const req = tr.querySelector(".ec-req"), iEsp = tr.querySelector('[data-k="esp"]');
      const iObs = tr.querySelector('[data-k="obs"]'), cajaUlt = tr.querySelector(".ec-ult");
      // observaciones: lista de las anteriores (mientras escribe se filtra) y frases para agregar con un toque
      ui.combo(iObs, { items: () => obsItems, estricto: false, max: 40 });
      tr.querySelectorAll("[data-frase]").forEach(b => b.onclick = () => {
        const fr = b.dataset.frase, v = iObs.value.trim();
        if (U.norm(v).includes(U.norm(fr))) return;
        const min = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(fr) ? fr.charAt(0).toLowerCase() + fr.slice(1) : fr;      // "Regla 2..." -> "regla 2..." al ir en medio; las siglas o mayusculas se respetan
        iObs.value = v ? v.replace(/[\s,;.]+$/, "") + ", " + min : fr.charAt(0).toUpperCase() + fr.slice(1);
        delete iObs.dataset.valor; b.classList.add("on");
      });
      tr.querySelector("[data-ahora]").onclick = e => { e.preventDefault(); tr.querySelector('[data-k="hora"]').value = U.ahoraISO().slice(11, 16); };
      // si ese espacio ya se libero antes, se ofrece reutilizar sus observaciones y los datos de la tarjeta de aviso
      const alUlt = () => {
        const k = U.norm(iEsp.value), u = k ? prev.find(e => U.norm(e.esp) === k && (e.obs || e.epp || [...TARJ, ...TIEM].some(([x]) => e[x]))) : null;
        if (!u) { cajaUlt.innerHTML = ""; return; }
        cajaUlt.innerHTML = `${B.ico("reutilizar", 'style="width:14px;height:14px;flex:none"')}<span>Este espacio ya se liberó el <b>${U.corta(u.fecha)}</b> (EC #${U.esc(B.dom.ecNum(u))}, ${U.esc(u.pers || u.capt || "")})${u.obs ? ": " + U.esc(u.obs) : ""}</span>
          <button type="button" class="btn chico sec">Usar sus observaciones y tarjeta de aviso</button>`;
        cajaUlt.querySelector("button").onclick = () => {
          if (u.obs) { iObs.value = u.obs; delete iObs.dataset.valor; }
          let n = 0;
          for (const [x] of [...TARJ, ...TIEM]) if (u[x]) { tr.querySelector(`[data-k="${x}"]`).value = u[x]; n++; }
          const epp = String(u.epp || "").split(",").map(z => U.norm(z)).filter(Boolean);
          tr.querySelectorAll("[data-epp]").forEach(ch => { if (epp.includes(U.norm(ch.dataset.epp))) { ch.checked = true; n++; } });
          if (n) tr.querySelector("details.tarjeta-aviso").open = true;
          ui.toast("Datos de la liberación anterior copiados. Las lecturas y la hora se capturan de nuevo.", "ok", 4500);
        };
      };
      const alEsp = () => {
        alUlt();
        const o = B.ecLista.buscar(iEsp.value);
        tr.querySelectorAll(".lecturas label").forEach(l => l.style.fontWeight = "");
        if (!o) { req.innerHTML = ""; return; }
        const pozo = B.ecLista.esPozo(iEsp.value);
        req.innerHTML = `<b>${U.esc(o.edif)}</b> · nivel ${U.esc(o.nivel)} · muestreo requerido: <b>${U.esc(o.reqTxt)}</b>` +
          (pozo ? `<br>Pozo seco: es <b>un solo espacio confinado</b>. Anota la elevación de esta liberación en la tarjeta de aviso; los monitoreos de cada elevación se registran en <b>Monitoreo de E.C.</b>` : "");
        o.campos.forEach(k => { const i = tr.querySelector(`.lecturas [data-k="${k}"]`); if (i) i.parentNode.querySelector("label").style.fontWeight = "800"; });
        const ed = tr.querySelector('[data-k="edif"]'), el = tr.querySelector('[data-k="elev"]');
        // edificio y elevacion se proponen solos (y se actualizan si cambia el espacio, salvo que los hayan escrito a mano)
        if (!ed.value || ed.value === tr._edAuto) { ed.value = o.edif; tr._edAuto = o.edif; }
        if (!el.value || el.value === tr._elAuto) { el.value = pozo ? "" : o.nivel; tr._elAuto = el.value; }
      };
      ui.combo(iEsp, { items: () => B.ecLista.opciones(B.estado.catalogos.espacios), estricto: false, nuevo: true, max: 250, alElegir: () => setTimeout(alEsp, 0) });
      iEsp.addEventListener("change", alEsp);
      tr.querySelectorAll('[data-k="o2"],[data-k="lel"],[data-k="co"],[data-k="h2s"]').forEach(i => i.oninput = () => i.classList.toggle("invalido", B.dom.rango(i.dataset.k, i.value)));
      tr.querySelector(".quitar").onclick = () => { tr.remove(); if (!tb.children.length) fila(); };
      ui.activarSeg(tr.querySelector(".ec-res"), (sg, v) => { const nl = v !== "Liberado"; tr.dataset.nl = nl ? "1" : ""; tr.classList.toggle("ec-noLib", nl); tr.querySelector(".ec-nl").classList.toggle("oculto", !nl);
        tr.querySelector('[data-k="hora"]').closest(".campo").querySelector("label").firstChild.textContent = nl ? "Hora de la prueba · " : "Hora en que se liberó · "; });
    };
    fila();
    c.querySelector("#ecMas").onclick = fila;
    c.querySelector("#ecGuardar").onclick = async () => {
      const items = [], faltan = [], fuera = [];
      [...tb.querySelectorAll(".ec-fila")].forEach((tr, i) => {
        const g = k => tr.querySelector(`[data-k="${k}"]`).value.trim();
        if (!g("esp")) return;
        if (!g("hora")) faltan.push("Renglón " + (i + 1) + ": falta la hora " + (tr.dataset.nl ? "de la prueba" : "de liberación"));
        const it = { ...(tr.dataset.nl ? { noLib: true } : {}), esp: g("esp"), o2: g("o2"), hr: g("hr"), temp: g("temp"), lel: g("lel"), co: g("co"), h2s: g("h2s"), pers: g("pers").toUpperCase(), obs: g("obs") };
        if (g("hora")) it.lib = B.t.fechaHora(f, t, g("hora"));
        for (const k of ["edif", "elev", "equipo", "cuarto", "ilum", "ruido", "otros", "tLig", "tMod", "tPes", "tDesc"]) if (g(k)) it[k] = g(k);
        const epp = [...tr.querySelectorAll("[data-epp]:checked")].map(x => x.dataset.epp); if (epp.length) it.epp = epp.join(", ");
        if (!it.noLib) for (const k of ["o2", "lel", "co", "h2s"]) if (B.dom.rango(k, it[k])) fuera.push(it.esp + ": " + k.toUpperCase() + " = " + it[k]);
        items.push(it);
      });
      if (!items.length) { ui.toast("Captura al menos un espacio confinado.", "error"); return; }
      if (faltan.length) { ui.toast(faltan.join("<br>"), "error"); return; }
      if (fuera.length && !(await ui.confirmar("Valores fuera del rango de referencia:<br><b>" + fuera.map(U.esc).join("<br>") + "</b><br><br>¿Registrar de todos modos?", "Atención", "Registrar", true))) return;
      const ya = items.map(it => B.estado.ec.find(e => e.fecha === f && U.norm(e.esp) === U.norm(it.esp))).filter(Boolean);
      if (ya.some(e => e.noLib)) { ui.toast("Ya está registrado ese día como <b>NO LIBERADO</b>: " + ya.filter(e => e.noLib).map(e => U.esc(e.esp)).join(", ") + ".<br>Entra a <b>Monitoreo de E.C.</b> para capturar la nueva prueba o liberarlo.", "error", 9000); return; }
      if (ya.length) {
        // no se duplica: quien tambien participo se agrega al personal TSI del registro que ya existe
        const mios = ya.filter(e => !B.dom.tokensIni(e.pers).includes(yo()));
        const lista = ya.map(e => "EC #" + U.esc(B.dom.ecNum(e)) + " · " + U.esc(e.esp) + " · " + U.esc(e.pers || e.capt)).join("<br>");
        if (!mios.length) { ui.toast("Ya registrado ese día (no se duplica):<br><b>" + lista + "</b>", "error", 8000); return; }
        if (await ui.confirmar("Ese espacio ya está registrado ese día y <b>no se duplica</b>:<br><b>" + lista + "</b><br><br>¿Participaste en esa liberación? Puedo agregarte al personal TSI de ese registro.", "Espacio ya registrado", "Agregarme"))
          await ejecutar(async () => { for (const e of mios) await B.api.op("ec", "sumarme", { num: e.num }); }, "Quedaste agregado al personal TSI del registro existente.");
        return;
      }
      await ejecutar(() => B.api.op("ec", "crear", { fecha: f, turno: t, items, capt: capt() === yo() ? "" : capt() }),
        r => "Registrado: " + r.nums.map(n => n > 900000 ? "NO LIBERADO NL-" + (n - 900000) : "EC #" + n).join(", ") + (capt() !== yo() ? " · asignado a " + capt() : "") + (r.nums.some(n => n > 900000) ? "<br>Los no liberados quedan en Monitoreo de E.C. hasta que la prueba sea satisfactoria." : ""));
    };
  }
};

/* ===================================================================== VIGILANCIAS */
V.vigilancias = {
  titulo: "Vigilancias contra incendio",
  render(c) {
    const { f, t } = T(), activas = B.estado.vig.filter(v => !v.retiro).sort((a, b) => a.num - b.num);
    c.innerHTML = `
      <div class="cuadricula">
      <div class="tarjeta c7" data-tour="vig-activas">${cab("fuego", "r", "Vigilancias activas", "Aparecen en cada reporte de turno hasta que se registra su retiro.")}
        ${activas.length ? `<div class="lista">${activas.map(v => `<div class="item"><span class="badge r">VIG #${v.num}</span><div class="cuerpo"><div class="tit">${U.esc(v.desc)}</div>
          <div class="meta"><span>${U.esc(v.ubic)}${v.comp ? " / " + U.esc(v.comp) : ""}</span><span>INOP ${U.esc(v.inop)}</span><span>desde ${U.fh(v.inicio)}</span><span>alta: ${U.esc(v.capAlta)}${v.regPor ? " (registró " + U.esc(v.regPor) + ")" : ""}</span></div></div>
          <button class="btn chico dorado" data-ret="${v.num}">Retirar</button></div>`).join("")}</div>` : ui.vacio("No hay vigilancias activas.", "fuego")}</div>
      <div class="tarjeta c5" data-tour="vig-alta">${cab("mas", "d", "Alta de vigilancia", "Al elegirla del catálogo se llenan INOP, ubicación y componente.")}
        <div class="campo"><label>Descripción / vigilancia</label><input class="inp" id="vDesc" placeholder="Busca o escribe la vigilancia"></div>
        <div class="grid2"><div class="campo"><label># de INOP</label><input class="inp" id="vInop"></div><div class="campo"><label>Componente</label><input class="inp" id="vComp"></div></div>
        <div class="campo"><label>Ubicación</label><input class="inp" id="vUbic"></div>
        <div class="grid2"><div class="campo"><label>Fecha de inicio</label><input class="inp" type="date" id="vFecha"></div><div class="campo"><label>Hora de inicio</label><input class="inp tnum h24" type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM (24 h)" autocomplete="off" id="vHora"></div></div>
        <div class="campo"><label>Observaciones</label><input class="inp" id="vObs"></div>
        ${B.dom.esSup() ? `<div class="campo" data-tour="vig-asignar"><label>Asignar a (técnico que dio el alta)</label><input class="inp" id="vCapt" value="${U.esc(yo() + " - " + B.dom.nombre(yo()))}">
          <span class="ayuda">Si el técnico no pudo capturarla, elígelo aquí. No se duplica una vigilancia que sigue activa.</span></div>` : ""}
        <button class="btn verde bloque" id="vGuardar">${B.ico("ok")} Registrar alta</button></div>
      </div>`;
    ui.combo(c.querySelector("#vDesc"), {
      items: () => (B.estado.catalogos.vigilancias || []).map(x => ({ value: x.desc, label: x.desc, sub: [x.inop, x.ubic, x.comp].filter(Boolean).join(" · "), x })),
      estricto: false, nuevo: true,
      alElegir: (v, it) => { if (it && it.x) { for (const k of ["inop", "ubic", "comp"]) { const i = c.querySelector("#v" + k[0].toUpperCase() + k.slice(1)); if (!i.value) i.value = it.x[k] || ""; } } }
    });
    let vCapt = yo();
    if (B.dom.esSup()) ui.combo(c.querySelector("#vCapt"), { items: () => ui.personas(), alElegir: v => { if (v) vCapt = U.ini(v); } });
    c.querySelector("#vHora").onchange = e => { if (!c.querySelector("#vFecha").value && e.target.value) c.querySelector("#vFecha").value = B.t.fechaHora(f, t, e.target.value).slice(0, 10); };
    c.querySelector("#vGuardar").onclick = async () => {
      const g = id => c.querySelector(id).value.trim();
      if (!g("#vDesc")) { ui.toast("Escribe la descripción de la vigilancia.", "error"); return; }
      if (!g("#vHora")) { ui.toast("Captura la hora de inicio.", "error"); return; }
      const inicio = (g("#vFecha") || B.t.fechaHora(f, t, g("#vHora")).slice(0, 10)) + "T" + g("#vHora");
      const dup = B.estado.vig.find(v => !v.retiro && U.norm(v.desc) === U.norm(g("#vDesc")) && U.norm(v.inop || "") === U.norm(g("#vInop")));
      if (dup) { ui.toast(`Esa vigilancia ya está <b>activa</b>: VIG #${dup.num} (alta de ${U.esc(dup.capAlta)}). No se duplica.`, "error", 8000); return; }
      await ejecutar(() => B.api.op("vig", "crear", { fecha: f, turno: t, capt: vCapt === yo() ? "" : vCapt, items: [{ desc: g("#vDesc"), inop: g("#vInop"), ubic: g("#vUbic"), comp: g("#vComp"), obs: g("#vObs"), inicio }] }),
        r => "Vigilancia registrada: VIG #" + r.nums[0] + (vCapt !== yo() ? " · asignada a " + vCapt : ""));
    };
    c.querySelectorAll("[data-ret]").forEach(b => b.onclick = async () => {
      const num = +b.dataset.ret;
      const ahora = U.ahoraISO();
      const r = await ui.modal({
        titulo: "Retirar VIG #" + num, icono: "fuego",
        html: `<div class="grid2"><div class="campo"><label>Fecha de retiro</label><input class="inp" type="date" id="rF" value="${ahora.slice(0, 10)}"></div>
          <div class="campo"><label>Hora de retiro</label><input class="inp tnum h24" type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM (24 h)" autocomplete="off" id="rH" value="${ahora.slice(11, 16)}"></div></div>
          ${B.dom.esSup() ? `<div class="campo" style="margin-bottom:120px"><label>Asignar el retiro a (técnico que la retiró)</label><input class="inp" id="rCapt" value="${U.esc(yo() + " - " + B.dom.nombre(yo()))}"></div>` : ""}`,
        alAbrir: v => { const i = v.querySelector("#rCapt"); if (i) { i.dataset.valor = yo(); ui.combo(i, { items: () => ui.personas() }); } },
        botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Registrar retiro", c: "dorado", v: v => ({ retiro: v.querySelector("#rF").value + "T" + v.querySelector("#rH").value, capt: v.querySelector("#rCapt") ? U.ini((v.querySelector("#rCapt").dataset.valor || v.querySelector("#rCapt").value).split(" - ")[0]) : "" }) }]
      });
      if (r && r.retiro && r.retiro.length >= 16) await ejecutar(() => B.api.op("vig", "retirar", { num, retiro: r.retiro, capt: r.capt && r.capt !== yo() ? r.capt : "" }), "Vigilancia retirada.");
    });
  }
};

/* ===================================================================== PENDIENTES */
V.pendientes = {
  titulo: "Pendientes",
  filtro: "",
  render(c) {
    const sup = B.dom.esSup(), { f, t } = T();
    const grupos = B.dom.pendientesGrupos(sup ? (this.filtro || null) : yo()), lista = grupos.map(g => g.a);
    const inisDe = new Map(grupos.map(g => [g.a.id, B.dom.ordenados(g.inis)]));
    c.innerHTML = `<div class="tarjeta">${cab("reloj", "r", sup ? "Pendientes y actividades en proceso" : "Mis pendientes y actividades en proceso",
      `Las acciones se registran en el turno de trabajo seleccionado (${B.t.corto(f, t)}). Una actividad <b>Concluida</b> deja de aparecer en los siguientes reportes.`,
      sup ? `<div class="campo" style="margin:0;min-width:260px"><input class="inp" id="pFiltro" placeholder="Filtrar por persona" value="${U.esc(this.filtro ? this.filtro + " - " + B.dom.nombre(this.filtro) : "")}"></div>` : "")}
      <div class="lista" data-tour="pend-lista">${lista.length ? lista.map(a => `
        <div class="item" data-id="${a.id}" style="flex-wrap:wrap">
          <div class="cuerpo" style="min-width:260px"><div class="tit">${U.esc(a.txt)}</div>
            <div class="meta"><span><b>${U.esc(inisDe.get(a.id).join("/"))}</b> ${inisDe.get(a.id).length === 1 ? U.esc(B.dom.nombre(a.ini)) : "· compartida: el estatus vale para todos"}</span><span>desde ${B.t.corto(a.fecha, a.turno)}</span><span>ID ${a.id}</span></div>
            ${a.seg ? `<div class="meta" style="color:var(--texto)">${B.ico("historial", 'style="width:13px;height:13px"')} ${U.esc(B.dom.ultimaLinea(a.seg))}</div>` : ""}</div>
          ${ui.estatusBadge(a.est)}
          <div style="display:flex;gap:6px;flex-wrap:wrap;width:100%;margin-top:8px">
            <input class="inp" placeholder="Comentario de avance (opcional)" style="flex:1;min-width:200px;padding:7px 10px">
            <button class="btn chico verde" data-a="Concluida">${B.ico("ok")} Concluida</button>
            <button class="btn chico sec" data-a="En proceso">En proceso</button>
            <button class="btn chico sec" data-a="Pendiente">Pendiente</button>
            <button class="btn chico fantasma" data-a="">Solo comentario</button>
            ${sup ? `<button class="btn chico fantasma" data-reasig="${a.id}" title="Cambiar quién la tiene o dejarla sin asignar">${B.ico("usuarios")} Reasignar</button>` : ""}
            ${B.dom.comentarios(a).length ? `<button class="btn chico fantasma" data-coms="${a.id}" title="Editar o eliminar comentarios">${B.ico("editar")} Comentarios (${B.dom.comentarios(a).length})</button>` : ""}</div>
        </div>`).join("") : ui.vacio("No hay pendientes abiertos. ¡Bien!", "ok")}</div></div>`;
    if (sup) ui.combo(c.querySelector("#pFiltro"), { items: () => ui.personas(null, true), estricto: false, alElegir: v => { V.pendientes.filtro = v && B.dom.persona(v) ? v : ""; B.app.render(); } });
    c.querySelectorAll("button[data-coms]").forEach(b => b.onclick = () => V.actividades.comentarios(+b.dataset.coms));
    c.querySelectorAll("button[data-reasig]").forEach(b => b.onclick = () => V.actividades.reasignar(+b.dataset.reasig));
    c.querySelectorAll(".item[data-id]").forEach(it => it.querySelectorAll("button[data-a]").forEach(b => b.onclick = async () => {
      const a = B.estado.actividades.find(x => x.id === +it.dataset.id), com = it.querySelector("input").value.trim();
      if (B.t.clave(a.fecha, a.turno) > B.t.clave(f, t)) { ui.toast("La actividad es de un turno posterior al turno de trabajo seleccionado. Cambia la fecha/turno arriba.", "error"); return; }
      if (!b.dataset.a && !com) { ui.toast("Escribe un comentario.", "error"); return; }
      await ejecutar(() => B.api.op("actividades", "seguimiento", { id: a.id, accion: b.dataset.a, comentario: com, fecha: f, turno: t }), "Seguimiento registrado.");
    }));
  }
};

/* ===================================================================== HISTORIAL */
V.historial = {
  titulo: "Historial",
  persona: null, d1: null, d2: null,
  render(c) {
    const sup = B.dom.esSup(), p = B.t.primeroUltimo();
    if (!sup || !this.persona) this.persona = sup ? (this.persona || yo()) : yo();
    this.d1 = this.d1 || p.fi; this.d2 = this.d2 || p.ff;
    const r = B.dom.historial(this.persona, this.d1, this.d2);
    const he = r.filter(x => x.tipo === "Horas extra").reduce((s, x) => s + (U.num(x.desc) || 0), 0);
    c.innerHTML = `<div class="tarjeta">${cab("historial", "a", sup ? "Historial por persona" : "Mi historial", "Registro general de actividades, liberaciones, vigilancias y horas extra.",
      `<button class="btn chico sec" id="hImp">${B.ico("imprimir")} Imprimir</button><button class="btn chico" id="hPdf">${B.ico("pdf")} Guardar PDF</button>`)}
      <div class="filtros">${sup ? `<div class="campo" style="min-width:320px" data-tour="hist-persona"><label>Persona (haz clic para ver a todo el personal)</label><input class="inp" id="hPer" value="${U.esc(this.persona + " - " + B.dom.nombre(this.persona))}" placeholder="Busca por iniciales, nombre o RPE…"></div>` : ""}
        <div class="campo"><label>Desde</label><input class="inp" type="date" id="hD1" value="${this.d1}"></div>
        <div class="campo"><label>Hasta</label><input class="inp" type="date" id="hD2" value="${this.d2}"></div></div>
      <div class="cuadricula" style="margin-bottom:16px">
        ${[["Turnos con registro", new Set(r.map(x => x.f + x.t)).size], ["Actividades", r.filter(x => x.tipo === "Actividad").length], ["Espacios confinados", r.filter(x => x.tipo === "Espacio confinado").length], ["Horas extra", U.fmtNum(he)]]
        .map(([e, v]) => `<div class="c3" style="background:#FAF8F6;border-radius:12px;padding:12px 14px"><div class="kpi"><div class="valor tnum" style="font-size:24px">${v}</div><div class="etiqueta">${e}</div></div></div>`).join("")}</div>
      ${r.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Fecha</th><th>Turno</th><th>Tipo</th><th>Descripción</th><th>Estatus</th><th>Ref.</th>${sup ? "<th></th>" : ""}</tr></thead><tbody>
        ${r.map(x => `<tr><td class="tnum">${U.corta(x.f)}</td><td>${x.t}</td><td>${U.esc(x.tipo)}</td><td style="white-space:pre-line">${U.esc(x.desc)}</td><td>${ui.estatusBadge(x.est)}</td><td class="muted">${U.esc(x.ref)}</td>
          ${sup ? `<td class="acc" style="white-space:nowrap">${x.k ? `<button class="btn fantasma btn-icono" data-hk="${U.esc(x.k)}" title="Editar este registro">${B.ico("editar")}</button>` : ""}${x.k && x.k.startsWith("act:") ? `<button class="btn fantasma btn-icono" data-reasig="${x.k.slice(4)}" title="Reasignar o dejar sin asignar">${B.ico("usuarios")}</button>` : ""}</td>` : ""}</tr>`).join("")}</tbody></table></div>`
        : ui.vacio("Sin registros en el periodo.", "historial")}</div>`;
    if (sup) ui.combo(c.querySelector("#hPer"), { items: () => ui.personas(null, true), alElegir: v => { if (v) { V.historial.persona = v; B.app.render(); } } });
    c.querySelector("#hD1").onchange = e => { this.d1 = e.target.value; B.app.render(); };
    c.querySelector("#hD2").onchange = e => { this.d2 = e.target.value; B.app.render(); };
    // supervisor: cada renglon abre el editor de ese tipo de registro
    c.querySelectorAll("[data-reasig]").forEach(b => b.onclick = () => V.actividades.reasignar(+b.dataset.reasig));
    c.querySelectorAll("[data-hk]").forEach(b => b.onclick = () => {
      const [tipo, a1, a2, a3] = b.dataset.hk.split(":");
      if (tipo === "act") return B.editarActividad(+a1);
      if (tipo === "ec" || tipo === "vig") return V.concentrados.editar(tipo, +a1);
      if (tipo === "he") { V.horasextra.ini = this.persona; V.horasextra.f = a1; V.horasextra.t = a2; V.horasextra.tramo = a3; location.hash = "#/horasextra"; }
    });
    const doc = () => B.rep.historial(this.persona, this.d1, this.d2);
    c.querySelector("#hImp").onclick = () => B.rep.imprimir(doc());
    c.querySelector("#hPdf").onclick = e => B.rep.pdf(doc(), e.currentTarget);
  }
};

/* ===================================================================== CONCENTRADOS */
V.concentrados = {
  titulo: "Concentrados generales",
  tab: "ec", d1: "", d2: "", q: "",
  render(c) {
    const sup = B.dom.esSup(), esEC = this.tab === "ec";
    const tks = U.norm(this.q).split(" ").filter(Boolean);
    const enRango = f => (!this.d1 || f >= this.d1) && (!this.d2 || f <= this.d2);
    const base = (esEC ? B.estado.ec : B.estado.vig).filter(x => enRango(x.fecha)).filter(x => !tks.length || tks.every(k => U.norm(Object.values(x).join(" ")).includes(k))).sort((a, b) => a.num - b.num);
    c.innerHTML = `<div class="tarjeta">
      <div class="pestanas"><button data-tab="ec" class="${esEC ? "on" : ""}">Espacios confinados (${B.estado.ec.length})</button><button data-tab="vig" class="${!esEC ? "on" : ""}">Vigilancias C.I. (${B.estado.vig.length})</button></div>
      <div class="filtros" data-tour="conc-filtros">
        <div class="campo"><label>Desde (fecha reporte)</label><input class="inp" type="date" id="cD1" value="${this.d1}"></div>
        <div class="campo"><label>Hasta</label><input class="inp" type="date" id="cD2" value="${this.d2}"></div>
        <div class="campo buscar" style="flex:1;min-width:220px"><label>Buscar</label>${B.ico("buscar", 'style="top:auto;bottom:11px;transform:none"')}<input class="inp" id="cQ" value="${U.esc(this.q)}" placeholder="Espacio, persona, INOP…"></div>
        ${sup ? `<button class="btn sec" id="cCsv">${B.ico("descargar")} Excel (CSV)</button><button class="btn sec" id="cImp">${B.ico("imprimir")} Imprimir</button><button class="btn" id="cPdf">${B.ico("pdf")} PDF</button>` : ""}
      </div>
      <p class="muted peque" style="margin-top:-4px">${base.length} registro(s)${this.d1 || this.d2 ? " en el rango" : ""}. ${sup ? "Como supervisor puedes corregir registros (con el lápiz también el <b># de espacio confinado</b>) o eliminarlos." : "Consulta de solo lectura."}</p>
      <div class="tabla-cont">${esEC ? this.tablaEC(base, sup) : this.tablaVig(base, sup)}</div></div>`;
    c.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { this.tab = b.dataset.tab; B.app.render(); });
    c.querySelector("#cD1").onchange = e => { this.d1 = e.target.value; B.app.render(); };
    c.querySelector("#cD2").onchange = e => { this.d2 = e.target.value; B.app.render(); };
    c.querySelector("#cQ").oninput = U.debounce(e => { this.q = e.target.value; const pos = e.target.selectionStart; B.app.render(); const i = document.getElementById("cQ"); i.focus(); i.setSelectionRange(pos, pos); }, 350);
    if (sup) {
      const doc = () => esEC ? B.rep.concEC(base, this.d1, this.d2) : B.rep.concVig(base, this.d1, this.d2);
      c.querySelector("#cImp").onclick = () => B.rep.imprimir(doc());
      c.querySelector("#cPdf").onclick = e => B.rep.pdf(doc(), e.currentTarget);
      c.querySelector("#cCsv").onclick = () => esEC
        ? U.csv("Concentrado EC " + B.estado.config.proyecto, ["#", "Espacio", "O2", "HR", "Temp", "LEL", "CO", "H2S", "Liberado", "Personal TSI", "Observaciones", "Fecha reporte", "Turno", "Capturó"],
          base.map(e => [B.dom.ecNum(e), e.esp, e.o2, e.hr, e.temp, e.lel, e.co, e.h2s, U.fh(e.lib), e.pers, e.obs, U.corta(e.fecha), e.turno, e.capt]))
        : U.csv("Concentrado vigilancias " + B.estado.config.proyecto, ["#", "Descripción", "Inicio", "INOP", "Ubicación", "Componente", "Retiro", "Estatus", "Observaciones", "Alta", "Retiro por", "Fecha reporte", "Turno"],
          base.map(v => [v.num, v.desc, U.fh(v.inicio), v.inop, v.ubic, v.comp, U.fh(v.retiro), v.est, v.obs, v.capAlta, v.capRet, U.corta(v.fecha), v.turno]));
      c.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => this.editar(esEC ? "ec" : "vig", +b.dataset.ed));
      c.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
        if (await ui.confirmar(`¿Eliminar el registro #${b.dataset.del}? Se recomienda mejor escribir "ANULADO" en observaciones para conservar el consecutivo.`, "Eliminar registro", "Eliminar", true))
          await ejecutar(() => B.api.op(esEC ? "ec" : "vig", "borrar", { num: +b.dataset.del }), "Registro eliminado.");
      });
    }
  },
  tablaEC(l, sup) {
    if (!l.length) return ui.vacio("Sin registros.", "escudo");
    return `<table class="tabla"><thead><tr><th>#</th><th>Espacio confinado</th><th>O2</th><th>HR</th><th>Temp</th><th>LEL</th><th>CO</th><th>H2S</th><th>Día que se liberó</th><th>Personal TSI</th><th>Observaciones</th><th>Reporte</th>${sup ? "<th></th>" : ""}</tr></thead><tbody>
      ${l.map(e => `<tr style="${B.dom.ecFaltan(e).length ? "background:#FFF7DB" : ""}" title="${B.dom.ecFaltan(e).length ? "Falta: " + B.dom.ecFaltan(e).join(", ") : ""}"><td class="c" style="white-space:nowrap"><b>${U.esc(B.dom.ecNum(e))}</b>${B.dom.ecFaltan(e).length ? `<div class="peque" style="color:var(--rojo);font-weight:700">FALTA DATO</div>` : ""}${e.numAnt != null && e.numAnt !== "" ? `<div class="muted peque" title="Número anterior">antes ${U.esc(e.numAnt)}</div>` : ""}</td><td>${U.esc(e.esp)}</td>${["o2", "hr", "temp", "lel", "co", "h2s"].map(k => `<td class="c ${B.dom.rango(k, e[k]) ? "alerta" : ""}">${U.esc(e[k])}</td>`).join("")}
      <td class="tnum">${U.fh(e.lib)}</td><td>${U.esc(e.pers)}</td><td>${U.esc(e.obs)}</td><td class="muted">${B.t.corto(e.fecha, e.turno)}</td>
      ${sup ? `<td class="acc"><button class="btn fantasma btn-icono" data-ed="${e.num}" title="Editar">${B.ico("editar")}</button><button class="btn fantasma btn-icono" data-del="${e.num}" title="Eliminar">${B.ico("basura")}</button></td>` : ""}</tr>`).join("")}</tbody></table>`;
  },
  tablaVig(l, sup) {
    if (!l.length) return ui.vacio("Sin registros.", "fuego");
    return `<table class="tabla"><thead><tr><th>#</th><th>Descripción</th><th>Inicio</th><th>INOP</th><th>Ubicación</th><th>Componente</th><th>Retiro</th><th>Estatus</th><th>Obs.</th>${sup ? "<th></th>" : ""}</tr></thead><tbody>
      ${l.map(v => `<tr><td class="c"><b>${v.num}</b></td><td>${U.esc(v.desc)}</td><td class="tnum">${U.fh(v.inicio)}</td><td>${U.esc(v.inop)}</td><td>${U.esc(v.ubic)}</td><td>${U.esc(v.comp)}</td>
      <td class="tnum">${U.fh(v.retiro)}</td><td>${ui.estatusBadge(v.est)}</td><td>${U.esc(v.obs)}</td>
      ${sup ? `<td class="acc"><button class="btn fantasma btn-icono" data-ed="${v.num}" title="Editar">${B.ico("editar")}</button><button class="btn fantasma btn-icono" data-del="${v.num}" title="Eliminar">${B.ico("basura")}</button></td>` : ""}</tr>`).join("")}</tbody></table>`;
  },
  async editar(col, num) {
    const x = (col === "ec" ? B.estado.ec : B.estado.vig).find(y => y.num === num);
    const campos = col === "ec" ? [["esp", "Espacio"], ["o2", "O2 %"], ["hr", "HR %"], ["temp", "Temp °C"], ["lel", "LEL %"], ["co", "CO ppm"], ["h2s", "H2S ppm"], ["lib", "Liberado (AAAA-MM-DDTHH:MM)"], ["pers", "Personal TSI"], ["obs", "Observaciones"],
        ["edif", "Edificio"], ["elev", "Elevación"], ["equipo", "Equipo"], ["cuarto", "Cuarto"], ["ilum", "Iluminación"], ["ruido", "Ruido (dB)"], ["otros", "Otros"], ["epp", "Equipo de protección"],
        ["tLig", "Estancia trabajo ligero"], ["tMod", "Estancia trabajo moderado"], ["tPes", "Estancia trabajo pesado"], ["tDesc", "Descanso"]]
      : [["desc", "Descripción"], ["inicio", "Inicio (AAAA-MM-DDTHH:MM)"], ["inop", "# INOP"], ["ubic", "Ubicación"], ["comp", "Componente"], ["retiro", "Retiro (AAAA-MM-DDTHH:MM, vacío = activa)"], ["obs", "Observaciones"]];
    const extra = col === "ec" ? `<div class="grid2" style="background:var(--dorado-claro);border-radius:10px;padding:10px 12px 0;margin-bottom:12px">
        <div class="campo"><label># de espacio confinado</label><input class="inp tnum" data-k="numNuevo" type="number" min="1" step="1" value="${x.num}"></div>
        <div class="campo"><label>Marca (PR = pre-recarga; vacío = recarga)</label><input class="inp" data-k="pre" value="${U.esc(x.pre || "")}" maxlength="4" style="text-transform:uppercase" placeholder="vacío"></div></div>
        <p class="muted peque" style="margin:-4px 0 12px">Si cambias el #, no puede repetirse con el de otro espacio. El siguiente registro nuevo toma el número más alto + 1.</p>` : "";
    const r = await ui.modal({
      titulo: (col === "ec" ? "Corregir EC #" + B.dom.ecNum(x) : "Corregir VIG #" + num), icono: "editar",
      html: `${extra}<div class="grid2">${campos.map(([k, e]) => `<div class="campo"><label>${e}</label><input class="inp" data-k="${k}" value="${U.esc(x[k] ?? "")}"></div>`).join("")}</div>`, ancho: true,
      botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Guardar", v: v => { const o = { num }; v.querySelectorAll("[data-k]").forEach(i => o[i.dataset.k] = i.value.trim()); return o; } }]
    });
    if (r && col === "ec" && r.numNuevo && +r.numNuevo !== num && B.estado.ec.some(y => y.num === +r.numNuevo)) { ui.toast("El # " + U.esc(r.numNuevo) + " ya lo tiene otro espacio confinado. Elige otro número.", "error", 7000); return; }
    if (r) await ejecutar(() => B.api.op(col, "actualizar", r), "Registro corregido.");
  }
};
;
/* ---- monitoreo.js ---- */
/* =========================================================================
   BITACORA 24RU1 - MONITOREO DE ESPACIOS CONFINADOS
   - Un espacio liberado sigue ABIERTO hasta que un supervisor registra su cierre.
     Mientras este abierto debe monitorearse al menos una vez por turno.
   - En campo se anota a mano en la bitácora impresa de cada espacio; después se
     transcribe aquí (varios renglones a la vez, cada uno con su fecha y hora real).
   - Cada monitoreo queda guardado (historial); la liberación original no se modifica.
     Los reportes muestran los valores del ÚLTIMO monitoreo de cada espacio.
   ========================================================================= */
"use strict";
V.monitoreo = {
  titulo: "Monitoreo de espacios confinados",
  sub() { return "Al menos un monitoreo por turno en cada espacio que siga liberado · " + B.app.textoTurno(); },
  valores(m) {
    return B.dom.LECT.map(([k, e]) => String(m[k] ?? "").trim() === "" ? "" : `<span class="mon-val ${B.dom.rango(k, m[k]) ? "fuera" : ""}"><b>${e}</b>${U.esc(m[k])}</span>`).join(" ") || `<span class="muted peque">sin lecturas</span>`;
  },
  render(c) {
    const { f, t } = T(), sup = B.dom.esSup(), D = B.dom;
    const seg = D.ecSeguimiento(f, t), faltan = seg.filter(x => !x.ok);
    const noLib = D.ecNoLiberados();
    const cerrados = B.estado.ec.filter(e => e.cierre && !e.noLib).sort((a, b) => String(b.cierre).localeCompare(String(a.cierre))).slice(0, 12);
    c.innerHTML = `
      <div class="tarjeta" data-tour="mon-resumen">${cab("reloj", faltan.length ? "r" : "v", `Espacios que siguen liberados (${seg.length})`,
        seg.length ? (faltan.length ? `<b style="color:var(--rojo)">${faltan.length} sin monitoreo</b> en ${B.t.corto(f, t)} · ${seg.length - faltan.length} ya monitoreados en el turno.` : `Todos tienen monitoreo en ${B.t.corto(f, t)}.`)
          : "No hay espacios confinados abiertos a esta fecha.",
        `${sup && seg.length ? `<button class="btn sec" id="mnBitTodas" title="Hojas en blanco para anotar a mano en campo">${B.ico("imprimir")} Bitácoras para llenar (${seg.length})</button>` : ""}
         ${sup && seg.length ? `<button class="btn sec" id="mnCerrarVarios">${B.ico("ok")} Cerrar varios…</button>` : ""}`)}
        <div class="aviso a">${B.ico("info")}<div>En campo anota cada monitoreo <b>a mano</b> en la bitácora impresa del espacio${sup ? "" : " (te la entrega el supervisor)"}. Al terminar el turno transcríbelos con <b>Capturar monitoreos</b>, cada uno con su fecha y hora real.
          El espacio sigue abierto hasta que un <b>supervisor</b> registra su cierre.</div></div>
        <div class="lista" data-tour="mon-lista">${seg.length ? seg.map(({ e, u, ok, elevs }) => `
          <div class="item" data-num="${e.num}" style="flex-wrap:wrap;align-items:flex-start">
            <div class="cuerpo" style="min-width:240px;flex:1">
              <div class="tit">EC #${U.esc(D.ecNum(e))} · ${U.esc(e.esp)}</div>
              <div class="meta"><span>liberado ${e.lib ? U.fh(e.lib) : U.corta(e.fecha) + " " + U.esc(e.turno)}</span><span>${U.esc(e.pers || e.capt || "")}</span><span>${(e.mon || []).length} monitoreo(s) después de la liberación</span></div>
              ${elevs.length ? elevs.map(x => `<div class="meta" style="color:var(--texto);margin-top:5px;gap:6px;flex-wrap:wrap"><span class="badge ${x.ok ? "v" : "r"}">Elev. ${U.esc(x.elev || "sin anotar")}${x.ok ? "" : " · falta"}</span><span>${U.fh(x.u.fh)}${x.u.lib ? " (liberación)" : ""} · ${U.esc(x.u.pers)}</span>${this.valores(x.u)}</div>`).join("")
                : `<div class="meta" style="color:var(--texto);margin-top:5px;gap:6px;flex-wrap:wrap"><span><b>Último:</b> ${U.fh(u.fh)}${u.lib ? " (liberación)" : ""} · ${U.esc(u.pers)}</span>${this.valores(u)}</div>`}
            </div>
            <span class="badge ${ok ? "v" : "r"}" style="margin-top:2px">${ok ? "Monitoreado en " + B.t.corto(f, t) : "Falta en " + B.t.corto(f, t)}</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;width:100%;margin-top:8px">
              <button class="btn chico verde" data-a="cap">${B.ico("mas")} Capturar monitoreos</button>
              <button class="btn chico sec" data-a="his">${B.ico("historial")} Historial (${D.ecMons(e).length})</button>
              ${sup ? `<button class="btn chico sec" data-a="bit">${B.ico("imprimir")} Bitácora</button>` : ""}
              ${sup ? `<button class="btn chico fantasma" data-a="cer">${B.ico("ok")} Cerrar espacio</button>` : ""}
            </div>
          </div>`).join("") : ui.vacio("Sin espacios confinados abiertos.", "escudo")}</div>
      </div>
      ${noLib.length ? `<div class="tarjeta" data-tour="mon-nolib">${cab("alerta", "r", `Espacios NO LIBERADOS (${noLib.length})`, "La prueba no fue satisfactoria. Sus lecturas quedan guardadas, pero no cuentan ni salen en el reporte de liberados. Se <b>liberan solos</b> al capturar una prueba con todos sus parámetros satisfactorios" + (sup ? "; como supervisor también puedes liberarlos manualmente." : "."))}
        <div class="lista">${noLib.map(e => { const u = D.ecUltimoMon(e); return `<div class="item" data-num="${e.num}" style="flex-wrap:wrap;align-items:flex-start">
          <div class="cuerpo" style="min-width:240px;flex:1"><div class="tit">${U.esc(D.ecNum(e))} · ${U.esc(e.esp)}</div>
            <div class="meta"><span>primera prueba ${e.lib ? U.fh(e.lib) : U.corta(e.fecha)}</span><span>${U.esc(e.pers || e.capt || "")}</span><span>${D.ecMons(e).length} prueba(s)</span></div>
            <div class="meta" style="color:var(--texto);margin-top:5px;gap:6px;flex-wrap:wrap"><span><b>Última prueba:</b> ${U.fh(u.fh)} · ${U.esc(u.pers)}</span>${this.valores(u)}</div>
            ${u.obs ? `<div class="meta">${U.esc(u.obs)}</div>` : ""}</div>
          <span class="badge r" style="margin-top:2px">NO LIBERADO</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap;width:100%;margin-top:8px">
            <button class="btn chico verde" data-a="cap">${B.ico("mas")} Capturar otra prueba</button>
            ${sup ? `<button class="btn chico sec" data-a="lib" title="Solo supervisores">${B.ico("ok")} Liberar manualmente</button>` : ""}
            <button class="btn chico sec" data-a="his">${B.ico("historial")} Historial (${D.ecMons(e).length})</button></div></div>`; }).join("")}</div></div>` : ""}
      ${cerrados.length ? `<div class="tarjeta">${cab("ok", "g", "Espacios cerrados recientemente", "Ya no requieren monitoreo. Su historial se conserva.")}
        <div class="lista">${cerrados.map(e => `<div class="item" data-num="${e.num}" style="flex-wrap:wrap"><div class="cuerpo" style="min-width:220px"><div class="tit" style="font-weight:600">EC #${U.esc(D.ecNum(e))} · ${U.esc(e.esp)}</div>
          <div class="meta"><span>liberado ${e.lib ? U.fh(e.lib) : U.corta(e.fecha)}</span><span>cerrado ${U.fh(e.cierre)} por ${U.esc(e.cerro || "")}</span><span>${(e.mon || []).length} monitoreo(s)</span></div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn chico sec" data-a="his">${B.ico("historial")} Historial</button>${sup ? `<button class="btn chico sec" data-a="bitc">${B.ico("imprimir")} Bitácora</button>` : ""}
          ${sup ? `<button class="btn chico fantasma" data-a="rea">Reabrir</button>` : ""}</div></div>`).join("")}</div></div>` : ""}`;
    const ec = n => B.estado.ec.find(x => +x.num === +n);
    c.querySelectorAll(".item[data-num] [data-a]").forEach(b => b.onclick = async () => {
      const e = ec(b.closest("[data-num]").dataset.num); if (!e) return;
      const a = b.dataset.a;
      if (a === "cap") return this.capturar(e);
      if (a === "lib") return this.liberar(e);
      if (a === "his") return this.historial(e.num);
      if (a === "bit") return this.imprimir([e], b);
      if (a === "bitc") return B.rep.pdf(B.rep.ecBitacora([e]), b);
      if (a === "cer") return this.cerrar([e]);
      if (a === "rea") { if (await ui.confirmar(`¿Reabrir el <b>EC #${U.esc(D.ecNum(e))} · ${U.esc(e.esp)}</b>? Volverá a requerir un monitoreo por turno.`, "Reabrir espacio", "Reabrir")) await ejecutar(() => B.api.op("ec", "reabrir", { num: e.num }), "Espacio reabierto."); }
    });
    const bt = c.querySelector("#mnBitTodas"); if (bt) bt.onclick = () => this.imprimir(seg.map(x => x.e), bt);
    const bc = c.querySelector("#mnCerrarVarios"); if (bc) bc.onclick = () => this.cerrar(null, seg.map(x => x.e));
  },
  // Bitácora para llenar a mano: en blanco (solo la liberación) o con los monitoreos ya capturados
  async imprimir(lista, boton) {
    const r = await ui.modal({ titulo: "Bitácora de monitoreo" + (lista.length > 1 ? " (" + lista.length + " espacios)" : ""), icono: "imprimir",
      html: `<p style="margin:0;line-height:1.55">Una hoja por espacio, con sus datos y una tabla para anotar <b>a mano</b> fecha, hora, lecturas e iniciales.</p>`,
      botones: [{ t: "Cancelar", c: "fantasma", v: null }, { t: "Con lo ya capturado", c: "sec", v: "con" }, { t: "En blanco, para llenar", c: "verde", v: "blanco" }] });
    if (!r) return;
    const doc = B.rep.ecBitacora(lista, r === "blanco");
    if (B.modoLocal) B.rep.imprimir(doc); else B.rep.pdf(doc, boton);
  },
  /* Transcripción de la hoja: varios monitoreos del mismo espacio, cada uno con su fecha y hora */
  async capturar(e) {
    const D = B.dom, of = B.ecLista.buscar(e.esp), req = of ? of.campos : D.LECT.map(x => x[0]), u = D.ecUltimoMon(e);
    const hoy = U.iso(new Date()), pozo = D.ecPorElev(e), elevs = pozo ? D.ecElevs(e).filter(Boolean) : [];
    // valores del ultimo monitoreo (o de la liberacion): vienen ya escritos para solo corregir lo que cambio
    const previo = el => { const l = D.ecMons(e).filter(m => !pozo || !el || U.norm(m.elev || "") === U.norm(el)); return l.length ? l[l.length - 1] : (pozo ? null : u); };
    const lectDe = m => D.LECT.map(([k]) => String((m && m[k]) ?? "").trim());
    // observaciones usadas antes (liberaciones y monitoreos), las mas frecuentes primero
    const cnt = new Map();
    for (const x of B.estado.ec) for (const t of [x.obs, ...(x.mon || []).map(m => m.obs)]) { const v = String(t || "").trim(); if (!v) continue; const k = U.norm(v); if (!cnt.has(k)) cnt.set(k, { t: v, n: 0 }); cnt.get(k).n++; }
    const obsItems = [...cnt.values()].sort((a, b) => b.n - a.n).slice(0, 60).map(o => ({ value: o.t, label: o.t, sub: o.n > 1 ? "usada " + o.n + " veces" : "usada antes" }));
    const fila = (fe, pe, m, el) => { const v = lectDe(m);
      return `<div class="mon-fila" data-pre="${U.esc(JSON.stringify(v))}">
      ${pozo ? `<div class="campo obs"><label style="font-weight:800">Elevación (pozo seco)</label><input class="inp" data-k="elev" list="mnElevs" placeholder="Ej. 10.15" autocomplete="off" value="${U.esc(el || "")}"></div>` : ""}
      <div class="campo"><label>Fecha</label><input class="inp" type="date" data-k="f" value="${fe || hoy}" max="${hoy}"></div>
      <div class="campo"><label>Hora (24 h)</label><input class="inp tnum h24" data-k="h" type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" autocomplete="off"></div>
      <div class="campo"><label>Iniciales</label><input class="inp" data-k="pers" value="${U.esc(pe || yo())}" style="text-transform:uppercase"></div>
      <button class="btn fantasma btn-icono quitar" title="Quitar renglón">${B.ico("basura")}</button>
      <div class="lecturas">${D.LECT.map(([k, et], n) => `<div class="campo"><label style="${req.includes(k) ? "font-weight:800" : ""}">${et}</label><input class="inp tnum" data-k="${k}" inputmode="decimal" value="${U.esc(v[n])}"></div>`).join("")}</div>
      <div class="campo obs"><label>Observaciones <span style="font-weight:400;text-transform:none;letter-spacing:0">· elige una anterior o escribe</span></label><input class="inp" data-k="obs"></div></div>`; };
    const el0 = pozo ? String(u.elev || elevs[0] || "") : "";
    let items = null;
    await ui.modal({ titulo: `Capturar monitoreos · EC #${U.esc(D.ecNum(e))}`, icono: "reloj", ancho: true,
      html: `<p style="margin:0 0 4px"><b>${U.esc(e.esp)}</b></p>
        <p class="muted peque" style="margin:0 0 10px">Liberado ${e.lib ? U.fh(e.lib) : U.corta(e.fecha)} · último monitoreo ${U.fh(u.fh)} (${U.esc(u.pers)})${of ? " · muestreo requerido: <b>" + U.esc(of.reqTxt) + "</b>" : ""}.
          Las lecturas vienen con los valores del <b>último monitoreo</b>: anota la hora y corrige solo lo que cambió.</p>
        ${e.noLib ? `<div class="aviso v" style="margin-bottom:10px">${B.ico("ok")}<div>Este espacio está <b>NO LIBERADO</b>. Si en esta prueba todas las lecturas requeridas están capturadas y dentro de rango, se <b>libera automáticamente</b> y recibe su número.</div></div>` : ""}
        ${pozo ? `<div class="aviso d" style="margin-bottom:10px">${B.ico("info")}<div>El pozo seco es <b>un solo espacio confinado</b>: captura un renglón por cada <b>elevación</b> monitoreada. Al elegir la elevación se cargan sus últimos valores.</div></div><datalist id="mnElevs">${elevs.map(x => `<option value="${U.esc(x)}">`).join("")}</datalist>` : ""}
        <div id="mnFilas">${fila(null, null, previo(el0), el0)}</div>
        <button class="btn sec chico" id="mnMas">${B.ico("mas")} Otro renglón</button>`,
      botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Guardar monitoreos", c: "verde", v: true, antes: async v => {
        const l = [], fuera = [];
        for (const tr of v.querySelectorAll(".mon-fila")) {
          const g = k => tr.querySelector(`[data-k="${k}"]`).value.trim();
          const lect = D.LECT.map(([k]) => g(k)), sinTocar = JSON.stringify(lect) === tr.dataset.pre;
          if (!g("h") && !g("obs") && (sinTocar || lect.every(x => !x))) continue;          // renglon que no se uso
          const h = U.hora24(g("h"));
          if (!g("f") || !h) { ui.toast("Cada renglón necesita su fecha y su hora (24 h).", "error"); tr.querySelector('[data-k="h"]').focus(); return false; }
          if (lect.every(x => !x)) { ui.toast("Anota al menos una lectura en el renglón de las " + h + ".", "error"); return false; }
          if (pozo && !g("elev")) { ui.toast("Pozo seco: anota la elevación del monitoreo de las " + h + ".", "error"); return false; }
          const it = { fh: g("f") + "T" + h, pers: U.ini(g("pers")) || yo(), obs: g("obs"), ...(pozo ? { elev: g("elev") } : {}) };
          D.LECT.forEach(([k], n) => { it[k] = lect[n]; if (D.rango(k, lect[n])) fuera.push(h + " · " + k.toUpperCase() + " = " + lect[n]); });
          l.push(it);
        }
        if (!l.length) { ui.toast("Anota la hora de al menos un monitoreo.", "error"); return false; }
        if (fuera.length && !(await ui.confirmar("Valores fuera del rango de referencia:<br><b>" + fuera.map(U.esc).join("<br>") + "</b><br><br>¿Registrar de todos modos?", "Atención", "Registrar", true))) return false;
        items = l;
      } }],
      alAbrir: v => {
        const caja = v.querySelector("#mnFilas");
        const poner = (tr, m) => { const x = lectDe(m); D.LECT.forEach(([k], n) => { const i = tr.querySelector(`[data-k="${k}"]`); i.value = x[n]; i.classList.toggle("invalido", D.rango(k, x[n])); }); tr.dataset.pre = JSON.stringify(x); };
        const enlazar = () => caja.querySelectorAll(".mon-fila").forEach(tr => {
          if (tr._listo) return; tr._listo = true;
          tr.querySelector(".quitar").onclick = () => { if (caja.children.length > 1) tr.remove(); };
          tr.querySelectorAll('[data-k="o2"],[data-k="lel"],[data-k="co"],[data-k="h2s"]').forEach(i => { i.oninput = () => i.classList.toggle("invalido", D.rango(i.dataset.k, i.value)); i.oninput(); });
          ui.combo(tr.querySelector('[data-k="obs"]'), { items: () => obsItems, estricto: false, max: 40 });
          // pozo seco: al elegir la elevacion se cargan sus ultimos valores (si el renglon no se ha modificado a mano)
          const ie = tr.querySelector('[data-k="elev"]');
          if (ie) ie.addEventListener("change", () => { const act = JSON.stringify(D.LECT.map(([k]) => tr.querySelector(`[data-k="${k}"]`).value.trim())); if (act === tr.dataset.pre) poner(tr, previo(ie.value.trim())); });
        });
        v.querySelector("#mnMas").onclick = () => {
          const ult = caja.lastElementChild, d = document.createElement("div"), g = k => { const i = ult.querySelector(`[data-k="${k}"]`); return i ? i.value.trim() : ""; };
          // el renglon nuevo arranca con lo del renglon anterior (misma fecha, iniciales y valores)
          const m = {}; D.LECT.forEach(([k]) => m[k] = g(k));
          d.innerHTML = fila(g("f"), g("pers"), pozo ? null : m, "");
          caja.appendChild(d.firstElementChild); enlazar(); caja.lastElementChild.querySelector(pozo ? '[data-k="elev"]' : '[data-k="h"]').focus();
        };
        enlazar();
        setTimeout(() => { const h = caja.querySelector('[data-k="h"]'); if (h) h.focus(); }, 80);
      } });
    if (!items) return;
    await ejecutar(() => B.api.op("ec", "monitoreo", { num: e.num, items, req }),
      r => (r.liberado ? `<b>Prueba satisfactoria: el espacio quedó LIBERADO como EC #${r.liberado}</b> · ${U.esc(e.esp)}.<br>` : e.noLib ? `Prueba guardada. El espacio sigue <b>NO LIBERADO</b>${r.aviso ? ": " + U.esc(r.aviso) : " (hay lecturas fuera de rango o faltan lecturas requeridas)"}.<br>` : "") + `${r.n} registro(s) guardados en ${U.esc(D.ecNum(e))}.` + (r.repetidos && r.repetidos.length ? `<br>${r.repetidos.length} ya estaban capturados (misma fecha y hora) y no se duplicaron.` : ""));
  },
  /* Historial completo de un espacio: liberación + todos los monitoreos; corrige o elimina quien lo capturó o un supervisor */
  async historial(num) {
    const D = B.dom, sup = D.esSup(), yoI = yo(), buscar = () => B.estado.ec.find(x => +x.num === +num);
    let cambio = false;
    const html = () => {
      const e = buscar(); if (!e) return ui.vacio("El registro ya no existe.");
      const l = D.ecMons(e).slice().reverse();
      return `<p style="margin:0 0 2px"><b>EC #${U.esc(D.ecNum(e))} · ${U.esc(e.esp)}</b></p>
        <p class="muted peque" style="margin:0 0 10px">${e.noLib ? "NO LIBERADO" : e.cierre ? "Cerrado " + U.fh(e.cierre) + " por " + U.esc(e.cerro || "") : "Sigue liberado"} · ${l.length} registro(s), del más reciente al más antiguo</p>
        <div class="lista">${l.map(m => { const puede = !m.lib && (sup || U.ini(m.capt) === yoI || D.tokensIni(m.pers).includes(yoI));
          return `<div class="item" style="flex-wrap:wrap;align-items:flex-start" data-id="${m.id}" data-fh="${U.esc(m.fh)}"><div class="cuerpo" style="min-width:220px;flex:1">
            <div class="tit" style="font-weight:600">${U.fh(m.fh)} · ${U.esc(m.pers)} ${m.elev ? `<span class="badge n">Elev. ${U.esc(m.elev)}</span>` : ""} ${m.lib ? (e.noLib ? '<span class="badge r">No liberado</span>' : '<span class="badge d">Liberación</span>') : m.nl ? '<span class="badge r">No liberado</span>' : ""}</div>
            <div class="meta" style="color:var(--texto);gap:6px;flex-wrap:wrap;margin-top:4px">${this.valores(m)}</div>
            ${m.obs ? `<div class="meta">${U.esc(m.obs)}</div>` : ""}${!m.lib && m.capt && U.ini(m.capt) !== U.ini(m.pers) ? `<div class="meta"><span>transcribió ${U.esc(m.capt)}</span></div>` : ""}</div>
            ${puede ? `<div style="display:flex;gap:6px"><button class="btn chico sec" data-e>${B.ico("editar")} Corregir</button><button class="btn chico fantasma" data-b>${B.ico("basura")}</button></div>` : ""}</div>`; }).join("")}</div>`;
    };
    await ui.modal({ titulo: "Historial de monitoreo", icono: "historial", ancho: true, html: `<div id="mnHis">${html()}</div>`, botones: [{ t: "Cerrar", c: "sec", v: null }],
      alAbrir: v => {
        const caja = v.querySelector("#mnHis");
        const pintar = async () => { await B.api.recargar(); cambio = true; caja.innerHTML = html(); enlazar(); };
        const enlazar = () => caja.querySelectorAll("[data-id]").forEach(it => {
          const e = buscar(), m = (e.mon || []).find(x => +x.id === +it.dataset.id && x.fh === it.dataset.fh); if (!m) return;
          const be = it.querySelector("[data-e]"), bb = it.querySelector("[data-b]");
          if (bb) bb.onclick = async () => { if (!(await ui.confirmar(`¿Eliminar el monitoreo del <b>${U.fh(m.fh)}</b> (${U.esc(m.pers)})?`, "Eliminar monitoreo", "Eliminar", true))) return;
            try { await B.api.op("ec", "monEditar", { num, id: m.id, fhOrig: m.fh, borrar: true }); await pintar(); ui.toast("Monitoreo eliminado.", "ok", 2500); } catch (x) { ui.error(x); } };
          if (be) be.onclick = async () => {
            const r = await ui.modal({ titulo: "Corregir monitoreo", icono: "editar", ancho: true,
              html: `<div class="mon-fila" style="border:0;padding:0"><div class="campo"><label>Fecha</label><input class="inp" type="date" id="mcF" value="${m.fh.slice(0, 10)}"></div>
                <div class="campo"><label>Hora (24 h)</label><input class="inp tnum h24" id="mcH" value="${m.fh.slice(11, 16)}" maxlength="5" inputmode="numeric"></div>
                <div class="campo"><label>Iniciales</label><input class="inp" id="mcP" value="${U.esc(m.pers)}" style="text-transform:uppercase"></div><span></span>
                <div class="lecturas">${D.LECT.map(([k, et]) => `<div class="campo"><label>${et}</label><input class="inp tnum" data-k="${k}" value="${U.esc(m[k] ?? "")}" inputmode="decimal"></div>`).join("")}</div>
                ${D.ecPorElev(e) ? `<div class="campo obs"><label>Elevación (pozo seco)</label><input class="inp" id="mcE" value="${U.esc(m.elev || "")}"></div>` : ""}
                <div class="campo obs"><label>Observaciones</label><input class="inp" id="mcO" value="${U.esc(m.obs || "")}"></div></div>`,
              botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Guardar", c: "verde", v: w => { const o = { fh: w.querySelector("#mcF").value + "T" + (U.hora24(w.querySelector("#mcH").value) || ""), pers: U.ini(w.querySelector("#mcP").value), obs: w.querySelector("#mcO").value.trim(), ...(w.querySelector("#mcE") ? { elev: w.querySelector("#mcE").value.trim() } : {}) };
                w.querySelectorAll("[data-k]").forEach(i => o[i.dataset.k] = i.value.trim()); return o; } }] });
            if (!r) return;
            try { await B.api.op("ec", "monEditar", { num, id: m.id, fhOrig: m.fh, ...r }); await pintar(); ui.toast("Monitoreo corregido.", "ok", 2500); } catch (x) { ui.error(x); }
          };
        });
        enlazar();
      } });
    if (cambio) B.app.render();
  },
  /* La prueba ya fue satisfactoria: el espacio NO LIBERADO se libera con las lecturas nuevas y recibe su numero consecutivo */
  async liberar(e) {
    const D = B.dom, u = D.ecUltimoMon(e), ahora = U.ahoraISO(), of = B.ecLista.buscar(e.esp), req = of ? of.campos : D.LECT.map(x => x[0]);
    const r = await ui.modal({ titulo: "Liberar espacio confinado · " + U.esc(D.ecNum(e)), icono: "ok", ancho: true,
      html: `<p style="margin:0 0 4px"><b>${U.esc(e.esp)}</b></p>
        <p class="muted peque" style="margin:0 0 10px">Última prueba (no satisfactoria): ${U.fh(u.fh)} · ${U.esc(u.pers)}. Captura las lecturas de la prueba <b>satisfactoria</b>${of ? " · muestreo requerido: <b>" + U.esc(of.reqTxt) + "</b>" : ""}.</p>
        <div class="mon-fila" style="border:0;padding:0"><div class="campo"><label>Fecha de liberación</label><input class="inp" type="date" id="lbF" value="${ahora.slice(0, 10)}" max="${ahora.slice(0, 10)}"></div>
          <div class="campo"><label>Hora (24 h)</label><input class="inp tnum h24" id="lbH" value="${ahora.slice(11, 16)}" maxlength="5" inputmode="numeric"></div>
          <div class="campo"><label>Personal TSI</label><input class="inp" id="lbP" value="${U.esc(yo())}" style="text-transform:uppercase"></div><span></span>
          <div class="lecturas">${D.LECT.map(([k, et]) => `<div class="campo"><label style="${req.includes(k) ? "font-weight:800" : ""}">${et}</label><input class="inp tnum" data-k="${k}" inputmode="decimal"></div>`).join("")}</div>
          <div class="campo obs"><label>Observaciones</label><input class="inp" id="lbO"></div></div>
        <p class="muted peque" style="margin:8px 0 0">Al liberarlo recibe su número consecutivo de espacio confinado y sale en el reporte del turno de esa fecha y hora. Las pruebas anteriores se conservan en su historial.</p>`,
      alAbrir: v => v.querySelectorAll('[data-k="o2"],[data-k="lel"],[data-k="co"],[data-k="h2s"]').forEach(i => i.oninput = () => i.classList.toggle("invalido", D.rango(i.dataset.k, i.value))),
      botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Liberar espacio", c: "verde", v: v => { const o = { lib: v.querySelector("#lbF").value + "T" + (U.hora24(v.querySelector("#lbH").value) || ""), pers: U.ini(v.querySelector("#lbP").value), obs: v.querySelector("#lbO").value.trim() };
        v.querySelectorAll("[data-k]").forEach(i => o[i.dataset.k] = i.value.trim()); return o; } }] });
    if (!r) return;
    if (r.lib.length !== 16) { ui.toast("Captura la fecha y la hora de liberación (24 h).", "error"); return; }
    const falt = req.filter(k => !r[k]); if (falt.length) { ui.toast("Faltan lecturas de la prueba satisfactoria: " + falt.map(k => k.toUpperCase()).join(", ") + ".", "error"); return; }
    const fuera = D.LECT.filter(([k]) => D.rango(k, r[k])).map(([k, et]) => et + " = " + r[k]);
    if (fuera.length && !(await ui.confirmar("Hay valores <b>fuera del rango</b> de referencia:<br><b>" + fuera.map(U.esc).join("<br>") + "</b><br><br>Si la prueba no fue satisfactoria, cancela y usa «Capturar otra prueba».", "¿Liberar con valores fuera de rango?", "Liberar de todos modos", true))) return;
    await ejecutar(() => B.api.op("ec", "liberar", { num: e.num, ...r }), x => `Espacio liberado: <b>EC #${x.num}</b> · ${U.esc(e.esp)}.`);
  },
  /* Supervisor: cierre de uno o varios espacios (dejan de requerir monitoreo) */
  async cerrar(lista, opciones) {
    const D = B.dom, ahora = U.ahoraISO(), varios = !lista;
    const r = await ui.modal({ titulo: varios ? "Cerrar espacios confinados" : `Cerrar EC #${U.esc(D.ecNum(lista[0]))}`, icono: "ok", ancho: varios,
      html: `${varios ? `<p class="muted peque" style="margin:0 0 8px">Marca los espacios que <b>ya no están liberados</b>. <a href="#" id="mcTodos">Marcar todos</a> · <a href="#" id="mcNing">Ninguno</a></p>
          <div class="lista" style="max-height:42vh;overflow-y:auto;margin-bottom:12px">${opciones.map(e => `<label class="item" style="cursor:pointer"><input type="checkbox" data-n="${e.num}" style="width:18px;height:18px;accent-color:var(--guinda)">
            <div class="cuerpo"><div class="tit" style="font-weight:600">EC #${U.esc(D.ecNum(e))} · ${U.esc(e.esp)}</div><div class="meta"><span>liberado ${e.lib ? U.fh(e.lib) : U.corta(e.fecha)}</span><span>último monitoreo ${U.fh(D.ecUltimoMon(e).fh)}</span></div></div></label>`).join("")}</div>`
          : `<p style="margin:0 0 10px"><b>${U.esc(lista[0].esp)}</b><br><span class="muted peque">Al cerrarlo deja de requerir monitoreo. Su historial se conserva y se puede reabrir.</span></p>`}
        <div class="grid2"><div class="campo"><label>Fecha de cierre</label><input class="inp" type="date" id="mcF" value="${ahora.slice(0, 10)}"></div>
          <div class="campo"><label>Hora de cierre (24 h)</label><input class="inp tnum h24" id="mcH" value="${ahora.slice(11, 16)}" maxlength="5" inputmode="numeric"></div></div>`,
      alAbrir: v => { const todos = x => v.querySelectorAll("[data-n]").forEach(i => i.checked = x);
        const a = v.querySelector("#mcTodos"), b = v.querySelector("#mcNing"); if (a) a.onclick = e => { e.preventDefault(); todos(true); }; if (b) b.onclick = e => { e.preventDefault(); todos(false); }; },
      botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Registrar cierre", c: "verde", v: v => ({ nums: varios ? [...v.querySelectorAll("[data-n]:checked")].map(i => +i.dataset.n) : [lista[0].num], cierre: v.querySelector("#mcF").value + "T" + (U.hora24(v.querySelector("#mcH").value) || "") }) }] });
    if (!r) return;
    if (!r.nums.length) { ui.toast("Marca al menos un espacio.", "error"); return; }
    if (r.cierre.length !== 16) { ui.toast("Captura la fecha y la hora de cierre (24 h).", "error"); return; }
    await ejecutar(() => B.api.op("ec", "cerrar", r), x => `${x.n} espacio(s) cerrados.`);
  }
};
;
/* ---- vistas_sup.js ---- */
/* =========================================================================
   BITACORA 24RU1 - Vistas del supervisor
   ========================================================================= */
"use strict";

/* ===================================================================== DATOS DEL TURNO */
V.turno = {
  titulo: "Datos del turno", sup: true,
  render(c) {
    const { f, t } = T(), td = B.dom.turnoDatos(f, t) || {}, regs = B.dom.registros(f, t);
    const marcados = new Set((td.pres || []).map(U.ini));
    const gente = new Set([...B.dom.personalDelTurno(f, t), ...regs.keys(), ...marcados]);
    const sups = () => ui.personas(p => B.dom.catOrden(p.cat) === 4);
    const lbl = i => i ? i + " - " + B.dom.nombre(i) : "";
    c.innerHTML = `
      <div class="cuadricula">
        <div class="tarjeta c6" data-tour="sup-firmas">${cab("usuario", "g", "Elaboró y revisó", "Supervisores del turno (sin firma autógrafa).")}
          <div class="campo"><label>Elaboró</label><input class="inp" id="tElab" value="${U.esc(lbl(td.elab))}" placeholder="Busca por iniciales o apellido"></div>
          <div class="campo"><label>Revisó</label><input class="inp" id="tRev" value="${U.esc(lbl(td.rev))}" placeholder="Busca por iniciales o apellido"></div></div>
        <div class="tarjeta c6" data-tour="sup-difusion">${cab("info", "a", "Difusión", "Elige un mensaje del catálogo o escribe uno nuevo.")}
          <div style="display:flex;gap:8px;align-items:flex-start"><div class="campo" style="flex:1"><input class="inp" id="tDifBus" placeholder="Buscar en el catálogo de difusión…"></div>
            <button class="btn sec btn-icono" id="tDifMas" title="Agregar un mensaje nuevo al catálogo" style="height:40px;width:40px;flex:none">${B.ico("mas")}</button></div>
          <div class="campo"><textarea class="inp" id="tDif" rows="3">${U.esc(td.dif || "")}</textarea></div></div>
      </div>
      <div class="tarjeta" style="margin-top:18px">${cab("doc", "d", "Notas adicionales", "Una nota por renglón; en el reporte aparecen con viñetas.")}
        <textarea class="inp" id="tNotas" rows="4">${U.esc(td.notas || "")}</textarea></div>
      <div class="tarjeta" data-tour="sup-asistencia">${cab("usuarios", "g", "Asistencia del turno",
        "Quien capturó aparece automáticamente. Marca <b>Presente</b> a quien estuvo en el turno aunque no haya capturado ninguna actividad: saldrá en «Personal que estuvo en el turno» del reporte. En rojo: asignados sin registro.",
        `<div class="campo" style="margin:0;min-width:260px"><input class="inp" id="tAgregar" placeholder="+ Agregar persona de otro turno"></div>`)}
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
          <button class="btn sec chico" id="tTodos">${B.ico("ok")} Marcar presentes a todos los asignados</button>
          <button class="btn fantasma chico" id="tNinguno">Quitar marcas</button>
          <span class="muted peque" id="tCuenta" style="margin-left:auto"></span></div>
        <div class="tabla-cont"><table class="tabla"><thead><tr><th>Iniciales</th><th>Nombre</th><th>Categoría</th><th>Turno asignado</th><th class="c">Registros</th><th class="c">Presente</th><th>Estado</th></tr></thead>
        <tbody id="tAsis"></tbody></table></div></div>
      <div class="barra-guardar"><span class="estado" id="tEstado">${td.mod ? "Último guardado: " + U.esc(td.mod.replace("T", " ")) : "Sin guardar"}</span>
        <button class="btn sec" id="tVer">${B.ico("ojo")} Guardar y ver reporte</button><button class="btn verde" id="tGuardar">${B.ico("ok")} Guardar</button></div>`;
    const tb = c.querySelector("#tAsis");
    const pintar = () => {
      tb.innerHTML = B.dom.ordenados([...gente]).map(i => {
        const p = B.dom.persona(i), n = regs.get(i) || 0, te = B.dom.turnoEfectivo(i, f), pres = n > 0 || marcados.has(i);
        const sin = te === t && !pres;
        return `<tr data-i="${i}"><td><b>${U.esc(i)}</b></td><td>${U.esc(p ? p.nombre : "")}</td><td class="muted">${U.esc(p ? B.dom.catCorta(p.cat) : "")}</td><td>${U.esc(te)}</td>
          <td class="c">${n || ""}</td><td class="c"><input type="checkbox" ${pres ? "checked" : ""} ${n ? "disabled title='Tiene registros'" : ""}></td>
          <td>${sin ? '<span class="badge r">SIN CAPTURA</span>' : n ? '<span class="badge v">Capturó</span>' : pres ? '<span class="badge a">Presente</span>' : '<span class="badge n">No asistió</span>'}</td></tr>`;
      }).join("");
      tb.querySelectorAll("input[type=checkbox]").forEach(ch => ch.onchange = () => { const i = ch.closest("tr").dataset.i; ch.checked ? marcados.add(i) : marcados.delete(i); pintar(); sinGuardar(); });
      const pres = [...gente].filter(i => (regs.get(i) || 0) > 0 || marcados.has(i)).length;
      c.querySelector("#tCuenta").innerHTML = `Presentes en el turno: <b>${pres}</b> de ${gente.size} · marcados a mano: <b>${[...marcados].filter(i => !regs.get(i)).length}</b>`;
    };
    const sinGuardar = () => { const e = c.querySelector("#tEstado"); e.textContent = "Cambios sin guardar"; e.classList.add("sucio"); };
    pintar();
    c.querySelector("#tTodos").onclick = () => { for (const i of gente) if (B.dom.turnoEfectivo(i, f) === t && !regs.get(i)) marcados.add(i); pintar(); sinGuardar(); };
    c.querySelector("#tNinguno").onclick = () => { marcados.clear(); pintar(); sinGuardar(); };
    ui.combo(c.querySelector("#tElab"), { items: sups });
    ui.combo(c.querySelector("#tRev"), { items: sups });
    ui.combo(c.querySelector("#tAgregar"), { items: () => ui.personas(), alElegir: v => { if (v) { gente.add(v); marcados.add(v); pintar(); sinGuardar(); c.querySelector("#tAgregar").value = ""; } } });
    c.querySelector("#tDifMas").onclick = async () => {
      const r = await ui.modal({ titulo: "Nuevo mensaje de difusión", icono: "info", ancho: true,
        html: `<div class="campo"><label>Mensaje</label><textarea class="inp" id="ndTxt" rows="4" placeholder="Escribe el mensaje de seguridad…">${U.esc(c.querySelector("#tDif").value.trim() && !(B.estado.catalogos.difusion || []).some(d => U.norm(d.txt) === U.norm(c.querySelector("#tDif").value)) ? c.querySelector("#tDif").value.trim() : "")}</textarea></div>
          <p class="muted peque" style="margin:0">Se guarda en el catálogo de difusión (queda disponible para los siguientes turnos) y se coloca en este turno.</p>`,
        botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Agregar y usar", c: "verde", v: v => v.querySelector("#ndTxt").value.trim() }] });
      if (r == null) return;
      if (!r) { ui.toast("Escribe el mensaje.", "error"); return; }
      try { await B.api.op("catalogos", "agregar", { tipo: "difusion", texto: r }); (B.estado.catalogos.difusion = B.estado.catalogos.difusion || []).some(d => U.norm(d.txt) === U.norm(r)) || B.estado.catalogos.difusion.push({ txt: r, tema: "" });
        c.querySelector("#tDif").value = r; ui.toast("Mensaje agregado al catálogo. Presiona Guardar para dejarlo en este turno.", "ok", 5000); } catch (e) { ui.error(e); }
    };
    ui.combo(c.querySelector("#tDifBus"), {
      items: () => (B.estado.catalogos.difusion || []).map(d => ({ value: d.txt, label: d.txt, sub: d.tema })), estricto: false,
      alElegir: v => { if (v) { c.querySelector("#tDif").value = v; c.querySelector("#tDifBus").value = ""; } }
    });
    const guardar = async () => {
      const ini = id => { const el = c.querySelector(id); return U.ini(el.dataset.valor || el.value.split(" - ")[0]); };
      const elab = ini("#tElab"), rev = ini("#tRev");
      for (const x of [elab, rev]) if (x && !B.dom.persona(x)) { ui.toast("Supervisor no válido: " + U.esc(x), "error"); return false; }
      const pres = [...marcados].filter(i => !regs.get(i));
      return ejecutar(() => B.api.op("turnos", "guardar", { fecha: f, turno: t, elab, rev, dif: c.querySelector("#tDif").value.trim(), notas: c.querySelector("#tNotas").value.trim(), pres }), "Datos del turno guardados.");
    };
    c.querySelector("#tGuardar").onclick = guardar;
    c.querySelector("#tVer").onclick = async () => { if (await guardar()) location.hash = "#/reporte"; };
  }
};

/* ===================================================================== REPORTE DEL TURNO */
V.reporte = {
  titulo: "Reporte del turno", sup: true,
  render(c) {
    const { f, t } = T(), sin = B.dom.sinCaptura(f, t), td = B.dom.turnoDatos(f, t), doc = B.rep.turno(f, t);
    c.innerHTML = `
      ${sin.length ? `<div class="aviso d">${B.ico("alerta")}<div><b>${sin.length} persona(s) asignadas al turno sin captura ni marcadas como presentes:</b>
        ${sin.map(i => U.esc(i + " (" + B.dom.nombre(i) + ")")).join(", ")}. Si estuvieron en el turno, márcalas presentes para que salgan en «Personal que estuvo en el turno» (aunque no tengan actividades), o elige una por una en <a href="#/turno">Datos del turno</a>.
        <div style="margin-top:8px"><button class="btn chico" id="rPres">${B.ico("ok")} Marcar presentes a las ${sin.length}</button></div></div></div>` : ""}
      ${!td || !td.elab ? `<div class="aviso a">${B.ico("info")}<div>Aún no se registra quién elaboró/revisó ni la difusión. Captúralo en <a href="#/turno">Datos del turno</a>.</div></div>` : ""}
      <div class="tarjeta">${cab("pdf", "g", "Reporte del turno " + B.t.corto(f, t), "Las secciones sin información y el personal sin registros se omiten automáticamente.",
        `${td && td.pdf ? `<span class="badge v" title="${U.esc(td.pdf)}">PDF generado</span>` : ""}
         <button class="btn sec" id="rImp">${B.ico("imprimir")} Imprimir</button><button class="btn" id="rPdf" data-tour="rep-pdf">${B.ico("pdf")} ${B.modoLocal ? "Guardar PDF" : "Generar PDF"}</button>`, "rep-cab")}
        <div id="rPrevia" data-tour="rep-previa"></div></div>`;
    B.rep.previa(c.querySelector("#rPrevia"), doc);
    const bp = c.querySelector("#rPres");
    if (bp) bp.onclick = async () => {
      const pres = [...new Set([...((td && td.pres) || []).map(U.ini), ...sin])];
      await ejecutar(() => B.api.op("turnos", "guardar", { fecha: f, turno: t, pres }), sin.length + " persona(s) marcadas como presentes.");
    };
    c.querySelector("#rImp").onclick = () => B.rep.imprimir(doc);
    c.querySelector("#rPdf").onclick = async e => {
      const b = e.currentTarget;
      if (sin.length && !(await ui.confirmar(`Hay ${sin.length} persona(s) asignadas sin captura. ¿Generar el PDF de todos modos?`, "Personal sin captura", "Generar PDF"))) return;
      const r = await B.rep.pdf(doc, b);
      if (r) await B.app.refrescar();
    };
  }
};

/* ===================================================================== ASISTENCIA Y HORAS EXTRA */
V.asistencia = {
  titulo: "Asistencia y horas extra", sup: true, lunes: null,
  render(c) {
    if (!this.lunes) this.lunes = B.dom.lunes(T().f);
    const L = this.lunes, filas = B.dom.semana(L), cfg = B.estado.config;
    const det = []; for (let i = 0; i < 7; i++) for (const tt of ["T1", "T2"]) det.push(...B.dom.asistenciaTurno(U.sumar(L, i), tt));
    const tHe = filas.reduce((s, x) => s + x.he, 0), tRef = filas.reduce((s, x) => s + x.ref, 0);
    const conDif = filas.filter(x => x.tieneHE && x.tieneRef && x.he !== x.ref).length;
    c.innerHTML = `
      <div class="tarjeta">${cab("calendario", "g", "Semana del " + U.corta(L) + " al " + U.corta(U.sumar(L, 6)),
        `Referencia automática: ${cfg.heTurno} h por turno y ${cfg.heDescanso} h en día de descanso (se ajusta en Configuración).`,
        `<button class="btn fantasma btn-icono" id="sAnt" title="Semana anterior">‹</button><input class="inp" type="date" id="sFecha" value="${L}" style="width:150px">
         <button class="btn fantasma btn-icono" id="sSig" title="Semana siguiente">›</button>`)}
        <div class="cuadricula" style="margin-bottom:16px">
          ${[["Personas", filas.length], ["Turnos asistidos", filas.reduce((s, x) => s + x.turnos, 0)], ["H.E. capturadas / referencia", U.fmtNum(tHe) + " / " + U.fmtNum(tRef)], ["Con diferencia", conDif]]
        .map(([e, v], i) => `<div class="c3" style="background:${i === 3 && conDif ? "var(--rojo-claro)" : "#FAF8F6"};border-radius:12px;padding:12px 14px"><div class="kpi"><div class="valor tnum" style="font-size:22px">${v}</div><div class="etiqueta">${e}</div></div></div>`).join("")}</div>
        <div class="tabla-cont" data-tour="he-matriz"><table class="tabla matriz"><thead><tr><th>Nombre</th>${Array.from({ length: 7 }, (_, i) => { const f = U.sumar(L, i); return `<th class="c">${U.diaSemana(f)} ${U.cortaDM(f)}</th>`; }).join("")}
          <th class="c">Turnos</th><th class="c">H.E.</th><th class="c">Ref.</th><th class="c">Dif.</th><th class="c">Verif.</th></tr></thead><tbody>
          ${filas.length ? filas.map(x => { const dif = x.tieneHE && x.tieneRef ? x.he - x.ref : null;
            return `<tr><td style="min-width:220px"><b>${U.esc(x.ini)}</b><div class="muted peque">${U.esc(B.dom.nombre(x.ini))}</div></td>${x.dias.map(d => `<td class="dia ${d.some(r => r.he == null) ? "sinhe" : ""}">${d.map(r => r.t + " · " + (r.he != null ? U.fmtNum(r.he) + " h" : "—")).join("<br>")}</td>`).join("")}
            <td class="c">${x.turnos}</td><td class="c">${x.tieneHE ? U.fmtNum(x.he) : ""}</td><td class="c">${x.tieneRef ? U.fmtNum(x.ref) : ""}</td><td class="c ${dif ? "alerta" : ""}">${dif != null ? U.fmtNum(dif) : ""}</td>
            <td class="c">${x.verif ? '<span class="badge v">SI</span>' : '<span class="badge r">NO</span>'}</td></tr>`; }).join("")
          : `<tr><td colspan="13">${ui.vacio("Sin asistencia registrada en la semana.", "calendario")}</td></tr>`}</tbody></table></div>
        <p class="muted peque">Cada día: turno · horas extra capturadas (— = no capturó; fondo amarillo). Los técnicos capturan en <a href="#/horasextra">Horas extra</a>; los oficios semanales (formato oficial) se generan en <a href="#/oficio">Oficios de tiempo extra</a>.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn sec" id="sCsv">${B.ico("descargar")} Excel (CSV)</button><button class="btn sec" id="sImp">${B.ico("imprimir")} Imprimir</button>
          <button class="btn" id="sPdf">${B.ico("pdf")} PDF semanal</button><button class="btn dorado" id="sVer" data-tour="he-verificar">${B.ico("ok")} Marcar semana verificada</button></div></div>
      <div class="tarjeta">${cab("editar", "d", "Detalle por turno", "Corrige horas capturadas, marca verificado y agrega observaciones. Guarda al terminar.")}
        <div class="tabla-cont"><table class="tabla"><thead><tr><th>Fecha</th><th>Turno</th><th>Persona</th><th>Origen</th><th>H.E.</th><th>Motivo</th><th class="c">Ref.</th><th class="c">Dif.</th><th class="c">Verif.</th><th>Observaciones</th></tr></thead>
        <tbody>${det.length ? det.map((r, i) => `<tr data-k="${i}"><td class="tnum">${U.corta(r.f)}</td><td>${r.t}</td><td><b>${U.esc(r.ini)}</b></td><td class="muted peque">${U.esc(r.origen)}</td>
          <td><input class="inp tnum" data-c="he" value="${r.he ?? ""}" style="width:70px" ${r.n > 1 ? 'disabled title="Tiene varios horarios ese día: se corrigen en Horas extra (captura)"' : ""}>${r.horarios ? `<div class="muted peque tnum" style="white-space:nowrap">${U.esc(r.horarios)}</div>` : ""}</td>
          <td><input class="inp" data-c="mot" value="${U.esc(r.mot)}" style="min-width:160px" ${r.n > 1 ? "disabled" : ""}></td>
          <td class="c">${r.ref ?? ""}</td><td class="c ${r.dif ? "alerta" : ""}">${r.dif != null ? U.fmtNum(r.dif) : ""}</td>
          <td class="c"><input type="checkbox" data-c="verif" ${U.norm(r.verif) === "SI" ? "checked" : ""}></td><td><input class="inp" data-c="obs" value="${U.esc(r.obs)}" style="min-width:160px"></td></tr>`).join("")
          : `<tr><td colspan="10">${ui.vacio("Sin registros.")}</td></tr>`}</tbody></table></div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn verde" id="sGuardar">${B.ico("ok")} Guardar cambios</button></div></div>`;
    const ir = l => { this.lunes = l; B.app.render(); };
    c.querySelector("#sAnt").onclick = () => ir(U.sumar(L, -7));
    c.querySelector("#sSig").onclick = () => ir(U.sumar(L, 7));
    c.querySelector("#sFecha").onchange = e => e.target.value && ir(B.dom.lunes(e.target.value));
    const doc = () => B.rep.semana(L);
    c.querySelector("#sImp").onclick = () => B.rep.imprimir(doc());
    c.querySelector("#sPdf").onclick = e => B.rep.pdf(doc(), e.currentTarget);
    c.querySelector("#sCsv").onclick = () => U.csv("Asistencia y horas extra " + U.corta(L).replace(/\//g, "."), ["Fecha", "Turno", "Iniciales", "Nombre", "RPE", "Origen", "HE capturadas", "Motivo", "HE referencia", "Diferencia", "Verificado", "Observaciones"],
      det.map(r => { const p = B.dom.persona(r.ini); return [U.corta(r.f), r.t, r.ini, p ? p.nombre : "", p ? p.rpe : "", r.origen, r.he ?? "", r.mot, r.ref ?? "", r.dif ?? "", r.verif, r.obs]; }));
    c.querySelector("#sVer").onclick = async () => {
      if (!det.length) return;
      if (!(await ui.confirmar(`Se marcarán como VERIFICADOS los ${det.length} registros de la semana. Revisa antes las diferencias en rojo.`, "Verificar semana", "Verificar"))) return;
      await ejecutar(() => B.api.op("he", "verificar", { items: det.map(r => ({ fecha: r.f, turno: r.t, ini: r.ini })), verif: "SI" }), "Semana verificada.");
    };
    c.querySelector("#sGuardar").onclick = async () => {
      const cambios = [];
      c.querySelectorAll("tr[data-k]").forEach(tr => {
        const r = det[+tr.dataset.k], he = tr.querySelector('[data-c="he"]').value.trim(), mot = tr.querySelector('[data-c="mot"]').value.trim(),
          verif = tr.querySelector('[data-c="verif"]').checked ? "SI" : "", obs = tr.querySelector('[data-c="obs"]').value.trim();
        const vAnt = U.norm(r.verif) === "SI" ? "SI" : "";
        if (r.n > 1) {      // varios horarios: aqui solo se verifica y se anotan observaciones
          if (verif !== vAnt || obs !== r.obs) cambios.push({ multi: true, fecha: r.f, turno: r.t, ini: r.ini, tramo: r.tramo, verif, obs, cambiaVerif: verif !== vAnt, cambiaObs: obs !== r.obs });
        } else if (he !== String(r.he ?? "") || mot !== r.mot || verif !== vAnt || obs !== r.obs) cambios.push({ fecha: r.f, turno: r.t, ini: r.ini, tramo: r.tramo, he, mot, verif, obs });
      });
      if (!cambios.length) { ui.toast("Sin cambios.", "aviso"); return; }
      await ejecutar(async () => {
        for (const x of cambios) {
          if (!x.multi) { await B.api.op("he", "supervisar", x); continue; }
          if (x.cambiaVerif) await B.api.op("he", "verificar", { items: [{ fecha: x.fecha, turno: x.turno, ini: x.ini }], verif: x.verif || "NO" });
          if (x.cambiaObs) await B.api.op("he", "supervisar", { fecha: x.fecha, turno: x.turno, ini: x.ini, tramo: x.tramo, obs: x.obs });
        }
      }, cambios.length + " registro(s) actualizados.");
    };
  }
};

/* ===================================================================== PERSONAL Y CAMBIOS */
V.personal = {
  titulo: "Personal y turnos", sup: true, tab: "personal",
  render(c) {
    const cats = ["TÉCNICOS DE BASE/TEMPORAL", "TÉCNICOS DE C-42", "TÉCNICOS ESPECIALIZADOS", "SUPERVISORES"];
    c.innerHTML = `<div class="tarjeta"><div class="pestanas"><button data-tab="personal" class="${this.tab === "personal" ? "on" : ""}">Personal (${B.estado.personal.length})</button>
      <button data-tab="cambios" class="${this.tab === "cambios" ? "on" : ""}">Cambios de turno (${B.estado.cambios.length})</button></div><div id="pCont"></div></div>`;
    c.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { this.tab = b.dataset.tab; B.app.render(); });
    const cont = c.querySelector("#pCont");
    if (this.tab === "personal") {
      cont.innerHTML = `<div class="aviso a">${B.ico("info")}<div>El <b>RPE</b> es el usuario de acceso. Al agregar a alguien se crea su usuario con contraseña inicial RPE+iniciales (supervisores: 24RU1).
        <b>Activo = No</b> lo oculta de las listas sin borrar su historial. Para movimientos por fecha usa <b>Cambios de turno</b>.</div></div>
        <div class="tabla-cont"><table class="tabla"><thead><tr><th>Iniciales</th><th>Nombre</th><th>RPE</th><th>Categoría</th><th>Turno base</th><th class="c">Activo</th><th></th></tr></thead><tbody id="pT"></tbody></table></div>
        <div style="display:flex;justify-content:space-between;margin-top:12px"><button class="btn sec chico" id="pMas">${B.ico("mas")} Agregar persona</button><button class="btn verde" id="pG">${B.ico("ok")} Guardar personal</button></div>`;
      const tb = cont.querySelector("#pT");
      const fila = p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><input class="inp" data-k="ini" value="${U.esc(p.ini || "")}" style="width:80px;text-transform:uppercase"></td><td><input class="inp" data-k="nombre" value="${U.esc(p.nombre || "")}" style="min-width:240px"></td>
          <td><input class="inp" data-k="rpe" value="${U.esc(p.rpe || "")}" style="width:90px;text-transform:uppercase"></td>
          <td><select class="inp" data-k="cat">${cats.map(x => `<option ${U.norm(x) === U.norm(p.cat) ? "selected" : ""}>${x}</option>`).join("")}</select></td>
          <td><select class="inp" data-k="turno">${["T1", "T2"].map(x => `<option ${x === p.turno ? "selected" : ""}>${x}</option>`).join("")}</select></td>
          <td class="c"><input type="checkbox" data-k="activo" ${U.norm(p.activo) !== "NO" ? "checked" : ""}></td><td><button class="btn fantasma btn-icono" title="Quitar">${B.ico("basura")}</button></td>`;
        tr.querySelector("button").onclick = () => tr.remove();
        tb.appendChild(tr);
      };
      B.estado.personal.forEach(fila);
      cont.querySelector("#pMas").onclick = () => fila({ turno: "T1", activo: "SI", cat: cats[0] });
      cont.querySelector("#pG").onclick = async () => {
        const lista = [...tb.querySelectorAll("tr")].map(tr => ({
          ini: tr.querySelector('[data-k="ini"]').value.trim().toUpperCase(), nombre: tr.querySelector('[data-k="nombre"]').value.trim(),
          rpe: tr.querySelector('[data-k="rpe"]').value.trim().toUpperCase(), cat: tr.querySelector('[data-k="cat"]').value, turno: tr.querySelector('[data-k="turno"]').value,
          activo: tr.querySelector('[data-k="activo"]').checked ? "SI" : "NO"
        })).filter(p => p.ini || p.nombre);
        const malos = lista.filter(p => !p.ini || !p.nombre || !p.rpe);
        if (malos.length) { ui.toast("Cada persona necesita iniciales, nombre y RPE.", "error"); return; }
        const dup = lista.map(p => p.ini).filter((x, i, a) => a.indexOf(x) !== i).concat(lista.map(p => p.rpe).filter((x, i, a) => a.indexOf(x) !== i));
        if (dup.length) { ui.toast("Iniciales o RPE repetidos: " + U.esc([...new Set(dup)].join(", ")), "error"); return; }
        await ejecutar(() => B.api.op("personal", "reemplazar", { lista }), "Personal guardado.");
      };
    } else {
      cont.innerHTML = `<div class="aviso a">${B.ico("info")}<div>Registra cuando alguien pasa de día a noche (o viceversa) o tiene <b>DESCANSO</b>. Las fechas son <b>fechas de reporte</b>
        (el T1 nocturno se rotula con la fecha de salida). Si "Hasta" queda vacío el cambio es permanente. Si varios cambios coinciden, aplica el de más abajo.</div></div>
        <div class="tabla-cont"><table class="tabla"><thead><tr><th style="min-width:260px">Persona</th><th>Desde</th><th>Hasta</th><th>Turno</th><th>Motivo</th><th></th></tr></thead><tbody id="cT"></tbody></table></div>
        <div style="display:flex;justify-content:space-between;margin-top:12px"><button class="btn sec chico" id="cMas">${B.ico("mas")} Agregar cambio</button><button class="btn verde" id="cG">${B.ico("ok")} Guardar cambios de turno</button></div>`;
      const tb = cont.querySelector("#cT");
      const fila = x => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><input class="inp" data-k="ini" value="${U.esc(x.ini ? x.ini + " - " + B.dom.nombre(x.ini) : "")}" placeholder="Busca la persona"></td>
          <td><input class="inp" type="date" data-k="desde" value="${U.esc(x.desde || T().f)}"></td><td><input class="inp" type="date" data-k="hasta" value="${U.esc(x.hasta || "")}"></td>
          <td><select class="inp" data-k="turno">${["T1", "T2", "DESCANSO"].map(o => `<option ${o === x.turno ? "selected" : ""}>${o}</option>`).join("")}</select></td>
          <td><input class="inp" data-k="motivo" value="${U.esc(x.motivo || "")}"></td><td><button class="btn fantasma btn-icono">${B.ico("basura")}</button></td>`;
        tr.querySelector("button").onclick = () => tr.remove();
        tb.appendChild(tr);
        ui.combo(tr.querySelector('[data-k="ini"]'), { items: () => ui.personas() });
      };
      B.estado.cambios.forEach(fila);
      cont.querySelector("#cMas").onclick = () => fila({ turno: "T1" });
      cont.querySelector("#cG").onclick = async () => {
        const lista = [...tb.querySelectorAll("tr")].map(tr => {
          const i = tr.querySelector('[data-k="ini"]');
          return { ini: U.ini(i.dataset.valor || i.value.split(" - ")[0]), desde: tr.querySelector('[data-k="desde"]').value, hasta: tr.querySelector('[data-k="hasta"]').value,
            turno: tr.querySelector('[data-k="turno"]').value, motivo: tr.querySelector('[data-k="motivo"]').value.trim() };
        }).filter(x => x.ini);
        if (lista.some(x => !B.dom.persona(x.ini) || !x.desde)) { ui.toast("Revisa: cada cambio necesita una persona válida y la fecha DESDE.", "error"); return; }
        await ejecutar(() => B.api.op("cambios", "reemplazar", { lista }), "Cambios de turno guardados.");
      };
    }
  }
};

/* ===================================================================== CATALOGOS */
V.catalogos = {
  titulo: "Catálogos", sup: true, tab: "espacios",
  render(c) {
    const cat = B.estado.catalogos;
    const tabs = [["espacios", "Espacios confinados"], ["vigilancias", "Vigilancias C.I."], ["difusion", "Mensajes de difusión"]];
    const cols = { espacios: [["txt", "Espacio confinado"]], vigilancias: [["desc", "Descripción"], ["inop", "# INOP"], ["ubic", "Ubicación"], ["comp", "Componente"]], difusion: [["txt", "Mensaje"], ["tema", "Tema"]] }[this.tab];
    c.innerHTML = `<div class="tarjeta"><div class="pestanas">${tabs.map(([k, e]) => `<button data-tab="${k}" class="${this.tab === k ? "on" : ""}">${e} (${(cat[k] || []).length})</button>`).join("")}</div>
      <p class="muted peque">Listas que aparecen al escribir en la captura. Lo nuevo que capturen los técnicos se agrega aquí automáticamente.</p>
      <div class="tabla-cont"><table class="tabla"><thead><tr>${cols.map(x => `<th>${x[1]}</th>`).join("")}<th></th></tr></thead><tbody id="kT"></tbody></table></div>
      <div style="display:flex;justify-content:space-between;margin-top:12px"><button class="btn sec chico" id="kMas">${B.ico("mas")} Agregar</button><button class="btn verde" id="kG">${B.ico("ok")} Guardar catálogo</button></div></div>`;
    c.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { this.tab = b.dataset.tab; B.app.render(); });
    const tb = c.querySelector("#kT");
    const fila = x => {
      const o = typeof x === "string" ? { txt: x } : (x || {});
      const tr = document.createElement("tr");
      tr.innerHTML = cols.map(([k]) => `<td>${k === "txt" && this.tab === "difusion" ? `<textarea class="inp" data-k="${k}" rows="2" style="min-width:420px">${U.esc(o[k] || "")}</textarea>` : `<input class="inp" data-k="${k}" value="${U.esc(o[k] || "")}">`}</td>`).join("") +
        `<td><button class="btn fantasma btn-icono">${B.ico("basura")}</button></td>`;
      tr.querySelector("button").onclick = () => tr.remove();
      tb.appendChild(tr);
    };
    (cat[this.tab] || []).forEach(fila);
    c.querySelector("#kMas").onclick = () => fila();
    c.querySelector("#kG").onclick = async () => {
      const filas = [...tb.querySelectorAll("tr")].map(tr => { const o = {}; tr.querySelectorAll("[data-k]").forEach(i => o[i.dataset.k] = i.value.trim()); return o; }).filter(o => Object.values(o).some(Boolean));
      const nuevo = { ...cat, [this.tab]: this.tab === "espacios" ? filas.map(o => o.txt) : filas };
      await ejecutar(() => B.api.op("catalogos", "reemplazar", { catalogos: nuevo }), "Catálogo guardado.");
    };
  }
};

/* ===================================================================== USUARIOS */
V.usuarios = {
  titulo: "Usuarios", sup: true,
  render(c) {
    const us = new Map((B.estado.usuarios || []).map(u => [u.rpe, u]));
    c.innerHTML = `<div class="tarjeta">${cab("llave", "g", "Usuarios y contraseñas", "Usuario = RPE. Contraseña inicial: RPE + iniciales (supervisores: 24RU1). Cada quien la cambia desde su menú.")}
      <div class="tabla-cont"><table class="tabla"><thead><tr><th>RPE</th><th>Iniciales</th><th>Nombre</th><th>Rol</th><th>Contraseña</th><th>Último acceso</th><th></th></tr></thead><tbody>
      ${B.dom.ordenados(B.estado.personal.map(p => p.ini)).map(i => { const p = B.dom.persona(i), u = us.get(U.ini(p.rpe)) || {};
        return `<tr><td class="tnum"><b>${U.esc(p.rpe)}</b></td><td>${U.esc(p.ini)}</td><td>${U.esc(p.nombre)}${U.norm(p.activo) === "NO" ? ' <span class="badge n">Inactivo</span>' : ""}</td>
        <td>${u.rol === "supervisor" ? '<span class="badge g">Supervisor</span>' : '<span class="badge n">Técnico</span>'}</td>
        <td>${u.cambiada ? '<span class="badge v">Personalizada</span>' : '<span class="badge d">Inicial</span>'}</td><td class="muted tnum">${U.esc((u.ultimo || "").replace("T", " ").slice(0, 16))}</td>
        <td class="acc"><button class="btn chico sec" data-rpe="${U.esc(p.rpe)}">Restablecer</button></td></tr>`; }).join("")}</tbody></table></div></div>`;
    c.querySelectorAll("[data-rpe]").forEach(b => b.onclick = async () => {
      if (!(await ui.confirmar(`¿Restablecer la contraseña de ${U.esc(b.dataset.rpe)} a la contraseña inicial?`, "Restablecer contraseña", "Restablecer"))) return;
      await ejecutar(() => B.api.op("usuarios", "restablecer", { rpe: b.dataset.rpe }), r => "Contraseña restablecida. Contraseña inicial: <b>" + U.esc(r.clave) + "</b>");
    });
  }
};

/* ===================================================================== CONFIGURACION Y RESPALDOS */
V.config = {
  titulo: "Configuración y respaldos", sup: true,
  /* Convierte la imagen a data URL; si es muy grande la reduce (max. 2600 px de ancho) */
  async reducir(f) {
    const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
    const img = new Image(); img.src = url; await img.decode();
    if (img.naturalWidth <= 2600 && f.size < 2500000) return url;
    const k = Math.min(1, 2600 / img.naturalWidth), cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", 0.92);
  },
  render(c) {
    const s = B.estado.servidor, ofc = B.oficio.cfg();
    const cf = { ...B.estado.config };
    for (const [k, d] of [["ofLinea1", ofc.linea1], ["ofLinea2", ofc.linea2], ["ofLinea3", ofc.linea3], ["ofDepto", ofc.depto], ["ofVoboNombre", ofc.voboNombre],
      ["ofVoboCargo", ofc.voboCargo], ["ofAutNombre", ofc.autNombre], ["ofAutCargo", ofc.autCargo]]) if (cf[k] == null) cf[k] = d;
    if (cf.heJust == null || cf.heJust === "") cf.heJust = B.dom.heJust();
    const IMGS = { membrete: "Membrete (encabezado)", pie: "Pie de página", ofIzq: "Logos izquierda", ofDer: "Imagen derecha", ofPie: "Pie de página del oficio" };
    const tarjetaImg = t => `<div class="campo"><label>${IMGS[t]}${B.imgs[t] ? ' <span class="badge g">Personalizado</span>' : ' <span class="badge n">Original</span>'}</label>
            <div style="border:1px solid var(--borde);border-radius:10px;padding:10px;background:#fff;text-align:center"><img src="${B.imgUrl(t)}" alt="${t}" style="${t === "ofDer" ? "height:70px" : t === "ofIzq" ? "height:46px;max-width:100%" : "width:100%"};display:inline-block"></div>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><label class="btn sec chico" style="cursor:pointer">${B.ico("subir")} Cambiar…<input type="file" accept="image/png,image/jpeg" data-img="${t}" hidden></label>
            ${B.imgs[t] ? `<button class="btn fantasma chico" data-orig="${t}">Restaurar original</button>` : ""}</div></div>`;
    const campo = (k, e, tipo, ayuda) => `<div class="campo"><label>${e}</label><input class="inp" data-k="${k}" type="${tipo || "text"}" value="${U.esc(cf[k] ?? "")}" ${tipo === "number" ? 'step="any"' : ""}>${ayuda ? `<span class="ayuda">${ayuda}</span>` : ""}</div>`;
    const fh = (k, e) => `<div class="campo"><label>${e}</label><div style="display:flex;gap:6px"><input class="inp" type="date" data-fh="${k}" value="${U.esc(String(cf[k] || "").slice(0, 10))}" style="flex:1.5">
      <input class="inp tnum h24" data-fhh="${k}" value="${U.esc(String(cf[k] || "").slice(11, 16))}" type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM (24 h)" autocomplete="off" style="flex:1"></div></div>`;
    c.innerHTML = `
      <div class="cuadricula">
      <div class="tarjeta c7" data-tour="cfg-recarga">${cab("engrane", "g", "Periodo y turnos", "Sirve para una recarga o para operación normal: cambia el nombre y las fechas cuando inicie otro periodo.")}
        <div class="grid2">${campo("periodo", "Nombre del periodo (aparece en reportes)", "text", "Ej. Recarga 24RU1, Operación 2027, Recarga 25RU2")}${campo("proyecto", "Clave corta (nombres de archivos PDF)")}
          ${fh("inicio", "Inicio del periodo")}${fh("fin", "Fin del periodo (vacío = sin fecha de término)")}
          ${campo("inactividadMin", "Cerrar sesión tras (minutos sin uso)", "number")}<div></div>
          ${campo("t1Nombre", "Turno T1 - nombre")}${campo("t1Horario", "Turno T1 - horario")}${campo("t2Nombre", "Turno T2 - nombre")}${campo("t2Horario", "Turno T2 - horario")}</div>
        ${cab("escudo", "v", "Rangos de referencia en espacios confinados", "Ajustar a su procedimiento. Las lecturas fuera de rango se marcan en rojo.")}
        <div class="grid3">${campo("o2Min", "O2 mínimo (%)", "number")}${campo("o2Max", "O2 máximo (%)", "number")}${campo("lelMax", "LEL máximo (%)", "number")}${campo("coMax", "CO máximo (ppm)", "number")}${campo("h2sMax", "H2S máximo (ppm)", "number")}</div>
        ${cab("reloj", "d", "Horas extra - referencia del conteo automático")}
        <div class="grid2">${campo("heTurno", "Horas extra esperadas por turno", "number", "Valor inicial: 12 h de turno − 8 h de jornada")}${campo("heDescanso", "Horas extra por turno en día de DESCANSO", "number")}</div>
        ${campo("ecInicio", "Espacios confinados: número con el que inicia el consecutivo del periodo", "number", "Ej. 123 si continúa la numeración de pre-recarga. Los registros nuevos toman el número más alto + 1.")}
        ${campo("heJust", "Justificación general del tiempo extra (se propone al capturar y en el oficio)", "text", "Los técnicos pueden usarla tal cual o escribir otra.")}
        ${campo("carpetaPDF", "Carpeta para los PDF (vacío = carpeta REPORTES junto al sistema)", "text", "Se aplica al reiniciar el servidor.")}
        ${cab("doc", "g", "Oficio semanal de tiempo extra", "Encabezado y firmas del formato oficial. Cada trabajador captura su categoría y título.", "", "cfg-oficio")}
        <div class="grid2">${campo("ofVoboNombre", "Vo. Bo. - nombre")}${campo("ofAutNombre", "Autoriza - nombre")}${campo("ofVoboCargo", "Vo. Bo. - cargo")}${campo("ofAutCargo", "Autoriza - cargo")}
          ${campo("ofLinea1", "Encabezado - línea 1")}${campo("ofLinea2", "Encabezado - línea 2")}${campo("ofLinea3", "Encabezado - línea 3")}${campo("ofDepto", "Departamento (por omisión)")}</div>
        <div style="display:flex;justify-content:flex-end"><button class="btn verde" id="gCfg">${B.ico("ok")} Guardar configuración</button></div></div>
      <div class="c5">
        <div class="tarjeta" data-tour="cfg-membrete">${cab("doc", "g", "Membrete y pie de página", "Se usan en la pantalla de acceso y en todos los reportes y PDF.")}
          ${["membrete", "pie"].map(tarjetaImg).join("")}
          <p class="peque muted">Usa una imagen horizontal (PNG o JPG, fondo blanco). Membrete recomendado ~1600×190 px; pie ~2260×260 px. Los reportes se ajustan a la proporción de la imagen.</p></div>
        <div class="tarjeta">${cab("doc", "d", "Imágenes del oficio de tiempo extra", "Logos del encabezado y pie del oficio semanal (cámbialos cuando cambie el formato del año).")}
          ${["ofIzq", "ofDer", "ofPie"].map(tarjetaImg).join("")}</div>
        <div class="tarjeta" data-tour="cfg-red">${cab("red", "a", s.local ? "Modo sin servidor (plan B)" : "Servidor y acceso en red")}
          ${s.local ? `<div class="aviso a">${B.ico("info")}<div>Los datos se leen y escriben directamente en la carpeta de esta PC. Pueden abrirse varias ventanas a la vez
            (cada guardado se combina con lo que hay en el archivo). Si la carpeta está en una <b>unidad de red compartida</b>, también puede abrirse desde otra PC con Edge.
            Los PDF se generan con <b>Imprimir → Guardar como PDF</b>.</div></div>` : s.enRed ? `<div class="aviso v">${B.ico("ok")}<div>Acceso en red habilitado. Desde otras PCs abran:<br>${s.urls.slice(1).map(u => `<b>${U.esc(u)}</b>`).join("<br>")}</div></div>`
          : `<div class="aviso d">${B.ico("info")}<div>Solo esta PC. Para usarlo desde otras PCs, ejecuta una vez como administrador <b>HABILITAR ACCESO EN RED</b> y reinicia el servidor.</div></div>`}
          <p class="peque muted ruta" style="line-height:1.7">Datos: <b>${U.esc(s.datos)}</b><br>Respaldos: <b>${U.esc(s.respaldos)}</b><br>PDF: <b>${U.esc(s.reportes)}</b><br>
          PDF automáticos: ${s.edge ? '<span class="badge v">Disponible (Edge/Chrome)</span>' : '<span class="badge r">No disponible: usar Imprimir</span>'}</p></div>
        <div class="tarjeta" data-tour="cfg-respaldo">${cab("descargar", "v", "Respaldos", "Se guarda una copia en cada cambio y una diaria en la carpeta de respaldos.")}
          <button class="btn sec bloque" id="bResp" style="margin-bottom:10px">${B.ico("descargar")} Descargar respaldo completo (.json)</button>
          <label class="btn peligro bloque" style="cursor:pointer">${B.ico("subir")} Restaurar desde un respaldo…<input type="file" id="fRest" accept=".json" hidden></label>
          <p class="peque muted">Restaurar reemplaza TODOS los datos actuales (antes se guarda una copia automática).</p></div>
      </div></div>`;
    c.querySelector("#gCfg").onclick = async () => {
      const n = { ...cf };
      c.querySelectorAll("[data-k]").forEach(i => n[i.dataset.k] = i.type === "number" ? (i.value === "" ? "" : +i.value) : i.value.trim());
      c.querySelectorAll("[data-fh]").forEach(i => { const hh = U.hora24(c.querySelector(`[data-fhh="${i.dataset.fh}"]`).value) || "00:00"; n[i.dataset.fh] = i.value ? i.value + "T" + hh : ""; });
      if (!n.inicio || (n.fin && n.fin <= n.inicio)) { ui.toast("Revisa las fechas: el inicio es obligatorio y el fin (si lo capturas) debe ser posterior.", "error"); return; }
      if (!n.periodo) n.periodo = "Recarga " + (n.proyecto || "");
      await ejecutar(() => B.api.op("config", "guardar", { config: n }), "Configuración guardada.");
    };
    c.querySelectorAll("[data-img]").forEach(inp => inp.onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!/^image\/(png|jpeg)$/.test(f.type)) { ui.toast("Usa una imagen PNG o JPG.", "error"); return; }
      const dato = await V.config.reducir(f);
      await ejecutar(() => B.api.op("imagenes", "guardar", { tipo: inp.dataset.img, dato }), IMGS[inp.dataset.img] + ": imagen actualizada. Revísala en la vista previa de un reporte.");
    });
    c.querySelectorAll("[data-orig]").forEach(b => b.onclick = async () => {
      if (await ui.confirmar("¿Volver a la imagen original incluida en el sistema?", "Restaurar original", "Restaurar"))
        await ejecutar(() => B.api.op("imagenes", "guardar", { tipo: b.dataset.orig, dato: "" }), "Imagen original restaurada.");
    });
    c.querySelector("#bResp").onclick = async () => {
      try { const d = await B.api.llamar("respaldo"); delete d.ok; U.descargar("respaldo_bitacora_" + B.estado.config.proyecto + "_" + U.ahoraISO().replace(/[:T]/g, "") + ".json", JSON.stringify(d), "application/json"); }
      catch (e) { ui.error(e); }
    };
    c.querySelector("#fRest").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      let db; try { db = JSON.parse(await f.text()); } catch (x) { ui.toast("El archivo no es un respaldo válido.", "error"); return; }
      if (!(await ui.confirmar(`Se reemplazarán TODOS los datos con el respaldo <b>${U.esc(f.name)}</b>${db._generado ? " (generado " + U.esc(db._generado) + ")" : ""}. ¿Continuar?`, "Restaurar respaldo", "Restaurar", true))) return;
      await ejecutar(() => B.api.llamar("restaurar", { db }), "Respaldo restaurado.");
    };
  }
};

/* ===================================================================== REGISTROS DEL PERSONAL */
V.registros = {
  titulo: "Registros del personal", sup: true,
  f: { d1: "", d2: "", turno: "", cat: "", ini: "", est: "", q: "" }, vista: "actividades",
  render(c) {
    const F = this.f, p0 = B.t.primeroUltimo();
    if (!F.d1) { F.d1 = p0.fi; F.d2 = p0.ff; }
    const tks = U.norm(F.q).split(" ").filter(Boolean);
    const catDe = ini => { const p = B.dom.persona(ini); return p ? B.dom.catOrden(p.cat) : 5; };
    const lista = B.estado.actividades.filter(a => a.fecha >= F.d1 && a.fecha <= F.d2 && (!F.turno || a.turno === F.turno) && (!F.cat || catDe(a.ini) === +F.cat)
      && (!F.ini || U.ini(a.ini) === F.ini) && (!F.est || a.est === F.est) && (!tks.length || tks.every(k => U.norm(a.txt + " " + a.ini + " " + B.dom.nombre(a.ini) + " " + a.seg).includes(k))))
      .sort((a, b) => B.t.clave(b.fecha, b.turno) - B.t.clave(a.fecha, a.turno) || a.ini.localeCompare(b.ini));
    // resumen por persona (incluye EC, vigilancias y horas extra del rango)
    const per = new Map(), sum = (ini, k, n) => { ini = U.ini(ini); if (!B.dom.persona(ini)) return; if (!per.has(ini)) per.set(ini, { act: 0, real: 0, abiertas: 0, ec: 0, vig: 0, he: 0, turnos: new Set() }); per.get(ini)[k] += (n ?? 1); };
    for (const a of lista) { sum(a.ini, "act"); if (a.est === "Realizada") sum(a.ini, "real"); if (a.est === "Pendiente" || a.est === "En proceso") sum(a.ini, "abiertas"); per.get(U.ini(a.ini))?.turnos.add(a.fecha + a.turno); }
    const enRango = x => x.fecha >= F.d1 && x.fecha <= F.d2 && (!F.turno || x.turno === F.turno);
    for (const e of B.estado.ec.filter(enRango)) for (const i of new Set([U.ini(e.capt), ...B.dom.tokensIni(e.pers)])) if (!F.ini || i === F.ini) if (!F.cat || catDe(i) === +F.cat) sum(i, "ec");
    for (const v of B.estado.vig.filter(enRango)) if ((!F.ini || U.ini(v.capAlta) === F.ini) && (!F.cat || catDe(v.capAlta) === +F.cat)) sum(v.capAlta, "vig");
    for (const h of B.estado.he.filter(enRango)) if ((!F.ini || U.ini(h.ini) === F.ini) && (!F.cat || catDe(h.ini) === +F.cat)) { const n = U.num(h.he); if (n != null) sum(h.ini, "he", n); }
    const personas = B.dom.ordenados([...per.keys()]);
    // horas extra de todo el personal (con motivo y verificación)
    const heLista = B.estado.he.filter(h => enRango(h) && U.num(h.he) && (!F.cat || catDe(h.ini) === +F.cat) && (!F.ini || U.ini(h.ini) === F.ini)
      && (!tks.length || tks.every(k => U.norm(h.ini + " " + B.dom.nombre(h.ini) + " " + (h.mot || "") + " " + (h.obs || "")).includes(k))))
      .sort((a, b) => B.t.clave(b.fecha, b.turno) - B.t.clave(a.fecha, a.turno) || a.ini.localeCompare(b.ini));
    const heTot = heLista.reduce((n, h) => n + (U.num(h.he) || 0), 0);
    const opt = (v, t, sel) => `<option value="${v}" ${sel ? "selected" : ""}>${t}</option>`;
    c.innerHTML = `<div class="tarjeta">${cab("usuarios", "g", "Registros de todo el personal", "Actividades, espacios confinados, vigilancias y horas extra de técnicos de base/temporal, C-42, especializados y supervisores (incluye personal dado de baja). Haz clic en una persona para ver su historial completo.",
        `<button class="btn sec chico" id="rgCsv">${B.ico("descargar")} Excel (CSV)</button>`)}
      <div class="filtros" data-tour="reg-filtros">
        <div class="campo"><label>Desde</label><input class="inp" type="date" id="rgD1" value="${F.d1}"></div>
        <div class="campo"><label>Hasta</label><input class="inp" type="date" id="rgD2" value="${F.d2}"></div>
        <div class="campo" style="min-width:110px"><label>Turno</label><select class="inp" id="rgT">${opt("", "Ambos", !F.turno)}${opt("T1", "T1", F.turno === "T1")}${opt("T2", "T2", F.turno === "T2")}</select></div>
        <div class="campo"><label>Categoría</label><select class="inp" id="rgC">${opt("", "Todas", !F.cat)}${[[1, "Base / Temporal"], [2, "C-42"], [3, "Especializados"], [4, "Supervisores"]].map(([v, t]) => opt(v, t, String(F.cat) === String(v))).join("")}</select></div>
        <div class="campo" style="min-width:240px"><label>Persona</label><input class="inp" id="rgP" value="${U.esc(F.ini ? F.ini + " - " + B.dom.nombre(F.ini) : "")}" placeholder="Todas"></div>
        <div class="campo"><label>Estatus</label><select class="inp" id="rgE">${opt("", "Todos", !F.est)}${["Realizada", "En proceso", "Pendiente", "Concluida"].map(x => opt(x, x, F.est === x)).join("")}</select></div>
        <div class="campo buscar" style="flex:1;min-width:200px"><label>Buscar</label>${B.ico("buscar", 'style="top:auto;bottom:11px;transform:none"')}<input class="inp" id="rgQ" value="${U.esc(F.q)}" placeholder="Texto de la actividad…"></div>
      </div>
      <div class="pestanas"><button data-v="actividades" class="${this.vista === "actividades" ? "on" : ""}">Actividades (${lista.length})</button><button data-v="personas" class="${this.vista === "personas" ? "on" : ""}">Resumen por persona (${personas.length})</button><button data-v="he" class="${this.vista === "he" ? "on" : ""}">Horas extra (${U.fmtNum(heTot)} h)</button></div>
      <div class="tabla-cont">${this.vista === "he" ? (heLista.length ? `<table class="tabla"><thead><tr><th>Fecha</th><th>Turno</th><th>Persona</th><th>Categoría</th><th class="c">Horas</th><th>Horario</th><th>Alim.</th><th>Motivo</th><th>Verificación</th><th>Obs. supervisor</th></tr></thead><tbody>
        ${heLista.map(h => `<tr><td class="tnum">${U.corta(h.fecha)}</td><td>${h.turno}</td><td style="min-width:170px"><a href="#" data-per="${U.esc(h.ini)}"><b>${U.esc(h.ini)}</b></a><div class="muted peque">${U.esc(B.dom.nombre(h.ini))}</div></td>
          <td class="muted peque">${U.esc(B.dom.catCorta((B.dom.persona(h.ini) || {}).cat || ""))}</td><td class="c tnum"><b>${U.fmtNum(U.num(h.he))}</b></td><td class="tnum" style="white-space:nowrap">${h.de ? U.esc(h.de + " – " + h.a) : ""}</td><td class="muted peque">${[h.alD && "D", h.alC && "C", h.alCe && "Ce"].filter(Boolean).join(" ")}</td><td style="min-width:240px">${h.mot ? U.esc(h.mot) : '<span class="muted">Sin motivo</span>'}</td>
          <td>${U.norm(h.verif) === "SI" ? '<span class="badge v">Verificada</span>' : '<span class="badge d">Por verificar</span>'}</td><td class="muted peque" style="min-width:160px">${U.esc(h.obs || "")}</td></tr>`).join("")}
        <tr><td colspan="4" style="text-align:right"><b>Total</b></td><td class="c tnum"><b>${U.fmtNum(heTot)}</b></td><td colspan="5"></td></tr></tbody></table>`
        : ui.vacio("Sin horas extra con estos filtros.", "reloj"))
        : this.vista === "actividades" ? (lista.length ? `<table class="tabla"><thead><tr><th>Fecha</th><th>Turno</th><th>Persona</th><th>Categoría</th><th>Actividad</th><th>Estatus</th><th>Comentarios / seguimiento</th><th></th></tr></thead><tbody>
        ${lista.slice(0, 800).map(a => `<tr><td class="tnum">${U.corta(a.fecha)}</td><td>${a.turno}</td><td style="min-width:170px">${a.ini ? `<a href="#" data-per="${U.esc(a.ini)}"><b>${U.esc(a.ini)}</b></a><div class="muted peque">${U.esc(B.dom.nombre(a.ini))}</div>` : '<span class="badge d">POR ASIGNAR</span>'}</td>
          <td class="muted peque">${U.esc(B.dom.catCorta((B.dom.persona(a.ini) || {}).cat || ""))}</td><td style="min-width:280px">${U.esc(a.txt)}</td><td>${ui.estatusBadge(a.est)}</td>
          <td class="muted peque" style="min-width:180px">${a.com ? `<div>↳ ${U.esc(a.com)}</div>` : ""}${U.esc(B.dom.ultimaLinea(a.seg))}${B.dom.comentarios(a).length ? `<div><a href="#" data-coms="${a.id}">Editar o eliminar comentarios (${B.dom.comentarios(a).length})</a></div>` : ""}</td>
          <td class="acc" style="white-space:nowrap"><button class="btn fantasma btn-icono" data-edact="${a.id}" title="Cambiar estatus o corregir texto">${B.ico("editar")}</button><button class="btn fantasma btn-icono" data-reasig="${a.id}" title="Reasignar o dejar sin asignar">${B.ico("usuarios")}</button></td></tr>`).join("")}</tbody></table>${lista.length > 800 ? `<p class="muted peque" style="padding:8px 12px">Se muestran 800 de ${lista.length}; usa los filtros o exporta a Excel.</p>` : ""}`
        : ui.vacio("Sin actividades con estos filtros.", "lista"))
        : (personas.length ? `<table class="tabla"><thead><tr><th>Persona</th><th>Categoría</th><th class="c">Turnos con actividad</th><th class="c">Actividades</th><th class="c">Realizadas</th><th class="c">Abiertas</th><th class="c">Esp. confinados</th><th class="c">Vigilancias</th><th class="c">Horas extra</th></tr></thead><tbody>
        ${personas.map(i => { const x = per.get(i), p = B.dom.persona(i); return `<tr><td style="min-width:280px"><a href="#" data-per="${U.esc(i)}"><b>${U.esc(i)}</b></a> <span class="muted">${U.esc(p.nombre)}</span></td><td class="muted">${U.esc(B.dom.catCorta(p.cat))}</td>
          <td class="c">${x.turnos.size}</td><td class="c">${x.act}</td><td class="c">${x.real}</td><td class="c">${x.abiertas ? `<span class="badge r">${x.abiertas}</span>` : 0}</td><td class="c">${x.ec}</td><td class="c">${x.vig}</td><td class="c">${U.fmtNum(x.he)}</td></tr>`; }).join("")}</tbody></table>`
        : ui.vacio("Sin registros con estos filtros.", "usuarios"))}</div></div>`;
    const re = () => B.app.render();
    c.querySelector("#rgD1").onchange = e => { F.d1 = e.target.value; re(); };
    c.querySelector("#rgD2").onchange = e => { F.d2 = e.target.value; re(); };
    c.querySelector("#rgT").onchange = e => { F.turno = e.target.value; re(); };
    c.querySelector("#rgC").onchange = e => { F.cat = e.target.value; re(); };
    c.querySelector("#rgE").onchange = e => { F.est = e.target.value; re(); };
    c.querySelector("#rgQ").oninput = U.debounce(e => { F.q = e.target.value; const pos = e.target.selectionStart; re(); const i = document.getElementById("rgQ"); i.focus(); i.setSelectionRange(pos, pos); }, 350);
    ui.combo(c.querySelector("#rgP"), { items: () => ui.personas(null, true), estricto: false, alElegir: v => { F.ini = v && B.dom.persona(v) ? U.ini(v) : ""; re(); } });
    c.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { this.vista = b.dataset.v; re(); });
    c.querySelectorAll("[data-coms]").forEach(b => b.onclick = e => { e.preventDefault(); V.actividades.comentarios(+b.dataset.coms); });
    c.querySelectorAll("[data-edact]").forEach(b => b.onclick = () => B.editarActividad(+b.dataset.edact));
    c.querySelectorAll("[data-reasig]").forEach(b => b.onclick = () => V.actividades.reasignar(+b.dataset.reasig));
    c.querySelectorAll("[data-per]").forEach(a => a.onclick = e => { e.preventDefault(); V.historial.persona = a.dataset.per; V.historial.d1 = F.d1; V.historial.d2 = F.d2; location.hash = "#/historial"; });
    c.querySelector("#rgCsv").onclick = () => this.vista === "he" ? U.csv("Horas extra del personal " + U.corta(F.d1).replace(/\//g, ".") + " al " + U.corta(F.d2).replace(/\//g, "."),
      ["Fecha", "Turno", "Iniciales", "Nombre", "Categoría", "Horas", "De", "A", "Desayuno", "Comida", "Cena", "Motivo", "Verificada", "Obs. supervisor"],
      heLista.map(h => [U.corta(h.fecha), h.turno, h.ini, B.dom.nombre(h.ini), B.dom.catCorta((B.dom.persona(h.ini) || {}).cat || ""), U.num(h.he), h.de || "", h.a || "", h.alD ? 1 : "", h.alC ? 1 : "", h.alCe ? 1 : "", h.mot || "", U.norm(h.verif) === "SI" ? "SI" : "NO", h.obs || ""]))
      : U.csv("Registros del personal " + U.corta(F.d1).replace(/\//g, ".") + " al " + U.corta(F.d2).replace(/\//g, "."),
      ["Fecha", "Turno", "Iniciales", "Nombre", "Categoría", "Actividad", "Estatus", "Seguimiento", "Fecha cierre", "Cerró"],
      lista.map(a => [U.corta(a.fecha), a.turno, a.ini, B.dom.nombre(a.ini), B.dom.catCorta((B.dom.persona(a.ini) || {}).cat || ""), a.txt, a.est, (a.seg || "").replace(/\n/g, " | "), U.corta(a.fCierre), a.cerro]));
  }
};

/* Supervisor: corregir una actividad guardada (texto, estatus, unidad). Se usa en Registros del personal y en Historial por persona */
B.editarActividad = async function (id) {
      const a = B.estado.actividades.find(x => x.id === id); if (!a) return;
      const T0 = B.app.trabajo, ops = a.ini ? ["Realizada", "En proceso", "Pendiente", "Concluida"] : [...new Set(["Pendiente", a.est])];      // sin asignar: conserva su estatus o vuelve a pendiente
      const r = await ui.modal({
        titulo: "Editar actividad · ID " + a.id, icono: "editar", ancho: true,
        html: `<p class="muted peque" style="margin:0 0 10px">${a.ini ? "<b>" + U.esc(a.ini) + "</b> " + U.esc(B.dom.nombre(a.ini)) : "Por asignar"} · ${B.t.corto(a.fecha, a.turno)}</p>
          <div class="campo"><label>Actividad</label><textarea class="inp" id="eaTxt" rows="3">${U.esc(a.txt)}</textarea></div>
          <div class="campo"><label>Estatus</label>${ui.seg("eaEst", ops, a.est, "estatus")}</div>
          <div class="campo"><label>Unidad (hoja de asignación)</label>${ui.seg("eaUni", ["General", "Unidad 1", "Unidad 2"], { "": "General", U1: "Unidad 1", U2: "Unidad 2" }[a.uni || ""])}</div>
          ${a.grupo && B.estado.actividades.filter(x => x.grupo === a.grupo).length > 1 ? `<p class="muted peque" style="margin:0 0 8px">Actividad compartida con <b>${U.esc(B.estado.actividades.filter(x => x.grupo === a.grupo).map(x => x.ini).join("/"))}</b>: el cambio vale para todos.</p>` : ""}
          <p class="muted peque" style="margin:0"><b>Realizada</b>: sale solo en el reporte de su turno. <b>En proceso / Pendiente</b>: se repite en cada reporte hasta concluirla.
          <b>Concluida</b>: se cierra en el turno de trabajo seleccionado (${B.t.corto(T0.f, T0.t)}).</p>`,
        alAbrir: v => ui.activarSeg(v),
        botones: [{ t: "Cancelar", c: "sec", v: null }, { t: "Guardar", c: "verde", v: v => ({ txt: v.querySelector("#eaTxt").value.trim(), est: ui.segValor(v.querySelector('[data-seg="eaEst"]')), uni: { General: "", "Unidad 1": "U1", "Unidad 2": "U2" }[ui.segValor(v.querySelector('[data-seg="eaUni"]'))] }) }]
      });
      if (!r) return;
      if (!r.txt) { ui.toast("La actividad no puede quedar vacía.", "error"); return; }
      if (r.txt === a.txt && r.est === a.est && r.uni === (a.uni || "")) { ui.toast("Sin cambios.", ""); return; }
      await ejecutar(() => B.api.op("actividades", "estatus", { id: a.id, est: r.est, txt: r.txt, uni: r.uni, fecha: T0.f, turno: T0.t }), "Actividad actualizada.");
};
;
/* ---- horasextra.js ---- */
/* =========================================================================
   BITACORA 24RU1 - Mis horas extra (apartado propio de captura)
   - El técnico registra por fecha y turno: horario De / A en pasos de 30 minutos
     (las horas se calculan solas; mínimo 30 min), alimentos y justificación.
   - Si el tiempo extra fue en horarios separados el mismo día, se agrega otro
     registro complementario (tramo) sin traslapar horarios.
   - La justificación puede ser la general de la recarga y unificarse en la semana.
   - El supervisor puede capturar o corregir las de cualquier persona.
   ========================================================================= */
"use strict";
V.horasextra = {
  titulo: "Mis horas extra",
  sub() { return B.dom.esSup() ? "Captura y consulta de horas extra del personal" : "Registra aquí tu tiempo extra; con esto se llena tu oficio semanal"; },
  f: null, t: null, ini: null, tramo: null,
  ALI: [["alD", "Desayuno"], ["alC", "Comida"], ["alCe", "Cena"]],
  semana(ini, lunes) {
    const fin = U.sumar(lunes, 6);
    return B.estado.he.filter(h => U.ini(h.ini) === U.ini(ini) && h.fecha >= lunes && h.fecha <= fin && (U.num(h.he) || h.de))
      .sort((a, b) => B.t.clave(a.fecha, a.turno) - B.t.clave(b.fecha, b.turno) || (a.de || "").localeCompare(b.de || "") || +B.dom.tramo(a) - +B.dom.tramo(b));
  },
  totalSemana(ini, lunes) { return this.semana(ini, lunes).reduce((n, h) => n + (U.num(h.he) || 0), 0); },
  render(c) {
    const sup = B.dom.esSup(), D = B.dom;
    if (!this.f) { this.f = T().f; this.t = T().t; }
    if (!this.ini || !sup) this.ini = this.ini && sup ? this.ini : yo();
    const ini = this.ini, f = this.f, t = this.t, esYo = ini === yo();
    const delDia = D.hesDe(f, t, ini).filter(x => U.num(x.he) || x.de);
    if (this.tramo !== "nuevo" && !delDia.some(x => D.tramo(x) === this.tramo)) this.tramo = delDia.length ? D.tramo(delDia[0]) : "nuevo";
    const h = this.tramo === "nuevo" ? null : delDia.find(x => D.tramo(x) === this.tramo);
    const nuevoTramo = String(Math.max(0, ...D.hesDe(f, t, ini).map(x => +D.tramo(x))) + 1);
    const L = D.lunes(f), lista = this.semana(ini, L);
    const tot = lista.reduce((n, x) => n + (U.num(x.he) || 0), 0), totDia = delDia.reduce((n, x) => n + (U.num(x.he) || 0), 0);
    const verif = h && U.norm(h.verif) === "SI";
    const general = D.heJust();
    const motivos = [...new Set([general, ...B.estado.he.filter(x => U.ini(x.ini) === ini && x.mot).map(x => x.mot.trim()).reverse()])].slice(0, 40);
    const ultimo = [...lista].reverse().find(x => x.mot);
    const motIni = h ? (h.mot || "") : (ultimo ? ultimo.mot : general);
    const horas = D.horasMedias();
    // la hora de termino admite 24:00 (tiempo extra que llega a la medianoche)
    const sel = (id, v, fin) => { const hs = fin ? [...horas, "24:00"] : horas; return `<select class="inp tnum" id="${id}"><option value="">--:--</option>${(v && !hs.includes(v) ? [v, ...hs] : hs).map(x => `<option ${x === v ? "selected" : ""}>${x}</option>`).join("")}</select>`; };
    const doble = !h && !delDia.length;
    // ultimo dia anterior con tiempo extra: se puede repetir tal cual (horarios, alimentos y justificacion)
    const K0 = B.t.clave(f, t), prevs = B.estado.he.filter(x => U.ini(x.ini) === U.ini(ini) && (U.num(x.he) || x.de) && B.t.clave(x.fecha, x.turno) < K0);
    const kUlt = prevs.reduce((m, x) => Math.max(m, B.t.clave(x.fecha, x.turno)), 0);
    const ult = prevs.filter(x => B.t.clave(x.fecha, x.turno) === kUlt).sort((a, b) => (a.de || "").localeCompare(b.de || ""));
    const aliDe = x => this.ALI.filter(([k]) => x[k]).map(([, e]) => e).join(", ");
    const resUlt = ult.map(x => (x.de ? x.de + " a " + x.a : U.fmtNum(U.num(x.he)) + " h") + (aliDe(x) ? " (" + aliDe(x) + ")" : "")).join(" y ");          // registro nuevo del dia: puede capturar de una vez sus dos horarios (antes y despues del turno)
    const etq = x => (x.de ? U.esc(x.de) + " a " + U.esc(x.a) : "Sin horario") + " · " + U.fmtNum(U.num(x.he) || 0) + " h";
    c.innerHTML = `
      <div class="cuadricula">
      <div class="tarjeta c7" data-tour="he-form">${cab("reloj", "d", h ? "Editar horas extra" : (delDia.length ? "Agregar otro horario del mismo día" : "Registrar horas extra"),
        esYo ? "Elige el día y turno, el horario (en horas o medias horas) y presiona Guardar. El tiempo extra cuenta a partir de 30 minutos." : "Capturando como <b>" + U.esc(ini) + " - " + U.esc(D.nombre(ini)) + "</b>",
        sup ? `<div class="campo" style="margin:0;min-width:260px"><input class="inp" id="hQuien" value="${U.esc(ini + " - " + D.nombre(ini))}" placeholder="Capturar como…"></div>` : "")}
        <div class="fila he-fila">
          <div class="campo" style="max-width:170px"><label>Fecha del turno</label><input class="inp" type="date" id="hF" value="${f}"></div>
          <div class="campo" style="max-width:220px"><label>Turno</label>${ui.seg("tur", ["T1", "T2"], t)}</div>
        </div>
        <p class="muted peque" style="margin:-6px 0 12px">${t} ${U.esc(B.t.nombre(t))} · ${U.esc(B.t.horario(t))}${t === "T1" ? " · el T1 lleva la fecha del día en que SALES" : ""}</p>
        ${doble && ult.length ? `<div class="aviso d" data-tour="he-repetir" style="margin-bottom:12px">${B.ico("reutilizar")}<div style="flex:1"><b>¿Fue igual que tu registro anterior?</b> ${U.diaSemana(ult[0].fecha)} ${U.cortaDM(ult[0].fecha)} ${ult[0].turno}: ${U.esc(resUlt)} · ${U.fmtNum(ult.reduce((n, x) => n + (U.num(x.he) || 0), 0))} h
          <div class="muted peque">${U.esc(ult[0].mot || "")}</div></div><button class="btn dorado chico" id="hRepetir">${B.ico("reutilizar")} Repetir en este día</button></div>` : ""}
        ${delDia.length ? `<div class="campo" data-tour="he-tramos"><label>Horarios registrados este día · total ${U.fmtNum(totDia)} h</label><div class="chips-ali">
          ${delDia.map(x => `<button type="button" class="chip-tramo ${h === x ? "on" : ""}" data-tr="${D.tramo(x)}">${etq(x)}</button>`).join("")}
          <button type="button" class="chip-tramo mas ${this.tramo === "nuevo" ? "on" : ""}" data-tr="nuevo">${B.ico("mas", 'style="width:13px;height:13px"')} Otro horario</button></div>
          <span class="ayuda">¿Hiciste tiempo extra en horarios separados el mismo día? Agrega <b>otro horario</b>; no deben traslaparse.</span></div>` : ""}
        <div class="fila he-fila">
          <div class="campo" style="max-width:140px"><label>De</label>${sel("hDe", h?.de || "")}</div>
          <div class="campo" style="max-width:140px"><label>A</label>${sel("hA", h?.a || "", true)}</div>
          <div class="campo" style="max-width:130px"><label>${doble ? "Horas del día" : "Horas"}</label><input class="inp tnum" id="hHe" value="${U.esc(h?.he || "")}" readonly tabindex="-1" style="background:#F4F2F0;font-weight:700"></div>
        </div>
        ${doble ? `<div class="fila he-fila" data-tour="he-doble" style="margin-top:-4px">
          <div class="campo" style="max-width:140px"><label>Segundo horario · De</label>${sel("hDe2", "")}</div>
          <div class="campo" style="max-width:140px"><label>A</label>${sel("hA2", "", true)}</div>
          <div class="campo" style="flex:1;min-width:200px"><label>&nbsp;</label><span class="ayuda" style="display:block;padding-top:8px">Opcional: si ese día hiciste tiempo extra <b>antes y después</b> de tu turno (ej. 05:00 a 07:30 y 19:30 a 22:00). En el oficio salen en el mismo renglón y se suman.</span></div>
        </div>` : ""}
        <div class="campo"><label>Alimentos</label><div class="chips-ali">${this.ALI.map(([k, e]) =>
          `<label class="chip-ali"><input type="checkbox" data-al="${k}" ${h && h[k] ? "checked" : ""}><span>${e}</span></label>`).join("")}</div></div>
        <div class="campo" data-tour="he-just"><label>Justificación</label><input class="inp" id="hMot" list="dlMot" value="${U.esc(motIni)}">
          <datalist id="dlMot">${motivos.map(m => `<option value="${U.esc(m)}">`).join("")}</datalist>
          <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:6px">
            <a href="#" id="hGen" class="peque">Usar la justificación general</a>
            <label class="peque" style="display:inline-flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="hTodos" style="accent-color:var(--guinda)"> Usar esta misma justificación en todos ${esYo ? "mis" : "sus"} registros de esta semana</label></div></div>
        ${verif ? `<div class="aviso v" style="margin-bottom:12px">${B.ico("ok")}<div>Estas horas ya fueron <b>verificadas por el supervisor</b>. Si las cambias, avísale.</div></div>` : ""}
        <div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">
          ${h ? `<button class="btn fantasma" id="hBorrar">${B.ico("basura")} Quitar este registro</button>` : "<span></span>"}
          <button class="btn verde" id="hGuardar" data-tour="he-guardar">${B.ico("ok")} ${h ? "Guardar cambios" : "Guardar horas extra"}</button></div>
      </div>

      <div class="tarjeta c5" data-tour="he-semana">${cab("calendario", "a", "Semana del " + U.cortaDM(L) + " al " + U.cortaDM(U.sumar(L, 6)),
        "Total: <b>" + U.fmtNum(tot) + " h</b> · " + lista.length + " registro(s)",
        `<button class="btn fantasma btn-icono" id="hAnt" title="Semana anterior">‹</button><button class="btn fantasma btn-icono" id="hSig" title="Semana siguiente">›</button>`)}
        ${lista.length ? `<div class="lista">${lista.map(x => {
          const al = this.ALI.filter(([k]) => x[k]).map(([, e]) => e).join(", "), es = h === x;
          return `<a href="#" class="item" data-ed="${x.fecha}|${x.turno}|${D.tramo(x)}" style="color:inherit;${es ? "background:var(--dorado-claro);" : ""}">
            <span class="badge ${U.norm(x.verif) === "SI" ? "v" : "d"}" title="${U.norm(x.verif) === "SI" ? "Verificada" : "Por verificar"}">${U.fmtNum(U.num(x.he))} h</span>
            <div class="cuerpo"><div class="tit">${U.diaSemana(x.fecha)} ${U.cortaDM(x.fecha)} · ${x.turno}${x.de ? " · " + U.esc(x.de) + " a " + U.esc(x.a) : ""}</div>
            <div class="meta"><span>${U.esc(x.mot || "Sin justificación")}</span>${al ? `<span>${U.esc(al)}</span>` : ""}</div></div>${B.ico("editar", 'style="width:16px;height:16px;color:var(--texto-3)"')}</a>`; }).join("")}</div>`
          : ui.vacio("Sin horas extra registradas en esta semana.", "reloj")}
        <a class="btn sec bloque" href="#/oficio" id="hOficio" style="margin-top:12px">${B.ico("doc")} ${esYo ? "Ver mi oficio de esta semana" : "Ver su oficio de esta semana"}</a>
      </div>
      </div>`;

    const re = () => B.app.render();
    const ir = (nf, nt, tr) => { this.f = nf; this.t = nt; this.tramo = tr || null; re(); };
    c.querySelector("#hF").onchange = e => { if (e.target.value) ir(e.target.value, this.t); };
    ui.activarSeg(c, (s, v) => { if (s.dataset.seg === "tur") ir(this.f, v); });
    c.querySelector("#hAnt").onclick = () => ir(U.sumar(L, -7), this.t);
    c.querySelector("#hSig").onclick = () => ir(U.sumar(L, 7), this.t);
    c.querySelectorAll("[data-ed]").forEach(a => a.onclick = e => { e.preventDefault(); const [nf, nt, tr] = a.dataset.ed.split("|"); ir(nf, nt, tr); });
    c.querySelectorAll("[data-tr]").forEach(b => b.onclick = () => ir(f, t, b.dataset.tr));
    c.querySelector("#hOficio").onclick = () => { V.oficio.lunes = L; V.oficio.ini = ini; };
    if (sup) ui.combo(c.querySelector("#hQuien"), { items: () => ui.personas(null, true), alElegir: v => { if (v) { this.ini = U.ini(v); this.tramo = null; re(); } } });
    const val = id => { const x = c.querySelector(id); return x ? x.value : ""; };
    const calc = () => { const v = D.horasEntre(val("#hDe"), val("#hA")), v2 = D.horasEntre(val("#hDe2"), val("#hA2")); c.querySelector("#hHe").value = v != null ? Math.round((v + (v2 || 0)) * 100) / 100 : ""; };
    ["#hDe", "#hA", "#hDe2", "#hA2"].forEach(id => { const x = c.querySelector(id); if (x) x.onchange = calc; });
    c.querySelector("#hGen").onclick = e => { e.preventDefault(); c.querySelector("#hMot").value = general; };
    const guardar = async () => {
      const de = c.querySelector("#hDe").value, a = c.querySelector("#hA").value, mot = c.querySelector("#hMot").value.trim();
      const al = {}; c.querySelectorAll("[data-al]").forEach(x => al[x.dataset.al] = x.checked ? "1" : "");
      if (!de || !a) { ui.toast("Elige la hora de inicio (De) y la de término (A) del tiempo extra.", "error"); return; }
      if (!/:(00|30)$/.test(de) || !/:(00|30)$/.test(a)) { ui.toast("El horario se registra en horas o medias horas (ej. 19:00 o 19:30).", "error"); return; }
      const he = D.horasEntre(de, a);
      if (he == null || he < 0.5 || he > 24) { ui.toast("Revisa el horario: el tiempo extra se registra a partir de 30 minutos.", "error"); return; }
      if (!mot) { ui.toast("Escribe la justificación: es obligatoria en el oficio.", "error"); c.querySelector("#hMot").focus(); return; }
      // segundo horario del mismo dia (opcional)
      const de2 = val("#hDe2"), a2 = val("#hA2"); let he2 = null;
      if (de2 || a2) {
        if (!de2 || !a2) { ui.toast("Segundo horario: elige la hora De y la hora A, o déjalo vacío.", "error"); return; }
        he2 = D.horasEntre(de2, a2);
        const min = x => +x.split(":")[0] * 60 + +x.split(":")[1], x1 = min(de), x2 = min(a) <= min(de) ? min(a) + 1440 : min(a), y1 = min(de2), y2 = min(a2) <= min(de2) ? min(a2) + 1440 : min(a2);
        if (he2 == null || he2 < 0.5 || he2 > 24) { ui.toast("Revisa el segundo horario: el tiempo extra se registra a partir de 30 minutos.", "error"); return; }
        if (x1 < y2 && y1 < x2) { ui.toast("Los dos horarios se traslapan. Corrígelos.", "error"); return; }
      }
      const b = c.querySelector("#hGuardar"); b.disabled = true;
      try {
        const tramo = h ? D.tramo(h) : nuevoTramo;
        await B.api.op("he", "guardar", { fecha: f, turno: t, ini, tramo, he: String(he), mot, de, a, ...al });
        if (he2 != null) await B.api.op("he", "guardar", { fecha: f, turno: t, ini, tramo: String(+tramo + 1), he: String(he2), mot, de: de2, a: a2, alD: "", alC: "", alCe: "" });
        let extra = "";
        if (c.querySelector("#hTodos").checked) { const r = await B.api.op("he", "justificar", { ini, d1: L, d2: U.sumar(L, 6), mot }); if (r.n) extra = ` Justificación unificada en ${r.n} registro(s) más.`; }
        this.tramo = tramo;
        await B.app.refrescar();
        ui.toast(`Horas extra guardadas: ${U.cortaDM(f)} ${t} · ${de} a ${a}${he2 != null ? " y " + de2 + " a " + a2 : ""} · ${U.fmtNum(he + (he2 || 0))} h.${extra}`, "ok");
      } catch (e) { ui.error(e); b.disabled = false; }
    };
    c.querySelector("#hGuardar").onclick = guardar;
    const bRep = c.querySelector("#hRepetir");
    if (bRep) bRep.onclick = async () => {
      if (!(await ui.confirmar(`Se registrará en <b>${U.diaSemana(f)} ${U.cortaDM(f)} ${t}</b> lo mismo que el ${U.cortaDM(ult[0].fecha)} ${ult[0].turno}:<br><b>${U.esc(resUlt)}</b><br><span class="muted">${U.esc(ult[0].mot || "")}</span><br><br>Después puedes corregir cualquier horario tocándolo en la lista.`, "Repetir horas extra", "Repetir"))) return;
      bRep.disabled = true;
      try {
        let n = 0;
        for (const x of ult) { n++; await B.api.op("he", "guardar", { fecha: f, turno: t, ini, tramo: String(n), he: String(U.num(x.he) || ""), mot: x.mot || "", de: x.de || "", a: x.a || "", alD: x.alD || "", alC: x.alC || "", alCe: x.alCe || "" }); }
        this.tramo = "1"; await B.app.refrescar();
        ui.toast(`Horas extra repetidas en ${U.cortaDM(f)} ${t}: ${U.esc(resUlt)}.`, "ok", 6000);
      } catch (e) { ui.error(e); await B.app.refrescar(); }
    };
    c.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); guardar(); } };
    const bb = c.querySelector("#hBorrar");
    if (bb) bb.onclick = async () => {
      if (!(await ui.confirmar(`¿Quitar las horas extra del ${U.cortaDM(f)} ${t}${h.de ? " (" + U.esc(h.de) + " a " + U.esc(h.a) + ")" : ""}?`, "Quitar registro", "Quitar", true))) return;
      this.tramo = null;
      await ejecutar(() => B.api.op("he", "guardar", { fecha: f, turno: t, ini, tramo: D.tramo(h), he: "", mot: "", de: "", a: "", alD: "", alC: "", alCe: "" }), "Registro quitado.");
    };
  }
};
;
/* ---- oficio.js ---- */
/* =========================================================================
   BITACORA 24RU1 - Oficio semanal de tiempo extraordinario (formato oficial)
   - Cada trabajador genera el suyo; el supervisor el de cualquiera o todos los de la semana.
   - Se llena con las horas extra capturadas (horario, justificación y alimentos) y se puede
     ajustar antes de imprimir. Técnicos C-42 llevan la leyenda ***PERSONAL EVENTUAL***.
   - Formato v1.6 (ejemplo oficial): un renglón por día con TODOS sus horarios apilados en DE / A
     y la suma en HORAS; justificación en cada renglón; fecha AAAAMMDD; prima dominical en observaciones.
   ========================================================================= */
"use strict";
B.oficio = {
  MESES: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
  DIAS: ["L", "M", "M", "J", "V", "S", "D"],
  CATEGORIAS: ["TÉCNICO II C. N.", "TÉCNICO SUPERIOR I", "TÉCNICO SUPERIOR II", "TÉCNICO A (TÉCNICO DE SEGURIDAD INDUSTRIAL)", "TÉCNICO B (TÉCNICO DE SEGURIDAD INDUSTRIAL)"],
  TITULOS: ["ING.", "MC.", "LIC.", "ARQ.", "TEC."],

  cfg() {
    const c = B.estado.config || {};
    return {
      linea1: c.ofLinea1 || "GERENCIA NUCLEOELÉCTRICA LAGUNA VERDE",
      linea2: c.ofLinea2 || "SUBGERENCIA DE SEGURIDAD NUCLEAR",
      linea3: c.ofLinea3 || "REPORTE SEMANAL DE TIEMPO EXTRAORDINARIO",
      depto: c.ofDepto || "OFICINA DE SEGURIDAD INDUSTRIAL",
      voboNombre: c.ofVoboNombre ?? "",
      voboCargo: c.ofVoboCargo ?? "ENCARGADO DE LA JEFATURA DE LA OFICINA DE SEGURIDAD INDUSTRIAL",
      autNombre: c.ofAutNombre ?? "",
      autCargo: c.ofAutCargo ?? "ENCARGADO DE LA SUBGERENCIA DE SEGURIDAD NUCLEAR"
    };
  },
  // semana ISO (la del formato: L/39 = lunes de la semana 39)
  semanaISO(f) {
    const d = U.fecha(f); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const e = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - e) / 864e5 - 3 + ((e.getDay() + 6) % 7)) / 7);
  },
  mesDia(f) { const d = U.fecha(f); return this.MESES[d.getMonth()] + "/" + String(d.getDate()).padStart(2, "0"); },
  diaSem(f, i) { return this.DIAS[i] + "/" + this.semanaISO(f); },
  eventual(ini) { const p = B.dom.persona(ini); return !!p && B.dom.catOrden(p.cat) === 2; },

  // datos del oficio guardados por cada usuario (categoría, título, depto.)
  perfil(ini) {
    const p = B.dom.persona(ini) || {}, rpe = U.ini(p.rpe || "");
    let u = null;
    if (B.usuario && U.ini(B.usuario.rpe) === rpe) u = B.usuario;
    else if (B.estado.usuarios) u = B.estado.usuarios.find(x => U.ini(x.rpe) === rpe);
    return { ofCat: (u && u.ofCat) || "", ofTit: (u && u.ofTit) || "", ofDepto: (u && u.ofDepto) || "" };
  },

  // 7 renglones (lunes a domingo) a partir de las horas extra capturadas
  filas(ini, lunes) {
    return Array.from({ length: 7 }, (_, i) => {
      const f = U.sumar(lunes, i);
      const regs = B.estado.he.filter(h => h.fecha === f && U.ini(h.ini) === U.ini(ini) && (U.num(h.he) || h.de))
        .sort((a, b) => (a.turno === "T1" ? 0 : 1) - (b.turno === "T1" ? 0 : 1) || (a.de || "").localeCompare(b.de || ""));
      const horas = regs.reduce((n, h) => n + (U.num(h.he) || 0), 0);
      const conHorario = regs.filter(h => h.de && h.a);
      return {
        f, i, n: regs.length, tramo: regs.length === 1 ? B.dom.tramo(regs[0]) : "",
        // varios horarios el mismo dia: van apilados en DE / A del mismo renglon y en HORAS la suma
        tramos: conHorario.map(h => ({ de: h.de, a: h.a })),
        just: [...new Set(regs.map(h => (h.mot || "").trim()).filter(Boolean))].join(" / "),
        de: (regs.find(h => h.de) || {}).de || "", a: ([...regs].reverse().find(h => h.a) || {}).a || "",
        horas: regs.length && horas ? String(Math.round(horas * 100) / 100) : "",
        alD: regs.some(h => h.alD) ? "1" : "", alC: regs.some(h => h.alC) ? "1" : "", alCe: regs.some(h => h.alCe) ? "1" : "",
        turno: regs.length === 1 ? regs[0].turno : regs.length ? "" : (B.dom.turnoEfectivo(ini, f) || "T2")
      };
    });
  },
  conHE(lunes) {
    const fin = U.sumar(lunes, 6), s = new Set();
    for (const h of B.estado.he) if (h.fecha >= lunes && h.fecha <= fin && U.num(h.he)) s.add(U.ini(h.ini));
    return B.dom.ordenados([...s]);
  },
  // hoja completa de una persona (datos + renglones), lista para imprimir
  hoja(ini, lunes, ajustes) {
    const p = B.dom.persona(ini) || { nombre: ini, rpe: "" }, pf = this.perfil(ini), c = this.cfg(), a = ajustes || {};
    return {
      ini, lunes,
      nombre: (p.nombre || "").toUpperCase(), rpe: p.rpe || "",
      cat: (a.cat ?? pf.ofCat) || "", tit: (a.tit ?? pf.ofTit) || "", depto: (a.depto ?? pf.ofDepto) || c.depto,
      fecha: a.fecha || U.sumar(lunes, 7), eventual: a.eventual ?? this.eventual(ini),
      ...(() => {
        const filas = a.filas || this.filas(ini, lunes), con = filas.filter(r => U.num(r.horas));
        const frases = [...new Set(con.map(r => (r.just || "").trim()))];
        return {
          filas, obs: a.obs ?? (filas[6] && U.num(filas[6].horas) ? "APLICA PRIMA DOMINICAL" : ""),
          // una sola frase para toda la semana cuando la justificacion es la misma en todos los dias
          comun: frases.length === 1 ? frases[0] : "",
          unificar: (a.unificar ?? false) && con.length >= 2 && frases.length === 1 && !!frases[0]
        };
      })()
    };
  },

  documento(hojas) {
    const c = this.cfg(), url = t => B.imgUrl(t);
    const css = `
    @page { size: letter landscape; margin: 0.25in 0.35in 0.2in 0.35in; }
    html, body { margin: 0; }
    body { font-family: "Segoe UI", "Noto Sans", Arial, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hoja { width: 10.3in; height: 8.02in; margin: 0 auto; position: relative; page-break-after: always; break-after: page; overflow: hidden; }
    .hoja:last-child { page-break-after: auto; break-after: auto; }
    .cab { display: grid; grid-template-columns: 2.9in 1fr 2.9in; align-items: center; height: 0.9in; }
    .cab .izq img { height: 0.48in; display: block; }
    .cab .der { text-align: right; } .cab .der img { height: 0.86in; margin-right: 0.45in; }
    .cab .centro { text-align: center; font-weight: 700; font-size: 8.6pt; line-height: 1.35; }
    .ev { text-align: center; font-weight: 700; font-size: 11pt; margin-top: 0.1in; min-height: 0.19in; }
    .enc { display: flex; justify-content: space-between; align-items: flex-start; margin: 0.02in 0 0.1in 0.05in; }
    .enc .fe { display: flex; gap: 0.3in; align-items: baseline; font-weight: 700; font-size: 9.5pt; }
    .enc .fe span { display: inline-block; min-width: 2.6in; border-bottom: 1px solid #000; padding-left: 0.08in; }
    .datos { font-size: 9.5pt; font-weight: 700; }
    .datos td { padding: 0 0.3in 1px 0; vertical-align: top; }
    .datos td.v { text-decoration: underline; min-width: 3.1in; max-width: 5in; }
    table.te { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
    table.te th { border: 1px solid #000; font-weight: 700; font-size: 9.5pt; padding: 1px 2px; }
    table.te td { border: 1px solid #000; text-align: center; height: 0.28in; padding: 0 3px; line-height: 1.25; }
    table.te td.j { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; line-height: 1.15; text-align: left; padding: 1px 4px; }
    table.te td.md { font-weight: 700; }
    table.te td.ju { font-size: 9pt; line-height: 1.3; padding: 0 0.25in; }
    .g { background: #BFBFBF; }
    tr.tot td { height: 0.2in; font-weight: 700; }
    tr.tot td.g2 { background: #A6A6A6; font-size: 9.5pt; }
    .favor { text-align: center; font-weight: 700; font-size: 9.5pt; margin: 0.04in 0 0.06in; }
    .obs { display: flex; gap: 0.1in; align-items: flex-end; font-weight: 700; font-size: 9.5pt; margin-right: 0.05in; }
    .obs span { flex: 1; border-bottom: 1px solid #000; font-weight: 400; font-size: 8.5pt; min-height: 0.18in; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.45in; margin-top: 0.14in; text-align: center; }
    .firmas .t { font-weight: 700; font-size: 10pt; }
    .firmas .n { font-weight: 700; font-size: 8pt; margin-top: 0.03in; border-bottom: 2px solid #000; padding-bottom: 2px; }
    .firmas .c { font-weight: 700; font-size: 8pt; margin-top: 2px; }
    .notas { font-size: 5.6pt; margin-top: 0.08in; line-height: 1.3; }
    .pie { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; }
    .pie img { width: 8.6in; max-height: 0.9in; object-fit: contain; display: block; margin: 0 auto; }
    @media screen { body { background: #fff; padding: 0.25in 0; } .hoja { box-shadow: 0 0 0 1px #ddd; margin-bottom: 0.3in; } }`;
    const pag = h => {
      const tot = { horas: 0, d: 0, c: 0, ce: 0 };
      h.filas.forEach(r => { tot.horas += U.num(r.horas) || 0; tot.d += r.alD ? 1 : 0; tot.c += r.alC ? 1 : 0; tot.ce += r.alCe ? 1 : 0; });
      const hayAli = tot.d + tot.c + tot.ce > 0;
      const elaboro = ((h.tit ? h.tit.trim() + " " : "") + h.nombre).trim();
      const filas = h.filas.map(r => {
        const usa = !!(U.num(r.horas) || r.de || r.just);
        const al = k => r[k] ? `<td>1</td>` : `<td class="g"></td>`;
        const cj = h.unificar ? (r.i === 0 ? `<td class="ju" rowspan="${h.filas.length}">${U.esc(h.comun)}</td>` : "") : `<td class="j ${usa ? "" : "g"}">${U.esc((r.just || "").toUpperCase())}</td>`;
        // todos los horarios del dia en el mismo renglon (uno debajo de otro)
        const tr = (r.n > 1 && r.tramos && r.tramos.length > 1) ? r.tramos : ((r.de || r.a) ? [{ de: r.de, a: r.a }] : []);
        return `<tr>${cj}<td class="md">${this.mesDia(r.f)}</td><td>${this.diaSem(h.lunes, r.i)}</td>
          <td class="${usa ? "" : "g"}">${tr.map(x => U.esc(x.de)).join("<br>")}</td><td class="${usa ? "" : "g"}">${tr.map(x => U.esc(x.a)).join("<br>")}</td><td class="${usa ? "" : "g"}">${U.esc(r.horas)}</td>${al("alD")}${al("alC")}${al("alCe")}</tr>`;
      }).join("");
      return `<div class="hoja">
        <div class="cab"><div class="izq"><img src="${url("ofIzq")}" alt=""></div>
          <div class="centro">${U.esc(c.linea1)}<br>${U.esc(c.linea2)}<br>${U.esc(c.linea3)}</div>
          <div class="der"><img src="${url("ofDer")}" alt=""></div></div>
        <div class="ev">${h.eventual ? "***PERSONAL EVENTUAL***" : ""}</div>
        <div class="enc"><table class="datos"><tr><td>NOMBRE:</td><td class="v">${U.esc(h.nombre)}</td></tr><tr><td>R.P.E.</td><td class="v">${U.esc(h.rpe)}</td></tr>
          <tr><td>CATEGORÍA</td><td class="v">${U.esc(h.cat.toUpperCase()) || "&nbsp;"}</td></tr><tr><td>DEPTO.</td><td class="v">${U.esc(h.depto.toUpperCase())}</td></tr></table>
          <div class="fe">FECHA: <span>${U.esc(h.fecha.replace(/-/g, ""))}</span></div></div>
        <table class="te"><colgroup><col style="width:37.5%"><col style="width:8.5%"><col style="width:8.5%"><col style="width:7.2%"><col style="width:7.2%"><col style="width:8.6%"><col style="width:5.8%"><col style="width:5.8%"><col style="width:5.8%"></colgroup>
          <thead><tr><th rowspan="2">***JUSTIFICACIÓN</th><th rowspan="2">MES/DIA</th><th rowspan="2">DIA/SEM</th><th colspan="2">HORARIO</th><th rowspan="2">HORAS</th><th colspan="3">ALIMENTOS</th></tr>
          <tr><th>DE</th><th>A</th><th>D</th><th>C</th><th>C</th></tr></thead>
          <tbody>${filas}
          <tr class="tot"><td class="g2">TOTAL, TIEMPO EXTRA Y ALIMENTOS</td><td class="g2"></td><td class="g2"></td><td class="g2"></td><td class="g2"></td><td>${tot.horas ? U.fmtNum(tot.horas) : ""}</td>
            ${hayAli ? `<td>${tot.d}</td><td>${tot.c}</td><td>${tot.ce}</td>` : `<td class="g"></td><td class="g"></td><td class="g"></td>`}</tr></tbody></table>
        <div class="favor">FAVOR DE LLENAR TODOS LOS DATOS SOLICITADOS CON LETRA LEGIBLE Y SIN ENMENDADURAS PARA PODER SER AFECTADOS.</div>
        <div class="obs">OBSERVACIONES: <span>${U.esc(h.obs)}</span></div>
        <div class="firmas">
          <div><div class="t">ELABORÓ</div><div class="n">${U.esc(elaboro)}</div><div class="c">TRABAJADOR</div></div>
          <div><div class="t">Vo. &nbsp; Bo.</div><div class="n">${U.esc(c.voboNombre) || "&nbsp;"}</div><div class="c">${U.esc(c.voboCargo)}</div></div>
          <div><div class="t">AUTORIZA</div><div class="n">${U.esc(c.autNombre) || "&nbsp;"}</div><div class="c">${U.esc(c.autCargo)}</div></div></div>
        <div class="notas">NOTAS:<br>
          1.- EL CUMPLIMIENTO DE TIEMPO LABORADO DEBERÁ ESTAR DENTRO DE LOS ESTABLECIDO EN EL PAG-18,” CONTROL DE TIEMPO EXTRA LABORADO EN EXCESO PARA ACTIVIDADES RELACIONADAS CON SEGURIDAD.”<br>
          2.- DEBERÁ ANOTARSE NOMBRE DE QUIEN AUTORIZA Y DE QUIEN FIRMA EL VISTO BUENO.<br>
          3.- EL MES DEBERÁ ABREVIARSE CON LAS TRES PRIMERAS LETRAS QUE LE CORRESPONDA.<br>
          4.- EN LA COLUMNA DE JUSTIFICACIÓN SE DEBERÁ EXPLICAR CON DETALLE LAS RAZONES QUE JUSTIFICAN EL TIEMPO EXTRAORDINARIO Y PARTICULARMENTE LAS HORAS TRIPLES. SI REQUIERE UNA HOJA ADICIONAL FAVOR DE ANEXARLA.</div>
        <div class="pie"><img src="${url("ofPie")}" alt=""></div>
      </div>`;
    };
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Oficio de tiempo extra</title><style>${css}</style></head><body>${hojas.map(pag).join("")}</body></html>`;
  },

  doc(hojas, lunes) {
    const fin = U.corta(U.sumar(lunes, 6)).replace(/\//g, "."), ini = U.corta(lunes).replace(/\//g, ".");
    const nombre = hojas.length === 1 ? `OFICIO TIEMPO EXTRA ${hojas[0].ini} SEMANA ${ini} AL ${fin}` : `OFICIOS TIEMPO EXTRA (${hojas.length}) SEMANA ${ini} AL ${fin}`;
    return { html: this.documento(hojas), nombre, carpeta: "HORAS EXTRA", tipo: "oficio", horizontal: true };
  }
};

/* ===================================================================== VISTA */
V.oficio = {
  titulo: "Oficio de tiempo extra",
  lunes: null, ini: null, aj: {},          // aj: ajustes por persona y semana (se conservan al cambiar de sección)
  clave() { return this.ini + "|" + this.lunes; },
  render(c) {
    const sup = B.dom.esSup(), O = B.oficio;
    if (!this.lunes) this.lunes = B.dom.lunes(U.sumar(T().f, -7));     // por omisión: la semana anterior
    if (!this.ini || !sup) this.ini = this.ini && sup ? this.ini : yo();
    const L = this.lunes, ini = this.ini, k = this.clave();
    if (!this.aj[k]) this.aj[k] = {};
    const A = this.aj[k], h = O.hoja(ini, L, A), p = B.dom.persona(ini) || {}, pf = O.perfil(ini);
    const conHE = O.conHE(L), esYo = ini === yo();
    const opt = arr => arr.map(x => `<option value="${U.esc(x)}">`).join("");
    c.innerHTML = `
      <div class="tarjeta">${cab("doc", "g", sup ? "Oficios semanales de tiempo extra" : "Mi oficio semanal de tiempo extra",
        `Semana del lunes ${U.corta(L)} al domingo ${U.corta(U.sumar(L, 6))} · semana ${O.semanaISO(L)}`,
        `<button class="btn fantasma btn-icono" id="oAnt" title="Semana anterior">‹</button><input class="inp" type="date" id="oFecha" value="${L}" style="width:150px">
         <button class="btn fantasma btn-icono" id="oSig" title="Semana siguiente">›</button>`, "of-semana")}
        ${sup ? `<div class="filtros" style="align-items:flex-end">
          <div class="campo" style="min-width:300px;flex:1"><label>Persona</label><input class="inp" id="oPer" value="${U.esc(ini + " - " + B.dom.nombre(ini))}"></div>
          <div class="campo"><label>&nbsp;</label><button class="btn dorado" id="oTodos" ${conHE.length ? "" : "disabled"}>${B.ico("pdf")} Todos los de la semana (${conHE.length})</button></div></div>
          ${conHE.length ? `<p class="muted peque" style="margin:-4px 0 0">Con horas extra en la semana: ${conHE.map(i => `<a href="#" data-ir="${U.esc(i)}"><b>${U.esc(i)}</b></a>`).join(", ")}</p>` : `<p class="muted peque" style="margin:-4px 0 0">Nadie capturó horas extra en esta semana.</p>`}` : ""}
      </div>

      <div class="cuadricula">
      <div class="tarjeta c5" data-tour="of-datos">${cab("usuario", "a", esYo ? "Mis datos para el oficio" : "Datos de " + U.esc(ini), "La categoría, el título y el departamento se recuerdan para las siguientes semanas.")}
        <div class="campo"><label>Nombre</label><input class="inp" value="${U.esc(h.nombre)}" disabled></div>
        <div class="fila"><div class="campo"><label>R.P.E.</label><input class="inp" value="${U.esc(h.rpe)}" disabled></div>
          <div class="campo"><label>Título (opcional)</label><input class="inp" id="oTit" list="dlTit" value="${U.esc(h.tit)}" placeholder="ING., MC., LIC.…"></div></div>
        <div class="campo"><label>Categoría</label><input class="inp" id="oCat" list="dlCat" value="${U.esc(h.cat)}" placeholder="Ej. TÉCNICO II C. N."></div>
        <div class="campo"><label>Departamento</label><input class="inp" id="oDep" value="${U.esc(h.depto)}"></div>
        <div class="fila"><div class="campo"><label>Fecha del oficio</label><input class="inp" type="date" id="oFOf" value="${U.esc(h.fecha)}"></div>
          <div class="campo"><label>Leyenda</label><label class="chip-ali"><input type="checkbox" id="oEv" ${h.eventual ? "checked" : ""}><span>***PERSONAL EVENTUAL***</span></label></div></div>
        <p class="muted peque" style="margin:0">${O.eventual(ini) ? "Personal C-42: la leyenda <b>PERSONAL EVENTUAL</b> se agrega automáticamente." : "La leyenda PERSONAL EVENTUAL es para técnicos C-42."}
          ${!pf.ofCat && !A.cat ? `<br><span style="color:var(--rojo)">Falta la categoría: escríbela una vez y quedará guardada.</span>` : ""}</p>
        <datalist id="dlCat">${opt(O.CATEGORIAS)}</datalist><datalist id="dlTit">${opt(O.TITULOS)}</datalist>
      </div>

      <div class="tarjeta c7" data-tour="of-dias">${cab("reloj", "d", "Días de la semana", esYo ? "Se llenan con tus horas extra capturadas. Puedes ajustarlos para el oficio." : "Se llenan con las horas extra que capturó. Puedes ajustarlos para el oficio.",
        `<button class="btn sec chico" id="oRest" title="Volver a lo capturado">${B.ico("reutilizar")} Volver a lo capturado</button>`)}
        <div class="fila he-fila" style="margin-bottom:8px" data-tour="of-just">
          <div class="campo" style="flex:1;min-width:240px;margin-bottom:0"><label>Justificación para toda la semana</label><input class="inp" id="oJust" list="dlJust" value="${U.esc(h.comun || B.dom.heJust())}">
            <datalist id="dlJust"><option value="${U.esc(B.dom.heJust())}"></datalist></div>
          <button class="btn sec chico" id="oJustAp" style="margin-bottom:2px">${B.ico("ok")} Usar en todos los días</button>
        </div>
        <label class="peque" style="display:inline-flex;gap:6px;align-items:center;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="oUni" ${(A.unificar ?? false) ? "checked" : ""} style="accent-color:var(--guinda)">
          <span>Imprimir la justificación <b>una sola vez</b> para toda la semana (normalmente va en cada renglón)</span></label>
        <div class="tabla-cont"><table class="tabla of-tabla"><thead><tr><th>Día</th><th>Justificación</th><th>De</th><th>A</th><th>Horas</th><th title="Desayuno / Comida / Cena">D · C · C</th></tr></thead><tbody>
        ${h.filas.map((r, i) => `<tr data-i="${i}" class="${U.num(r.horas) || r.de || r.just ? "" : "vacio-dia"}"><td class="dia" style="white-space:nowrap"><b>${O.mesDia(r.f)}</b><div class="muted peque">${U.diaSemana(r.f)} · ${O.diaSem(L, i)}</div></td>
          <td style="min-width:150px"><input class="inp" data-k="just" value="${U.esc(r.just)}"></td>
          ${r.n > 1 ? `<td colspan="2" class="tnum" style="white-space:nowrap;font-size:12.5px;line-height:1.5" title="Varios horarios ese día: se corrigen en Horas extra">${(r.tramos || []).map(x => U.esc(x.de) + " a " + U.esc(x.a)).join("<br>")}<input type="hidden" data-k="de" value="${U.esc(r.de)}"><input type="hidden" data-k="a" value="${U.esc(r.a)}"></td>`
            : `<td><input class="inp tnum h24" data-k="de" value="${U.esc(r.de)}" maxlength="5" inputmode="numeric" placeholder="HH:MM" title="Formato de 24 horas" style="width:76px"></td><td><input class="inp tnum h24" data-h24="24" data-k="a" value="${U.esc(r.a)}" maxlength="5" inputmode="numeric" placeholder="HH:MM" title="Formato de 24 horas" style="width:76px"></td>`}
          <td><input class="inp tnum" data-k="horas" value="${U.esc(r.horas)}" style="width:62px" ${r.n > 1 ? "readonly" : ""}></td>
          <td style="white-space:nowrap">${["alD", "alC", "alCe"].map(k2 => `<input type="checkbox" data-k="${k2}" ${r[k2] ? "checked" : ""} title="${{ alD: "Desayuno", alC: "Comida", alCe: "Cena" }[k2]}" style="width:17px;height:17px;margin:0 3px;accent-color:var(--guinda)">`).join("")}</td></tr>`).join("")}
        </tbody></table></div>
        <div class="campo" style="margin:10px 0 0"><label>Observaciones</label><input class="inp" id="oObs" value="${U.esc(h.obs)}"></div>
        <div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;margin-top:12px">
          <button class="btn sec chico" id="oGuardarHE" title="Guarda estos horarios en las horas extra capturadas">${B.ico("ok")} Guardar también en ${esYo ? "mis" : "sus"} horas extra</button>
          <span style="display:flex;gap:8px"><button class="btn sec" id="oImp">${B.ico("imprimir")} Imprimir</button>
          <button class="btn" id="oPdf" data-tour="of-pdf">${B.ico("pdf")} ${B.modoLocal ? "Guardar PDF" : "Generar PDF"}</button></span></div>
      </div>
      </div>
      <div class="tarjeta">${cab("ojo", "v", "Vista previa", "Así se imprimirá el oficio (carta horizontal).")}<div id="oPrev"></div></div>`;

    // --- eventos
    const re = () => B.app.render();
    const semana = f => { this.lunes = B.dom.lunes(f); re(); };
    c.querySelector("#oAnt").onclick = () => semana(U.sumar(L, -7));
    c.querySelector("#oSig").onclick = () => semana(U.sumar(L, 7));
    c.querySelector("#oFecha").onchange = e => { if (e.target.value) semana(e.target.value); };
    if (sup) {
      ui.combo(c.querySelector("#oPer"), { items: () => ui.personas(null, true), alElegir: v => { if (v) { this.ini = U.ini(v); re(); } } });
      c.querySelectorAll("[data-ir]").forEach(a => a.onclick = e => { e.preventDefault(); this.ini = a.dataset.ir; re(); });
      c.querySelector("#oTodos").onclick = e => {
        const hojas = conHE.map(i => O.hoja(i, L, this.aj[i + "|" + L]));
        const sinCat = hojas.filter(x => !x.cat).map(x => x.ini);
        if (sinCat.length) ui.toast("Sin categoría capturada: " + sinCat.join(", ") + ". Ese renglón saldrá en blanco.", "aviso", 7000);
        B.rep.pdf(O.doc(hojas, L), e.currentTarget);
      };
    }
    const leerFilas = () => [...c.querySelectorAll(".of-tabla tbody tr")].map(tr => {
      const r = { ...h.filas[+tr.dataset.i] };
      tr.querySelectorAll("[data-k]").forEach(x => r[x.dataset.k] = x.type === "checkbox" ? (x.checked ? "1" : "") : x.value.trim());
      return r;
    });
    const prev = c.querySelector("#oPrev");
    const pintar = () => {
      B.rep.previa(prev, O.doc([O.hoja(ini, L, A)], L));
      const fr = prev.querySelector("iframe");      // la hoja se ajusta al ancho disponible
      fr.addEventListener("load", () => { try { const k = Math.min(1, (prev.clientWidth - 24) / 1010); fr.contentDocument.body.style.zoom = k.toFixed(3); fr.style.height = Math.ceil(fr.contentDocument.body.scrollHeight * k + 30) + "px"; } catch (e) { } });
    };
    const cambio = U.debounce(() => { A.filas = leerFilas(); A.obs = c.querySelector("#oObs").value; A.unificar = c.querySelector("#oUni").checked; A.fecha = c.querySelector("#oFOf").value || h.fecha; A.eventual = c.querySelector("#oEv").checked; pintar(); }, 300);
    c.querySelectorAll(".of-tabla tbody tr").forEach(tr => {
      const calc = () => { if (h.filas[+tr.dataset.i].n > 1) return; const v = B.dom.horasEntre(tr.querySelector('[data-k="de"]').value, tr.querySelector('[data-k="a"]').value); if (v != null) tr.querySelector('[data-k="horas"]').value = v; };
      for (const k2 of ["de", "a"]) { tr.querySelector(`[data-k="${k2}"]`).addEventListener("input", calc); tr.querySelector(`[data-k="${k2}"]`).addEventListener("change", () => { calc(); cambio(); }); }
      tr.querySelectorAll("[data-k]").forEach(x => x.addEventListener(x.type === "checkbox" ? "change" : "input", () => {
        tr.classList.toggle("vacio-dia", !(tr.querySelector('[data-k="horas"]').value || tr.querySelector('[data-k="de"]').value || tr.querySelector('[data-k="just"]').value)); cambio(); }));
    });
    ["#oObs", "#oFOf"].forEach(s => c.querySelector(s).addEventListener("input", cambio));
    c.querySelector("#oUni").onchange = cambio;
    c.querySelector("#oJustAp").onclick = () => {
      const v = c.querySelector("#oJust").value.trim(); if (!v) { ui.toast("Escribe la justificación.", "error"); return; }
      let n = 0;
      c.querySelectorAll(".of-tabla tbody tr").forEach(tr => { if (tr.querySelector('[data-k="horas"]').value || tr.querySelector('[data-k="de"]').value) { tr.querySelector('[data-k="just"]').value = v; n++; } });
      if (!n) { ui.toast("No hay días con tiempo extra en esta semana.", "aviso"); return; }
      cambio(); ui.toast("Justificación aplicada a " + n + " día(s) del oficio. Para guardarla también en las horas extra usa el botón de abajo.", "ok", 6000);
    };
    c.querySelector("#oEv").onchange = cambio;
    // datos del perfil: se guardan al salir del campo
    const perfil = async () => {
      const d = { ofCat: c.querySelector("#oCat").value.trim(), ofTit: c.querySelector("#oTit").value.trim(), ofDepto: c.querySelector("#oDep").value.trim() };
      A.cat = d.ofCat; A.tit = d.ofTit; A.depto = d.ofDepto; pintar();
      if (d.ofCat === pf.ofCat && d.ofTit === pf.ofTit && d.ofDepto === (pf.ofDepto || O.cfg().depto)) return;
      if (d.ofDepto === O.cfg().depto) d.ofDepto = "";
      try {
        await B.api.op("perfil", "guardar", { ...d, rpe: esYo ? "" : p.rpe });
        const dest = esYo ? B.usuario : (B.estado.usuarios || []).find(x => U.ini(x.rpe) === U.ini(p.rpe));
        if (dest) Object.assign(dest, d);
        ui.toast("Datos del oficio guardados.", "ok", 2500);
      } catch (e) { ui.error(e); }
    };
    ["#oCat", "#oTit", "#oDep"].forEach(s => c.querySelector(s).addEventListener("change", perfil));
    c.querySelector("#oRest").onclick = () => { delete A.filas; delete A.obs; delete A.unificar; re(); };
    c.querySelector("#oImp").onclick = () => B.rep.imprimir(O.doc([O.hoja(ini, L, A)], L));
    c.querySelector("#oPdf").onclick = e => {
      const hj = O.hoja(ini, L, A);
      if (!hj.cat) { ui.toast("Escribe la categoría antes de generar el oficio.", "error"); c.querySelector("#oCat").focus(); return; }
      if (!hj.filas.some(r => U.num(r.horas))) { ui.toast("No hay horas extra en esta semana.", "aviso"); }
      B.rep.pdf(O.doc([hj], L), e.currentTarget);
    };
    c.querySelector("#oGuardarHE").onclick = async e => {
      const filas = leerFilas(), orig = O.filas(ini, L), cambios = [], justDias = [];
      for (const r of filas) {
        const o = orig[r.i];
        if (["just", "de", "a", "horas", "alD", "alC", "alCe"].every(k2 => String(r[k2] || "") === String(o[k2] || ""))) continue;
        if (o.n > 1) {
          // varios horarios ese dia: aqui solo se puede unificar la justificacion; los horarios se corrigen en Horas extra
          if (String(r.just || "") !== String(o.just || "") && r.just) justDias.push(r.f);
          if (["de", "a", "horas", "alD", "alC", "alCe"].some(k2 => String(r[k2] || "") !== String(o[k2] || ""))) ui.toast(`${O.mesDia(r.f)}: tiene varios horarios ese día; corrígelos desde Horas extra.`, "aviso", 6000);
          continue;
        }
        if (r.horas !== "" && (isNaN(+r.horas) || +r.horas < 0 || +r.horas > 24)) { ui.toast(`${O.mesDia(r.f)}: las horas deben ser un número entre 0 y 24.`, "error"); return; }
        if (!!r.de !== !!r.a) { ui.toast(`${O.mesDia(r.f)}: anota la hora De y la hora A.`, "error"); return; }
        cambios.push({ fecha: r.f, turno: o.turno || "T2", ini, tramo: o.tramo || "1", he: r.horas, mot: r.just, de: r.de, a: r.a, alD: r.alD, alC: r.alC, alCe: r.alCe });
      }
      if (!cambios.length && !justDias.length) { ui.toast("No hay cambios por guardar.", ""); return; }
      const b = e.currentTarget; b.disabled = true;
      try { for (const x of cambios) await B.api.op("he", "guardar", x);
        for (const fd of justDias) await B.api.op("he", "justificar", { ini, d1: fd, d2: fd, mot: filas.find(r => r.f === fd).just });
        delete A.filas; await B.app.refrescar(); ui.toast((cambios.length + justDias.length) + " día(s) guardados en las horas extra.", "ok"); }
      catch (err) { ui.error(err); b.disabled = false; }
    };
    pintar();
  }
};
;
/* ---- hoja.js ---- */
/* =========================================================================
   BITACORA 24RU1 - HOJA DE ASIGNACION DE ACTIVIDADES (por turno)
   - El supervisor captura los datos operativos (mensaje de seguridad, ISA / CISA / SIF,
     estado de las unidades, dosis PETAR, reuniones, INOP's). Cada turno se arrastran los
     del turno anterior y los contadores de dias avanzan solos.
   - Del sistema salen: supervisor, personal en sitio y especializado, y las ACTIVIDADES
     (pendientes de turnos anteriores, las del turno y las por asignar) separadas por unidad.
   ========================================================================= */
"use strict";
B.hoja = {
  DIAS: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  MES: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  FIJOS: {
    proposito: "Comunicar a todo el personal el estado actual de las unidades, así como temas estratégicos de la organización.",
    mision: "Con máxima prioridad en la seguridad, respeto al medio ambiente y a la sociedad, generar electricidad garantizando la operación confiable y sustentable de los activos de generación nuclear.",
    nivel: "Comportamientos correctos/ Trabajo en equipo/ Desarrollo de personas/ Pasión por la excelencia/ Resultado final en mente/ Preparación y ejecución de trabajos."
  },
  de(f, t) { return (B.estado.hojas || []).find(h => h.fecha === f && h.turno === t) || null; },
  anterior(f, t, mismoTurno) {
    const K = B.t.clave(f, t);
    return (B.estado.hojas || []).filter(h => B.t.clave(h.fecha, h.turno) < K && (!mismoTurno || h.turno === t)).sort((a, b) => B.t.clave(b.fecha, b.turno) - B.t.clave(a.fecha, a.turno))[0] || null;
  },
  // fecha que se imprime: el turno nocturno (T1) inicia la tarde del dia anterior a su fecha de reporte
  fechaHoja(f, t) { return t === "T1" ? U.sumar(f, -1) : f; },
  inis(f, t, cats) {
    const D = B.dom, set = new Set([...D.personalDelTurno(f, t), ...D.presentes(f, t).keys()]);
    return D.ordenados([...set]).filter(i => { const p = D.persona(i); return p && cats.includes(D.catOrden(p.cat)); }).join(" / ");
  },
  nueva(f, t) {
    const td = B.dom.turnoDatos(f, t) || {}, u = (etq) => ({ etq, dias: "", modo: "", pot: "", x1: "", x2: "", x3: "", y2: "", y3: "" });
    return {
      fechaHoja: this.fechaHoja(f, t), ...this.FIJOS, msgSeg: "", refDH: "", refDia: "",
      isa: { n: "", d: "" }, cisa: { n: "", d: "" }, sif: { n: "", d: "" },
      u1: u("Días de Recarga"), u2: { ...u("Días continuos en línea"), x1: "H2: ", x2: "IQ: ", x3: "TV: " },
      petar: [1, 2, 3, 4].map(() => ({ t: "PETAR ", l1: "", l2: "Dosis del día: ", l3: "Dosis de ayer: ", z: "" })),
      agenda: ["19:00 hrs Reunión Inicio de Turno (CECOR Sala 1)", "20:00 hrs Reunión de ALINEAMIENTO OPERATIVO", "20:10 hrs Reunión con personal técnico SGIND Y PCI", "05:30 hrs Reunión Cierre de Turno (CECOR Sala 1)"],
      sup: U.ini(td.elab || B.usuario.ini), vac: "", sitio: this.inis(f, t, [1, 2, 5]), incap: "N/A", comis: "N/A", espec: this.inis(f, t, [3]), sinmov: "N/A",
      extraU1: [], extraU2: [], inop1: [], inop2: []
    };
  },
  // hoja del turno: la guardada, o una nueva arrastrando los datos de la hoja anterior (los contadores de dias avanzan)
  base(f, t) {
    const g = this.de(f, t); if (g) return JSON.parse(JSON.stringify({ ...this.nueva(f, t), ...g }));
    const n = this.nueva(f, t), a = this.anterior(f, t);
    if (!a) return n;
    const h = JSON.parse(JSON.stringify({ ...n, ...a }));
    delete h.mod; delete h.fecha; delete h.turno;
    h.fechaHoja = n.fechaHoja;
    // juntas y personal: son recurrentes por turno, asi que se toman de la ultima hoja del MISMO turno (T1 de T1, T2 de T2)
    const m = this.anterior(f, t, true);
    // las NOTAS EXTRA tambien son de cada turno: persisten de dia a dia (o de noche a noche) hasta que se borran a mano, sin mezclarse con las del otro turno
    const REC = ["agenda", "sup", "vac", "sitio", "incap", "comis", "espec", "sinmov", "extraU1", "extraU2"];
    for (const k of REC) h[k] = JSON.parse(JSON.stringify(m && m[k] != null && String(m[k]) !== "" ? m[k] : n[k]));
    h._mismo = m ? B.t.corto(m.fecha, m.turno) : "";
    const dias = U.dia(n.fechaHoja) - U.dia(a.fechaHoja || this.fechaHoja(a.fecha, a.turno));
    const mas = v => (String(v).trim() !== "" && /^\d+$/.test(String(v).trim()) && dias > 0) ? String(+v + dias) : v;
    for (const k of ["isa", "cisa", "sif"]) if (h[k]) h[k].n = mas(h[k].n);
    for (const k of ["u1", "u2"]) if (h[k]) h[k].dias = mas(h[k].dias);
    h._arrastrada = B.t.corto(a.fecha, a.turno);
    return h;
  },
  // Actividades para la hoja: pendientes / en proceso (tambien de turnos anteriores), las del turno y las por asignar; sin duplicar
  actividades(f, t) {
    const K = B.t.clave(f, t), m = new Map(), def = (B.estado.config.hojaUniDef === "U2") ? "U2" : "U1";
    for (const a of B.dom.todas().sort((x, y) => x.id - y.id)) {
      const ck = B.t.clave(a.fecha, a.turno), zk = a.fCierre ? B.t.clave(a.fCierre, a.tCierre) : 0;
      // solo lo que falta por hacer: pendiente, en proceso o por asignar (lo ya realizado no va en la hoja)
      const abierta = ck <= K && (a.est === "Pendiente" || a.est === "En proceso" || (a.est === "Concluida" && zk > K));
      if (!abierta) continue;
      const k = U.norm(a.txt);
      if (!m.has(k)) m.set(k, { id: a.id, txt: a.txt, inis: [], est: !a.ini ? "Por asignar" : (a.est === "Concluida" ? (a.estOrig || "Pendiente") : a.est), uni: a.uni || "", ck, com: "", libre: !a.ini });
      const g = m.get(k), i = U.ini(a.ini);
      if (i && !g.inis.includes(i)) g.inis.push(i);
      if (a.uni && !g.uni) g.uni = a.uni;
      if (a.com && !g.com) g.com = a.com;
    }
    return [...m.values()].map(g => ({ ...g, inis: B.dom.ordenados(g.inis).join("/"), col: g.uni || def, desde: g.ck < K }));
  },

  documento(h, f, t) {
    const e = U.esc, d = U.fecha(h.fechaHoja || this.fechaHoja(f, t)), acts = this.actividades(f, t);
    const img = n => new URL("img/" + n + ".png", location.href).href;
    const rojo = x => `<span class="r">${e(x)}</span>`;
    const ind = (et, quien, sig, o) => `<tr><td class="sb"><b>DÍAS SIN ACCIDENTES INDICADOR</b> (${quien})</td><td class="sb"><b>${sig}: ${e(o.n)}</b>${o.d ? " (" + e(o.d) + ")" : ""}</td></tr>`;
    const uni = (u) => `<table class="in"><tr><td class="et">${e(u.etq)}:</td><td class="c b">${e(u.dias)}</td><td class="c b mini">${e(u.x1)}</td><td class="c b mini g">P</td><td class="c b mini g">A</td></tr>
      <tr><td class="et">Modo de Operación COA:</td><td class="c b">${e(u.modo)}</td><td class="c b mini">${e(u.x2)}</td><td class="c b mini" colspan="2">${e(u.y2)}</td></tr>
      <tr><td class="et">Potencia Eléctrica:</td><td class="c">${e(u.pot)}</td><td class="c b mini">${e(u.x3)}</td><td class="c b mini" colspan="2">${e(u.y3)}</td></tr></table>`;
    const izq = [...(h.agenda || []).filter(x => String(x).trim()),
      "Supervisor: " + (h.sup || ""), "Personal de vacaciones/ permiso: " + (h.vac || ""), "Personal laborando en sitio: <b>" + e(h.sitio || "") + "</b>",
      "Personal incapacitado: " + (h.incap || ""), "Personal comisionado: " + e(h.comis || "") + "<br>Personal especializado: <b>" + e(h.espec || "") + "</b>", "Personal sin movimiento: " + (h.sinmov || "")];
    const fila = x => /<b>|<br>/.test(x) ? x : e(x);
    const act = a => `<div class="act">${e(a.txt)}${a.inis ? ` <b>(${e(a.inis)})</b>` : a.est === "Por asignar" ? " <b>(por asignar)</b>" : ""}${a.desde && a.est !== "Por asignar" ? ` <span class="gr">· ${e(a.est.toLowerCase())}</span>` : ""}${a.com ? `<div class="gr">↳ ${e(a.com)}</div>` : ""}</div>`;
    const col = (u, extra) => acts.filter(a => a.col === u).map(act).join("") + (extra || []).filter(x => String(x).trim()).map(x => `<div class="act">${e(x)}</div>`).join("") || `<div class="act">&nbsp;</div>`;
    const inop = (titulo, l) => { const r = [...(l || []).filter(x => x.c || x.i || x.v)]; while (r.length < 4) r.push({});
      return `<table class="in inop"><tr><th colspan="3" class="sec">${titulo}</th></tr><tr><th style="width:56%">COMPONENTE</th><th>INICIO</th><th>VENCE</th></tr>
        ${r.map(x => `<tr><td class="b">${e(x.c || "")}</td><td class="c">${e(x.i || "")}</td><td class="c">${e(x.v || "")}</td></tr>`).join("")}</table>`; };
    const css = `
    @page { size: letter portrait; margin: 0.3in 0.35in; }
    html, body { margin: 0; } body { font-family: "Segoe UI", "Noto Sans", Arial, sans-serif; font-size: 8.4pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hoja { width: 7.8in; margin: 0 auto; border: 1px solid #000; }
    table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #000; padding: 1px 4px; vertical-align: middle; }
    .cab td { border: 0; padding: 3px 6px; } .cab img { height: 0.52in; vertical-align: middle; }
    .cab .der { text-align: right; color: #1E7B3A; font-style: italic; line-height: 1.2; } .cab .der b { font-size: 11pt; }
    .tit { background: #D9D9D9; text-align: center; font-weight: 700; font-size: 11.5pt; } .sec { background: #D9D9D9; text-align: center; font-weight: 700; font-size: 10.5pt; }
    .g { background: #D9D9D9; } .r { color: #E00000; font-weight: 700; } .c { text-align: center; } .b { font-weight: 700; } .gr { color: #555; font-weight: 400; }
    .fe td { border-left: 0; border-right: 0; font-size: 10.5pt; font-weight: 700; } .just { text-align: justify; }
    .sb { border: 0; padding: 0 4px; font-size: 8pt; } table.sinb, table.sinb td { border: 0; }
    table.in td, table.in th { font-size: 8pt; } table.in { border: 0; } .et { font-weight: 700; font-size: 9pt; } .mini { font-size: 7.5pt; width: 14%; white-space: nowrap; }
    .dosis td { text-align: center; font-size: 7.6pt; line-height: 1.35; width: 25%; } .dosis .z td { font-weight: 700; font-size: 7pt; }
    .tres > tbody > tr > td, .dos > tbody > tr > td { padding: 0; vertical-align: top; border-top: 0; }
    .num { width: 0.26in; text-align: center; font-weight: 700; font-size: 6.5pt; } .agenda td { height: 0.27in; font-size: 8pt; }
    .act { border-bottom: 1px solid #000; padding: 4px 5px; font-size: 7.8pt; line-height: 1.25; min-height: 0.22in; } .act:last-child { border-bottom: 0; }
    .inop th { font-size: 7.5pt; } .inop td { font-size: 7pt; height: 0.2in; }
    @media screen { body { background: #fff; padding: 0.25in 0; } }`;
    const html = `<div class="hoja" id="hoja">
      <table class="cab"><tr><td style="width:36%"><img src="${img("hojaCfe")}" alt=""><img src="${img("hojaEscudo")}" alt="" style="height:0.5in;margin-left:4px"></td>
        <td style="width:26%;text-align:center"><img src="${img("hojaPlanta")}" alt=""></td>
        <td class="der"><b>Central Nucleoeléctrica Laguna Verde</b><br>Subgerencia de Seguridad Nuclear<br>Seguridad Industrial</td></tr></table>
      <table><tr><td class="tit">HOJA DE ASIGNACIÓN DE ACTIVIDADES</td></tr></table>
      <table class="fe"><tr><td style="width:13%">FECHA:</td><td>${rojo(this.DIAS[d.getDay()])} &nbsp;&nbsp; ${rojo(String(d.getDate()).padStart(2, "0"))} &nbsp;&nbsp; de &nbsp;&nbsp; ${rojo(this.MES[d.getMonth()])} &nbsp;&nbsp; del año &nbsp;&nbsp; ${rojo(d.getFullYear())}</td>
        <td style="width:24%;text-align:right">SEMANA: &nbsp; ${rojo(B.oficio.semanaISO(U.iso(d)))} &nbsp;&nbsp;&nbsp;</td></tr></table>
      <table><tr><td class="g just"><b>PROPÓSITO:</b> ${e(h.proposito)}</td></tr><tr><td class="just"><b>MISIÓN:</b> ${e(h.mision)}</td></tr>
        <tr><td class="g just"><b>NIVEL DE EXCELENCIA TOTAL:</b> ${e(h.nivel)}</td></tr><tr><td><b>MENSAJE DE SEGURIDAD:</b> ${e(h.msgSeg)}</td></tr></table>
      <table><tr><td style="width:50%"><b>REFORZAMIENTO D.H. :</b> ${e(h.refDH)}</td><td><b>REFORZAMIENTO DEL DÍA:</b> ${e(h.refDia)}</td></tr></table>
      <table><tr><td style="padding:2px 0"><table class="sinb">${ind("", "personal permanente y temporal", "ISA", h.isa)}${ind("", "personal C-42 y compañía", "CISA", h.cisa)}${ind("", "todo el personal de la GCN", "SIF", h.sif)}</table></td></tr></table>
      <table class="dos"><tr><th class="sec" style="width:50%">UNIDAD 1</th><th class="sec">UNIDAD 2</th></tr><tr><td>${uni(h.u1)}</td><td>${uni(h.u2)}</td></tr></table>
      <table><tr><td class="sec">DOSIS RADIOLÓGICA</td></tr></table>
      <table class="dosis"><tr>${(h.petar || []).map(p => `<td><b>${e(p.t)}</b><br><i>${e(p.l1)}</i><br>${e(p.l2)}<br>${e(p.l3)}</td>`).join("")}</tr>
        <tr class="z">${(h.petar || []).map(p => `<td>${e(p.z) || "&nbsp;"}</td>`).join("")}</tr></table>
      <table class="tres"><tr><th class="sec" style="width:43.5%">ACTIVIDADES PENDIENTES DE<br>ATENDER Y RECURSO</th><th class="sec" style="width:30.5%">ACTIVIDADES EN<br>UNIDAD 1</th><th class="sec">ACTIVIDADES EN<br>UNIDAD 2</th></tr>
        <tr><td><table class="in agenda">${izq.map((x, i) => `<tr><td class="num g">${i + 1}</td><td>${fila(x)}</td></tr>`).join("")}</table></td>
          <td>${col("U1", h.extraU1)}</td><td>${col("U2", h.extraU2)}</td></tr></table>
      <table class="dos"><tr><td style="width:43.5%">${inop("INOP´S DE UNIDAD 1", h.inop1)}</td><td>${inop("INOP´S DE UNIDAD 2", h.inop2)}</td></tr></table>
    </div>
    <script>
      // si la hoja rebasa una pagina carta, se reduce para que quepa completa
      function ajustar() { var c = document.getElementById("hoja"); c.style.zoom = ""; var disp = 10.38 * 96, h = c.scrollHeight; if (h > disp) c.style.zoom = Math.max(0.6, disp / h * 0.985).toFixed(3); }
      if (document.readyState === "complete") ajustar(); else window.addEventListener("load", ajustar);
    </script>`;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Hoja de asignación de actividades</title><style>${css}</style></head><body>${html}</body></html>`;
  },
  doc(h, f, t) {
    const fh = (h.fechaHoja || this.fechaHoja(f, t)).replace(/-/g, "");
    return { html: this.documento(h, f, t), nombre: `Hoja de Asignacion de Actividades ${fh} - Turno ${t === "T1" ? "Nocturno" : "Diurno"}`, carpeta: "HOJAS DE ASIGNACION", tipo: "hoja" };
  }
};

/* ===================================================================== VISTA (supervisor captura; tecnicos consultan) */
V.hoja = {
  titulo: "Hoja de asignación de actividades", sup: true,          // solo supervisores
  borr: {},                      // borradores por turno (se conservan al cambiar de sección)
  // Tecnicos: solo consulta (vista previa, imprimir y PDF) de la hoja que guardo el supervisor
  consulta(c) {
    const { f, t } = T(), H = B.hoja, guardada = H.de(f, t), h = H.base(f, t), acts = H.actividades(f, t), e = U.esc, yoIni = yo();
    const mias = acts.filter(a => a.inis.split("/").includes(yoIni));
    c.innerHTML = `
      <div class="tarjeta" data-tour="hoja-cab">${cab("doc", "g", "Hoja de asignación · " + B.t.corto(f, t), guardada ? "Guardada por el supervisor: " + e((guardada.mod || "").replace("T", " ")) : "El supervisor aún no guarda la hoja de este turno: se muestra una vista preliminar con los datos de la hoja anterior.",
        `<button class="btn sec" id="hjImp">${B.ico("imprimir")} Imprimir</button><button class="btn" id="hjPdf">${B.ico("pdf")} ${B.modoLocal ? "Guardar PDF" : "Generar PDF"}</button>`)}
        ${mias.length ? `<div class="hoja-sec" style="margin-top:0">Tus actividades en esta hoja (${mias.length})</div><div class="hoja-lista">${mias.map(a => `<div class="hoja-act"><div class="t"><b>${e(a.inis)}</b> · ${e(a.txt)} <span class="muted peque">${e(a.est === "Concluida" ? "Realizada" : a.est)}${a.desde ? " · de turnos anteriores" : ""} · ${a.col === "U2" ? "Unidad 2" : "Unidad 1"}</span></div></div>`).join("")}</div>`
          : `<p class="muted peque" style="margin:0">No tienes actividades asignadas en esta hoja. Para ver otro turno cambia la fecha o el turno de trabajo arriba.</p>`}
      </div>
      <div class="tarjeta">${cab("ojo", "v", "Hoja del turno", "Solo consulta: la captura el supervisor.")}<div id="hjPrev"></div></div>`;
    const prev = c.querySelector("#hjPrev");
    B.rep.previa(prev, H.doc(h, f, t));
    const fr = prev.querySelector("iframe");
    fr.addEventListener("load", () => { try { const z = Math.min(1, (prev.clientWidth - 24) / 800); fr.contentDocument.body.style.zoom = z.toFixed(3); fr.style.height = Math.ceil(fr.contentDocument.body.scrollHeight * z + 30) + "px"; } catch (x) { } });
    c.querySelector("#hjImp").onclick = () => B.rep.imprimir(H.doc(h, f, t));
    c.querySelector("#hjPdf").onclick = ev => B.rep.pdf(H.doc(h, f, t), ev.currentTarget);
  },
  render(c) {
    if (!B.dom.esSup()) return this.consulta(c);
    const { f, t } = T(), H = B.hoja, k = f + t, guardada = H.de(f, t);
    if (!this.borr[k]) this.borr[k] = H.base(f, t);
    const h = this.borr[k], e = U.esc, acts = H.actividades(f, t);
    const inp = (ruta, et, o = {}) => `<div class="campo" style="${o.st || ""}"><label>${et}</label><input class="inp ${o.cl || ""}" data-h="${ruta}" type="${o.tipo || "text"}" value="${e(ruta.split(".").reduce((x, p) => (x == null ? "" : x[p]), h) ?? "")}" placeholder="${e(o.ph || "")}"></div>`;
    const area = (ruta, et) => `<div class="campo"><label>${et}</label><textarea class="inp" rows="2" data-h="${ruta}">${e(h[ruta] || "")}</textarea></div>`;
    const unidad = (u, n) => `<div class="hoja-sec">Unidad ${n}</div><div class="grid4">${inp(u + ".etq", "Etiqueta de días")}${inp(u + ".dias", "Días (avanza solo)")}${inp(u + ".modo", "Modo de operación COA")}${inp(u + ".pot", "Potencia eléctrica", { ph: "100% 762 MWe" })}
      ${inp(u + ".x1", "Dato 1", { ph: "H2: 8.2" })}${inp(u + ".x2", "Dato 2", { ph: "IQ: 1.1" })}${inp(u + ".y2", "Valor 2", { ph: "30.10°C" })}<div></div>${inp(u + ".x3", "Dato 3", { ph: "TV: 60°C" })}${inp(u + ".y3", "Valor 3", { ph: "33.0%" })}</div>`;
    const lista = (ruta, ph) => `<div class="hoja-lista">${(h[ruta] || []).map((x, i) => `<div class="fila-h"><input class="inp" data-h="${ruta}.${i}" value="${e(x)}" placeholder="${e(ph)}" style="flex:1"><button class="btn fantasma btn-icono" data-del="${ruta}.${i}" title="Quitar">${B.ico("basura")}</button></div>`).join("")}</div>
      <button class="btn sec chico" data-add="${ruta}">${B.ico("mas")} Agregar renglón</button>`;
    const inops = (ruta, n) => `<div class="hoja-sec">INOP's de Unidad ${n}</div><div class="hoja-lista">${(h[ruta] || []).map((x, i) => `<div class="fila-h"><input class="inp" data-h="${ruta}.${i}.c" value="${e(x.c || "")}" placeholder="Componente" style="flex:3">
      <input class="inp" data-h="${ruta}.${i}.i" value="${e(x.i || "")}" placeholder="Inicio" style="flex:1"><input class="inp" data-h="${ruta}.${i}.v" value="${e(x.v || "")}" placeholder="Vence" style="flex:1">
      <button class="btn fantasma btn-icono" data-del="${ruta}.${i}" title="Quitar">${B.ico("basura")}</button></div>`).join("")}</div><button class="btn sec chico" data-add="${ruta}" data-obj="1">${B.ico("mas")} Agregar INOP</button>`;
    c.innerHTML = `
      <div class="tarjeta" data-tour="hoja-cab">${cab("doc", "g", "Hoja de asignación · " + B.t.corto(f, t), guardada ? "Guardada: " + e((guardada.mod || "").replace("T", " ")) : (h._arrastrada ? "Nueva: se copiaron los datos de la hoja de " + h._arrastrada + " y los contadores de días avanzaron" + (h._mismo ? "; las juntas y el personal son los de la hoja de " + h._mismo + " (mismo turno)" : "") + ". Revisa lo que cambió y guarda." : "Nueva: captura los datos; el siguiente turno se copiarán solos."),
        `<button class="btn sec" id="hjImp">${B.ico("imprimir")} Imprimir</button><button class="btn" id="hjPdf">${B.ico("pdf")} ${B.modoLocal ? "Guardar PDF" : "Generar PDF"}</button><button class="btn verde" id="hjGuardar">${B.ico("ok")} Guardar</button>`)}
        <div class="grid4">${inp("fechaHoja", "Fecha de la hoja", { tipo: "date" })}${inp("msgSeg", "Mensaje de seguridad", { ph: "ESPACIOS CONFINADOS" })}${inp("refDH", "Reforzamiento D.H.", { ph: "USO Y APEGO A PROCEDIMIENTOS" })}${inp("refDia", "Reforzamiento del día", { ph: "PROFESIONALISMO NUCLEAR" })}</div>
        <div class="hoja-sec">Días sin accidentes (avanzan solos cada día)</div>
        <div class="grid4">${inp("isa.n", "ISA · días")}${inp("isa.d", "ISA · último evento", { st: "grid-column:span 3", ph: "Herida durante corte de tubería" })}
          ${inp("cisa.n", "CISA · días")}${inp("cisa.d", "CISA · último evento", { st: "grid-column:span 3" })}${inp("sif.n", "SIF · días")}${inp("sif.d", "SIF · último evento", { st: "grid-column:span 3" })}</div>
        ${unidad("u1", 1)}${unidad("u2", 2)}
        <div class="hoja-sec">Dosis radiológica (PETAR)</div>
        <div class="grid4">${(h.petar || []).map((p, i) => `<div>${inp("petar." + i + ".t", "PETAR " + (i + 1), { ph: "PETAR 26-1R1014 (mR)" })}${inp("petar." + i + ".l1", "Acumulado", { ph: "0 de 14 sem" })}${inp("petar." + i + ".l2", "Dosis del día")}${inp("petar." + i + ".l3", "Dosis de ayer")}${inp("petar." + i + ".z", "Zona", { ph: "RX, TB Y RW (24RU1)" })}</div>`).join("")}</div>
      </div>
      <div class="cuadricula">
        <div class="tarjeta c6">${cab("calendario", "a", "Reuniones y recurso", "Columna «Actividades pendientes de atender y recurso». Las juntas y el personal se conservan de la última hoja de este mismo turno; corrige solo lo que cambie.", `<button class="btn chico sec" id="hjPers" title="Vuelve a proponer supervisor, personal en sitio y especializado con el rol del turno">${B.ico("reutilizar")} Personal según el rol</button>`)}
          <div class="hoja-sec" style="margin-top:0">Reuniones / pendientes de atender</div>${lista("agenda", "19:00 hrs Reunión…")}
          <div class="hoja-sec">Recurso</div>
          <div class="grid2">${inp("sup", "Supervisor")}${inp("vac", "Vacaciones / permiso")}</div>${inp("sitio", "Personal laborando en sitio")}
          <div class="grid2">${inp("espec", "Personal especializado")}${inp("incap", "Personal incapacitado")}${inp("comis", "Personal comisionado")}${inp("sinmov", "Personal sin movimiento")}</div>
        </div>
        <div class="tarjeta c6" data-tour="hoja-acts">${cab("lista", "g", "Actividades (" + acts.length + ")", "Salen solas de la bitácora: solo las pendientes, en proceso y por asignar (las ya realizadas no aparecen). Elige la unidad de cada una; las por asignar se pueden editar con el lápiz.", `<a class="btn chico sec" href="#/actividades">Asignar…</a>`)}
          <div class="hoja-lista">${acts.length ? acts.map(a => `<div class="hoja-act"><div class="t"><b>${e(a.inis || "POR ASIGNAR")}</b> · ${e(a.txt)} <span class="muted peque">${e(a.est)}${a.desde ? " · de turnos anteriores" : ""}</span>${a.com ? `<div class="muted peque">↳ ${e(a.com)}</div>` : ""}</div>
            ${a.libre ? `<button class="btn fantasma btn-icono" data-edlibre="${a.id}" title="Editar el texto o agregar una nota">${B.ico("editar")}</button>` : ""}${ui.seg("u" + a.id, ["U1", "U2"], a.col)}</div>`).join("") : ui.vacio("Sin actividades pendientes, en proceso ni por asignar.", "lista")}</div>
          <p class="muted peque" style="margin:10px 0 0">Las <b>notas extra</b> son de este turno (${t === "T1" ? "noche" : "día"}): se conservan en las siguientes hojas del mismo turno hasta que las quites, y no afectan a las del otro turno.</p>
          <div class="hoja-sec">Notas extra en Unidad 1</div>${lista("extraU1", "Texto libre para la columna de Unidad 1")}
          <div class="hoja-sec">Notas extra en Unidad 2</div>${lista("extraU2", "Texto libre para la columna de Unidad 2")}
        </div>
      </div>
      <div class="tarjeta">${cab("fuego", "r", "INOP's", "Componente, inicio y vencimiento. Se arrastran al siguiente turno.", `<button class="btn chico sec" id="hjVig" title="Agrega las vigilancias contra incendio activas que tengan # de INOP">${B.ico("mas")} Traer de vigilancias activas</button>`)}
        <div class="cuadricula"><div class="c6">${inops("inop1", 1)}</div><div class="c6">${inops("inop2", 2)}</div></div>
        <details style="margin-top:14px"><summary class="peque" style="cursor:pointer;color:var(--azul);font-weight:600">Textos fijos del encabezado (propósito, misión, nivel de excelencia)</summary>
          <div style="margin-top:10px">${area("proposito", "Propósito")}${area("mision", "Misión")}${area("nivel", "Nivel de excelencia total")}</div></details>
      </div>
      <div class="tarjeta">${cab("ojo", "v", "Vista previa", "Así se imprime la hoja (carta vertical, una página).")}<div id="hjPrev"></div></div>`;

    const poner = (ruta, v) => { const p = ruta.split("."); let o = h; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; };
    const prev = c.querySelector("#hjPrev");
    const pintar = () => {
      B.rep.previa(prev, H.doc(h, f, t));
      const fr = prev.querySelector("iframe");
      fr.addEventListener("load", () => { try { const z = Math.min(1, (prev.clientWidth - 24) / 800); fr.contentDocument.body.style.zoom = z.toFixed(3); fr.style.height = Math.ceil(fr.contentDocument.body.scrollHeight * z + 30) + "px"; } catch (x) { } });
    };
    const cambio = U.debounce(pintar, 350);
    // volver a dibujar SIN que la pagina salte al inicio (al agregar o quitar renglones)
    const rer = foco => { const y = window.scrollY; B.app.render(); window.scrollTo(0, y); if (foco) { const l = document.querySelectorAll(`[data-h^="${foco}."]`), i = l[l.length - 1]; if (i) i.focus({ preventScroll: true }); } };
    c.querySelectorAll("[data-h]").forEach(i => i.addEventListener("input", () => { poner(i.dataset.h, i.value); cambio(); }));
    c.querySelectorAll("[data-add]").forEach(b => b.onclick = () => { (h[b.dataset.add] = h[b.dataset.add] || []).push(b.dataset.obj ? { c: "", i: "", v: "" } : ""); rer(b.dataset.add); });
    c.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { const [r, i] = b.dataset.del.split("."); h[r].splice(+i, 1); rer(); });
    ui.activarSeg(c, async (s, v) => {
      const id = +String(s.dataset.seg).slice(1); if (!id) return;
      try { await B.api.op("actividades", "unidad", { id, uni: v }); await B.api.recargar(); pintar(); } catch (x) { ui.error(x); }
    });
    c.querySelector("#hjVig").onclick = () => {
      let n = 0;
      for (const v of B.estado.vig.filter(x => !x.retiro)) {
        const comp = [v.inop, v.desc, v.comp].filter(Boolean).join(" · "), ya = [...(h.inop1 || []), ...(h.inop2 || [])].some(x => U.norm(x.c) === U.norm(comp));
        if (!ya) { (h.inop1 = h.inop1 || []).push({ c: comp, i: U.corta(v.inicio), v: "" }); n++; }
      }
      if (n) rer(); ui.toast(n ? n + " vigilancia(s) agregadas a INOP's de Unidad 1; muévelas o completa el vencimiento si hace falta." : "No hay vigilancias activas nuevas por agregar.", n ? "ok" : "");
    };
    const limpia = () => { const x = JSON.parse(JSON.stringify(h)); delete x._arrastrada; delete x._mismo; return x; };
    c.querySelectorAll("[data-edlibre]").forEach(b => b.onclick = () => V.actividades.editarLibre(+b.dataset.edlibre));
    const bPers = c.querySelector("#hjPers"); if (bPers) bPers.onclick = () => { const n = H.nueva(f, t); h.sitio = n.sitio; h.espec = n.espec; h.sup = n.sup; rer(); };
    c.querySelector("#hjGuardar").onclick = async () => {
      const r = await ejecutar(() => B.api.op("hojas", "guardar", { fecha: f, turno: t, hoja: limpia() }), "Hoja de asignación guardada.");
      if (r) delete this.borr[k];
    };
    c.querySelector("#hjImp").onclick = () => B.rep.imprimir(H.doc(h, f, t));
    c.querySelector("#hjPdf").onclick = async ev => {
      const b = ev.currentTarget;
      try { await B.api.op("hojas", "guardar", { fecha: f, turno: t, hoja: limpia() }); await B.api.recargar(); } catch (x) { ui.error(x); return; }
      await B.rep.pdf(H.doc(h, f, t), b);
    };
    pintar();
  }
};
;
/* ---- movil.js ---- */
/* =========================================================================
   BITACORA 24RU1 - VERSION PARA CELULAR e intercambio por archivo (WhatsApp / correo)
   - El celular usa la MISMA aplicacion, publicada como pagina web: guarda los datos
     en el propio telefono (sin servidor) y funciona sin señal.
   - PC -> celular: un supervisor genera el "paquete de datos" y lo envia por WhatsApp;
     cada celular lo abre y queda con la informacion al dia.
   - Celular -> PC: cada captura se anota en una lista de pendientes; "Enviar mis capturas"
     genera un archivo que se manda por WhatsApp y se importa en la PC. Al importar se
     repiten las mismas operaciones con las reglas de siempre (no se duplica nada).
   - Cada captura lleva un identificador: si el mismo archivo se importa dos veces, o se
     reenvia, la PC ignora lo que ya recibio.
   ========================================================================= */
"use strict";

/* ---------- almacenamiento del celular: "carpeta" simulada sobre IndexedDB (misma interfaz que usa local.js) */
B.movilFS = {
  abrir() {
    return this._p || (this._p = new Promise((res, rej) => {
      let r; try { r = indexedDB.open("bitacora24ru1_movil", 1); } catch (e) { rej(new Error("Este navegador no permite guardar datos.")); return; }
      r.onupgradeneeded = () => r.result.createObjectStore("fs");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(new Error("Este navegador no permite guardar datos (¿ventana privada o de incógnito?). Abre la página en una ventana normal."));
    }));
  },
  async tx(modo, fn) {
    const db = await this.abrir();
    return new Promise((res, rej) => { const t = db.transaction("fs", modo), q = fn(t.objectStore("fs")); t.oncomplete = () => res(q ? q.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  },
  get(k) { return this.tx("readonly", st => st.get(k)); },
  put(k, v) { return this.tx("readwrite", st => st.put(v, k)); },
  del(k) { return this.tx("readwrite", st => st.delete(k)); },
  keys() { return this.tx("readonly", st => st.getAllKeys()); },
  borrarTodo() { return this.tx("readwrite", st => st.clear()); },
  archivo(k, n) {
    const fs = this;
    return { kind: "file", name: n,
      async getFile() { const t = (await fs.get(k)) || ""; return { text: async () => t, slice: () => ({ text: async () => t.slice(0, 1) }) }; },
      async createWritable() { let buf = ""; return { write: async x => { buf += x; }, close: async () => { await fs.put(k, buf); } }; } };
  },
  dir(pref) {
    const fs = this;
    return { kind: "directory", name: pref.split("/").filter(Boolean).pop() || "este celular",
      async getDirectoryHandle(n) { return fs.dir(pref + n + "/"); },
      async getFileHandle(n, o) {
        const k = pref + n;
        if (!(o && o.create) && (await fs.get(k)) == null) { const e = new Error("No existe " + n); e.name = "NotFoundError"; throw e; }
        return fs.archivo(k, n);
      },
      async removeEntry(n) { await fs.del(pref + n); },
      async *entries() { for (const k of await fs.keys()) { const r = String(k).slice(pref.length); if (String(k).startsWith(pref) && !r.includes("/")) yield [r, fs.archivo(k, r)]; } },
      async queryPermission() { return "granted" }, async requestPermission() { return "granted" } };
  },
  raiz() { return this.dir(""); }
};

/* ---------- aplicacion instalable (PWA): instalar en la pantalla de inicio, abrir al instante y avisar cuando hay version nueva */
B.pwa = {
  evento: null,
  instalada() { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; },
  esIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); },
  iniciar() {
    if (!B.modoMovil) return;
    window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); this.evento = e; document.querySelectorAll(".pwa-caja").forEach(x => this.pintar(x)); });
    window.addEventListener("appinstalled", () => { this.evento = null; document.querySelectorAll(".pwa-caja").forEach(x => x.remove()); });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }      // que el telefono no borre los datos por falta de espacio
    if (!("serviceWorker" in navigator) || !window.B24_MOVIL) return;
    const habia = !!navigator.serviceWorker.controller;
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").then(reg => {
      // al volver a la aplicacion se revisa si hay una version nueva (como mucho cada 30 minutos)
      let ult = Date.now();
      document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - ult > 30 * 60000) { ult = Date.now(); reg.update().catch(() => { }); } });
    }).catch(() => { }));
    let avisado = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!habia || avisado) return; avisado = true;
      const d = document.createElement("div"); d.className = "pwa-nueva";
      d.innerHTML = `<span><b>Hay una versión nueva de la bitácora.</b> Termina lo que estés capturando y actualiza.</span><button class="btn chico dorado">Actualizar</button>`;
      d.querySelector("button").onclick = () => location.reload();
      document.body.appendChild(d);
    });
  },
  pintar(caja) {
    if (this.instalada()) { caja.remove(); return; }
    if (this.evento) {
      caja.innerHTML = `<div><b>Instala la bitácora en tu celular</b><br>Abre al instante, con su icono, y funciona sin señal.</div><button class="btn verde chico">Instalar</button>`;
      caja.querySelector("button").onclick = async () => { const e = this.evento; if (!e) return; e.prompt(); try { await e.userChoice; } catch (x) { } this.evento = null; };
    } else if (this.esIOS()) {
      caja.innerHTML = `<div><b>Instálala en tu iPhone:</b> abre esta página en <b>Safari</b>, toca <b>Compartir</b> (el cuadro con la flecha hacia arriba) y elige <b>Agregar a inicio</b>. Abre al instante y funciona sin señal.
        <br><span class="muted">En iPhone la aplicación instalada guarda sus datos aparte: después de instalarla, carga ahí el paquete de datos.</span></div>`;
    } else {
      caja.innerHTML = `<div><b>Instala la bitácora en tu celular:</b> en el menú <b>⋮</b> del navegador elige <b>Instalar aplicación</b> o <b>Agregar a la pantalla principal</b>. Abre al instante y funciona sin señal.</div>`;
    }
  },
  // agrega el aviso de instalacion a un contenedor (si la aplicacion todavia no esta instalada)
  poner(cont) {
    if (!cont || !B.modoMovil || this.instalada() || cont.querySelector(".pwa-caja")) return;
    const d = document.createElement("div"); d.className = "pwa-caja"; cont.appendChild(d); this.pintar(d);
  }
};
B.pwa.iniciar();

B.inter = {
  // operaciones que se pueden hacer en el celular y que viajan a la PC
  LOG: /^(actividades|ec|vig|he)\.|^(turnos\.guardar|hojas\.guardar|perfil\.guardar|catalogos\.agregar)$/,
  permitida(k) { return this.LOG.test(k) || k === "usuarios.tourVisto"; },
  seRegistra(k) { return this.LOG.test(k); },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  /* ---------- celular: conexion con los datos guardados en el telefono */
  async conectarMovil() {
    const L = B.local; L.raiz = B.movilFS.raiz(); L.sub = "datos";
    const per = await L.leer("personal");
    if (!per || !per.length) return false;
    B.EC_GRUPOS = (await L.leer("ecgrupos")) || []; B.ecLista = B.ecArmar();
    return true;
  },
  async infoPaquete() { return (await B.local.leer("paquete")) || null; },
  async pendientes() { return (await B.local.leer("pendientes")) || []; },

  // "huella" de los registros a los que se refiere una operacion: sirve para encontrarlos en la PC aunque alla tengan otro numero
  huellas(db, col, d) {
    const r = {};
    if (col === "actividades") {
      const ids = new Set([d.id, ...(d.borrar || []), ...(d.items || []).flatMap(i => [i.id, i.unir])].map(Number).filter(x => x > 0));
      for (const id of ids) { const a = (db.actividades || []).find(x => +x.id === id); if (a) r["a" + id] = { ini: U.ini(a.ini), fecha: a.fecha, turno: a.turno, k: U.norm(a.txt) }; }
    }
    if (col === "ec" && +d.num > 0) { const e = (db.ec || []).find(x => +x.num === +d.num); if (e) r["e" + d.num] = { esp: U.norm(e.esp), fecha: e.fecha }; }
    if (col === "vig" && +d.num > 0) { const v = (db.vig || []).find(x => +x.num === +d.num); if (v) r["v" + d.num] = { desc: U.norm(v.desc), inicio: v.inicio || "" }; }
    return r;
  },
  // Traduce los numeros de una operacion a los de esta base de datos usando las huellas
  traducir(op, db) {
    const d = JSON.parse(JSON.stringify(op.datos || {})), R = op.refs || {};
    const act = (id, blando) => {
      id = +id; const h = R["a" + id]; if (!(id > 0) || !h) return id;
      const L = db.actividades || [], ok = x => U.norm(x.txt) === h.k && U.ini(x.ini) === h.ini;
      const m = L.find(x => +x.id === id && ok(x)) || L.find(x => ok(x) && x.fecha === h.fecha && x.turno === h.turno) || L.find(ok) || L.find(x => U.norm(x.txt) === h.k && x.fecha === h.fecha && x.turno === h.turno);
      if (!m) { if (blando) return 0; throw new Error("no se encontró la actividad «" + h.k.slice(0, 70) + "» (pudo cambiar o eliminarse en la PC)"); }
      return +m.id;
    };
    if (op.col === "actividades") {
      if (d.id) d.id = act(d.id);
      if (d.borrar) d.borrar = d.borrar.map(x => act(x, true)).filter(Boolean);
      for (const it of d.items || []) { if (it.id) it.id = act(it.id); if (it.unir) it.unir = act(it.unir); }
    }
    if (op.col === "ec" && +d.num > 0 && R["e" + d.num]) {
      const h = R["e" + d.num], L = db.ec || [], m = L.find(x => +x.num === +d.num && U.norm(x.esp) === h.esp) || L.find(x => U.norm(x.esp) === h.esp && x.fecha === h.fecha);
      if (!m) throw new Error("no se encontró el espacio confinado «" + h.esp + "»"); d.num = +m.num;
    }
    if (op.col === "vig" && +d.num > 0 && R["v" + d.num]) {
      const h = R["v" + d.num], L = db.vig || [], m = L.find(x => +x.num === +d.num && U.norm(x.desc) === h.desc) || L.find(x => U.norm(x.desc) === h.desc && (x.inicio || "") === h.inicio) || L.find(x => U.norm(x.desc) === h.desc && !x.retiro);
      if (!m) throw new Error("no se encontró la vigilancia «" + h.desc.slice(0, 60) + "»"); d.num = +m.num;
    }
    return d;
  },
  describir(op) {
    const d = op.datos || {}, f = d.fecha ? U.cortaDM(d.fecha) + (d.turno ? " " + d.turno : "") + " · " : "";
    const que = { "actividades.guardarTurno": () => "Actividades: " + (d.items || []).map(i => i.txt).filter(Boolean).join(" | ").slice(0, 140), "actividades.seguimiento": () => "Seguimiento de pendiente" + (d.comentario ? ": " + d.comentario : ""),
      "actividades.tomar": () => "Tomar actividad por asignar", "actividades.asignar": () => "Asignar: " + (d.txt || ""), "actividades.comentario": () => "Comentario: " + (d.texto || "(eliminado)"),
      "ec.crear": () => "Espacio confinado: " + (d.items || []).map(i => i.esp).join(", "), "ec.sumarme": () => "Agregarme a espacio confinado", "ec.monitoreo": () => "Monitoreo de EC #" + d.num + ": " + (d.items || []).map(i => String(i.fh || "").replace("T", " ")).join(", "),
      "ec.monEditar": () => "Corrección de monitoreo de EC #" + d.num, "ec.liberar": () => "Liberación de espacio que estaba NO LIBERADO", "ec.cerrar": () => "Cierre de espacio(s) confinado(s) " + (d.nums || []).join(", "), "ec.reabrir": () => "Reabrir EC #" + d.num, "vig.crear": () => "Vigilancia: " + (d.desc || ""), "vig.retirar": () => "Retiro de vigilancia",
      "he.guardar": () => "Horas extra " + (d.de ? d.de + " a " + d.a : (d.he === "" ? "(quitar)" : d.he + " h")), "he.justificar": () => "Justificación de horas extra", "perfil.guardar": () => "Datos del oficio",
      "turnos.guardar": () => "Datos del turno", "hojas.guardar": () => "Hoja de asignación" }[op.col + "." + op.accion];
    return f + (que ? que() : op.col + "." + op.accion);
  },

  /* Repite una lista de operaciones sobre una base de datos (la PC al importar, o el celular al recibir un paquete nuevo).
     ctx.db() -> { actividades, ec, vig } al momento;  ctx.ejecutar(op, datos) -> ejecuta como la persona op.ini */
  async reproducir(ops, ctx) {
    const res = { ok: 0, unidas: 0, fallas: [] };
    for (const op of ops) {
      try {
        const d = this.traducir(op, await ctx.db());
        try { await ctx.ejecutar(op, d); }
        catch (e) {
          const par = e.datos && e.datos.parecidas;
          if (op.col === "actividades" && op.accion === "guardarTurno" && par && par.length) {
            // la actividad ya existe en la PC: se une a ella (misma actividad) o se guarda como distinta (solo parecida)
            for (const it of d.items || []) { if (it.id || it.unir) continue; const l = par.filter(x => x.para === String(it.txt || "").trim()), ig = l.find(x => x.igual); if (ig) it.unir = ig.id; else if (l.length) it.distinta = true; }
            await ctx.ejecutar(op, d); res.unidas++;
          } else if (op.col === "ec" && op.accion === "crear" && /ya est. registrado/i.test(e.message)) {
            // el espacio ya lo registro otro ese dia: no se duplica, se agrega al personal TSI
            const db = await ctx.db(), nuevos = [];
            for (const it of d.items || []) { const ya = (db.ec || []).find(x => x.fecha === d.fecha && U.norm(x.esp) === U.norm(it.esp)); if (ya) await ctx.ejecutar({ ...op, accion: "sumarme" }, { num: ya.num }); else nuevos.push(it); }
            if (nuevos.length) await ctx.ejecutar(op, { ...d, items: nuevos });
            res.unidas++;
          } else throw e;
        }
        res.ok++;
      } catch (e) { res.fallas.push({ op, error: e.message || String(e) }); }
    }
    return res;
  },

  /* ---------- PC: importar el archivo de capturas de un celular */
  async importarCapturas(texto) {
    let f; try { f = JSON.parse(texto); } catch (e) { throw new Error("El archivo no se pudo leer. Verifica que sea el archivo de capturas que generó el celular."); }
    if (f && f._paquete) throw new Error("Ese archivo es un PAQUETE DE DATOS para celulares (lo genera la PC). Aquí se importan los archivos de CAPTURAS que mandan los celulares.");
    if (!f || f.tipo !== "b24-capturas" || !Array.isArray(f.ops)) throw new Error("El archivo no es de capturas de celular de la bitácora.");
    const sup = B.dom.esSup(), yoI = U.ini(B.usuario.ini);
    await B.api.recargar();
    const ya = new Set(B.estado.config.recibidos || []), ops = f.ops.filter(o => o && o.uid && !ya.has(o.uid));
    const ajenas = [...new Set(ops.filter(o => U.ini(o.ini) !== yoI).map(o => U.ini(o.ini)))];
    if (ajenas.length && !sup) throw new Error("Este archivo trae capturas de " + ajenas.join(", ") + ". Cada quien importa las suyas con su usuario; las de otra persona las importa un supervisor.");
    const res = await this.reproducir(ops, {
      db: async () => { await B.api.recargar(); return { actividades: B.dom.todas(), ec: B.estado.ec, vig: B.estado.vig }; },
      ejecutar: (op, d) => B.api.llamar("op", { col: op.col, accion: op.accion, datos: d, como: U.ini(op.ini) })
    });
    if (ops.length) await B.api.llamar("op", { col: "intercambio", accion: "registrar", datos: { uids: ops.map(o => o.uid) } });
    await B.api.recargar();
    return { ...res, total: f.ops.length, repetidas: f.ops.length - ops.length, de: f.ini, nombre: f.nombre || "" };
  },
  /* ---------- PC (supervisor): paquete de datos para los celulares */
  async generarPaquete() {
    const db = await B.api.llamar("respaldo");
    delete db.imagenes; delete db.ok;
    const c = B.oficio.cfg();
    db.config = { ...db.config, ofVoboNombre: db.config.ofVoboNombre ?? c.voboNombre, ofAutNombre: db.config.ofAutNombre ?? c.autNombre };
    db.ecGrupos = B.EC_GRUPOS || [];
    db._paquete = { tipo: "b24-paquete", generado: U.ahoraISO(), version: B.app.VERSION, por: B.usuario.ini, periodo: B.t.periodo() };
    const nombre = "Bitacora24RU1 PAQUETE celulares " + U.ahoraISO().replace("T", " ").replace(":", "") + ".json";
    U.descargar(nombre, JSON.stringify(db), "application/json");
    return nombre;
  },

  /* ---------- celular: cargar el paquete de datos que mando la PC */
  async cargarPaquete(texto) {
    let db; try { db = JSON.parse(texto); } catch (e) { throw new Error("El archivo no se pudo leer. Descárgalo de nuevo desde WhatsApp."); }
    if (db && db.tipo === "b24-capturas") throw new Error("Ese es un archivo de CAPTURAS de un celular. Aquí se carga el PAQUETE DE DATOS que genera la PC.");
    if (!db || !db._paquete || db._paquete.tipo !== "b24-paquete" || !Array.isArray(db.personal)) throw new Error("El archivo no es un paquete de datos de la bitácora.");
    const L = B.local; L.raiz = B.movilFS.raiz(); L.sub = "datos";
    return L.bloquear(async () => {
      const ant = await L.leer("paquete");
      if (ant && ant.generado && db._paquete.generado < ant.generado && !db._forzar) { const e = new Error("Este paquete (" + U.fh(db._paquete.generado) + ") es MÁS ANTIGUO que el que ya tienes (" + U.fh(ant.generado) + ")."); e.antiguo = true; throw e; }
      const pend = (await L.leer("pendientes")) || [], ya = new Set((db.config && db.config.recibidos) || []);
      const quedan = pend.filter(o => !ya.has(o.uid));
      for (const n of L.LISTAS) await L.escribir(n, Array.isArray(db[n]) ? db[n] : []);
      for (const n of ["config", "catalogos"]) await L.escribir(n, db[n] || {});
      await L.escribir("ecgrupos", db.ecGrupos || []);
      await L.escribir("paquete", db._paquete);
      B.EC_GRUPOS = db.ecGrupos || []; B.ecLista = B.ecArmar();
      // lo capturado en este celular que la PC todavia no recibe se vuelve a aplicar encima de los datos nuevos
      const leer3 = async () => ({ actividades: (await L.leer("actividades")) || [], ec: (await L.leer("ec")) || [], vig: (await L.leer("vig")) || [] });
      const res = await this.reproducir(quedan, { db: leer3, ejecutar: async (op, d) => {
        const p = db.personal.find(x => U.ini(x.ini) === U.ini(op.ini)); if (!p) throw new Error("persona no encontrada: " + op.ini);
        const s = { rpe: U.ini(p.rpe), ini: U.ini(p.ini), rol: L.rolDe(p), nombre: p.nombre };
        return L.operacion(s, s.rol === "supervisor", op.col, op.accion, d);
      } });
      await L.escribir("pendientes", quedan);
      return { confirmadas: pend.length - quedan.length, quedan: quedan.length, fallas: res.fallas, generado: db._paquete.generado };
    });
  },
  /* ---------- celular: archivo con las capturas pendientes (se comparte por WhatsApp) */
  async exportarCapturas(soloDescargar) {
    const ops = await this.pendientes();
    if (!ops.length) throw new Error("No tienes capturas pendientes de enviar.");
    const u = B.usuario, obj = { tipo: "b24-capturas", version: B.app.VERSION, generado: U.ahoraISO(), ini: u.ini, nombre: u.nombre, ops };
    // extension .txt: es la que los celulares permiten compartir directo a WhatsApp
    const nombre = "Bitacora24RU1 CAPTURAS " + u.ini + " " + U.ahoraISO().replace("T", " ").replace(":", "") + ".txt", texto = JSON.stringify(obj);
    await B.local.escribir("ultimoEnvio", { fecha: U.ahoraISO(), n: ops.length });
    if (!soloDescargar) try {
      const file = new File([texto], nombre, { type: "text/plain" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: nombre, text: "Capturas de la Bitácora 24RU1 · " + u.ini }); return { modo: "compartido", nombre, n: ops.length }; }
    } catch (e) { if (e.name === "AbortError") return { modo: "cancelado", nombre, n: ops.length }; }
    U.descargar(nombre, texto, "text/plain");
    return { modo: "descargado", nombre, n: ops.length };
  }
};

/* ===================================================================== VISTA: Celulares / Enviar y recibir */
V.celular = {
  titulo: "Celulares", sup: true,          // por ahora, solo supervisores
  sub() { return B.modoMovil ? "Enviar mis capturas a la PC y recibir los datos del turno" : "Intercambio de información con la versión para celular (por WhatsApp o correo)"; },
  leerArchivo(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("No se pudo leer el archivo.")); r.readAsText(file); }); },
  fallasHtml(fallas) {
    return fallas.length ? `<div class="aviso r" style="margin-top:10px">${B.ico("alerta")}<div><b>${fallas.length} captura(s) no se pudieron aplicar</b>; revísalas y captúralas a mano si hace falta:
      <ul style="margin:6px 0 0;padding-left:18px">${fallas.map(x => `<li><b>${U.esc(x.op.ini)}</b> · ${U.esc(B.inter.describir(x.op))}<br><span class="muted">${U.esc(x.error)}</span></li>`).join("")}</ul></div></div>` : "";
  },
  async render(c) {
    if (B.modoMovil) return this.movil(c);
    const sup = B.dom.esSup(), nRec = (B.estado.config.recibidos || []).length;
    c.innerHTML = `
      <div class="cuadricula">
      <div class="tarjeta c6" data-tour="cel-importar">${cab("descargar", "v", "Importar capturas de un celular", sup ? "Archivos «Bitacora24RU1 CAPTURAS …» que mandan los técnicos por WhatsApp. Puedes elegir varios a la vez." : "El archivo «Bitacora24RU1 CAPTURAS …» que mandaste desde tu celular (descárgalo de WhatsApp Web o del correo).")}
        <label class="btn verde bloque" style="cursor:pointer">${B.ico("subir")} Elegir archivo(s) de capturas…<input type="file" id="celImp" accept=".txt,.json,text/plain,application/json" multiple hidden></label>
        <p class="muted peque" style="margin:10px 0 0">Las capturas entran con el nombre de quien las hizo y con las reglas de siempre: no se duplican actividades ni espacios confinados, y el número de espacio confinado lo asigna la PC.
          Si el mismo archivo se importa dos veces no pasa nada: lo ya recibido se ignora. ${sup ? "" : "Solo puedes importar tus propias capturas."}</p>
        <div id="celRes"></div>
      </div>
      <div class="tarjeta c6" data-tour="cel-paquete">${cab("subir", "d", "Paquete de datos para los celulares", "Lleva al celular el personal, las asignaciones, pendientes, espacios, vigilancias y la hoja de asignación.")}
        ${sup ? `<button class="btn dorado bloque" id="celPaq">${B.ico("descargar")} Generar paquete para celulares</button>
          <p class="muted peque" style="margin:10px 0 0">Se descarga un archivo «Bitacora24RU1 PAQUETE celulares …». Mándalo al grupo de WhatsApp (WhatsApp Web → adjuntar → Documento). Cada técnico lo abre en su celular: <b>Celulares → Recibir datos</b>.
            Conviene generarlo al inicio del turno, después de asignar actividades, y después de importar capturas.</p>
          <div class="aviso a" style="margin-top:10px">${B.ico("info")}<div>El paquete contiene <b>toda la información de la bitácora</b> (incluye horas extra y los accesos del personal). Compártelo solo en el grupo del personal de Seguridad Industrial.</div></div>`
        : `<div class="aviso a">${B.ico("info")}<div>El paquete lo genera un <b>supervisor</b> y lo manda al grupo de WhatsApp. En tu celular: <b>Celulares → Recibir datos</b>.</div></div>`}
        <p class="muted peque" style="margin:10px 0 0">Capturas de celular recibidas hasta ahora: <b>${nRec}</b>.</p>
      </div></div>`;
    c.querySelector("#celImp").onchange = async e => {
      const files = [...e.target.files], caja = c.querySelector("#celRes"); if (!files.length) return;
      caja.innerHTML = `<p class="muted peque" style="margin-top:10px">Importando…</p>`; let h = "";
      for (const f of files) {
        try {
          const r = await B.inter.importarCapturas(await this.leerArchivo(f));
          h += `<div class="aviso ${r.fallas.length ? "d" : "v"}" style="margin-top:10px">${B.ico("ok")}<div><b>${U.esc(r.de || "")} ${U.esc(r.nombre)}</b> · ${U.esc(f.name)}<br>
            ${r.ok} captura(s) aplicadas${r.unidas ? " (" + r.unidas + " se unieron a registros que ya existían, sin duplicar)" : ""}${r.repetidas ? " · " + r.repetidas + " ya se habían recibido antes" : ""}.</div></div>` + this.fallasHtml(r.fallas);
        } catch (err) { h += `<div class="aviso r" style="margin-top:10px">${B.ico("alerta")}<div><b>${U.esc(f.name)}</b><br>${U.esc(err.message)}</div></div>`; }
      }
      caja.innerHTML = h; e.target.value = "";
    };
    const bp = c.querySelector("#celPaq");
    if (bp) bp.onclick = async () => { bp.disabled = true; try { const n = await B.inter.generarPaquete(); ui.toast("Paquete generado: <b>" + U.esc(n) + "</b>. Está en Descargas; mándalo al grupo de WhatsApp.", "ok", 9000); } catch (e) { ui.error(e); } bp.disabled = false; };
  },
  async movil(c) {
    const pend = await B.inter.pendientes(), paq = await B.inter.infoPaquete(), ult = await B.local.leer("ultimoEnvio");
    const horas = paq && paq.generado ? Math.round((Date.now() - new Date(paq.generado + ":00").getTime()) / 36e5) : null;
    c.innerHTML = `
      <div class="cuadricula">
      <div class="tarjeta c6" data-tour="cel-enviar">${cab("subir", "v", "Enviar mis capturas a la PC", pend.length ? `<b>${pend.length}</b> captura(s) guardadas en este celular que la PC todavía no confirma.` : "No hay capturas pendientes: la PC ya tiene todo lo de este celular.")}
        <button class="btn verde bloque" id="mEnviar" ${pend.length ? "" : "disabled"} style="min-height:52px;font-size:15px">${B.ico("subir")} Enviar por WhatsApp (${pend.length})</button>
        ${pend.length ? `<button class="btn sec bloque" id="mDescargar" style="margin-top:8px">${B.ico("descargar")} Guardar el archivo en el celular</button>` : ""}
        <p class="muted peque" style="margin:10px 0 0">Se genera un archivo «Bitacora24RU1 CAPTURAS ${U.esc(B.usuario.ini)} …»: elige <b>WhatsApp</b> y mándalo al grupo del turno o a tu propio chat. En la PC se importa en <b>Celulares → Importar capturas</b>.
          Puedes enviarlo varias veces: la PC ignora lo que ya recibió.${ult ? `<br>Último envío: ${U.fh(ult.fecha)} (${ult.n} capturas).` : ""}</p>
        ${pend.length ? `<details style="margin-top:10px"><summary class="peque" style="cursor:pointer;color:var(--azul);font-weight:600">Ver lo pendiente de enviar</summary><div class="lista" style="margin-top:8px">${pend.slice(-60).reverse().map(o => `<div class="item"><div class="cuerpo"><div class="tit" style="font-weight:500">${U.esc(B.inter.describir(o))}</div><div class="meta"><span>${U.esc(o.ini)}</span><span>capturado ${U.fh(o.t)}</span></div></div></div>`).join("")}</div></details>` : ""}
      </div>
      <div class="tarjeta c6" data-tour="cel-recibir">${cab("descargar", "d", "Recibir datos de la PC", paq ? `Datos del paquete generado el <b>${U.fh(paq.generado)}</b> por ${U.esc(paq.por || "")}${horas != null && horas >= 12 ? ` · <span style="color:var(--rojo)">hace ${horas} h: pide uno nuevo</span>` : ""}` : "Aún no se ha cargado ningún paquete.")}
        <label class="btn dorado bloque" style="cursor:pointer;min-height:52px;font-size:15px">${B.ico("descargar")} Cargar paquete de datos…<input type="file" id="mPaq" accept=".json,.txt,application/json,text/plain" hidden></label>
        <p class="muted peque" style="margin:10px 0 0">El supervisor manda al grupo de WhatsApp el archivo «Bitacora24RU1 PAQUETE celulares …». Descárgalo en WhatsApp (tócalo) y elígelo aquí.
          Tus capturas que aún no llegan a la PC <b>no se pierden</b>: se conservan encima de los datos nuevos.</p>
        <div id="mRes"></div>
      </div></div>
      <div class="tarjeta">${cab("info", "a", "Cómo funciona en el celular")}
        <ol style="margin:0;padding-left:20px;line-height:1.7;font-size:13.5px"><li>Al iniciar el turno carga el <b>paquete de datos</b> que mandó el supervisor.</li><li>Captura normalmente (actividades, espacios confinados, vigilancias, horas extra). Funciona <b>sin señal</b>.</li>
        <li>Antes de salir, toca <b>Enviar por WhatsApp</b>. Tus capturas aparecen en los reportes cuando se importan en la PC.</li></ol>
        <button class="btn fantasma chico" id="mBorrar" style="margin-top:12px">${B.ico("basura")} Borrar los datos de la bitácora de este celular</button>
        <div id="mPwa"></div>
      </div>`;
    B.pwa.poner(c.querySelector("#mPwa"));
    c.querySelector("#mEnviar").onclick = async () => {
      try { const r = await B.inter.exportarCapturas();
        ui.toast(r.modo === "compartido" ? "Archivo compartido. Cuando se importe en la PC y cargues el siguiente paquete, estas capturas dejarán de aparecer como pendientes." : r.modo === "descargado" ? "Tu celular no permite compartir directo: el archivo <b>" + U.esc(r.nombre) + "</b> quedó en Descargas. Adjúntalo en WhatsApp como Documento." : "Envío cancelado.", r.modo === "cancelado" ? "" : "ok", 10000);
        B.app.render(); } catch (e) { ui.error(e); }
    };
    const bd = c.querySelector("#mDescargar");
    if (bd) bd.onclick = async () => { try { const r = await B.inter.exportarCapturas(true); ui.toast("Archivo <b>" + U.esc(r.nombre) + "</b> guardado en Descargas. Adjúntalo en WhatsApp como Documento o mándalo por correo.", "ok", 9000); B.app.render(); } catch (e) { ui.error(e); } };
    const cargar = async (texto, forzar) => {
      const caja = c.querySelector("#mRes");
      try {
        if (forzar) { const o = JSON.parse(texto); o._forzar = true; texto = JSON.stringify(o); }
        const r = await B.inter.cargarPaquete(texto);
        await B.api.recargar();
        ui.toast(`Datos actualizados (paquete del ${U.fh(r.generado)}).` + (r.confirmadas ? ` La PC confirmó ${r.confirmadas} captura(s) tuyas.` : "") + (r.quedan ? ` Quedan ${r.quedan} por enviar.` : ""), "ok", 9000);
        await B.app.render();
        if (r.fallas.length) { const cj = document.querySelector("#mRes"); if (cj) cj.innerHTML = this.fallasHtml(r.fallas); }
      } catch (e) {
        if (e.antiguo && await ui.confirmar(U.esc(e.message) + "<br><br>¿Cargarlo de todos modos?", "Paquete antiguo", "Cargar de todos modos", true)) return cargar(texto, true);
        if (!e.antiguo) caja.innerHTML = `<div class="aviso r" style="margin-top:10px">${B.ico("alerta")}<div>${U.esc(e.message)}</div></div>`;
      }
    };
    c.querySelector("#mPaq").onchange = async e => { const f = e.target.files[0]; if (f) await cargar(await this.leerArchivo(f)); e.target.value = ""; };
    c.querySelector("#mBorrar").onclick = async () => {
      if (pend.length && !(await ui.confirmar(`Tienes <b>${pend.length} captura(s) sin confirmar</b> por la PC. Si borras los datos se pierden las que no hayas enviado.`, "Capturas pendientes", "Continuar", true))) return;
      if (!(await ui.confirmar("Se borrará de este celular toda la información de la bitácora (no afecta a la PC). Para volver a usarla tendrás que cargar un paquete de datos.", "Borrar datos del celular", "Borrar", true))) return;
      await B.movilFS.borrarTodo(); sessionStorage.clear(); location.hash = ""; location.reload();
    };
  }
};
;
/* ---- tour.js ---- */
/* =========================================================================
   BITACORA 24RU1 - Recorrido guiado (primer uso y menu Ayuda)
   ========================================================================= */
"use strict";
const TOURS = {
  tecnico: [
    { ilus: "👋", titulo: "¡Bienvenido(a) a la Bitácora 24RU1!", texto: "Este recorrido de 1 minuto te muestra cómo capturar tu turno. Puedes repetirlo cuando quieras desde el círculo con tus iniciales (arriba a la derecha) → Recorrido." },
    { el: '[data-tour="menu"]', titulo: "Menú principal", texto: "Aquí están tus secciones: Inicio, Mis actividades, Mis horas extra, Espacios confinados, Vigilancias, Pendientes, tu Historial, tu Oficio de tiempo extra y los Concentrados generales." },
    { el: '[data-tour="turno"]', titulo: "Turno de trabajo", texto: "Se elige solo según la hora. El T1 nocturno lleva la fecha del día en que SALES (noche del 04 al 05 de octubre = 05/10 T1). Cámbialo solo si capturas un turno anterior." },
    { ruta: "inicio", el: '[data-tour="kpis"]', titulo: "Resumen de tu turno", texto: "Tus actividades, pendientes, espacios liberados y vigilancias activas de un vistazo. Toca cualquier tarjeta para ir a esa sección." },
    { ruta: "actividades", el: '[data-tour="act-renglones"]', titulo: "Una actividad por renglón", texto: "Lo que te asigna el supervisor ya aparece aquí. NO dupliques: si al escribir aparece «Ya está capturada», toca Unirme; en las actividades en equipo el estatus y el comentario valen para todos. Escribe qué hiciste, dónde y en qué equipo, y elige su estatus: Realizada, En proceso o Pendiente. Lo pendiente aparece en los siguientes reportes hasta que lo concluyas." },
    { el: '[data-tour="act-anteriores"]', titulo: "Actividades anteriores", texto: "¿Actividad repetida o periódica? Búscala aquí: primero aparecen las tuyas y luego las de tus compañeros, de la más frecuente a la menos." },
    { el: '[data-tour="act-guardar"]', titulo: "Guardar", texto: "Presiona Guardar (o Ctrl + S). Puedes volver a entrar para corregir: tus actividades guardadas aparecen y puedes editarlas o quitarlas." },
    { ruta: "espacios", el: '[data-tour="ec-form"]', titulo: "Liberación de espacios confinados", texto: "Si otro compañero ya registró ese espacio hoy, no se duplica: el sistema te ofrece agregarte al personal TSI. En «Datos de la tarjeta de AVISO» puedes anotar edificio, elevación, equipo de protección y tiempos de estancia. Elige el espacio (o escríbelo si es nuevo), captura las lecturas y la hora. Al guardar recibe su # consecutivo del concentrado general; las lecturas fuera de rango se marcan en rojo." },
    { ruta: "vigilancias", el: '[data-tour="vig-alta"]', titulo: "Vigilancias contra incendio", texto: "Da de alta una vigilancia (el catálogo llena INOP y ubicación) y retírala con el botón Retirar. Mientras esté activa aparece en todos los reportes." },
    { ruta: "pendientes", el: '[data-tour="pend-lista"]', titulo: "Pendientes", texto: "Aquí das seguimiento: márcalos como Concluida, En proceso o agrega un comentario de avance. Lo concluido se reporta en tu turno y deja de repetirse." },
    { ruta: "horasextra", el: '[data-tour="he-form"]', titulo: "Mis horas extra", texto: "Apartado propio para tu tiempo extra: elige el día y turno y el horario De / A en horas o medias horas (las horas se calculan solas; cuenta a partir de 30 minutos), los alimentos y la justificación. ¿Horarios separados el mismo día? Guarda el primero y agrega «Otro horario»." },
    { el: '[data-tour="he-just"]', titulo: "Justificación", texto: "Ya viene la justificación general de la recarga; cámbiala solo si fue otra actividad. Puedes usar la misma en todos tus registros de la semana con la casilla." },
    { el: '[data-tour="he-semana"]', titulo: "Tu semana", texto: "Aquí ves tus registros de la semana y el total. Toca uno para corregirlo. El supervisor los verifica." },
    { el: '[data-tour="nav-historial"]', titulo: "Tu historial", texto: "Consulta todo lo que has capturado en el periodo y guárdalo en PDF cuando lo necesites." },
    { ruta: "oficio", el: '[data-tour="of-datos"]', titulo: "Tu oficio de tiempo extra", texto: "Cada semana genera tu oficio con el formato oficial: escribe una vez tu categoría (y título si aplica) y se recuerda. Los días se llenan con tus horas extra. Los técnicos C-42 llevan la leyenda PERSONAL EVENTUAL." },
    { el: '[data-tour="of-pdf"]', titulo: "Ajusta y genera", texto: "Revisa la vista previa, agrega observaciones si hace falta y genera el PDF o imprímelo para firmas." },
    { el: '[data-tour="avatar"]', titulo: "Tu cuenta", texto: "Desde aquí cambias tu contraseña, repites este recorrido o cierras sesión. La sesión se cierra sola tras unos minutos sin uso." },
    { ilus: "✅", titulo: "¡Listo para capturar!", texto: "Recuerda: tus datos se guardan en la PC servidor y se respaldan automáticamente. Si tienes dudas, consulta a tu supervisor." }
  ],
  supervisor: [
    { ilus: "🧭", titulo: "Recorrido para supervisores", texto: "Aprende en 2 minutos a revisar el turno, generar el reporte en PDF, verificar horas extra y administrar la configuración. El recorrido para técnicos está en tu menú de usuario." },
    { el: '[data-tour="nav-turno"]', titulo: "Sección de supervisión", texto: "Datos del turno, Reporte del turno y Asistencia y horas extra. Más abajo: Administración (personal, catálogos, usuarios y configuración)." },
    { ruta: "inicio", el: '[data-tour="kpis"]', titulo: "Captura del turno", texto: "Ves cuántas personas del turno ya tienen registros y cuántas están asignadas sin captura, además de los pendientes abiertos de todo el personal." },
    { ruta: "actividades", el: '[data-tour="act-asignar"]', titulo: "Asignar actividades al personal", texto: "Escribe la actividad una vez y marca a una o varias personas del turno: en el reporte sale en un solo renglón con las iniciales de todos. ¿Aún no sabes quién la hará? Guárdala sin marcar a nadie: queda «por asignar» y los técnicos pueden tomarla. También puedes capturar espacios confinados y vigilancias a nombre de un técnico." },
    { ruta: "historial", el: '[data-tour="hist-persona"]', titulo: "Historial de cualquier persona", texto: "Haz clic en el campo Persona: se despliega todo el personal. Elige a cualquier técnico para ver todo su historial e imprimirlo." },
    { ruta: "hoja", el: '[data-tour="hoja-cab"]', titulo: "Hoja de asignación de actividades", texto: "Captura el mensaje de seguridad, ISA / CISA / SIF, estado de las unidades, dosis PETAR e INOP's. Cada turno se copian los datos del anterior y los días avanzan solos; las actividades pendientes, del turno y por asignar salen de la bitácora, separadas por unidad. Genera el PDF con el formato oficial." },
    { ruta: "turno", el: '[data-tour="sup-firmas"]', titulo: "Elaboró y revisó", texto: "Escribe iniciales o apellido de los supervisores: se completa solo. Aparecen al final del reporte con nombre y RPE." },
    { el: '[data-tour="sup-difusion"]', titulo: "Difusión del turno", texto: "Busca un mensaje del catálogo o escribe uno nuevo (se agrega al catálogo automáticamente)." },
    { el: '[data-tour="sup-asistencia"]', titulo: "Asistencia", texto: "Quien capturó aparece solo. Marca Presente a quien estuvo en el turno aunque no tenga actividades (o usa «Marcar presentes a todos los asignados»): saldrá en el personal del turno del reporte. En rojo: asignados sin registro. Agrega gente de otro turno con el buscador." },
    { ruta: "reporte", el: '[data-tour="rep-previa"]', titulo: "Revisa el reporte", texto: "Vista previa con membrete y pie oficiales. Las secciones vacías se omiten, el resumen va al inicio y las lecturas fuera de rango salen en rojo. Incluye los últimos 3 a 5 espacios confinados liberados, según el espacio disponible en la hoja." },
    { el: '[data-tour="rep-pdf"]', titulo: "Generar PDF", texto: "Crea el PDF en la carpeta REPORTES 24RU1 y lo abre. Si alguien del turno no capturó, te avisa antes de generarlo." },
    { ruta: "asistencia", el: '[data-tour="he-matriz"]', titulo: "Asistencia y horas extra semanal", texto: "Semana de lunes a domingo: turno y horas de cada persona por día, comparadas con la referencia automática. Las diferencias salen en rojo." },
    { el: '[data-tour="he-verificar"]', titulo: "Verificar la semana", texto: "Corrige en el detalle si hace falta, guarda y marca la semana como verificada. También puedes exportar a Excel o PDF." },
    { ruta: "oficio", el: '[data-tour="of-semana"]', titulo: "Oficios de tiempo extra", texto: "Genera el oficio semanal de cualquier persona o todos los de la semana en un solo PDF (una hoja por persona). Los nombres de Vo. Bo. y Autoriza se cambian en Configuración." },
    { ruta: "registros", el: '[data-tour="reg-filtros"]', titulo: "Registros de todo el personal", texto: "Con el lápiz de cada renglón corriges el texto o el estatus de cualquier actividad, incluso de las ya realizadas. Revisa las actividades de todos los técnicos, especializados y supervisores: filtra por fechas, turno, categoría, persona o estatus, y abre el historial de cada quien." },
    { ruta: "concentrados", el: '[data-tour="conc-filtros"]', titulo: "Concentrados generales", texto: "Filtra por fechas o busca; genera PDF o Excel del rango. Como supervisor puedes corregir registros (mejor anota ANULADO que eliminar)." },
    { ruta: "config", el: '[data-tour="cfg-recarga"]', titulo: "Configuración", texto: "Nombre y fechas del periodo (recarga u operación normal), nombres de turnos, rangos de referencia de espacios confinados y la referencia de horas extra." },
    { el: '[data-tour="cfg-membrete"]', titulo: "Membrete y pie de página", texto: "Cambia el encabezado y el pie de todos los reportes para otro proyecto o año: sube la nueva imagen y revisa la vista previa. Puedes restaurar los originales." },
    { el: '[data-tour="cfg-respaldo"]', titulo: "Respaldos", texto: "El sistema respalda solo en cada cambio y cada día. Aquí descargas un respaldo completo o restauras uno." },
    { el: '[data-tour="nav-usuarios"]', titulo: "Usuarios", texto: "Si alguien olvida su contraseña, restablécela a la inicial (RPE + iniciales; supervisores 24RU1)." },
    { ilus: "🏁", titulo: "¡Todo listo!", texto: "Flujo diario sugerido: 1) revisa la captura del turno, 2) completa Datos del turno, 3) revisa y genera el PDF, 4) cada semana verifica asistencia y horas extra." }
  ]
};

B.tour = {
  tipo: null, i: 0, pasos: [], capa: null,
  ofrecer(tipo) { this.iniciar(tipo); },
  iniciar(tipo) {
    this.cerrar(false);
    this.tipo = tipo; this.pasos = TOURS[tipo]; this.i = 0;
    const capa = document.createElement("div");
    capa.innerHTML = `<div class="tour-velo"></div><div class="tour-foco"></div><div class="tour-caja" role="dialog" aria-live="polite"></div>`;
    document.body.appendChild(capa);
    this.capa = capa;
    this._tecla = e => { if (e.key === "Escape") this.cerrar(true); if (e.key === "ArrowRight") this.mover(1); if (e.key === "ArrowLeft") this.mover(-1); };
    document.addEventListener("keydown", this._tecla);
    this._resize = () => this.posicionar();
    window.addEventListener("resize", this._resize);
    this.mostrar();
  },
  async mostrar() {
    const p = this.pasos[this.i];
    if (p.ruta && B.app.ruta !== p.ruta) { location.hash = "#/" + p.ruta; await new Promise(r => setTimeout(r, 260)); }
    const caja = this.capa.querySelector(".tour-caja");
    const ultimo = this.i === this.pasos.length - 1;
    caja.innerHTML = `${p.ilus ? `<div class="tour-ilustra">${p.ilus}</div>` : ""}<div class="paso">${this.tipo === "supervisor" ? "Supervisores" : "Técnicos"} · Paso ${this.i + 1} de ${this.pasos.length}</div>
      <h3>${p.titulo}</h3><p>${p.texto}</p>
      <div class="tour-puntos">${this.pasos.map((_, k) => `<i class="${k === this.i ? "on" : ""}"></i>`).join("")}</div>
      <div class="tour-botones">${!ultimo ? `<button class="btn fantasma chico salir">Saltar</button>` : `<span class="salir"></span>`}
        ${this.i > 0 ? `<button class="btn sec chico" data-m="-1">Anterior</button>` : ""}
        <button class="btn chico" data-m="1">${ultimo ? "Terminar" : this.i === 0 ? "Empezar" : "Siguiente"}</button></div>`;
    caja.querySelector(".salir")?.addEventListener("click", () => this.cerrar(true));
    caja.querySelectorAll("[data-m]").forEach(b => b.onclick = () => this.mover(+b.dataset.m));
    const el = p.el ? document.querySelector(p.el) : null;
    if (this.visible(el)) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      await new Promise(r => setTimeout(r, 380));
    }
    this.posicionar();
    caja.querySelector('[data-m="1"]').focus();
  },
  posicionar() {
    if (!this.capa) return;
    const p = this.pasos[this.i], foco = this.capa.querySelector(".tour-foco"), caja = this.capa.querySelector(".tour-caja");
    const el = p.el ? document.querySelector(p.el) : null;
    const visible = this.visible(el);
    this.capa.classList.toggle("tour-centro", !visible);
    if (!visible) {
      Object.assign(foco.style, { left: "50%", top: "50%", width: "0px", height: "0px" });
      const w = caja.offsetWidth, h = caja.offsetHeight;
      Object.assign(caja.style, { left: (innerWidth - w) / 2 + "px", top: Math.max(16, (innerHeight - h) / 2) + "px" });
      return;
    }
    const r = el.getBoundingClientRect(), m = 8;
    const top = Math.max(6, r.top - m), left = Math.max(6, r.left - m);
    const width = Math.min(innerWidth - left - 6, r.width + m * 2), height = Math.min(innerHeight - top - 6, r.height + m * 2);
    Object.assign(foco.style, { top: top + "px", left: left + "px", width: width + "px", height: height + "px" });
    const w = caja.offsetWidth, h = caja.offsetHeight;
    let ct, cl;
    if (r.right + 16 + w < innerWidth && r.width < innerWidth * .45) { cl = r.right + 18; ct = r.top; }
    else if (top + height + 14 + h < innerHeight) { ct = top + height + 14; cl = r.left; }
    else if (top - 14 - h > 0) { ct = top - 14 - h; cl = r.left; }
    else { ct = innerHeight - h - 16; cl = r.left; }
    cl = Math.min(Math.max(16, cl), innerWidth - w - 16);
    ct = Math.min(Math.max(16, ct), innerHeight - h - 16);
    Object.assign(caja.style, { left: cl + "px", top: ct + "px" });
  },
  visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== "hidden";
  },
  mover(d) {
    const n = this.i + d;
    if (n < 0) return;
    if (n >= this.pasos.length) { this.cerrar(true); return; }
    this.i = n; this.mostrar();
  },
  async cerrar(marcar) {
    if (!this.capa) return;
    this.capa.remove(); this.capa = null;
    document.removeEventListener("keydown", this._tecla);
    window.removeEventListener("resize", this._resize);
    if (marcar && this.tipo && B.token) {
      try {
        await B.api.op("usuarios", "tourVisto", { tour: this.tipo });
        const v = (B.usuario.tours || "").split(",").filter(Boolean);
        if (!v.includes(this.tipo)) v.push(this.tipo);
        B.usuario.tours = v.join(",");
      } catch (e) { }
      if (this.i < this.pasos.length - 1) B.ui.toast("Puedes ver el recorrido cuando quieras desde tu menú de usuario (círculo arriba a la derecha).", "", 5000);
    }
  }
};
;
/* ---- app.js ---- */
/* =========================================================================
   BITACORA 24RU1 - Aplicacion: login, navegacion, turno de trabajo
   ========================================================================= */
"use strict";
B.vistas = B.vistas || {};

B.app = {
  trabajo: null,
  ruta: "inicio",
  info: {}, VERSION: "2.5", servidorViejo: false,

  async iniciar() {
    if (B.modoLocal) return this.iniciarLocal();
    try { this.info = await (await fetch("api/info")).json(); } catch (e) { this.info = {}; }
    await B.cargarImagenes();
    // Tras una actualizacion, el servidor de esta PC debe reiniciarse para tomar la version nueva
    this.servidorViejo = !!this.info.version && this.info.version !== this.VERSION;
    const tok = sessionStorage.getItem("b_token");
    if (tok && !this.servidorViejo) {
      B.token = tok;
      try { await B.api.recargar(); this.entrar(); return; } catch (e) { B.token = null; sessionStorage.removeItem("b_token"); }
    }
    this.pantallaLogin();
  },

  /* ---------------------------------------------------------------- plan B: sin servidor */
  async iniciarLocal() {
    document.querySelector(".cargando")?.remove();
    if (B.modoMovil) return this.iniciarMovil();
    const fav = document.getElementById("favicon"); if (fav) fav.href = "img/bitacora_planb.ico";
    if (!B.local.soportado()) {
      document.getElementById("raiz").innerHTML = `<div class="login"><div class="login-membrete"><img src="img/membrete.png" alt=""></div>
        <div class="login-caja"><h1>Abre con Microsoft Edge</h1><p>Este modo sin servidor necesita <b>Microsoft Edge</b> o <b>Google Chrome</b>.
        Cierra esta ventana y en el archivo usa: clic derecho → <b>Abrir con</b> → <b>Microsoft Edge</b>.</p></div></div>`;
      return;
    }
    const h = await B.local.carpetaGuardada();
    if (h) {
      try { if (await B.local.permiso(h, false)) { await B.local.conectar(h, sessionStorage.getItem("b_local_demo") === "1"); return this.despuesConectar(); } } catch (e) { }
    }
    this.pantallaConectar(h);
  },
  /* ---------------------------------------------------------------- version para celular */
  async iniciarMovil() {
    try { if (await B.inter.conectarMovil()) return this.despuesConectar(); }
    catch (e) { return this.pantallaMovilInicio(e.message); }
    this.pantallaMovilInicio();
  },
  // Primera vez en el celular: hay que cargar el paquete de datos que genera la PC
  pantallaMovilInicio(msg) {
    document.getElementById("raiz").innerHTML = `
      <div class="login">
        <div class="login-membrete"><img src="img/membrete.png" alt=""></div>
        <div class="login-caja">
          <h1>Bitácora de Seguridad Industrial <span class="chip-demo" style="background:var(--azul)">CELULAR</span></h1>
          <p>Para empezar, carga el <b>paquete de datos</b> que el supervisor manda al grupo de WhatsApp (archivo «Bitacora24RU1 PAQUETE celulares …»).</p>
          <ol style="margin:0 0 14px;padding-left:20px;font-size:13px;line-height:1.6"><li>En WhatsApp, toca el archivo para descargarlo.</li><li>Vuelve aquí y presiona el botón.</li><li>Búscalo en <b>Descargas</b> o en <b>WhatsApp → Documentos</b>.</li></ol>
          ${msg ? `<div class="aviso r">${B.ico("alerta")}<div>${U.esc(msg)}</div></div>` : ""}
          <label class="btn bloque" style="cursor:pointer">${B.ico("descargar")} Cargar paquete de datos…<input type="file" id="mIni" accept=".json,.txt,application/json,text/plain" hidden></label>
        </div>
        <div class="login-pie">Los datos se guardan solo en este celular. Tus capturas se mandan a la PC desde el menú <b>Enviar / recibir</b>.</div>
      </div>`;
    B.pwa.poner(document.querySelector(".login-caja"));
    document.getElementById("mIni").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { await B.inter.cargarPaquete(await V.celular.leerArchivo(f)); await B.inter.conectarMovil(); this.despuesConectar(); }
      catch (err) { this.pantallaMovilInicio(err.message); }
    };
  },
  pantallaConectar(h, msg) {
    document.getElementById("raiz").innerHTML = `
      <div class="login">
        <div class="login-membrete"><img src="img/membrete.png" alt="Gobierno de México · CFE · 24RU1"></div>
        <div class="login-caja">
          <h1>Bitácora de Seguridad Industrial <span class="chip-demo" style="background:var(--azul)">SIN SERVIDOR</span></h1>
          <p>Los datos se guardan en la carpeta <b>Bitacora24RU1</b> de esta PC. Al abrir, el navegador te pedirá permiso para
          <b>ver y editar</b> esa carpeta: elige <b>Permitir</b>${h ? "" : " (la primera vez selecciona la carpeta Bitacora24RU1)"}.</p>
          ${msg ? `<div class="aviso r">${B.ico("alerta")}<div>${U.esc(msg)}</div></div>` : ""}
          <label class="campo" style="flex-direction:row;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" id="cDemo" ${sessionStorage.getItem("b_local_demo") === "1" ? "checked" : ""}>
            <span style="font-size:13px">Practicar con los datos <b>DEMO</b></span></label>
          <button class="btn bloque" id="cAbrir">${B.ico("doc")} ${h ? "Abrir bitácora (" + U.esc(h.name) + ")" : "Seleccionar la carpeta Bitacora24RU1"}</button>
          ${h ? `<button class="btn fantasma bloque" id="cOtra" style="margin-top:8px">Elegir otra carpeta…</button>` : ""}
        </div>
        <div class="login-pie">Modo de respaldo (plan B): funciona sin permisos de administrador y sin servidor. Para PDF usa Imprimir → Guardar como PDF.</div>
      </div>`;
    const abrir = async otra => {
      try {
        let c = h;
        if (!c || otra) c = await B.local.elegirCarpeta();
        else if (!(await B.local.permiso(c, true))) throw new Error("Debes permitir el acceso a la carpeta para continuar.");
        await B.local.conectar(c, document.getElementById("cDemo").checked);
        this.despuesConectar();
      } catch (e) { if (e.name !== "AbortError") this.pantallaConectar(h, e.message); }
    };
    document.getElementById("cAbrir").onclick = () => abrir(false);
    const o = document.getElementById("cOtra"); if (o) o.onclick = () => abrir(true);
  },
  async despuesConectar() {
    this.info = await B.local.llamar("info");
    await B.cargarImagenes();
    const ses = B.local.leeSesion();
    if (ses) { B.token = "local"; B.local.sesion = ses; try { await B.api.recargar(); this.entrar(); return; } catch (e) { } }
    this.pantallaLogin();
  },

  /* ---------------------------------------------------------------- login */
  pantallaLogin(msg) {
    document.querySelector(".cargando")?.remove();
    const demo = this.info.demo ? `<span class="chip-demo">DEMO</span>` : "";
    document.getElementById("raiz").innerHTML = `
      <div class="login">
        <div class="login-membrete"><img src="${B.imgUrl("membrete")}" alt="Membrete"></div>
        <form class="login-caja" id="fLogin" autocomplete="off">
          <h1>Bitácora de Seguridad Industrial ${demo}</h1>
          <p>Ingresa con tu <b>RPE</b>. La contraseña inicial es tu <b>RPE + tus iniciales</b>, todo junto y sin espacios.</p>
          <div class="login-ejemplo"><span>Ejemplo</span>RPE <b>9XY99</b> + iniciales <b>ABC</b><br>Contraseña inicial: <b>9XY99ABC</b></div>
          ${msg ? `<div class="aviso d">${B.ico("info")}<div>${U.esc(msg)}</div></div>` : ""}
          ${this.servidorViejo ? `<div class="aviso r">${B.ico("alerta")}<div><b>La bitácora se actualizó a la versión ${this.VERSION}</b>, pero el servidor de esta PC sigue con la versión ${U.esc(this.info.version)}.
            Ejecuta <b>DETENER SERVIDOR.bat</b> y vuelve a abrir el ícono <b>Bitacora 24RU1</b> (o reinicia la PC). Mientras tanto no se puede entrar, para proteger los registros.</div></div>` : ""}
          <div class="campo"><label for="lRpe">RPE</label><input class="inp" id="lRpe" name="b24-acceso-${Date.now()}" required style="text-transform:uppercase" value="" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
          <div class="campo"><label for="lClave">Contraseña</label><input class="inp" id="lClave" name="b24-clave-${Date.now()}" type="password" required autocomplete="new-password"></div>
          <button class="btn bloque" type="submit">${B.ico("llave")} Entrar</button>
          <div class="aviso r oculto" id="lErr" style="margin:14px 0 0"></div>
          ${B.modoLocal ? `<p class="peque" style="margin:14px 0 0;text-align:center">Modo sin servidor · carpeta <b>${U.esc(B.local.raiz ? B.local.raiz.name + " / " + B.local.sub : "")}</b> ·
            <a href="#" id="lCarpeta">cambiar</a></p>` : ""}
        </form>
        <div class="login-pie">Coordinación Nuclear · Gerencia Nucleoeléctrica Laguna Verde · Subgerencia de Seguridad Nuclear · Oficina de Seguridad Industrial</div>
      </div>`;
    const f = document.getElementById("fLogin");
    const lc = document.getElementById("lCarpeta");
    if (lc) lc.onclick = async e => { e.preventDefault(); this.pantallaConectar(await B.local.carpetaGuardada()); };
    if (B.modoMovil) B.pwa.poner(document.querySelector(".login-caja"));
    try { localStorage.removeItem("b_rpe"); } catch (e) { }      // por privacidad no se recuerda el RPE del ultimo que la uso
    document.getElementById("lRpe").focus();
    if (this.servidorViejo) f.querySelector('button[type="submit"]').disabled = true;
    f.onsubmit = async e => {
      if (this.servidorViejo) { e.preventDefault(); return; }
      e.preventDefault();
      const err = document.getElementById("lErr"), btn = f.querySelector("button");
      err.classList.add("oculto"); btn.disabled = true;
      try {
        const rpe = document.getElementById("lRpe").value.trim().toUpperCase();
        const r = await B.api.llamar("login", { rpe, clave: document.getElementById("lClave").value });
        B.token = r.token; sessionStorage.setItem("b_token", r.token);
        await B.api.recargar();
        this.entrar(true);
      } catch (ex) { err.innerHTML = B.ico("alerta") + "<div>" + U.esc(ex.message) + "</div>"; err.classList.remove("oculto"); btn.disabled = false; }
    };
  },

  async salir(msg) {
    try { if (B.token) await B.api.llamar("logout", {}); } catch (e) { }
    B.token = null; B.estado = null; B.usuario = null;
    sessionStorage.removeItem("b_token");
    B.tour && B.tour.cerrar();
    this.pantallaLogin(msg);
  },
  sesionExpirada() { if (B.token) { B.token = null; sessionStorage.removeItem("b_token"); this.pantallaLogin("Tu sesión terminó. Vuelve a ingresar."); } },

  /* ---------------------------------------------------------------- shell */
  entrar(recienLogin) {
    document.querySelector(".cargando")?.remove();
    // la version para celular esta reservada, por ahora, a los supervisores (config.celTecnicos = true la abre a los tecnicos)
    if (B.modoMovil && !B.dom.esSup() && !(B.estado.config || {}).celTecnicos) {
      B.token = null; B.usuario = null; B.local.sesion = null; B.local.borraSesion(); sessionStorage.removeItem("b_token");
      return this.pantallaLogin("La versión para celular está reservada, por ahora, a los supervisores. Captura en la bitácora de la PC.");
    }
    if (B.vistas.actividades) B.vistas.actividades.ini = null;
    if (B.vistas.historial) B.vistas.historial.persona = null;
    if (B.vistas.pendientes) B.vistas.pendientes.filtro = "";
    if (B.vistas.horasextra) { B.vistas.horasextra.f = null; B.vistas.horasextra.ini = null; }
    if (B.vistas.oficio) { B.vistas.oficio.ini = null; B.vistas.oficio.lunes = null; B.vistas.oficio.aj = {}; }
    const guardado = JSON.parse(sessionStorage.getItem("b_trabajo") || "null");
    this.trabajo = guardado || B.t.actual();
    const sup = B.dom.esSup(), u = B.usuario;
    const enlaces = [
      ["MI TURNO", [["inicio", "Inicio", "inicio"], ["actividades", "Mis actividades", "lista"], ["horasextra", sup ? "Horas extra (captura)" : "Mis horas extra", "calendario"], ["espacios", "Espacios confinados", "escudo"], ["monitoreo", "Monitoreo de E.C.", "reloj"],
        ["vigilancias", "Vigilancias C.I.", "fuego"], ["pendientes", sup ? "Pendientes (todos)" : "Mis pendientes", "reloj"], ["historial", sup ? "Historial por persona" : "Mi historial", "historial"], ["oficio", sup ? "Oficios de tiempo extra" : "Mi oficio de tiempo extra", "doc"]]],
      ["CONSULTA", [["concentrados", "Concentrados", "doc"]].concat(sup ? [["registros", "Registros del personal", "usuarios"], ["celular", B.modoMovil ? "Enviar / recibir" : "Celulares", "subir"]] : [])]
    ];
    if (sup) {
      enlaces.push(["SUPERVISIÓN", [["turno", "Datos del turno", "usuarios"], ["reporte", "Reporte del turno", "pdf"], ["hoja", "Hoja de asignación", "doc"], ["asistencia", "Asistencia y horas extra", "calendario"]]]);
      if (!B.modoMovil) enlaces.push(["ADMINISTRACIÓN", [["personal", "Personal y turnos", "usuario"], ["catalogos", "Catálogos", "lista"], ["usuarios", "Usuarios", "llave"], ["config", "Configuración y respaldos", "engrane"]]]);
    }
    document.getElementById("raiz").innerHTML = `
      <div class="app">
        <aside class="lateral" data-tour="menu">
          <div class="marca"><div class="marca-logo">24RU1</div><div><b>Bitácora S.I.</b><span>${U.esc(B.t.periodo())}${B.estado.servidor.demo ? " · DEMO" : ""}</span></div></div>
          <nav class="nav">${enlaces.map(([g, ls]) => `<div class="nav-grupo">${g}</div>` + ls.map(([r, t, i]) =>
            `<a href="#/${r}" data-r="${r}" data-tour="nav-${r}">${B.ico(i)}<span>${t}</span>${r === "celular" ? '<span class="contador oculto" id="cntCel"></span>' : ""}${r === "monitoreo" ? '<span class="contador oculto" id="cntMon"></span>' : ""}${r === "pendientes" ? '<span class="contador oculto" id="cntPend"></span>' : ""}</a>`).join("")).join("")}</nav>
          <div class="lateral-pie">${sup ? "Supervisor" : "Técnico"} · ${U.esc(u.ini)}<br>${B.modoMovil ? "Datos guardados en este celular" : "Datos guardados en la PC servidor"} · v${U.esc((this.info && this.info.version) || "2.5")}</div>
        </aside>
        <div class="principal">
          <header class="barra">
            <button class="btn fantasma btn-icono btn-menu-movil" id="bMenuMovil">${B.ico("menu")}</button>
            <div><h1 id="tituloVista"></h1><div class="sub" id="subVista"></div></div>
            <div class="barra-der">
              <a class="pend-movil oculto" id="insPend" href="#/celular" title="Capturas guardadas en este celular que falta enviar a la PC"></a>
              <div class="turno-insignia" id="insTurno"></div>
              <div class="turno-sel" data-tour="turno" title="Turno de trabajo (el T1 nocturno se rotula con la fecha de salida)">
                ${B.ico("calendario", 'style="width:17px;height:17px;color:var(--texto-3)"')}
                <input type="date" id="selFecha" value="${this.trabajo.f}">
                ${B.ui.seg("turno", ["T1", "T2"], this.trabajo.t)}
              </div>
              <button class="avatar" id="bAvatar" title="${U.esc(u.nombre)}" data-tour="avatar">${U.esc(u.ini.slice(0, 3))}</button>
            </div>
          </header>
          <main class="contenido" id="vista"></main>
        </div>
      </div>`;
    this.pintarTurno();
    document.getElementById("selFecha").onchange = e => { if (e.target.value) this.cambiarTrabajo(e.target.value, this.trabajo.t); };
    B.ui.activarSeg(document.querySelector(".turno-sel"), (s, v) => this.cambiarTrabajo(this.trabajo.f, v));
    document.getElementById("bAvatar").onclick = e => { e.stopPropagation(); this.menuUsuario(); };
    document.getElementById("bMenuMovil").onclick = e => { e.stopPropagation(); document.body.classList.toggle("nav-abierto"); };
    if (!this._cierraMenu) { this._cierraMenu = true; document.addEventListener("click", e => { if (document.body.classList.contains("nav-abierto") && !e.target.closest(".lateral")) document.body.classList.remove("nav-abierto"); }); }
    window.onhashchange = () => this.navegar();
    if (B.modoLocal && "BroadcastChannel" in window && !this._canal) {
      this._canal = new BroadcastChannel("bitacora24ru1");
      const formas = ["actividades", "horasextra", "espacios", "vigilancias", "turno", "personal", "catalogos", "config", "oficio", "hoja"];
      const aviso = U.debounce(() => {
        if (!B.token) return;
        if (formas.includes(this.ruta)) B.ui.toast("Se guardaron cambios desde otra ventana. Se verán al cambiar de sección.", "", 4000);
        else this.refrescar().catch(() => { });
      }, 800);
      this._canal.onmessage = e => { if (!e.data || e.data.tab !== B.local.tabId) aviso(); };
    }
    this.vigilarInactividad();
    this.navegar();
    if (recienLogin && !u.cambiada) setTimeout(() => B.ui.toast("Estás usando tu contraseña inicial. Te recomendamos cambiarla en el menú de tu usuario (círculo arriba a la derecha).", "aviso", 8000), 1200);
    const vistos = (u.tours || "").split(",");
    const tourPend = sup ? (!vistos.includes("supervisor") ? "supervisor" : null) : (!vistos.includes("tecnico") ? "tecnico" : null);
    if (tourPend && B.tour) setTimeout(() => B.tour.ofrecer(tourPend), 700);
  },

  cambiarTrabajo(f, t) {
    this.trabajo = { f, t };
    sessionStorage.setItem("b_trabajo", JSON.stringify(this.trabajo));
    const sf = document.getElementById("selFecha"); if (sf && sf.value !== f) sf.value = f;
    document.querySelectorAll('.turno-sel .seg button').forEach(b => b.classList.toggle("on", b.dataset.v === t));
    this.pintarTurno();
    this.render();
  },
  // La barra superior cambia de color segun el turno de trabajo: azul noche con luna (T1) o dorado con sol (T2)
  pintarTurno() {
    const t = this.trabajo.t, noche = t === "T1", ins = document.getElementById("insTurno");
    document.body.classList.toggle("turno-noche", noche); document.body.classList.toggle("turno-dia", !noche);
    if (ins) ins.innerHTML = (noche
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a.7.7 0 0 0-.9-.9A9.6 9.6 0 1 0 21.4 15.5a.7.7 0 0 0-.9-.9z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/></svg>')
      + `<span><b>${t} ${U.esc(B.t.nombre(t))}</b><small>${noche ? "turno de noche" : "turno de día"} · ${U.cortaDM(this.trabajo.f)}</small></span>`;
  },

  navegar() {
    let r = (location.hash || "#/inicio").replace("#/", "").split("?")[0] || "inicio";
    const v = B.vistas[r];
    if (!v || (v.sup && !B.dom.esSup())) r = "inicio";
    this.ruta = r;
    document.body.classList.remove("nav-abierto");
    document.querySelectorAll(".nav a").forEach(a => a.classList.toggle("activo", a.dataset.r === r));
    if (B.modoLocal && !B.modoMovil && B.token) { B.api.recargar().then(() => this.render()).catch(e => B.ui.error(e)); return; }
    this.render();
  },

  render() {
    const v = B.vistas[this.ruta], cont = document.getElementById("vista");
    if (!v || !cont) return;
    document.getElementById("tituloVista").textContent = v.titulo;
    document.getElementById("subVista").textContent = (v.sub ? v.sub() : this.textoTurno());
    cont.innerHTML = "";
    try { v.render(cont); } catch (e) { console.error(e); cont.innerHTML = `<div class="aviso r">${B.ico("alerta")}<div>Error al mostrar la vista: ${U.esc(e.message)}</div></div>`; }
    this.contadores();
    window.scrollTo(0, 0);
  },
  async refrescar() { await B.api.recargar(); this.render(); },
  textoTurno() { const { f, t } = this.trabajo; return `${t} ${B.t.nombre(t)} · ${B.t.horario(t)} · ${U.larga(f)}`; },
  contadores() {
    const n = B.dom.pendientesGrupos(B.dom.esSup() ? null : B.usuario.ini).length, c = document.getElementById("cntPend");
    if (c) { c.textContent = n; c.classList.toggle("oculto", !n); }
    // espacios que siguen liberados y aun no tienen monitoreo en el turno de trabajo
    const cm = document.getElementById("cntMon");
    if (cm) { const nm = B.dom.ecFilasMon(this.trabajo.f, this.trabajo.t).filter(x => !x.ok).length; cm.textContent = nm; cm.classList.toggle("oculto", !nm); }
    if (B.modoMovil) this.estadoMovil();
  },
  // Celular: cuantas capturas faltan por enviar a la PC y que tan viejo es el paquete de datos (barra, menu y pantalla de inicio)
  async estadoMovil() {
    try {
      const ruta = this.ruta, n = (await B.inter.pendientes()).length, paq = await B.inter.infoPaquete();
      const ip = document.getElementById("insPend"), cc = document.getElementById("cntCel");
      if (ip) { ip.innerHTML = B.ico("subir") + n; ip.classList.toggle("oculto", !n || ruta === "celular"); }
      if (cc) { cc.textContent = n; cc.classList.toggle("oculto", !n); }
      const v = document.getElementById("vista");
      if (ruta !== "inicio" || this.ruta !== "inicio" || !v || v.querySelector(".movil-estado")) return;
      const horas = paq && paq.generado ? Math.round((Date.now() - new Date(paq.generado + ":00").getTime()) / 36e5) : null, viejo = horas != null && horas >= 12;
      const d = document.createElement("div");
      d.className = "movil-estado" + (n ? " pend" : viejo ? " viejo" : "");
      d.innerHTML = `<div>${n ? `<b>${n} captura(s) por enviar a la PC.</b> ` : "<b>Todo enviado.</b> "}Datos del ${paq ? U.fh(paq.generado) : "—"}${viejo ? ` · <b style="color:#8a5a00">hace ${horas} h: pide un paquete nuevo</b>` : ""}</div>
        <a class="btn ${n ? "verde" : "sec"} chico" href="#/celular">${B.ico("subir")} ${n ? "Enviar" : "Enviar / recibir"}</a>`;
      v.insertBefore(d, v.firstChild);
    } catch (e) { }
  },

  menuUsuario() {
    let m = document.querySelector(".menu-usuario");
    if (m) { m.remove(); return; }
    const u = B.usuario, sup = B.dom.esSup();
    m = document.createElement("div");
    m.className = "menu-usuario";
    m.innerHTML = `<div class="cab"><b>${U.esc(u.nombre)}</b><span class="muted peque">RPE ${U.esc(u.rpe)} · ${U.esc(u.ini)} · ${sup ? "Supervisor" : "Técnico"}</span></div>
      <button data-a="clave">${B.ico("llave")} Cambiar contraseña</button>
      <button data-a="tour">${B.ico("ayuda")} Recorrido para técnicos</button>
      ${sup ? `<button data-a="tourSup">${B.ico("ayuda")} Recorrido para supervisores</button>` : ""}
      <button data-a="guia">${B.ico("doc")} Guía rápida (PDF)</button>
      <button data-a="salir">${B.ico("salir")} Cerrar sesión</button>`;
    document.body.appendChild(m);
    const rb = document.getElementById("bAvatar").getBoundingClientRect();
    m.style.top = Math.round(rb.bottom + 8) + "px"; m.style.right = Math.max(8, Math.round(window.innerWidth - rb.right)) + "px";
    const cerrar = () => { m.remove(); document.removeEventListener("click", cerrar); };
    setTimeout(() => document.addEventListener("click", cerrar), 0);
    m.querySelectorAll("button").forEach(b => b.onclick = () => {
      cerrar();
      if (b.dataset.a === "salir") this.salir();
      if (b.dataset.a === "clave") this.cambiarClave();
      if (b.dataset.a === "tour") B.tour.iniciar("tecnico");
      if (b.dataset.a === "tourSup") B.tour.iniciar("supervisor");
      if (b.dataset.a === "guia") window.open(new URL("ayuda/Guia_Rapida_Tecnicos.pdf", location.href).href, "_blank");
    });
  },

  async cambiarClave() {
    const r = await B.ui.modal({
      titulo: "Cambiar contraseña", icono: "llave",
      html: `<div class="campo"><label>Contraseña actual</label><input class="inp" type="password" id="cA"></div>
             <div class="campo"><label>Nueva contraseña</label><input class="inp" type="password" id="cN"><span class="ayuda">Mínimo 5 caracteres. Distingue mayúsculas y minúsculas.</span></div>
             <div class="campo"><label>Confirmar nueva contraseña</label><input class="inp" type="password" id="cC"></div>`,
      botones: [{ t: "Cancelar", c: "sec", v: null }, {
        t: "Guardar", antes: async v => {
          const a = v.querySelector("#cA").value, n = v.querySelector("#cN").value, c = v.querySelector("#cC").value;
          if (n !== c) { B.ui.toast("La confirmación no coincide.", "error"); return false; }
          try { await B.api.llamar("clave", { actual: a, nueva: n }); } catch (e) { B.ui.error(e); return false; }
        }, v: true
      }]
    });
    if (r) { B.usuario.cambiada = true; B.ui.toast("Contraseña actualizada.", "ok"); }
  },

  vigilarInactividad() {
    clearInterval(this._timer);
    this._ultimo = Date.now();
    const marcar = () => this._ultimo = Date.now();
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(ev => document.addEventListener(ev, marcar, { passive: true }));
    this._timer = setInterval(() => {
      const min = +(B.estado?.config?.inactividadMin) || 20;
      if (B.token && !B.modoMovil && Date.now() - this._ultimo > min * 60000) this.salir("La sesión se cerró por inactividad (" + min + " min).");
    }, 30000);
  }
};

window.addEventListener("DOMContentLoaded", () => { B.ui.iniciarHoras(); B.app.iniciar(); });
