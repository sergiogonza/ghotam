export type WatchItem={id:string;label:string;type:string;sourceId?:string;addedAt:string;properties?:Record<string,unknown>};
export type Watchlist={id:string;name:string;description:string;createdAt:string;updatedAt:string;items:WatchItem[]};
const KEY='ghotam:object-sets';
export const WATCHLIST_CHANGED='ghotam:watchlists-changed';
export function listWatchlists():Watchlist[]{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function persist(rows:Watchlist[]){localStorage.setItem(KEY,JSON.stringify(rows));window.dispatchEvent(new Event(WATCHLIST_CHANGED))}
export function createWatchlist(name:string,description=''){const now=new Date().toISOString();const row:Watchlist={id:`SET-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:name.trim()||'Untitled Object Set',description,createdAt:now,updatedAt:now,items:[]};persist([row,...listWatchlists()]);return row}
export function deleteWatchlist(id:string){persist(listWatchlists().filter(x=>x.id!==id))}
export function addWatchItem(setId:string,item:Omit<WatchItem,'addedAt'>){const rows=listWatchlists().map(set=>set.id===setId?{...set,updatedAt:new Date().toISOString(),items:[...set.items.filter(x=>x.id!==item.id),{...item,addedAt:new Date().toISOString()}]}:set);persist(rows)}
export function removeWatchItem(setId:string,itemId:string){persist(listWatchlists().map(set=>set.id===setId?{...set,updatedAt:new Date().toISOString(),items:set.items.filter(x=>x.id!==itemId)}:set))}
