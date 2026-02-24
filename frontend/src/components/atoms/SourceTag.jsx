import React from 'react';
import { Chip } from '@mui/material';

export const SourceTag = ({ source }) => {
    const config = {
        "WHO IMCI": { color: 'success' },
        ORPHANET: { color: 'info' },
        MSF: { color: 'warning' },
    };

    const s = config[source] || { color: 'default' };

    return (
        <Chip
            label={source}
            color={s.color}
            size="small"
            variant="outlined"
            sx={{
                fontWeight: 600,
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                borderRadius: '16px',
                height: 24,
            }}
        />
    );
};
