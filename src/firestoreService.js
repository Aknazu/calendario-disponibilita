import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc, writeBatch } from "firebase/firestore";

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

// 🔹 Verifica se il nickname è già in uso da un altro utente
export const isNicknameTaken = async (nickname, excludeUserId = null) => {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("nickname", "==", nickname));
        const querySnapshot = await getDocs(q);

        // Se non ci sono risultati, il nome è libero
        if (querySnapshot.empty) return false;

        // Se stiamo escludendo l'utente corrente dalla ricerca
        // (es. se sta salvando di nuovo il suo stesso nome)
        if (excludeUserId) {
            const otherUsers = querySnapshot.docs.filter(doc => doc.id !== excludeUserId);
            return otherUsers.length > 0;
        }

        return true;
    } catch (error) {
        console.error("Errore nella verifica del nickname:", error);
        throw error;
    }
};

// 🔹 Aggiorna il nickname dell'utente (e tutti i suoi eventi passati/futuri)
export const updateUserNickname = async (userId, newNickname) => {
    try {
        const batch = writeBatch(db);

        // 1. Aggiorna il profilo utente
        const userRef = doc(db, "users", userId);
        batch.update(userRef, { nickname: newNickname });

        // 2. Trova tutti gli eventi dell'utente
        const eventsRef = collection(db, "events");
        const q = query(eventsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        // 3. Aggiunge l'aggiornamento al batch
        querySnapshot.forEach((eventDoc) => {
            batch.update(eventDoc.ref, { nickname: newNickname });
        });

        // Esegue tutti gli aggiornamenti i un sol colpo
        await batch.commit();

    } catch (error) {
        console.error("Errore nell'aggiornamento del nickname e degli eventi:", error);
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

// 🔹 Verifica la Password Master dal database
export const verifyMasterPassword = async (inputPassword) => {
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "master_config"));
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            return data.password === inputPassword;
        }
        console.warn("Documento master_config non trovato in settings!");
        return false;
    } catch (error) {
        console.error("Errore nella verifica della password master:", error);
        return false;
    }
};
