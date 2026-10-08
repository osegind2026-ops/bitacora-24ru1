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
  ecNum(e) { return (e.pre ? e.pre + " " : "") + e.num; },
  ecDelTurno(f, t) { return B.estado.ec.filter(e => e.fecha === f && e.turno === t).sort((a, b) => a.num - b.num); },
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
  ecAbiertos() { return B.estado.ec.filter(e => !e.cierre).sort((a, b) => a.num - b.num); },
  // espacios que siguen liberados al cierre del turno (f, t), liberados en ese turno o antes, con su ultimo monitoreo hasta entonces
  ecSeguimiento(f, t, soloAnteriores) {
    const K = B.t.clave(f, t), fin = B.t.fin(f, t);
    return B.estado.ec.filter(e => e.fecha && (soloAnteriores ? B.t.clave(e.fecha, e.turno) < K : B.t.clave(e.fecha, e.turno) <= K) && this.ecAbiertoEn(e, fin))
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
    const acum = B.estado.ec.filter(e => !e.pre && e.fecha && B.t.clave(e.fecha, e.turno) <= K).length;
    // Todos los espacios que SIGUEN LIBERADOS al cierre del turno, con su ultimo monitoreo: van en una SEGUNDA HOJA del reporte.
    // La primera hoja conserva el modelo de siempre: liberados en el turno + ultimos liberados.
    const ecMon = this.ecFilasMon(f, t, false);
    const ultEc = ec.length >= 5 ? [] : B.estado.ec.filter(e => e.fecha && B.t.clave(e.fecha, e.turno) < K)
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
      r.push({ f: e.fecha, t: e.turno, tipo: "Espacio confinado", desc: e.esp + "  |  O2 " + e.o2 + "%  LEL " + e.lel + "%  CO " + e.co + "  H2S " + e.h2s + (e.lib ? "  |  Liberado " + U.fh(e.lib) : ""), est: "Liberado", ref: "EC " + this.ecNum(e), k: "ec:" + e.num });
    for (const v of B.estado.vig) {
      if (U.ini(v.capAlta) === ini && dentro(v.fecha)) r.push({ f: v.fecha, t: v.turno, tipo: "Vigilancia (alta)", desc: v.desc + "  |  " + v.ubic + "  |  INOP " + v.inop, est: v.est, ref: "VIG " + v.num, k: "vig:" + v.num });
      if (U.ini(v.capRet) === ini && v.retiro) { const s = B.t.de(v.retiro); if (dentro(s.f)) r.push({ f: s.f, t: s.t, tipo: "Vigilancia (retiro)", desc: v.desc + "  |  Retirada " + U.fh(v.retiro), est: "RETIRADA", ref: "VIG " + v.num }); }
    }
    for (const h of B.estado.he) if (U.ini(h.ini) === ini && dentro(h.fecha) && String(h.he) !== "")
      r.push({ f: h.fecha, t: h.turno, tipo: "Horas extra", desc: h.he + " h" + (h.de ? " (" + h.de + " a " + h.a + ")" : "") + (h.mot ? "  |  " + h.mot : ""), est: U.norm(h.verif) === "SI" ? "Verificada" : "Por verificar", ref: "", k: "he:" + h.fecha + ":" + h.turno + ":" + this.tramo(h) });
    return r.sort((a, b) => B.t.clave(a.f, a.t) - B.t.clave(b.f, b.t));
  }
};
