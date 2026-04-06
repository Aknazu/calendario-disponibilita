# 🗓 D&D Session Calendar

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase) ![Material UI](https://img.shields.io/badge/MUI-%230081CB.svg?style=for-the-badge&logo=mui&logoColor=white) 

Un'applicazione web elegante e intuitiva costruita in React per gestire e organizzare le sessioni di **Dungeons & Dragons** (o altri giochi di ruolo). Permette al Master e ai Giocatori di indicare le proprie disponibilità sul calendario, incrociare i dati e ricevere notifiche automatiche via Telegram.

## ✨ Funzionalità

- **Gestione delle Disponibilità:** I giocatori possono segnare i giorni in cui sono *Disponibili*, *Forse* o *Assenti*.
- **Inserimento Multiplo:** Modalità "bulk" per selezionare velocemente più giorni con un solo click e aggiornare il proprio stato.
- **Supporto Visivo Immediato:** Corona da Re/Regina nei giorni in cui ci sono almeno 4 o 5 persone disponibili, per facilitare il colpo d'occhio.
- **Gestione "Master":** L'utente Master ha i poteri per confermare il giorno della Sessione in base alle disponibilità.
- **Aggiunta a Google Calendar:** Esportazione veloce al proprio calendario personale con 1-click.
- **Notifiche Telegram Automatiche:** 
  - Notifica al gruppo quando viene **confermata la sessione**.
  - Notifica automatica non appena viene rilevato per una data il traguardo di **5 giocatori disponibili**.
- **Dark Mode Support:** Tema Scuro/Chiaro supportato nativamente dall'interfaccia.
- **Installazione come Web App (PWA):** Interfaccia Mobile-first compatibile con gesti di "Swipe" sul calendario e predisposta.

---

## 🚀 Tecnologie Utilizzate

- **Frontend:** React.js, Material UI (MUI), FullCalendar (per la gestione della griglia mensile e settimanale).
- **Backend & Database:** Google Firebase (Firestore per i dati degli eventi e utenti, Firebase Authentication).
- **Integrazioni:** Webhooks tramite [Make.com](https://make.com) per interagire in totale sicurezza col Bot di Telegram, senza esporre token sensibili nel frontend.

---

## 🛠 Setup e Installazione Locale

Per far girare questo progetto in locale sul tuo computer, segui i passaggi:

### 1. Clona la repository e installa le dipendenze
```bash
git clone <url-del-progetto>
cd calendario-disponibilita
npm install
```

### 2. Configura le variabili d'ambiente
Crea un file `.env` nella root del progetto:
```env
REACT_APP_FIREBASE_API_KEY=La_Tua_Api_Key
REACT_APP_FIREBASE_AUTH_DOMAIN=il-tuo-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=il-tuo-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=il-tuo-bucket.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1234567890
REACT_APP_FIREBASE_APP_ID=1:12345:web:abcd

# Webhook per ricevere le chiamate da Make.com -> Telegram
REACT_APP_MAKE_WEBHOOK_URL=https://hook.euX.make.com/...
```

### 3. Avvia l'ambiente di sviluppo
```bash
npm start
```
L'applicazione girerà su [http://localhost:3000](http://localhost:3000).

---

## 🤖 Come funziona l'Integrazione Telegram (Make.com)

Questa app adotta un approccio sicuro per comunicare con Telegram: non contatta mai la `Telegram Bot API` direttamente via frontend per non rischiare che i token bot finiscano in mani sbagliate. Inviamo invece i dati a un **Webhook Personalizzato** su Make.com.

Il webhook invia un oggetto JSON come questo:
```json
{
  "type": "session_confirmed", // o "five_players"
  "date": "giovedì 12/05/2026",
  "master": "NomeMaster",
  "players": "Pippo, Pluto, Topolino, Paperino, Minni",
  "origin": "https://tuo-dominio.com"
}
```

Lo scenario in Make.com filtra in base al parametro `type`:
- Se `type ➔ session_confirmed`: Invia al gruppo il recap della sessione convocata dal Master.
- Se `type ➔ five_players`: Invia al gruppo un alert avvisando che 5 giocatori hanno segnato la disponibilità per un determinato giorno.

---

## 📦 Build e Deploy

Per creare una versione di produzione ottimizzata, esegui:
```bash
npm run build
```
La cartella `build/` sarà pronta per essere caricata su servizi serverless o static-hosting.
