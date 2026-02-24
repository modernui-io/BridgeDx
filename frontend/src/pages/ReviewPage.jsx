import React from "react";
import { Box, Typography, Button, Container, Card, CardContent, Grid, Stack, Fade } from '@mui/material';
import { Nav } from "../components/atoms/Nav";
import { InfoBubble } from "../components/atoms/InfoBubble";
import CheckIcon from '@mui/icons-material/Check';

export const ReviewPage = ({ form, onConfirm, onBack }) => {
    const fields = [
        { l: "Age", v: form.age ? `${form.age} ${form.ageUnit}` : "Not provided" },
        { l: "Sex", v: form.sex },
        { l: "Region", v: form.region || "Not provided" },
        { l: "Mode", v: form.mode === "rare" ? "Rare Disease" : "Standard Triage" },
        { l: "Temperature", v: form.temp ? `${form.temp}°C` : "Not recorded" },
        { l: "Heart Rate", v: form.hr ? `${form.hr} bpm` : "Not recorded" },
        { l: "Resp Rate", v: form.rr ? `${form.rr}/min` : "Not recorded" },
        { l: "Image", v: form.uploadName || "None uploaded" },
    ];

    const isRare = form.mode === "rare";

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', display: "flex", flexDirection: "column" }}>
            <Nav onBack={onBack} backLabel="Edit Patient" title="Review Summary" />

            <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', py: 1.5, px: 3 }}>
                <Container maxWidth="sm" sx={{ display: "flex", alignItems: "center", gap: 1, p: 0 }}>
                    {["Patient Info", "Review & Analyze"].map((s, i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {i > 0 && <Box sx={{ width: 32, height: 2, bgcolor: 'primary.main', borderRadius: 1 }} />}
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <Box sx={{
                                    width: 24, height: 24, borderRadius: "50%",
                                    bgcolor: i === 1 ? 'primary.main' : 'success.main',
                                    color: 'white',
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: '0.75rem', fontWeight: 700
                                }}>
                                    {i === 0 ? <CheckIcon fontSize="inherit" /> : i + 1}
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                    {s}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Container>
            </Box>

            <Container maxWidth="sm" sx={{ flex: 1, py: 4, display: 'flex', flexDirection: 'column' }}>
                <Fade in={true} timeout={400}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                            Review before analysis
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Confirm the patient information is correct. AI inference will begin once you proceed.
                        </Typography>
                    </Box>
                </Fade>

                <Stack spacing={2} sx={{ mb: 4 }}>
                    <Fade in={true} timeout={600}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="overline" color="text.disabled" sx={{ display: 'block', mb: 1.5, letterSpacing: '0.1em' }}>
                                    CHIEF COMPLAINT
                                </Typography>
                                <Typography variant="body1" sx={{ fontStyle: 'italic', lineHeight: 1.7, color: 'text.primary' }}>
                                    "{form.complaint}"
                                </Typography>
                            </CardContent>
                        </Card>
                    </Fade>

                    <Fade in={true} timeout={800}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 2, letterSpacing: '0.1em', fontWeight: 600 }}>
                                    PATIENT DETAILS
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 2.5 }}>
                                    {fields.map(f => {
                                        const isMuted = typeof f.v === 'string' && (f.v.includes("Not") || f.v === "None uploaded");
                                        return (
                                            <Box key={f.l}>
                                                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                    {f.l.toUpperCase()}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: isMuted ? 'text.secondary' : 'text.primary', fontWeight: isMuted ? 400 : 500, fontStyle: isMuted ? 'italic' : 'normal' }}>
                                                    {f.v}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </CardContent>
                        </Card>
                    </Fade>

                    <Fade in={true} timeout={1000}>
                        <Card variant="outlined" sx={{ bgcolor: isRare ? 'info.light' : 'success.light', borderColor: isRare ? 'info.main' : 'success.main', pb: 0, borderWidth: 2 }}>
                            <CardContent sx={{ pb: '16px !important' }}>
                                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: isRare ? 'info.main' : 'success.main', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}>
                                    MODEL SELECTED
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                                    {isRare ? "MedGemma 1.5 4B — Rare Disease Reasoning" : "MedGemma 1.5 4B Multimodal — Standard Triage"}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                    {isRare ? "Orphanet 6,000+ profiles · Offline local inference" : "WHO IMCI + MSF protocols · Offline local inference"}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Fade>
                </Stack>

                <Fade in={true} timeout={1200}>
                    <Box sx={{ pb: 6 }}>
                        <InfoBubble type="info">
                            AI will generate a ranked differential diagnosis grounded in clinical protocols. All outputs require your professional confirmation before any action is taken.
                        </InfoBubble>
                        <Stack spacing={1.5} sx={{ mt: 3 }}>
                            <Button variant="contained" size="large" onClick={onConfirm} fullWidth>
                                Run Analysis
                            </Button>
                            <Button variant="text" size="large" onClick={onBack} fullWidth sx={{ color: 'text.secondary' }}>
                                Edit Patient Information
                            </Button>
                        </Stack>
                    </Box>
                </Fade>
            </Container>
        </Box>
    );
};
