import { useEffect,useMemo,useRef,useState } from 'react';
import { Download,Edit3,ImagePlus,MapPin,Plus,Save,Trash2,Upload,X } from 'lucide-react';
import { deleteManualEvent,fileToDataUrl,listManualEvents,makeManualId,replaceManualEvents,saveManualEvent,type ManualIntelEvent } from '../live/offlineStore';

type FormState={title:string;description:string;source:string;link:string;publishedAt:string;country:string;city:string;zone:string;lat:string;lng:string;actors:string;tags:string;category:string;severity:string;interestScore:string;geoConfidence:string;tlp:ManualIntelEvent['tlp'];status:ManualIntelEvent['status'];image:string};
const nowLocal=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
const empty=():FormState=>({title:'',description:'',source:'GHOTAM Admin',link:'',publishedAt:nowLocal(),country:'',city:'',zone:'',lat:'',lng:'',actors:'',tags:'',category:'geopolitics',severity:'5',interestScore:'50',geoConfidence:'0.95',tlp:'TLP:CLEAR',status:'published',image:''});
const split=(s:string)=>s.split(',').map(x=>x.trim()).filter(Boolean);
const n=(s:string)=>{const v=Number(s);return Number.isFinite(v)?v:undefined};

export default function AdminEvents(){
  const[events,setEvents]=useState<ManualIntelEvent[]>([]);const[form,setForm]=useState<FormState>(empty());const[editingId,setEditingId]=useState('');const[msg,setMsg]=useState('');const fileRef=useRef<HTMLInputElement>(null);const importRef=useRef<HTMLInputElement>(null);
  const refresh=()=>listManualEvents().then(setEvents).catch(()=>setEvents([]));useEffect(()=>{refresh()},[]);
  const mapped=useMemo(()=>events.filter(e=>typeof e.lat==='number'&&typeof e.lng==='number').length,[events]);
  const set=(k:keyof FormState,v:string)=>setForm(f=>({...f,[k]:v}));

  async function save(){
    if(!form.title.trim()){setMsg('El título es obligatorio.');return}
    const lat=n(form.lat),lng=n(form.lng);if((form.lat||form.lng)&&(lat===undefined||lng===undefined)){setMsg('Latitud y longitud deben ser números válidos.');return}
    const existing=events.find(e=>e.id===editingId);const now=new Date().toISOString();const locationLabel=[form.zone,form.city,form.country].filter(Boolean).join(', ');
    const event:ManualIntelEvent={id:editingId||makeManualId(),title:form.title.trim(),description:form.description.trim(),source:form.source.trim()||'GHOTAM Admin',link:form.link.trim(),publishedAt:new Date(form.publishedAt||Date.now()).toISOString(),image:form.image||undefined,country:form.country.trim()||undefined,city:form.city.trim()||undefined,zone:form.zone.trim()||undefined,locationLabel:locationLabel||undefined,lat,lng,actors:split(form.actors),tags:split(form.tags),category:form.category.trim()||'world',severity:Math.max(0,Math.min(10,Number(form.severity)||0)),interestScore:Math.max(0,Math.min(100,Number(form.interestScore)||0)),geoConfidence:Math.max(0,Math.min(1,Number(form.geoConfidence)||0)),tlp:form.tlp,origin:'manual',status:form.status,createdAt:existing?.createdAt||now,updatedAt:now};
    await saveManualEvent(event);setMsg(editingId?'Evento actualizado.':'Evento creado y publicado localmente.');setEditingId('');setForm(empty());refresh();
  }

  function edit(e:ManualIntelEvent){setEditingId(e.id);const d=new Date(e.publishedAt);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());setForm({title:e.title,description:e.description,source:e.source,link:e.link,publishedAt:d.toISOString().slice(0,16),country:e.country||'',city:e.city||'',zone:e.zone||'',lat:e.lat?.toString()||'',lng:e.lng?.toString()||'',actors:e.actors.join(', '),tags:e.tags.join(', '),category:e.category,severity:String(e.severity),interestScore:String(e.interestScore),geoConfidence:String(e.geoConfidence),tlp:e.tlp,status:e.status,image:e.image||''});window.scrollTo({top:0,behavior:'smooth'})}
  async function remove(id:string){if(!confirm('¿Eliminar este evento local?'))return;await deleteManualEvent(id);if(editingId===id){setEditingId('');setForm(empty())}refresh()}
  async function photo(file?:File){if(!file)return;if(file.size>5*1024*1024){setMsg('La imagen debe pesar menos de 5 MB.');return}set('image',await fileToDataUrl(file))}
  function exportJson(){const blob=new Blob([JSON.stringify(events,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ghotam-events-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)}
  async function importJson(file?:File){if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data))throw new Error();await replaceManualEvents(data);setMsg(`${data.length} eventos importados.`);refresh()}catch{setMsg('JSON inválido.') }}

  const field='w-full bg-[#091019] border border-[#273747] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500/50';
  return <div className="admin-crud animate-slide-in">
    <div className="intel-page-head"><div><div className="eyebrow">ADMIN / LOCAL DATA ENTRY</div><h2>Event CRUD</h2><p>Crea, edita, elimina, importa y exporta eventos. Los eventos publicados se integran al mapa y al análisis local.</p></div><div className="flex gap-2"><button className="intel-action" onClick={exportJson}><Download size={13}/>EXPORT JSON</button><button className="intel-action" onClick={()=>importRef.current?.click()}><Upload size={13}/>IMPORT JSON</button><input ref={importRef} type="file" accept="application/json" hidden onChange={e=>importJson(e.target.files?.[0])}/></div></div>

    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] gap-3">
      <section className="intel-panel"><div className="flex justify-between"><div><div className="eyebrow">EVENT FORM</div><h3>{editingId?'Editar evento':'Nuevo evento'}</h3></div>{editingId&&<button onClick={()=>{setEditingId('');setForm(empty())}} className="text-slate-500"><X size={16}/></button>}</div>
        <div className="admin-form-grid mt-4">
          <label className="col-span-2">Título<input className={field} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Nombre del evento"/></label>
          <label className="col-span-2">Descripción<textarea className={`${field} min-h-28 resize-y`} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Qué ocurrió, contexto, evidencia..."/></label>
          <label>Fecha y hora<input type="datetime-local" className={field} value={form.publishedAt} onChange={e=>set('publishedAt',e.target.value)}/></label>
          <label>Categoría<select className={field} value={form.category} onChange={e=>set('category',e.target.value)}><option>geopolitics</option><option>world</option><option>cyber</option><option>economics</option><option>policy</option><option>institutions</option><option>security</option><option>humanitarian</option><option>infrastructure</option><option>other</option></select></label>
          <label>País<input className={field} value={form.country} onChange={e=>set('country',e.target.value)} placeholder="Colombia"/></label>
          <label>Ciudad<input className={field} value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Manizales"/></label>
          <label>Zona / sector<input className={field} value={form.zone} onChange={e=>set('zone',e.target.value)} placeholder="La Enea / Zona Norte"/></label>
          <div className="grid grid-cols-2 gap-2"><label>Latitud<input className={field} value={form.lat} onChange={e=>set('lat',e.target.value)} placeholder="5.0703"/></label><label>Longitud<input className={field} value={form.lng} onChange={e=>set('lng',e.target.value)} placeholder="-75.5138"/></label></div>
          <label>Severidad 0–10<input type="number" min="0" max="10" step="0.1" className={field} value={form.severity} onChange={e=>set('severity',e.target.value)}/></label>
          <label>Interest Score 0–100<input type="number" min="0" max="100" className={field} value={form.interestScore} onChange={e=>set('interestScore',e.target.value)}/></label>
          <label>Geo confidence 0–1<input type="number" min="0" max="1" step="0.01" className={field} value={form.geoConfidence} onChange={e=>set('geoConfidence',e.target.value)}/></label>
          <label>TLP<select className={field} value={form.tlp} onChange={e=>set('tlp',e.target.value as ManualIntelEvent['tlp'])}><option>TLP:CLEAR</option><option>TLP:GREEN</option><option>TLP:AMBER</option><option>TLP:AMBER+STRICT</option><option>TLP:RED</option></select></label>
          <label>Estado<select className={field} value={form.status} onChange={e=>set('status',e.target.value as ManualIntelEvent['status'])}><option value="published">published</option><option value="draft">draft</option></select></label>
          <label>Fuente<input className={field} value={form.source} onChange={e=>set('source',e.target.value)} placeholder="Observación local / informe"/></label>
          <label className="col-span-2">URL / referencia<input className={field} value={form.link} onChange={e=>set('link',e.target.value)} placeholder="https://... o referencia interna"/></label>
          <label className="col-span-2">Actores <span>separados por coma</span><input className={field} value={form.actors} onChange={e=>set('actors',e.target.value)} placeholder="Actor A, Actor B, Organización C"/></label>
          <label className="col-span-2">Tags <span>separados por coma</span><input className={field} value={form.tags} onChange={e=>set('tags',e.target.value)} placeholder="protesta, energía, seguridad"/></label>
        </div>
        <div className="admin-photo mt-4"><input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>photo(e.target.files?.[0])}/>{form.image?<div className="relative"><img src={form.image} alt="preview"/><button onClick={()=>set('image','')} className="absolute top-2 right-2 bg-black/70 p-1"><X size={14}/></button></div>:<button onClick={()=>fileRef.current?.click()}><ImagePlus size={18}/><span>Subir foto del evento</span><small>JPG, PNG, WEBP · se guarda offline en IndexedDB</small></button>}</div>
        <div className="flex items-center justify-between mt-4"><div className="text-[10px] text-slate-600"><MapPin size={12} className="inline mr-1"/>Para aparecer exactamente en el mapa, agrega latitud y longitud.</div><button onClick={save} className="admin-primary"><Save size={14}/>{editingId?'GUARDAR CAMBIOS':'CREAR EVENTO'}</button></div>{msg&&<div className="intel-note mt-3">{msg}</div>}
      </section>

      <section className="intel-panel min-h-[650px]"><div className="flex justify-between"><div><div className="eyebrow">LOCAL DATABASE</div><h3>Eventos manuales</h3></div><div className="text-right"><strong className="text-xl font-mono">{events.length}</strong><div className="text-[8px] text-slate-600">{mapped} MAPPED</div></div></div>
        <div className="admin-event-list mt-4">{events.map(e=><article key={e.id}><div className="flex gap-3">{e.image&&<img src={e.image} alt=""/>}<div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><small>{e.status.toUpperCase()} · {e.tlp}</small><span className="text-[9px] text-slate-600">S{e.severity}</span></div><b>{e.title}</b><p>{[e.zone,e.city,e.country].filter(Boolean).join(' · ')||'Sin ubicación'}</p><div className="flex gap-2 mt-2"><button onClick={()=>edit(e)}><Edit3 size={12}/>Editar</button><button onClick={()=>remove(e.id)} className="text-red-400"><Trash2 size={12}/>Eliminar</button></div></div></div></article>)}{!events.length&&<div className="text-center py-16 text-slate-600"><Plus className="mx-auto mb-2"/>Aún no has creado eventos locales.</div>}</div>
      </section>
    </div>
  </div>;
}
