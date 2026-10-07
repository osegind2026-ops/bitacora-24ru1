/* =========================================================================
   BITACORA 24RU1 - Aplicacion: login, navegacion, turno de trabajo
   ========================================================================= */
"use strict";
B.vistas = B.vistas || {};

B.app = {
  trabajo: null,
  ruta: "inicio",
  info: {}, VERSION: "1.8", servidorViejo: false,

  async iniciar() {
    if (B.modoLocal) return this.iniciarLocal();
    try { this.info = await (await fetch("api/info")).json(); } catch (e) { this.info = {}; }
    await B.cargarImagenes();
    // Tras una actualizacion, el servidor de esta PC debe reiniciarse para tomar la version nueva
    this.servidorViejo = !!this.info.version && this.info.version !== this.VERSION;
    const tok = sessionStorage.getItem("b_token");
    if (tok && !this.servidorViejo) {
      B.token = tok;
      try { await B.api.recargar(); this.entrar(); return; } catch (e) { B.token = null; sessionStorage.removeItem("b_token"); }
    }
    this.pantallaLogin();
  },

  /* ---------------------------------------------------------------- plan B: sin servidor */
  async iniciarLocal() {
    document.querySelector(".cargando")?.remove();
    if (B.modoMovil) return this.iniciarMovil();
    const fav = document.getElementById("favicon"); if (fav) fav.href = "img/bitacora_planb.ico";
    if (!B.local.soportado()) {
      document.getElementById("raiz").innerHTML = `<div class="login"><div class="login-membrete"><img src="img/membrete.png" alt=""></div>
        <div class="login-caja"><h1>Abre con Microsoft Edge</h1><p>Este modo sin servidor necesita <b>Microsoft Edge</b> o <b>Google Chrome</b>.
        Cierra esta ventana y en el archivo usa: clic derecho → <b>Abrir con</b> → <b>Microsoft Edge</b>.</p></div></div>`;
      return;
    }
    const h = await B.local.carpetaGuardada();
    if (h) {
      try { if (await B.local.permiso(h, false)) { await B.local.conectar(h, sessionStorage.getItem("b_local_demo") === "1"); return this.despuesConectar(); } } catch (e) { }
    }
    this.pantallaConectar(h);
  },
  /* ---------------------------------------------------------------- version para celular */
  async iniciarMovil() {
    try { if (await B.inter.conectarMovil()) return this.despuesConectar(); }
    catch (e) { return this.pantallaMovilInicio(e.message); }
    this.pantallaMovilInicio();
  },
  // Primera vez en el celular: hay que cargar el paquete de datos que genera la PC
  pantallaMovilInicio(msg) {
    document.getElementById("raiz").innerHTML = `
      <div class="login">
        <div class="login-membrete"><img src="img/membrete.png" alt=""></div>
        <div class="login-caja">
          <h1>Bitácora de Seguridad Industrial <span class="chip-demo" style="background:var(--azul)">CELULAR</span></h1>
          <p>Para empezar, carga el <b>paquete de datos</b> que el supervisor manda al grupo de WhatsApp (archivo «Bitacora24RU1 PAQUETE celulares …»).</p>
          <ol style="margin:0 0 14px;padding-left:20px;font-size:13px;line-height:1.6"><li>En WhatsApp, toca el archivo para descargarlo.</li><li>Vuelve aquí y presiona el botón.</li><li>Búscalo en <b>Descargas</b> o en <b>WhatsApp → Documentos</b>.</li></ol>
          ${msg ? `<div class="aviso r">${B.ico("alerta")}<div>${U.esc(msg)}</div></div>` : ""}
          <label class="btn bloque" style="cursor:pointer">${B.ico("descargar")} Cargar paquete de datos…<input type="file" id="mIni" accept=".json,.txt,application/json,text/plain" hidden></label>
        </div>
        <div class="login-pie">Los datos se guardan solo en este celular. Tus capturas se mandan a la PC desde el menú <b>Celulares</b>.</div>
      </div>`;
    document.getElementById("mIni").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { await B.inter.cargarPaquete(await V.celular.leerArchivo(f)); await B.inter.conectarMovil(); this.despuesConectar(); }
      catch (err) { this.pantallaMovilInicio(err.message); }
    };
  },
  pantallaConectar(h, msg) {
    document.getElementById("raiz").innerHTML = `
      <div class="login">
        <div class="login-membrete"><img src="img/membrete.png" alt="Gobierno de México · CFE · 24RU1"></div>
        <div class="login-caja">
          <h1>Bitácora de Seguridad Industrial <span class="chip-demo" style="background:var(--azul)">SIN SERVIDOR</span></h1>
          <p>Los datos se guardan en la carpeta <b>Bitacora24RU1</b> de esta PC. Al abrir, el navegador te pedirá permiso para
          <b>ver y editar</b> esa carpeta: elige <b>Permitir</b>${h ? "" : " (la primera vez selecciona la carpeta Bitacora24RU1)"}.</p>
          ${msg ? `<div class="aviso r">${B.ico("alerta")}<div>${U.esc(msg)}</div></div>` : ""}
          <label class="campo" style="flex-direction:row;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" id="cDemo" ${sessionStorage.getItem("b_local_demo") === "1" ? "checked" : ""}>
            <span style="font-size:13px">Practicar con los datos <b>DEMO</b></span></label>
          <button class="btn bloque" id="cAbrir">${B.ico("doc")} ${h ? "Abrir bitácora (" + U.esc(h.name) + ")" : "Seleccionar la carpeta Bitacora24RU1"}</button>
          ${h ? `<button class="btn fantasma bloque" id="cOtra" style="margin-top:8px">Elegir otra carpeta…</button>` : ""}
        </div>
        <div class="login-pie">Modo de respaldo (plan B): funciona sin permisos de administrador y sin servidor. Para PDF usa Imprimir → Guardar como PDF.</div>
      </div>`;
    const abrir = async otra => {
      try {
        let c = h;
        if (!c || otra) c = await B.local.elegirCarpeta();
        else if (!(await B.local.permiso(c, true))) throw new Error("Debes permitir el acceso a la carpeta para continuar.");
        await B.local.conectar(c, document.getElementById("cDemo").checked);
        this.despuesConectar();
      } catch (e) { if (e.name !== "AbortError") this.pantallaConectar(h, e.message); }
    };
    document.getElementById("cAbrir").onclick = () => abrir(false);
    const o = document.getElementById("cOtra"); if (o) o.onclick = () => abrir(true);
  },
  async despuesConectar() {
    this.info = await B.local.llamar("info");
    await B.cargarImagenes();
    const ses = JSON.parse(sessionStorage.getItem("b_local_sesion") || "null");
    if (ses) { B.token = "local"; B.local.sesion = ses; try { await B.api.recargar(); this.entrar(); return; } catch (e) { } }
    this.pantallaLogin();
  },

  /* ---------------------------------------------------------------- login */
  pantallaLogin(msg) {
    document.querySelector(".cargando")?.remove();
    const demo = this.info.demo ? `<span class="chip-demo">DEMO</span>` : "";
    document.getElementById("raiz").innerHTML = `
      <div class="login">
        <div class="login-membrete"><img src="${B.imgUrl("membrete")}" alt="Membrete"></div>
        <form class="login-caja" id="fLogin" autocomplete="off">
          <h1>Bitácora de Seguridad Industrial ${demo}</h1>
          <p>Ingresa con tu <b>RPE</b>. La contraseña inicial es tu <b>RPE + tus iniciales</b>, todo junto y sin espacios.</p>
          <div class="login-ejemplo"><span>Ejemplo</span>RPE <b>9XY99</b> + iniciales <b>ABC</b><br>Contraseña inicial: <b>9XY99ABC</b></div>
          ${msg ? `<div class="aviso d">${B.ico("info")}<div>${U.esc(msg)}</div></div>` : ""}
          ${this.servidorViejo ? `<div class="aviso r">${B.ico("alerta")}<div><b>La bitácora se actualizó a la versión ${this.VERSION}</b>, pero el servidor de esta PC sigue con la versión ${U.esc(this.info.version)}.
            Ejecuta <b>DETENER SERVIDOR.bat</b> y vuelve a abrir el ícono <b>Bitacora 24RU1</b> (o reinicia la PC). Mientras tanto no se puede entrar, para proteger los registros.</div></div>` : ""}
          <div class="campo"><label for="lRpe">RPE</label><input class="inp" id="lRpe" name="b24-acceso-${Date.now()}" required style="text-transform:uppercase" value="" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
          <div class="campo"><label for="lClave">Contraseña</label><input class="inp" id="lClave" name="b24-clave-${Date.now()}" type="password" required autocomplete="new-password"></div>
          <button class="btn bloque" type="submit">${B.ico("llave")} Entrar</button>
          <div class="aviso r oculto" id="lErr" style="margin:14px 0 0"></div>
          ${B.modoLocal ? `<p class="peque" style="margin:14px 0 0;text-align:center">Modo sin servidor · carpeta <b>${U.esc(B.local.raiz ? B.local.raiz.name + " / " + B.local.sub : "")}</b> ·
            <a href="#" id="lCarpeta">cambiar</a></p>` : ""}
        </form>
        <div class="login-pie">Coordinación Nuclear · Gerencia Nucleoeléctrica Laguna Verde · Subgerencia de Seguridad Nuclear · Oficina de Seguridad Industrial</div>
      </div>`;
    const f = document.getElementById("fLogin");
    const lc = document.getElementById("lCarpeta");
    if (lc) lc.onclick = async e => { e.preventDefault(); this.pantallaConectar(await B.local.carpetaGuardada()); };
    try { localStorage.removeItem("b_rpe"); } catch (e) { }      // por privacidad no se recuerda el RPE del ultimo que la uso
    document.getElementById("lRpe").focus();
    if (this.servidorViejo) f.querySelector('button[type="submit"]').disabled = true;
    f.onsubmit = async e => {
      if (this.servidorViejo) { e.preventDefault(); return; }
      e.preventDefault();
      const err = document.getElementById("lErr"), btn = f.querySelector("button");
      err.classList.add("oculto"); btn.disabled = true;
      try {
        const rpe = document.getElementById("lRpe").value.trim().toUpperCase();
        const r = await B.api.llamar("login", { rpe, clave: document.getElementById("lClave").value });
        B.token = r.token; sessionStorage.setItem("b_token", r.token);
        await B.api.recargar();
        this.entrar(true);
      } catch (ex) { err.innerHTML = B.ico("alerta") + "<div>" + U.esc(ex.message) + "</div>"; err.classList.remove("oculto"); btn.disabled = false; }
    };
  },

  async salir(msg) {
    try { if (B.token) await B.api.llamar("logout", {}); } catch (e) { }
    B.token = null; B.estado = null; B.usuario = null;
    sessionStorage.removeItem("b_token");
    B.tour && B.tour.cerrar();
    this.pantallaLogin(msg);
  },
  sesionExpirada() { if (B.token) { B.token = null; sessionStorage.removeItem("b_token"); this.pantallaLogin("Tu sesión terminó. Vuelve a ingresar."); } },

  /* ---------------------------------------------------------------- shell */
  entrar(recienLogin) {
    document.querySelector(".cargando")?.remove();
    if (B.vistas.actividades) B.vistas.actividades.ini = null;
    if (B.vistas.historial) B.vistas.historial.persona = null;
    if (B.vistas.pendientes) B.vistas.pendientes.filtro = "";
    if (B.vistas.horasextra) { B.vistas.horasextra.f = null; B.vistas.horasextra.ini = null; }
    if (B.vistas.oficio) { B.vistas.oficio.ini = null; B.vistas.oficio.lunes = null; B.vistas.oficio.aj = {}; }
    const guardado = JSON.parse(sessionStorage.getItem("b_trabajo") || "null");
    this.trabajo = guardado || B.t.actual();
    const sup = B.dom.esSup(), u = B.usuario;
    const enlaces = [
      ["MI TURNO", [["inicio", "Inicio", "inicio"], ["actividades", "Mis actividades", "lista"], ["horasextra", sup ? "Horas extra (captura)" : "Mis horas extra", "calendario"], ["espacios", "Espacios confinados", "escudo"],
        ["vigilancias", "Vigilancias C.I.", "fuego"], ["pendientes", sup ? "Pendientes (todos)" : "Mis pendientes", "reloj"], ["historial", sup ? "Historial por persona" : "Mi historial", "historial"], ["oficio", sup ? "Oficios de tiempo extra" : "Mi oficio de tiempo extra", "doc"]]],
      ["CONSULTA", [["concentrados", "Concentrados", "doc"]].concat(sup ? [["registros", "Registros del personal", "usuarios"]] : [["hoja", "Hoja de asignación", "pdf"]])
        .concat([["celular", B.modoMovil ? "Enviar / recibir" : "Celulares", "subir"]])]
    ];
    if (sup) {
      enlaces.push(["SUPERVISIÓN", [["turno", "Datos del turno", "usuarios"], ["reporte", "Reporte del turno", "pdf"], ["hoja", "Hoja de asignación", "doc"], ["asistencia", "Asistencia y horas extra", "calendario"]]]);
      if (!B.modoMovil) enlaces.push(["ADMINISTRACIÓN", [["personal", "Personal y turnos", "usuario"], ["catalogos", "Catálogos", "lista"], ["usuarios", "Usuarios", "llave"], ["config", "Configuración y respaldos", "engrane"]]]);
    }
    document.getElementById("raiz").innerHTML = `
      <div class="app">
        <aside class="lateral" data-tour="menu">
          <div class="marca"><div class="marca-logo">24RU1</div><div><b>Bitácora S.I.</b><span>${U.esc(B.t.periodo())}${B.estado.servidor.demo ? " · DEMO" : ""}</span></div></div>
          <nav class="nav">${enlaces.map(([g, ls]) => `<div class="nav-grupo">${g}</div>` + ls.map(([r, t, i]) =>
            `<a href="#/${r}" data-r="${r}" data-tour="nav-${r}">${B.ico(i)}<span>${t}</span>${r === "pendientes" ? '<span class="contador oculto" id="cntPend"></span>' : ""}</a>`).join("")).join("")}</nav>
          <div class="lateral-pie">${sup ? "Supervisor" : "Técnico"} · ${U.esc(u.ini)}<br>${B.modoMovil ? "Datos guardados en este celular" : "Datos guardados en la PC servidor"} · v${U.esc((this.info && this.info.version) || "1.8")}</div>
        </aside>
        <div class="principal">
          <header class="barra">
            <button class="btn fantasma btn-icono btn-menu-movil" id="bMenuMovil">${B.ico("menu")}</button>
            <div><h1 id="tituloVista"></h1><div class="sub" id="subVista"></div></div>
            <div class="barra-der">
              <div class="turno-insignia" id="insTurno"></div>
              <div class="turno-sel" data-tour="turno" title="Turno de trabajo (el T1 nocturno se rotula con la fecha de salida)">
                ${B.ico("calendario", 'style="width:17px;height:17px;color:var(--texto-3)"')}
                <input type="date" id="selFecha" value="${this.trabajo.f}">
                ${B.ui.seg("turno", ["T1", "T2"], this.trabajo.t)}
              </div>
              <button class="avatar" id="bAvatar" title="${U.esc(u.nombre)}" data-tour="avatar">${U.esc(u.ini.slice(0, 3))}</button>
            </div>
          </header>
          <main class="contenido" id="vista"></main>
        </div>
      </div>`;
    this.pintarTurno();
    document.getElementById("selFecha").onchange = e => { if (e.target.value) this.cambiarTrabajo(e.target.value, this.trabajo.t); };
    B.ui.activarSeg(document.querySelector(".turno-sel"), (s, v) => this.cambiarTrabajo(this.trabajo.f, v));
    document.getElementById("bAvatar").onclick = e => { e.stopPropagation(); this.menuUsuario(); };
    document.getElementById("bMenuMovil").onclick = () => document.body.classList.toggle("nav-abierto");
    window.onhashchange = () => this.navegar();
    if (B.modoLocal && "BroadcastChannel" in window && !this._canal) {
      this._canal = new BroadcastChannel("bitacora24ru1");
      const formas = ["actividades", "horasextra", "espacios", "vigilancias", "turno", "personal", "catalogos", "config", "oficio", "hoja"];
      const aviso = U.debounce(() => {
        if (!B.token) return;
        if (formas.includes(this.ruta)) B.ui.toast("Se guardaron cambios desde otra ventana. Se verán al cambiar de sección.", "", 4000);
        else this.refrescar().catch(() => { });
      }, 800);
      this._canal.onmessage = e => { if (!e.data || e.data.tab !== B.local.tabId) aviso(); };
    }
    this.vigilarInactividad();
    this.navegar();
    if (recienLogin && !u.cambiada) setTimeout(() => B.ui.toast("Estás usando tu contraseña inicial. Te recomendamos cambiarla en el menú de tu usuario (círculo arriba a la derecha).", "aviso", 8000), 1200);
    const vistos = (u.tours || "").split(",");
    const tourPend = sup ? (!vistos.includes("supervisor") ? "supervisor" : null) : (!vistos.includes("tecnico") ? "tecnico" : null);
    if (tourPend && B.tour) setTimeout(() => B.tour.ofrecer(tourPend), 700);
  },

  cambiarTrabajo(f, t) {
    this.trabajo = { f, t };
    sessionStorage.setItem("b_trabajo", JSON.stringify(this.trabajo));
    const sf = document.getElementById("selFecha"); if (sf && sf.value !== f) sf.value = f;
    document.querySelectorAll('.turno-sel .seg button').forEach(b => b.classList.toggle("on", b.dataset.v === t));
    this.pintarTurno();
    this.render();
  },
  // La barra superior cambia de color segun el turno de trabajo: azul noche con luna (T1) o dorado con sol (T2)
  pintarTurno() {
    const t = this.trabajo.t, noche = t === "T1", ins = document.getElementById("insTurno");
    document.body.classList.toggle("turno-noche", noche); document.body.classList.toggle("turno-dia", !noche);
    if (ins) ins.innerHTML = (noche
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a.7.7 0 0 0-.9-.9A9.6 9.6 0 1 0 21.4 15.5a.7.7 0 0 0-.9-.9z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/></svg>')
      + `<span><b>${t} ${U.esc(B.t.nombre(t))}</b><small>${noche ? "turno de noche" : "turno de día"} · ${U.cortaDM(this.trabajo.f)}</small></span>`;
  },

  navegar() {
    let r = (location.hash || "#/inicio").replace("#/", "").split("?")[0] || "inicio";
    const v = B.vistas[r];
    if (!v || (v.sup && !B.dom.esSup())) r = "inicio";
    this.ruta = r;
    document.body.classList.remove("nav-abierto");
    document.querySelectorAll(".nav a").forEach(a => a.classList.toggle("activo", a.dataset.r === r));
    if (B.modoLocal && B.token) { B.api.recargar().then(() => this.render()).catch(e => B.ui.error(e)); return; }
    this.render();
  },

  render() {
    const v = B.vistas[this.ruta], cont = document.getElementById("vista");
    if (!v || !cont) return;
    document.getElementById("tituloVista").textContent = v.titulo;
    document.getElementById("subVista").textContent = (v.sub ? v.sub() : this.textoTurno());
    cont.innerHTML = "";
    try { v.render(cont); } catch (e) { console.error(e); cont.innerHTML = `<div class="aviso r">${B.ico("alerta")}<div>Error al mostrar la vista: ${U.esc(e.message)}</div></div>`; }
    this.contadores();
    window.scrollTo(0, 0);
  },
  async refrescar() { await B.api.recargar(); this.render(); },
  textoTurno() { const { f, t } = this.trabajo; return `${t} ${B.t.nombre(t)} · ${B.t.horario(t)} · ${U.larga(f)}`; },
  contadores() {
    const n = B.dom.pendientesGrupos(B.dom.esSup() ? null : B.usuario.ini).length, c = document.getElementById("cntPend");
    if (c) { c.textContent = n; c.classList.toggle("oculto", !n); }
  },

  menuUsuario() {
    let m = document.querySelector(".menu-usuario");
    if (m) { m.remove(); return; }
    const u = B.usuario, sup = B.dom.esSup();
    m = document.createElement("div");
    m.className = "menu-usuario";
    m.innerHTML = `<div class="cab"><b>${U.esc(u.nombre)}</b><span class="muted peque">RPE ${U.esc(u.rpe)} · ${U.esc(u.ini)} · ${sup ? "Supervisor" : "Técnico"}</span></div>
      <button data-a="clave">${B.ico("llave")} Cambiar contraseña</button>
      <button data-a="tour">${B.ico("ayuda")} Recorrido para técnicos</button>
      ${sup ? `<button data-a="tourSup">${B.ico("ayuda")} Recorrido para supervisores</button>` : ""}
      <button data-a="guia">${B.ico("doc")} Guía rápida (PDF)</button>
      <button data-a="salir">${B.ico("salir")} Cerrar sesión</button>`;
    document.body.appendChild(m);
    const rb = document.getElementById("bAvatar").getBoundingClientRect();
    m.style.top = Math.round(rb.bottom + 8) + "px"; m.style.right = Math.max(8, Math.round(window.innerWidth - rb.right)) + "px";
    const cerrar = () => { m.remove(); document.removeEventListener("click", cerrar); };
    setTimeout(() => document.addEventListener("click", cerrar), 0);
    m.querySelectorAll("button").forEach(b => b.onclick = () => {
      cerrar();
      if (b.dataset.a === "salir") this.salir();
      if (b.dataset.a === "clave") this.cambiarClave();
      if (b.dataset.a === "tour") B.tour.iniciar("tecnico");
      if (b.dataset.a === "tourSup") B.tour.iniciar("supervisor");
      if (b.dataset.a === "guia") window.open(new URL("ayuda/Guia_Rapida_Tecnicos.pdf", location.href).href, "_blank");
    });
  },

  async cambiarClave() {
    const r = await B.ui.modal({
      titulo: "Cambiar contraseña", icono: "llave",
      html: `<div class="campo"><label>Contraseña actual</label><input class="inp" type="password" id="cA"></div>
             <div class="campo"><label>Nueva contraseña</label><input class="inp" type="password" id="cN"><span class="ayuda">Mínimo 5 caracteres. Distingue mayúsculas y minúsculas.</span></div>
             <div class="campo"><label>Confirmar nueva contraseña</label><input class="inp" type="password" id="cC"></div>`,
      botones: [{ t: "Cancelar", c: "sec", v: null }, {
        t: "Guardar", antes: async v => {
          const a = v.querySelector("#cA").value, n = v.querySelector("#cN").value, c = v.querySelector("#cC").value;
          if (n !== c) { B.ui.toast("La confirmación no coincide.", "error"); return false; }
          try { await B.api.llamar("clave", { actual: a, nueva: n }); } catch (e) { B.ui.error(e); return false; }
        }, v: true
      }]
    });
    if (r) { B.usuario.cambiada = true; B.ui.toast("Contraseña actualizada.", "ok"); }
  },

  vigilarInactividad() {
    clearInterval(this._timer);
    this._ultimo = Date.now();
    const marcar = () => this._ultimo = Date.now();
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(ev => document.addEventListener(ev, marcar, { passive: true }));
    this._timer = setInterval(() => {
      const min = +(B.estado?.config?.inactividadMin) || 20;
      if (B.token && Date.now() - this._ultimo > min * 60000) this.salir("La sesión se cerró por inactividad (" + min + " min).");
    }, 30000);
  }
};

window.addEventListener("DOMContentLoaded", () => { B.ui.iniciarHoras(); B.app.iniciar(); });
