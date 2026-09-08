import type { Analysis, IntelRecord } from './analysisEngine';

export type AnalyzedIntel = { event: IntelRecord; analysis: Analysis };

const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();

const ALIASES:Record<string,(row:AnalyzedIntel)=>boolean>={
  'black swan':r=>r.analysis.signalClass==='black-swan-candidate',
  'blackswan':r=>r.analysis.signalClass==='black-swan-candidate',
  'black swan candidate':r=>r.analysis.signalClass==='black-swan-candidate',
  'early warning':r=>r.analysis.signalClass==='early-warning-plausible'||r.analysis.signalClass==='early-warning-unusual',
  'earlywarning':r=>r.analysis.signalClass==='early-warning-plausible'||r.analysis.signalClass==='early-warning-unusual',
  'early warning plausible':r=>r.analysis.signalClass==='early-warning-plausible',
  'early warning unusual':r=>r.analysis.signalClass==='early-warning-unusual',
  'established':r=>r.analysis.signalClass==='established',
  'established pattern':r=>r.analysis.signalClass==='established',
  'anomalous':r=>r.analysis.signalClass==='anomalous',
  'anomaly':r=>r.analysis.signalClass==='anomalous',
  'speculative':r=>r.analysis.signalClass==='speculative',
  'critical':r=>r.analysis.riskLevel==='CRITICAL',
  'critical risk':r=>r.analysis.riskLevel==='CRITICAL',
  'high':r=>r.analysis.riskLevel==='HIGH',
  'high risk':r=>r.analysis.riskLevel==='HIGH'||r.analysis.riskLevel==='CRITICAL',
  'elevated':r=>r.analysis.riskLevel==='ELEVATED',
  'guarded':r=>r.analysis.riskLevel==='GUARDED',
  'low risk':r=>r.analysis.riskLevel==='LOW',
  'plausible':r=>r.analysis.quadrant==='plausible-probable'||r.analysis.quadrant==='plausible-unlikely',
  'probable':r=>r.analysis.quadrant==='plausible-probable'||r.analysis.quadrant==='weak-probable',
  'unlikely':r=>r.analysis.quadrant==='plausible-unlikely'||r.analysis.quadrant==='weak-unlikely',
  'high novelty':r=>r.analysis.novelty>=.7,
  'high momentum':r=>r.analysis.momentum>=.7,
  'high impact':r=>r.analysis.impact>=.7,
  'high plausibility':r=>r.analysis.plausibility>=.65,
  'high probability':r=>r.analysis.probability>=.65,
};

export function analyticTerms(row:AnalyzedIntel){
  const a=row.analysis,e=row.event;
  return [
    a.signalClass,
    a.signalClass.replace(/-/g,' '),
    a.riskLevel,
    a.quadrant,
    a.quadrant.replace(/-/g,' '),
    a.patternFamily,
    a.patternFamily.replace(/-/g,' '),
    e.tlp,
    a.riskScore>=6.5?'high risk':'',
    a.novelty>=.7?'high novelty':'',
    a.momentum>=.7?'high momentum':'',
    a.impact>=.7?'high impact':'',
    a.plausibility>=.65?'high plausibility':'',
    a.probability>=.65?'high probability':'',
  ].filter(Boolean).join(' ');
}

export function matchesAnalyticQuery(row:AnalyzedIntel,query:string){
  const q=normalize(query);
  if(!q)return true;
  const alias=ALIASES[q];
  if(alias)return alias(row);
  const text=normalize([
    row.event.title,row.event.description,row.event.country||'',row.event.locationLabel||'',
    row.event.source,row.event.category,row.event.patternFamily,row.event.actors.join(' '),row.event.tags.join(' '),
    analyticTerms(row)
  ].join(' '));
  return q.split(' ').filter(Boolean).every(term=>text.includes(term));
}

export function analyticSearchScore(row:AnalyzedIntel,query:string){
  const q=normalize(query);
  if(!q)return 0;
  let score=matchesAnalyticQuery(row,query)?1:0;
  if(ALIASES[q]&&ALIASES[q](row))score+=3;
  const hay=normalize(row.event.title+' '+row.event.description+' '+row.event.actors.join(' ')+' '+row.event.country);
  if(hay.includes(q))score+=2;
  if(normalize(analyticTerms(row)).includes(q))score+=2.5;
  score+=row.analysis.riskScore/20;
  return score;
}
