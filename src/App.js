import React, { useState, useEffect, useCallback } from "react";
import Calendar from "./components/Calendar";
import Auth from "./components/Auth";
import { CssBaseline, ThemeProvider, Container, Typography, AppBar, Toolbar, Button, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, Box, TextField, Snackbar, Alert, Menu, MenuItem, ListItemIcon, ListItemText, Divider, CircularProgress, Tooltip, Avatar } from "@mui/material";
import LogoutIcon from '@mui/icons-material/Logout';
import StarIcon from '@mui/icons-material/Star';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import EditIcon from '@mui/icons-material/Edit';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addUserToFirestore, getUserNickname, updateUserNickname, isNicknameTaken, isUserMaster } from "./firestoreService";


import { lightTheme, darkTheme } from './theme';
import { NICKNAME_MAX_LENGTH, PENDING_NICKNAME_KEY } from './constants';

function App() {
    const [user, setUser] = useState(null);
    const [nickname, setNickname] = useState("");
    const [showNicknameDialog, setShowNicknameDialog] = useState(false);
    const [isSavingNickname, setIsSavingNickname] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem("darkMode");
        return savedMode === "true";
    });

    // Master Mode: assegnata lato server tramite la collection "masters" in Firestore
    const [isMaster, setIsMaster] = useState(false);

    // Identità stabile: Calendar la usa come dipendenza delle sottoscrizioni realtime
    const showMessage = useCallback((message, severity = "info") => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                setUser(null);
                setIsMaster(false);
                return;
            }

            let savedNickname = await getUserNickname(currentUser.uid);

            // Primo accesso: il nickname scelto in fase di registrazione viaggia
            // via sessionStorage. Il profilo Firestore viene scritto solo qui,
            // così non ci sono due scritture in gara sullo stesso documento.
            if (!savedNickname) {
                const pendingNickname = sessionStorage.getItem(PENDING_NICKNAME_KEY);
                sessionStorage.removeItem(PENDING_NICKNAME_KEY);
                if (pendingNickname && !(await isNicknameTaken(pendingNickname, currentUser.uid))) {
                    savedNickname = pendingNickname;
                }
            }

            if (savedNickname) {
                // Tiene allineata l'email nel DB anche per i vecchi account
                await addUserToFirestore(currentUser.uid, savedNickname, currentUser.email);
                setUser({ ...currentUser, nickname: savedNickname });
            } else {
                setUser({ ...currentUser, nickname: "Anonimo" });
                setNickname("");
                setShowNicknameDialog(true);
            }

            setIsMaster(await isUserMaster(currentUser.uid));
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        localStorage.setItem("darkMode", darkMode);
        document.body.classList.toggle('dark-mode', darkMode);
    }, [darkMode]);

    const handleLogout = async () => {
        await signOut(auth);
        setShowLogoutDialog(false);
        showMessage("Logout effettuato con successo", "success");
    };

    const handleNicknameUpdate = async () => {
        const trimmedNickname = nickname.trim();

        if (!trimmedNickname) {
            showMessage("Il nickname è obbligatorio.", "warning");
            return;
        }
        if (trimmedNickname.length > NICKNAME_MAX_LENGTH) {
            showMessage(`Il nickname non può superare i ${NICKNAME_MAX_LENGTH} caratteri.`, "warning");
            return;
        }
        if (trimmedNickname.toLowerCase() === "anonimo") {
            showMessage("Scegli un nickname diverso da \"Anonimo\".", "warning");
            return;
        }

        setIsSavingNickname(true);
        try {
            const isTaken = await isNicknameTaken(trimmedNickname, user.uid);
            if (isTaken) {
                showMessage("Questo nickname è già in uso da un'altra persona.", "error");
                return;
            }

            await updateUserNickname(user.uid, trimmedNickname, user.email);
            setUser((prevUser) => ({ ...prevUser, nickname: trimmedNickname }));
            setNickname(trimmedNickname);
            setShowNicknameDialog(false);
            showMessage("Nickname aggiornato con successo!", "success");
        } catch (error) {
            console.error("handleNicknameUpdate error:", error);
            showMessage("Errore nell'aggiornamento del nickname. Riprova.", "error");
        } finally {
            setIsSavingNickname(false);
        }
    };

    const [menuAnchorEl, setMenuAnchorEl] = useState(null);

    const handleMenuOpen = (event) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    return (
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <Box sx={{ p: { xs: 0, sm: 2 }, pb: { xs: 0, sm: 0 } }}>
                <AppBar position="static" elevation={2} style={{ borderRadius: "20px" }}>
                    <Toolbar sx={{ flexWrap: "wrap", justifyContent: "space-between", py: { xs: 1, sm: 0 } }}>
                        <Box display="flex" alignItems="center" gap={1.5} sx={{ flexGrow: { xs: 0, sm: 1 } }}>
                            <img
                                src={process.env.PUBLIC_URL + '/logo512.png'}
                                alt="Logo"
                                style={{ width: 40, height: 40, borderRadius: 10, boxShadow: "0px 1px 4px rgba(0,0,0,0.2)" }}
                            />
                            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 500 }}>
                                Calendario Disponibilità
                            </Typography>
                        </Box>
                        {user ? (
                            <Box display="flex" alignItems="center" flexWrap="nowrap" justifyContent="flex-end" gap={1}>
                                {isMaster && (
                                    <Tooltip title="Master Mode Attiva">
                                        <Box display="flex" alignItems="center" bgcolor="#FFF8E1" borderRadius="50%" p={0.5} sx={{ mr: 0.5, cursor: "help", boxShadow: "0px 1px 3px rgba(0,0,0,0.15)" }}>
                                            <StarIcon sx={{ color: '#F4B400', fontSize: '1.2rem' }} />
                                        </Box>
                                    </Tooltip>
                                )}
                                <IconButton onClick={handleMenuOpen} edge="end" sx={{ ml: 0.5, p: 0.5 }}>
                                    <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.container", color: "primary.main", fontSize: "0.95rem", fontWeight: 600 }}>
                                        {(user.nickname || "?").charAt(0).toUpperCase()}
                                    </Avatar>
                                </IconButton>

                                <Menu
                                    anchorEl={menuAnchorEl}
                                    open={Boolean(menuAnchorEl)}
                                    onClose={handleMenuClose}
                                    PaperProps={{
                                        elevation: 3,
                                        sx: { overflow: 'visible', mt: 1.5, minWidth: 200 }
                                    }}
                                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                >
                                    <MenuItem onClick={() => {
                                        setNickname(user.nickname === "Anonimo" ? "" : user.nickname);
                                        setShowNicknameDialog(true);
                                        handleMenuClose();
                                    }}>
                                        <ListItemIcon>
                                            <EditIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>
                                            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                                {user.nickname} (Modifica)
                                            </Typography>
                                        </ListItemText>
                                    </MenuItem>
                                    <Divider />
                                    <MenuItem onClick={() => {
                                        setDarkMode(!darkMode);
                                        handleMenuClose();
                                    }}>
                                        <ListItemIcon>
                                            {darkMode ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
                                        </ListItemIcon>
                                        <ListItemText>
                                            {darkMode ? "Tema Chiaro" : "Tema Scuro"}
                                        </ListItemText>
                                    </MenuItem>

                                    {isMaster && (
                                        <MenuItem disableRipple sx={{ cursor: 'default', '&:hover': { backgroundColor: 'transparent' } }}>
                                            <ListItemIcon>
                                                <Box display="flex" alignItems="center" bgcolor="#FFF8E1" borderRadius="50%" p={0.5}>
                                                    <StarIcon sx={{ color: '#F4B400', fontSize: '1rem' }} />
                                                </Box>
                                            </ListItemIcon>
                                            <ListItemText sx={{ color: "text.primary" }}>Master Mode Attiva</ListItemText>
                                        </MenuItem>
                                    )}
                                    <Divider />
                                    <MenuItem onClick={() => {
                                        setShowLogoutDialog(true);
                                        handleMenuClose();
                                    }}>
                                        <ListItemIcon>
                                            <LogoutIcon color="error" fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText sx={{ color: 'error.main' }}>
                                            Logout
                                        </ListItemText>
                                    </MenuItem>
                                </Menu>
                            </Box>
                        ) : null}
                    </Toolbar>
                </AppBar>
            </Box>
            <Container maxWidth="xl" sx={{ p: { xs: 0.5, sm: 2 }, mt: { xs: 1, sm: 2 } }}>
                {user ? (
                    <Calendar user={user} darkMode={darkMode} setDarkMode={setDarkMode} showMessage={showMessage} isMaster={isMaster} />
                ) : (
                    <Auth showMessage={showMessage} />
                )}
            </Container>
            <Dialog
                open={showNicknameDialog}
                onClose={() => !isSavingNickname && user && user.nickname !== "Anonimo" && setShowNicknameDialog(false)}
                PaperProps={{ sx: { width: "100%", maxWidth: 400 } }}
            >
                <DialogTitle sx={{ fontWeight: 500 }}>Imposta il tuo Nickname</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Nickname"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        disabled={isSavingNickname}
                        inputProps={{ maxLength: NICKNAME_MAX_LENGTH }}
                        helperText={`Massimo ${NICKNAME_MAX_LENGTH} caratteri`}
                    />
                </DialogContent>
                <DialogActions>
                    {user && user.nickname !== "Anonimo" && (
                        <Button onClick={() => setShowNicknameDialog(false)} color="inherit" disabled={isSavingNickname}>
                            Annulla
                        </Button>
                    )}
                    <Button onClick={handleNicknameUpdate} color="primary" variant="contained" disabled={isSavingNickname}>
                        {isSavingNickname ? <CircularProgress size={20} sx={{ mr: 1, color: "white" }} /> : null}
                        {isSavingNickname ? "Salvataggio..." : "Salva"}
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

            <Dialog open={showLogoutDialog} onClose={() => setShowLogoutDialog(false)} PaperProps={{ sx: { width: "100%", maxWidth: 380 } }}>
                <DialogTitle sx={{ fontWeight: 500 }}>Conferma Logout</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Sei sicuro di voler effettuare il logout?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowLogoutDialog(false)} color="inherit">Annulla</Button>
                    <Button onClick={handleLogout} color="error" variant="contained">Logout</Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
}

export default App;
