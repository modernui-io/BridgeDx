import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, CardContent, CardActionArea, Stack, Chip, Fade } from '@mui/material';
import { HISTORY } from "../constants/data";
import { Nav } from "../components/atoms/Nav";
import { TriagePill } from "../components/atoms/TriagePill";
import { InfoBubble } from "../components/atoms/InfoBubble";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

export const HomePage = ({ onAssess, onHistory }) => {
    const stats = [
        { v: "12", l: "Cases This Week", c: 'text.primary', d: "+3 vs last week" },
        { v: "2", l: "Emergencies", c: 'error.main', d: "16% of cases" },
        { v: "78%", l: "AI Agreement", c: 'success.main', d: "Up from 71%" },
        { v: "4", l: "Rare Disease", c: 'info.main', d: "33% of total" },
    ];

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', display: "flex", flexDirection: "column" }}>
            <Nav
                right={
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={onHistory}
                        sx={{ borderColor: 'divider', color: 'text.secondary', borderRadius: 2 }}
                    >
                        History
                    </Button>
                }
            />

            <Container maxWidth="sm" sx={{ flex: 1, py: 4 }}>
                <Fade in={true} timeout={500}>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: '0.1em', display: 'block', mb: 1 }}>
                            SAT, 21 FEB 2026 · FIELD MODE
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 600, lineHeight: 1.2, color: 'text.primary' }}>
                            Good afternoon,<br />
                            <Box component="span" sx={{ color: 'primary.main' }}>Health Worker.</Box>
                        </Typography>
                    </Box>
                </Fade>

                <Fade in={true} timeout={700}>
                    <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText', border: 'none', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        <CardContent sx={{ p: 4 }}>
                            <Chip
                                label="New Assessment"
                                size="small"
                                sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, borderRadius: 1.5 }}
                            />
                            <Typography variant="h5" color="inherit" sx={{ fontWeight: 600, mb: 1.5 }}>
                                Start Patient Assessment
                            </Typography>
                            <Typography variant="body2" color="inherit" sx={{ mb: 3, opacity: 0.9, lineHeight: 1.6 }}>
                                Enter symptoms, vitals, and optionally an image to receive a WHO/Orphanet-grounded differential diagnosis.
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={onAssess}
                                fullWidth
                                endIcon={<ArrowForwardIosIcon sx={{ fontSize: 14 }} />}
                                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' }, py: 1.5 }}
                            >
                                Begin Assessment
                            </Button>
                        </CardContent>
                    </Card>
                </Fade>

                <Fade in={true} timeout={900}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 4 }}>
                        {stats.map((s, i) => (
                            <Card key={i} sx={{ height: '100%' }}>
                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                    <Typography variant="h4" sx={{ color: s.c, fontWeight: 600, mb: 0.5 }}>
                                        {s.v}
                                    </Typography>
                                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5, lineHeight: 1.2, letterSpacing: '0.05em' }}>
                                        {s.l}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        {s.d}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Fade>

                <Fade in={true} timeout={1100}>
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 2 }}>
                            <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: '0.1em' }}>
                                RECENT CASES
                            </Typography>
                            <Button size="small" onClick={onHistory} sx={{ color: 'text.secondary', textTransform: 'none' }}>
                                View all →
                            </Button>
                        </Box>

                        <Stack spacing={1.5}>
                            {HISTORY.slice(0, 3).map((c, i) => (
                                <Card key={i} sx={{ transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
                                    <CardActionArea onClick={onHistory} sx={{ p: 2 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {c.dx}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {c.ageSex} · {c.region}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
                                                <TriagePill level={c.triage} />
                                                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                                                    {c.date.split(",")[0]}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardActionArea>
                                </Card>
                            ))}
                        </Stack>
                    </Box>
                </Fade>

                <Fade in={true} timeout={1300}>
                    <Box>
                        <InfoBubble type="lock">
                            <strong>Privacy:</strong> No identifiable patient data is stored. All AI outputs require your clinical confirmation before logging.
                        </InfoBubble>
                    </Box>
                </Fade>
            </Container>
        </Box>
    );
};
