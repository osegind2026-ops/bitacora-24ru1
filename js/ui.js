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
