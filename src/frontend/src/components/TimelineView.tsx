import { useEffect, useRef, useMemo, useState } from 'react';
import { useEvents } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import { DataSet } from 'vis-data';
import { Timeline } from 'vis-timeline';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import { Clock, Filter, Activity, Layers } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  Geopolitical: '#ef4444',
  World: '#06b6d4',
  CyberAlert: '#a855f7',
  Policy: '#3b82f6',
  Economic: '#10b981',
  OpenSourceIntel: '#64748b',
};

const SEVERITY_LABELS = ['Info', 'Low', 'Medium', 'High', 'Critical', 'Emergency'];
const SEVERITY_COLORS = ['#64748b', '#22d3ee', '#eab308', '#f97316', '#ef4444', '#dc2626'];
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));

function timelineItemId(eventId: string, index: number) {
  return `TL:${eventId}:${index}`;
}

export default function TimelineView() {
  const { data: events = [], isLoading } = useEvents();
  const timelineRef = useRef<HTMLDivElement>(null);
  const tlInstanceRef = useRef<Timeline | null>(null);
  const navigate = useNavigate();
  const [minSeverity, setMinSeverity] = useState(2);

  const safeEvents = Array.isArray(events) ? events : [];
  const filtered = useMemo(
    () => safeEvents.filter(e => Number(e?.severity) >= minSeverity && Number.isFinite(Date.parse(e?.timestamp || ''))),
    [safeEvents, minSeverity],
  );

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => map.set(e.eventType || 'OpenSourceIntel', (map.get(e.eventType || 'OpenSourceIntel') || 0) + 1));
    return map;
  }, [filtered]);

  const sevCounts = useMemo(() => {
    const map = new Map<number, number>();
    safeEvents.forEach(e => map.set(Number(e.severity) || 0, (map.get(Number(e.severity) || 0) || 0) + 1));
    return map;
  }, [safeEvents]);

  useEffect(() => {
    if (!timelineRef.current) return;
    if (tlInstanceRef.current) {
      tlInstanceRef.current.destroy();
      tlInstanceRef.current = null;
    }
    if (filtered.length === 0) return;

    const typeSet = new Set(filtered.map(e => e.eventType || 'OpenSourceIntel'));
    const groups = new DataSet(
      Array.from(typeSet).map(type => ({
        id: type,
        content: `<div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${TYPE_COLORS[type] || '#64748b'}"></span><span style="color:#d1d5db;font-size:12px;font-weight:500">${esc(type)}</span><span style="color:#6b7280;font-size:10px">(${typeCounts.get(type) || 0})</span></div>`,
        style: `border-left:3px solid ${TYPE_COLORS[type] || '#64748b'};`,
      })),
    );

    const originalByTimelineId = new Map<string, string>();
    const items = new DataSet(filtered.map((evt, index) => {
      const sev = Math.max(0, Math.min(5, Number(evt.severity) || 0));
      const description = evt.description || 'Event';
      const short = description.length > 80 ? description.slice(0, 80) + '…' : description;
      const uniqueId = timelineItemId(String(evt.eventId || 'event'), index);
      originalByTimelineId.set(uniqueId, String(evt.eventId || ''));
      return {
        id: uniqueId,
        group: evt.eventType || 'OpenSourceIntel',
        content: `<span style="font-size:11px">${esc(short)}</span>`,
        start: new Date(evt.timestamp),
        style: `background-color:${SEVERITY_COLORS[sev]}18;border-color:${SEVERITY_COLORS[sev]};border-left:3px solid ${SEVERITY_COLORS[sev]};color:${SEVERITY_COLORS[sev]};border-radius:4px;padding:2px 6px;font-size:11px;`,
        title: `${description}\n\nType: ${evt.eventType}\nSeverity: ${SEVERITY_LABELS[sev]} (${sev})\nDate: ${new Date(evt.timestamp).toLocaleString()}${evt.facilityName ? `\nLocation: ${evt.facilityName}` : ''}${evt.personName ? `\nActor: ${evt.personName}` : ''}`,
      };
    }));

    const times = filtered.map(e => Date.parse(e.timestamp)).filter(Number.isFinite).sort((a,b) => a-b);
    const minTs = times[0];
    const maxTs = times[times.length - 1];
    const span = Math.max(6 * 60 * 60 * 1000, maxTs - minTs);
    const pad = Math.max(60 * 60 * 1000, span * 0.08);

    const timeline = new Timeline(timelineRef.current, items, groups, {
      height: '100%',
      min: new Date(minTs - pad),
      max: new Date(maxTs + pad),
      start: new Date(minTs - pad / 2),
      end: new Date(maxTs + pad / 2),
      zoomMin: 1000 * 60 * 30,
      zoomMax: 1000 * 60 * 60 * 24 * 180,
      orientation: 'top',
      showCurrentTime: true,
      stack: true,
      selectable: true,
      groupOrder: 'content',
      margin: { item: { horizontal: 5, vertical: 5 } },
      tooltip: { followMouse: true, overflowMethod: 'flip' },
    });

    timeline.on('select', (props: { items: string[] }) => {
      const selectedTimelineId = String(props.items?.[0] || '');
      const originalEventId = originalByTimelineId.get(selectedTimelineId);
      if (originalEventId) navigate(`/graph/${encodeURIComponent(originalEventId)}`);
    });

    tlInstanceRef.current = timeline;
    return () => {
      timeline.destroy();
      tlInstanceRef.current = null;
    };
  }, [filtered, navigate, typeCounts]);

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-400" />Event Timeline</h2>
          <p className="text-xs text-gray-500 mt-1">{filtered.length} events (of {safeEvents.length}) · Live RSS registry · Click to investigate</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs text-gray-500">Min severity:</span>
          {SEVERITY_LABELS.map((label, i) => (
            <button key={i} onClick={() => setMinSeverity(i)} className={`px-2 py-1 rounded text-xs transition-all flex items-center gap-1 ${minSeverity === i ? 'border font-medium' : 'text-gray-400 hover:text-gray-200'}`} style={minSeverity === i ? { backgroundColor: SEVERITY_COLORS[i] + '25', borderColor: SEVERITY_COLORS[i] + '50', color: SEVERITY_COLORS[i] } : {}}>
              {label}<span className="text-[10px] opacity-60">({sevCounts.get(i) || 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
        {Array.from(typeCounts.entries()).sort(([,a],[,b]) => b-a).map(([type,count]) => (
          <div key={type} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: TYPE_COLORS[type] || '#64748b'}}/><span className="text-[11px] text-gray-400">{type}</span><span className="text-[10px] text-gray-600">{count}</span></div>
        ))}
      </div>

      <div className="flex-1 aegis-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><div className="flex items-center gap-2 text-cyan-400 animate-pulse"><Clock className="w-5 h-5"/>Loading timeline...</div></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500"><Layers className="w-8 h-8 text-gray-600"/><p className="text-sm">No events with severity ≥ {SEVERITY_LABELS[minSeverity]}</p><button onClick={() => setMinSeverity(0)} className="text-xs text-cyan-400 hover:text-cyan-300">Show all</button></div>
        ) : <div ref={timelineRef} className="w-full h-full min-h-[500px]"/>}
      </div>
    </div>
  );
}
