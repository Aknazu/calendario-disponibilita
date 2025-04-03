import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getEvents, addEvent, deleteEvent, updateEvent } from "../firestoreService";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

const Calendar = ({ user }) => {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [existingEvent, setExistingEvent] = useState(null);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    const eventList = await getEvents();
    setEvents(eventList.map(event => ({
      id: event.id,
      title: `${event.eventType} - ${event.nickname || "Anonimo"}`, // Mostra il nickname accanto all'evento
      start: event.date,
      color: event.eventType === "Disponibile" ? "#1A73E8" : event.eventType === "Disponibilità Limitata" ? "#F4B400" : "#EA4335",
    })));
  };

  const handleDateClick = (info) => {
    const clickedDate = info.dateStr;
    const eventOnDate = events.find(event => event.start === clickedDate);

    setSelectedDate(clickedDate);
    setExistingEvent(eventOnDate || null);
    setOpen(true);
  };

  const handleEventClick = (info) => {
    const eventClicked = events.find(event => event.id === info.event.id);
    if (eventClicked) {
      setSelectedDate(eventClicked.start);
      setExistingEvent(eventClicked);
      setOpen(true);
    }
  };

  const handleEventSelection = async (type) => {
    const nickname = user.displayName || "Anonimo"; // 👈 Otteniamo il nickname dall'account Google
    if (existingEvent) {
      await updateEvent(existingEvent.id, type);
    } else {
      await addEvent(user.uid, nickname, selectedDate, type); // 👈 Passiamo anche il nickname
    }
    fetchEvents();
    setOpen(false);
  };


  const handleDeleteEvent = async () => {
    if (existingEvent) {
      await deleteEvent(existingEvent.id);
      fetchEvents();
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
        />
        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>{existingEvent ? "Modifica Evento" : "Aggiungi Evento"}</DialogTitle>
          <DialogContent>
            <Button onClick={() => handleEventSelection("Disponibile")} color="primary">Disponibile</Button>
            <Button onClick={() => handleEventSelection("Disponibilità Limitata")} color="warning">Disponibilità Limitata</Button>
            <Button onClick={() => handleEventSelection("Forse")} color="secondary">Forse</Button>
            {existingEvent && (
                <Button onClick={handleDeleteEvent} color="error">Elimina Evento</Button>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="default">Annulla</Button>
          </DialogActions>
        </Dialog>
      </div>
  );
};

export default Calendar;