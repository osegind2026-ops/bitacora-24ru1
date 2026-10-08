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
