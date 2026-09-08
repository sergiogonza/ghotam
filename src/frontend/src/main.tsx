import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { installIntelFetchInterceptor } from './live/offlineStore';
import './index.css';
import './live/live.css';
import './components/admin.css';

installIntelFetchInterceptor();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}

const queryClient=new QueryClient({defaultOptions:{queries:{refetchOnWindowFocus:false,retry:1,staleTime:5_000}}});
createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><App/></BrowserRouter></QueryClientProvider></StrictMode>);
