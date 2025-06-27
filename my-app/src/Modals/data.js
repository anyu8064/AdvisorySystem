// components/DataModal.js
import React, { useState, useEffect } from 'react';
import {
    Modal,
    Box,
    Typography,
    Autocomplete,
    TextField,
    Table,
    TableBody,
    TableRow,
    TableCell,
    Button
} from '@mui/material';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import Prompt from '../components/prompt';


const DataModal = ({ open, handleClose }) => {
    const [scopeOptions, setScopeOptions] = useState([]);
    const [typeOptions, setTypeOptions] = useState([]);
    const [selectedScope, setSelectedScope] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [issueOptions, setIssueOptions] = useState([]);
    const [optionStatus, setOptionStatus] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [details, setDetails] = useState('');
    const [promptOpen, setPromptOpen] = useState(false);
    const [promptMessage, setPromptMessage] = useState('');
    const [promptSeverity, setPromptSeverity] = useState('info');
    const [mode, setMode] = useState('update'); // 'update' or 'add'
    const [newScope, setNewScope] = useState('');
    const [newIssue, setNewIssue] = useState('');
    const [newType, setNewType] = useState('');
    const [isAddingScope, setIsAddingScope] = useState(false);
    const [isAddingIssue, setIsAddingIssue] = useState(false);

    useEffect(() => {
        const fetchScopes = async () => {
            try {
                const docRef = doc(db, "Scope", "lahQ4Tj4TpNZBCGxZ94F");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const scopes = Object.values(data).map(name => ({ name }))
                        .sort((a, b) => a.name.localeCompare(b.name));
                    setScopeOptions(scopes);
                }
            } catch (err) {
                console.error("Error fetching scopes:", err);
            }
        };
        fetchScopes();
    }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const parentDocRef = doc(db, "Status", "Status");
                const subColRef = collection(parentDocRef, "Choices");
                const snapshot = await getDocs(subColRef);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOptionStatus(data);
            } catch (error) {
                console.error("Error fetching choices:", error);
            }
        };
        fetchStatus();
    }, []);

    useEffect(() => {
        const fetchType = async () => {
            try {
                const docRef = doc(db, "Type", "xNJYrZHrnktpkWPhsuOX");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const type = Object.values(data).map(name => ({ name }))
                        .sort((a, b) => a.name.localeCompare(b.name));
                    setTypeOptions(type);
                }
            } catch (err) {
                console.error("Error fetching types:", err);
            }
        };
        fetchType();
    }, []);

    useEffect(() => {
        const fetchIssues = async () => {
            if (!selectedScope?.name) return;
            try {
                const docRef = doc(db, 'ScopeIssue', selectedScope.name);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const issues = Object.values(data).map(name => ({ name }))
                        .sort((a, b) => a.name.localeCompare(b.name));
                    setIssueOptions(issues);
                }
            } catch (error) {
                console.error('Error fetching issues:', error);
            }
        };
        if (selectedScope) fetchIssues();
    }, [selectedScope]);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!selectedScope?.name || !selectedIssue?.name || !selectedType?.name) return;
            try {
                const docRef = doc(db, 'ScopeIssueDes', selectedScope.name, selectedIssue.name, 'Type');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const detail = data[selectedType.name];
                    setDetails(detail || '');
                } else {
                    setDetails('');
                }
            } catch (error) {
                console.error('Error fetching description:', error);
            }
        };
        fetchDetails();
    }, [selectedScope, selectedIssue, selectedType]);

    const clear = () => {
        setSelectedScope(null);
        setSelectedIssue(null);
        setSelectedType(null);
        setSelectedStatus(null);
        setIssueOptions([]);
        setDetails('');
        setNewScope('');
        setNewIssue('');
        setNewType('');
    };

    return (
        <Modal open={open} onClose={() => {
            clear();
            handleClose();
        }}>
            <Box
                sx={{
                    p: 3,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    width: '60%',
                    maxHeight: '90vh',  // Use maxHeight instead of fixed height
                    overflowY: 'auto',  // Enable vertical scroll when needed
                    mx: 'auto',
                    mt: '5%',           // Slightly closer to top for better layout
                }}
            >

                <Table>
                    <Typography
                        variant="h6"
                        align="center"
                        fontWeight="bold"
                        mb={2}
                    >
                        System Variables
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Button
                            variant={mode === 'update' ? 'contained' : 'outlined'}
                            onClick={() => {
                                clear();
                                setMode('update');
                            }}
                        >
                            Update Details
                        </Button>
                        <Button
                            variant={mode === 'add' ? 'contained' : 'outlined'}
                            onClick={() => {
                                clear();
                                setMode('add');
                            }}
                        >
                            Add New
                        </Button>
                    </Box>


                    {mode === 'update' ? (
                        <>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Autocomplete
                                    sx={{ width: '50%' }}
                                    options={scopeOptions}
                                    getOptionLabel={(option) => option?.name || ''}
                                    value={selectedScope}
                                    onChange={(e, newValue) => {
                                        setSelectedScope(newValue);
                                        setSelectedIssue(null);
                                        setSelectedType(null);
                                        setIssueOptions([]);
                                        setDetails('');
                                        setSelectedStatus(null);
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Scope" size="small" />
                                    )}
                                />
                                <Autocomplete
                                    sx={{ width: '50%' }}
                                    options={issueOptions}
                                    value={selectedIssue}
                                    getOptionLabel={(option) =>
                                        typeof option === 'string' ? option : option?.name || ''
                                    }
                                    isOptionEqualToValue={(option, value) =>
                                        option?.name === value?.name
                                    }
                                    onChange={(e, newValue) => setSelectedIssue(newValue)}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Issue" size="small" />
                                    )}
                                />
                            </Box>

                            <Autocomplete
                                sx={{ width: '49%', mt: 2 }}
                                options={typeOptions}
                                value={selectedType}
                                onChange={(e, newValue) => setSelectedType(newValue)}
                                getOptionLabel={(option) => option?.name || ''}
                                renderInput={(params) => (
                                    <TextField {...params} label="Type" size="small" />
                                )}
                            />

                            <TextField
                                fullWidth
                                multiline
                                rows={8}
                                sx={{ mt: 2 }}
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Details"
                            />

                            <Button
                                color="primary"
                                variant="outlined"
                                sx={{ width: '25%', mt: 2 }}
                                onClick={async () => {
                                    if (!selectedScope?.name || !selectedIssue?.name || !selectedType?.name) {
                                        setPromptMessage('Please select Scope, Issue, and Type before updating.');
                                        setPromptSeverity('warning');
                                        setPromptOpen(true);
                                        return;
                                    }

                                    try {
                                        const docRef = doc(db, 'ScopeIssueDes', selectedScope.name, selectedIssue.name, 'Type');
                                        await updateDoc(docRef, {
                                            [selectedType.name]: details
                                        });
                                        setPromptMessage('Details updated successfully!');
                                        setPromptSeverity('success');
                                        setPromptOpen(true);
                                    } catch (error) {
                                        console.error('Error updating details:', error);
                                        setPromptMessage('Failed to update details.');
                                        setPromptSeverity('error');
                                        setPromptOpen(true);
                                    }
                                }}
                            >
                                Update
                            </Button>
                        </>
                    ) : (
                        <>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
                                {isAddingScope ? (
                                    <TextField
                                        label="New Scope"
                                        value={newScope}
                                        onChange={(e) => setNewScope(e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                ) : (
                                    <Autocomplete
                                        sx={{ flex: 1 }}
                                        options={scopeOptions}
                                        getOptionLabel={(option) => option?.name || ''}
                                        value={selectedScope}
                                        onChange={(e, newValue) => {
                                            setSelectedScope(newValue);
                                            setNewScope('');
                                            setNewIssue('');
                                            setSelectedIssue(null);
                                            setDetails('');
                                        }}
                                        renderInput={(params) => <TextField {...params} label="Select Scope" size="small" />}
                                    />
                                )}
                                <Button
  variant="outlined"
  onClick={() => {
    const switchingToAddNew = !isAddingScope;

    setIsAddingScope(switchingToAddNew);
    setNewScope('');
    setSelectedScope(null);

    if (switchingToAddNew) {
      // Only force Issue to "add new" when Scope is switching to "add new"
      setIsAddingIssue(true);
      setNewIssue('');
      setSelectedIssue(null);
    }

    setDetails('');
  }}
>
  {isAddingScope ? 'Existing Scope' : 'Add New Scope'}
</Button>

                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
                                {isAddingIssue ? (
                                    <TextField
                                        label="New Issue"
                                        value={newIssue}
                                        onChange={(e) => setNewIssue(e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                ) : (
                                    <Autocomplete
                                        sx={{ flex: 1 }}
                                        options={issueOptions}
                                        getOptionLabel={(option) => option?.name || ''}
                                        value={selectedIssue}
                                        onChange={(e, newValue) => {
                                            setSelectedIssue(newValue);
                                            setNewIssue('');
                                            setDetails('');
                                        }}
                                        renderInput={(params) => <TextField {...params} label="Select Issue" size="small" />}
                                    />
                                )}
                               <Button
  variant="outlined"
  onClick={() => {
    setIsAddingIssue(!isAddingIssue);
    setNewIssue('');
    setSelectedIssue(null);
  }}
  disabled={isAddingScope} // 🔒 Disable if Scope is in "Add New"
>
  {isAddingIssue ? 'Existing Issue' : 'Add New Issue'}
</Button>

                            </Box>

                            <Autocomplete
                                sx={{ width: '49%', mt: 2 }}
                                options={typeOptions}
                                value={selectedType}
                                onChange={(e, newValue) => setSelectedType(newValue)}
                                getOptionLabel={(option) => option?.name || ''}
                                renderInput={(params) => (
                                    <TextField {...params} label="Type" size="small" />
                                )}
                            />
                            <TextField
                                label="Details"
                                multiline
                                rows={8}
                                fullWidth
                                sx={{ mt: 2 }}
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                            />
                            <Button
                                color="primary"
                                variant="outlined"
                                sx={{ width: '25%', mt: 2 }}
                                onClick={async () => {
                                    const finalScope = isAddingScope ? newScope.trim() : selectedScope?.name;
                                    const finalIssue = isAddingIssue ? newIssue.trim() : selectedIssue?.name;

                                    if (!finalScope || !finalIssue || !selectedType?.name) {
                                        setPromptMessage('Please fill in Scope, Issue, and Type before saving.');
                                        setPromptSeverity('warning');
                                        setPromptOpen(true);
                                        return;
                                    }

                                    try {
                                        // Optional: Save new scope to Scope collection (with auto-increment field name)
                                        if (isAddingScope) {
                                            const scopeDocRef = doc(db, 'Scope', 'lahQ4Tj4TpNZBCGxZ94F');
                                            const scopeSnap = await getDoc(scopeDocRef);

                                            if (scopeSnap.exists()) {
                                                const scopeData = scopeSnap.data();
                                                const scopeExists = Object.values(scopeData).some(
                                                    val => val.toLowerCase() === finalScope.toLowerCase()
                                                );

                                                if (!scopeExists) {
                                                    const keys = Object.keys(scopeData)
                                                        .filter(key => key.startsWith('scope'))
                                                        .map(key => parseInt(key.replace('scope', '')))
                                                        .filter(n => !isNaN(n));
                                                    const nextScopeIndex = keys.length > 0 ? Math.max(...keys) + 1 : 1;
                                                    const newScopeKey = `scope${nextScopeIndex}`;
                                                    await updateDoc(scopeDocRef, {
                                                        [newScopeKey]: finalScope,
                                                    });
                                                }
                                            }
                                        }

                                        // Save description under ScopeIssueDes/{finalScope}/{finalIssue}/Type
                                        const docRef = doc(db, 'ScopeIssueDes', finalScope, finalIssue, 'Type');
                                        await updateDoc(docRef, {
                                            [selectedType.name]: details
                                        });

                                        setPromptMessage('New details saved successfully!');
                                        setPromptSeverity('success');
                                        setPromptOpen(true);

                                        // Clear inputs
                                        setNewScope('');
                                        setNewIssue('');
                                        setNewType('');
                                        setSelectedScope(null);
                                        setSelectedIssue(null);
                                        setSelectedType(null);
                                        setDetails('');
                                    } catch (error) {
                                        console.error('Error saving new details:', error);
                                        setPromptMessage('Failed to save new details.');
                                        setPromptSeverity('error');
                                        setPromptOpen(true);
                                    }
                                }}

                            >
                                Save
                            </Button>
                        </>
                    )}

                    <Prompt
                        open={promptOpen}
                        message={promptMessage}
                        severity={promptSeverity}
                        onClose={() => setPromptOpen(false)}
                    />

                </Table>
            </Box>
        </Modal>
    );
};

export default DataModal;
