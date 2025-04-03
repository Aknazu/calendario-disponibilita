import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";

export const getEvents = async () => {
    const eventRef = collection(db, "events");
    const querySnapshot = await getDocs(eventRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addEvent = async (userId, nickname, date, eventType) => {
    try {
        const eventRef = collection(db, "events");
        await addDoc(eventRef, {
            userId,
            nickname,
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

export const addUserToFirestore = async (userId, nickname) => {
    try {
        const usersRef = collection(db, "users");
        await addDoc(usersRef, { userId, nickname });
    } catch (error) {
        console.error("Errore nel salvataggio del nickname:", error);
    }
};

export const getUserNickname = async (userId) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data().nickname;
    }
    return "Anonimo";
};
