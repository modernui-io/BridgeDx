import React, { useState } from "react";
import { Box, Typography, Button, Container, Card, CardContent, Chip, TextField, MenuItem, Stack, Fade, Alert, Slide } from '@mui/material';
// Old theme import removed
import { Nav } from "../components/atoms/Nav";
import { InfoBubble } from "../components/atoms/InfoBubble";
import { TriagePill } from "../components/atoms/TriagePill";
import { DiffCard } from "../components/cards/DiffCard";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import { useAppContext } from '../context/AppContext';

export const ResultsPage = ({ scenario, form, onNew, onHistory }) => {
    const { logCase } = useAppContext();
    const [checked, setChecked] = useState(false);
    const [impression, setImpression] = useState("");
    const [notes, setNotes] = useState("");
    const [logged, setLogged] = useState(false);
    const [toast, setToast] = useState(false);

    // We recreate the triage config mapping in MUI format here, bypassing ancient strings
    const triageColors = { local: 'success.main', refer: 'warning.main', emergency: 'error.main' };
    const triageBg = { local: 'success.light', refer: 'warning.light', emergency: 'error.light' };
    const triageBorder = { local: 'rgba(52, 168, 83, 0.3)', refer: 'rgba(251, 188, 4, 0.3)', emergency: 'rgba(234, 67, 53, 0.3)' };

    const triage = scenario.triage || { level: 'refer', detail: 'Assessment complete.', protocol: '' };
    const differential = scenario.differential || [];

    const color = triageColors[triage.level] || triageColors.refer;
    const bg = triageBg[triage.level] || triageBg.refer;
    const borderColor = triageBorder[triage.level] || triageBorder.refer;

    const handleLog = async () => {
        if (!checked) return;
        try {
            await logCase(scenario.raw?.assessment_id, impression, notes);
        } catch (e) {
            console.error(e);
        }
        setLogged(true);
        setToast(true);
        setTimeout(() => setToast(false), 3200);
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', display: "flex", flexDirection: "column" }}>
            <Slide direction="up" in={toast} mountOnEnter unmountOnExit>
                <Alert
                    severity="success"
                    variant="filled"
                    sx={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100, borderRadius: 2, minWidth: 250, display: 'flex', justifyContent: 'center' }}
                >
                    Case logged to history
                </Alert>
            </Slide>

            <Nav
                onBack={onNew}
                backLabel="New Assessment"
                title="Assessment Results"
                right={
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
                        {form.mode === "rare" ? "🔬 RAREPATH" : "⚡ STANDARD"}
                    </Typography>
                }
            />

            <Container maxWidth="sm" sx={{ flex: 1, py: 4 }}>
                <Fade in={true} timeout={400}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3, flexWrap: "wrap" }}>
                        <Chip
                            label={`${form.age ? `${form.age} ${form.ageUnit}` : "Age N/A"} · ${form.sex}${form.region ? ` · ${form.region}` : ""}`}
                            size="small"
                            variant="outlined"
                        />
                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                            21 Feb 2026, 14:32
                        </Typography>
                    </Box>
                </Fade>

                {scenario.emergency && (
                    <Fade in={true} timeout={500}>
                        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                            <strong>🚨 Emergency Criteria Detected:</strong> Emergency signs present. Refer immediately. Do not wait for full AI assessment.
                        </Alert>
                    </Fade>
                )}

                {scenario.lowConf && (
                    <Fade in={true} timeout={600}>
                        <Box sx={{ mb: 3 }}>
                            <InfoBubble type="warning">
                                <strong>Low AI confidence —</strong> This presentation is unusual. Prioritize clinical judgment. Consider physician referral.
                            </InfoBubble>
                        </Box>
                    </Fade>
                )}

                <Fade in={true} timeout={700}>
                    <Card variant="outlined" sx={{ bgcolor: bg, borderColor: borderColor, borderLeft: 4, borderLeftColor: color, mb: 4 }}>
                        <CardContent sx={{ p: 3, pb: '24px !important' }}>
                            <Box sx={{ mb: 2 }}>
                                <TriagePill level={triage.level} size="lg" />
                            </Box>
                            <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500, lineHeight: 1.6, mb: 1.5 }}>
                                {triage.detail}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {triage.protocol}
                            </Typography>
                        </CardContent>
                    </Card>
                </Fade>

                <Fade in={true} timeout={800}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            AI Differential Diagnosis
                        </Typography>
                        <InfoIcon fontSize="small" color="disabled" titleAccess="Ranked by likelihood. Grounded in WHO IMCI and Orphanet protocols. Decision support only." sx={{ cursor: 'help' }} />
                    </Box>
                </Fade>

                <Stack spacing={0}>
                    {differential.map((c, i) => <DiffCard key={i} cond={c} delayMs={i * 160 + 800} />)}
                </Stack>

                {form.mode === "rare" && (
                    <Fade in={true} timeout={1400}>
                        <Card variant="outlined" sx={{ bgcolor: 'info.light', borderColor: 'info.main', mb: 4, mt: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle2" color="info.dark" sx={{ fontWeight: 700, mb: 1 }}>
                                    🔬 Rare Disease Pathway Activated
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.primary', mb: 1.5 }}>
                                    These conditions require specialist genetic/metabolic confirmation. Do not use for treatment decisions without specialist review.
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontWeight: 600 }}>
                                    Suggested: Orphanet registry · Enzyme assay panel · Pediatric hematology referral
                                </Typography>
                            </CardContent>
                        </Card>
                    </Fade>
                )}

                <Fade in={true} timeout={1600}>
                    <Card variant="outlined" sx={{ mt: 5, borderColor: checked ? 'success.main' : 'divider', transition: 'border-color 0.3s' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: '0.1em', display: 'block', mb: 2 }}>
                                YOUR ASSESSMENT
                            </Typography>

                            <Box
                                onClick={() => setChecked(!checked)}
                                sx={{
                                    display: "flex", alignItems: "flex-start", gap: 2, cursor: "pointer", mb: 3, p: 2, borderRadius: 2,
                                    bgcolor: checked ? 'success.light' : 'action.hover',
                                    border: 1, borderColor: checked ? 'success.main' : 'divider',
                                    transition: "all 0.25s"
                                }}
                            >
                                <CheckCircleIcon color={checked ? "success" : "disabled"} sx={{ mt: 0.2 }} />
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                    I have reviewed the AI reasoning above and understand this is <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>clinical decision support only</Box>, not a diagnosis. I take clinical responsibility for any action taken.
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2, opacity: checked ? 1 : 0.4, transition: "opacity 0.25s" }}>
                                <TextField
                                    select
                                    label="Clinical Impression"
                                    value={impression}
                                    onChange={e => setImpression(e.target.value)}
                                    disabled={!checked}
                                    fullWidth
                                    size="small"
                                    sx={{ mb: 2 }}
                                >
                                    <MenuItem value="Agree with top suggestion">Agree with top suggestion</MenuItem>
                                    <MenuItem value="Partially agree">Partially agree</MenuItem>
                                    <MenuItem value="Disagree — my assessment differs">Disagree — my assessment differs</MenuItem>
                                    <MenuItem value="Unsure — referring regardless">Unsure — referring regardless</MenuItem>
                                </TextField>

                                <TextField
                                    label="Additional Notes (Optional)"
                                    multiline
                                    rows={3}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    disabled={!checked}
                                    fullWidth
                                    placeholder="Clinical observations, action taken..."
                                />
                            </Box>

                            <Button
                                variant={logged ? "outlined" : "contained"}
                                color={logged ? "success" : "primary"}
                                onClick={handleLog}
                                disabled={!checked}
                                fullWidth
                                size="large"
                                sx={{ mb: 2 }}
                            >
                                {logged ? "✓ Case Logged" : "Confirm & Log Case"}
                            </Button>

                            {logged && (
                                <Stack direction="row" spacing={2}>
                                    <Button variant="outlined" onClick={onNew} fullWidth color="inherit">
                                        New Assessment
                                    </Button>
                                    <Button variant="outlined" onClick={onHistory} fullWidth color="inherit">
                                        Case History
                                    </Button>
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Fade>

                <Typography variant="caption" color="text.disabled" align="center" sx={{ display: 'block', mt: 4, mb: 6 }}>
                    No identifiable patient data is stored. De-identified summary only.
                </Typography>
            </Container>
        </Box>
    );
};
