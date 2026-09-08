export type SourceMode='direct'|'alternative'|'all';
export const SOURCE_MODE_CHANGED='ghotam:source-mode-changed';
const KEY='ghotam-source-mode';
export function getSourceMode():SourceMode{
  if(typeof window==='undefined')return'all';
  const v=localStorage.getItem(KEY);
  return v==='direct'||v==='alternative'||v==='all'?v:'all';
}
export function setSourceMode(mode:SourceMode){
  localStorage.setItem(KEY,mode);
  window.dispatchEvent(new CustomEvent(SOURCE_MODE_CHANGED,{detail:mode}));
}
export function isAlternativeEvent(e:any){return String(e?.sourceClass||e?.origin||'').toLowerCase()==='alternative'||String(e?.origin||'').toLowerCase()==='telegram'}
export function filterBySourceMode(events:any[],mode:SourceMode=getSourceMode()){
  if(mode==='all')return events;
  return events.filter(e=>mode==='alternative'?isAlternativeEvent(e):!isAlternativeEvent(e));
}
