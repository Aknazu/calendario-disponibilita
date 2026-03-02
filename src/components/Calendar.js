import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getEvents, addEvent, deleteEvent, updateEvent } from "../firestoreService";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, Box, Typography } from "@mui/material";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import itLocale from '@fullcalendar/core/locales/it';

const Calendar = ({ user, isBulkMode }) => {
    const [events, setEvents] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [existingEvent, setExistingEvent] = useState(null);
    const [eventType, setEventType] = useState("");

    useEffect(() => {
        if (user) {
            fetchEvents();
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
            color: event.eventType === "Disponibile" ? "#34A853" : event.eventType === "Disponibilità Limitata" ? "#F4B400" : "#EA4335",
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
        } catch (error) {
            console.error("handleEventSelection error:", error.message);
            alert(error.message);
        }
    };

    const handleDeleteEvent = async () => {
        if (existingEvent) {
            try {
                await deleteEvent(existingEvent.id, user.uid);
                fetchEvents();
            } catch (error) {
                console.error(error.message);
                alert("Non sei autorizzato a cancellare questo evento.");
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
            <Box display="flex" justifyContent="center" gap={3} mb={2} flexWrap="wrap">
                <Box display="flex" alignItems="center" gap={1}>
                    <Box width={14} height={14} bgcolor="#34A853" borderRadius="50%" />
                    <Typography variant="body2">Disponibile</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                    <Box width={14} height={14} bgcolor="#F4B400" borderRadius="50%" />
                    <Typography variant="body2">Disponibilità Limitata</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                    <Box width={14} height={14} bgcolor="#EA4335" borderRadius="50%" />
                    <Typography variant="body2">Forse</Typography>
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
                        <MenuItem value="Disponibilità Limitata">Disponibilità Limitata</MenuItem>
                        <MenuItem value="Forse">Forse</MenuItem>
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