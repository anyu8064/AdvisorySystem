import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, List,
  ListItem, ListItemText, Collapse, Box, TextField, InputAdornment, Stack
} from '@mui/material';
import { format } from 'date-fns';
import SearchIcon from '@mui/icons-material/Search';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';


export default function HistoryModal({ open, onClose, historyData = [] }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const sortedHistory = [...historyData].sort((a, b) => new Date(b.date) - new Date(a.date));
  const [searchQuery, setSearchQuery] = useState('');
  const handleItemClick = (index) => {
    setSelectedIndex(selectedIndex === index ? null : index);
  };
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const handleClose = () => {
    setSelectedIndex(null);
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    onClose();
  };
  const filterHistory = (item) => {
    const lowerQuery = searchQuery.toLowerCase();
    const { title = '', fullDetails = {} } = item;

    const fieldsToSearch = [
      title,
      fullDetails.scope,
      fullDetails.issue,
      fullDetails.output,
      fullDetails.status,
      fullDetails.type,
      fullDetails.details,
      fullDetails.areas,
    ].join(' ').toLowerCase();

    const matchQuery = fieldsToSearch.includes(lowerQuery);

    const itemDate = dayjs(item.date); // Make sure item.date is ISO format or a valid date string

    const afterStart = startDate ? itemDate.isAfter(dayjs(startDate).startOf('day').subtract(1, 'second')) : true;
    const beforeEnd = endDate ? itemDate.isBefore(dayjs(endDate).endOf('day').add(1, 'second')) : true;

    return matchQuery && afterStart && beforeEnd;
  };

  const renderDetails = (details) => (
    <Box pl={2} pt={1}>
      {details.scope && <Typography><strong>Scope:</strong> {details.scope}</Typography>}
      {details.issue && <Typography><strong>Issue:</strong> {details.issue}</Typography>}
      {details.output && <Typography><strong>Output:</strong> {details.output}</Typography>}
      {details.type && <Typography><strong>Type:</strong> {details.type}</Typography>}
      {details.status && <Typography><strong>Status:</strong> {details.status}</Typography>}
      {details.unscheduled !== undefined && (
        <Typography><strong>Unscheduled:</strong> {details.unscheduled ? 'Yes' : 'No'}</Typography>
      )}

      {Array.isArray(details.dateTimes) && details.dateTimes.length > 0 && (
        <>
          <Typography><strong>Date & Time:</strong></Typography>
          <ul style={{ paddingLeft: 20 }}>
            {details.dateTimes.map((dt, i) => {
              const start = typeof dt.start === 'string' || dt.start instanceof Date ? new Date(dt.start) : null;
              const end = typeof dt.end === 'string' || dt.end instanceof Date ? new Date(dt.end) : null;

              if (!start || !end || isNaN(start) || isNaN(end)) {
                return <li key={i}>N/A</li>;
              }

              const sameDate = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
              const formatted = sameDate
                ? `${format(start, 'MMMM dd, yyyy hh:mm a')} - ${format(end, 'hh:mm a')}`
                : `${format(start, 'MMMM dd, yyyy hh:mm a')} - ${format(end, 'MMMM dd, yyyy hh:mm a')}`;

              return <li key={i}>{formatted}</li>;
            })}
          </ul>
        </>
      )}
      {details.durationText && (
        <Typography>
          <strong>Duration:</strong>
          <ul>
            {details.durationText.split("\n").map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </Typography>
      )}
      {details.areas && <Typography><strong>Area:</strong> {details.areas}</Typography>}
      {details.details && (
        <>
          <Typography><strong>Details:</strong></Typography>
          <Typography variant="body2" color="text.secondary">
            {details.details.split('\n').map((line, index) => (
              <span key={index}>
                {line}
                <br />
              </span>
            ))}
          </Typography>
        </>
      )}

      {details.imageUrl && (
        <Box mt={2}>
          <Typography><strong>Image File:</strong></Typography>

          {/* View Image Button */}
          <Button
            href={details.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            sx={{ mt: 1, mr: 1 }}
          >
            View Image
          </Button>

          {/* Download Image Button */}
          <Button
            href={details.imageUrl}
            download="it_advisory.png"
            variant="outlined"
            sx={{ mt: 1 }}
          >
            Download Image
          </Button>
        </Box>
      )}

      {details.pdfUrl && (
        <Box mt={2}>
          <Typography><strong>PDF File:</strong></Typography>
          {/* View PDF */}
          <Button
            href={`https://docs.google.com/gview?url=${encodeURIComponent(details.pdfUrl)}&embedded=true`}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
          >
            View PDF
          </Button>

          {/* Download PDF */}
          <Button
            href={details.pdfUrl}
            download="IT_Advisory.pdf"
            variant="outlined"
            sx={{ ml: 1 }}
          >
            Download PDF
          </Button>
        </Box>
      )}

    </Box>
  );
  const filteredHistory = sortedHistory.filter(filterHistory);
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>History</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} mb={2}>
          {/* Search Field */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by title, scope, issue, etc."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          {/* Date Filters */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction="row" spacing={2}>
              <DatePicker
                label="Start Date"
                value={startDate ? dayjs(startDate) : null}
                onChange={(newValue) => setStartDate(newValue)}
                format="MMMM D, YYYY"
                slotProps={{ textField: { fullWidth: true } }}
              />

              <DatePicker
                label="End Date"
                value={endDate ? dayjs(endDate) : null}
                onChange={(newValue) => setEndDate(newValue)}
                format="MMMM D, YYYY"
                minDate={startDate ? dayjs(startDate) : undefined} // This is the key line
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Stack>
          </LocalizationProvider>

        </Stack>

        {/* List or Empty Message */}
        {filteredHistory.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No history found.
          </Typography>
        ) : (
          <List>
            {filteredHistory.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <ListItem
                  button
                  onClick={() => handleItemClick(index)}
                  divider
                  sx={{
                    backgroundColor: selectedIndex === index ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                    '&:hover': {
                      backgroundColor: selectedIndex === index ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
                    },
                  }}
                >
                  <ListItemText
                    primary={item.title || 'Untitled'}
                    secondary={item.date || ''}
                  />
                </ListItem>

                <Collapse in={selectedIndex === index} timeout="auto" unmountOnExit>
                  <Box bgcolor="#f9f9f9" p={2} borderRadius={1} mb={2}>
                    {renderDetails(item.fullDetails || {})}
                  </Box>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
