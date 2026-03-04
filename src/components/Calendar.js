import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getEvents, addEvent, deleteEvent, updateEvent, getSessionDays, toggleSessionDay } from "../firestoreService";
import { sendTelegramGroupMessage } from "../telegramService";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, Box, Typography, Divider, IconButton, Tooltip } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import itLocale from '@fullcalendar/core/locales/it';
import { useSwipeable } from 'react-swipeable';

const Calendar = ({ user, darkMode, setDarkMode, showMessage, isMaster }) => {
    const [events, setEvents] = useState([]);
    const [sessionDays, setSessionDays] = useState([]);
    const [open, setOpen] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [existingEvent, setExistingEvent] = useState(null);
    const [eventType, setEventType] = useState("");
    const [isProcessingSession, setIsProcessingSession] = useState(false);
    const calendarRef = React.useRef(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (user) {
            fetchEvents();
            fetchSessionDays();

            const intervalId = setInterval(() => {
                fetchEvents();
                fetchSessionDays();
            }, 30000);

            return () => clearInterval(intervalId);
        }
    }, [user]);

    useEffect(() => {
        if (!isBulkMode) {
            setSelectedDates([]);
        }
    }, [isBulkMode]);

    const fetchEvents = async () => {
        const eventList = await getEvents();
        setEvents(eventList.map(event => ({
            id: event.id,
            title: event.nickname,
            start: event.date,
            color: event.eventType === "Disponibile" ? "#34A853" : (event.eventType === "Forse" || event.eventType === "Disponibilità Limitata") ? "#F4B400" : "#EA4335",
            userId: event.userId
        })));
    };

    const fetchSessionDays = async () => {
        const days = await getSessionDays();
        setSessionDays(days);
    };

    const handleDateClick = (info) => {
        if (isBulkMode) {
            setSelectedDates(prev => prev.includes(info.dateStr)
                ? prev.filter(d => d !== info.dateStr)
                : [...prev, info.dateStr]);
            return;
        }

        const clickedDate = info.dateStr;
        const eventOnDate = events.find(event => event.start === clickedDate);

        setSelectedDates([clickedDate]);
        setExistingEvent(eventOnDate || null);
        setEventType(eventOnDate ? eventOnDate.eventType : "");
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
        const d = arg.date;
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        let classes = [];
        if (isBulkMode) {
            classes.push('bulk-mode-active');
            if (selectedDates.includes(formattedDate)) {
                classes.push('bulk-selected');
            }
        }

        const dayEvents = events.filter(e => e.start === formattedDate);
        const countDisponibile = dayEvents.filter(e => e.color === "#34A853").length;
        const countLimitata = dayEvents.filter(e => e.color === "#F4B400").length;
        const countForse = dayEvents.filter(e => e.color === "#EA4335").length;

        if (sessionDays.includes(formattedDate)) {
            classes.push('session-day');
        }

        if (countForse === 0) {
            if (countDisponibile >= 4) {
                classes.push('has-big-crown');
            } else if ((countDisponibile + countLimitata) >= 4) {
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

                // Prepara data parlante (es: lunedì 12/05/2026)
                const dateObj = new Date(dateStr);
                const formattedDate = new Intl.DateTimeFormat('it-IT', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }).format(dateObj);

                // Prepara lista giocatori disponibili o "forse"
                const availablePlayers = events
                    .filter(e => e.start === dateStr && (e.color === "#34A853" || e.color === "#F4B400"))
                    .map(e => e.title);

                const telegramSent = await sendTelegramGroupMessage(formattedDate, user.nickname, availablePlayers);

                if (telegramSent) {
                    showMessage("Giorno sessione confermato! Notifica Telegram inviata nel gruppo.", "success");
                } else {
                    showMessage("Giorno sessione impostato.", "success");
                }
            } else {
                showMessage("Giorno sessione rimosso.", "info");
            }
            fetchSessionDays();
        } catch (error) {
            showMessage("Errore nell'impostare il giorno sessione.", "error");
        } finally {
            setIsProcessingSession(false);
            setOpen(false);
        }
    };

    const handleEventSelection = async () => {
        try {
            if (isBulkMode && selectedDates.length > 0) {
                for (const dateStr of selectedDates) {
                    const eventRef = collection(db, "events");
                    const q = query(eventRef, where("userId", "==", user.uid), where("date", "==", dateStr));
                    const querySnapshot = await getDocs(q);
                    if (querySnapshot.empty) {
                        await addEvent(user.uid, dateStr, eventType, user.nickname);
                    } else {
                        const existingDoc = querySnapshot.docs[0];
                        await updateEvent(existingDoc.id, eventType);
                    }
                }
                setSelectedDates([]);
                setIsBulkMode(false);
            } else if (existingEvent && existingEvent.userId === user.uid) {
                // Modifica evento singolo esistente
                await updateEvent(existingEvent.id, eventType);
            } else {
                // Creazione evento singolo
                const dateStr = selectedDates[0];
                const eventRef = collection(db, "events");
                const q = query(eventRef, where("userId", "==", user.uid), where("date", "==", dateStr));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    throw new Error("Hai già un evento per questa data.");
                }
                await addEvent(user.uid, dateStr, eventType, user.nickname);
            }
            fetchEvents();
            setOpen(false);
            showMessage(existingEvent ? "Evento aggiornato!" : "Eventi salvati con successo!", "success");
        } catch (error) {
            console.error("handleEventSelection error:", error.message);
            showMessage(error.message, "error");
        }
    };

    const handleDeleteEvent = async () => {
        if (existingEvent) {
            try {
                await deleteEvent(existingEvent.id, user.uid);
                fetchEvents();
                showMessage("Evento eliminato con successo", "info");
            } catch (error) {
                console.error(error.message);
                showMessage("Non sei autorizzato a cancellare questo evento.", "error");
            }
        }
        setOpen(false);
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
        onSwipedUp: () => setSwipeOffset(0),
        onSwipedDown: () => setSwipeOffset(0),
        preventScrollOnSwipe: false,
        trackMouse: false
    });

    return (
        <div {...handlers} style={{ overflow: "hidden" }}>
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="center" alignItems="center" mb={2} mt={1} gap={2}>
                {/* Legenda Colori */}
                <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box width={14} height={14} bgcolor="#34A853" borderRadius="50%" />
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Disponibile</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box width={14} height={14} bgcolor="#F4B400" borderRadius="50%" />
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Forse</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box width={14} height={14} bgcolor="#EA4335" borderRadius="50%" />
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
                    className="fc"
                />
            </div>
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>
                    {existingEvent
                        ? `Modifica Evento (${selectedDates[0]})`
                        : isBulkMode
                            ? `Aggiungi Eventi (Selezionati ${selectedDates.length} giorni)`
                            : `Aggiungi Evento (${selectedDates[0]})`
                    }
                </DialogTitle>
                <DialogContent>
                    <Select
                        label="Tipo di Evento"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                    >
                        <MenuItem value="Disponibile">Disponibile</MenuItem>
                        <MenuItem value="Forse">Forse</MenuItem>
                        <MenuItem value="Assente">Assente</MenuItem>
                    </Select>
                    {existingEvent && (
                        <Button onClick={handleDeleteEvent} color="error" sx={{ mt: 1 }}>
                            Elimina Evento
                        </Button>
                    )}

                    {isMaster && !isBulkMode && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                Opzioni Master
                            </Typography>
                            <Button
                                variant={sessionDays.includes(selectedDates[0]) ? "outlined" : "contained"}
                                color="warning"
                                fullWidth
                                onClick={handleToggleSessionDay}
                                disabled={isProcessingSession}
                                startIcon={<StarIcon />}
                            >
                                {sessionDays.includes(selectedDates[0]) ? "Rimuovi Giorno Sessione" : "Imposta Giorno Sessione"}
                            </Button>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} color="default">Annulla</Button>
                    <Button onClick={handleEventSelection} color="primary" disabled={isProcessingSession}>
                        {existingEvent ? "Aggiorna Evento" : "Aggiungi Evento"}
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
                                {selectedDates.length} d
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