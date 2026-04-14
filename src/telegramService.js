export const sendTelegramGroupMessage = async (formattedDate, masterNickname, availablePlayers) => {
    // Ora usiamo Make.com (Webhook sicuro) per non esporre il Token di Telegram
    const webhookUrl = process.env.REACT_APP_MAKE_WEBHOOK_URL;

    if (!webhookUrl || webhookUrl === "YOUR_MAKE_WEBHOOK_URL") {
        console.warn("Webhook Make.com non configurato. Salto notifica.");
        return false;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Mandiamo a Make solo i dati che ci servono!
            // Nessuna chiave segreta o password parte dal browser dell'utente
            body: JSON.stringify({
                type: "session_confirmed",
                date: formattedDate,
                master: masterNickname,
                players: availablePlayers.join(", ") || "Nessuno (Attenzione!)",
                origin: window.location.origin
            })
        });

        if (!response.ok) {
            console.error("Errore risposta dal Webhook Make:", await response.text());
            return false;
        }

        console.log("Notifica inviata con successo al Webhook");
        return true;
    } catch (error) {
        console.error("Errore di rete verso Webhook Make:", error);
        return false;
    }
};

export const sendTelegramFivePlayersMessage = async (formattedDate, players) => {
    const webhookUrl = process.env.REACT_APP_MAKE_WEBHOOK_URL;

    if (!webhookUrl || webhookUrl === "YOUR_MAKE_WEBHOOK_URL") {
        console.warn("Webhook Make.com non configurato. Salto notifica dei 5 giocatori.");
        return false;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: "five_players",
                date: formattedDate,
                players: players.join(", ") || "Nessuno (Attenzione!)",
                origin: window.location.origin
            })
        });

        if (!response.ok) {
            console.error("Errore risposta dal Webhook Make per 5 giocatori:", await response.text());
            return false;
        }

        console.log("Notifica '5 giocatori' inviata con successo al Webhook");
        return true;
    } catch (error) {
        console.error("Errore di rete verso Webhook Make:", error);
        return false;
    }
};

export const sendTelegramStatusChangeMessage = async (formattedDate, playerNickname, newStatus) => {
    const webhookUrl = process.env.REACT_APP_MAKE_WEBHOOK_URL;

    if (!webhookUrl || webhookUrl === "YOUR_MAKE_WEBHOOK_URL") {
        console.warn("Webhook Make.com non configurato. Salto notifica di cambio status.");
        return false;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: "status_change",
                date: formattedDate,
                player: playerNickname,
                newStatus: newStatus,
                origin: window.location.origin
            })
        });

        if (!response.ok) {
            console.error("Errore risposta dal Webhook Make per cambio status:", await response.text());
            return false;
        }

        console.log("Notifica 'Cambio Status' inviata con successo al Webhook");
        return true;
    } catch (error) {
        console.error("Errore di rete verso Webhook Make (cambio status):", error);
        return false;
    }
};
