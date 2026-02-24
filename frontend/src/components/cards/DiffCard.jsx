import React, { useState, useEffect } from "react";
import { Card, CardContent, Typography, Box, Avatar, Stack } from '@mui/material';
import { ConfBar } from "../atoms/ConfBar";
import { SourceTag } from "../atoms/SourceTag";
import { EvidenceFlag } from "../atoms/EvidenceFlag";

export const DiffCard = ({ cond, delayMs = 0 }) => {
    const [open, setOpen] = useState(null);
    const [vis, setVis] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVis(true), delayMs);
        return () => clearTimeout(t);
    }, [delayMs]);

    const isTop = cond.rank === 1;
    const rankColor = isTop ? 'primary.main' : cond.rank === 2 ? 'text.secondary' : 'text.disabled';
    const sources = cond.sources || [];
    const flags = cond.flags || [];

    return (
        <Card
            sx={{
                mb: 2,
                opacity: vis ? 1 : 0,
                transform: vis ? "none" : "translateY(16px)",
                transition: "opacity 0.4s, transform 0.4s cubic-bezier(0.22,1,0.36,1)",
                borderLeft: isTop ? 4 : 0,
                borderColor: 'primary.main',
                position: 'relative',
                overflow: 'visible'
            }}
        >
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 1 }}>
                    <Avatar
                        sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'transparent',
                            border: 2,
                            borderColor: rankColor,
                            color: rankColor,
                            fontWeight: 600,
                            fontSize: '0.9rem'
                        }}
                    >
                        {cond.rank}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                            {cond.name || "Unknown Condition"}
                        </Typography>
                        <ConfBar pct={cond.confidence || 0} />
                    </Box>
                </Box>

                {sources.length > 0 && (
                    <Box sx={{ pl: 6, mb: 3 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {sources.map(s => <SourceTag key={s} source={s} />)}
                        </Stack>
                    </Box>
                )}

                <Box sx={{ pl: 6 }}>
                    {flags.length > 0 ? (
                        <>
                            <Typography variant="overline" color="text.disabled" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                                EVIDENCE & REASONING
                            </Typography>
                            {flags.map((f, i) => (
                                <EvidenceFlag
                                    key={i}
                                    flag={f}
                                    open={open === i}
                                    onToggle={() => setOpen(open === i ? null : i)}
                                />
                            ))}
                        </>
                    ) : (
                        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                            Clinical assessment based on patient presentation. Protocol-specific evidence was not sufficiently grounded to display.
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};
