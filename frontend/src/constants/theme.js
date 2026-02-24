import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1a73e8', // Google Blue
            light: '#e8f0fe',
        },
        secondary: {
            main: '#34a853', // Google Green
            light: '#e6f4ea',
        },
        error: {
            main: '#c5221f', // WCAG accessible red
            light: '#fce8e6',
        },
        warning: {
            main: '#b06000', // WCAG accessible dark orange
            light: '#fef7e0',
        },
        info: {
            main: '#1a73e8', // Accessible blue
            light: '#e8f0fe',
        },
        success: {
            main: '#0d652d', // WCAG accessible dark green
            light: '#e6f4ea',
        },
        background: {
            default: '#f8f9fa',
            paper: '#ffffff',
        },
        text: {
            primary: '#202124',
            secondary: '#5f6368',
            disabled: '#9aa0a6',
        },
        divider: '#dadce0',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#202124' },
        h2: { fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.01em', color: '#202124' },
        h3: { fontSize: '1.5rem', fontWeight: 500, color: '#202124' },
        h4: { fontSize: '1.25rem', fontWeight: 500, color: '#202124' },
        h5: { fontSize: '1rem', fontWeight: 500, color: '#202124' },
        h6: { fontSize: '0.875rem', fontWeight: 500, color: '#202124' },
        button: { textTransform: 'none', fontWeight: 500 },
        overline: { letterSpacing: '0.1em', fontWeight: 600, fontSize: '0.75rem', color: '#5f6368' },
        body1: { color: '#3c4043' },
        body2: { color: '#5f6368' },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 24px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                contained: {
                    fontWeight: 500,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
                    border: '1px solid #dadce0',
                },
            },
            defaultProps: {
                elevation: 0,
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 500,
                },
            },
        },
    },
});
