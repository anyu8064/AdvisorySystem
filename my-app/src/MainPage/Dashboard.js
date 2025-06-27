import React, { useState, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableRow, Box, TextField, Checkbox, FormControlLabel, Button, Typography,
  Modal, IconButton, Autocomplete, Card, CardContent, Grid, Portal, Tooltip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getAuth } from "firebase/auth";
import Header from '../Header/Header';
import { Add, Remove, Description } from "@mui/icons-material";
import Prompt from '../components/prompt';
import Loading from '../components/Loading';
import { useEffect } from 'react';
import { db } from '../utils/firebase';
import '../style.css';
import { getDocs, doc, getDoc, collection, updateDoc, addDoc, query, where } from "firebase/firestore";
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
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [prompt, setPrompt] = useState({ open: false, message: '', severity: 'warning' });
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
  const [openModal1, setOpenModal1] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [promptSeverity, setPromptSeverity] = useState('warning');
  const [selectedTemplate, setSelectedTemplate] = useState('Advisory');
  const [attachments, setAttachments] = useState([]);
  const [whenDate, setWhenDate] = useState('');
  const [whenText, setWhenText] = useState('');

  const handleSelect = (template) => {
    clear();
    setSelectedTemplate(template);
  };

  const areasRef = useRef(null);
  const detailsRef = useRef(null);

  const applyStyle = (ref, style) => {
    ref.current.focus();
    document.execCommand(style);
  };

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
    // Define formatWhen inline
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
      what: selectedIssue?.name || "--",
      when: formatWhen(),
      duration: durationText || "--",
      areaAffected: areas || "--",
      details: details || "--",
    };

    try {
      const response = await fetch("https://asia-southeast1-mmcadvisorysystem.cloudfunctions.net/getFile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error("Failed to generate document");

      const { downloadUrl } = await response.json();

      // ✅ Open download link in new tab
      window.open(downloadUrl, "_blank");
    } catch (err) {
      console.error("DOCX generation failed:", err);
      alert("Failed to generate document.");
    }
  };
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

      // Generate canvas for image
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: 2,
        removeContainer: true,
        logging: false,
      });

      const imageData = canvas.toDataURL('image/png');

      // Check if imageData is valid
      if (!imageData) {
        throw new Error("Failed to generate image data.");
      }

      const storage = getStorage();
      const imageRef = ref(storage, `formImages/${docRef.id}.png`);

      // Upload image
      await uploadString(imageRef, imageData, 'data_url');

      // Log success of upload
      console.log("Image uploaded successfully:", imageRef.fullPath);

      // Get the download URL for the uploaded image
      const imageUrl = await getDownloadURL(imageRef);

      // Update Firestore document with imageUrl
      await updateDoc(docRef, { imageUrl });

      // Download image
      const link = document.createElement('a');
      link.download = 'IT_Advisory.png';
      link.href = imageData;
      link.click();

      // Now also generate and upload PDF silently (no download)
      {
        // Reuse same cardRef with html2canvas - but for PDF it's better scale 3 for resolution
        const pdfCanvas = await html2canvas(cardRef.current, {
          backgroundColor: '#ffffff',
          useCORS: true,
          scale: 3,
        });

        const pdfImageData = pdfCanvas.toDataURL('image/png');
        const imgWidth = pdfCanvas.width;
        const imgHeight = pdfCanvas.height;
        const pdfWidth = (imgWidth * 72) / 96;
        const pdfHeight = (imgHeight * 72) / 96;
        const pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [pdfWidth, pdfHeight],
        });
        pdf.addImage(pdfImageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const pdfBlob = pdf.output('blob');

        const pdfRef = ref(storage, `formPDFs/${docRef.id}.pdf`);
        await uploadBytes(pdfRef, pdfBlob);

        // Update doc with pdfUrl
        const pdfUrl = await getDownloadURL(pdfRef);
        await updateDoc(docRef, { pdfUrl });
      }

      setPromptMessage("Form and image saved successfully! PDF also uploaded.");
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

      // Wait for reflow
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Fix style issues for rendering
      cardRef.current.style.backgroundColor = '#ffffff';
      cardRef.current.style.overflow = 'visible';
      cardRef.current.style.boxShadow = 'none';

      // Capture as high-res canvas for PDF
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: 3,
      });

      const imageData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdfWidth = (imgWidth * 72) / 96;
      const pdfHeight = (imgHeight * 72) / 96;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');

      const storage = getStorage();
      const pdfRef = ref(storage, `formPDFs/${docRef.id}.pdf`);
      // Upload PDF
      await uploadBytes(pdfRef, pdfBlob);

      // Download PDF
      pdf.save('IT-Advisory.pdf');

      // Update doc with pdfUrl
      const pdfUrl = await getDownloadURL(pdfRef);
      await updateDoc(docRef, { pdfUrl });

      // Now also generate and upload image silently (no download)
      {
        // Generate canvas for image (scale 2 is good)
        const imgCanvas = await html2canvas(cardRef.current, {
          backgroundColor: '#ffffff',
          useCORS: true,
          scale: 2,
          removeContainer: true,
          logging: false,
        });

        const imgData = imgCanvas.toDataURL('image/png');
        const imageRef = ref(storage, `formImages/${docRef.id}.png`);
        await uploadString(imageRef, imgData, 'data_url');

        // Update doc with imageUrl
        const imageUrl = await getDownloadURL(imageRef);
        await updateDoc(docRef, { imageUrl });
      }

      setPromptMessage("Form and PDF saved successfully! Image also uploaded.");
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
      if (cardRef.current) {
        cardRef.current.style.backgroundColor = '#ffffff';
        cardRef.current.style.boxShadow = 'none';
        cardRef.current.style.overflow = 'visible';

        const images = cardRef.current.querySelectorAll('img');
        await Promise.all(
          Array.from(images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
          )
        );

        const attachmentImages = cardRef.current.querySelectorAll('img.attachment-img');
        attachmentImages.forEach((img) => {
          if (img.naturalWidth && img.naturalHeight) {
            const maxHeight = 300;
            const scale = Math.min(1, maxHeight / img.naturalHeight);
            const newWidth = img.naturalWidth * scale;
            const newHeight = img.naturalHeight * scale;

            img.style.width = `${newWidth}px`;
            img.style.height = `${newHeight}px`;
            img.style.objectFit = 'contain'; // Ensure the aspect ratio is maintained
          }
        });
      }

      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setPromptMessage("Failed to copy image.");
          setPromptSeverity("error");
          setPromptOpen(true);
          return;
        }

        const clipboardItem = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([clipboardItem]);

        setPromptMessage("Image copied to clipboard!");
        setPromptSeverity("success");
        setPromptOpen(true);
      }, "image/png");
    } catch (error) {
      console.error("Error copying image to clipboard:", error);
      setPromptMessage("Failed to copy image.");
      setPromptSeverity("error");
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
      // Get current date and time
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0]; // yyyy-mm-dd
      const currentTime = now.toTimeString().slice(0, 5);   // hh:mm

      const updated = [{
        start: { date: currentDate, time: currentTime },
        end: { date: currentDate, time: currentTime }
      }];

      setDateTimes(updated);
      setDurationText("Ongoing");
    } else {
      // Reset to blank date/time and clear duration
      const reset = [{
        start: { date: "", time: "" },
        end: { date: "", time: "" }
      }];

      setDateTimes(reset);
      setDurationText("");
    }
  };

  useEffect(() => {
    console.log('Updated issueOptions:', issueOptions);
  }, [issueOptions]);
  useEffect(() => {
    console.log('Updated status:', optionStatus);
  }, [optionStatus]);

const saveForm = async () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  // Fetch user name
  let userName = "------";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUser.email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      userName = userData.name || "------";
    }
  } catch (err) {
    console.error("Error fetching user name:", err);
  }

  // Safely format dateTimes (skip if incomplete)
  const formattedDateTimes = (dateTimes || [])
    .filter(entry => entry?.start?.date && entry?.start?.time && entry?.end?.date && entry?.end?.time)
    .map(entry => ({
      start: new Date(`${entry.start.date}T${entry.start.time}`),
      end: new Date(`${entry.end.date}T${entry.end.time}`)
    }));

  const fallback = (value, alt = "------") => {
    if (Array.isArray(value)) return value.length ? value : [alt];
    return value !== undefined && value !== null && value !== "" ? value : alt;
  };

  const formData = {
    scope: fallback(selectedScope?.name),
    status: fallback(selectedStatus?.id),
    issue: fallback(selectedIssue?.name),
    output: fallback(outputText || selectedIssue?.name), // outputText preferred if set
    type: fallback(selectedType?.name),
    dateTimes: formattedDateTimes.length > 0 ? formattedDateTimes : "------",
    unscheduled: unscheduled ?? false,
    durationText: fallback(durationText),
    areas: fallback(Array.isArray(areas) ? areas : [areas]),
    details: fallback(details),
    createdAt: new Date(),
    name: userName,
    whenDate: fallback(whenDate),
    whenText: fallback(whenText),
     template: fallback(selectedTemplate),
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

  const handleBlur = (ref, setter) => {
    if (ref.current) {
      setter(ref.current.innerHTML); // not .innerText or .textContent
    }
  };

const clear = () => {
  setSelectedScope(null);
  setAreas('');
  setAttachments([]);
  setDateTimes([{ start: { date: '', time: '' }, end: { date: '', time: '' } }]);
  setDetails('');
  setDurationText('');
  setOutputText('');
  setSelectedIssue(null);
  setSelectedStatus(null);
  setSelectedType(null);
  setUnscheduled(false);
  setIssueOptions([]);
  setIsEdited(false);
  setWhenText('');
  setWhenDate('');
  setAreas('');
  setDetails('');
   setSelectedScope(null);
};

  useEffect(() => {
    if (areasRef.current) {
      areasRef.current.innerHTML = areas;
    }
  }, [areas]);

  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.innerHTML = details;
    }
  }, [details]);

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
        borderRadius: 0,
        overflowY: 'auto',
        height: '100vh',
        mt: 10
      }}>

        <Box>
          {/* Floating Template Buttons */}
          <Tooltip title="Advisory Template" placement="right" >
            <Button
              variant={selectedTemplate === 'Advisory' ? 'outlined' : 'contained'}
              color="primary"
              onClick={() => handleSelect('Advisory')}
              sx={{
                borderColor: "navy",
                position: 'fixed',
                top: 80,
                left: 176,
                borderRadius: 0,
                minWidth: 56,
                minHeight: 56,
                padding: 0,
                zIndex: 1000
              }}
            >
              <DescriptionIcon color="inherit" />
            </Button>
          </Tooltip>

          <Tooltip title="Informational Template" placement="right">
            <Button
              variant={selectedTemplate === 'Informational' ? 'outlined' : 'contained'}
              color="primary"
              onClick={() => handleSelect('Informational')}
              sx={{
                borderColor: "navy",
                position: 'fixed',
                top: 135,
                left: 176,
                borderRadius: 0,
                minWidth: 56,
                minHeight: 56,
                padding: 0,
                zIndex: 1000
              }}
            >
              <DescriptionIcon color="inherit" />
            </Button>
          </Tooltip>

          {/* Conditional Template Rendering */}
          <Box sx={{ ml: 10, mt: 2 }}>
            {selectedTemplate === 'Advisory' && (
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

                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>
                        ATTACHMENT
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Upload Button */}
                        <Button variant="outlined" component="label" sx={{ alignSelf: 'flex-start' }}>
                          Upload File
                          <input
                            type="file"
                            hidden
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files);
                              setAttachments(prev => [...prev, ...files]); // Append new files
                            }}
                          />
                        </Button>

                        {/* File List with Remove */}
                        {attachments?.map((file, index) => (
                          <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {/* Show preview if image */}
                            {file.type.startsWith('image/') && (
                              <img
                                src={URL.createObjectURL(file)}
                                className="attachment-img"
                                alt={`attachment-${index}`}
                                style={{
                                  maxWidth: '100%', // Ensure the image does not exceed the width of its container
                                  maxHeight: '300px', // Set a maximum height
                                  objectFit: 'contain', // Maintain aspect ratio
                                  borderRadius: '6px',
                                  marginBottom: '4px',
                                }}
                              />
                            )}


                            {/* File name + Remove */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                                📎 {file.name}
                              </Typography>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => {
                                  setAttachments(prev => prev.filter((_, i) => i !== index));
                                }}
                              >
                                <Remove />
                              </IconButton>
                            </Box>
                          </Box>
                        ))}
                      </Box>

                    </TableCell>
                  </TableRow>

                  {/* AREAS AFFECTED */}
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>
                        AREAS AFFECTED
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="start" gap={1}>
                        <Box
                          ref={areasRef}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={() => handleBlur(areasRef, setAreas)}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault(); // prevent tab from moving focus

                              // Create 4 spaces or &nbsp; x 4 (Word-style indent)
                              const tabSpaces = '\u00A0\u00A0\u00A0\u00A0'; // 4 non-breaking spaces

                              // Insert at caret position
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const spaceNode = document.createTextNode(tabSpaces);
                                range.insertNode(spaceNode);

                                // Move cursor after inserted spaces
                                range.setStartAfter(spaceNode);
                                range.setEndAfter(spaceNode);
                                selection.removeAllRanges();
                                selection.addRange(range);
                              }
                            }
                          }}
                          sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'sans-serif',
                            border: '1px solid #ccc',
                            borderRadius: 1,
                            padding: 1,
                            width: '100%',
                            minHeight: '200px',
                            overflowY: 'auto'
                          }}
                        />

                        <Box display="flex" flexDirection="column">
                          <IconButton onClick={() => applyStyle(areasRef, 'bold')}>
                            <FormatBoldIcon />
                          </IconButton>
                          <IconButton onClick={() => applyStyle(areasRef, 'italic')}>
                            <FormatItalicIcon />
                          </IconButton>
                          <IconButton onClick={() => applyStyle(areasRef, 'underline')}>
                            <FormatUnderlinedIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>
                        DETAILS
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="start" gap={1}>
                        <Box
                          ref={detailsRef}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={() => handleBlur(detailsRef, setDetails)}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault(); // prevent default focus shift

                              const tabSpaces = '\u00A0\u00A0\u00A0\u00A0'; // 4 non-breaking spaces

                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const spaceNode = document.createTextNode(tabSpaces);
                                range.insertNode(spaceNode);

                                // Move cursor after inserted spaces
                                range.setStartAfter(spaceNode);
                                range.setEndAfter(spaceNode);
                                selection.removeAllRanges();
                                selection.addRange(range);
                              }
                            }
                          }}
                          sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'sans-serif',
                            border: '1px solid #ccc',
                            borderRadius: 1,
                            padding: 1,
                            width: '100%',
                            minHeight: '200px',
                            overflowY: 'auto',
                          }}
                        />

                        <Box display="flex" flexDirection="column">
                          <IconButton onClick={() => applyStyle(detailsRef, 'bold')}>
                            <FormatBoldIcon />
                          </IconButton>
                          <IconButton onClick={() => applyStyle(detailsRef, 'italic')}>
                            <FormatItalicIcon />
                          </IconButton>
                          <IconButton onClick={() => applyStyle(detailsRef, 'underline')}>
                            <FormatUnderlinedIcon />
                          </IconButton>
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
               )}

           {selectedTemplate === 'Informational'  && (
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
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>
                        WHEN
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        label="Description"
                        size="small"
                        sx={{ width: '49%', mr: 1 }}
                        value={whenText}
                        onChange={(e) => setWhenText(e.target.value)}
                      />
                      <TextField
                        type="date"
                        size="small"
                        sx={{ width: '49%' }}
                        value={whenDate}
                        onChange={(e) => setWhenDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>
                        ATTACHMENT
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Upload Button */}
                        <Button variant="outlined" component="label" sx={{ alignSelf: 'flex-start' }}>
                          Upload File
                          <input
                            type="file"
                            hidden
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files);
                              setAttachments(prev => [...prev, ...files]); // Append new files
                            }}
                          />
                        </Button>

                        {/* File List with Remove and Image Preview */}
                        {attachments?.map((file, index) => (
                          <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                                📎 {file.name}
                              </Typography>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => {
                                  setAttachments(prev => prev.filter((_, i) => i !== index));
                                }}
                              >
                                <Remove />
                              </IconButton>
                            </Box>

                            {/* Image Preview (if image file) */}
                            {file.type.startsWith('image/') && (
                              <Box
                                key={index}
                                component="img"
                                src={URL.createObjectURL(file)}
                                alt={`attachment-${index}`}
                                sx={{
                                  maxWidth: 'auto',
                                  height: 'auto',
                                  display: 'block',
                                  objectFit: 'contain',
                                  borderRadius: 1,
                                  mb: 1,
                                }}
                                style={{
                                  maxWidth: '100%',
                                  height: 'auto',
                                  objectFit: 'contain',
                                }}
                              />

                            )}
                          </Box>
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>


                  {/* AREAS AFFECTED */}
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>
                        AREAS AFFECTED
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="start" gap={1}>
                        <Box
                          ref={areasRef}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={() => handleBlur(areasRef, setAreas)}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault(); // prevent tab from moving focus

                              // Create 4 spaces or &nbsp; x 4 (Word-style indent)
                              const tabSpaces = '\u00A0\u00A0\u00A0\u00A0'; // 4 non-breaking spaces

                              // Insert at caret position
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const spaceNode = document.createTextNode(tabSpaces);
                                range.insertNode(spaceNode);

                                // Move cursor after inserted spaces
                                range.setStartAfter(spaceNode);
                                range.setEndAfter(spaceNode);
                                selection.removeAllRanges();
                                selection.addRange(range);
                              }
                            }
                          }}
                          sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'sans-serif',
                            border: '1px solid #ccc',
                            borderRadius: 1,
                            padding: 1,
                            width: '100%',
                            minHeight: '200px',
                            overflowY: 'auto'
                          }}
                        />
                        <Box display="flex" flexDirection="column">
                          <IconButton onClick={() => applyStyle(areasRef, 'bold')}>
                            <FormatBoldIcon />
                          </IconButton>
                          <IconButton onClick={() => applyStyle(areasRef, 'italic')}>
                            <FormatItalicIcon />
                          </IconButton>
                          <IconButton onClick={() => applyStyle(areasRef, 'underline')}>
                            <FormatUnderlinedIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" sx={{ textAlign: 'center' }}>
                        DETAILS
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="start" gap={1}>
                        <Box
                          ref={detailsRef}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={() => handleBlur(detailsRef, setDetails)}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault(); // prevent default focus shift

                              const tabSpaces = '\u00A0\u00A0\u00A0\u00A0'; // 4 non-breaking spaces

                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const spaceNode = document.createTextNode(tabSpaces);
                                range.insertNode(spaceNode);

                                // Move cursor after inserted spaces
                                range.setStartAfter(spaceNode);
                                range.setEndAfter(spaceNode);
                                selection.removeAllRanges();
                                selection.addRange(range);
                              }
                            }
                          }}
                          sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'sans-serif',
                            border: '1px solid #ccc',
                            borderRadius: 1,
                            padding: 1,
                            width: '100%',
                            minHeight: '200px',
                            overflowY: 'auto',
                          }}
                        />

                        <Box display="flex" flexDirection="column">
                          <IconButton onClick={() => applyStyle(detailsRef, 'bold')}>
                            <FormatBoldIcon />
                          </IconButton>
                          <IconButton onClick={() => applyStyle(detailsRef, 'italic')}>
                            <FormatItalicIcon />
                          </IconButton>
                          <IconButton onClick={() => applyStyle(detailsRef, 'underline')}>
                            <FormatUnderlinedIcon />
                          </IconButton>
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
                          setOpenModal1(true);
                        }}
                      >
                        PREVIEW
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </Box>
        </Box>

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
              <IconButton disabled
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
                    <Typography variant="subtitle2" className="title" sx={{ p: 1 }} >What</Typography>
                    <Typography variant="subtitle2" className="content" sx={{ p: 1 }}>{outputText || '-- -- --'}</Typography>
                  </Grid>

                  {/* When & Duration - Side by Side */}
                  <Grid item sx={{ borderRight: '2px solid', borderColor: '#002f6c', p: 1, width: '60%' }}>
                    <Typography variant="body2" className="title" sx={{ p: 1, }}>When</Typography>
                    <Typography variant="subtitle2" className="content" sx={{ p: 1 }}>
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
                    <Typography variant="body2" className="title" sx={{ p: 1 }}>
                      Duration
                    </Typography>
                    <Typography variant="subtitle2" className="content" sx={{ p: 1, whiteSpace: 'pre-line' }}>
                      {durationText && durationText.trim() !== '' ? durationText : '-- -- --'}
                    </Typography>
                  </Grid>

                  {/* Areas Affected - Full Row */}
                  <Grid item sx={{ borderTop: '2px solid', borderColor: '#002f6c', p: 1, width: '100%' }}>
                    <Typography variant="body2" className="title" sx={{ p: 1 }}>Areas Affected</Typography>
                    <Typography
                      variant="subtitle2"
                      className="content"
                      sx={{ textAlign: 'Left', p: 2 }}
                      dangerouslySetInnerHTML={{ __html: areas && areas.trim() !== '' ? areas : '-- -- --' }}
                    />
                  </Grid>

                  {/* Details - Full Row */}
                  <Grid sx={{ borderTop: '2px solid', borderColor: '#002f6c', p: 1, width: '100%' }}>
                    <Typography variant="body2" className="title" sx={{ p: 1 }}>Details</Typography>
                    <Typography
                      variant="subtitle2"
                      className="content"
                      sx={{ whiteSpace: 'pre-wrap', textAlign: 'Left', p: 1, mb: 1 }}
                      dangerouslySetInnerHTML={{ __html: details && details.trim() !== '' ? details : '-- -- --' }}
                    />
                  </Grid>
                  {attachments?.length > 0 && (
                    <Grid item sx={{ p: 1, width: '100%' }}>
                      {attachments.map((file, index) =>
                        file.type.startsWith('image/') ? (
                          <Box
                            key={index}
                            component="img"
                            src={URL.createObjectURL(file)}
                            alt={`attachment-${index}`}
                            sx={{
                              width: 'auto',
                              maxHeight: 300,
                              objectFit: 'contain',
                              borderRadius: 1,
                              mb: 1,
                            }}
                          />
                        ) : (
                          <Typography key={index} variant="body2" sx={{ p: 1 }}>
                            📎 {file.name}
                          </Typography>
                        )
                      )}
                    </Grid>
                  )}
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
      <Modal open={openModal1} onClose={() => setOpenModal1(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: 800,
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
              <IconButton disabled
                color="primary"
                onClick={handleGenerateWord}
                size="large"
              >
                <DescriptionIcon sx={{ fontSize: 30 }} />
              </IconButton>
            </Box>
          </Box>

          {/* IT Advisory Card */}
          <Card ref={cardRef} sx={{ width: 800 }}>

            <Box >
              <Box sx={{ position: 'relative', width: '100%', maxWidth: '800px', alignContent: 'center', }}>
                {/* Image */}
                <Box
                  sx={{
                    padding: 1,
                    width: '100%',
                    height: '65px', // You can adjust height as needed
                    backgroundColor: '#1976d2', // Light blue
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />

                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '35px',
                    position: 'absolute',
                    top: '38%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    zIndex: 1
                  }}
                >
                  IT Advisory
                </Typography>


              </Box>
            </Box>

            <CardContent>
              <Box sx={{
                border: '2px solid',
                borderColor: 'black',
                mt: 1,
                mb: 0,
                ml: 2,
                mr: 2,
                textAlign: 'center',
              }}>
                <Grid container spacing={0} sx={{ color: 'black' }} >

                  {/* What - Full Row */}
                  <Grid item sx={{ borderBottom: '2px solid', borderColor: 'black', p: 1, width: '100%', display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle2" className="title" sx={{ fontWeight: 'bold', mr: 1, color: '#1976d2' }}>
                      What:
                    </Typography>
                    <Typography variant="subtitle2" className="content">
                      {outputText || '-- -- --'}
                    </Typography>
                  </Grid>

                  <Grid item sx={{ borderBottom: '2px solid', borderColor: 'black', p: 1, width: '100%', display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle2" className="title" sx={{ fontWeight: 'bold', mr: 1, color: '#1976d2' }}>
                      When:
                    </Typography>
                    <Typography variant="subtitle2" className="content">
                      {whenText && whenDate
                        ? `${whenText} (${new Date(whenDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })})`
                        : '-- -- --'}
                    </Typography>
                  </Grid>

                  {/* Areas Affected - Full Row */}
                  <Grid
                    item
                    sx={{
                  
                      p: 1,
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      className="title"
                      sx={{ fontWeight: 'bold', color: '#1976d2' }}
                    >
                      Areas Affected:
                    </Typography>

                    <Typography

                      variant="subtitle2"
                      className="content"
                      sx={{ color: 'black', mt: 0.5, textAlign: 'Left' }}
                      dangerouslySetInnerHTML={{
                        __html: areas && areas.trim() !== '' ? areas : '-- -- --'
                      }}
                    />
                  </Grid>
                  {/* Details - Full Row */}
                  <Grid sx={{ borderTop: '2px solid', borderColor: 'black', p: 1, width: '100%' }}>
                   
                    <Typography
                      variant="subtitle2"
                      className="content"
                      sx={{ whiteSpace: 'pre-wrap', textAlign: 'Left', p: 1, mb: 1 }}
                      dangerouslySetInnerHTML={{ __html: details && details.trim() !== '' ? details : '-- -- --' }}
                    />
                  </Grid>
                  {attachments?.length > 0 && (
                    <Grid item sx={{ p: 1, width: '100%' }}>
                      {attachments.map((file, index) =>
                        file.type.startsWith('image/') ? (
                          <Box
                            key={index}
                            component="img"
                            src={URL.createObjectURL(file)}
                            alt={`attachment-${index}`}
                            sx={{
                              width: 'auto',
                              maxHeight: 300,
                              objectFit: 'contain',
                              borderRadius: 1,
                              mb: 1,
                            }}
                          />
                        ) : (
                          <Typography key={index} variant="body2" sx={{ p: 1 }}>
                            📎 {file.name}
                          </Typography>
                        )
                      )}
                    </Grid>
                  )}
                </Grid>
              </Box>

            </CardContent>
            <Box
              sx={{
                mt: 2,

                backgroundColor: '#1976d2',
                color: 'white',
                textAlign: 'center',
                width: '100%', // Take full width of parent
                height: '0',

                py: 2, // Padding for vertical spacing (instead of fixed height)
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', fontFamily: 'Segoe UI', fontWeight: 500 }}>
                Should you have any other concern, please call our IT Service Desk at local 2103
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
