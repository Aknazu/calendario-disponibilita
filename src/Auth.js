import React, { useState, useEffect } from "react";
import Calendar from "./components/Calendar";
import { CssBaseline, ThemeProvider, createTheme, Container, Typography, AppBar, Toolbar, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import GoogleIcon from '@mui/icons-material/Google';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const db = getFirestore();

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
  const [nickname, setNickname] = useState("");
  const [openNicknameDialog, setOpenNicknameDialog] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUser({ ...currentUser, nickname: userSnap.data().nickname });
        } else {
          setUser(currentUser);
          setOpenNicknameDialog(true);
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
      console.error("Errore nel login:", error.message);
    }
  };

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      setOpenNicknameDialog(true);
    } catch (error) {
      console.error("Errore nella registrazione:", error.message);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setUser(user);
        setOpenNicknameDialog(true);
      }
    } catch (error) {
      console.error("Errore nel login con Google:", error);
    }
  };

  const handleNicknameSubmit = async () => {
    if (!nickname.trim()) return;

    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      nickname,
    });

    setUser((prevUser) => ({ ...prevUser, nickname }));
    setOpenNicknameDialog(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
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
                    {user.nickname || user.email}
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

        {/* Dialog per inserire il nickname */}
        <Dialog open={openNicknameDialog} disableEscapeKeyDown>
          <DialogTitle>Inserisci il tuo nickname</DialogTitle>
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
            <Button onClick={handleNicknameSubmit} color="primary">
              Salva
            </Button>
          </DialogActions>
        </Dialog>
      </ThemeProvider>
  );
}

export default App;
