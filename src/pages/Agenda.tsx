import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Calendar as CalendarIcon, LogIn, LogOut, RefreshCw, X, MapPin, AlignLeft, Clock } from 'lucide-react';

const locales = {
    'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const CalendarView = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [calendars, setCalendars] = useState<any[]>([]);
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set());
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<any>(null); // Estado para o modal

    // Estados para controle de navegação (Conserta os botões)
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState<any>('month');

    // Recupera token salvo ao abrir a página
    useEffect(() => {
        const savedToken = localStorage.getItem('google_access_token');
        const tokenExpiration = localStorage.getItem('google_token_expires');

        if (savedToken && tokenExpiration) {
            const now = new Date().getTime();
            if (now < parseInt(tokenExpiration)) {
                loadAllCalendarsAndEvents(savedToken);
            } else {
                localStorage.removeItem('google_access_token');
                localStorage.removeItem('google_token_expires');
            }
        }
    }, []);

    // Configuração do Login Google
    const login = useGoogleLogin({
        onSuccess: tokenResponse => {
            // Salva token por 50 minutos (tokens do Google duram 1h)
            const expiresIn = new Date().getTime() + 50 * 60 * 1000;
            localStorage.setItem('google_access_token', tokenResponse.access_token);
            localStorage.setItem('google_token_expires', expiresIn.toString());

            loadAllCalendarsAndEvents(tokenResponse.access_token);
        },
        scope: 'https://www.googleapis.com/auth/calendar.readonly'
    });

    const logout = () => {
        setIsConnected(false);
        setEvents([]);
        setCalendars([]);
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expires');
    };

    const loadAllCalendarsAndEvents = useCallback(async (accessToken: string) => {
        setIsLoading(true);
        // Não resetar isConnected aqui para evitar flicker se já estiver conectado
        try {
            // 1. Listar todos os calendários do usuário
            const calendarsResponse = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const calendarItems = calendarsResponse.data.items;

            // Preserva seleção anterior se existir, senão seleciona todos
            setCalendars(calendarItems);
            setSelectedCalendarIds(prev => {
                if (prev.size > 0) return prev;
                return new Set(calendarItems.map((c: any) => c.id));
            });

            // 2. Para cada calendário, buscar os eventos
            const eventsPromises = calendarItems.map(async (calendar: any) => {
                try {
                    const response = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                        params: {
                            timeMin: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString(), // 1 ano atrás
                            showDeleted: false,
                            singleEvents: true,
                            orderBy: 'startTime',
                        }
                    });

                    return response.data.items.map((item: any) => ({
                        title: item.summary,
                        description: item.description, // Capturando descrição
                        location: item.location,       // Capturando local
                        start: new Date(item.start.dateTime || item.start.date),
                        end: new Date(item.end.dateTime || item.end.date),
                        allDay: !item.start.dateTime,
                        resource: {
                            calendarColor: calendar.backgroundColor,
                            calendarId: calendar.id
                        }
                    }));
                } catch (err) {
                    console.warn(`Erro ao ler calendário ${calendar.summary}`, err);
                    return [];
                }
            });

            const results = await Promise.all(eventsPromises);
            const allEvents = results.flat();

            setEvents(allEvents);
            setLastUpdated(new Date());
            setIsConnected(true);
        } catch (error: any) {
            console.error('Erro ao carregar agenda', error);
            if (error.response && error.response.status === 401) {
                // Token expirou
                logout();
                alert('Sua sessão do Google expirou. Por favor, conecte novamente.');
            } else {
                alert('Erro ao carregar agenda do Google. Tente novamente.');
                setIsConnected(false);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Atualização Automática a cada 60 segundos
    useEffect(() => {
        if (!isConnected) return;

        const interval = setInterval(() => {
            const token = localStorage.getItem('google_access_token');
            if (token) {
                loadAllCalendarsAndEvents(token);
            }
        }, 60000); // 60 segundos

        return () => clearInterval(interval);
    }, [isConnected, loadAllCalendarsAndEvents]);

    const handleManualRefresh = () => {
        const token = localStorage.getItem('google_access_token');
        if (token) {
            loadAllCalendarsAndEvents(token);
        }
    };

    const toggleCalendar = (calendarId: string) => {
        const newSelected = new Set(selectedCalendarIds);
        if (newSelected.has(calendarId)) {
            newSelected.delete(calendarId);
        } else {
            newSelected.add(calendarId);
        }
        setSelectedCalendarIds(newSelected);
    };

    const filteredEvents = events.filter(e => selectedCalendarIds.has(e.resource.calendarId));

    const eventPropGetter = (event: any) => {
        const backgroundColor = event.resource?.calendarColor || '#3174ad';
        return { style: { backgroundColor } };
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [year, month] = e.target.value.split('-');
        const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        setDate(newDate);
    };

    // Handler para clique no evento
    const handleSelectEvent = (event: any) => {
        setSelectedEvent(event);
    };

    return (
        <div className="space-y-6 relative">
            {/* Modal de Detalhes do Evento */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 flex justify-between items-start" style={{ backgroundColor: selectedEvent.resource?.calendarColor || '#3174ad' }}>
                            <h3 className="text-white font-bold text-lg pr-4">{selectedEvent.title}</h3>
                            <button onClick={() => setSelectedEvent(null)} className="text-white/80 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-3 text-slate-600">
                                <Clock className="w-5 h-5 mt-0.5 text-slate-400 shrink-0" />
                                <div>
                                    <p className="font-medium text-slate-900">
                                        {format(selectedEvent.start, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                    </p>
                                    <p className="text-sm">
                                        {selectedEvent.allDay
                                            ? 'Dia inteiro'
                                            : `${format(selectedEvent.start, 'HH:mm')} - ${format(selectedEvent.end, 'HH:mm')}`
                                        }
                                    </p>
                                </div>
                            </div>

                            {selectedEvent.location && (
                                <div className="flex items-start gap-3 text-slate-600">
                                    <MapPin className="w-5 h-5 mt-0.5 text-slate-400 shrink-0" />
                                    <p className="text-sm leading-relaxed">{selectedEvent.location}</p>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="flex items-start gap-3 text-slate-600">
                                    <AlignLeft className="w-5 h-5 mt-0.5 text-slate-400 shrink-0" />
                                    <div
                                        className="text-sm leading-relaxed prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: selectedEvent.description }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <CalendarIcon className="text-[var(--primary)] text-2xl" /> Agenda
                        </h1>
                        <p className="text-slate-500">Visualize seus compromissos do Google Agenda</p>
                    </div>

                    {!isConnected ? (
                        <button
                            onClick={() => login()}
                            className="btn btn-primary flex items-center gap-2"
                            disabled={isLoading}
                        >
                            <LogIn size={18} />
                            {isLoading ? 'Conectando...' : 'Conectar Google Agenda'}
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Conectado
                            </div>

                            <button
                                onClick={handleManualRefresh}
                                className={`p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors ${isLoading ? 'animate-spin' : ''}`}
                                title="Atualizar agora"
                            >
                                <RefreshCw size={18} />
                            </button>

                            <button
                                onClick={logout}
                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                                title="Desconectar"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {isConnected && (
                    <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 border-r border-slate-200 pr-4 mr-2">
                            <span className="text-sm font-medium text-slate-600">Ir para:</span>
                            <input
                                type="month"
                                className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                onChange={handleMonthChange}
                                value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3 flex-1">
                            {calendars.map(cal => (
                                <label key={cal.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-slate-50 px-2 py-1 rounded transition-colors select-none">
                                    <input
                                        type="checkbox"
                                        checked={selectedCalendarIds.has(cal.id)}
                                        onChange={() => toggleCalendar(cal.id)}
                                        className="rounded focus:ring-[var(--primary)] text-[var(--primary)]"
                                        style={{ accentColor: cal.backgroundColor }}
                                    />
                                    <span style={{ color: cal.backgroundColor, fontSize: '1.2em', lineHeight: 0.8 }}>●</span>
                                    <span className="text-slate-700 font-medium">{cal.summary}</span>
                                </label>
                            ))}
                        </div>

                        {lastUpdated && (
                            <div className="text-xs text-slate-400 ml-auto hidden md:block">
                                Atualizado às {format(lastUpdated, 'HH:mm')}
                            </div>
                        )}
                    </div>
                )}
            </header>

            <div className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-[600px] transition-opacity duration-200 ${isLoading ? 'opacity-70' : 'opacity-100'}`}>
                <Calendar
                    localizer={localizer}
                    events={filteredEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    culture="pt-BR"

                    // Controlled Props
                    date={date}
                    view={view}
                    onNavigate={setDate}
                    onView={setView}

                    // Event Handling
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventPropGetter}
                    messages={{
                        today: 'Hoje',
                        previous: 'Anterior',
                        next: 'Próximo',
                        month: 'Mês',
                        week: 'Semana',
                        day: 'Dia',
                        agenda: 'Agenda',
                        date: 'Data',
                        time: 'Hora',
                        event: 'Evento',
                        noEventsInRange: 'Não há eventos neste período.',
                    }}
                />
            </div>
        </div>
    );
};

export const Agenda = () => {
    const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

    if (!GOOGLE_CLIENT_ID) {
        return (
            <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">Configuração Necessária</h2>
                <p className="text-slate-600 mb-4 max-w-md mx-auto">
                    Para usar a Agenda, você precisa configurar o <strong>VITE_GOOGLE_CLIENT_ID</strong> no arquivo <code>.env</code>.
                </p>
            </div>
        )
    }

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <CalendarView />
        </GoogleOAuthProvider>
    );
};
