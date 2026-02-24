import React, { useState } from 'react';
import { Box, Typography, Button, Container, Stack, Fade, Chip } from '@mui/material';
import { Nav } from '../components/atoms/Nav';
import PublicIcon from '@mui/icons-material/Public';
import ScienceIcon from '@mui/icons-material/Science';
import ShieldIcon from '@mui/icons-material/Shield';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';

export const SplashPage = ({ onEnter }) => {
    const [step, setStep] = useState(0);
    const steps = [
        { icon: <PublicIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />, title: "Built for the last mile", body: "Designed for community health workers in low-resource settings — no specialist required, minimal connectivity needed." },
        { icon: <ScienceIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />, title: "Powered by MedGemma", body: "Google's open medical AI model, grounded in WHO IMCI, Orphanet rare disease database, and MSF field guidelines — works offline." },
        { icon: <ShieldIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />, title: "Safety first, always", body: "AI is decision support only. Every output requires your clinical confirmation. No identifiable patient data is ever stored." },
    ];

    if (step === 0) {
        return (
            <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 4, position: "relative", overflow: "hidden" }}>
                <Fade in={true} timeout={1000}>
                    <Box sx={{ textAlign: "center", maxWidth: 400, position: "relative", zIndex: 1 }}>
                        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                            <HealthAndSafetyIcon color="primary" sx={{ fontSize: 72 }} />
                        </Box>

                        <Typography variant="h2" sx={{ fontWeight: 700, mb: 1, letterSpacing: '-0.02em', color: 'text.primary' }}>
                            Bridge<Box component="span" sx={{ color: 'primary.main' }}>Dx</Box>
                        </Typography>

                        <Typography variant="body1" sx={{ color: 'text.secondary', fontStyle: "italic", mb: 6, lineHeight: 1.6, fontSize: '1.1rem' }}>
                            Diagnostic support for the hardest cases,<br />in the hardest places.
                        </Typography>

                        <Stack spacing={2} alignItems="center">
                            <Button variant="contained" size="large" onClick={() => setStep(1)} sx={{ width: "100%", maxWidth: 300, py: 1.5, fontSize: '1.1rem' }}>
                                Get Started
                            </Button>
                            <Button variant="outlined" size="large" onClick={onEnter} sx={{ width: "100%", maxWidth: 300, py: 1.5, fontSize: '1.1rem', color: 'text.secondary', borderColor: 'divider' }}>
                                Skip to App
                            </Button>
                        </Stack>

                        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 6, flexWrap: "wrap" }}>
                            {["WHO IMCI", "Orphanet", "MSF 2023", "MedGemma 1.5"].map(b => (
                                <Chip key={b} label={b} size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: 'divider' }} />
                            ))}
                        </Box>

                        <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 4, lineHeight: 1.7 }}>
                            For trained health workers only.<br />AI outputs are decision support, not diagnosis.
                        </Typography>
                    </Box>
                </Fade>
            </Box>
        );
    }

    const cur = steps[step - 1];

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', display: "flex", flexDirection: "column" }}>
            <Nav right={<Button onClick={onEnter} color="inherit" sx={{ color: 'text.secondary' }}>Skip</Button>} />

            <Container maxWidth="sm" sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6 }}>
                <Fade in={true} key={step} timeout={600}>
                    <Box sx={{ textAlign: "center", maxWidth: 380 }}>
                        {cur.icon}
                        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                            {cur.title}
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 6 }}>
                            {cur.body}
                        </Typography>
                    </Box>
                </Fade>

                <Box sx={{ display: "flex", gap: 1.5, mb: 6 }}>
                    {steps.map((_, i) => (
                        <Box
                            key={i}
                            sx={{
                                width: i === step - 1 ? 24 : 8,
                                height: 8,
                                borderRadius: 4,
                                bgcolor: i === step - 1 ? 'primary.main' : 'divider',
                                transition: "all 0.3s ease-in-out"
                            }}
                        />
                    ))}
                </Box>

                <Stack direction="row" spacing={2} sx={{ width: "100%", maxWidth: 340 }}>
                    {step > 1 && (
                        <Button variant="outlined" onClick={() => setStep(s => s - 1)} sx={{ flex: 1, color: 'text.secondary', borderColor: 'divider' }}>
                            Back
                        </Button>
                    )}
                    <Button variant="contained" onClick={() => step < 3 ? setStep(s => s + 1) : onEnter()} sx={{ flex: 1 }}>
                        {step < 3 ? "Next" : "Start BridgeDx"}
                    </Button>
                </Stack>
            </Container>
        </Box>
    );
};
