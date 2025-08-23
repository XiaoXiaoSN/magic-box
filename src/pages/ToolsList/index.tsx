import React, { useEffect, useMemo, useState } from 'react';

import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import MagicBox from '@components/MagicBox';
import { boxSources } from '@modules/boxSources';

import { useSettings } from '../../contexts/SettingsContext';

import type { BoxSource } from '@modules/BoxSource';

const drawerWidth = 280;

const ToolsListPage: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<BoxSource | null>(null);
  const [magicIn, setMagicIn] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getFilteredAndSortedBoxSources } = useSettings();

  // Get enabled and sorted box sources from settings
  const availableBoxSources = useMemo(() => {
    return getFilteredAndSortedBoxSources();
  }, [getFilteredAndSortedBoxSources]);

  // Filter tools based on search
  const filteredTools = useMemo(() => {
    if (!searchQuery) {
      return availableBoxSources;
    }

    return availableBoxSources.filter(
      (source) =>
        source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableBoxSources, searchQuery]);

  useEffect(() => {
    const timeoutID = setTimeout(() => setMagicIn(input), 500);
    return () => {
      clearTimeout(timeoutID);
    };
  }, [input]);

  const handleSourceSelect = (source: BoxSource) => {
    setSelectedSource(source);
    setInput(source.defaultInput ?? '');
  };

  if (isMobile) {
    return (
      <Container maxWidth="lg" sx={{ py: 2, px: 2 }}>
        {selectedSource ? (
          // Mobile Tool Detail View
          <React.Fragment>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 2,
              }}
            >
              <Stack alignItems="center" direction="row" spacing={2}>
                <Box
                  sx={{
                    bgcolor: 'primary.dark',
                    color: 'primary.contrastText',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedSource.name.charAt(0).toUpperCase()}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{ fontWeight: 700, fontSize: '1.1rem' }}
                    variant="h6"
                  >
                    {selectedSource.name}
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => setSelectedSource(null)}
                  size="small"
                  sx={{ color: 'primary.contrastText' }}
                >
                  ❌
                </IconButton>
              </Stack>
              {selectedSource.description ? (
                <Typography
                  sx={{ mt: 1, opacity: 0.9, fontSize: '0.875rem' }}
                  variant="body2"
                >
                  {selectedSource.description}
                </Typography>
              ) : null}
            </Paper>

            <Stack spacing={2}>
              {/* Mobile Input */}
              <Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: 'primary.contrastText',
                      color: 'primary.main',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                    }}
                  >
                    📝
                  </Box>
                  <Typography
                    sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                    variant="body1"
                  >
                    Input
                  </Typography>
                </Paper>
                <Paper
                  elevation={1}
                  sx={{
                    borderRadius: '0 0 8px 8px',
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    borderTop: 'none',
                  }}
                >
                  <TextField
                    fullWidth
                    multiline
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter your input here..."
                    rows={4}
                    value={input}
                    variant="filled"
                    sx={{
                      '& .MuiFilledInput-root': {
                        padding: '16px',
                        backgroundColor: 'white',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        border: 'none',
                        borderRadius: 0,
                        '&:before': { display: 'none' },
                        '&:after': { display: 'none' },
                        '&:hover': { backgroundColor: 'white' },
                        '&.Mui-focused': { backgroundColor: 'white' },
                      },
                      '& .MuiFilledInput-input': {
                        padding: '.25rem',
                      },
                    }}
                  />
                </Paper>
              </Box>

              {/* Mobile Output */}
              <Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: 'success.contrastText',
                      color: 'success.main',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                    }}
                  >
                    ✨
                  </Box>
                  <Typography
                    sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                    variant="body1"
                  >
                    Output
                  </Typography>
                </Paper>
                <Paper
                  elevation={1}
                  sx={{
                    borderRadius: '0 0 8px 8px',
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: 'success.main',
                    borderTop: 'none',
                    minHeight: '180px',
                    bgcolor: 'white',
                  }}
                >
                  <Box sx={{ p: 2, minHeight: '160px', overflow: 'auto' }}>
                    <MagicBox input={magicIn} sources={[selectedSource]} />
                  </Box>
                </Paper>
              </Box>
            </Stack>
          </React.Fragment>
        ) : (
          // Mobile Tools List View
          <React.Fragment>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 2,
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 1 }} variant="h5">
                Tools Explorer
              </Typography>
              <Typography sx={{ opacity: 0.9 }} variant="body2">
                Explore and test individual tools
              </Typography>
            </Paper>

            {/* Mobile Search and Filter */}
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ pb: 2 }}>
                <TextField
                  fullWidth
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools..."
                  size="small"
                  sx={{ mb: 2 }}
                  value={searchQuery}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" sx={{ fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </CardContent>
            </Card>

            {/* Mobile Tools List */}
            {filteredTools.length > 0 ? (
              <Stack spacing={1.5}>
                {filteredTools.map((source) => (
                  <Card
                    key={source.name}
                    onClick={() => handleSourceSelect(source)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: theme.shadows[3],
                      },
                      '&:active': {
                        transform: 'translateY(0px)',
                      },
                    }}
                  >
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Stack alignItems="center" direction="row" spacing={2}>
                        <Box
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {source.name.charAt(0).toUpperCase()}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              mb: 0.5,
                              fontSize: '0.95rem',
                            }}
                          >
                            {source.name}
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="body2"
                            sx={{
                              fontSize: '0.8rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: 1.3,
                            }}
                          >
                            {source.description || 'No description available'}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No tools found matching your search criteria.
              </Alert>
            )}
          </React.Fragment>
        )}
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 65px - 1rem)' }}>
      {/* Enhanced Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            position: 'relative',
            bgcolor: 'grey.50',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Search */}
          <TextField
            fullWidth
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools..."
            size="small"
            value={searchQuery}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" sx={{ fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <Divider />

        <Box sx={{ overflow: 'auto', flex: 1 }}>
          {filteredTools.length > 0 ? (
            <List sx={{ px: 1 }}>
              {filteredTools.map((source) => (
                <ListItem key={source.name} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleSourceSelect(source)}
                    selected={selectedSource?.name === source.name}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      },
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight:
                              selectedSource?.name === source.name ? 600 : 400,
                          }}
                        >
                          {source.name}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                No tools found
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Enhanced Main Content */}
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', overflow: 'auto' }}
      >
        {selectedSource ? (
          <Container maxWidth="xl" sx={{ py: 4, px: 4 }}>
            {/* Tool Header */}
            <Paper
              elevation={0}
              sx={{ p: 4, mb: 4, bgcolor: 'primary.main', borderRadius: 3 }}
            >
              <Stack
                alignItems="center"
                direction="row"
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Box
                  sx={{
                    bgcolor: 'primary.dark',
                    color: 'primary.contrastText',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedSource.name.charAt(0).toUpperCase()}
                </Box>
                <Box>
                  <Typography
                    sx={{ fontWeight: 700, color: 'primary.contrastText' }}
                    variant="h4"
                  >
                    {selectedSource.name}
                  </Typography>
                </Box>
              </Stack>

              {selectedSource.description ? (
                <Typography
                  sx={{ color: 'primary.contrastText', lineHeight: 1.6 }}
                  variant="body1"
                >
                  {selectedSource.description}
                </Typography>
              ) : null}
            </Paper>

            {/* Input/Output Section */}
            <Grid container spacing={4}>
              <Grid size={6}>
                <Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: '12px 12px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: 'primary.contrastText',
                        color: 'primary.main',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      📝
                    </Box>
                    <Typography
                      sx={{ fontWeight: 600, fontSize: '1rem' }}
                      variant="h6"
                    >
                      Input
                    </Typography>
                  </Paper>
                  <Paper
                    elevation={1}
                    sx={{
                      borderRadius: '0 0 12px 12px',
                      overflow: 'hidden',
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderTop: 'none',
                    }}
                  >
                    <TextField
                      fullWidth
                      multiline
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Enter your input here..."
                      rows={12}
                      value={input}
                      variant="filled"
                      sx={{
                        '& .MuiFilledInput-root': {
                          padding: '16px',
                          backgroundColor: 'white',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                          border: 'none',
                          borderRadius: 0,
                          '&:before': {
                            display: 'none',
                          },
                          '&:after': {
                            display: 'none',
                          },
                          '&:hover': {
                            backgroundColor: 'white',
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'white',
                          },
                        },
                        '& .MuiFilledInput-input': {
                          padding: '.5rem',
                        },
                      }}
                    />
                  </Paper>
                </Box>
              </Grid>

              <Grid size={6}>
                <Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'success.main',
                      color: 'success.contrastText',
                      borderRadius: '12px 12px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: 'success.contrastText',
                        color: 'success.main',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      ✨
                    </Box>
                    <Typography
                      sx={{ fontWeight: 600, fontSize: '1rem' }}
                      variant="h6"
                    >
                      Output
                    </Typography>
                  </Paper>
                  <Paper
                    elevation={1}
                    sx={{
                      borderRadius: '0 0 12px 12px',
                      overflow: 'hidden',
                      border: '2px solid',
                      borderColor: 'success.main',
                      borderTop: 'none',
                      minHeight: '350px',
                      bgcolor: 'white',
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        minHeight: '330px',
                        overflow: 'auto',
                        '&::-webkit-scrollbar': {
                          width: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: theme.palette.action.disabled,
                          borderRadius: '3px',
                        },
                      }}
                    >
                      <MagicBox input={magicIn} sources={[selectedSource]} />
                    </Box>
                  </Paper>
                </Box>
              </Grid>
            </Grid>
          </Container>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              p: 4,
            }}
          >
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                fontSize: '2rem',
              }}
            >
              🛠️
            </Box>
            <Typography
              sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}
              variant="h4"
            >
              Welcome to Tools Explorer
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ maxWidth: 400, lineHeight: 1.6 }}
              variant="body1"
            >
              Select a tool from the sidebar to start exploring and testing
              different utilities. Use the search to find exactly what you need.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ToolsListPage;
