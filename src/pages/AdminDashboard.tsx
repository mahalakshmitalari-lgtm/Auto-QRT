import React, { useState, useEffect } from 'react';
import { getUsers, makeAdmin } from '../api';
import { Container, Typography, Box, List, ListItem, ListItemText, TextField, Button } from '@mui/material';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUsers();
        setUsers(response.data);
      } catch (err) {
        setError('Could not fetch users');
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await makeAdmin(email);
      setSuccess(`Successfully made ${email} an admin.`);
      setEmail('');
    } catch (err) {
      setError('Could not make user an admin');
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ marginTop: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, mb: 4 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <Typography color="error">{error}</Typography>}
          {success && <Typography color="success">{success}</Typography>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Make Admin
          </Button>
        </Box>
        <Typography variant="h6" component="h2" gutterBottom>
          Users
        </Typography>
        <List>
          {users.map((user) => (
            <ListItem key={user.uid}>
              <ListItemText
                primary={user.displayName || 'No Name'}
                secondary={`${user.email} - ${user.custom_claims?.role || 'No Role'}`}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Container>
  );
};

export default AdminDashboard;
