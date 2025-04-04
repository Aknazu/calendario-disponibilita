import React, { useState, useEffect } from "react";
        import FullCalendar from "@fullcalendar/react";
        import dayGridPlugin from "@fullcalendar/daygrid";
        import interactionPlugin from "@fullcalendar/interaction";
        import { getEvents, addEvent, deleteEvent, updateEvent } from "../firestoreService";
        import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
        import { collection, query, where, getDocs } from "firebase/firestore";
        import { db } from "../firebaseConfig";

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
              title: `${event.nickname}: ${event.eventType}`,
              start: event.date,
              color: event.eventType === "Disponibile" ? "#1A73E8" : event.eventType === "Disponibilità Limitata" ? "#F4B400" : "#EA4335",
              userId: event.userId // Aggiungi userId qui
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
              try {
                  console.log("handleEventSelection - existingEvent:", existingEvent);
                  console.log("User ID:", user.uid);
                  if (existingEvent) {
                      console.log("Existing Event User ID:", existingEvent.userId);
                  }

                  if (existingEvent && existingEvent.userId === user.uid) {
                      // Se l'utente è il proprietario dell'evento, aggiorna l'evento esistente
                      console.log("Updating existing event:", existingEvent.id);
                      await updateEvent(existingEvent.id, type);
                  } else {
                      // Controlla se l'utente ha già un evento per la data selezionata
                      const eventRef = collection(db, "events");
                      const q = query(eventRef, where("userId", "==", user.uid), where("date", "==", selectedDate));
                      const querySnapshot = await getDocs(q);

                      console.log("Query snapshot size:", querySnapshot.size);
                      if (!querySnapshot.empty) {
                          throw new Error("Hai già un evento per questa data.");
                      }

                      // Aggiungi un nuovo evento se non esiste già un evento per la data selezionata
                      console.log("Adding new event for date:", selectedDate);
                      await addEvent(user.uid, selectedDate, type, user.nickname);
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