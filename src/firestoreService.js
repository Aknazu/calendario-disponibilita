import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc, writeBatch } from "firebase/firestore";

// 🔹 Recupera gli eventi e include il nickname dell'utente
export const getEvents = async () => {
    try {
        const eventRef = collection(db, "events");
        const querySnapshot = await getDocs(eventRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Errore nel recupero degli eventi:", error);
        throw error;
    }
};

export const addEvent = async (userId, date, eventType, nickname) => {
    try {
        console.log(`Checking for existing events for user: ${userId}, date: ${date}`); // Log per il debug
        const eventRef = collection(db, "events");
        const q = query(eventRef, where("userId", "==", userId), where("date", "==", date));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            throw new Error(`Hai già un evento per la data ${date}.`);
        }

        console.log(`Adding event for user: ${userId}, date: ${date}, type: ${eventType}, nickname: ${nickname}`); // Log per il debug
        await addDoc(eventRef, {
            userId,
            date,
            eventType,
            nickname
        });
        console.log(`Evento aggiunto: ${date}, ${eventType}, ${nickname}`); // Log per il debug
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
        const eventDoc = doc(db, "events", eventId);
        await updateDoc(eventDoc, {
            eventType
        });
    } catch (error) {
        console.error("Errore nell'aggiornamento dell'evento:", error);
        throw error;
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

// 🔹 Aggiorna il nickname in tutti gli eventi dell'utente
export const updateEventsNickname = async (userId, newNickname) => {
    try {
        const eventRef = collection(db, "events");
        const q = query(eventRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, { nickname: newNickname });
        });

        await batch.commit();
    } catch (error) {
        console.error("Errore nell'aggiornamento del nickname negli eventi:", error);
    }
};

// 🔹 Verifica se il nickname è unico
export const isNicknameUnique = async (nickname) => {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("nickname", "==", nickname));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty;
    } catch (error) {
        console.error("Errore nella verifica dell'unicità del nickname:", error);
        throw error;
    }
};

