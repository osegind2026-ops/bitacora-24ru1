/* =========================================================================
   BITACORA 24RU1 - LISTA DE ESPACIOS CONFINADOS (Anexo SI-9974-2, Rev. 5)
   Base de datos de los espacios confinados de la CNLV U1 y U2 con su edificio,
   nivel y requisito de muestreo ambiental. Se sugieren al capturar una liberación.
   La lista NO incluye necesariamente todos los espacios: se puede escribir otro.
   Requisito: O = Oxígeno, C = Combustibilidad, T = Temperatura, H = humedad, S = H2S, M = CO
   ========================================================================= */
"use strict";
B.ecArmar = () => {
  const R = { O: "Oxígeno", C: "Combustibilidad", T: "Temperatura", H: "humedad", S: "H2S", M: "CO" };
  const GRUPOS = B.EC_GRUPOS || [];      // datos en ec_datos.js (PC) o en el paquete de datos (celular)
  const CAMPO = { O: "o2", C: "lel", T: "temp", H: "hr", S: "h2s", M: "co" };
  const lista = [];
  for (const [edif, uni, items] of GRUPOS) for (const [esp, nivel, req] of items)
    lista.push({ esp, edif, uni, nivel, req, reqTxt: [...req].map(k => R[k]).join(", "), campos: [...req].map(k => CAMPO[k]) });
  const idx = new Map(lista.map(x => [B.u.norm(x.esp), x]));
  const pozo = x => /^POZO SECO/.test(B.u.norm(x));
  return {
    lista,
    // busca un espacio por su nombre; el pozo seco se reconoce aunque el nombre lleve otra elevacion ("POZO SECO U1 ELEV. 10.15")
    buscar(nombre) {
      const k = B.u.norm(nombre); if (!k) return null;
      if (idx.has(k)) return idx.get(k);
      if (pozo(k)) return idx.get(/\bU ?-?2\b/.test(k) ? "POZO SECO U2" : "POZO SECO U1");
      return null;
    },
    esPozo: pozo,
    // opciones para el buscador: primero las de la lista oficial, luego las del catalogo propio que no esten en ella
    opciones(catalogo) {
      const r = lista.map(x => ({ value: x.esp, label: x.esp, sub: x.edif + " · nivel " + x.nivel + " · " + x.reqTxt }));
      for (const c of catalogo || []) { const t = typeof c === "string" ? c : (c && c.txt) || ""; if (t && !idx.has(B.u.norm(t))) r.push({ value: t, label: t, sub: "catálogo propio" }); }
      return r;
    }
  };
};
B.ecLista = B.ecArmar();
