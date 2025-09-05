import React, { useEffect, useMemo, useState } from 'react';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import ViewInArSharpIcon from '@mui/icons-material/ViewInArSharp';
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
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';

import MagicBox from '@components/MagicBox';

import { useSettings } from '../../contexts/SettingsContext';

import type { BoxSource } from '@modules/BoxSource';

const drawerWidth = 280;
const drawerCollapsedWidth = 72;

const ToolsListPage: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<BoxSource | null>(null);
  const [magicIn, setMagicIn] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    const next = new URLSearchParams(searchParams);
    next.set('box', source.name);
    setSearchParams(next);
  };

  const clearSelection = () => {
    setSelectedSource(null);
    setInput('');
    const next = new URLSearchParams(searchParams);
    next.delete('box');
    setSearchParams(next);
  };

  // Restore selection from query string on load or when URL changes
  useEffect(() => {
    const toolName = searchParams.get('box');
    if (!toolName) {
      return;
    }
    const fromUrl = availableBoxSources.find((s) => s.name === toolName);
    if (fromUrl && (!selectedSource || selectedSource.name !== fromUrl.name)) {
      setSelectedSource(fromUrl);
      setInput(fromUrl.defaultInput ?? '');
    }
  }, [searchParams, availableBoxSources, selectedSource]);

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
                bgcolor: 'white',
                color: 'primary.main',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.300',
              }}
            >
              <Stack alignItems="center" direction="row" spacing={2}>
                <ViewInArSharpIcon
                  sx={{
                    color: 'primary.main',
                    fontSize: '1.5rem',
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{ fontWeight: 500, fontSize: '1.1rem', color: 'primary.main' }}
                    variant="h6"
                  >
                    {selectedSource.name}
                  </Typography>
                </Box>
                <IconButton
                  onClick={clearSelection}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  ✕
                </IconButton>
              </Stack>
              {selectedSource.description ? (
                <Typography
                  sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}
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
                bgcolor: 'white',
                color: 'primary.main',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.300',
              }}
            >
              <Typography sx={{ fontWeight: 500, mb: 1, color: 'primary.main' }} variant="h5">
                Tools Explorer
              </Typography>
              <Typography sx={{ color: 'text.secondary' }} variant="body2">
                Explore and test individual tools
              </Typography>
            </Paper>

            {/* Mobile Search and Filter */}
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

            {/* Mobile Tools List */}
            {filteredTools.length > 0 ? (
              <Stack spacing={1.5}>
                {filteredTools.map((source) => (
                  <Card
                    key={source.name}
                    elevation={0}
                    onClick={() => handleSourceSelect(source)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      border: '1px solid',
                      borderColor: 'grey.200',
                      '&:hover': {
                        borderColor: 'grey.300',
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
          width: sidebarCollapsed ? drawerCollapsedWidth : drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: sidebarCollapsed ? drawerCollapsedWidth : drawerWidth,
            boxSizing: 'border-box',
            position: 'relative',
            bgcolor: 'grey.50',
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowX: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 1.5 }}>
          {sidebarCollapsed ? (
            <Stack alignItems="center" direction="row" justifyContent="center">
              <Tooltip placement="right" title="Expand sidebar">
                <IconButton aria-label="Expand sidebar" onClick={() => setSidebarCollapsed((v) => !v)} size="small">
                  <ChevronRightIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Stack alignItems="center" direction="row" spacing={1}>
              <Tooltip placement="right" title="Collapse sidebar">
                <IconButton aria-label="Collapse sidebar" onClick={() => setSidebarCollapsed((v) => !v)} size="small">
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>
              <TextField
                fullWidth
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                size="small"
                sx={{ maxWidth: 220 }}
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
            </Stack>
          )}
        </Box>

        <Divider />

        <Box sx={{ overflow: 'auto', flex: 1 }}>
          {filteredTools.length > 0 ? (
            <List sx={{ px: sidebarCollapsed ? 0 : 1 }}>
              {filteredTools.map((source) => (
                <ListItem key={source.name} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleSourceSelect(source)}
                    selected={selectedSource?.name === source.name}
                    sx={{
                      borderRadius: 2,
                      mx: sidebarCollapsed ? 0.5 : 1,
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
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
                    {sidebarCollapsed ? (
                      <ListItemIcon sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          {source.name.charAt(0).toUpperCase()}
                        </Box>
                      </ListItemIcon>
                    ) : (
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
                    )}
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
              sx={{ p: 4, mb: 4, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.300' }}
            >
              <Stack
                alignItems="center"
                direction="row"
                spacing={2}
                sx={{ mb: 2 }}
              >
                <ViewInArSharpIcon
                  sx={{
                    color: 'primary.main',
                    fontSize: '2rem',
                  }}
                />
                <Box>
                  <Typography
                    sx={{ fontWeight: 500, color: 'primary.main' }}
                    variant="h4"
                  >
                    {selectedSource.name}
                  </Typography>
                </Box>
              </Stack>

              {selectedSource.description ? (
                <Typography
                  sx={{ color: 'text.secondary', lineHeight: 1.6 }}
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
