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
    const REC = ["agenda", "sup", "vac", "sitio", "incap", "comis", "espec", "sinmov"];
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
  titulo: "Hoja de asignación de actividades",
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
    c.querySelectorAll("[data-h]").forEach(i => i.addEventListener("input", () => { poner(i.dataset.h, i.value); cambio(); }));
    c.querySelectorAll("[data-add]").forEach(b => b.onclick = () => { (h[b.dataset.add] = h[b.dataset.add] || []).push(b.dataset.obj ? { c: "", i: "", v: "" } : ""); B.app.render(); });
    c.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { const [r, i] = b.dataset.del.split("."); h[r].splice(+i, 1); B.app.render(); });
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
      if (n) B.app.render(); ui.toast(n ? n + " vigilancia(s) agregadas a INOP's de Unidad 1; muévelas o completa el vencimiento si hace falta." : "No hay vigilancias activas nuevas por agregar.", n ? "ok" : "");
    };
    const limpia = () => { const x = JSON.parse(JSON.stringify(h)); delete x._arrastrada; delete x._mismo; return x; };
    c.querySelectorAll("[data-edlibre]").forEach(b => b.onclick = () => V.actividades.editarLibre(+b.dataset.edlibre));
    const bPers = c.querySelector("#hjPers"); if (bPers) bPers.onclick = () => { const n = H.nueva(f, t); h.sitio = n.sitio; h.espec = n.espec; h.sup = n.sup; B.app.render(); };
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
