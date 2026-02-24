import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Button } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { BridgeLogo } from './BridgeLogo';

export const Nav = ({ onBack, backLabel, title, right }) => (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }}>
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px' }}>
            {onBack ? (
                <Button color="inherit" onClick={onBack} startIcon={<ArrowBackIosNewIcon fontSize="small" />} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                    {backLabel}
                </Button>
            ) : (
                <BridgeLogo size={18} />
            )}

            {title && (
                <Typography variant="subtitle2" sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontWeight: 600, color: 'text.secondary' }}>
                    {title}
                </Typography>
            )}

            <Box sx={{ minWidth: 80, display: 'flex', justifyContent: 'flex-end' }}>
                {right}
            </Box>
        </Toolbar>
    </AppBar>
);
