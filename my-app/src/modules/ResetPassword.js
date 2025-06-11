import React from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { confirmPasswordReset } from 'firebase/auth';

export default function ResetPassword() {
  return (
    <Box>
        <Typography>Reset Password</Typography>
        <Box>
            <TextField label='New Password' />
            <TextField label='Confirm Password' />
        </Box>
    </Box>
  )
}
