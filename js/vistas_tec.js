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
    const acum = B.estado.ec.filter(e => !e.pre && B.t.clave(e.fecha, e.turno) <= K).length;
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
    const fila = () => {
      const tr = document.createElement("div");
      tr.className = "ec-fila";
      tr.innerHTML = `<div class="campo"><label>Espacio confinado</label><input class="inp" data-k="esp" placeholder="Busca o escribe el espacio"></div>
        <div class="campo"><label>Hora en que se liberó</label><input class="inp tnum h24" type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM (24 h)" autocomplete="off" data-k="hora"></div>
        <div class="campo"><label>Personal TSI</label><input class="inp" data-k="pers" value="${U.esc(capt())}" style="text-transform:uppercase" placeholder="JESC/MAOH"></div>
        <button class="btn fantasma btn-icono quitar" title="Quitar">${B.ico("basura")}</button>
        <div class="ec-req"></div>
        <div class="lecturas">${[["o2", "O2 (%)"], ["hr", "HR (%)"], ["temp", "Temp (°C)"], ["lel", "LEL (%)"], ["co", "CO (ppm)"], ["h2s", "H2S (ppm)"]]
          .map(([k, e]) => `<div class="campo"><label>${e}</label><input class="inp tnum" data-k="${k}" inputmode="decimal"></div>`).join("")}</div>
        <div class="campo obs"><label>Observaciones</label><input class="inp" data-k="obs" placeholder="Ej. Regla 2 hombres más un observador, hidratación previa, chequeo médico previo"></div>
        <details class="obs tarjeta-aviso"><summary>Datos de la tarjeta de AVISO (opcional): edificio, elevación, equipo, iluminación, ruido, equipo de protección y tiempos de estancia</summary>
          <div class="grid4">${[["edif", "Edificio", "TGB"], ["elev", "Elevación", "1.90"], ["equipo", "Equipo", "Caja de agua sur entrada"], ["cuarto", "Cuarto", ""], ["ilum", "Iluminación", "Parcial"], ["ruido", "Ruido (dB)", ""], ["otros", "Otros", ""]]
            .map(([k, e, ph]) => `<div class="campo"><label>${e}</label><input class="inp" data-k="${k}" placeholder="${ph}"></div>`).join("")}</div>
          <div class="campo"><label>Equipo de protección requerido</label><div class="chips-ali">${V.espacios.EPP.map(x => `<label class="chip-ali"><input type="checkbox" data-epp="${x}"><span>${x}</span></label>`).join("")}</div></div>
          <div class="campo" style="margin-bottom:0"><label>Tiempo de estancia</label><div class="grid4">${[["tLig", "Trabajo ligero", "2 h 30 min"], ["tMod", "Trabajo moderado", "50 min"], ["tPes", "Trabajo pesado", "35 min"], ["tDesc", "Descanso", "30 min"]]
            .map(([k, e, ph]) => `<div class="campo"><label>${e}</label><input class="inp" data-k="${k}" placeholder="${ph}"></div>`).join("")}</div></div>
        </details>`;
      tb.appendChild(tr);
      // se sugiere la lista oficial de espacios confinados (Anexo SI-9974-2) y el catalogo propio; tambien se puede escribir otro
      const req = tr.querySelector(".ec-req"), iEsp = tr.querySelector('[data-k="esp"]');
      const alEsp = () => {
        const o = B.ecLista.buscar(iEsp.value);
        tr.querySelectorAll(".lecturas label").forEach(l => l.style.fontWeight = "");
        if (!o) { req.innerHTML = ""; return; }
        const pozo = B.ecLista.esPozo(iEsp.value);
        req.innerHTML = `<b>${U.esc(o.edif)}</b> · nivel ${U.esc(o.nivel)} · muestreo requerido: <b>${U.esc(o.reqTxt)}</b>` +
          (pozo ? `<br>Pozo seco: si la liberación fue en otra elevación, agrégala al nombre (ej. <b>${U.esc(o.esp)} ELEV. 10.15</b>) y anótala en la tarjeta de aviso; así cada elevación queda como un registro distinto.` : "");
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
    };
    fila();
    c.querySelector("#ecMas").onclick = fila;
    c.querySelector("#ecGuardar").onclick = async () => {
      const items = [], faltan = [], fuera = [];
      [...tb.querySelectorAll(".ec-fila")].forEach((tr, i) => {
        const g = k => tr.querySelector(`[data-k="${k}"]`).value.trim();
        if (!g("esp")) return;
        if (!g("hora")) faltan.push("Renglón " + (i + 1) + ": falta la hora de liberación");
        const it = { esp: g("esp"), o2: g("o2"), hr: g("hr"), temp: g("temp"), lel: g("lel"), co: g("co"), h2s: g("h2s"), pers: g("pers").toUpperCase(), obs: g("obs") };
        if (g("hora")) it.lib = B.t.fechaHora(f, t, g("hora"));
        for (const k of ["edif", "elev", "equipo", "cuarto", "ilum", "ruido", "otros", "tLig", "tMod", "tPes", "tDesc"]) if (g(k)) it[k] = g(k);
        const epp = [...tr.querySelectorAll("[data-epp]:checked")].map(x => x.dataset.epp); if (epp.length) it.epp = epp.join(", ");
        for (const k of ["o2", "lel", "co", "h2s"]) if (B.dom.rango(k, it[k])) fuera.push(it.esp + ": " + k.toUpperCase() + " = " + it[k]);
        items.push(it);
      });
      if (!items.length) { ui.toast("Captura al menos un espacio confinado.", "error"); return; }
      if (faltan.length) { ui.toast(faltan.join("<br>"), "error"); return; }
      if (fuera.length && !(await ui.confirmar("Valores fuera del rango de referencia:<br><b>" + fuera.map(U.esc).join("<br>") + "</b><br><br>¿Registrar de todos modos?", "Atención", "Registrar", true))) return;
      const ya = items.map(it => B.estado.ec.find(e => e.fecha === f && U.norm(e.esp) === U.norm(it.esp))).filter(Boolean);
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
        r => "Registrado en el concentrado general: " + r.nums.map(n => "EC #" + n).join(", ") + (capt() !== yo() ? " · asignado a " + capt() : ""));
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
            ${B.dom.comentarios(a).length ? `<button class="btn chico fantasma" data-coms="${a.id}" title="Editar o eliminar comentarios">${B.ico("editar")} Comentarios (${B.dom.comentarios(a).length})</button>` : ""}</div>
        </div>`).join("") : ui.vacio("No hay pendientes abiertos. ¡Bien!", "ok")}</div></div>`;
    if (sup) ui.combo(c.querySelector("#pFiltro"), { items: () => ui.personas(null, true), estricto: false, alElegir: v => { V.pendientes.filtro = v && B.dom.persona(v) ? v : ""; B.app.render(); } });
    c.querySelectorAll("button[data-coms]").forEach(b => b.onclick = () => V.actividades.comentarios(+b.dataset.coms));
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
      ${r.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Fecha</th><th>Turno</th><th>Tipo</th><th>Descripción</th><th>Estatus</th><th>Ref.</th></tr></thead><tbody>
        ${r.map(x => `<tr><td class="tnum">${U.corta(x.f)}</td><td>${x.t}</td><td>${U.esc(x.tipo)}</td><td style="white-space:pre-line">${U.esc(x.desc)}</td><td>${ui.estatusBadge(x.est)}</td><td class="muted">${U.esc(x.ref)}</td></tr>`).join("")}</tbody></table></div>`
        : ui.vacio("Sin registros en el periodo.", "historial")}</div>`;
    if (sup) ui.combo(c.querySelector("#hPer"), { items: () => ui.personas(null, true), alElegir: v => { if (v) { V.historial.persona = v; B.app.render(); } } });
    c.querySelector("#hD1").onchange = e => { this.d1 = e.target.value; B.app.render(); };
    c.querySelector("#hD2").onchange = e => { this.d2 = e.target.value; B.app.render(); };
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
