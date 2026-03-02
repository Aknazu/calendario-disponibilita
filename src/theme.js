import { createTheme } from "@mui/material";

export const lightTheme = createTheme({
    palette: {
        mode: "light",
        primary: { main: "#0b57d0", container: "#d3e3fd" }, // M3 Blue
        secondary: { main: "#b3261e", container: "#f9dedc" }, // M3 Red/Error
        background: {
            default: "#f8fafd", // M3 Surface
            paper: "#ffffff",
        },
        surfaceVariant: "#e1e2e8",
    },
    shape: {
        borderRadius: 16,
    },
    typography: {
        fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
        button: {
            textTransform: "none",
            fontWeight: 500,
            letterSpacing: "0.1px",
        },
        h6: {
            fontWeight: 400,
        }
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 100, // Pill shape for M3
                    padding: "10px 24px",
                },
                contained: {
                    boxShadow: "none",
                    '&:hover': {
                        boxShadow: "0px 1px 3px 1px rgba(0,0,0,0.15)",
                    }
                }
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 28, // M3 Dialogs have very large radius
                    padding: "16px",
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: "#f8fafd",
                    color: "#1f1f1f",
                    boxShadow: "none",
                    borderBottom: "1px solid #e1e2e8",
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 16,
                    }
                }
            }
        }
    },
});

export const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#a8c7fa", container: "#004a77" }, // M3 Light Blue
        secondary: { main: "#f2b8b5", container: "#8c1d18" },
        background: {
            default: "#131314", // M3 Dark Surface
            paper: "#1e1f20", // M3 Dark Surface Container
        },
        text: {
            primary: "#e3e3e3",
            secondary: "#c4c7c5",
        },
        surfaceVariant: "#444746",
    },
    shape: {
        borderRadius: 16,
    },
    typography: {
        fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
        button: {
            textTransform: "none",
            fontWeight: 500,
            letterSpacing: "0.1px",
        },
        h6: {
            fontWeight: 400,
        }
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 100,
                    padding: "10px 24px",
                },
                contained: {
                    boxShadow: "none",
                    '&:hover': {
                        boxShadow: "0px 1px 3px 1px rgba(0,0,0,0.3)",
                    }
                }
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 28,
                    padding: "16px",
                    backgroundImage: "none", // Prevent default MUI elevation gradient
                    backgroundColor: "#1e1f20",
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: "#131314",
                    color: "#e3e3e3",
                    boxShadow: "none",
                    borderBottom: "1px solid #444746",
                    backgroundImage: "none",
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 16,
                    }
                }
            }
        }
    },
});
