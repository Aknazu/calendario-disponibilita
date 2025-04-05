import React, { useState, useEffect } from "react";
import Calendar from "./components/Calendar";
import { CssBaseline, ThemeProvider, createTheme, Container, Typography, AppBar, Toolbar, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Box, Fab, Menu, MenuItem, Select } from "@mui/material";
import GoogleIcon from '@mui/icons-material/Google';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AddIcon from '@mui/icons-material/Add';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { addUserToFirestore, getUserNickname, updateUserNickname, updateEventsNickname, isNicknameUnique, addEvent, getEvents } from "./firestoreService";
import Cookies from 'js-cookie';

const d20Icon = process.env.PUBLIC_URL + '/d20.png';

const lightTheme = createTheme({
    palette: {
        mode: "light",
        primary: { main: "#6200ea" },
        secondary: { main: "#03dac6" },
    },
    typography: {
        fontFamily: "Roboto, Arial, sans-serif",
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: "none",
                },
            },
        },
    },
});

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#bb86fc" },
        secondary: { main: "#03dac6" },
        background: {
            default: "#121212",
            paper: "#1d1d1d",
        },
        text: {
            primary: "#ffffff",
            secondary: "#b0b0b0",
        },
    },
    typography: {
        fontFamily: "Roboto, Arial, sans-serif",
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: "none",
                },
            },
        },
    },
});

function App() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [showNicknameDialog, setShowNicknameDialog] = useState(false);
    const [error, setError] = useState(null);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [showMultiEventDialog, setShowMultiEventDialog] = useState(false);
    const [multiEventDates, setMultiEventDates] = useState("");
    const [multiEventType, setMultiEventType] = useState("");
    const [events, setEvents] = useState([]);

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
                const token = Cookies.get('authToken');
                if (token) {
                    auth.signInWithCustomToken(token).then(async (userCredential) => {
                        const user = userCredential.user;
                        let savedNickname = await getUserNickname(user.uid);
                        if (!savedNickname) {
                            savedNickname = "Anonimo";
                            await addUserToFirestore(user.uid, savedNickname);
                        }
                        setUser({ ...user, nickname: savedNickname });
                    }).catch((error) => {
                        console.error("Errore durante l'autenticazione automatica:", error);
                    });
                } else {
                    setUser(null);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        document.body.classList.toggle('dark-mode', darkMode);
    }, [darkMode]);

    useEffect(() => {
        const fetchEvents = async () => {
            if (user) {
                const events = await getEvents();
                setEvents(events);
            }
        };
        fetchEvents();
    }, [user]);

    const handleLogin = async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const token = await user.getIdToken();
            Cookies.set('authToken', token, { expires: 7 });
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

            const isUnique = await isNicknameUnique(nickname);
            if (!isUnique) {
                setError("Il nickname è già in uso. Scegli un altro nickname.");
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const token = await user.getIdToken();
            Cookies.set('authToken', token, { expires: 7 });

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
            const token = await user.getIdToken();
            Cookies.set('authToken', token, { expires: 7 });

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
        Cookies.remove('authToken');
        setShowLogoutDialog(false);
    };

    const handleNicknameUpdate = async () => {
        if (!nickname) {
            setError("Il nickname è obbligatorio.");
            return;
        }

        const isUnique = await isNicknameUnique(nickname);
        if (!isUnique) {
            setError("Il nickname è già in uso. Scegli un altro nickname.");
            return;
        }

        await updateUserNickname(user.uid, nickname);
        await updateEventsNickname(user.uid, nickname);
        setUser((prevUser) => ({ ...prevUser, nickname }));
        setShowNicknameDialog(false);
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleChangeNicknameClick = () => {
        setShowNicknameDialog(true);
        handleMenuClose();
    };

    const handleMultiEventSubmit = async () => {
        const dates = parseDates(multiEventDates);
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0'); // Ottieni il mese corrente (1-12) e formatta con due cifre
        const currentYear = new Date().getFullYear(); // Ottieni l'anno corrente
        console.log("Dates to add:", dates); // Log per il debug
        for (const date of dates) {
            const day = String(date).padStart(2, '0'); // Format the day with two digits
            const fullDate = `${currentYear}-${currentMonth}-${day}`;
            try {
                console.log(`Trying to add event for date: ${fullDate}, type: ${multiEventType}, nickname: ${user.nickname}`); // Log per il debug
                await addEvent(user.uid, fullDate, multiEventType, user.nickname);
                console.log(`Evento aggiunto per il giorno ${fullDate}`); // Log per il debug
            } catch (error) {
                console.error(`Errore nell'aggiunta dell'evento per il giorno ${fullDate}:`, error);
            }
        }
        setShowMultiEventDialog(false);
        window.location.reload(); // Ricarica la pagina dopo l'inserimento degli eventi
    };

    const parseDates = (input) => {
        const dates = [];
        const parts = input.split(',');
        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    dates.push(i);
                }
            } else {
                dates.push(Number(part));
            }
        });
        return dates;
    };

    return (
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <AppBar position="static" style={{ borderRadius: "20px" }}>
                <Toolbar>
                    <img src={d20Icon} alt="d20 icon" style={{ height: "40px", marginRight: "10px" }} />
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        Calendario Disponibilità
                    </Typography>
                    {user ? (
                        <Box display="flex" alignItems="center">
                            <Typography variant="body1" style={{ marginRight: "10px", cursor: "pointer" }} onClick={handleMenuOpen}>
                                {user.nickname}
                            </Typography>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                            >
                                <MenuItem onClick={handleChangeNicknameClick}>Cambia nickname</MenuItem>
                            </Menu>
                            <Button color="inherit" onClick={() => setShowLogoutDialog(true)} size="small" startIcon={<LogoutIcon />}>
                                Logout
                            </Button>
                        </Box>
                    ) : null}
                </Toolbar>
            </AppBar>
            <Container maxWidth="lg" style={{ padding: "20px" }}>
                {user ? (
                    <Calendar user={user} events={events} />
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
                        <Box display="flex" justifyContent="space-between" mt={2}>
                            {isRegistering ? (
                                <Button variant="contained" color="primary" fullWidth onClick={handleRegister}>
                                    Registrati
                                </Button>
                            ) : (
                                <Button variant="contained" color="primary" fullWidth onClick={handleLogin}>
                                    Login
                                </Button>
                            )}
                            <Button
                                variant="outlined"
                                color="default"
                                fullWidth
                                onClick={handleGoogleLogin}
                                startIcon={<GoogleIcon />}
                                style={{
                                    backgroundColor: "white",
                                    borderColor: "black",
                                    color: "black",
                                    textTransform: "none",
                                    marginLeft: "10px"
                                }}
                            >
                                Accedi tramite Google
                            </Button>
                        </Box>
                        <Button color="secondary" fullWidth onClick={() => setIsRegistering(!isRegistering)}>
                            {isRegistering ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
                        </Button>
                    </div>
                )}
            </Container>
            <Dialog open={showNicknameDialog} onClose={() => setShowNicknameDialog(false)}>
                <DialogTitle>Cambia il tuo Nickname</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Nuovo Nickname"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowNicknameDialog(false)} color="default">Annulla</Button>
                    <Button onClick={handleNicknameUpdate} color="primary">
                        Salva
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={!!error} onClose={() => setError(null)}>
                <DialogTitle>Errore</DialogTitle>
                <DialogContent>{error}</DialogContent>
                <DialogActions>
                    <Button onClick={() => setError(null)} color="primary">OK</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={showLogoutDialog} onClose={() => setShowLogoutDialog(false)}>
                <DialogTitle>Conferma Logout</DialogTitle>
                <DialogContent>Sei sicuro di voler effettuare il logout?</DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowLogoutDialog(false)} color="default">Annulla</Button>
                    <Button onClick={handleLogout} color="primary">Logout</Button>
                </DialogActions>
            </Dialog>
            <Fab
                color="primary"
                aria-label="toggle dark mode"
                onClick={() => setDarkMode(!darkMode)}
                style={{ position: "fixed", bottom: 16, right: 16 }}
            >
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </Fab>
            <Fab
                color="primary"
                aria-label="add multiple events"
                onClick={() => setShowMultiEventDialog(true)}
                style={{ position: "fixed", bottom: 80, right: 16 }}
            >
                <AddIcon />
            </Fab>
            <Dialog open={showMultiEventDialog} onClose={() => setShowMultiEventDialog(false)}>
                <DialogTitle>Inserisci Eventi Multipli</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Giorni (es. 1-5,7,8)"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={multiEventDates}
                        onChange={(e) => setMultiEventDates(e.target.value)}
                    />
                    <Select
                        label="Tipo di Evento"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={multiEventType}
                        onChange={(e) => setMultiEventType(e.target.value)}
                    >
                        <MenuItem value="disponibile">Disponibile</MenuItem>
                        <MenuItem value="disponibilita-limitata">Disponibilità Limitata</MenuItem>
                        <MenuItem value="forse">Forse</MenuItem>
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowMultiEventDialog(false)} color="default">Annulla</Button>
                    <Button onClick={handleMultiEventSubmit} color="primary">Inserisci</Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
}

export default App;

