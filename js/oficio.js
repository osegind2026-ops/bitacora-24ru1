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
