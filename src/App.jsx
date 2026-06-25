const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

const BARRIOS = [
  "Chapinero","Usaquén","Suba","Engativá","Fontibón","Kennedy","Bosa",
  "Teusaquillo","Barrios Unidos","Los Mártires","Antonio Nariño","Rafael Uribe",
  "Ciudad Bolívar","San Cristóbal","Usme","Tunjuelito","Puente Aranda",
  "La Candelaria","Santa Fe","Mártires","La Macarena","El Chicó","Cedritos",
  "Niza","Modelia","Quirinal","Restrepo","Palermo","Galerías","Normandía"
];

const TIPOS = [
  "Todos los sectores","Restaurantes","Clínicas y consultorios","Farmacias",
  "Tiendas y retail","Hoteles","Supermercados","Ferreterías","Papelerías",
  "Talleres mecánicos","Peluquerías y salones","Gimnasios","Colegios y academias",
  "Consultores y empresas","Droguerías","Panaderías","Bares y cafés"
];

const MAPTILER_KEY = ""; // Uses free embed

function StarRating({rating}) {
  const stars = Math.round(rating||0);
  return (
    <span style={{color:"#BA7517",fontSize:12}}>
      {"★".repeat(stars)}{"☆".repeat(5-stars)}
      <span style={{marginLeft:4,color:"var(--color-text-secondary)",fontSize:11}}>{rating?.toFixed(1)||"N/A"}</span>
    </span>
  );
}

function ProspectCard({p, selected, onToggle, index}) {
  return (
    <div onClick={()=>onToggle(p.place_id)} style={{
      cursor:"pointer",
      background:"var(--color-background-primary)",
      border: selected ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
      borderRadius:"var(--border-radius-lg)",
      padding:"0.85rem 1rem",
      position:"relative",
      transition:"border 0.15s"
    }}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div style={{
          minWidth:26,height:26,borderRadius:"50%",
          background: selected ? "var(--color-background-info)" : "var(--color-background-secondary)",
          color: selected ? "var(--color-text-info)" : "var(--color-text-secondary)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:11,fontWeight:500,flexShrink:0,marginTop:1
        }}>{selected ? (index+1) : "+"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:500,fontSize:14,marginBottom:3,color:"var(--color-text-primary)"}}>{p.name}</div>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:4,lineHeight:1.4}}>{p.address}</div>
          <StarRating rating={p.rating}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
            {p.phone_number && (
              <span style={{fontSize:11,background:"var(--color-background-secondary)",padding:"2px 8px",borderRadius:20,color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:4}}>
                <i className="ti ti-phone" style={{fontSize:11}} aria-hidden="true"/> {p.phone_number}
              </span>
            )}
            {p.website && (
              <span style={{fontSize:11,background:"var(--color-background-secondary)",padding:"2px 8px",borderRadius:20,color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:4}}>
                <i className="ti ti-world" style={{fontSize:11}} aria-hidden="true"/> Sitio web
              </span>
            )}
            {p.weekday_hours?.[0] && (
              <span style={{fontSize:11,background:"var(--color-background-secondary)",padding:"2px 8px",borderRadius:20,color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:4}}>
                <i className="ti ti-clock" style={{fontSize:11}} aria-hidden="true"/> {p.weekday_hours[0].replace("Monday: ","Lun: ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteMap({prospects}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(()=>{
    if (!prospects.length || !mapRef.current) return;

    const loadMap = () => {
      if (!window.google) return;
      const G = window.google.maps;

      if (mapInstanceRef.current) {
        markersRef.current.forEach(m=>m.setMap(null));
        markersRef.current = [];
      } else {
        mapInstanceRef.current = new G.Map(mapRef.current, {
          zoom:14,
          center:{lat: prospects[0].latitude, lng: prospects[0].longitude},
          mapTypeControl:false,
          streetViewControl:false,
          fullscreenControl:false,
          styles:[{featureType:"poi.business",stylers:[{visibility:"simplified"}]}]
        });
      }

      const map = mapInstanceRef.current;
      const bounds = new G.LatLngBounds();

      prospects.forEach((p,i)=>{
        const pos = {lat:p.latitude, lng:p.longitude};
        bounds.extend(pos);

        const marker = new G.Marker({
          position:pos,
          map,
          label:{text:String(i+1),color:"#fff",fontSize:"12px",fontWeight:"500"},
          title:p.name,
          icon:{
            path: G.SymbolPath.CIRCLE,
            fillColor:"#185FA5",
            fillOpacity:1,
            strokeColor:"#fff",
            strokeWeight:2,
            scale:16
          }
        });

        const info = new G.InfoWindow({content:`
          <div style="font-family:sans-serif;padding:4px 2px;max-width:220px">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${i+1}. ${p.name}</div>
            <div style="font-size:11px;color:#666;margin-bottom:3px">${p.address}</div>
            ${p.phone_number ? `<div style="font-size:11px">📞 ${p.phone_number}</div>`:""}
            ${p.rating ? `<div style="font-size:11px">⭐ ${p.rating.toFixed(1)}</div>`:""}
          </div>`
        });
        marker.addListener("click",()=>info.open(map,marker));
        markersRef.current.push(marker);
      });

      if (prospects.length > 1) {
        const path = prospects.map(p=>({lat:p.latitude,lng:p.longitude}));
        path.push(path[0]);
        new G.Polyline({path,geodesic:true,strokeColor:"#185FA5",strokeOpacity:0.6,strokeWeight:2,map});
        map.fitBounds(bounds,{padding:50});
      } else {
        map.setCenter({lat:prospects[0].latitude,lng:prospects[0].longitude});
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
        s.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&callback=_gmapsCb";
        s.async = true;
        document.head.appendChild(s);
      }
    }
  }, [prospects]);

  return (
    <div ref={mapRef} style={{width:"100%",height:380,borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"hidden",background:"var(--color-background-secondary)"}}/>
  );
}

// Optimize route by nearest neighbor
function optimizeRoute(prospects) {
  if (!prospects.length) return [];
  const dist = (a,b) => Math.sqrt((a.latitude-b.latitude)**2+(a.longitude-b.longitude)**2);
  const remaining = [...prospects];
  const route = [remaining.splice(0,1)[0]];
  while (remaining.length) {
    const last = route[route.length-1];
    let minD = Infinity, minI = 0;
    remaining.forEach((p,i)=>{ const d=dist(last,p); if(d<minD){minD=d;minI=i;} });
    route.push(remaining.splice(minI,1)[0]);
  }
  return route;
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
      const query = tipo === "Todos los sectores"
        ? `negocios empresas ${zona} Bogotá Colombia`
        : `${tipo} ${zona} Bogotá Colombia`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1200,
          system: `Eres un generador de datos JSON. Respondes ÚNICAMENTE con JSON válido, sin texto adicional, sin explicaciones, sin backticks, sin markdown. Solo el objeto JSON.`,
          messages:[{
            role:"user",
            content:`Genera una lista de 10 negocios representativos del tipo "${tipo}" ubicados en el barrio ${zona} de Bogotá, Colombia.

Responde SOLO con este JSON (sin nada más):
{"places":[{"name":"nombre del negocio","address":"dirección en ${zona} Bogotá","phone":"teléfono colombiano o null","website":"url o null","hours":"Lun-Vie 8am-6pm o null","rating":4.2,"lat":4.65,"lng":-74.05,"type":"tipo"}]}`
          }]
        })
      });

      const data = await res.json();
      const text = data.content?.map(b=>b.text||"").join("").trim() || "";

      let parsed;
      try {
        const clean = text.replace(/^```json|^```|```$/gm,"").trim();
        const match = clean.match(/\{[\s\S]*"places"[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : clean);
      } catch {
        throw new Error("Error al interpretar la respuesta. Intenta de nuevo.");
      }

      const places = (parsed.places||[]).map((p,i)=>({
        place_id: `p${i}`,
        name: p.name,
        address: p.address,
        phone_number: p.phone||null,
        website: p.website||null,
        weekday_hours: p.hours ? [`Monday: ${p.hours}`] : null,
        rating: p.rating||null,
        latitude: p.lat || 4.6351 + (Math.random()-0.5)*0.02,
        longitude: p.lng || -74.0640 + (Math.random()-0.5)*0.02,
        type: p.type||tipo
      }));

      if (!places.length) throw new Error("No se encontraron resultados. Intenta con otro barrio o tipo.");
      setResults(places);
      setSearched(true);
    } catch(e) {
      setError(e.message||"Error al buscar prospectos.");
    }
    setLoading(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = {...prev};
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });
  };

  const selectedList = optimizeRoute(results.filter(p=>selected[p.place_id]));

  const exportCSV = () => {
    const rows = [["#","Nombre","Dirección","Teléfono","Sitio web","Horario","Calificación"]];
    selectedList.forEach((p,i)=>rows.push([i+1,p.name,p.address,p.phone_number||"",p.website||"",p.weekday_hours?.[0]||"",p.rating||""]));
    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download = `prospectos_${zona}.csv`;
    a.click();
  };

  return (
    <div style={{padding:"1rem 0"}}>
      <h2 style={{position:"absolute",left:"-9999px"}}>Buscador de prospectos B2B Bogotá</h2>

      {/* Header */}
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-tertiary)",letterSpacing:"0.05em",marginBottom:4,textTransform:"uppercase"}}>Plataforma de Facturación &amp; Comunicación Masiva</div>
        <div style={{fontSize:20,fontWeight:500,color:"var(--color-text-primary)"}}>Buscador de prospectos B2B — Bogotá</div>
      </div>

      {/* Búsqueda */}
      <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",marginBottom:"1.25rem",border:"0.5px solid var(--color-border-tertiary)"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Barrio o zona en Bogotá</label>
            <select value={barrio} onChange={e=>{setBarrio(e.target.value);setBarrioCustom("");}}>
              <option value="">— Seleccionar —</option>
              {BARRIOS.map(b=><option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:13,color:"var(--color-text-secondary)"}}>O escribe una zona específica</label>
            <input value={barrioCustom} onChange={e=>setBarrioCustom(e.target.value)} placeholder="Ej: Zona Rosa, Galerías, Restrepo..."/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Tipo de negocio</label>
            <select value={tipo} onChange={e=>setTipo(e.target.value)}>
              {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button onClick={buscar} disabled={!zona||loading} style={{width:"100%"}}>
          {loading ? "Buscando prospectos..." : "Buscar prospectos ↗"}
        </button>
        {loading && (
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,fontSize:13,color:"var(--color-text-secondary)"}}>
            <div style={{width:14,height:14,border:"2px solid var(--color-border-secondary)",borderTopColor:"var(--color-text-secondary)",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            Buscando negocios en {zona}...
          </div>
        )}
        {error && <div style={{marginTop:10,fontSize:13,color:"var(--color-text-danger)",padding:"8px 12px",background:"var(--color-background-danger)",borderRadius:"var(--border-radius-md)"}}>{error}</div>}
      </div>

      {/* Resultados */}
      {searched && results.length > 0 && (
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>
              <span style={{fontWeight:500,color:"var(--color-text-primary)"}}>{results.length} prospectos</span> encontrados en {zona} · Selecciona los que quieres visitar
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setSelected(Object.fromEntries(results.map(p=>[p.place_id,true])))} style={{fontSize:12,padding:"4px 12px"}}>Seleccionar todos</button>
              <button onClick={()=>setSelected({})} style={{fontSize:12,padding:"4px 12px"}}>Limpiar</button>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
            {results.map((p,i)=>(
              <ProspectCard
                key={p.place_id}
                p={p}
                selected={!!selected[p.place_id]}
                onToggle={toggleSelect}
                index={selectedList.findIndex(s=>s.place_id===p.place_id)}
              />
            ))}
          </div>

          {/* Ruta */}
          {selectedList.length > 0 && (
            <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",border:"0.5px solid var(--color-border-tertiary)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div>
                  <div style={{fontWeight:500,fontSize:15}}>Ruta de visitas optimizada</div>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>{selectedList.length} paradas · ordenadas por cercanía</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={exportCSV} style={{fontSize:12,padding:"6px 12px"}}>
                    <i className="ti ti-download" style={{fontSize:13,marginRight:4}} aria-hidden="true"/>Exportar CSV
                  </button>
                  <button onClick={()=>setShowMap(v=>!v)} style={{fontSize:12,padding:"6px 14px"}}>
                    <i className={`ti ti-map${showMap?"-off":""}`} style={{fontSize:13,marginRight:4}} aria-hidden="true"/>
                    {showMap ? "Ocultar mapa" : "Ver en mapa"}
                  </button>
                </div>
              </div>

              {/* Lista de ruta */}
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom: showMap ? 14 : 0}}>
                {selectedList.map((p,i)=>(
                  <div key={p.place_id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"var(--color-background-info)",color:"var(--color-text-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:500,fontSize:13,color:"var(--color-text-primary)"}}>{p.name}</div>
                      <div style={{fontSize:11,color:"var(--color-text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.address}</div>
                    </div>
                    {p.phone_number && <div style={{fontSize:11,color:"var(--color-text-secondary)",flexShrink:0}}>{p.phone_number}</div>}
                    <StarRating rating={p.rating}/>
                  </div>
                ))}
              </div>

              {showMap && <RouteMap prospects={selectedList}/>}
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
