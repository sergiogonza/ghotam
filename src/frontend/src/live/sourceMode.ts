export type SourceMode='direct'|'alternative'|'social'|'all';
export const SOURCE_MODE_CHANGED='ghotam:source-mode-changed';
const KEY='ghotam-source-mode';
export function getSourceMode():SourceMode{
  if(typeof window==='undefined')return'all';
  const v=localStorage.getItem(KEY);
  return v==='direct'||v==='alternative'||v==='social'||v==='all'?v:'all';
}
export function setSourceMode(mode:SourceMode){
  localStorage.setItem(KEY,mode);
  window.dispatchEvent(new CustomEvent(SOURCE_MODE_CHANGED,{detail:mode}));
}
export function sourceClassOf(e:any){return String(e?.sourceClass||e?.origin||'').toLowerCase()}
export function isAlternativeEvent(e:any){const c=sourceClassOf(e);return c==='alternative'||c==='telegram'}
export function isSocialEvent(e:any){const c=sourceClassOf(e);return c==='social'||c==='bluesky'}
export function filterBySourceMode(events:any[],mode:SourceMode=getSourceMode()){
  if(mode==='all')return events;
  if(mode==='alternative')return events.filter(isAlternativeEvent);
  if(mode==='social')return events.filter(isSocialEvent);
  return events.filter(e=>!isAlternativeEvent(e)&&!isSocialEvent(e));
}
