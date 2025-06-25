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
  const [archivePrompt, setArchivePrompt] = useState(false);
  const [userToArchive, setUserToArchive] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingUserLevel, setPendingUserLevel] = useState('');
  const [users, setUsers] = useState([]);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    position: '',
    userLevel: '',
    status: 'true'
  });
  const confirmArchive = (user) => {
    setUserToArchive(user);
    setArchivePrompt(true);
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList.filter(u => u.status !== false)); // default to active if undefined
      setArchivedUsers(userList.filter(u => u.status === false));
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

  const [archivedUsers, setArchivedUsers] = useState([]);

  const handleAddUserSubmit = async () => {
    const auth = getAuth();
    const email = formData.email.trim().toLowerCase();
    const username = formData.username.trim().toLowerCase();
    const password = formData.userLevel === 'admin' ? 'admin123' : 'user123';

    try {
      // 🔍 Step 1: Check Firestore for existing username or email
      const querySnapshot = await getDocs(collection(db, "users"));
      const duplicate = querySnapshot.docs.find(doc => {
        const data = doc.data();
        return (
          data.email.toLowerCase() === email ||
          data.username.toLowerCase() === username
        );
      });

      if (duplicate) {
        const conflict = duplicate.data().email.toLowerCase() === email ? 'Username' : 'Email';
        showSnackbar(`${conflict} already exists.`, 'error');
        return;
      }

      // 🛡️ Step 2: Try to create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 🆔 Step 3: Generate unique Firestore ID
      const newId = await generateNextUserId();

      // 📝 Step 4: Save user data to Firestore
      await setDoc(doc(db, "users", newId), {
        ...formData,
        email,
        username,
        uid,
        id: newId,
        status: true,
      });

      // ✅ Step 5: Cleanup
      fetchUsers();
      setOpenAddModal(false);
      setFormData({ username: '', name: '', email: '', position: '', userLevel: '' });
      showSnackbar('User created successfully!', 'success');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        showSnackbar('Email already exists in Firebase Auth.', 'error');
      } else {
        console.error("Error adding user:", error.message);
        showSnackbar('Failed to add user: ' + error.message, 'error');
      }
    }
  };

  const archiveUser = async (user) => {
    try {
      await updateDoc(doc(db, "users", user.id), {
        status: false
      });
      showSnackbar(`${user.name} archived successfully.`, 'success');
      fetchUsers();
    } catch (error) {
      showSnackbar('Failed to archive user: ' + error.message, 'error');
    }
  };

  const restoreUser = async (user) => {
    try {
      await updateDoc(doc(db, "users", user.id), {
        status: true
      });
      showSnackbar(`${user.name} restored successfully.`, 'success');
      fetchUsers();
    } catch (error) {
      showSnackbar('Failed to restore user: ' + error.message, 'error');
    }
  };

  const handleArchiveConfirm = async (confirmed) => {
    if (confirmed && userToArchive) {
      try {
        await updateDoc(doc(db, "users", userToArchive.id), {
          status: false
        });
        showSnackbar(`${userToArchive.name} has been archived.`, 'success');
      } catch (error) {
        showSnackbar(`Failed to archive user: ${error.message}`, 'error');
      }
    } else {
      showSnackbar('Action cancelled', 'warning');
    }

    setArchivePrompt(false);
    setUserToArchive(null);
    fetchUsers();
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

        <ConfirmDialog
          open={archivePrompt}
          title="Confirm Archive"
          content={`Are you sure you want to archive the account of ${userToArchive?.name}?`}
          onClose={handleArchiveConfirm}
        />


      </Portal>


      {/* Main User Management Modal */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>Manage Users</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">User List</Typography>
            <Box>
              <Button variant="outlined" onClick={() => setShowArchiveModal(true)} sx={{ mr: 1 }}>
                View Archives
              </Button>
              <Button variant="contained" onClick={() => setOpenAddModal(true)}>
                Add User
              </Button>
            </Box>
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
                    {user.userLevel === 'superadmin' ? (
                      user.userLevel
                    ) : editRowId === user.id ? (
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
                    {user.userLevel === 'superadmin' ? (
                      <Typography variant="body2" color="textSecondary">Protected</Typography>
                    ) : editRowId === user.id ? (
                      <IconButton color="success" onClick={() => handleSaveClick(user)}>
                        <Typography fontWeight="bold">Save</Typography>
                      </IconButton>
                    ) : (
                      <>
                        <IconButton color="primary" onClick={() => handleEditClick(user)}>
                          <Edit />
                        </IconButton>
                        <IconButton color="error" onClick={() => confirmArchive(user)}>
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

      <Dialog open={showArchiveModal} onClose={() => setShowArchiveModal(false)} fullWidth maxWidth="md">
        <DialogTitle>Archived Users</DialogTitle>
        <DialogContent>
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
              {archivedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.position}</TableCell>
                  <TableCell>{user.userLevel}</TableCell>
                  <TableCell>
                    <Button variant="outlined" color="primary" onClick={() => restoreUser(user)}>
                      Restore
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowArchiveModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

    </>
  );
}
