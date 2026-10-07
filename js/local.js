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

  /* ---------------------------------------------------------- API equivalente al servidor */
  async llamar(ruta, b) {
    b = b || {};
    if (ruta === "info") return { ok: true, proyecto: "24RU1", version: "1.8.2", enRed: false, urls: [], demo: this.sub === "datos_demo", local: true };
    if (ruta === "login") return this.login(b);
    if (ruta === "imagenes") { const im = (await this.leer("imagenes")) || {}; return { ok: true, membrete: im.membrete || "", pie: im.pie || "", ofIzq: im.ofIzq || "", ofDer: im.ofDer || "", ofPie: im.ofPie || "", ver: im.ver || "" }; }
    if (!this.sesion) this.sesion = JSON.parse(sessionStorage.getItem("b_local_sesion") || "null");
    const s = this.sesion;
    if (!s) { B.app && B.app.sesionExpirada(); throw new Error("La sesión expiró. Vuelve a iniciar sesión."); }
    const sup = s.rol === "supervisor";
    switch (ruta) {
      case "logout": this.sesion = null; sessionStorage.removeItem("b_local_sesion"); return { ok: true };
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
      sessionStorage.setItem("b_local_sesion", JSON.stringify(this.sesion));
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
      case "actividades.estatus": {
        if (!sup) throw new Error("Solo supervisores pueden cambiar el estatus de una actividad guardada.");
        const L = await this.leer("actividades") || [], a = L.find(x => +x.id === +d.id);
        if (!a) throw new Error("Actividad no encontrada.");
        const est = d.est, txt = String(d.txt || "").trim();
        if (!["Realizada", "En proceso", "Pendiente", "Concluida"].includes(est)) throw new Error("Estatus no válido.");
        if (!a.ini && est !== "Pendiente") throw new Error("Una actividad por asignar solo puede estar Pendiente: asígnala primero.");
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
      case "ec.crear": {
        const capt = sup && d.capt ? U.ini(d.capt) : s.ini, L = await this.leer("ec") || [], cat = await this.leer("catalogos") || {}, nums = [];
        if (capt !== s.ini && !(await this.leer("personal") || []).some(p => U.ini(p.ini) === capt)) throw new Error("Iniciales no encontradas en el personal: " + capt);
        const vistosEc = [];
        for (const it of d.items || []) {
          if (!it.esp) continue;
          const ke = U.norm(it.esp), ya = L.find(x => x.fecha === d.fecha && U.norm(x.esp) === ke);
          if (ya) throw new Error(`El espacio "${it.esp}" ya está registrado ese día (EC #${ya.num}, capturado por ${ya.capt}). No se guardó nada para evitar duplicados.`);
          if (vistosEc.includes(ke)) throw new Error(`El espacio "${it.esp}" está repetido en la captura.`);
          vistosEc.push(ke);
        }
        let catCambio = false;
        for (const it of d.items || []) {
          if (!it.esp) continue;
          const e = { num: Math.max(sig(L, "num"), +((await this.leer("config")) || {}).ecInicio || 0) };
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
