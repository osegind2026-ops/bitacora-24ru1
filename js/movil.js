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
      "ec.monEditar": () => "Corrección de monitoreo de EC #" + d.num, "ec.cerrar": () => "Cierre de espacio(s) confinado(s) " + (d.nums || []).join(", "), "ec.reabrir": () => "Reabrir EC #" + d.num, "vig.crear": () => "Vigilancia: " + (d.desc || ""), "vig.retirar": () => "Retiro de vigilancia",
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
  titulo: "Celulares",
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
      </div>`;
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
