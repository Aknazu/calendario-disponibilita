# Calendario Disponibilità

Questo progetto è un'applicazione web per gestire la disponibilità degli utenti utilizzando un calendario interattivo. È stato sviluppato utilizzando React, Firebase e Material-UI.

## Funzionalità

- Visualizzazione del calendario con eventi
- Aggiunta, modifica e cancellazione di eventi
- Autenticazione degli utenti tramite email/password e Google
- Supporto per modalità chiara e scura

## Tecnologie Utilizzate

- React
- Firebase (Firestore, Authentication)
- Material-UI
- FullCalendar
- Tailwind CSS

## Installazione

1. Clona il repository:
    ```bash
    git clone https://github.com/Aknazu/calendario-disponibilita.git
    cd calendario-disponibilita
    ```

2. Installa le dipendenze:
    ```bash
    npm install
    ```

3. Configura Firebase:
    - Crea un progetto su [Firebase](https://firebase.google.com/).
    - Configura Firestore e Authentication.
    - Crea un file `src/firebaseConfig.js` e aggiungi la tua configurazione Firebase:
        ```javascript
        import { initializeApp } from "firebase/app";
        import { getFirestore } from "firebase/firestore";
        import { getAuth } from "firebase/auth";

        const firebaseConfig = {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_AUTH_DOMAIN",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_STORAGE_BUCKET",
            messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
            appId: "YOUR_APP_ID"
        };

        const app = initializeApp(firebaseConfig);
        export const db = getFirestore(app);
        export const auth = getAuth(app);
        ```

## Utilizzo

1. Avvia l'applicazione in modalità sviluppo:
    ```bash
    npm start
    ```

2. Apri [http://localhost:3000](http://localhost:3000) nel tuo browser per visualizzare l'applicazione.

## Script Disponibili

- `npm start`: Avvia l'applicazione in modalità sviluppo.
- `npm test`: Esegue i test in modalità interattiva.
- `npm run build`: Compila l'applicazione per la produzione.
- `npm run eject`: Estrae la configurazione di Create React App.

## Contribuire

Se desideri contribuire a questo progetto, sentiti libero di aprire una pull request o segnalare un problema.

## Licenza

Questo progetto è distribuito sotto la licenza MIT. Vedi il file `LICENSE` per maggiori dettagli.