import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
} from '@mui/material';

export default function ProfileModal({ open, onClose, user }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Profile Information</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1"><strong>Name:</strong> {user.name}</Typography>
          <Typography variant="subtitle1"><strong>Username:</strong> {user.username}</Typography>
          <Typography variant="subtitle1"><strong>Email:</strong> {user.email}</Typography>
          <Typography variant="subtitle1"><strong>Position:</strong> {user.position}</Typography>
          <Typography variant="subtitle1"><strong>User Level:</strong> {user.userLevel}</Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="h6" gutterBottom>Security Questions</Typography>
          <Typography variant="subtitle2"><strong>Question 1:</strong> {user.securityQ1}</Typography>
          <Typography variant="subtitle2"><strong>Answer 1:</strong> {user.securityA1}</Typography>
          <Typography variant="subtitle2"><strong>Question 2:</strong> {user.securityQ2}</Typography>
          <Typography variant="subtitle2"><strong>Answer 2:</strong> {user.securityA2}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" sx={{ backgroundColor: '#1E40AF' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
