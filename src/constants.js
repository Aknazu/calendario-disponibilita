// Lunghezza massima del nickname (allineata a firestore.rules)
export const NICKNAME_MAX_LENGTH = 30;

// Chiave di sessionStorage con cui la schermata di registrazione passa
// il nickname scelto al listener onAuthStateChanged di App.js
export const PENDING_NICKNAME_KEY = "pendingNickname";
