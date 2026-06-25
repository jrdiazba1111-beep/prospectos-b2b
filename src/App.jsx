import { useState, useEffect, useRef } from "react";



const BARRIOS = [
  "Chapinero","Usaquén","Suba","Engativá","Fontibón","Kennedy","Bosa",
  "Teusaquillo","Barrios Unidos","Los Mártires","Antonio Nariño","Rafael Uribe",
  "Ciudad Bolívar","San Cristóbal","Usme","Tunjuelito","Puente Aranda",
  "La Candelaria","Santa Fe","La Macarena","El Chicó","Cedritos",
  "Niza","Modelia","Restrepo","Palermo","Galerías","Normandía"
];

const TIPOS = [
  "Todos los sectores","Restaurantes","Clínicas y consultorios","Farmacias",
  "Tiendas y retail","Hoteles","Supermercados","Ferreterías","Papelerías",
  "Talleres mecánicos","Peluquerías y salones","Gimnasios","Colegios y academias",
  "Consultores y empresas","Droguerías","Panaderías","Bares y cafés"
];

function StarRating({ rating }) {
  const stars = Math.round(rating || 0);
  return (
    <span style={{ color: "#BA7517", fontSize: 12 }}>
      {"★".repeat(stars)}{"☆".repeat(5 - stars)}
      <span style={{ marginLeft: 4, color: "#888", fontSize: 11 }}>{rating?.toFixed(1) || "N/A"}</span>
    </span>
  );
}

function optimizeRoute(prospects) {
  if (!prospects.length) return [];
  const dist = (a, b) => Math.sqrt((a.latitude - b.latitude) ** 2 + (a.longitude - b.longitude) ** 2);
  const remaining = [...prospects];
  const route = [remaining.splice(0, 1)[0]];
  while (remaining.length) {
    const last = route[route.length - 1];
    let minD = Infinity, minI = 0;
    remaining.forEach((p, i) => { const d = dist(last, p); if (d < minD) { minD = d; minI = i; } });
    route.push(remaining.splice(minI, 1)[0]);
  }
  return route;
}

function RouteMap({ prospects }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!prospects.length || !mapRef.current) return;

    const loadMap = () => {
      if (!window.google) return;
      const G = window.google.maps;

      if (mapInstanceRef.current) {
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
      } else {
        mapInstanceRef.current = new G.Map(mapRef.current, {
          zoom: 14,
          center: { lat: prospects[0].latitude, lng: prospects[0].longitude },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
      }

      const map = mapInstanceRef.current;
      const bounds = new G.LatLngBounds();

      prospects.forEach((p, i) => {
        const pos = { lat: p.latitude, lng: p.longitude };
        bounds.extend(pos);
        const marker = new G.Marker({
          position: pos, map,
          label: { text: String(i + 1), color: "#fff", fontSize: "12px", fontWeight: "500" },
          title: p.name,
          icon: {
            path: G.SymbolPath.CIRCLE,
            fillColor: "#185FA5", fillOpacity: 1,
            strokeColor: "#fff", strokeWeight: 2, scale: 16
          }
        });
        const info = new G.InfoWindow({
          content: `<div style="font-family:sans-serif;padding:4px;max-width:200px">
            <b>${i + 1}. ${p.name}</b><br/>
            <span style="font-size:12px;color:#666">${p.address}</span><br/>
            ${p.phone_number ? `📞 ${p.phone_number}<br/>` : ""}
            ${p.rating ? `⭐ ${p.rating.toFixed(1)}` : ""}
          </div>`
        });
        marker.addListener("click", () => info.open(map, marker));
        markersRef.current.push(marker);
      });

      if (prospects.length > 1) {
        const path = prospects.map(p => ({ lat: p.latitude, lng: p.longitude }));
        path.push(path[0]);
        new G.Polyline({ path, geodesic: true, strokeColor: "#185FA5", strokeOpacity: 0.6, strokeWeight: 2, map });
        map.fitBounds(bounds, { padding: 50 });
      } else {
        map.setCenter({ lat: prospects[0].latitude, lng: prospects[0].longitude });
        map.setZoom(15);
      }
    };

    if (window.google?.maps) {
      loadMap();
    } else {
      window._gmapsCb = loadMap;
      if (!document.getElementById("gmaps-script")) {
        const s = document.createElement("script");
        s.id = "gmaps-script";
        // Reemplaza TU_API_KEY_GOOGLE_MAPS con tu key real
        s.src = "https://maps.googleapis.com/maps/api/js?key=TU_API_KEY_GOOGLE_MAPS&callback=_gmapsCb";
        s.async = true;
        document.head.appendChild(s);
      }
    }
  }, [prospects]);

  return <div ref={mapRef} style={{ width: "100%", height: 380, borderRadius: 12, border: "1px solid #ddd" }} />;
}

export default function App() {
  const [barrio, setBarrio] = useState("");
  const [tipo, setTipo] = useState("Todos los sectores");
  const [barrioCustom, setBarrioCustom] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [searched, setSearched] = useState(false);

  const zona = barrioCustom || barrio;

  const buscar = async () => {
    if (!zona) return;
    setLoading(true); setError(""); setResults([]); setSelected({}); setShowMap(false); setSearched(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          system: `Eres una API que devuelve ÚNICAMENTE objetos JSON. Nunca escribes texto, explicaciones, saludos ni markdown. Tu respuesta siempre empieza con { y termina con }. Nada más.`,
          messages: [
            {
              role: "user",
              content: `Genera 10 negocios de tipo "${tipo}" en ${zona}, Bogotá, Colombia. Responde SOLO con este JSON exacto, sin texto antes ni después:\n{"places":[{"name":"string","address":"string","phone":"string o null","website":"string o null","hours":"string o null","rating":4.2,"lat":4.65,"lng":-74.05,"type":"string"}]}`
            },
            {
              role: "assistant",
              content: `{"places":[`
            }
          ]
        })
      });

      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("").trim() || "";

      let parsed;
      try {
        // El prefill hace que la respuesta empiece con `"places":[` — reconstruimos el objeto
        let clean = text.replace(/^```json|^```|```$/gm, "").trim();
        // Si el modelo continuó el prefill, el texto empieza con "places":[ ...
        if (!clean.startsWith("{")) clean = '{"places":[' + clean;
        // Asegura que cierre bien
        if (!clean.endsWith("}")) clean = clean.replace(/,?\s*$/, "") + "]}";
        const match = clean.match(/\{[\s\S]*"places"[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : clean);
      } catch {
        throw new Error("Error al interpretar la respuesta. Intenta de nuevo.");
      }

      const places = (parsed.places || []).map((p, i) => ({
        place_id: `p${i}`,
        name: p.name,
        address: p.address,
        phone_number: p.phone || null,
        website: p.website || null,
        weekday_hours: p.hours ? [`Lunes: ${p.hours}`] : null,
        rating: p.rating || null,
        latitude: p.lat || 4.6351 + (Math.random() - 0.5) * 0.02,
        longitude: p.lng || -74.0640 + (Math.random() - 0.5) * 0.02,
        type: p.type || tipo
      }));

      if (!places.length) throw new Error("No se encontraron resultados.");
      setResults(places);
      setSearched(true);
    } catch (e) {
      setError(e.message || "Error al buscar prospectos.");
    }
    setLoading(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });
  };

  const selectedList = optimizeRoute(results.filter(p => selected[p.place_id]));

  const exportCSV = () => {
    const rows = [["#", "Nombre", "Dirección", "Teléfono", "Sitio web", "Horario", "Calificación"]];
    selectedList.forEach((p, i) => rows.push([i + 1, p.name, p.address, p.phone_number || "", p.website || "", p.weekday_hours?.[0] || "", p.rating || ""]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `prospectos_${zona}.csv`;
    a.click();
  };

  const s = {
    wrap: { maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
    card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem 1.25rem" },
    label: { fontSize: 13, color: "#666", marginBottom: 4, display: "block" },
    input: { width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" },
    btn: { padding: "9px 18px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, cursor: "pointer", fontSize: 13 },
    btnPrimary: { padding: "10px", width: "100%", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    badge: { fontSize: 11, background: "#f3f4f6", padding: "2px 8px", borderRadius: 20, color: "#555" },
  };

  return (
    <div style={s.wrap}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Plataforma de Facturación &amp; Comunicación Masiva</div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Buscador de prospectos B2B — Bogotá</div>
      </div>

      <div style={{ ...s.card, marginBottom: "1.25rem", background: "#f9fafb" }}>
        <div style={{ ...s.grid2, marginBottom: 12 }}>
          <div>
            <label style={s.label}>Barrio o zona</label>
            <select value={barrio} onChange={e => { setBarrio(e.target.value); setBarrioCustom(""); }} style={s.input}>
              <option value="">— Seleccionar —</option>
              {BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>O escribe una zona específica</label>
            <input value={barrioCustom} onChange={e => setBarrioCustom(e.target.value)} placeholder="Ej: Zona Rosa, Restrepo..." style={s.input} />
          </div>
          <div>
            <label style={s.label}>Tipo de negocio</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={s.input}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button onClick={buscar} disabled={!zona || loading} style={s.btnPrimary}>
          {loading ? "Buscando prospectos..." : "Buscar prospectos →"}
        </button>
        {error && <div style={{ marginTop: 10, fontSize: 13, color: "#b91c1c", padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>{error}</div>}
      </div>

      {searched && results.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "#555" }}><b style={{ color: "#111" }}>{results.length} prospectos</b> en {zona} · Selecciona los que quieres visitar</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelected(Object.fromEntries(results.map(p => [p.place_id, true])))} style={s.btn}>Todos</button>
              <button onClick={() => setSelected({})} style={s.btn}>Limpiar</button>
            </div>
          </div>

          <div style={{ ...s.grid2, marginBottom: "1.25rem" }}>
            {results.map(p => {
              const sel = !!selected[p.place_id];
              const idx = selectedList.findIndex(s => s.place_id === p.place_id);
              return (
                <div key={p.place_id} onClick={() => toggleSelect(p.place_id)} style={{ ...s.card, cursor: "pointer", border: sel ? "2px solid #185FA5" : "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ minWidth: 26, height: 26, borderRadius: "50%", background: sel ? "#dbeafe" : "#f3f4f6", color: sel ? "#185FA5" : "#888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                      {sel ? (idx + 1) : "+"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{p.address}</div>
                      <StarRating rating={p.rating} />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                        {p.phone_number && <span style={s.badge}>📞 {p.phone_number}</span>}
                        {p.website && <span style={s.badge}>🌐 Sitio web</span>}
                        {p.weekday_hours?.[0] && <span style={s.badge}>🕐 {p.weekday_hours[0]}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedList.length > 0 && (
            <div style={{ ...s.card, background: "#f9fafb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Ruta de visitas optimizada</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{selectedList.length} paradas · ordenadas por cercanía</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={exportCSV} style={s.btn}>⬇ Exportar CSV</button>
                  <button onClick={() => setShowMap(v => !v)} style={s.btn}>{showMap ? "Ocultar mapa" : "🗺 Ver mapa"}</button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: showMap ? 14 : 0 }}>
                {selectedList.map((p, i) => (
                  <div key={p.place_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#dbeafe", color: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.address}</div>
                    </div>
                    {p.phone_number && <div style={{ fontSize: 11, color: "#666", flexShrink: 0 }}>{p.phone_number}</div>}
                    <StarRating rating={p.rating} />
                  </div>
                ))}
              </div>

              {showMap && <RouteMap prospects={selectedList} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
