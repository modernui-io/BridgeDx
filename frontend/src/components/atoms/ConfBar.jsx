import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

export const ConfBar = ({ pct }) => {
    const color = pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'error';

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 1.5 }}>
            <Box sx={{ width: '100%' }}>
                <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={color}
                    sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
                />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color={`${color}.main`} sx={{ fontWeight: 600 }}>
                    {pct}%
                </Typography>
            </Box>
        </Box>
    );
};
