import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";

// Recupera il nickname dell'utente dal database
export const getUserNickname = async (userId) => {
    const userDoc = await getDoc(doc(db, "users", userId));
    return userDoc.exists() ? userDoc.data().nickname : "Anonimo";
};

// Salva un nuovo utente con il nickname in Firestore
export const addUserToFirestore = async (userId, nickname) => {
    try {
        await setDoc(doc(db, "users", userId), { nickname });
    } catch (error) {
        console.error("Errore nel salvataggio del nickname:", error);
    }
};

// Ottieni tutti gli eventi
export const getEvents = async () => {
    const eventRef = collection(db, "events");
    const querySnapshot = await getDocs(eventRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Aggiungi un evento salvando anche il nickname
export const addEvent = async (userId, date, eventType) => {
    try {
        const nickname = await getUserNickname(userId); // 👈 Otteniamo il nickname
        const eventRef = collection(db, "events");
        await addDoc(eventRef, {
            userId,
            date,
            eventType,
            nickname, // 👈 Salviamo il nickname
        });
    } catch (error) {
        console.error("Errore nell'aggiunta dell'evento:", error);
    }
};

export const updateUserNickname = async (userId, newNickname) => {
    try {
        await updateDoc(doc(db, "users", userId), { nickname: newNickname });
    } catch (error) {
        console.error("Errore nell'aggiornamento del nickname:", error);
    }
};


// Elimina un evento
export const deleteEvent = async (eventId) => {
    try {
        await deleteDoc(doc(db, "events", eventId));
    } catch (error) {
        console.error("Errore nell'eliminazione dell'evento:", error);
    }
};

// Aggiorna un evento esistente
export const updateEvent = async (eventId, newType) => {
    try {
        await updateDoc(doc(db, "events", eventId), { eventType: newType });
    } catch (error) {
        console.error("Errore nella modifica dell'evento:", error);
    }
};
