import React, { useState } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArticleIcon from '@mui/icons-material/Article';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

export const EvidenceFlag = ({ flag, open, onToggle }) => {
    // Map emoji icons to MUI icons
    const iconMap = {
        '📄': <ArticleIcon fontSize="small" sx={{ color: 'text.secondary' }} />,
        '📘': <MenuBookIcon fontSize="small" sx={{ color: 'text.secondary' }} />,
        '📙': <AutoStoriesIcon fontSize="small" sx={{ color: 'text.secondary' }} />
    };

    const MuiIcon = iconMap[flag.icon] || <ArticleIcon fontSize="small" sx={{ color: 'text.secondary' }} />;

    return (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Accordion
                expanded={open}
                onChange={onToggle}
                elevation={0}
                disableGutters
                sx={{
                    bgcolor: 'transparent',
                    '&:before': { display: 'none' },
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ px: 0, '& .MuiAccordionSummary-content': { my: 1.5 } }}
                >
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <CheckCircleIcon color="success" sx={{ fontSize: 18, mt: 0.3 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', lineHeight: 1.5 }}>
                            {flag.label}
                        </Typography>
                    </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0, pb: 2, px: 2 }}>
                    <Box sx={{
                        pl: 2,
                        borderLeft: 3,
                        borderColor: flag.bc || 'primary.main',
                        bgcolor: 'background.default',
                        p: 2,
                        borderRadius: 2
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            {MuiIcon}
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.secondary' }}>
                                {flag.ref}
                            </Typography>
                        </Box>

                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1.5, lineHeight: 1.6 }}>
                            "{flag.excerpt}"
                        </Typography>

                        <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
                                {flag.stat}
                            </Typography>
                        </Box>
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
