import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc } from "firebase/firestore";

// 🔹 Recupera gli eventi e include il nickname dell'utente
export const getEvents = async () => {
    const eventRef = collection(db, "events");
    const querySnapshot = await getDocs(eventRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addEvent = async (userId, date, eventType, nickname) => {
    try {
        const eventRef = collection(db, "events");
        const q = query(eventRef, where("userId", "==", userId), where("date", "==", date));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            throw new Error("Hai già un evento per questa data.");
        }

        await addDoc(eventRef, {
            userId,
            date,
            eventType,
            nickname
        });
    } catch (error) {
        console.error("Errore nell'aggiunta dell'evento:", error);
        throw error;
    }
};

export const deleteEvent = async (eventId, userId) => {
    try {
        const eventDoc = await getDoc(doc(db, "events", eventId));
        if (eventDoc.exists() && eventDoc.data().userId === userId) {
            await deleteDoc(doc(db, "events", eventId));
        } else {
            throw new Error("Non sei autorizzato a cancellare questo evento.");
        }
    } catch (error) {
        console.error("Errore nell'eliminazione dell'evento:", error);
        throw error;
    }
};

export const updateEvent = async (eventId, eventType) => {
    try {
        console.log("updateEvent - eventId:", eventId, "eventType:", eventType);
        const eventDoc = doc(db, "events", eventId);
        await updateDoc(eventDoc, {
            eventType
        });
        console.log("Event updated successfully");
    } catch (error) {
        console.error("Errore nell'aggiornamento dell'evento:", error);
        throw error;
    }
};

// 🔹 Salva l'utente e il suo nickname (ed email) in Firestore
export const addUserToFirestore = async (userId, nickname, email = null) => {
    try {
        const userData = { nickname };
        if (email) {
            userData.email = email;
        }
        await setDoc(doc(db, "users", userId), userData, { merge: true });
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

// 🔹 Aggiungi/Rimuovi Giorno Sessione
export const toggleSessionDay = async (date) => {
    try {
        const sessionDoc = await getDoc(doc(db, "sessionDays", date));
        if (sessionDoc.exists()) {
            await deleteDoc(doc(db, "sessionDays", date));
            return false; // Rimosso
        } else {
            await setDoc(doc(db, "sessionDays", date), { date });
            return true; // Aggiunto
        }
    } catch (error) {
        console.error("Errore nel toggle del giorno sessione:", error);
        throw error;
    }
};

// 🔹 Recupera giorni sessione
export const getSessionDays = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "sessionDays"));
        return querySnapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Errore nel recupero giorni sessione:", error);
        return [];
    }
};

// 🔹 Recupera email utente
export const getUserEmail = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        // L'email potrebbe non essere salvata in Firestore se non lo abbiamo fatto durante la registrazione
        // Dobbiamo assicurarci che chi si registra salvi anche l'email
        return userDoc.exists() ? userDoc.data().email : null;
    } catch (error) {
        console.error("Errore nel recupero email:", error);
        return null;
    }
};
