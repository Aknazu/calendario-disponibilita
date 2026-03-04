import React, { useState } from "react";
import { TextField, Button, Box, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { addUserToFirestore, getUserNickname } from "../firestoreService";

const Auth = ({ setUser, showMessage, setShowNicknameDialog }) => {
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
            if (!nickname) {
                showMessage("Il nickname è obbligatorio.", "warning");
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await addUserToFirestore(user.uid, nickname, user.email);
            setUser({ ...user, nickname });
        } catch (error) {
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
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            let savedNickname = await getUserNickname(user.uid);
            if (!savedNickname) {
                savedNickname = "Anonimo";
                await addUserToFirestore(user.uid, savedNickname, user.email);
            }

            setUser({ ...user, nickname: savedNickname });

            if (savedNickname === "Anonimo") {
                setShowNicknameDialog(true);
            }
        } catch (error) {
            showMessage("Errore nel login con Google.", "error");
        }
    };

    return (
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
    );
};

export default Auth;
