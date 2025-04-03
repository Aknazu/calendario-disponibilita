import React, { useState, useEffect } from "react";
import Calendar from "./components/Calendar";
import { CssBaseline, ThemeProvider, createTheme, Container, Typography, AppBar, Toolbar, Button, TextField } from "@mui/material";
import GoogleIcon from '@mui/icons-material/Google';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { addUserToFirestore, getUserNickname } from "./firestoreService";

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const nickname = await getUserNickname(currentUser.uid);
                setUser({ ...currentUser, nickname });
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Errore nel login:", error.message);
        }
    };

    const handleRegister = async () => {
        if (!nickname.trim()) {
            alert("Il nickname è obbligatorio.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await addUserToFirestore(user.uid, nickname);
            setUser({ ...user, nickname });
        } catch (error) {
            console.error("Errore nella registrazione:", error.message);
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            let nickname = await getUserNickname(user.uid);

            if (!nickname) {
                nickname = prompt("Inserisci il tuo nickname:");
                if (nickname) {
                    await addUserToFirestore(user.uid, nickname);
                } else {
                    alert("Il nickname è obbligatorio.");
                    await signOut(auth);
                    return;
                }
            }

            setUser({ ...user, nickname });
        } catch (error) {
            console.error("Errore nel login con Google:", error);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
    };

    if (loading) return <Typography>Caricamento...</Typography>;

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
        </ThemeProvider>
    );
}

export default App;
