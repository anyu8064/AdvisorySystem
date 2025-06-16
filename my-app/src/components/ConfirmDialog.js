// components/ConfirmDialog.js
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Button
} from '@mui/material';

export default function ConfirmDialog({ open, title, content, onClose }) {
  return (
    <Dialog open={open} onClose={() => onClose(false)}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{content}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} color="error">No</Button>
        <Button onClick={() => onClose(true)} variant="contained" color="primary">Yes</Button>
      </DialogActions>
    </Dialog>
  );
}
