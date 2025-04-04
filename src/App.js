import React, { useState, useEffect } from "react";
import Calendar from "./components/Calendar";
import { CssBaseline, ThemeProvider, createTheme, Container, Typography, AppBar, Toolbar, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import GoogleIcon from '@mui/icons-material/Google';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { addUserToFirestore, getUserNickname, updateUserNickname } from "./firestoreService";

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#1a73e8" },
        secondary: { main: "#fbbc04" },
    },
    typography: {
        fontFamily: "Roboto, Arial, sans-serif",
    },
});

function App() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [showNicknameDialog, setShowNicknameDialog] = useState(false);
    const [error, setError] = useState(null); // Stato per il popup di errore

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                let savedNickname = await getUserNickname(currentUser.uid);
                if (!savedNickname) {
                    savedNickname = "Anonimo";
                    await addUserToFirestore(currentUser.uid, savedNickname);
                }

                setUser({ ...currentUser, nickname: savedNickname });

                if (savedNickname === "Anonimo") {
                    setShowNicknameDialog(true);
                }
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (error.code === "auth/invalid-credential") {
                setError("Credenziali errate. Se hai effettuato la registrazione con Google, prova ad accedere con quell'opzione.");
            } else {
                setError("Errore durante il login.");
            }
        }
    };

    const handleRegister = async () => {
        try {
            if (!nickname) {
                setError("Il nickname è obbligatorio.");
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await addUserToFirestore(user.uid, nickname);
            setUser({ ...user, nickname });
        } catch (error) {
            if (error.code === "auth/weak-password") {
                setError("La password è troppo debole. Deve contenere almeno 6 caratteri.");
            } else {
                setError("Errore durante la registrazione.");
            }
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            let savedNickname = await getUserNickname(user.uid);
            if (!savedNickname) {
                savedNickname = "Anonimo";
                await addUserToFirestore(user.uid, savedNickname);
            }

            setUser({ ...user, nickname: savedNickname });

            if (savedNickname === "Anonimo") {
                setShowNicknameDialog(true);
            }
        } catch (error) {
            setError("Errore nel login con Google.");
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    const handleNicknameUpdate = async () => {
        if (!nickname) {
            setError("Il nickname è obbligatorio.");
            return;
        }
        await updateUserNickname(user.uid, nickname);
        setUser((prevUser) => ({ ...prevUser, nickname }));
        setShowNicknameDialog(false);
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        Calendario Disponibilità
                    </Typography>
                    {user ? (
                        <>
                            <Typography variant="body1" style={{ marginRight: "10px" }}>
                                {user.nickname}
                            </Typography>
                            <Button color="inherit" onClick={handleLogout}>
                                Logout
                            </Button>
                        </>
                    ) : (
                        <Button color="inherit" onClick={handleGoogleLogin} startIcon={<GoogleIcon />}>
                            Accedi con Google
                        </Button>
                    )}
                </Toolbar>
            </AppBar>
            <Container maxWidth="lg" style={{ padding: "20px" }}>
                {user ? (
                    <Calendar user={user} />
                ) : (
                    <div style={{ textAlign: "center" }}>
                        <Typography variant="h6">Effettua il login</Typography>
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
                            />
                        )}
                        {isRegistering ? (
                            <Button variant="contained" color="primary" fullWidth onClick={handleRegister}>
                                Registrati
                            </Button>
                        ) : (
                            <Button variant="contained" color="primary" fullWidth onClick={handleLogin}>
                                Login
                            </Button>
                        )}
                        <Button color="secondary" fullWidth onClick={() => setIsRegistering(!isRegistering)}>
                            {isRegistering ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
                        </Button>
                    </div>
                )}
            </Container>

            {/* Popup per modificare il nickname se è "Anonimo" */}
            <Dialog open={showNicknameDialog} onClose={() => {}}>
                <DialogTitle>Imposta il tuo Nickname</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Nickname"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleNicknameUpdate} color="primary">
                        Salva
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Popup di errore */}
            <Dialog open={!!error} onClose={() => setError(null)}>
                <DialogTitle>Errore</DialogTitle>
                <DialogContent>{error}</DialogContent>
                <DialogActions>
                    <Button onClick={() => setError(null)} color="primary">OK</Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
}

export default App;
