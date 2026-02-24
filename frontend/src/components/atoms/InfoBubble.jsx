import React from 'react';
import { Alert, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export const InfoBubble = ({ type = "info", children }) => {
    // Map existing types to MUI Alert severities
    const severityMap = {
        warning: 'warning',
        emergency: 'error',
        info: 'info',
        success: 'success',
        lock: 'info'
    };

    const severity = severityMap[type] || 'info';

    return (
        <Alert
            severity={severity}
            icon={type === 'lock' ? <LockIcon fontSize="inherit" /> : undefined}
            sx={{ mb: 2, borderRadius: 2, alignItems: 'flex-start' }}
        >
            <Typography variant="body2" sx={{ mt: '2px', lineHeight: 1.6 }}>
                {children}
            </Typography>
        </Alert>
    );
};
