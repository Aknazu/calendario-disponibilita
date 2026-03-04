export const sendTelegramGroupMessage = async (dateStr, masterNickname) => {
    const botToken = process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.REACT_APP_TELEGRAM_CHAT_ID;

    if (!botToken || !chatId || botToken === "YOUR_BOT_TOKEN" || chatId === "YOUR_CHAT_ID") {
        console.warn("Telegram non configurato. Salto invio notifica.");
        return false;
    }

    const message = `🎲 *Nuova Sessione Fissata!*\n\n${masterNickname} ha selezionato la data *${dateStr}* per la prossima sessione. Preparate le schede!`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            console.error("Errore risposta Telegram:", await response.text());
            return false;
        }

        console.log("Notifica Telegram inviata con successo al gruppo");
        return true;
    } catch (error) {
        console.error("Errore configurazione fetch a Telegram:", error);
        return false;
    }
};
