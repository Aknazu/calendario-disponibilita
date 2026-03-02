import React, { useState, useEffect } from "react";
import Calendar from "./components/Calendar";
import Auth from "./components/Auth";
import { CssBaseline, ThemeProvider, Container, Typography, AppBar, Toolbar, Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, TextField, Snackbar, Alert } from "@mui/material";
import LogoutIcon from '@mui/icons-material/Logout';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addUserToFirestore, getUserNickname, updateUserNickname } from "./firestoreService";

import { lightTheme, darkTheme } from './theme';

function App() {
    const [user, setUser] = useState(null);
    const [nickname, setNickname] = useState("");
    const [showNicknameDialog, setShowNicknameDialog] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    const showMessage = (message, severity = "info") => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar({ ...snackbar, open: false });
    };

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
        showMessage("Logout effettuato con successo", "success");
    };

    const handleNicknameUpdate = async () => {
        if (!nickname) {
            showMessage("Il nickname è obbligatorio.", "warning");
            return;
        }
        await updateUserNickname(user.uid, nickname);
        setUser((prevUser) => ({ ...prevUser, nickname }));
        setShowNicknameDialog(false);
    };

    return (
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <AppBar position="static" elevation={2} style={{ borderRadius: "20px" }}>
                <Toolbar sx={{ flexWrap: "wrap", justifyContent: "space-between", py: { xs: 1, sm: 0 } }}>
                    <Box display="flex" alignItems="center" sx={{ flexGrow: { xs: 0, sm: 1 } }}>
                        <img src={process.env.PUBLIC_URL + '/logo512.png'} alt="Logo" style={{ width: '40px', height: '40px', marginRight: '10px', borderRadius: '8px' }} />
                        <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                            Calendario Disponibilità
                        </Typography>
                    </Box>
                    {user ? (
                        <Box display="flex" alignItems="center" flexWrap="nowrap" justifyContent="flex-end" gap={1}>
                            <Typography variant="body1" sx={{ fontWeight: "bold", fontSize: { xs: '0.9rem', sm: '1rem' }, whiteSpace: "nowrap" }}>
                                {user.nickname}
                            </Typography>
                            <Button color="inherit" onClick={() => setShowLogoutDialog(true)} size="small" startIcon={<LogoutIcon />} sx={{ whiteSpace: "nowrap", minWidth: "auto", px: { xs: 1, sm: 2 } }}>
                                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline-block' } }}>Logout</Box>
                            </Button>
                        </Box>
                    ) : null}
                </Toolbar>
            </AppBar>
            <Container maxWidth="xl" style={{ padding: "10px", marginTop: "10px" }}>
                {user ? (
                    <Calendar user={user} darkMode={darkMode} setDarkMode={setDarkMode} showMessage={showMessage} />
                ) : (
                    <Auth setUser={setUser} showMessage={showMessage} setShowNicknameDialog={setShowNicknameDialog} />
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
                    <Button onClick={handleNicknameUpdate} color="primary" variant="contained">
                        Salva
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 3 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Dialog open={showLogoutDialog} onClose={() => setShowLogoutDialog(false)}>
                <DialogTitle>Conferma Logout</DialogTitle>
                <DialogContent>Sei sicuro di voler effettuare il logout?</DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowLogoutDialog(false)} color="default">Annulla</Button>
                    <Button onClick={handleLogout} color="primary">Logout</Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
}

export default App;