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

    return (
        <Modal open={open} onClose={handleClose}>
            <Box sx={{
                p: 3,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 24,
                width: '60%',
                height: '60%',
                mx: 'auto',
                mt: '10%',
            }}>
                <Table>
                    <TableBody>
                        <TableRow>

                            <TableCell sx={{ width: '80%' }}>
                                <Typography
                                    variant="h6"
                                    align="center"
                                    fontWeight="bold"
                                    mb={1}
                                >
                                    System Variables
                                </Typography>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                            getOptionLabel={(option) => typeof option === 'string' ? option : option?.name || ''}
                                            isOptionEqualToValue={(option, value) => option?.name === value?.name}
                                            onChange={(e, newValue) => setSelectedIssue(newValue)}
                                            renderInput={(params) => (
                                                <TextField {...params} label="Issue" size="small" />
                                            )}
                                        />
                                    </Box>
                                    <Autocomplete
                                        sx={{ width: '49%' }}
                                        options={typeOptions}
                                        value={selectedType}
                                        onChange={(e, newValue) => setSelectedType(newValue)}
                                        getOptionLabel={(option) => option?.name || ''}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Type" size="small" />
                                        )}
                                    />
                                    <Box display="flex" alignItems="start" gap={1}>
                                        <TextField fullWidth multiline rows={8}
                                            value={details}
                                            onChange={(e) => setDetails(e.target.value)}
                                            placeholder="Details" />

                                    </Box>

                                    <Button
                                        color="primary"
                                        variant="outlined"
                                        sx={{ width: '25%' }}
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

                                    <Prompt
                                        open={promptOpen}
                                        message={promptMessage}
                                        severity={promptSeverity}
                                        onClose={() => setPromptOpen(false)}
                                    />

                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Box>
        </Modal>
    );
};

export default DataModal;
