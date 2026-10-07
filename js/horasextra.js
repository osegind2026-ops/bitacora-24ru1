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
