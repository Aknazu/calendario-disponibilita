import React, { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
    subscribeToEvents,
    subscribeToSessionDays,
    saveAvailability,
    deleteEvent,
    countAvailableOnDate,
    toggleSessionDay,
    EVENT_TYPES
} from "../firestoreService";
import { sendTelegramGroupMessage, sendTelegramFivePlayersMessage, sendTelegramStatusChangeMessage } from "../telegramService";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, FormControl, InputLabel, Box, Typography, Divider, IconButton, Tooltip, CircularProgress } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import itLocale from '@fullcalendar/core/locales/it';
import { useSwipeable } from 'react-swipeable';

// Orario di default della sessione (usato sia per il link nel messaggio Telegram
// sia per il pulsante "Aggiungi a Google Calendar")
const SESSION_START_TIME = "210000";
const SESSION_END_TIME = "233000";
const SESSION_TITLE = "Sessione D&D";

// Soglia oltre la quale scatta la notifica "gruppo al completo"
const FULL_PARTY_SIZE = 5;

const COLORS = {
    Disponibile: "#34A853",
    Forse: "#F4B400",
    Assente: "#EA4335"
};

const colorForType = (eventType) => {
    if (eventType === "Disponibile") return COLORS.Disponibile;
    // "Disponibilità Limitata" è un vecchio tipo rimasto su dati storici
    if (eventType === "Forse" || eventType === "Disponibilità Limitata") return COLORS.Forse;
    return COLORS.Assente;
};

// Converte una Date locale in "YYYY-MM-DD" senza passare da UTC
const toDateStr = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatItalianDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Intl.DateTimeFormat('it-IT', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date(year, month - 1, day));
};

const buildGoogleCalendarUrl = (dateStr) => {
    const compact = dateStr.replace(/-/g, '');
    const dates = `${compact}T${SESSION_START_TIME}/${compact}T${SESSION_END_TIME}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(SESSION_TITLE)}&dates=${dates}`;
};

const Calendar = ({ user, darkMode, setDarkMode, showMessage, isMaster }) => {
    const [events, setEvents] = useState([]);
    const [sessionDays, setSessionDays] = useState([]);
    const [visibleRange, setVisibleRange] = useState(null);
    const [open, setOpen] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [existingEvent, setExistingEvent] = useState(null);
    const [eventType, setEventType] = useState("");
    const [isProcessingSession, setIsProcessingSession] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const calendarRef = React.useRef(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Aggiorna l'intervallo visibile quando si cambia mese/vista.
    // Confronto sui valori per non rigenerare l'oggetto (e la sottoscrizione) inutilmente.
    const handleDatesSet = useCallback((info) => {
        const start = toDateStr(info.start);
        const end = toDateStr(info.end);
        setVisibleRange(prev =>
            prev && prev.start === start && prev.end === end ? prev : { start, end }
        );
    }, []);

    // Ascolto realtime limitato alle date effettivamente mostrate
    useEffect(() => {
        if (!user || !visibleRange) return;

        const unsubscribe = subscribeToEvents(
            visibleRange.start,
            visibleRange.end,
            (eventList) => {
                setEvents(eventList.map(event => ({
                    id: event.id,
                    title: event.nickname,
                    start: event.date,
                    color: colorForType(event.eventType),
                    userId: event.userId,
                    eventType: event.eventType
                })));
            },
            () => showMessage("Impossibile caricare le disponibilità.", "error")
        );

        return () => unsubscribe();
    }, [user, visibleRange, showMessage]);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToSessionDays(
            setSessionDays,
            () => showMessage("Impossibile caricare i giorni sessione.", "error")
        );
        return () => unsubscribe();
    }, [user, showMessage]);

    // La selezione riparte vuota sia entrando sia uscendo dalla modalità multipla:
    // altrimenti il giorno aperto poco prima resterebbe spuntato senza averlo scelto.
    useEffect(() => {
        setSelectedDates([]);
    }, [isBulkMode]);

    const closeDialog = () => {
        setOpen(false);
        setExistingEvent(null);
        setEventType("");
    };

    const handleDateClick = (info) => {
        if (isBulkMode) {
            setSelectedDates(prev => prev.includes(info.dateStr)
                ? prev.filter(d => d !== info.dateStr)
                : [...prev, info.dateStr]);
            return;
        }

        const clickedDate = info.dateStr;
        // Solo il PROPRIO evento va aperto in modifica: quelli altrui non sono modificabili
        const ownEventOnDate = events.find(
            event => event.start === clickedDate && event.userId === user.uid
        );

        setSelectedDates([clickedDate]);
        setExistingEvent(ownEventOnDate || null);
        setEventType(ownEventOnDate ? ownEventOnDate.eventType : "");
        setOpen(true);
    };

    const eventClassNames = (arg) => {
        if (arg.event.extendedProps.userId !== user.uid) {
            return 'not-clickable-event';
        }
        return 'clickable-event';
    };

    const handleEventClick = (info) => {
        const eventClicked = events.find(event => event.id === info.event.id);

        if (eventClicked && eventClicked.userId !== user.uid) {
            return;
        }

        if (isBulkMode) {
            setSelectedDates(prev => prev.includes(info.event.startStr)
                ? prev.filter(d => d !== info.event.startStr)
                : [...prev, info.event.startStr]);
            return;
        }

        if (eventClicked) {
            setSelectedDates([eventClicked.start]);
            setExistingEvent(eventClicked);
            setEventType(eventClicked.eventType);
            setOpen(true);
        }
    };

    const dayCellClassNames = (arg) => {
        const formattedDate = toDateStr(arg.date);

        let classes = [];
        if (isBulkMode) {
            classes.push('bulk-mode-active');
            if (selectedDates.includes(formattedDate)) {
                classes.push('bulk-selected');
            }
        }

        const dayEvents = events.filter(e => e.start === formattedDate);
        const countDisponibile = dayEvents.filter(e => e.color === COLORS.Disponibile).length;
        const countForse = dayEvents.filter(e => e.color === COLORS.Forse).length;
        const countAssente = dayEvents.filter(e => e.color === COLORS.Assente).length;

        if (sessionDays.includes(formattedDate)) {
            classes.push('session-day');
        }

        if (countAssente === 0) {
            if (countDisponibile >= 4) {
                classes.push('has-big-crown');
            } else if ((countDisponibile + countForse) >= 4) {
                classes.push('has-small-crown');
            }
        } else {
            classes.push('has-forse');
            classes.push('has-forse-icon');
        }

        return classes.join(' ');
    };

    const handleToggleSessionDay = async () => {
        const dateStr = selectedDates[0];
        setIsProcessingSession(true);
        try {
            const isAdded = await toggleSessionDay(dateStr);
            if (isAdded) {
                showMessage("Giorno sessione impostato! Invio notifica...", "info");

                const formattedDate = formatItalianDate(dateStr);

                // Lista giocatori disponibili o "forse"
                const availablePlayers = events
                    .filter(e => e.start === dateStr && (e.color === COLORS.Disponibile || e.color === COLORS.Forse))
                    .map(e => e.title);

                const telegramSent = await sendTelegramGroupMessage(
                    formattedDate,
                    user.nickname,
                    availablePlayers,
                    buildGoogleCalendarUrl(dateStr)
                );

                if (telegramSent) {
                    showMessage("Giorno sessione confermato! Notifica Telegram inviata nel gruppo.", "success");
                } else {
                    showMessage("Giorno sessione impostato.", "success");
                }
            } else {
                showMessage("Giorno sessione rimosso.", "info");
            }
        } catch (error) {
            console.error("handleToggleSessionDay error:", error);
            showMessage("Errore nell'impostare il giorno sessione.", "error");
        } finally {
            setIsProcessingSession(false);
            closeDialog();
        }
    };

    const handleEventSelection = async () => {
        if (!EVENT_TYPES.includes(eventType)) {
            showMessage("Seleziona un tipo di disponibilità.", "warning");
            return;
        }
        if (selectedDates.length === 0) {
            showMessage("Nessuna data selezionata.", "warning");
            return;
        }

        const wasEditing = Boolean(existingEvent);
        setIsSaving(true);
        try {
            // Conteggi PRIMA della modifica, per capire quali soglie vengono attraversate
            const previousCounts = new Map();
            const wasAvailable = new Map();
            for (const dateStr of selectedDates) {
                const availableOnDate = events.filter(e => e.start === dateStr && e.color === COLORS.Disponibile);
                previousCounts.set(dateStr, availableOnDate.length);
                wasAvailable.set(dateStr, availableOnDate.some(e => e.userId === user.uid));
            }

            await saveAvailability(user.uid, user.nickname, selectedDates, eventType);

            setSelectedDates([]);
            setIsBulkMode(false);
            closeDialog();
            showMessage(wasEditing ? "Evento aggiornato!" : "Eventi salvati con successo!", "success");

            for (const dateStr of selectedDates) {
                const previousCount = previousCounts.get(dateStr);
                const formattedDate = formatItalianDate(dateStr);

                if (eventType === "Disponibile" && !wasAvailable.get(dateStr)) {
                    // Notifica solo quando si ATTRAVERSA la soglia, non a ogni salvataggio sopra di essa
                    const { count, players } = await countAvailableOnDate(dateStr);
                    if (previousCount < FULL_PARTY_SIZE && count >= FULL_PARTY_SIZE) {
                        const sent = await sendTelegramFivePlayersMessage(formattedDate, players);
                        showMessage(
                            sent
                                ? `Raggiunti ${FULL_PARTY_SIZE} giocatori per il ${formattedDate}. Notifica Telegram inviata!`
                                : `Raggiunti ${FULL_PARTY_SIZE} giocatori per il ${formattedDate}.`,
                            "success"
                        );
                    }
                } else if (eventType !== "Disponibile" && wasAvailable.get(dateStr) && previousCount >= FULL_PARTY_SIZE) {
                    await sendTelegramStatusChangeMessage(formattedDate, user.nickname, eventType);
                }
            }
        } catch (error) {
            console.error("handleEventSelection error:", error);
            showMessage(error.message || "Errore nel salvataggio.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!existingEvent) return;

        try {
            const wasAvailable = existingEvent.eventType === "Disponibile";
            const previousCount = events.filter(
                e => e.start === existingEvent.start && e.color === COLORS.Disponibile
            ).length;
            const notifyDrop = wasAvailable && previousCount >= FULL_PARTY_SIZE;
            const droppedDateStr = existingEvent.start;

            await deleteEvent(existingEvent.id, user.uid);
            closeDialog();
            showMessage("Evento eliminato con successo", "info");

            if (notifyDrop) {
                await sendTelegramStatusChangeMessage(formatItalianDate(droppedDateStr), user.nickname, "Cancellata");
            }
        } catch (error) {
            console.error("handleDeleteEvent error:", error);
            showMessage(error.message || "Non sei autorizzato a cancellare questo evento.", "error");
            closeDialog();
        }
    };

    const handleAddToGoogleCalendar = () => {
        if (!selectedDates || selectedDates.length === 0) return;
        window.open(buildGoogleCalendarUrl(selectedDates[0]), '_blank', 'noopener,noreferrer');
    };

    const handlers = useSwipeable({
        onSwiping: (eventData) => {
            // Muovi il calendario con il dito, solo in orizzontale
            if (eventData.dir === "Left" || eventData.dir === "Right") {
                setSwipeOffset(eventData.deltaX);
            }
        },
        onSwipedLeft: () => {
            setSwipeOffset(-window.innerWidth * 0.3); // "Scivola un po' oltre"
            setIsAnimating(true);
            setTimeout(() => {
                if (calendarRef.current) calendarRef.current.getApi().next();
                setSwipeOffset(50); // Mettilo "fuori" a destra per ricomparire
                requestAnimationFrame(() => {
                    setSwipeOffset(0); // Scivola indietro dolcemente
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 150);
        },
        onSwipedRight: () => {
            setSwipeOffset(window.innerWidth * 0.3);
            setIsAnimating(true);
            setTimeout(() => {
                if (calendarRef.current) calendarRef.current.getApi().prev();
                setSwipeOffset(-50);
                requestAnimationFrame(() => {
                    setSwipeOffset(0);
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 150);
        },
        // Rete di sicurezza: se il gesto finisce senza che scatti nessun onSwiped*
        // il calendario resterebbe spostato di lato.
        onTouchEndOrOnMouseUp: () => {
            if (!isAnimating) setSwipeOffset(0);
        },
        onSwipedUp: () => setSwipeOffset(0),
        onSwipedDown: () => setSwipeOffset(0),
        preventScrollOnSwipe: false,
        trackMouse: false
    });

    const selectedDate = selectedDates[0];

    // react-swipeable non gestisce il touchcancel (tipico su mobile quando il browser
    // prende il controllo per lo scroll verticale): senza questo reset il calendario
    // resta storto finché non si fa un altro swipe.
    const handleTouchCancel = () => {
        if (!isAnimating) setSwipeOffset(0);
    };

    return (
        <div {...handlers} onTouchCancel={handleTouchCancel} style={{ overflow: "hidden" }}>
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="center" alignItems="center" mb={2} mt={1} gap={2}>
                {/* Legenda Colori */}
                <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box width={14} height={14} bgcolor={COLORS.Disponibile} borderRadius="50%" />
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Disponibile</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box width={14} height={14} bgcolor={COLORS.Forse} borderRadius="50%" />
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Forse</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box width={14} height={14} bgcolor={COLORS.Assente} borderRadius="50%" />
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Assente</Typography>
                    </Box>
                </Box>

            </Box>
            <div
                style={{
                    transform: `translateX(${swipeOffset}px)`,
                    transition: isAnimating ? "transform 0.3s ease-out, opacity 0.3s ease-out" : "none",
                    opacity: isAnimating && Math.abs(swipeOffset) > 20 ? 0.3 : 1
                }}
            >
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    events={events}
                    datesSet={handleDatesSet}
                    dayCellClassNames={dayCellClassNames}
                    eventClassNames={eventClassNames}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    height="auto"
                    headerToolbar={{
                        left: 'prev,next',
                        center: 'title',
                        right: 'today,dayGridMonth,dayGridWeek,dayGridDay'
                    }}
                    buttonText={{
                        today: 'Oggi',
                        month: 'Mese',
                        week: 'Settimana',
                        day: 'Giorno'
                    }}
                    locale={itLocale}
                    dayHeaderContent={(args) => args.text.charAt(0).toUpperCase() + args.text.slice(1)}
                    titleFormat={{ year: 'numeric', month: 'long' }}
                />
            </div>
            <Dialog open={open} onClose={closeDialog}>
                <DialogTitle>
                    {existingEvent
                        ? `Modifica Evento (${selectedDate})`
                        : isBulkMode
                            ? `Aggiungi Eventi (Selezionati ${selectedDates.length} giorni)`
                            : `Aggiungi Evento (${selectedDate})`
                    }
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="event-type-label">Tipo di Evento</InputLabel>
                        <Select
                            labelId="event-type-label"
                            label="Tipo di Evento"
                            variant="outlined"
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value)}
                        >
                            {EVENT_TYPES.map(type => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {existingEvent && (
                        <Button onClick={handleDeleteEvent} color="error" disabled={isSaving} sx={{ mt: 1 }}>
                            Elimina Evento
                        </Button>
                    )}

                    {!isBulkMode && sessionDays.includes(selectedDate) && (
                        <>
                            <Divider sx={{ my: 1 }} />
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleAddToGoogleCalendar}
                                startIcon={<CalendarMonthIcon />}
                                sx={{ mt: 1, mb: 1, bgcolor: '#4285F4', '&:hover': { bgcolor: '#3367D6' } }}
                            >
                                Aggiungi a Google Calendar
                            </Button>
                        </>
                    )}

                    {isMaster && !isBulkMode && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                Opzioni Master
                            </Typography>
                            <Button
                                variant={sessionDays.includes(selectedDate) ? "outlined" : "contained"}
                                color="warning"
                                fullWidth
                                onClick={handleToggleSessionDay}
                                disabled={isProcessingSession}
                                startIcon={<StarIcon />}
                            >
                                {sessionDays.includes(selectedDate) ? "Rimuovi Giorno Sessione" : "Imposta Giorno Sessione"}
                            </Button>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog} color="inherit" disabled={isSaving}>Annulla</Button>
                    <Button onClick={handleEventSelection} color="primary" disabled={isProcessingSession || isSaving}>
                        {isSaving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                        {isSaving ? "Salvando..." : (existingEvent ? "Aggiorna Evento" : "Aggiungi Evento")}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Pulsanti Fluttuanti (Selezione Multipla) */}
            <Box
                display="flex"
                flexDirection={{ xs: 'column-reverse', sm: 'row' }}
                alignItems="center"
                gap={1.5}
                sx={{
                    position: 'fixed',
                    bottom: { xs: 20, sm: 30 },
                    right: { xs: 20, sm: 30 },
                    zIndex: 1000
                }}
            >
                {!isBulkMode ? (
                    <Tooltip title="Selezione Multipla" placement="left">
                        <IconButton
                            onClick={() => setIsBulkMode(true)}
                            sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                width: { xs: 56, sm: 64 },
                                height: { xs: 56, sm: 64 },
                                '&:hover': { bgcolor: 'primary.dark' },
                                boxShadow: 3
                            }}
                        >
                            <AddIcon sx={{ fontSize: { xs: 30, sm: 36 } }} />
                        </IconButton>
                    </Tooltip>
                ) : (
                    <>
                        <Tooltip title="Conferma Giorni" placement="top">
                            <span>
                                <IconButton
                                    onClick={() => {
                                        setExistingEvent(null);
                                        setEventType("");
                                        setOpen(true);
                                    }}
                                    disabled={selectedDates.length === 0}
                                    sx={{
                                        bgcolor: selectedDates.length > 0 ? 'success.main' : 'action.disabledBackground',
                                        color: 'white',
                                        width: { xs: 50, sm: 56 },
                                        height: { xs: 50, sm: 56 },
                                        '&:hover': { bgcolor: 'success.dark' },
                                        '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' },
                                        boxShadow: 3
                                    }}
                                >
                                    <CheckIcon fontSize="large" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        {selectedDates.length > 0 && (
                            <Box sx={{
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                borderRadius: '20px',
                                px: 2,
                                py: 1,
                                boxShadow: 2,
                                fontWeight: 'bold'
                            }}>
                                {selectedDates.length} g
                            </Box>
                        )}

                        <Tooltip title="Annulla Selezione" placement="top">
                            <IconButton
                                onClick={() => {
                                    setIsBulkMode(false);
                                    setSelectedDates([]);
                                }}
                                sx={{
                                    bgcolor: 'error.main',
                                    color: 'white',
                                    width: { xs: 50, sm: 56 },
                                    height: { xs: 50, sm: 56 },
                                    boxShadow: 3,
                                    '&:hover': { bgcolor: 'error.dark' }
                                }}
                            >
                                <CloseIcon fontSize="large" />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
            </Box>
        </div>
    );
};

export default Calendar;
