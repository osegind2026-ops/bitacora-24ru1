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
    const cerrados = B.estado.ec.filter(e => e.cierre).sort((a, b) => String(b.cierre).localeCompare(String(a.cierre))).slice(0, 12);
    c.innerHTML = `
      <div class="tarjeta" data-tour="mon-resumen">${cab("reloj", faltan.length ? "r" : "v", `Espacios que siguen liberados (${seg.length})`,
        seg.length ? (faltan.length ? `<b style="color:var(--rojo)">${faltan.length} sin monitoreo</b> en ${B.t.corto(f, t)} · ${seg.length - faltan.length} ya monitoreados en el turno.` : `Todos tienen monitoreo en ${B.t.corto(f, t)}.`)
          : "No hay espacios confinados abiertos a esta fecha.",
        `${seg.length ? `<button class="btn sec" id="mnBitTodas" title="Hojas en blanco para anotar a mano en campo">${B.ico("imprimir")} Bitácoras para llenar (${seg.length})</button>` : ""}
         ${sup && seg.length ? `<button class="btn sec" id="mnCerrarVarios">${B.ico("ok")} Cerrar varios…</button>` : ""}`)}
        <div class="aviso a">${B.ico("info")}<div>En campo anota cada monitoreo <b>a mano</b> en la bitácora impresa del espacio. Al terminar el turno transcríbelos con <b>Capturar monitoreos</b>, cada uno con su fecha y hora real.
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
              <button class="btn chico sec" data-a="bit">${B.ico("imprimir")} Bitácora</button>
              ${sup ? `<button class="btn chico fantasma" data-a="cer">${B.ico("ok")} Cerrar espacio</button>` : ""}
            </div>
          </div>`).join("") : ui.vacio("Sin espacios confinados abiertos.", "escudo")}</div>
      </div>
      ${cerrados.length ? `<div class="tarjeta">${cab("ok", "g", "Espacios cerrados recientemente", "Ya no requieren monitoreo. Su historial se conserva.")}
        <div class="lista">${cerrados.map(e => `<div class="item" data-num="${e.num}" style="flex-wrap:wrap"><div class="cuerpo" style="min-width:220px"><div class="tit" style="font-weight:600">EC #${U.esc(D.ecNum(e))} · ${U.esc(e.esp)}</div>
          <div class="meta"><span>liberado ${e.lib ? U.fh(e.lib) : U.corta(e.fecha)}</span><span>cerrado ${U.fh(e.cierre)} por ${U.esc(e.cerro || "")}</span><span>${(e.mon || []).length} monitoreo(s)</span></div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn chico sec" data-a="his">${B.ico("historial")} Historial</button><button class="btn chico sec" data-a="bitc">${B.ico("imprimir")} Bitácora</button>
          ${sup ? `<button class="btn chico fantasma" data-a="rea">Reabrir</button>` : ""}</div></div>`).join("")}</div></div>` : ""}`;
    const ec = n => B.estado.ec.find(x => +x.num === +n);
    c.querySelectorAll(".item[data-num] [data-a]").forEach(b => b.onclick = async () => {
      const e = ec(b.closest("[data-num]").dataset.num); if (!e) return;
      const a = b.dataset.a;
      if (a === "cap") return this.capturar(e);
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
    await ejecutar(() => B.api.op("ec", "monitoreo", { num: e.num, items }),
      r => `${r.n} monitoreo(s) guardados en EC #${U.esc(D.ecNum(e))}.` + (r.repetidos && r.repetidos.length ? `<br>${r.repetidos.length} ya estaban capturados (misma fecha y hora) y no se duplicaron.` : ""));
  },
  /* Historial completo de un espacio: liberación + todos los monitoreos; corrige o elimina quien lo capturó o un supervisor */
  async historial(num) {
    const D = B.dom, sup = D.esSup(), yoI = yo(), buscar = () => B.estado.ec.find(x => +x.num === +num);
    let cambio = false;
    const html = () => {
      const e = buscar(); if (!e) return ui.vacio("El registro ya no existe.");
      const l = D.ecMons(e).slice().reverse();
      return `<p style="margin:0 0 2px"><b>EC #${U.esc(D.ecNum(e))} · ${U.esc(e.esp)}</b></p>
        <p class="muted peque" style="margin:0 0 10px">${e.cierre ? "Cerrado " + U.fh(e.cierre) + " por " + U.esc(e.cerro || "") : "Sigue liberado"} · ${l.length} registro(s), del más reciente al más antiguo</p>
        <div class="lista">${l.map(m => { const puede = !m.lib && (sup || U.ini(m.capt) === yoI || D.tokensIni(m.pers).includes(yoI));
          return `<div class="item" style="flex-wrap:wrap;align-items:flex-start" data-id="${m.id}" data-fh="${U.esc(m.fh)}"><div class="cuerpo" style="min-width:220px;flex:1">
            <div class="tit" style="font-weight:600">${U.fh(m.fh)} · ${U.esc(m.pers)} ${m.elev ? `<span class="badge n">Elev. ${U.esc(m.elev)}</span>` : ""} ${m.lib ? '<span class="badge d">Liberación</span>' : ""}</div>
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
