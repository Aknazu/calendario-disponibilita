import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";

export const getEvents = async () => {
    const eventRef = collection(db, "events");
    const querySnapshot = await getDocs(eventRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addEvent = async (userId, date, eventType) => {
    try {
        const eventRef = collection(db, "events");
        await addDoc(eventRef, {
            userId,
            date,
            eventType,
        });
    } catch (error) {
        console.error("Errore nell'aggiunta dell'evento:", error);
    }
};

export const deleteEvent = async (eventId) => {
    try {
        await deleteDoc(doc(db, "events", eventId));
    } catch (error) {
        console.error("Errore nell'eliminazione dell'evento:", error);
    }
};

export const updateEvent = async (eventId, newType) => {
    try {
        await updateDoc(doc(db, "events", eventId), { eventType: newType });
    } catch (error) {
        console.error("Errore nella modifica dell'evento:", error);
    }
};
