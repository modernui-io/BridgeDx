import React from 'react';
import { Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export const TriagePill = ({ level, size = "small" }) => {
    const config = {
        local: { color: 'success', icon: <CheckCircleOutlineIcon />, label: "Manage Locally" },
        refer: { color: 'warning', icon: <WarningAmberIcon />, label: "Refer to Clinic" },
        emergency: { color: 'error', icon: <ErrorOutlineIcon />, label: "Emergency Referral" },
    };

    const t = config[level] || config.local;

    return (
        <Chip
            label={t.label}
            icon={t.icon}
            color={t.color}
            size={size === 'lg' ? 'medium' : 'small'}
            variant="filled"
            sx={{ fontWeight: 600 }}
        />
    );
}
