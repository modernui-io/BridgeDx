import React from 'react';
import { Divider as MuiDivider, Typography, Box } from '@mui/material';

export const Divider = ({ label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
        <MuiDivider sx={{ flex: 1, borderColor: 'divider' }} />
        {label && (
            <Typography variant="overline" color="text.secondary" sx={{ px: 2, letterSpacing: '0.1em' }}>
                {label}
            </Typography>
        )}
        <MuiDivider sx={{ flex: 1, borderColor: 'divider' }} />
    </Box>
);
