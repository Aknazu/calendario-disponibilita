import { db } from "./firebaseConfig";
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    getDoc,
    setDoc,
    writeBatch,
    onSnapshot
} from "firebase/firestore";

// Tipi di disponibilità ammessi (devono restare allineati a firestore.rules)
export const EVENT_TYPES = ["Disponibile", "Forse", "Assente"];

// 🔹 Ascolta in tempo reale gli eventi di un intervallo di date (estremo finale escluso).
// Sostituisce il polling: Firestore invia solo le modifiche, non l'intera collection.
export const subscribeToEvents = (startDate, endDate, onChange, onError) => {
    const q = query(
        collection(db, "events"),
        where("date", ">=", startDate),
        where("date", "<", endDate)
    );
    return onSnapshot(
        q,
        (snapshot) => onChange(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
        (error) => {
            console.error("Errore nell'ascolto degli eventi:", error);
            if (onError) onError(error);
        }
    );
};

// 🔹 Ascolta in tempo reale i giorni sessione
export const subscribeToSessionDays = (onChange, onError) => {
    return onSnapshot(
        collection(db, "sessionDays"),
        (snapshot) => onChange(snapshot.docs.map(d => d.id)),
        (error) => {
            console.error("Errore nell'ascolto dei giorni sessione:", error);
            if (onError) onError(error);
        }
    );
};

// 🔹 Salva la disponibilità dell'utente su una o più date in un'unica scrittura atomica.
// Crea l'evento se non esiste, altrimenti lo aggiorna.
export const saveAvailability = async (userId, nickname, dates, eventType) => {
    if (!dates || dates.length === 0) {
        throw new Error("Nessuna data selezionata.");
    }
    if (!EVENT_TYPES.includes(eventType)) {
        throw new Error("Seleziona un tipo di disponibilità.");
    }

    const eventsRef = collection(db, "events");
    // Una sola query: gli eventi dell'utente corrente (pochi documenti)
    const snapshot = await getDocs(query(eventsRef, where("userId", "==", userId)));

    const existingByDate = new Map();
    snapshot.forEach(d => existingByDate.set(d.data().date, d));

    const batch = writeBatch(db);
    for (const date of dates) {
        const existing = existingByDate.get(date);
        if (existing) {
            batch.update(existing.ref, { eventType, nickname });
        } else {
            batch.set(doc(eventsRef), { userId, date, eventType, nickname });
        }
    }
    await batch.commit();
};

// 🔹 Cancella un evento (il controllo di proprietà è comunque ribadito da firestore.rules)
export const deleteEvent = async (eventId, userId) => {
    const eventDoc = await getDoc(doc(db, "events", eventId));
    if (!eventDoc.exists() || eventDoc.data().userId !== userId) {
        throw new Error("Non sei autorizzato a cancellare questo evento.");
    }
    await deleteDoc(doc(db, "events", eventId));
};

// 🔹 Conta quante persone risultano "Disponibile" in una data
export const countAvailableOnDate = async (date) => {
    const q = query(
        collection(db, "events"),
        where("date", "==", date),
        where("eventType", "==", "Disponibile")
    );
    const snapshot = await getDocs(q);
    return {
        count: snapshot.size,
        players: snapshot.docs.map(d => d.data().nickname)
    };
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

        if (querySnapshot.empty) return false;

        if (excludeUserId) {
            return querySnapshot.docs.some(d => d.id !== excludeUserId);
        }

        return true;
    } catch (error) {
        console.error("Errore nella verifica del nickname:", error);
        throw error;
    }
};

// 🔹 Aggiorna il nickname dell'utente (e tutti i suoi eventi passati/futuri)
export const updateUserNickname = async (userId, newNickname, email = null) => {
    try {
        const batch = writeBatch(db);

        // 1. Aggiorna il profilo utente (set+merge: funziona anche se il documento
        //    non esiste ancora, es. al primo nickname scelto dopo la registrazione)
        const userRef = doc(db, "users", userId);
        const userData = email ? { nickname: newNickname, email } : { nickname: newNickname };
        batch.set(userRef, userData, { merge: true });

        // 2. Trova tutti gli eventi dell'utente
        const eventsRef = collection(db, "events");
        const q = query(eventsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        // 3. Aggiunge l'aggiornamento al batch
        querySnapshot.forEach((eventDoc) => {
            batch.update(eventDoc.ref, { nickname: newNickname });
        });

        // Esegue tutti gli aggiornamenti in un sol colpo
        await batch.commit();
    } catch (error) {
        console.error("Errore nell'aggiornamento del nickname e degli eventi:", error);
        throw error;
    }
};

// 🔹 Aggiungi/Rimuovi Giorno Sessione (scrittura consentita solo ai Master dalle rules)
export const toggleSessionDay = async (date) => {
    const sessionDoc = await getDoc(doc(db, "sessionDays", date));
    if (sessionDoc.exists()) {
        await deleteDoc(doc(db, "sessionDays", date));
        return false; // Rimosso
    }
    await setDoc(doc(db, "sessionDays", date), { date });
    return true; // Aggiunto
};

// 🔹 Verifica se l'utente è un Master.
// L'elenco vive nella collection "masters" e si modifica solo dalla console Firebase:
// le rules impediscono qualsiasi scrittura dal browser.
export const isUserMaster = async (userId) => {
    try {
        const masterDoc = await getDoc(doc(db, "masters", userId));
        return masterDoc.exists();
    } catch (error) {
        console.error("Errore nella verifica dei permessi Master:", error);
        return false;
    }
};
