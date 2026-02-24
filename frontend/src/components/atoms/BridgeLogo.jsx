import React from 'react';
import { Box, Typography } from '@mui/material';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';

export const BridgeLogo = ({ size = 20 }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HealthAndSafetyIcon color="primary" sx={{ fontSize: size * 1.5 }} />
        <Typography
            variant="h6"
            sx={{
                fontFamily: '"Inter", sans-serif',
                fontWeight: 700,
                fontSize: size,
                letterSpacing: '-0.02em',
                color: 'text.primary'
            }}
        >
            Bridge<span style={{ color: '#1a73e8' }}>Dx</span>
        </Typography>
    </Box>
);
