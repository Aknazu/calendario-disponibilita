import React, { useState, useEffect } from "react";
import Calendar from "./components/Calendar";
import { CssBaseline, ThemeProvider, createTheme, Container, Typography, AppBar, Toolbar, Button, TextField } from "@mui/material";
import GoogleIcon from '@mui/icons-material/Google';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

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
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
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
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Errore nella registrazione:", error.message);
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Errore nel login con Google:", error);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
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
                                {user.email || user.displayName}
                            </Typography>
                            <Button color="inherit" onClick={handleLogout}>
                                Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button color="inherit" onClick={handleGoogleLogin} startIcon={<GoogleIcon />}>
                                Accedi con Google
                            </Button>
                        </>
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
