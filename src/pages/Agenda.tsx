import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Calendar as CalendarIcon, LogIn, LogOut, RefreshCw, X, MapPin, AlignLeft, Clock, Check, User as UserIcon, AlertCircle, DollarSign, Loader2, Stethoscope, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Procedure, Paciente, Consulta, AppointmentStatus } from '../types/db';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlag } from '../hooks/useFeatureFlag';

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

// Mapping Google Calendar Colors to Hex
const GOOGLE_EVENT_COLORS: Record<string, string> = {
    "1": "#7986cb", // Lavender
    "2": "#33b679", // Sage
    "3": "#8e24aa", // Grape (Roxo)
    "4": "#e67c73", // Flamingo
    "5": "#f6bf26", // Banana
    "6": "#f4511e", // Tangerine
    "7": "#039be5", // Peacock
    "8": "#616161", // Graphite
    "9": "#3f51b5", // Blueberry
    "10": "#0b8043", // Basil (Verde)
    "11": "#d50000"  // Tomato (Vermelho)
};

// ... (Keep existing imports/localizer)

const CalendarView = () => {
    const { user, profile } = useAuth();
    const showFinance = useFeatureFlag('financial_module');
    const isSimpleMode = profile?.plan_config?.simple_mode || false;
    const isDentist = profile?.role === 'dentist';

    const [events, setEvents] = useState<any[]>([]);
    const [calendars, setCalendars] = useState<any[]>([]);
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set());
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    const [date, setDate] = useState(new Date());
    const [view, setView] = useState<any>('month');

    // New State for System Integration
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [patients, setPatients] = useState<Paciente[]>([]);
    const [linkedAppointment, setLinkedAppointment] = useState<Consulta | null>(null);
    const [loadingLink, setLoadingLink] = useState(false);

    // Form State for Modal
    const [selectedProcedureId, setSelectedProcedureId] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionForm, setCompletionForm] = useState({
        queixa: '',
        evolucao: '',
        medicamentos: '',
        procedure_id: '',
        valor: '',
        payment_method: 'none'
    });

    // Mapped State
    const [dentistMap, setDentistMap] = useState<Record<string, string>>({}); // CalendarID -> UserID

    useEffect(() => {
        if (user) {
            // Load Procedures and Patients
            Promise.all([
                supabase.from('procedures').select('*').order('name'),
                supabase.from('pacientes').select('*').order('nome')
            ]).then(([procRes, patRes]) => {
                if (procRes.data) setProcedures(procRes.data);
                if (patRes.data) setPatients(patRes.data);
            });

            // Load Profiles map (Calendar -> User)
            supabase.from('profiles').select('id, linked_calendar_id')
                .not('linked_calendar_id', 'is', null)
                .then(({ data }) => {
                    const map: Record<string, string> = {};
                    console.log('DEBUG: Raw Profiles Data for Map', data);

                    data?.forEach(p => {
                        if (p.linked_calendar_id) {
                            const cleanId = p.linked_calendar_id.trim();
                            map[cleanId] = p.id;
                        }
                    });
                    console.log('DEBUG: Generated Dentist Map', map);
                    setDentistMap(map);
                });

            // Restore Google Session
            const storedToken = localStorage.getItem('google_access_token');
            if (storedToken) {
                setAccessToken(storedToken);
                setIsConnected(true);
                loadAllCalendarsAndEvents(storedToken);
            }
        }
    }, [user]);

    // Login Hook
    const login = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
        onSuccess: async (tokenResponse) => {
            localStorage.setItem('google_access_token', tokenResponse.access_token);
            setAccessToken(tokenResponse.access_token);
            setIsConnected(true);
            await loadAllCalendarsAndEvents(tokenResponse.access_token);
        },
        onError: error => console.error('Login Failed:', error)
    });

    const logout = () => {
        localStorage.removeItem('google_access_token');
        setAccessToken(null);
        setIsConnected(false);
        setEvents([]);
        setCalendars([]);
        setSelectedCalendarIds(new Set());
    };

    const loadAllCalendarsAndEvents = async (token: string) => {
        setIsLoading(true);
        try {
            // 1. Fetch Calendars
            const calRes = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
                headers: { Authorization: `Bearer ${token}` }
            });

            let loadedCalendars = calRes.data.items || [];

            // DENTIST FILTER ENFORCEMENT
            if (isDentist && profile?.linked_calendar_id) {
                loadedCalendars = loadedCalendars.filter((c: any) => c.id === profile.linked_calendar_id);
            } else if (isDentist) {
                // Dentist needs a linked calendar but has none
                // Keep empty or show a warning?
                // Let's show primary if nothing linked? No, strictly linked for security.
                loadedCalendars = [];
                console.warn("Dentista sem agenda vinculada no perfil.");
            }

            setCalendars(loadedCalendars);

            // Auto-select all calendars initially (or just the dentist's one)
            const initialIds = new Set<string>(loadedCalendars.map((c: any) => String(c.id)));
            setSelectedCalendarIds(initialIds);


            // 2. Fetch Events for selected calendars
            const start = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
            const end = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);
            await fetchEventsForCalendars(token, loadedCalendars, initialIds, start, end);
            setLastUpdated(new Date());

        } catch (error) {
            console.error("Error loading calendar data", error);
            alert("Erro ao carregar agenda. Verifique as permissões.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEventsForCalendars = async (token: string, cals: any[], ids: Set<string>, start: Date, end: Date) => {
        const allEvents: any[] = [];
        const timeMin = start.toISOString();
        const timeMax = end.toISOString();
        console.log('DEBUG: Fetching Events Range', { timeMin, timeMax });

        const promises = cals.filter(c => ids.has(c.id)).map(async (cal) => {
            try {
                const updatedMin = timeMin; // Optimization: Could adapt based on view
                const res = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        timeMin: timeMin,
                        timeMax: timeMax,
                        singleEvents: true,
                        orderBy: 'startTime',
                        maxResults: 250
                    }
                });

                const mapped = (res.data.items || []).map((ev: any) => ({
                    ...ev,
                    title: ev.summary || '(Sem Título)', // Required by React-Big-Calendar
                    start: new Date(ev.start.dateTime || ev.start.date),
                    end: new Date(ev.end.dateTime || ev.end.date),
                    allDay: !ev.start.dateTime,
                    // Resolve Color: Event Color > Calendar Color > Default
                    backgroundColor: ev.colorId ? GOOGLE_EVENT_COLORS[ev.colorId] : (cal.backgroundColor || '#3174ad'),
                    resource: { calendarId: cal.id, calendarColor: cal.backgroundColor }
                }));
                return mapped;
            } catch (e) {
                console.warn(`Failed to fetch events for ${cal.summary}`, e);
                return [];
            }
        });

        const results = await Promise.all(promises);
        results.forEach(arr => allEvents.push(...arr));
        setEvents(allEvents);
    };

    const handleManualRefresh = () => {
        if (accessToken) loadAllCalendarsAndEvents(accessToken);
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [y, m] = e.target.value.split('-');
        const newDate = new Date(parseInt(y), parseInt(m) - 1, 1);
        setDate(newDate);
        // Trigger fetch if date changed significantly (not implemented here for brevity, usually useEffect on date)
    };

    // Re-fetch when date changes (debounced ideally, but here simple)
    // Re-fetch when date changes (debounced ideally, but here simple)
    useEffect(() => {
        if (isConnected && accessToken && calendars.length > 0) {
            const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 2, 0);
            fetchEventsForCalendars(accessToken, calendars, selectedCalendarIds, start, end);
        }
    }, [date]); // Simple trigger

    const toggleCalendar = (id: string) => {
        const newSet = new Set(selectedCalendarIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedCalendarIds(newSet);

        if (accessToken) {
            const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 2, 0);
            fetchEventsForCalendars(accessToken, calendars, newSet, start, end);
        }
    };

    // Filtered Events logic is actually redundant if we only fetch what we want,
    // but useful for client-side toggling without API calls if we cached enough.
    // In this implementation, fetchEventsForCalendars updates 'events' state directly based on selected IDs.
    const filteredEvents = events;

    // Handle Event Click -> Load Linked Data
    const handleSelectEvent = async (event: any) => {
        setSelectedEvent(event);
        setLinkedAppointment(null);
        setSelectedProcedureId('');
        setSelectedPatientId('');
        setLoadingLink(true);

        try {
            // Try to find appointment by google_event_id
            const { data, error } = await supabase
                .from('consultas')
                .select('*, paciente:pacientes(*), procedure:procedures(*)')
                .eq('google_event_id', event.id || '') // Google Event ID should be string
                .maybeSingle();

            if (data) {
                setLinkedAppointment(data as any);
                setSelectedProcedureId(data.procedure_id || '');
                setSelectedPatientId(data.paciente_id);
            } else {
                // Smart guess patient by title? (Optional)
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingLink(false);
        }
    };

    // Action: Link/Create Appointment
    // Action: Link/Create Appointment
    const handleLinkAppointment = async () => {
        if (!selectedPatientId) return alert('Selecione um paciente');
        setLoadingLink(true);
        try {
            // Determine Professional (based on Calendar Owner)
            const rawCalendarId = selectedEvent.resource?.calendarId;
            const calendarId = rawCalendarId ? rawCalendarId.trim() : '';

            let professionalId = dentistMap?.[calendarId];

            // SECURITY CHECK: If no dentist mapped, prevent "Secretary" attribution
            if (!professionalId) {
                // EXEMPTION: Simple Mode (Single Dentist/Owner)
                if (isSimpleMode) {
                    professionalId = profile?.owner_id || user?.id || '';
                    console.log('DEBUG: Simple Mode - Auto-binding to Owner', professionalId);
                }
                // Fallback for Dentist/Owner linking their own calendar
                else if (profile?.role === 'dentist' || profile?.role === 'clinic_owner') {
                    professionalId = user?.id || '';
                    console.log('DEBUG: Using self-ID as fallback (Role Dentist/Owner)');
                } else {
                    // Critical Error for Secretaries in PRO/MULTI Mode
                    const errMessage = `ERRO DE VINCULAÇÃO:\n\nNão identifiquei o Dentista desta agenda (${calendarId}).\n\nNo Plano Pro/Equipe, é necessário vincular o ID da agenda ao Dentista na tela de 'Equipe'.`;
                    alert(errMessage);
                    console.error('Link Blocked: Missing Dentist Mapping', calendarId);
                    setLoadingLink(false);
                    return;
                }
            }

            console.log('DEBUG: Linking Appointment', {
                calendarId,
                mapResult: dentistMap ? dentistMap[calendarId] : 'No Map',
                finalProfessionalId: professionalId
            });

            const payload = {
                user_id: professionalId,
                owner_id: profile?.owner_id || user?.id, // Ensure Clinic Scope
                paciente_id: selectedPatientId,
                procedure_id: selectedProcedureId || null,
                data_consulta: selectedEvent.start.toISOString(),
                google_event_id: selectedEvent.id || 'manual_sync', // Fallback
                status: 'scheduled' as AppointmentStatus
            };

            const { data, error } = await supabase.from('consultas').insert(payload).select().single();
            if (error) throw error;
            setLinkedAppointment(data as any);
            alert('Vinculado com sucesso!');
        } catch (err: any) {
            alert('Erro ao vincular: ' + err.message);
        } finally {
            setLoadingLink(false);
        }
    };

    // Action: Open Completion Modal
    const handleComplete = () => {
        if (!linkedAppointment) return;

        // Pre-fill form
        const proc = procedures.find(p => p.id === selectedProcedureId || p.id === linkedAppointment.procedure_id);
        const valor = proc ? proc.price : 0;

        setCompletionForm({
            queixa: linkedAppointment.queixa || '',
            evolucao: linkedAppointment.evolucao || '',
            medicamentos: linkedAppointment.medicamentos || '',
            procedure_id: selectedProcedureId || linkedAppointment.procedure_id || '',
            valor: valor.toString(),
            payment_method: 'none'
        });

        setShowCompletionModal(true);
    };

    // Helper: Update Google Calendar Event (Title & Color)
    const updateGoogleEvent = async (calendarId: string, eventId: string, currentTitle: string, tag: string, colorId: string) => {
        if (!accessToken) return;
        try {
            const safeTitle = currentTitle || '';
            const cleanTitle = safeTitle.replace(/^\[.*?\]\s*/, '');
            const newTitle = `${tag} ${cleanTitle}`;

            await axios.patch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
                {
                    summary: newTitle,
                    colorId: colorId
                },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            // Optimistically update local state
            const updatedArgs: any = {
                summary: newTitle,
                title: newTitle // Explicitly update title for RBC
            };
            if (colorId && GOOGLE_EVENT_COLORS[colorId]) {
                updatedArgs.backgroundColor = GOOGLE_EVENT_COLORS[colorId];
                updatedArgs.colorId = colorId;
            }

            if (selectedEvent && selectedEvent.id === eventId) {
                setSelectedEvent({ ...selectedEvent, ...updatedArgs });
            }
            setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, ...updatedArgs } : ev));

        } catch (error: any) {
            console.error('Failed to update Google Calendar event', error);
            if (error?.response?.status === 401) {
                alert("Sessão do Google EXPIROU. Desconecte e conecte novamente a agenda.");
            } else {
                console.warn("Erro ao atualizar Google Calendar:", error);
            }
        }
    };

    // Action: Actual Save
    const handleConfirmCompletion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkedAppointment) return;

        setLoadingLink(true);

        try {
            let commission = 0;
            const finalProcedureId = completionForm.procedure_id || selectedProcedureId;

            if (finalProcedureId) {
                const proc = procedures.find(p => p.id === finalProcedureId);
                if (proc) {
                    // Determine percentage: Specific Rule -> Default Procedure
                    let percentage = proc.commission_percentage;

                    // Check for exception rule
                    if (linkedAppointment.user_id) {
                        const { data: rule } = await supabase
                            .from('dentist_commissions')
                            .select('commission_percentage')
                            .eq('dentist_id', linkedAppointment.user_id)
                            .eq('procedure_id', finalProcedureId)
                            .eq('active', true)
                            .maybeSingle();

                        if (rule) {
                            percentage = rule.commission_percentage;
                        }
                    }

                    // Calculate based on captured Value (allows overriding price)
                    // Profit = CapturedValue - LabCost
                    const valorCobrado = parseFloat(completionForm.valor) || 0;
                    const profit = valorCobrado - (proc.lab_cost || 0);
                    commission = profit > 0 ? profit * (percentage / 100) : 0;
                }
            }

            const { error } = await supabase
                .from('consultas')
                .update({
                    status: 'completed',
                    procedure_id: finalProcedureId || null,
                    procedimento: finalProcedureId ? (procedures.find(p => p.id === finalProcedureId)?.name || '') : '', // Save Name Snapshot
                    recorded_commission: commission,
                    queixa: completionForm.queixa,
                    evolucao: completionForm.evolucao,
                    medicamentos: completionForm.medicamentos,
                    valor_consulta: parseFloat(completionForm.valor) || 0,
                    // end_time: new Date().toISOString()
                })
                .eq('id', linkedAppointment.id);

            if (error) throw error;

            // Update Patient's Last Professional (Live History)
            if (linkedAppointment.paciente_id && linkedAppointment.user_id) {
                await supabase
                    .from('pacientes')
                    .update({ last_professional_id: linkedAppointment.user_id })
                    .eq('id', linkedAppointment.paciente_id);
            }

            // Google Calendar Sync: Add [CONFIRMADO] tag & GREEN color (10)
            if (selectedEvent?.resource?.calendarId && selectedEvent?.id) {
                await updateGoogleEvent(selectedEvent.resource.calendarId, selectedEvent.id, selectedEvent.summary || '', '[CONFIRMADO]', '10');
            }

            // Visual feedback
            setLinkedAppointment({
                ...linkedAppointment,
                status: 'completed',
                recorded_commission: commission,
                queixa: completionForm.queixa,
                evolucao: completionForm.evolucao,
                medicamentos: completionForm.medicamentos
            } as any);

            setShowCompletionModal(false);
            alert(`Atendimento finalizado com sucesso! Comissão: R$ ${commission.toFixed(2)}`);

        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoadingLink(false);
        }
    };

    // Action: No Show
    const handleNoShow = async () => {
        if (!linkedAppointment) return;
        if (!confirm('Marcar como Falta?')) return;

        const { error } = await supabase
            .from('consultas')
            .update({ status: 'no_show', recorded_commission: 0 })
            .eq('id', linkedAppointment.id);

        if (!error) {
            setLinkedAppointment({ ...linkedAppointment, status: 'no_show', recorded_commission: 0 } as any);

            // Google Calendar Sync: Add [FALTOU] tag & RED color (11)
            if (selectedEvent?.resource?.calendarId && selectedEvent?.id) {
                await updateGoogleEvent(selectedEvent.resource.calendarId, selectedEvent.id, selectedEvent.summary || '', '[FALTOU]', '11');
            }
        }
    };

    const eventPropGetter = useCallback(
        (event: any) => ({
            style: {
                backgroundColor: event.backgroundColor || event.resource?.calendarColor || '#3174ad',
            },
        }),
        []
    );

    return (
        <div className="space-y-6 relative">
            {/* Modal Detalhes */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 flex justify-between items-start" style={{ backgroundColor: selectedEvent.resource?.calendarColor || '#3174ad' }}>
                            <h3 className="text-white font-bold text-lg pr-4">{selectedEvent.title}</h3>
                            <button onClick={() => setSelectedEvent(null)} className="text-white/80 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Basic Info */}
                            <div className="flex items-start gap-3 text-slate-600 border-b border-slate-100 pb-4">
                                <Clock className="w-5 h-5 mt-0.5 text-slate-400 shrink-0" />
                                <div>
                                    <p className="font-medium text-slate-900">
                                        {format(selectedEvent.start, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                    </p>
                                    <p className="text-sm">
                                        {selectedEvent.allDay ? 'Dia inteiro' : `${format(selectedEvent.start, 'HH:mm')} - ${format(selectedEvent.end, 'HH:mm')}`}
                                    </p>
                                </div>
                            </div>

                            {/* Integration Section */}
                            <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <img src="/favicon.ico" className="w-4 h-4" alt="" onError={(e) => e.currentTarget.style.display = 'none'} />
                                    Sistema Clinic+
                                </h4>

                                {loadingLink ? <Loader2 className="animate-spin text-slate-400" /> : linkedAppointment ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <UserIcon size={16} className="text-slate-400" />
                                            <span className="font-medium">{patients.find(p => p.id === linkedAppointment.paciente_id)?.nome || 'Paciente não encontrado'}</span>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                {linkedAppointment.status === 'completed' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1"><Check size={12} /> Finalizado</span>}
                                                {linkedAppointment.status === 'no_show' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold flex items-center gap-1"><X size={12} /> Faltou</span>}
                                                {linkedAppointment.status === 'scheduled' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Agendado</span>}
                                            </div>
                                        </div>

                                        {showFinance && (
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Procedimento</label>
                                                {linkedAppointment.status === 'completed' ? (
                                                    <div className="text-sm font-medium">
                                                        {procedures.find(p => p.id === linkedAppointment.procedure_id)?.name || '-'}
                                                        {linkedAppointment.recorded_commission && <span className="block text-xs text-green-600 font-normal">Comissão: R$ {linkedAppointment.recorded_commission}</span>}
                                                    </div>
                                                ) : (
                                                    <select
                                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                        value={selectedProcedureId}
                                                        onChange={(e) => setSelectedProcedureId(e.target.value)}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {procedures.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name} - R$ {p.price}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        )}

                                        {linkedAppointment.status === 'scheduled' && !isDentist && (
                                            // TODO: Allow dentist to complete? Requirement says: "Pode editar agendamentos futuros".
                                            // So Dentist CAN complete 'scheduled' ones.
                                            // But blocked if already 'completed' (handled by !scheduled check above).
                                            // So we should remove !isDentist check here if they are allowed to finish.
                                            // User said: "NÃO PODE editar agendamentos com status completed". It implies they CAN edit future (scheduled).
                                            // So I will REMOVE !isDentist check.
                                            <div className="grid grid-cols-2 gap-2 pt-2">
                                                <button onClick={handleComplete} className="bg-green-600 text-white py-2 rounded text-xs font-bold hover:bg-green-700 transition flex items-center justify-center gap-1">
                                                    <Check size={14} /> Finalizar
                                                </button>
                                                <button onClick={handleNoShow} className="bg-red-100 text-red-700 py-2 rounded text-xs font-bold hover:bg-red-200 transition flex items-center justify-center gap-1">
                                                    <UserIcon size={14} /> Faltou
                                                </button>
                                            </div>
                                        )}
                                        {/* Re-adding the block for Dentist to complete if I removed the check above. Logic handles it. */}
                                        {linkedAppointment.status === 'scheduled' && isDentist && (
                                            <div className="grid grid-cols-2 gap-2 pt-2">
                                                <button onClick={handleComplete} className="bg-green-600 text-white py-2 rounded text-xs font-bold hover:bg-green-700 transition flex items-center justify-center gap-1">
                                                    <Check size={14} /> Finalizar
                                                </button>
                                                <button onClick={handleNoShow} className="bg-red-100 text-red-700 py-2 rounded text-xs font-bold hover:bg-red-200 transition flex items-center justify-center gap-1">
                                                    <UserIcon size={14} /> Faltou
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded flex items-center gap-2">
                                            <AlertCircle size={14} /> Evento não vinculado
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Vincular Paciente</label>
                                            <select
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm p-2 bg-white"
                                                value={selectedPatientId}
                                                onChange={e => setSelectedPatientId(e.target.value)}
                                            >
                                                <option value="">Selecione...</option>
                                                {patients.map(p => (
                                                    <option key={p.id} value={p.id}>{p.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {showFinance && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 mb-1">Procedimento (Opcional)</label>
                                                <select
                                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm p-2 bg-white"
                                                    value={selectedProcedureId}
                                                    onChange={e => setSelectedProcedureId(e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {procedures.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleLinkAppointment}
                                            className="w-full py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700"
                                        >
                                            Vincular ao Sistema
                                        </button>
                                    </div>
                                )}
                            </div>
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

            {/* Completion Data Modal */}
            {showCompletionModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 bg-emerald-600 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Stethoscope size={20} /> Finalizar Atendimento
                            </h3>
                            <button onClick={() => setShowCompletionModal(false)} className="text-white/80 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmCompletion} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Queixa Principal</label>
                                <textarea
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
                                    rows={2}
                                    placeholder="Dor, desconforto, checkup..."
                                    value={completionForm.queixa}
                                    onChange={e => setCompletionForm({ ...completionForm, queixa: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Evolução Clínica</label>
                                <textarea
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
                                    rows={3}
                                    placeholder="Detalhes do que foi realizado..."
                                    required
                                    value={completionForm.evolucao}
                                    onChange={e => setCompletionForm({ ...completionForm, evolucao: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Procedimento</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                                        value={completionForm.procedure_id}
                                        onChange={e => {
                                            const pid = e.target.value;
                                            const proc = procedures.find(p => p.id === pid);
                                            setCompletionForm({
                                                ...completionForm,
                                                procedure_id: pid,
                                                valor: proc ? proc.price.toString() : completionForm.valor
                                            });
                                        }}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {procedures.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                                        value={completionForm.payment_method || 'none'}
                                        onChange={e => setCompletionForm({ ...completionForm, payment_method: e.target.value })}
                                        required
                                    >
                                        <option value="none">Selecione...</option>
                                        <option value="money">Dinheiro</option>
                                        <option value="card">Cartão</option>
                                        <option value="pix">Pix</option>
                                        <option value="warranty">Garantia / Retrabalho (R$ 0,00)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor Cobrado (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                        value={completionForm.valor}
                                        onChange={e => setCompletionForm({ ...completionForm, valor: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Medicamentos / Prescrição</label>
                                <textarea
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
                                    rows={2}
                                    placeholder="Dipirona 500mg..."
                                    value={completionForm.medicamentos}
                                    onChange={e => setCompletionForm({ ...completionForm, medicamentos: e.target.value })}
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCompletionModal(false)}
                                    className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingLink}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
                                >
                                    {loadingLink ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Salvar Prontuário
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <header className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <CalendarIcon className="text-[var(--primary)] text-2xl" /> Agenda
                        </h1>
                        <p className="text-slate-500">
                            {isDentist ? 'Minha Agenda' : 'Visualize seus compromissos do Google Agenda'}
                        </p>
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

                {isConnected && !isSimpleMode && !isDentist && (
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
