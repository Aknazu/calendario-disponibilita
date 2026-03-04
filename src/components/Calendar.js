import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getEvents, addEvent, deleteEvent, updateEvent } from "../firestoreService";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, Box, Typography } from "@mui/material";
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import itLocale from '@fullcalendar/core/locales/it';

const Calendar = ({ user, darkMode, setDarkMode, showMessage }) => {
    const [events, setEvents] = useState([]);
    const [open, setOpen] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [existingEvent, setExistingEvent] = useState(null);
    const [eventType, setEventType] = useState("");

    useEffect(() => {
        if (user) {
            fetchEvents();

            const intervalId = setInterval(() => {
                fetchEvents();
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

    const handleEventClick = (info) => {
        if (isBulkMode) {
            setSelectedDates(prev => prev.includes(info.event.startStr)
                ? prev.filter(d => d !== info.event.startStr)
                : [...prev, info.event.startStr]);
            return;
        }

        const eventClicked = events.find(event => event.id === info.event.id);
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

        if (countForse === 0) {
            if (countDisponibile >= 4) {
                classes.push('has-big-crown');
            } else if ((countDisponibile + countLimitata) >= 4) {
                classes.push('has-small-crown');
            }
        }

        return classes.join(' ');
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
                    }
                }
                setSelectedDates([]);
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

    return (
        <div>
            {isBulkMode && selectedDates.length > 0 && (
                <Box display="flex" justifyContent="center" mb={2} mt={1}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setExistingEvent(null);
                            setEventType("");
                            setOpen(true);
                        }}
                    >
                        Aggiungi per {selectedDates.length} giorni
                    </Button>
                </Box>
            )}
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" mb={2} mt={1} gap={2}>
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

                {/* Bottoni Azioni (Selezione & Dark Mode) */}
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" gap={2} mt={{ xs: 2, md: 0 }} width={{ xs: '100%', md: 'auto' }}>
                    <Button
                        variant={isBulkMode ? "contained" : "outlined"}
                        color={isBulkMode ? "secondary" : "primary"}
                        onClick={() => {
                            setIsBulkMode(!isBulkMode);
                            if (isBulkMode) setSelectedDates([]);
                        }}
                        startIcon={isBulkMode ? <CancelOutlinedIcon /> : <CheckBoxOutlinedIcon />}
                        sx={{ flex: 1, width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}
                    >
                        {isBulkMode ? "Annulla" : "Selezione Multipla"}
                    </Button>

                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => setDarkMode(!darkMode)}
                        startIcon={darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                        sx={{ flex: 1, width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}
                    >
                        {darkMode ? "Chiaro" : "Scuro"}
                    </Button>
                </Box>
            </Box>
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events} // Pass fresh events when component renders to force dayCellClassNames execution
                dayCellClassNames={dayCellClassNames}
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
                titleFormat={{ year: 'numeric', month: 'long', day: 'numeric' }}
                className="fc"
            />
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
                        <Button onClick={handleDeleteEvent} color="error">
                            Elimina Evento
                        </Button>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} color="default">Annulla</Button>
                    <Button onClick={handleEventSelection} color="primary">
                        {existingEvent ? "Aggiorna" : "Aggiungi"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Calendar;