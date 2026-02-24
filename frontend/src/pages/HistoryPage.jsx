import React, { useState } from "react";
import { Box, Typography, Button, Container, Grid, Card, Chip, Accordion, AccordionSummary, AccordionDetails, Stack, Fade } from '@mui/material';
import { Nav } from "../components/atoms/Nav";
import { InfoBubble } from "../components/atoms/InfoBubble";
import { TriagePill } from "../components/atoms/TriagePill";
import { SourceTag } from "../components/atoms/SourceTag";
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CircleIcon from '@mui/icons-material/Circle';
import { useAppContext } from "../context/AppContext";

export const HistoryPage = ({ onBack, onNew }) => {
    const { cases } = useAppContext();
    const [exp, setExp] = useState(null);
    const [filter, setFilter] = useState("all");

    const total = cases.length;
    const emerg = cases.filter(c => c.triage_level === "emergency").length;
    const agree = cases.filter(c => c.impression && c.impression.includes("Agree")).length;
    const rare = cases.filter(c => c.mode === "rare").length;

    const agreePct = total > 0 ? Math.round((agree / total) * 100) : 0;

    const filtered = filter === "all" ? cases : cases.filter(c => {
        if (filter === "rare") return c.mode === "rare";
        return c.triage_level === filter;
    });

    const impColor = { "Agree with top suggestion": 'success.main', "Disagree — my assessment differs": 'error.main', "Partially agree": 'info.main', "Unsure — referring regardless": 'warning.main' };

    const filters = [
        { v: "all", l: "All" },
        { v: "emergency", l: "Emergencies" },
        { v: "refer", l: "Referrals" },
        { v: "rare", l: "Rare Disease" }
    ];

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', display: "flex", flexDirection: "column" }}>
            <Nav
                onBack={onBack}
                backLabel="Home"
                title="Case History"
                right={
                    <Button
                        variant="contained"
                        size="small"
                        onClick={onNew}
                        startIcon={<AddIcon />}
                        sx={{ borderRadius: 2 }}
                    >
                        New
                    </Button>
                }
            />

            <Container maxWidth="sm" sx={{ flex: 1, py: 4 }}>
                <Fade in={true} timeout={400}>
                    <Grid container spacing={1.5} sx={{ mb: 3 }}>
                        {[
                            { v: total, l: "Total", c: 'text.primary' },
                            { v: emerg, l: "Emergencies", c: 'error.main' },
                            { v: `${agreePct}%`, l: "Agreement", c: 'success.main' },
                            { v: rare, l: "Rare Disease", c: 'info.main' }
                        ].map((s, i) => (
                            <Grid item xs={3} key={i}>
                                <Card variant="outlined" sx={{ height: '100%', textAlign: 'center', p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <Typography variant="h5" sx={{ color: s.c, fontWeight: 600, mb: 0.5 }}>
                                        {s.v}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                                        {s.l}
                                    </Typography>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Fade>

                <Fade in={true} timeout={500}>
                    <Box sx={{ mb: 3 }}>
                        <InfoBubble type="lock">
                            <strong>De-identified records only.</strong> No names, exact ages, or precise locations stored. Images discarded after inference.
                        </InfoBubble>
                    </Box>
                </Fade>

                <Fade in={true} timeout={600}>
                    <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                        {filters.map(f => (
                            <Chip
                                key={f.v}
                                label={f.l}
                                onClick={() => setFilter(f.v)}
                                color={filter === f.v ? "primary" : "default"}
                                variant={filter === f.v ? "filled" : "outlined"}
                                sx={{ borderRadius: 4 }}
                            />
                        ))}
                    </Box>
                </Fade>

                <Fade in={true} timeout={700}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {filtered.map((c, i) => {
                            const isOpen = exp === i;
                            const diffs = Array.isArray(c.differential) ? c.differential : [];
                            const topDx = diffs.length > 0 ? diffs[0].condition : "No matching diagnosis";

                            return (
                                <Accordion
                                    key={c.case_id || c.id}
                                    expanded={isOpen}
                                    onChange={() => setExp(isOpen ? null : i)}
                                    variant="outlined"
                                    sx={{
                                        borderRadius: '12px !important',
                                        '&:before': { display: 'none' },
                                        overflow: 'hidden',
                                        mb: '0 !important',
                                    }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        sx={{ p: 2, '& .MuiAccordionSummary-content': { my: 0 } }}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                                                    {(c.case_id || "").split("-").pop()}
                                                </Typography>
                                            </Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {topDx}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {c.age_group} · {c.sex} · {c.region_district}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0, mr: 2 }}>
                                            <TriagePill level={c.triage_level} />
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <CircleIcon sx={{ fontSize: 8, color: impColor[c.impression] || 'text.disabled' }} />
                                                <Typography variant="caption" sx={{ color: impColor[c.impression] || 'text.secondary', fontWeight: 500 }}>
                                                    {c.impression}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </AccordionSummary>

                                    <AccordionDetails sx={{ p: 0, borderTop: 1, borderColor: 'divider' }}>
                                        <Box sx={{ p: 2.5, bgcolor: 'action.hover' }}>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                                                <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: '0.1em' }}>
                                                    FULL DIFFERENTIAL
                                                </Typography>
                                                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                                                    {c.timestamp ? new Date(c.timestamp).toLocaleString() : ""}
                                                </Typography>
                                            </Box>

                                            <Stack spacing={2} divider={<Box sx={{ height: 1, bgcolor: 'divider' }} />}>
                                                {diffs.map((cond, ci) => (
                                                    <Box key={ci} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                        <Typography variant="body2" color="text.disabled" sx={{ fontFamily: 'monospace', width: 14 }}>
                                                            {ci + 1}
                                                        </Typography>
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: 'text.primary', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                {cond.condition || cond.name}
                                                            </Typography>
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                                <Box sx={{ width: 60, height: 4, bgcolor: 'divider', borderRadius: 2, overflow: "hidden" }}>
                                                                    <Box sx={{
                                                                        height: "100%", width: `${cond.confidence}%`,
                                                                        bgcolor: cond.confidence >= 70 ? 'success.main' : cond.confidence >= 40 ? 'warning.main' : 'error.main',
                                                                        borderRadius: 2
                                                                    }} />
                                                                </Box>
                                                                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', minWidth: 28 }}>
                                                                    {cond.confidence}%
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                ))}
                                                {diffs.length === 0 && (
                                                    <Typography variant="body2" color="text.secondary">No differential matched.</Typography>
                                                )}
                                            </Stack>
                                            <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                                                Notes: {c.notes || "None"}
                                            </Typography>
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </Box>
                </Fade>
            </Container>
        </Box>
    );
};
