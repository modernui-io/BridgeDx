import React, { useState, useEffect } from "react";
import { Box, Typography, LinearProgress, Fade, Container } from '@mui/material';
import { BridgeLogo } from "../components/atoms/BridgeLogo";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

export const LoadingPage = ({ scenario, isFetching, onDone }) => {
    const [idx, setIdx] = useState(0);
    const [pct, setPct] = useState(0);

    const loadingSteps = scenario.loading || [
        "Analyzing demographics…",
        "Cross-referencing RAG protocols…",
        "Running local AI inference…",
        "Generating differential…",
        "Finalizing safe triage level…"
    ];

    useEffect(() => {
        let maxIndex = loadingSteps.length - 1;
        const iv = setInterval(() => {
            setIdx(i => Math.min(i + 1, maxIndex));
            setPct(p => {
                if (!isFetching) return Math.min(p + 20, 100);
                // Asymptotic deceleration: slows down as it approaches 99%
                // instead of hard-stopping at 95%
                const remaining = 99 - p;
                const step = Math.max(0.3, remaining * 0.08);
                return Math.min(p + step, 99);
            });
        }, 800);

        return () => clearInterval(iv);
    }, [isFetching, loadingSteps]);

    useEffect(() => {
        if (!isFetching && pct >= 95) {
            setPct(100);
            const t = setTimeout(() => {
                onDone();
            }, 600);
            return () => clearTimeout(t);
        }
    }, [isFetching, pct, onDone]);

    const isRare = scenario.mode === "rare";

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 4 }}>
            <Fade in={true} timeout={600}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: "100%", maxWidth: 360 }}>
                    <BridgeLogo size={32} />

                    <Box sx={{ mt: 8, mb: 5, width: "100%" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em', fontWeight: 600 }}>
                                {isRare ? "MEDGEMMA 1.5 4B · LOCAL" : "MEDGEMMA 1.5 4B · LOCAL"}
                            </Typography>
                            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>
                                {Math.round(pct)}%
                            </Typography>
                        </Box>

                        <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', mb: 4 }}
                        />

                        {loadingSteps.map((m, i) => {
                            const isDone = i < idx;
                            const isCurrent = i === idx;
                            const isPending = i > idx;

                            return (
                                <Box
                                    key={i}
                                    sx={{
                                        display: "flex", alignItems: "center", gap: 2, py: 1,
                                        display: "flex", alignItems: "center", gap: 2, py: 1,
                                        opacity: isPending ? 0.3 : 1,
                                        transition: "opacity 0.4s ease"
                                    }}
                                >
                                    {isDone || (!isFetching && pct === 100) ? (
                                        <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
                                    ) : isCurrent ? (
                                        <Box sx={{
                                            width: 20, height: 20, borderRadius: "50%",
                                            bgcolor: 'primary.main', display: "flex", alignItems: "center", justifyContent: "center",
                                            animation: 'pulse 1.5s infinite',
                                            '@keyframes pulse': {
                                                '0%': { boxShadow: '0 0 0 0 rgba(26, 115, 232, 0.4)' },
                                                '70%': { boxShadow: '0 0 0 8px rgba(26, 115, 232, 0)' },
                                                '100%': { boxShadow: '0 0 0 0 rgba(26, 115, 232, 0)' }
                                            }
                                        }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: 'white' }} />
                                        </Box>
                                    ) : (
                                        <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: 20 }} />
                                    )}

                                    <Typography variant="body2" sx={{
                                        fontFamily: 'monospace',
                                        color: isCurrent ? 'text.primary' : 'text.secondary',
                                        fontWeight: isCurrent ? 600 : 400,
                                        transition: "color 0.3s"
                                    }}>
                                        {m}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>

                    <Typography variant="caption" color="text.disabled">
                        Processing offline · No data leaving your device
                    </Typography>
                </Box>
            </Fade>
        </Box>
    );
};
