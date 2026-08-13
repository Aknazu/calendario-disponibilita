import React, { useState } from "react";
import { TextField, Button, Box, Card, Typography, Divider } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { NICKNAME_MAX_LENGTH, PENDING_NICKNAME_KEY } from "../constants";

// Il profilo Firestore viene creato dal listener onAuthStateChanged in App.js:
// qui ci limitiamo ad autenticare e a passare il nickname scelto.
const Auth = ({ showMessage }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (error.code === "auth/invalid-credential") {
                showMessage("Credenziali errate. Se hai effettuato la registrazione con Google, prova ad accedere con quell'opzione.", "error");
            } else {
                showMessage("Errore durante il login.", "error");
            }
        }
    };

    const handleRegister = async () => {
        try {
            const trimmedNickname = nickname.trim();

            if (!trimmedNickname) {
                showMessage("Il nickname è obbligatorio.", "warning");
                return;
            }
            if (trimmedNickname.length > NICKNAME_MAX_LENGTH) {
                showMessage(`Il nickname non può superare i ${NICKNAME_MAX_LENGTH} caratteri.`, "warning");
                return;
            }
            // Il controllo sui duplicati richiede di essere autenticati (lo impongono
            // le regole Firestore): lo fa App.js subito dopo il login, e se il nome
            // risulta occupato mostra il dialog per sceglierne un altro.
            sessionStorage.setItem(PENDING_NICKNAME_KEY, trimmedNickname);
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            sessionStorage.removeItem(PENDING_NICKNAME_KEY);
            if (error.code === "auth/weak-password") {
                showMessage("La password è troppo debole. Deve contenere almeno 6 caratteri.", "warning");
            } else {
                showMessage("Errore durante la registrazione.", "error");
            }
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            showMessage("Errore nel login con Google.", "error");
        }
    };

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="calc(100vh - 96px)"
            px={2}
        >
            <Card sx={{ width: "100%", maxWidth: 420, p: { xs: 3, sm: 4 } }}>
                <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                    <img
                        src={process.env.PUBLIC_URL + '/logo512.png'}
                        alt="Logo"
                        style={{ width: 56, height: 56, borderRadius: 12, marginBottom: 16 }}
                    />
                    <Typography variant="h5" fontWeight={500} textAlign="center">
                        {isRegistering ? "Crea il tuo account" : "Bentornato"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center" mt={0.5}>
                        {isRegistering
                            ? "Registrati per segnare le tue disponibilità"
                            : "Accedi per gestire le tue disponibilità"}
                    </Typography>
                </Box>

                <TextField
                    label="Email"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    label="Password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {isRegistering && (
                    <TextField
                        label="Nickname"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        inputProps={{ maxLength: NICKNAME_MAX_LENGTH }}
                    />
                )}

                {isRegistering ? (
                    <Button variant="contained" color="primary" fullWidth size="large" onClick={handleRegister} sx={{ mt: 2 }}>
                        Registrati
                    </Button>
                ) : (
                    <Button variant="contained" color="primary" fullWidth size="large" onClick={handleLogin} sx={{ mt: 2 }}>
                        Login
                    </Button>
                )}

                <Divider sx={{ my: 3 }}>
                    <Typography variant="caption" color="text.secondary">oppure</Typography>
                </Divider>

                <Button
                    variant="outlined"
                    color="inherit"
                    fullWidth
                    size="large"
                    onClick={handleGoogleLogin}
                    startIcon={<GoogleIcon />}
                >
                    Accedi tramite Google
                </Button>

                <Button color="secondary" fullWidth onClick={() => setIsRegistering(!isRegistering)} sx={{ mt: 2 }}>
                    {isRegistering ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
                </Button>
            </Card>
        </Box>
    );
};

export default Auth;
