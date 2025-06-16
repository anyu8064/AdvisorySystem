import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell,
  Button, IconButton, Typography, Box, TextField, Autocomplete, Portal
} from '@mui/material';
import { Edit, Archive } from '@mui/icons-material';
import {
  doc, getDoc, updateDoc, increment,
  setDoc, getDocs, collection
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from '../context/AuthContext';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import Prompt from '../components/prompt';
import ConfirmDialog from '../components/ConfirmDialog'; // New confirm dialog



export default function Users({ open, handleClose }) {
   const { currentUser } = useAuth();
   console.log(currentUser);
  const [confirmPrompt, setConfirmPrompt] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingUserLevel, setPendingUserLevel] = useState('');
  const [users, setUsers] = useState([]);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    position: '',
    userLevel: ''
  });

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
      setEditRowId(null);
      setEditedUserLevel('');
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const generateNextUserId = async () => {
    const counterRef = doc(db, "counters", "users");
    const counterSnap = await getDoc(counterRef);
    if (!counterSnap.exists()) {
      await setDoc(counterRef, { count: 0 });
    }
    await updateDoc(counterRef, { count: increment(1) });
    const updatedSnap = await getDoc(counterRef);
    const newCount = updatedSnap.data().count;
    return `mmc-${newCount.toString().padStart(3, '0')}`;
  };

  const [editRowId, setEditRowId] = useState(null);
  const [editedUserLevel, setEditedUserLevel] = useState('');

  const handleEditClick = (user) => {
    setEditRowId(user.id);
    setEditedUserLevel(user.userLevel);
  };
  const handleConfirm = async (confirmed) => {
    if (confirmed && pendingUser) {
      try {
        await updateDoc(doc(db, "users", pendingUser.id), {
          userLevel: pendingUserLevel
        });
        showSnackbar(`Successfully changed the user level of ${pendingUser.name}`, 'success');
      } catch (error) {
        showSnackbar(`Failed to update user level: ${error.message}`, 'error');
      }
    } else {
      showSnackbar('Action cancelled', 'warning');
    }

    setEditRowId(null);
    setEditedUserLevel('');
    setConfirmPrompt(false);
    setPendingUser(null);
    setPendingUserLevel('');
    fetchUsers();
  };

const handleSaveClick = (user) => {
  // If no change in user level, skip confirmation and show cancelled message
  if (user.userLevel === editedUserLevel) {
    showSnackbar('Action cancelled', 'warning');
    setEditRowId(null);
    setEditedUserLevel('');
    return;
  }

  // If changed, show confirmation dialog
  setPendingUser(user);
  setPendingUserLevel(editedUserLevel);
  setConfirmPrompt(true);
};


  const handleAddUserSubmit = async () => {
    const auth = getAuth();
    const password = formData.userLevel === 'admin' ? 'admin123' : 'user123';

    try {
      // Step 1: Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, password);
      const uid = userCredential.user.uid;

      // Step 2: Generate user ID for Firestore
      const newId = await generateNextUserId();

      // Step 3: Store user details in Firestore
      await setDoc(doc(db, "users", newId), {
        ...formData,
        uid,       // Save auth uid
        id: newId  // Save generated user ID for traceability
      });

      // Step 4: Refresh UI
      fetchUsers();
      setOpenAddModal(false);
      setFormData({ username: '', name: '', email: '', position: '', userLevel: '' });
    } catch (error) {
      console.error("Error adding user:", error.message);
      alert("Failed to add user: " + error.message);
    }
  };

  return (
    <>
    <Portal>
      <Prompt
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />

      <ConfirmDialog
        open={confirmPrompt}
        title="Confirm Change"
        content={`Are you sure you want to change the user level of ${pendingUser?.name}?`}
        onClose={handleConfirm}
      />

    </Portal>
      

      {/* Main User Management Modal */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>Manage Users</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">User List</Typography>
            <Button variant="contained" onClick={() => setOpenAddModal(true)}>
              Add User
            </Button>
          </Box>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User ID</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>User Level</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.position}</TableCell>
                  <TableCell>
                    {editRowId === user.id ? (
                      <Autocomplete
                        options={['user', 'admin']}
                        value={editedUserLevel}
                        onChange={(e, newValue) => setEditedUserLevel(newValue || '')}
                        sx={{ width: 120 }}
                        renderInput={(params) => <TextField {...params} size="small" />}
                      />
                    ) : (
                      user.userLevel
                    )}
                  </TableCell>
                  <TableCell>
                    {editRowId === user.id ? (
                      <IconButton color="success" onClick={() => handleSaveClick(user)}>
                        <Typography fontWeight="bold">Save</Typography>
                      </IconButton>
                    ) : (
                      <>
                        <IconButton color="primary" onClick={() => handleEditClick(user)}>
                          <Edit />
                        </IconButton>
                        <IconButton color="error" onClick={() => alert(`Archive ${user.name}`)}>
                          <Archive />
                        </IconButton>
                      </>
                    )}
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>

          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="dense" label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label="Position"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          />
          <Autocomplete
            options={['user', 'admin']}
            value={formData.userLevel}
            onChange={(event, newValue) =>
              setFormData({ ...formData, userLevel: newValue || '' })
            }
            renderInput={(params) => (
              <TextField {...params} label="User Level" fullWidth margin="dense" />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddModal(false)}>Cancel</Button>
          <Button onClick={handleAddUserSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>


    </>
  );
}
