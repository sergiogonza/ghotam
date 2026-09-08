import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  Building2,
  Users,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { useDashboardStats, useRiskCases, useEvents } from '../hooks/useApi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const SEVERITY_COLORS = ['#94a3b8', '#60a5fa', '#fbbf24', '#f97316', '#ef4444'];
const TYPE_COLORS = ['#ef4444', '#f97316', '#a855f7', '#06b6d4', '#10b981'];

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: cases } = useRiskCases();
  const { data: events } = useEvents({ minSeverity: 3 });
  const navigate = useNavigate();

  const eventsByType = Array.isArray((stats as any)?.eventsByType) ? (stats as any).eventsByType : [];
  const eventsBySeverity = Array.isArray((stats as any)?.eventsBySeverity) ? (stats as any).eventsBySeverity : [];
  const safeCases = Array.isArray(cases) ? cases : [];
  const safeEvents = Array.isArray(events) ? events : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-cyan-400">Loading intelligence data...</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Facilities', value: (stats as any)?.totalFacilities ?? 0, icon: Building2, color: 'text-blue-400', bgColor: 'bg-blue-500/10', route: '/facilities' },
    { label: 'Total Events', value: (stats as any)?.totalEvents ?? 0, icon: Activity, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', route: '/events' },
    { label: 'Open Cases', value: (stats as any)?.openCases ?? 0, icon: ShieldAlert, color: 'text-red-400', bgColor: 'bg-red-500/10', route: '/cases' },
    { label: 'Critical Alerts', value: (stats as any)?.criticalAlerts ?? 0, icon: AlertTriangle, color: 'text-orange-400', bgColor: 'bg-orange-500/10', route: '/events?minSeverity=4' },
    { label: 'Persons Tracked', value: (stats as any)?.totalPersons ?? 0, icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/10', route: '/persons' },
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Intelligence Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Legacy AEGIS dashboard · backend data appears when the .NET API is connected</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400">Frontend available</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="aegis-card aegis-card-hover p-4 cursor-pointer" onClick={() => navigate(card.route)}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}><card.icon className={`w-4 h-4 ${card.color}`} /></div>
            </div>
            <p className="text-3xl font-bold text-gray-100">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="aegis-card p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Events by Type</h3>
          {eventsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={eventsByType}>
                <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1a2332', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>{eventsByType.map((_: any, i: number) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-xs text-gray-600">Backend .NET no conectado en este despliegue.</div>}
        </div>

        <div className="aegis-card p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Severity Distribution</h3>
          {eventsBySeverity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={eventsBySeverity} dataKey="count" nameKey="severity" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={0}>
                  {eventsBySeverity.map((_: any, i: number) => <Cell key={i} fill={SEVERITY_COLORS[i % SEVERITY_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a2332', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-xs text-gray-600">Sin datos del backend heredado.</div>}
        </div>
      </div>

      <div className="aegis-card p-5">
        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Active Risk Cases</h3><button onClick={() => navigate('/cases')} className="text-xs text-cyan-400 hover:text-cyan-300">View all →</button></div>
        <div className="space-y-3">
          {safeCases.slice(0, 10).map((c) => (
            <div key={c.caseId} onClick={() => navigate(`/graph/${c.caseId}`)} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--aegis-surface-2)] hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-red-500/30">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-red-400" /></div>
              <div className="flex-1"><p className="text-sm font-medium text-gray-200">{c.title}</p><p className="text-xs text-gray-500 mt-0.5">{c.description}</p></div>
              <div className="text-right"><div className="text-sm font-bold text-red-400">{Number(c.riskScore || 0).toFixed(1)}</div><div className="text-xs text-gray-500">Risk Score</div></div>
            </div>
          ))}
          {safeCases.length === 0 && <div className="text-xs text-gray-600">No hay casos porque el backend .NET no está disponible en Netlify.</div>}
        </div>
      </div>

      <div className="aegis-card p-5">
        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Recent Critical Events</h3><button onClick={() => navigate('/events')} className="text-xs text-cyan-400 hover:text-cyan-300">View all →</button></div>
        <div className="space-y-2">
          {safeEvents.slice(0, 10).map((evt) => (
            <div key={evt.eventId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate(`/graph/${evt.eventId}`)}>
              <div className={`w-1.5 h-8 rounded-full ${evt.severity >= 5 ? 'bg-red-500' : evt.severity >= 4 ? 'bg-orange-500' : 'bg-yellow-500'}`} />
              <div className="flex-1"><p className="text-sm text-gray-300">{evt.description}</p><p className="text-xs text-gray-600 mt-0.5">{evt.eventType} · {new Date(evt.timestamp).toLocaleString()}</p></div>
              <span className={`text-xs font-mono font-bold severity-${evt.severity}`}>SEV-{evt.severity}</span>
            </div>
          ))}
          {safeEvents.length === 0 && <div className="text-xs text-gray-600">Los eventos geopolíticos en vivo están disponibles en Live Intelligence.</div>}
        </div>
      </div>
    </div>
  );
}
