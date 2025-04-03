import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase"; // Assicurati che questo percorso sia corretto

function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true); // Gestisce se è la pagina di login o registrazione

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
        alert("Accesso effettuato con successo!");
      } else {
        // Registrazione
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Registrazione avvenuta con successo!");
      }
    } catch (error) {
      console.error("Errore autenticazione:", error);
      alert(error.message);
    }
  };

  return (
    <div className="auth-container">
      <h1>{isLogin ? "Accedi" : "Registrati"}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{isLogin ? "Accedi" : "Registrati"}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
      </button>
    </div>
  );
}

export default Auth;
