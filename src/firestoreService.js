import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc } from "firebase/firestore";

// 🔹 Recupera gli eventi e include il nickname dell'utente
export const getEvents = async () => {
    const eventRef = collection(db, "events");
    const querySnapshot = await getDocs(eventRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 🔹 Aggiunge un evento con il nickname corretto
export const addEvent = async (userId, date, eventType, nickname) => {
    try {
        const eventRef = collection(db, "events");
        await addDoc(eventRef, {
            userId,
            date,
            eventType,
            nickname // 👈 Salviamo il nickname corretto nell'evento
        });
    } catch (error) {
        console.error("Errore nell'aggiunta dell'evento:", error);
    }
};

// 🔹 Elimina un evento
export const deleteEvent = async (eventId) => {
    try {
        await deleteDoc(doc(db, "events", eventId));
    } catch (error) {
        console.error("Errore nell'eliminazione dell'evento:", error);
    }
};

// 🔹 Modifica il tipo di evento
export const updateEvent = async (eventId, newType) => {
    try {
        await updateDoc(doc(db, "events", eventId), { eventType: newType });
    } catch (error) {
        console.error("Errore nella modifica dell'evento:", error);
    }
};

// 🔹 Salva l'utente e il suo nickname in Firestore
export const addUserToFirestore = async (userId, nickname) => {
    try {
        await setDoc(doc(db, "users", userId), { nickname }, { merge: true });
    } catch (error) {
        console.error("Errore nel salvataggio dell'utente:", error);
    }
};

// 🔹 Recupera il nickname dell'utente
export const getUserNickname = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        return userDoc.exists() ? userDoc.data().nickname : null;
    } catch (error) {
        console.error("Errore nel recupero del nickname:", error);
        return null;
    }
};

// 🔹 Aggiorna il nickname dell'utente
export const updateUserNickname = async (userId, newNickname) => {
    try {
        await updateDoc(doc(db, "users", userId), { nickname: newNickname });
    } catch (error) {
        console.error("Errore nell'aggiornamento del nickname:", error);
    }
};
