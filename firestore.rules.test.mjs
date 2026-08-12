import fs from "node:fs";
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const testEnv = await initializeTestEnvironment({
    projectId: "demo-calendario",
    firestore: {
        rules: fs.readFileSync(new URL("./firestore.rules", import.meta.url), "utf8"),
        host: "127.0.0.1",
        port: 8080
    }
});

const ALICE = "alice-uid";
const BOB = "bob-uid";
const MASTER = "master-uid";

// Seed dati iniziali bypassando le regole
await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", ALICE), { nickname: "Alice" });
    await setDoc(doc(db, "users", BOB), { nickname: "Bob" });
    await setDoc(doc(db, "users", MASTER), { nickname: "Master" });
    await setDoc(doc(db, "masters", MASTER), { nickname: "Master" });
    await setDoc(doc(db, "events", "ev-alice"), { userId: ALICE, date: "2026-09-01", eventType: "Disponibile", nickname: "Alice" });
    await setDoc(doc(db, "events", "ev-legacy"), { userId: ALICE, date: "2026-09-02", eventType: "Disponibilità Limitata", nickname: "Alice" });
    await setDoc(doc(db, "sessionDays", "2026-09-01"), { date: "2026-09-01" });
    await setDoc(doc(db, "settings", "master_config"), { password: "segreto" });
});

const alice = testEnv.authenticatedContext(ALICE).firestore();
const bob = testEnv.authenticatedContext(BOB).firestore();
const master = testEnv.authenticatedContext(MASTER).firestore();
const anon = testEnv.unauthenticatedContext().firestore();

let passed = 0;
let failed = 0;

const check = async (name, promise) => {
    try {
        await promise;
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (e) {
        console.log(`  FAIL  ${name}`);
        console.log(`        ${String(e.message).split("\n")[0]}`);
        failed++;
    }
};

console.log("\n== events ==");
await check("Alice crea un proprio evento",
    assertSucceeds(setDoc(doc(alice, "events", "ev-new"), { userId: ALICE, date: "2026-09-05", eventType: "Forse", nickname: "Alice" })));
await check("Alice NON può creare un evento intestato a Bob",
    assertFails(setDoc(doc(alice, "events", "ev-fake"), { userId: BOB, date: "2026-09-05", eventType: "Forse", nickname: "Bob" })));
await check("eventType non valido rifiutato",
    assertFails(setDoc(doc(alice, "events", "ev-bad"), { userId: ALICE, date: "2026-09-06", eventType: "Boh", nickname: "Alice" })));
await check("Alice aggiorna il proprio evento",
    assertSucceeds(updateDoc(doc(alice, "events", "ev-alice"), { eventType: "Assente" })));
await check("Bob NON può aggiornare l'evento di Alice",
    assertFails(updateDoc(doc(bob, "events", "ev-alice"), { eventType: "Assente" })));
await check("Il Master NON può aggiornare l'evento di Alice",
    assertFails(updateDoc(doc(master, "events", "ev-alice"), { eventType: "Assente" })));
await check("Alice NON può spostare la data del proprio evento",
    assertFails(updateDoc(doc(alice, "events", "ev-alice"), { date: "2026-12-25" })));
await check("Alice NON può riassegnare il proprio evento a Bob",
    assertFails(updateDoc(doc(alice, "events", "ev-alice"), { userId: BOB })));
await check("Rinomina nickname su evento legacy consentita",
    assertSucceeds(updateDoc(doc(alice, "events", "ev-legacy"), { nickname: "Alice2" })));
await check("Bob NON può cancellare l'evento di Alice",
    assertFails(deleteDoc(doc(bob, "events", "ev-alice"))));
await check("Alice cancella il proprio evento",
    assertSucceeds(deleteDoc(doc(alice, "events", "ev-new"))));
await check("Utente loggato legge gli eventi",
    assertSucceeds(getDocs(collection(bob, "events"))));
await check("Utente NON loggato non legge gli eventi",
    assertFails(getDocs(collection(anon, "events"))));

console.log("\n== users ==");
await check("Alice aggiorna il proprio nickname",
    assertSucceeds(setDoc(doc(alice, "users", ALICE), { nickname: "Alice Nuova" }, { merge: true })));
await check("Alice NON può modificare il profilo di Bob",
    assertFails(setDoc(doc(alice, "users", BOB), { nickname: "Hacked" }, { merge: true })));
await check("Nickname vuoto rifiutato",
    assertFails(setDoc(doc(alice, "users", ALICE), { nickname: "" }, { merge: true })));
await check("Nickname oltre 30 caratteri rifiutato",
    assertFails(setDoc(doc(alice, "users", ALICE), { nickname: "x".repeat(31) }, { merge: true })));
await check("Utente loggato legge i profili (servono i nickname)",
    assertSucceeds(getDoc(doc(bob, "users", ALICE))));

console.log("\n== sessionDays ==");
await check("Il Master imposta un giorno sessione",
    assertSucceeds(setDoc(doc(master, "sessionDays", "2026-09-10"), { date: "2026-09-10" })));
await check("Il Master rimuove un giorno sessione",
    assertSucceeds(deleteDoc(doc(master, "sessionDays", "2026-09-10"))));
await check("Alice NON può impostare un giorno sessione",
    assertFails(setDoc(doc(alice, "sessionDays", "2026-09-11"), { date: "2026-09-11" })));
await check("Alice NON può cancellare un giorno sessione",
    assertFails(deleteDoc(doc(alice, "sessionDays", "2026-09-01"))));
await check("Tutti i loggati leggono i giorni sessione",
    assertSucceeds(getDocs(collection(alice, "sessionDays"))));

console.log("\n== masters ==");
await check("Alice controlla il proprio stato Master",
    assertSucceeds(getDoc(doc(alice, "masters", ALICE))));
await check("Alice NON può leggere lo stato Master di altri",
    assertFails(getDoc(doc(alice, "masters", MASTER))));
await check("Alice NON può auto-promuoversi Master",
    assertFails(setDoc(doc(alice, "masters", ALICE), { nickname: "Alice" })));
await check("Il Master NON può nominare altri Master dal browser",
    assertFails(setDoc(doc(master, "masters", ALICE), { nickname: "Alice" })));

console.log("\n== settings (vecchia password master) ==");
await check("Nessuno può leggere settings/master_config",
    assertFails(getDoc(doc(alice, "settings", "master_config"))));
await check("Nemmeno il Master può leggere settings/master_config",
    assertFails(getDoc(doc(master, "settings", "master_config"))));

console.log(`\nRisultato: ${passed} superati, ${failed} falliti\n`);
await testEnv.cleanup();
process.exit(failed > 0 ? 1 : 0);
