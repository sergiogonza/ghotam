import { useEffect, useMemo, useState } from 'react';
import { Send, Loader2, Brain, Radio, Search, MapPin, ExternalLink, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { loadLiveIntel } from '../live/legacyBridge';

const words = (s:string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(w=>w.length>2);
const arr = (v:unknown):string[] => Array.isArray(v) ? v.filter((x):x is string=>typeof x==='string') : [];
const txt = (v:unknown,f='') => typeof v==='string' ? v : f;
const n = (v:unknown,f=0) => Number.isFinite(Number(v)) ? Number(v) : f;

export default function CommandCenter(){
  const [events,setEvents] = useState<any[]>([]);
  const [query,setQuery] = useState('');
  const [answer,setAnswer] = useState('');
  const [matches,setMatches] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  const [status,setStatus] = useState('Cargando registro RSS...');

  useEffect(()=>{
    loadLiveIntel(true).then(e=>{setEvents(Array.isArray(e)?e:[]);setStatus(`${Array.isArray(e)?e.length:0} eventos disponibles`);});
  },[]);

  const topActors = useMemo(()=>{
    const m=new Map<string,number>();
    events.forEach(e=>arr(e.actors).forEach(a=>m.set(a,(m.get(a)||0)+1)));
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
  },[events]);

  const run = async()=>{
    const q=query.trim();
    if(!q||loading)return;
    setLoading(true);setAnswer('');
    const qWords=new Set(words(q));
    const ranked=events.map(e=>{
      const hay=[e.title,e.description,e.source,e.country,e.locationLabel,...arr(e.actors),...arr(e.tags)].join(' ');
      const tokens=words(hay);
      const overlap=tokens.reduce((acc,t)=>acc+(qWords.has(t)?1:0),0);
      return {e,score:overlap*20+n(e.interestScore)+n(e.severity)*2};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12).map(x=>x.e);
    const selected=ranked.length?ranked:events.slice(0,12);
    setMatches(selected);

    const context=selected.map((e,i)=>`[${i+1}] ${txt(e.title,'Event')} | source=${txt(e.source,txt(e.feedId,'RSS'))} | date=${txt(e.publishedAt)} | location=${txt(e.locationLabel,txt(e.country))} | actors=${arr(e.actors).join(', ')} | severity=${n(e.severity)} | ${txt(e.description).slice(0,420)}`).join('\n');

    try{
      const res=await fetch('/api/lm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[
        {role:'system',content:'You are GHOTAM Command Center. Answer only from the supplied public-source event context. Separate observed facts from inference. If evidence is insufficient, say so. Cite source numbers like [1], [2].'},
        {role:'user',content:`Question: ${q}\n\nLIVE CONTEXT:\n${context}`}
      ],temperature:.15,max_tokens:700})});
      const type=res.headers.get('content-type')||'';
      if(res.ok&&type.includes('application/json')){
        const data=await res.json();
        const content=data?.choices?.[0]?.message?.content;
        if(typeof content==='string'&&content.trim()){setAnswer(content);setStatus('MiniCPM5/LM response grounded in live RSS');setLoading(false);return;}
      }
      throw new Error('LM unavailable');
    }catch{
      const actors=new Map<string,number>();
      const locations=new Map<string,number>();
      selected.forEach(e=>{arr(e.actors).forEach(a=>actors.set(a,(actors.get(a)||0)+1));const l=txt(e.locationLabel,txt(e.country));if(l)locations.set(l,(locations.get(l)||0)+1);});
      const actorText=Array.from(actors.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([a,c])=>`${a} (${c})`).join(', ')||'none';
      const locText=Array.from(locations.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([a,c])=>`${a} (${c})`).join(', ')||'none';
      setAnswer(`### Local evidence summary\n\nFound **${selected.length}** relevant public-source events.\n\n**Main actors:** ${actorText}\n\n**Main locations:** ${locText}\n\nThe remote/local language model is not connected on this Netlify deployment, so this is a deterministic retrieval summary rather than an AI interpretation.`);
      setStatus('Local RSS retrieval mode');
    }finally{setLoading(false);}
  };

  return <div className="h-full flex flex-col gap-4">
    <div className="flex items-center justify-between gap-4 flex-wrap"><div><h2 className="text-xl font-bold text-gray-100 flex items-center gap-2"><Brain className="w-5 h-5 text-cyan-400"/>Command Center</h2><p className="text-xs text-gray-500 mt-1">Natural-language query over live RSS · grounded MiniCPM5 when available</p></div><div className="flex items-center gap-2 text-xs text-emerald-400"><Radio size={14}/>{status}</div></div>

    <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-4 flex-1 min-h-0">
      <section className="flex flex-col gap-3 min-h-0">
        <div className="aegis-card p-3 flex gap-2"><textarea value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run();}}} placeholder="Ej. ¿Qué está ocurriendo entre Rusia, Ucrania y NATO?" className="flex-1 min-h-[72px] resize-none rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500/40"/><button onClick={run} disabled={loading||!query.trim()} className="self-stretch px-4 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 disabled:opacity-30">{loading?<Loader2 className="animate-spin" size={18}/>:<Send size={18}/>}</button></div>
        <div className="aegis-card p-5 flex-1 overflow-auto min-h-[360px]">
          {answer?<ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>:<div className="h-full flex items-center justify-center text-center text-gray-600"><div><Sparkles className="w-9 h-9 mx-auto mb-3"/><p className="text-sm text-gray-400">Consulta el registro vivo.</p><p className="text-xs mt-1">Si MiniCPM5 está disponible se usa como capa RAG; si no, GHOTAM responde con recuperación determinista.</p></div></div>}
        </div>
      </section>

      <aside className="space-y-3 overflow-auto min-h-0">
        <div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-2"><Search size={13}/>Evidence</h3><div className="mt-3 space-y-2">{matches.slice(0,10).map((e,i)=><div key={txt(e.id,String(i))} className="p-2 rounded border border-[var(--aegis-border)] bg-[var(--aegis-surface-2)]"><div className="text-[9px] text-gray-600">[{i+1}] {txt(e.source,txt(e.feedId,'RSS'))}</div><div className="text-xs text-gray-200 mt-1 leading-snug">{txt(e.title,'Event')}</div><div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">{(e.locationLabel||e.country)&&<span className="flex items-center gap-1"><MapPin size={9}/>{e.locationLabel||e.country}</span>}<span>S{n(e.severity)}/10</span></div>{e.link&&<a href={e.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] text-cyan-400 mt-1">source<ExternalLink size={9}/></a>}</div>)}</div></div>
        <div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500">Top actors</h3><div className="mt-3 space-y-1.5">{topActors.map(([a,c])=><div key={a} className="flex justify-between text-xs"><span className="text-gray-300">{a}</span><span className="text-gray-600">{c}</span></div>)}</div></div>
      </aside>
    </div>
  </div>;
}
