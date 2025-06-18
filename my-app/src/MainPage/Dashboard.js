import React, { useState, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableRow, Box, TextField, Checkbox, FormControlLabel, Button, Typography,
  Modal, IconButton, Autocomplete, Card, CardContent, Grid, Portal
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import Header from '../Header/Header';
import { Add, Remove, Description } from "@mui/icons-material";
import Prompt from '../components/prompt';
import Loading from '../components/Loading';
import { useEffect } from 'react';
import { db } from '../utils/firebase';
import  '../style.css';
import { getDocs, doc, getDoc, collection, setDoc, addDoc, updateDoc } from "firebase/firestore";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import Logo from '../assets/Logo.png';
import Head from '../assets/head.png';
import { getStorage, ref, uploadString, uploadBytes, getDownloadURL } from "firebase/storage";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description'; // for Word icon
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [prompt, setPrompt] = useState({ open: false, message: '', severity: 'warning' });
  console.log(currentUser);
  const [unscheduled, setUnscheduled] = useState(false);
  const [durationText, setDurationText] = useState("");
  const [scopeOptions, setScopeOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([])
  const [selectedScope, setSelectedScope] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState('');
  const [issueOptions, setIssueOptions] = useState([]);
  const [optionStatus, setOptionStatus] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [details, setDetails] = useState('');
  const [areas, setAreas] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [promptSeverity, setPromptSeverity] = useState('warning');
  const isDateTimeComplete = () => {
    return dateTimes.every(entry =>
      entry.start.date &&
      entry.start.time &&
      entry.end.date &&
      entry.end.time
    );
  };
  const isIssueComplete = () => {
    return selectedIssue;
  };
  const isTypeComplete = () => {
    return selectedType;
  };



  const cardRef = useRef();

  const handleGenerateWord = async () => {

    // Prepare the "when" field from dateTimes
    const formatWhen = () => {
      return dateTimes.map((entry) => {
        const { start, end } = entry;

        if (!start?.date || !start?.time || !end?.date || !end?.time) return '--';

        const isSameDate = start.date === end.date;

        const formattedStartDate = dayjs(start.date).format('MMMM DD, YYYY');
        const startDay = dayjs(start.date).format('dddd');
        const formattedEndDate = dayjs(end.date).format('MMMM DD, YYYY');
        const endDay = dayjs(end.date).format('dddd');
        const formattedStartTime = dayjs(`${start.date}T${start.time}`).format('h:mm A');
        const formattedEndTime = dayjs(`${end.date}T${end.time}`).format('h:mm A');

        return isSameDate
          ? `${formattedStartDate} (${startDay}) ${formattedStartTime} - ${formattedEndTime}`
          : `${formattedStartDate} (${startDay}) ${formattedStartTime} - ${formattedEndDate} (${endDay}) ${formattedEndTime}`;
      }).join('\n');
    };

    const requestData = {
      what: selectedIssue?.name || '--',
      when: formatWhen(),
      duration: durationText || '--',
      areaAffected: areas || '--',
      details: details || '--',
    };

    try {
      const response = await fetch("https://us-central1-mmcadvisorysystem.cloudfunctions.net/getFile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = "ITAdvisoryFilled.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("DOCX generation failed:", err);
      alert("Failed to generate document.");
    }
  };
  const theme = createTheme({
    typography: {
      fontFamily: 'sans-serif',
    },
  });
  const handleGenerateImage = async () => {
  setLoading(true);
  try {
    const docRef = await saveForm();

    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 300));

    // Wait for all images inside cardRef to load
    const images = cardRef.current.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
            })
      )
    );

    // Force reflow and repaint before capturing
  
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Fix style issues for rendering
    cardRef.current.style.backgroundColor = '#ffffff';
    cardRef.current.style.overflow = 'visible';
    cardRef.current.style.boxShadow = 'none';

    // Generate canvas
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#ffffff',
      useCORS: true,
      scale: 2,
      removeContainer: true,
      logging: false,
    });

    const imageData = canvas.toDataURL('image/png');

    const storage = getStorage();
    const storageRef = ref(storage, `formImages/${docRef.id}.png`);
    await uploadString(storageRef, imageData, 'data_url');

    const imageUrl = await getDownloadURL(storageRef);
    await updateDoc(docRef, { imageUrl });

    // Download image
    const link = document.createElement('a');
    link.download = 'IT_Advisory.png';
    link.href = imageData;
    link.click();

    setPromptMessage("Form and image saved successfully!");
    setPromptSeverity('success');
    setPromptOpen(true);
  } catch (error) {
    console.error("Error saving form or generating image:", error);
    setPromptMessage("Error saving form or generating image.");
    setPromptSeverity('error');
    setPromptOpen(true);
  } finally {
    setLoading(false);
  }
};

const handleGeneratePDF = async () => {
  setLoading(true);
  try {
    const docRef = await saveForm();

    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 300));

    // Wait for all images inside cardRef to load
    const images = cardRef.current.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
            })
      )
    );

    // Force reflow
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Apply styles to improve canvas rendering
    cardRef.current.style.backgroundColor = '#ffffff';
    cardRef.current.style.overflow = 'visible';
    cardRef.current.style.boxShadow = 'none';

    // Create canvas
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#ffffff',
      useCORS: true,
      scale: 2,
      removeContainer: true,
      logging: false,
    });

    const imageData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Create A4 PDF and scale image properly
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const scaleRatio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
    const x = (pageWidth - imgWidth * scaleRatio) / 2;
    const y = (pageHeight - imgHeight * scaleRatio) / 2;

    pdf.addImage(imageData, 'PNG', x, y, imgWidth * scaleRatio, imgHeight * scaleRatio);

    const pdfBlob = pdf.output('blob');

    const storage = getStorage();
    const pdfRef = ref(storage, `formPDFs/${docRef.id}.pdf`);
    await uploadBytes(pdfRef, pdfBlob);

    const pdfUrl = await getDownloadURL(pdfRef);
    await updateDoc(docRef, { pdfUrl });

    pdf.save('IT-Advisory.pdf');

    setPromptMessage("Form and PDF saved successfully!");
    setPromptSeverity('success');
    setPromptOpen(true);
  } catch (error) {
    console.error("Error generating PDF from image:", error);
    setPromptMessage("Error generating PDF from image.");
    setPromptSeverity('error');
    setPromptOpen(true);
  } finally {
    setLoading(false);
  }
};

const handleCopyImage = async () => {
  try {
    // Style fixes for rendering
    cardRef.current.style.backgroundColor = '#ffffff';
    cardRef.current.style.boxShadow = 'none';
    cardRef.current.style.overflow = 'visible';

    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setPromptMessage("Failed to copy image.");
        setPromptSeverity('error');
        setPromptOpen(true);
        return;
      }

      const clipboardItem = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([clipboardItem]);

      setPromptMessage("Image copied to clipboard!");
      setPromptSeverity('success');
      setPromptOpen(true);
    }, 'image/png');
  } catch (error) {
    console.error("Error copying image to clipboard:", error);
    setPromptMessage("Failed to copy image.");
    setPromptSeverity('error');
    setPromptOpen(true);
  }
};


  useEffect(() => {
    const fetchScopes = async () => {
      try {
        const docRef = doc(db, "Scope", "lahQ4Tj4TpNZBCGxZ94F");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const scopes = Object.values(data)
            .map(name => ({ name }))
            .sort((a, b) => a.name.localeCompare(b.name));
          setScopeOptions(scopes);

        } else {
          console.error("No such document in scope!");
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
        const parentDocRef = doc(db, "Status", "Status"); // "Status/Status"
        const subColRef = collection(parentDocRef, "Choices");
        const snapshot = await getDocs(subColRef);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
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
          const type = Object.values(data)
            .map(name => ({ name }))
            .sort((a, b) => a.name.localeCompare(b.name));
          setTypeOptions(type);

        } else {
          console.error("No such document type!");
        }
      } catch (err) {
        console.error("Error fetching types:", err);
      }
    };
    fetchType();
  }, []);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        if (!selectedScope?.name) return;
        console.log(selectedScope.name)
        const docRef = doc(db, 'ScopeIssue', selectedScope.name); // name is used as doc ID
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Fetched data:', data);  // ← this should log an object with issue keys
          const issues = Object.values(data)
            .map(name => ({ name }))
            .sort((a, b) => a.name.localeCompare(b.name));
          setIssueOptions(issues);
        }

      } catch (error) {
        console.error('Error fetching issues:', error);
      }
    };

    if (selectedScope) {
      fetchIssues();
    }
  }, [selectedScope]);

  useEffect(() => {
    console.log("Selected scope:", selectedScope);
    console.log("Selected issue:", selectedIssue);
    console.log("Selected type:", selectedType);

    const fetchDetails = async () => {
      try {
        if (!selectedScope?.name || !selectedIssue?.name || !selectedType?.name) return;

        // Path: ScopeIssueDes/{Scope}/{Issue}/Type
        const docRef = doc(
          db,
          'ScopeIssueDes',
          selectedScope.name,
          selectedIssue.name,
          'Type' // This is a document, not a subcollection
        );

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Fetched Type document data:', data);

          const detail = data[selectedType.name]; // Fetch value from field named after type
          setDetails(detail || '');
        } else {
          console.log('No such document details');
          setDetails('');
        }
      } catch (error) {
        console.error('Error fetching description:', error);
      }
    };

    if (selectedScope && selectedIssue && selectedType) {
      fetchDetails();
    }
  }, [selectedScope, selectedIssue, selectedType]);


  const [dateTimes, setDateTimes] = useState([

    {
      start: { date: "", time: "" },
      end: { date: "", time: "" }
    }
  ]);

  const addDateTime = () => {
    setDateTimes(prev => [
      ...prev,
      {
        start: { date: "", time: "" },
        end: { date: "", time: "" }
      }
    ]);
  };

  const removeDateTime = (index) => {
    const updated = [...dateTimes];
    updated.splice(index, 1);
    setDateTimes(updated);
  };
  const handleDateTimeChange = (index, section, field, value) => {
    const updated = [...dateTimes];
    updated[index][section][field] = value;
    setDateTimes(updated);

    const start = updated[index].start;
    const end = updated[index].end;

    if (start.date && start.time && end.date && end.time) {
      const startDateTime = new Date(`${start.date}T${start.time}`);
      const endDateTime = new Date(`${end.date}T${end.time}`);

      // Ensure end date/time is not before start
      if (endDateTime <= startDateTime) {
        updated[index].end.date = "";
        updated[index].end.time = "";
        setDateTimes(updated);
        setPrompt({
          open: true,
          message: 'End date and time cannot be earlier than start date and time.',
          severity: 'warning',
        });
        return;
      }
    }

    if (!unscheduled) {
      const durations = updated.map(({ start, end }) => {
        if (start.date && start.time && end.date && end.time) {
          const startDateTime = new Date(`${start.date}T${start.time}`);
          const endDateTime = new Date(`${end.date}T${end.time}`);
          const diffMs = endDateTime - startDateTime;

          if (diffMs > 0) {
            const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
            const days = Math.floor(totalHours / 24);
            const hours = totalHours % 24;

            let durationParts = [];
            if (days > 0) {
              durationParts.push(`${days} day${days > 1 ? 's' : ''}`);
            }
            if (hours > 0) {
              durationParts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
            }

            return durationParts.join(' & ');
          }
        }
        return "";
      }).filter(Boolean);

      setDurationText(durations.join('\n'));
    }
  };


  const handleUnscheduledChange = (e) => {
    const checked = e.target.checked;
    setUnscheduled(checked);

    if (checked) {
      // Keep only the first entry and clear it
      const cleared = [{
        start: { date: "", time: "" },
        end: { date: "", time: "" }
      }];
      setDateTimes(cleared);
      setDurationText("Ongoing");
    } else {
      // Recalculate durations if any valid ranges exist
      const durations = dateTimes.map(({ start, end }) => {
        if (start.date && start.time && end.date && end.time) {
          const startDateTime = new Date(`${start.date}T${start.time}`);
          const endDateTime = new Date(`${end.date}T${end.time}`);
          const diffMs = endDateTime - startDateTime;

          if (diffMs > 0) {
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
          }
        }
        return "";
      }).filter(Boolean);

      setDurationText(durations.join('\n'));
    }
  };

  useEffect(() => {
    console.log('Updated issueOptions:', issueOptions);
  }, [issueOptions]);
  useEffect(() => {
    console.log('Updated status:', optionStatus);
  }, [optionStatus]);

  const saveForm = async () => {
    const formattedDateTimes = dateTimes.map(entry => ({
      start: new Date(`${entry.start.date}T${entry.start.time}`),
      end: new Date(`${entry.end.date}T${entry.end.time}`)
    }));

    const fallback = (value) => {
      return value !== undefined && value !== null && value !== "" ? value : "------";
    };

    const formData = {
      scope: fallback(selectedScope?.name),
      status: fallback(selectedStatus?.id),
      issue: fallback(selectedIssue?.name),
      output: fallback(selectedIssue?.name), // same as issue
      type: fallback(selectedType?.name),
      dateTimes: dateTimes.length > 0 ? formattedDateTimes : "------",
      unscheduled: fallback(unscheduled),
      durationText: fallback(durationText),
      areas: areas && areas.length ? areas : ["------"],
      details: fallback(details),
      createdAt: new Date()
    };

    try {
      const savedDataRef = collection(db, "SavedData");
      const docRef = await addDoc(savedDataRef, formData);
      return docRef;
    } catch (err) {
      console.error("Error saving to Firestore:", err);
      throw err;
    }
  };

  useEffect(() => {
    console.log('Trigger:', { selectedType, selectedStatus, selectedIssue });
  }, [selectedType, selectedStatus, selectedIssue]);
  const [outputText, setOutputText] = useState('');
  const [isEdited, setIsEdited] = useState(false);

  // Compute the default output only if not manually edited
  useEffect(() => {
    if (!isEdited) {
      const computed =
        selectedType?.name?.toLowerCase() === 'system restored' &&
          selectedStatus?.id?.toLowerCase() === 'finished' &&
          typeof selectedIssue?.name === 'string'
          ? selectedIssue.name.toLowerCase().includes('degradation')
            ? `${selectedIssue.name} - Resolved`
            : selectedIssue.name.toLowerCase().includes('maintenance') ||
              selectedIssue.name.toLowerCase().includes('emergency maintenance')
              ? `${selectedIssue.name} - Completed`
              : selectedIssue.name.toLowerCase().includes('network') ||
                selectedIssue.name.toLowerCase().includes('wi-fi') ||
                selectedIssue.name.toLowerCase().includes('internet') ||
                selectedIssue.name.toLowerCase().includes('connectivity') ||
                selectedIssue.name.toLowerCase().includes('power fluctuation')
                ? `${selectedIssue.name} - Restored`
                : selectedIssue.name
          : selectedIssue?.name || '';

      setOutputText(computed);
    }
  }, [selectedType, selectedStatus, selectedIssue, isEdited]);


  return (

    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100vh', // Full screen height
        overflow: 'hidden', // Prevents body scroll
      }}
    >
      <Prompt
        open={prompt.open}
        message={prompt.message}
        severity={prompt.severity}
        onClose={() => setPrompt(prev => ({ ...prev, open: false }))}
      />
      <Box sx={{ textAlign: 'center', width: '100%', maxWidth: 1000 }}>
        <Header title="IT Advisory Template" fontSize="2rem" />
      </Box>

      <Box p={4} border={1} borderRadius={2} borderColor="navy" width="100%" maxWidth={1000} sx={{
        overflowY: 'auto',
        height: '100vh',
        mt: 10
      }}>
        <Table>
          <TableBody>
            {/* WHAT*/}
            <TableRow>

              <TableCell sx={{ width: '20%' }}>
                <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>WHAT</Typography>
              </TableCell>

              <TableCell sx={{ width: '80%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>

                    <Autocomplete
                      sx={{ width: '50%' }}
                      options={scopeOptions}
                      getOptionLabel={(option) => option?.name || ''}
                      value={selectedScope}
                      onChange={(event, newValue) => {
                        setSelectedScope(newValue);
                        setSelectedIssue(null);
                        setSelectedType(null);
                        setIssueOptions([]);
                        setDetails('');
                        setSelectedStatus(null);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Scope" fullWidth size="small" value={selectedScope} />
                      )}
                    />
                    <Autocomplete
                      sx={{ width: '48%' }}
                      options={optionStatus}
                      getOptionLabel={(option) => option?.id || ''}
                      value={selectedStatus}
                      onChange={(event, newValue) => {
                        setSelectedStatus(newValue);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Status" fullWidth size="small" />
                      )}
                    />

                  </Box>
                  {/* Issue + Output*/}
                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>

                    <Autocomplete
                      sx={{ width: '50%' }}
                      options={issueOptions || []}
                      value={selectedIssue}
                      getOptionLabel={(option) =>
                        typeof option === 'string' ? option : option?.name || ''
                      }
                      isOptionEqualToValue={(option, value) => option?.name === value?.name}
                      onChange={(event, newValue) => setSelectedIssue(newValue)}
                      renderInput={(params) => (
                        <TextField {...params} label="Issue" fullWidth size='small' />
                      )}
                    />
                    <TextField
                      label="Output"
                      sx={{ width: '48%' }}
                      size="small"
                      value={outputText}
                      onChange={(e) => {
                        setOutputText(e.target.value);
                        setIsEdited(true);
                      }}
                    />

                  </Box>

                  {/* Type */}
                  <Autocomplete
                    sx={{ width: '50%' }}
                    options={typeOptions}
                    value={selectedType}
                    onChange={(event, newValue) => setSelectedType(newValue)}
                    getOptionLabel={(option) => option?.name || ''}
                    renderInput={(params) => (
                      <TextField {...params} label="Type" fullWidth size='small' />
                    )}
                  />
                </Box>
              </TableCell>
            </TableRow>

            {/* WHEN Section */}
            <TableRow >
              <TableCell >
                <Typography fontWeight="bold" sx={{ textAlign: 'center' }} >WHEN</Typography>
              </TableCell>

              {dateTimes.map((entry, index) => (
                <React.Fragment key={index}>
                  <TableRow>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, m: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center' }}>
                          <Typography >Start</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                            <TextField
                              size='small'
                              type="date"
                              label="Date"
                              InputLabelProps={{ shrink: true }}
                              value={entry.start.date}
                              onChange={(e) => handleDateTimeChange(index, 'start', 'date', e.target.value)}
                            />
                            <TextField
                              size='small'
                              type="time"
                              label="Time"
                              InputLabelProps={{ shrink: true }}
                              value={entry.start.time}
                              onChange={(e) => handleDateTimeChange(index, 'start', 'time', e.target.value)}
                              sx={{ ml: 2 }}
                            />
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center' }}>
                          <Typography>End</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                            <TextField
                              size='small'
                              type="date"
                              label="Date"
                              InputLabelProps={{ shrink: true }}
                              value={entry.end.date}
                              onChange={(e) => handleDateTimeChange(index, 'end', 'date', e.target.value)}
                              disabled={!entry.start.date || !entry.start.time}
                              inputProps={{
                                min: entry.start.date || undefined,
                              }}
                            />
                            <TextField
                              size='small'
                              type="time"
                              label="Time"
                              InputLabelProps={{ shrink: true }}
                              value={entry.end.time}
                              onChange={(e) => handleDateTimeChange(index, 'end', 'time', e.target.value)}
                              sx={{ ml: 2 }}
                              disabled={!entry.start.date || !entry.start.time}
                              inputProps={{
                                min:
                                  entry.end.date === entry.start.date && entry.start.time
                                    ? entry.start.time
                                    : undefined,
                              }}
                            />
                            {index > 0 && (
                              <IconButton onClick={() => removeDateTime(index)} sx={{ ml: 2 }}>
                                <Remove />
                              </IconButton>
                            )}
                          </Box>

                          {index === dateTimes.length - 1 && (
                            <Button

                              startIcon={<Add />}
                              onClick={addDateTime}
                              variant="outlined"
                              sx={{ mt: 1, alignSelf: 'flex-end' }}
                            >
                              Add Time Range
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableRow>

            {/* DURATION */}
            <TableRow>
              <TableCell>
                <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>DURATION</Typography>
              </TableCell>
              <TableCell>

                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={unscheduled}
                        onChange={handleUnscheduledChange}
                      />
                    }
                    label="Unscheduled"
                  />
                  <TextField
                    sx={{ width: '60%' }}
                    size="small"
                    value={durationText}
                    multiline
                    rows={dateTimes.length}
                    onChange={(e) => setDurationText(e.target.value)}
                  />

                </Box>
              </TableCell>
            </TableRow>

            {/* AREAS AFFECTED */}
            <TableRow>
              <TableCell>
                <Typography fontWeight="bold" sx={{ textAlign: 'center' }} >AREAS AFFECTED</Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="start" gap={1}>
                  <TextField fullWidth multiline rows={8} placeholder="Areas Affected" value={areas}
                    onChange={(e) => setAreas(e.target.value)} />
                  <Box>
                    {[0, 1, 2].map((i) => (
                      <IconButton key={i}>
                        <Description />
                      </IconButton>
                    ))}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>

            {/* DETAILS */}
            <TableRow>
              <TableCell>
                <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>DETAILS</Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="start" gap={1}>
                  <TextField fullWidth multiline rows={8}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Details" />
                  <Box>
                    {[0, 1, 2].map((i) => (
                      <IconButton key={i}>
                        <Description />
                      </IconButton>
                    ))}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>

            {/* BUTTONS */}
            <TableRow>
              <TableCell colSpan={2} align="center">
                <Button variant="contained" color="primary" sx={{ mr: 2 }}>
                  BACK
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    if (!isIssueComplete()) {
                      setPromptMessage('Please select Issue.');
                      setPromptSeverity('warning');
                      setPromptOpen(true);
                    } else if (!isTypeComplete()) {
                      setPromptMessage('Please select Type.');
                      setPromptSeverity('warning');
                      setPromptOpen(true);
                    } else if (!isDateTimeComplete()) {
                      setPromptMessage('Please fill in all start and end date/time fields.');
                      setPromptSeverity('warning');
                      setPromptOpen(true);
                    } else {
                      setOpenModal(true);
                    }
                  }}
                >
                  PREVIEW
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: 678,
            maxHeight: '90vh',
            overflowY: 'auto',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            overflowX: 'hidden',
          }}
        >
          <Portal>
            <Loading open={loading} />
          </Portal>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 4 }}>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 'bold' }}>Copy Image</Typography>
              <IconButton
                onClick={handleCopyImage}
                size="large"
              >
                <ContentCopyIcon sx={{ fontSize: 30, color: 'black' }} />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 'bold' }}>Generate Image</Typography>
              <IconButton
                color="primary"
                onClick={handleGenerateImage}
                size="large"
              >
                <ImageIcon sx={{ fontSize: 30 }} />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 'bold' }} >Generate PDF</Typography>
              <IconButton

                onClick={handleGeneratePDF}
                size="large"
              >
                <PictureAsPdfIcon sx={{ fontSize: 30, color: 'red' }} />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 'bold' }}>Generate Word</Typography>
              <IconButton
                color="primary"
                onClick={handleGenerateWord}
                size="large"
              >
                <DescriptionIcon sx={{ fontSize: 30 }} />
              </IconButton>
            </Box>
          </Box>

          {/* IT Advisory Card */}
          <Card ref={cardRef} sx={{ width: 678 }}>

            <Box>
              <Box sx={{ position: 'relative', width: '100%', maxWidth: '678px', alignContent: 'center' }}>
                {/* Image */}
                <Box
                  component="img"
                  src={Head}
                  alt="Header"
                  sx={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />

                <Typography
                  variant="h5"
                  fontWeight="bold"
                  sx={{
                    fontSize: '40px',
                    position: 'absolute',
                    top: '38%',
                    left: '25%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    textShadow: '1px 1px 2px black',
                    zIndex: 1, fontFamily: 'sans-serif'
                  }}
                >
                  IT ADVISORY
                </Typography>
                <Box
                  component="img"
                  src={Logo}
                  alt="Logo"
                  sx={{
                    width: '30%',
                    height: 'auto',
                    display: 'block',
                    position: 'absolute',
                    top: '20%',
                    left: '65%',
                    zIndex: 1,
                  }}
                />

              </Box>
            </Box>

            <CardContent>
              <Box sx={{
                border: '2px solid',
                borderColor: '#002f6c',
                mt: 1,
                mb: 0,
                ml: 2,
                mr: 2,
                textAlign: 'center',
              }}>
                <Grid container spacing={0} sx={{ color: '#1A2D5A' }} >

                  {/* What - Full Row */}
                  <Grid item sx={{ borderBottom: '2px solid', borderColor: '#002f6c', p: 1, width: '100%' }}>
                    <Typography variant="subtitle2" className="title" sx={{ p: 1, fontWeight: "bold", fontFamily: 'sans-serif' }} >What</Typography>
                    <Typography variant="subtitle2" className="content"  sx={{ p: 1, fontWeight: 400, fontFamily: 'sans-serif' }}>{outputText || '-- -- --'}</Typography>
                  </Grid>

                  {/* When & Duration - Side by Side */}
                  <Grid item sx={{ borderRight: '2px solid', borderColor: '#002f6c', p: 1, width: '60%' }}>
                    <Typography variant="body2" className="title" fontWeight="bold" sx={{ p: 1, fontFamily: 'sans-serif' }}>When</Typography>
                    <Typography variant="body2"  className="content" sx={{ p: 1, fontWeight: 400, fontFamily: 'sans-serif' }}>
                      {dateTimes.map((entry, index) => {
                        const startDate = entry.start.date;
                        const startTime = entry.start.time;
                        const endDate = entry.end.date;
                        const endTime = entry.end.time;

                        const allValuesPresent = startDate && startTime && endDate && endTime;

                        if (!allValuesPresent) {
                          return (
                            <Box key={index}>
                              -- -- -- --
                            </Box>
                          );
                        }

                        const isSameDate = startDate === endDate;

                        const formattedStartDate = dayjs(startDate).format('MMMM DD, YYYY');
                        const startDay = dayjs(startDate).format('dddd');
                        const formattedEndDate = dayjs(endDate).format('MMMM DD, YYYY');
                        const endDay = dayjs(endDate).format('dddd');

                        const formattedStartTime = dayjs(`${startDate}T${startTime}`).format('h:mm A');
                        const formattedEndTime = dayjs(`${endDate}T${endTime}`).format('h:mm A');

                        return (
                          <Box key={index}>
                            {isSameDate ? (
                              `${formattedStartDate} (${startDay}) ${formattedStartTime} - ${formattedEndTime}`
                            ) : (
                              <>
                                {formattedStartDate} ({startDay}) {formattedStartTime} - <br />
                                {formattedEndDate} ({endDay}) {formattedEndTime}
                              </>
                            )}
                          </Box>
                        );
                      })}
                    </Typography>
                  </Grid>


                  <Grid item sx={{ p: 1, width: '40%' }}>
                    <Typography variant="body2" className="title" fontWeight="bold" sx={{ p: 1, fontFamily: 'sans-serif' }}>
                      Duration
                    </Typography>
                    <Typography variant="body2"  className="content" sx={{ p: 1, whiteSpace: 'pre-line', fontWeight: 400, fontFamily: 'sans-serif' }}>
                      {durationText && durationText.trim() !== '' ? durationText : '-- -- --'}
                    </Typography>
                  </Grid>

                  {/* Areas Affected - Full Row */}
                  <Grid item sx={{ borderTop: '2px solid', borderColor: '#002f6c', p: 1, width: '100%' }}>
                    <Typography variant="body2" className="title"fontWeight="bold" sx={{ p: 1, fontFamily: 'sans-serif' }}>Areas Affected</Typography>
                    <Typography variant="body2"  className="content" sx={{ textAlign: 'Left', p: 2, fontWeight: 400, fontFamily: 'sans-serif' }}>{areas && areas.trim() !== '' ? areas : '-- -- --'}</Typography>
                  </Grid>

                  {/* Details - Full Row */}
                  <Grid sx={{ borderTop: '2px solid', borderColor: '#002f6c', p: 1, width: '100%' }}>
                    <Typography variant="body2" className="title" fontWeight="bold" sx={{ p: 1, fontFamily: 'sans-serif' }}>Details</Typography>
                    <Typography variant="body2"  className="content" sx={{ whiteSpace: 'pre-wrap', textAlign: 'Left', p: 1, fontWeight: 400, mb: 1, fontFamily: 'sans-serif' }}>{details && details.trim() !== '' ? details : '-- -- --'}</Typography>
                  </Grid>

                </Grid>
              </Box>

            </CardContent>
            <Box
              sx={{
                mt: 2,

                backgroundColor: '#002f6c',
                color: 'white',
                textAlign: 'center',
                width: '100%', // Take full width of parent
                py: 1.5, // Padding for vertical spacing (instead of fixed height)
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', fontFamily: 'Segoe UI', fontWeight: 500 }}>
                Should you have any other concern,<br />
                please call our IT Service Desk at local 2103
              </Typography>
            </Box>

          </Card>
        </Box>
      </Modal>
      <Prompt
        open={promptOpen}
        message={promptMessage}
        severity={promptSeverity}
        onClose={() => setPromptOpen(false)}
      />
    </Box >


  )
}
