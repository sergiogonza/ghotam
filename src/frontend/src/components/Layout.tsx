import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Network, Map, ShieldAlert, Activity, Clock, Search,
  Building2, Users, Terminal, Waves, ExternalLink, X, GraduationCap,
  Radio, Share2
} from 'lucide-react';
import { useState } from 'react';
import SearchBar from './SearchBar';

const navItems = [
  { to: '/', icon: Radio, label: 'Live Intelligence' },
  { to: '/ontology', icon: Share2, label: 'Ontology Live' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/command-center', icon: Terminal, label: 'Command Center' },
  { to: '/risk-propagation', icon: Waves, label: 'Risk Propagation' },
  { to: '/map', icon: Map, label: 'Facilities Map' },
  { to: '/graph', icon: Network, label: 'Graph Explorer' },
  { to: '/cases', icon: ShieldAlert, label: 'Risk Cases' },
  { to: '/events', icon: Activity, label: 'Events' },
  { to: '/facilities', icon: Building2, label: 'Facilities' },
  { to: '/persons', icon: Users, label: 'Persons' },
  { to: '/timeline', icon: Clock, label: 'Timeline' },
];

export default function Layout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--aegis-bg)]">
      <aside className="w-60 bg-[var(--aegis-surface)] border-r border-[var(--aegis-border)] flex flex-col overflow-hidden">
        <div className="h-16 flex items-center px-4 gap-3 border-b border-[var(--aegis-border)]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center"><Network className="w-5 h-5 text-white"/></div>
          <div><span className="text-lg font-bold text-cyan-400">GHOTAM</span><div className="text-[9px] text-gray-600 tracking-[.18em]">LIVE INTELLIGENCE</div></div>
        </div>
        <nav className="flex-1 py-3 overflow-auto">
          {navItems.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({isActive}) =>
            `flex items-center px-4 py-2.5 gap-3 text-xs transition-all ${isActive ? 'text-cyan-400 bg-cyan-500/10 border-r-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
            <item.icon className="w-4 h-4"/><span>{item.label}</span>
          </NavLink>)}
        </nav>
        <div className="p-3 border-t border-[var(--aegis-border)]">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/><span className="text-[10px] text-gray-500">Feeds online</span></div>
          <button onClick={()=>setAboutOpen(true)} className="mt-2 flex items-center gap-2 text-[10px] text-gray-600 hover:text-gray-400"><GraduationCap className="w-3 h-3"/>About</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-[var(--aegis-surface)] border-b border-[var(--aegis-border)] flex items-center justify-between px-5">
          <div><h1 className="text-xs font-semibold text-gray-300 uppercase tracking-[.16em]">Ontology-driven public source intelligence</h1><p className="text-[9px] text-gray-600">RSS · GEO · EVENTS · ACTORS · SOURCES</p></div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setSearchOpen(!searchOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] text-gray-400 text-xs"><Search className="w-3.5 h-3.5"/>Search</button>
            <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400">LIVE</div>
          </div>
        </header>
        {searchOpen && <SearchBar onClose={()=>setSearchOpen(false)}/>}
        <main className="flex-1 overflow-auto p-4"><Outlet/></main>
      </div>

      {aboutOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={()=>setAboutOpen(false)}>
        <div className="max-w-xl mx-4 aegis-card p-5" onClick={e=>e.stopPropagation()}>
          <div className="flex justify-between gap-4"><div><h2 className="font-bold text-gray-100">Ghotam Live Intelligence</h2><p className="text-xs text-gray-500 mt-1">Public-source research workspace built on the original AEGIS ontology project.</p></div><button onClick={()=>setAboutOpen(false)}><X className="w-4 h-4"/></button></div>
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">Live RSS items are normalized into Event, Actor, Location and Source objects. Location confidence is conservative: items without a supported location remain unlocated instead of being plotted randomly.</p>
          <a href="https://github.com/sergiogonza/ghotam" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-4 text-xs text-cyan-400">Repository <ExternalLink className="w-3 h-3"/></a>
        </div>
      </div>}
    </div>
  );
}
