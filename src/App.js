import React, { useState, useEffect } from "react";
import Calendar from "./components/Calendar";
import Auth from "./components/Auth";
import { CssBaseline, ThemeProvider, Container, Typography, AppBar, Toolbar, Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Fab, TextField } from "@mui/material";
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addUserToFirestore, getUserNickname, updateUserNickname } from "./firestoreService";

import { lightTheme, darkTheme } from './theme';

function App() {
    const [user, setUser] = useState(null);
    const [nickname, setNickname] = useState("");
    const [showNicknameDialog, setShowNicknameDialog] = useState(false);
    const [error, setError] = useState(null);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

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

    useEffect(() => {
        document.body.classList.toggle('dark-mode', darkMode);
    }, [darkMode]);

    const handleLogout = async () => {
        await signOut(auth);
        setShowLogoutDialog(false);
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
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <AppBar position="sticky" elevation={0}>
                <Toolbar>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        Calendario Disponibilità
                    </Typography>
                    {user ? (
                        <Box display="flex" alignItems="center">
                            <Typography variant="body1" style={{ marginRight: "10px" }}>
                                {user.nickname}
                            </Typography>
                            <Button color="inherit" onClick={() => setShowLogoutDialog(true)} size="small" startIcon={<LogoutIcon />}>
                                Logout
                            </Button>
                        </Box>
                    ) : null}
                </Toolbar>
            </AppBar>
            <Container maxWidth="xl" style={{ padding: "10px", marginTop: "10px" }}>
                {user ? (
                    <Calendar user={user} />
                ) : (
                    <Auth setUser={setUser} setError={setError} setShowNicknameDialog={setShowNicknameDialog} />
                )}
            </Container>
            <Dialog open={showNicknameDialog} onClose={() => { }}>
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
        </ThemeProvider>
    );
}

export default App;