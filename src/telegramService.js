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
