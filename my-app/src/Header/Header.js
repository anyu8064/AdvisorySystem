import React, { useState, useEffect } from 'react';
import { AppBar, Avatar, Toolbar, Typography, Menu, MenuItem, IconButton } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Prompt from '../components/prompt';
import HistoryModal from '../Modals/history';
import DataModal from '../Modals/data';

import { collection, getDocs } from "firebase/firestore";
import { db } from '../utils/firebase';
export default function Header({ title, fontSize = '1.5rem' }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [openHistory, setOpenHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const { logout } = useAuth();
  const Navigate = useNavigate();
  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const close = () => setAnchorEl(null);

  const handleLogout = async () => {
    await logout();
    setAlert({ open: true, message: 'Logout Successfully.', severity: 'success' });
    close();
    setTimeout(() => Navigate('/'), 1000);
  };

  const handleCloseAlert = () => setAlert(prev => ({ ...prev, open: false }));

  const handleOpenHistory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'SavedData'));

      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data();

        // Convert createdAt timestamp
        const createdAt = docData.createdAt?.seconds
          ? new Date(docData.createdAt.seconds * 1000)
          : null;

        const formattedCreatedAt = createdAt
          ? createdAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
          : 'No date';

        // Format dateTimes
        const formattedDateTimes = (docData.dateTimes || []).map(entry => {
          const startDate = entry.start?.seconds
            ? new Date(entry.start.seconds * 1000)
            : null;
          const endDate = entry.end?.seconds
            ? new Date(entry.end.seconds * 1000)
            : null;

          return {
            start: startDate,
            end: endDate,
            startFormatted: startDate
              ? startDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
              : 'N/A',
            endFormatted: endDate
              ? endDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
              : 'N/A',
          };
        });

        return {
          id: doc.id,
          title: docData.issue || 'No title',
          date: formattedCreatedAt,
          daterange: formattedDateTimes,
          fullDetails: {
            scope: docData.scope || null,
            status: docData.status || null,
            issue: docData.issue || null,
            output: docData.output || null,
            type: docData.type || null,
            dateTimes: formattedDateTimes,
            unscheduled: docData.unscheduled || false,
            durationText: docData.durationText || null,
            areas: docData.areas || [],
            details: docData.details || null,
            createdAt,
            imageUrl: docData.imageUrl || null, // ✅ include image URL
            pdfUrl: docData.pdfUrl || null,     // ✅ include PDF URL
          }
        };
      });

      setHistoryData(data);
      setOpenHistory(true);
      close();
    } catch (error) {
      console.error("Error fetching history data:", error);
    }
  };

  const handleCloseHistory = () => setOpenHistory(false);

  const [opendataModal, setOpendataModal] = useState(false);

  const handledataOpen = () => setOpendataModal(true);
  const handledataClose = () => setOpendataModal(false);

  return (
    <AppBar position="fixed" sx={{ width: '100%', backgroundColor: '#1976d2' }}>
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64, md: 72 }, px: 2 }}>
        <Prompt open={alert.open} message={alert.message} severity={alert.severity} onClose={handleCloseAlert} />

        <Typography
          variant="h6"
          noWrap
          sx={{ fontSize: fontSize, flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
        >
          {title}
        </Typography>

        <IconButton onClick={handleClick}>
          <Avatar sx={{ cursor: 'pointer' }} />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={close}
          onClick={close}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handledataOpen}>System Variables</MenuItem>
          <MenuItem onClick={handleOpenHistory}>History</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>

        <DataModal open={opendataModal} handleClose={handledataClose} />
        <HistoryModal
          open={openHistory}
          onClose={handleCloseHistory}
          historyData={historyData}
        />
      </Toolbar>
    </AppBar>
  );
}
