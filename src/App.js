import React, { useState, useEffect } from "react";
import Calendar from "./components/Calendar";
import Auth from "./components/Auth";
import { CssBaseline, ThemeProvider, Container, Typography, AppBar, Toolbar, Button, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, Box, TextField, Snackbar, Alert, Menu, MenuItem, ListItemIcon, ListItemText, Divider, CircularProgress, Tooltip } from "@mui/material";
import LogoutIcon from '@mui/icons-material/Logout';
import StarIcon from '@mui/icons-material/Star';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import EditIcon from '@mui/icons-material/Edit';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addUserToFirestore, getUserNickname, updateUserNickname, isNicknameTaken, verifyMasterPassword } from "./firestoreService";

import { lightTheme, darkTheme } from './theme';

function App() {
    const [user, setUser] = useState(null);
    const [nickname, setNickname] = useState("");
    const [showNicknameDialog, setShowNicknameDialog] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem("darkMode");
        return savedMode === "true";
    });

    // Master Mode
    const [isMaster, setIsMaster] = useState(false);
    const [showMasterDialog, setShowMasterDialog] = useState(false);
    const [masterPassword, setMasterPassword] = useState("");
    const [isCheckingPassword, setIsCheckingPassword] = useState(false);

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
                }

                // Assicurati che l'email sia aggiornata nel DB in caso di vecchi account
                if (currentUser.email) {
                    await addUserToFirestore(currentUser.uid, savedNickname, currentUser.email);
                } else {
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
        localStorage.setItem("darkMode", darkMode);
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

        // Verifica se il nickname è già in uso da un'altra persona
        const isTaken = await isNicknameTaken(nickname, user.uid);
        if (isTaken) {
            showMessage("Questo nickname è già in uso da un'altra persona.", "error");
            return;
        }

        await updateUserNickname(user.uid, nickname);
        setUser((prevUser) => ({ ...prevUser, nickname }));
        setShowNicknameDialog(false);
        showMessage("Nickname aggiornato con successo!", "success");
    };

    const handleMasterUnlock = async () => {
        setIsCheckingPassword(true);
        const isValid = await verifyMasterPassword(masterPassword);
        setIsCheckingPassword(false);
        
        if (isValid) {
            setIsMaster(true);
            setShowMasterDialog(false);
            setMasterPassword("");
            showMessage("Master Mode attivata!", "success");
        } else {
            showMessage("Password errata.", "error");
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
                        <Box display="flex" alignItems="center" sx={{ flexGrow: { xs: 0, sm: 1 } }}>
                            <img src={process.env.PUBLIC_URL + '/logo512.png'} alt="Logo" style={{ width: '40px', height: '40px', marginRight: '10px', borderRadius: '8px' }} />
                            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                                Calendario Disponibilità
                            </Typography>
                        </Box>
                        {user ? (
                            <Box display="flex" alignItems="center" flexWrap="nowrap" justifyContent="flex-end" gap={1}>
                                {isMaster && (
                                    <Tooltip title="Master Mode Attiva">
                                        <Box display="flex" alignItems="center" bgcolor="#FFF8E1" borderRadius="50%" p={0.5} sx={{ mr: 1, cursor: "help" }}>
                                            <StarIcon sx={{ color: '#F4B400', fontSize: '1.2rem' }} />
                                        </Box>
                                    </Tooltip>
                                )}
                                <IconButton color="inherit" onClick={handleMenuOpen} edge="end" sx={{ ml: 1 }}>
                                    <MenuIcon />
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
                                        setNickname(user.nickname);
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

                                    {!isMaster && (
                                        <MenuItem onClick={() => {
                                            setShowMasterDialog(true);
                                            handleMenuClose();
                                        }}>
                                            <ListItemIcon>
                                                <img src={process.env.PUBLIC_URL + '/master-icon.png'} alt="Master Mode" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }} />
                                            </ListItemIcon>
                                            <ListItemText>Sblocca Master Mode</ListItemText>
                                        </MenuItem>
                                    )}
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
                    <Auth setUser={setUser} showMessage={showMessage} setShowNicknameDialog={setShowNicknameDialog} />
                )}
            </Container>
            <Dialog
                open={showNicknameDialog}
                onClose={() => user && user.nickname !== "Anonimo" && setShowNicknameDialog(false)}
            >
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
                    {user && user.nickname !== "Anonimo" && (
                        <Button onClick={() => setShowNicknameDialog(false)} color="default">
                            Annulla
                        </Button>
                    )}
                    <Button onClick={handleNicknameUpdate} color="primary" variant="contained">
                        Salva
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={showMasterDialog} onClose={() => !isCheckingPassword && setShowMasterDialog(false)}>
                <DialogTitle>Sblocca Master Mode</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Password Master"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        type="password"
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        disabled={isCheckingPassword}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowMasterDialog(false)} color="default" disabled={isCheckingPassword}>
                        Annulla
                    </Button>
                    <Button onClick={handleMasterUnlock} color="primary" variant="contained" disabled={isCheckingPassword}>
                        {isCheckingPassword ? <CircularProgress size={20} sx={{ mr: 1, color: "white" }} /> : null}
                        {isCheckingPassword ? "Verifica..." : "Sblocca"}
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