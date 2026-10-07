/* =========================================================================
   BITACORA 24RU1 - Recorrido guiado (primer uso y menu Ayuda)
   ========================================================================= */
"use strict";
const TOURS = {
  tecnico: [
    { ilus: "👋", titulo: "¡Bienvenido(a) a la Bitácora 24RU1!", texto: "Este recorrido de 1 minuto te muestra cómo capturar tu turno. Puedes repetirlo cuando quieras desde el círculo con tus iniciales (arriba a la derecha) → Recorrido." },
    { el: '[data-tour="menu"]', titulo: "Menú principal", texto: "Aquí están tus secciones: Inicio, Mis actividades, Mis horas extra, Espacios confinados, Vigilancias, Pendientes, tu Historial, tu Oficio de tiempo extra y los Concentrados generales." },
    { el: '[data-tour="turno"]', titulo: "Turno de trabajo", texto: "Se elige solo según la hora. El T1 nocturno lleva la fecha del día en que SALES (noche del 04 al 05 de octubre = 05/10 T1). Cámbialo solo si capturas un turno anterior." },
    { ruta: "inicio", el: '[data-tour="kpis"]', titulo: "Resumen de tu turno", texto: "Tus actividades, pendientes, espacios liberados y vigilancias activas de un vistazo. Toca cualquier tarjeta para ir a esa sección." },
    { ruta: "actividades", el: '[data-tour="act-renglones"]', titulo: "Una actividad por renglón", texto: "Lo que te asigna el supervisor ya aparece aquí. NO dupliques: si al escribir aparece «Ya está capturada», toca Unirme; en las actividades en equipo el estatus y el comentario valen para todos. Escribe qué hiciste, dónde y en qué equipo, y elige su estatus: Realizada, En proceso o Pendiente. Lo pendiente aparece en los siguientes reportes hasta que lo concluyas." },
    { el: '[data-tour="act-anteriores"]', titulo: "Actividades anteriores", texto: "¿Actividad repetida o periódica? Búscala aquí: primero aparecen las tuyas y luego las de tus compañeros, de la más frecuente a la menos." },
    { el: '[data-tour="act-guardar"]', titulo: "Guardar", texto: "Presiona Guardar (o Ctrl + S). Puedes volver a entrar para corregir: tus actividades guardadas aparecen y puedes editarlas o quitarlas." },
    { ruta: "espacios", el: '[data-tour="ec-form"]', titulo: "Liberación de espacios confinados", texto: "Si otro compañero ya registró ese espacio hoy, no se duplica: el sistema te ofrece agregarte al personal TSI. En «Datos de la tarjeta de AVISO» puedes anotar edificio, elevación, equipo de protección y tiempos de estancia. Elige el espacio (o escríbelo si es nuevo), captura las lecturas y la hora. Al guardar recibe su # consecutivo del concentrado general; las lecturas fuera de rango se marcan en rojo." },
    { ruta: "vigilancias", el: '[data-tour="vig-alta"]', titulo: "Vigilancias contra incendio", texto: "Da de alta una vigilancia (el catálogo llena INOP y ubicación) y retírala con el botón Retirar. Mientras esté activa aparece en todos los reportes." },
    { ruta: "pendientes", el: '[data-tour="pend-lista"]', titulo: "Pendientes", texto: "Aquí das seguimiento: márcalos como Concluida, En proceso o agrega un comentario de avance. Lo concluido se reporta en tu turno y deja de repetirse." },
    { ruta: "horasextra", el: '[data-tour="he-form"]', titulo: "Mis horas extra", texto: "Apartado propio para tu tiempo extra: elige el día y turno y el horario De / A en horas o medias horas (las horas se calculan solas; cuenta a partir de 30 minutos), los alimentos y la justificación. ¿Horarios separados el mismo día? Guarda el primero y agrega «Otro horario»." },
    { el: '[data-tour="he-just"]', titulo: "Justificación", texto: "Ya viene la justificación general de la recarga; cámbiala solo si fue otra actividad. Puedes usar la misma en todos tus registros de la semana con la casilla." },
    { el: '[data-tour="he-semana"]', titulo: "Tu semana", texto: "Aquí ves tus registros de la semana y el total. Toca uno para corregirlo. El supervisor los verifica." },
    { el: '[data-tour="nav-historial"]', titulo: "Tu historial", texto: "Consulta todo lo que has capturado en el periodo y guárdalo en PDF cuando lo necesites." },
    { ruta: "oficio", el: '[data-tour="of-datos"]', titulo: "Tu oficio de tiempo extra", texto: "Cada semana genera tu oficio con el formato oficial: escribe una vez tu categoría (y título si aplica) y se recuerda. Los días se llenan con tus horas extra. Los técnicos C-42 llevan la leyenda PERSONAL EVENTUAL." },
    { el: '[data-tour="of-pdf"]', titulo: "Ajusta y genera", texto: "Revisa la vista previa, agrega observaciones si hace falta y genera el PDF o imprímelo para firmas." },
    { el: '[data-tour="avatar"]', titulo: "Tu cuenta", texto: "Desde aquí cambias tu contraseña, repites este recorrido o cierras sesión. La sesión se cierra sola tras unos minutos sin uso." },
    { ilus: "✅", titulo: "¡Listo para capturar!", texto: "Recuerda: tus datos se guardan en la PC servidor y se respaldan automáticamente. Si tienes dudas, consulta a tu supervisor." }
  ],
  supervisor: [
    { ilus: "🧭", titulo: "Recorrido para supervisores", texto: "Aprende en 2 minutos a revisar el turno, generar el reporte en PDF, verificar horas extra y administrar la configuración. El recorrido para técnicos está en tu menú de usuario." },
    { el: '[data-tour="nav-turno"]', titulo: "Sección de supervisión", texto: "Datos del turno, Reporte del turno y Asistencia y horas extra. Más abajo: Administración (personal, catálogos, usuarios y configuración)." },
    { ruta: "inicio", el: '[data-tour="kpis"]', titulo: "Captura del turno", texto: "Ves cuántas personas del turno ya tienen registros y cuántas están asignadas sin captura, además de los pendientes abiertos de todo el personal." },
    { ruta: "actividades", el: '[data-tour="act-asignar"]', titulo: "Asignar actividades al personal", texto: "Escribe la actividad una vez y marca a una o varias personas del turno: en el reporte sale en un solo renglón con las iniciales de todos. ¿Aún no sabes quién la hará? Guárdala sin marcar a nadie: queda «por asignar» y los técnicos pueden tomarla. También puedes capturar espacios confinados y vigilancias a nombre de un técnico." },
    { ruta: "historial", el: '[data-tour="hist-persona"]', titulo: "Historial de cualquier persona", texto: "Haz clic en el campo Persona: se despliega todo el personal. Elige a cualquier técnico para ver todo su historial e imprimirlo." },
    { ruta: "hoja", el: '[data-tour="hoja-cab"]', titulo: "Hoja de asignación de actividades", texto: "Captura el mensaje de seguridad, ISA / CISA / SIF, estado de las unidades, dosis PETAR e INOP's. Cada turno se copian los datos del anterior y los días avanzan solos; las actividades pendientes, del turno y por asignar salen de la bitácora, separadas por unidad. Genera el PDF con el formato oficial." },
    { ruta: "turno", el: '[data-tour="sup-firmas"]', titulo: "Elaboró y revisó", texto: "Escribe iniciales o apellido de los supervisores: se completa solo. Aparecen al final del reporte con nombre y RPE." },
    { el: '[data-tour="sup-difusion"]', titulo: "Difusión del turno", texto: "Busca un mensaje del catálogo o escribe uno nuevo (se agrega al catálogo automáticamente)." },
    { el: '[data-tour="sup-asistencia"]', titulo: "Asistencia", texto: "Quien capturó aparece solo. Marca Presente a quien estuvo en el turno aunque no tenga actividades (o usa «Marcar presentes a todos los asignados»): saldrá en el personal del turno del reporte. En rojo: asignados sin registro. Agrega gente de otro turno con el buscador." },
    { ruta: "reporte", el: '[data-tour="rep-previa"]', titulo: "Revisa el reporte", texto: "Vista previa con membrete y pie oficiales. Las secciones vacías se omiten, el resumen va al inicio y las lecturas fuera de rango salen en rojo. Incluye los últimos 3 a 5 espacios confinados liberados, según el espacio disponible en la hoja." },
    { el: '[data-tour="rep-pdf"]', titulo: "Generar PDF", texto: "Crea el PDF en la carpeta REPORTES 24RU1 y lo abre. Si alguien del turno no capturó, te avisa antes de generarlo." },
    { ruta: "asistencia", el: '[data-tour="he-matriz"]', titulo: "Asistencia y horas extra semanal", texto: "Semana de lunes a domingo: turno y horas de cada persona por día, comparadas con la referencia automática. Las diferencias salen en rojo." },
    { el: '[data-tour="he-verificar"]', titulo: "Verificar la semana", texto: "Corrige en el detalle si hace falta, guarda y marca la semana como verificada. También puedes exportar a Excel o PDF." },
    { ruta: "oficio", el: '[data-tour="of-semana"]', titulo: "Oficios de tiempo extra", texto: "Genera el oficio semanal de cualquier persona o todos los de la semana en un solo PDF (una hoja por persona). Los nombres de Vo. Bo. y Autoriza se cambian en Configuración." },
    { ruta: "registros", el: '[data-tour="reg-filtros"]', titulo: "Registros de todo el personal", texto: "Con el lápiz de cada renglón corriges el texto o el estatus de cualquier actividad, incluso de las ya realizadas. Revisa las actividades de todos los técnicos, especializados y supervisores: filtra por fechas, turno, categoría, persona o estatus, y abre el historial de cada quien." },
    { ruta: "concentrados", el: '[data-tour="conc-filtros"]', titulo: "Concentrados generales", texto: "Filtra por fechas o busca; genera PDF o Excel del rango. Como supervisor puedes corregir registros (mejor anota ANULADO que eliminar)." },
    { ruta: "config", el: '[data-tour="cfg-recarga"]', titulo: "Configuración", texto: "Nombre y fechas del periodo (recarga u operación normal), nombres de turnos, rangos de referencia de espacios confinados y la referencia de horas extra." },
    { el: '[data-tour="cfg-membrete"]', titulo: "Membrete y pie de página", texto: "Cambia el encabezado y el pie de todos los reportes para otro proyecto o año: sube la nueva imagen y revisa la vista previa. Puedes restaurar los originales." },
    { el: '[data-tour="cfg-respaldo"]', titulo: "Respaldos", texto: "El sistema respalda solo en cada cambio y cada día. Aquí descargas un respaldo completo o restauras uno." },
    { el: '[data-tour="nav-usuarios"]', titulo: "Usuarios", texto: "Si alguien olvida su contraseña, restablécela a la inicial (RPE + iniciales; supervisores 24RU1)." },
    { ilus: "🏁", titulo: "¡Todo listo!", texto: "Flujo diario sugerido: 1) revisa la captura del turno, 2) completa Datos del turno, 3) revisa y genera el PDF, 4) cada semana verifica asistencia y horas extra." }
  ]
};

B.tour = {
  tipo: null, i: 0, pasos: [], capa: null,
  ofrecer(tipo) { this.iniciar(tipo); },
  iniciar(tipo) {
    this.cerrar(false);
    this.tipo = tipo; this.pasos = TOURS[tipo]; this.i = 0;
    const capa = document.createElement("div");
    capa.innerHTML = `<div class="tour-velo"></div><div class="tour-foco"></div><div class="tour-caja" role="dialog" aria-live="polite"></div>`;
    document.body.appendChild(capa);
    this.capa = capa;
    this._tecla = e => { if (e.key === "Escape") this.cerrar(true); if (e.key === "ArrowRight") this.mover(1); if (e.key === "ArrowLeft") this.mover(-1); };
    document.addEventListener("keydown", this._tecla);
    this._resize = () => this.posicionar();
    window.addEventListener("resize", this._resize);
    this.mostrar();
  },
  async mostrar() {
    const p = this.pasos[this.i];
    if (p.ruta && B.app.ruta !== p.ruta) { location.hash = "#/" + p.ruta; await new Promise(r => setTimeout(r, 260)); }
    const caja = this.capa.querySelector(".tour-caja");
    const ultimo = this.i === this.pasos.length - 1;
    caja.innerHTML = `${p.ilus ? `<div class="tour-ilustra">${p.ilus}</div>` : ""}<div class="paso">${this.tipo === "supervisor" ? "Supervisores" : "Técnicos"} · Paso ${this.i + 1} de ${this.pasos.length}</div>
      <h3>${p.titulo}</h3><p>${p.texto}</p>
      <div class="tour-puntos">${this.pasos.map((_, k) => `<i class="${k === this.i ? "on" : ""}"></i>`).join("")}</div>
      <div class="tour-botones">${!ultimo ? `<button class="btn fantasma chico salir">Saltar</button>` : `<span class="salir"></span>`}
        ${this.i > 0 ? `<button class="btn sec chico" data-m="-1">Anterior</button>` : ""}
        <button class="btn chico" data-m="1">${ultimo ? "Terminar" : this.i === 0 ? "Empezar" : "Siguiente"}</button></div>`;
    caja.querySelector(".salir")?.addEventListener("click", () => this.cerrar(true));
    caja.querySelectorAll("[data-m]").forEach(b => b.onclick = () => this.mover(+b.dataset.m));
    const el = p.el ? document.querySelector(p.el) : null;
    if (this.visible(el)) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      await new Promise(r => setTimeout(r, 380));
    }
    this.posicionar();
    caja.querySelector('[data-m="1"]').focus();
  },
  posicionar() {
    if (!this.capa) return;
    const p = this.pasos[this.i], foco = this.capa.querySelector(".tour-foco"), caja = this.capa.querySelector(".tour-caja");
    const el = p.el ? document.querySelector(p.el) : null;
    const visible = this.visible(el);
    this.capa.classList.toggle("tour-centro", !visible);
    if (!visible) {
      Object.assign(foco.style, { left: "50%", top: "50%", width: "0px", height: "0px" });
      const w = caja.offsetWidth, h = caja.offsetHeight;
      Object.assign(caja.style, { left: (innerWidth - w) / 2 + "px", top: Math.max(16, (innerHeight - h) / 2) + "px" });
      return;
    }
    const r = el.getBoundingClientRect(), m = 8;
    const top = Math.max(6, r.top - m), left = Math.max(6, r.left - m);
    const width = Math.min(innerWidth - left - 6, r.width + m * 2), height = Math.min(innerHeight - top - 6, r.height + m * 2);
    Object.assign(foco.style, { top: top + "px", left: left + "px", width: width + "px", height: height + "px" });
    const w = caja.offsetWidth, h = caja.offsetHeight;
    let ct, cl;
    if (r.right + 16 + w < innerWidth && r.width < innerWidth * .45) { cl = r.right + 18; ct = r.top; }
    else if (top + height + 14 + h < innerHeight) { ct = top + height + 14; cl = r.left; }
    else if (top - 14 - h > 0) { ct = top - 14 - h; cl = r.left; }
    else { ct = innerHeight - h - 16; cl = r.left; }
    cl = Math.min(Math.max(16, cl), innerWidth - w - 16);
    ct = Math.min(Math.max(16, ct), innerHeight - h - 16);
    Object.assign(caja.style, { left: cl + "px", top: ct + "px" });
  },
  visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== "hidden";
  },
  mover(d) {
    const n = this.i + d;
    if (n < 0) return;
    if (n >= this.pasos.length) { this.cerrar(true); return; }
    this.i = n; this.mostrar();
  },
  async cerrar(marcar) {
    if (!this.capa) return;
    this.capa.remove(); this.capa = null;
    document.removeEventListener("keydown", this._tecla);
    window.removeEventListener("resize", this._resize);
    if (marcar && this.tipo && B.token) {
      try {
        await B.api.op("usuarios", "tourVisto", { tour: this.tipo });
        const v = (B.usuario.tours || "").split(",").filter(Boolean);
        if (!v.includes(this.tipo)) v.push(this.tipo);
        B.usuario.tours = v.join(",");
      } catch (e) { }
      if (this.i < this.pasos.length - 1) B.ui.toast("Puedes ver el recorrido cuando quieras desde tu menú de usuario (círculo arriba a la derecha).", "", 5000);
    }
  }
};
