import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getEvents, addEvent, deleteEvent, updateEvent } from "../firestoreService";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem } from "@mui/material";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import itLocale from '@fullcalendar/core/locales/it';

const Calendar = ({ user }) => {
    const [events, setEvents] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [existingEvent, setExistingEvent] = useState(null);
    const [eventType, setEventType] = useState("");

    useEffect(() => {
        if (user) {
            fetchEvents();
        }
    }, [user]);

    const fetchEvents = async () => {
        const eventList = await getEvents();
        setEvents(eventList.map(event => ({
            id: event.id,
            title: `${event.nickname}: ${event.eventType}`,
            start: event.date,
            color: event.eventType === "Disponibile" ? "#1A73E8" : event.eventType === "Disponibilità Limitata" ? "#F4B400" : "#EA4335",
            userId: event.userId
        })));
    };

    const handleDateClick = (info) => {
        const clickedDate = info.dateStr;
        const eventOnDate = events.find(event => event.start === clickedDate);

        setSelectedDate(clickedDate);
        setExistingEvent(eventOnDate || null);
        setEventType(eventOnDate ? eventOnDate.eventType : "");
        setOpen(true);
    };

    const handleEventClick = (info) => {
        const eventClicked = events.find(event => event.id === info.event.id);
        if (eventClicked) {
            setSelectedDate(eventClicked.start);
            setExistingEvent(eventClicked);
            setEventType(eventClicked.eventType);
            setOpen(true);
        }
    };

    const handleEventSelection = async () => {
        try {
            if (existingEvent && existingEvent.userId === user.uid) {
                await updateEvent(existingEvent.id, eventType);
            } else {
                const eventRef = collection(db, "events");
                const q = query(eventRef, where("userId", "==", user.uid), where("date", "==", selectedDate));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    throw new Error("Hai già un evento per questa data.");
                }

                await addEvent(user.uid, selectedDate, eventType, user.nickname);
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
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
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
            />
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>{existingEvent ? "Modifica Evento" : "Aggiungi Evento"}</DialogTitle>
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