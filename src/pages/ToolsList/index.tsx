import React, { useEffect, useState } from 'react';

import {
  Box,
  Divider,
  Drawer,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';

import MagicBox from '@components/MagicBox';
import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from '@modules/boxSources/Base64BoxSource';
import CronExpressionBoxSource from '@modules/boxSources/CronExpressionBoxSource';
import DateCalculateBoxSource from '@modules/boxSources/DateCalculateBoxSource';
import GenerateQRCodeBoxSource from '@modules/boxSources/GenerateQRCodeBoxSource';
import JWTBoxSource from '@modules/boxSources/JWTBoxSource';
import K8sSecretBoxSource from '@modules/boxSources/K8sSecretBoxSource';
import MathExpressionBoxSource from '@modules/boxSources/MathExpressionBoxSource';
import MyIPBoxSource from '@modules/boxSources/MyIPBoxSource';
import NowBoxSource from '@modules/boxSources/NowBoxSource';
import PrettyJSONBoxSource from '@modules/boxSources/PrettyJSONBoxSource';
import RandomIntegerBoxSource from '@modules/boxSources/RandomIntegerBoxSource';
import ReadableBytesBoxSource from '@modules/boxSources/ReadableBytesBoxSource';
import ShortenURLBoxSource from '@modules/boxSources/ShortenURLBoxSource';
import TimeFormatBoxSource from '@modules/boxSources/TimeFormatBoxSource';
import TimestampBoxSource from '@modules/boxSources/TimestampBoxSource';
import URLDecodeBoxSource from '@modules/boxSources/URLDecodeBoxSource';
import UuidBoxSource from '@modules/boxSources/UuidBoxSource';
import WordCountBoxSource from '@modules/boxSources/WordCountBoxSource';

import type { BoxSource } from '@modules/BoxSource';

const drawerWidth = 240;

const boxSources: BoxSource[] = [
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
  CronExpressionBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PrettyJSONBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  TimestampBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  WordCountBoxSource,
];

const ToolsListPage: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<BoxSource | null>(null);
  const [magicIn, setMagicIn] = useState('');

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

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 65px - 1rem)' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            position: 'relative',
          },
        }}
      >
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {boxSources.map((source) => (
              <ListItem key={source.name} disablePadding>
                <ListItemButton onClick={() => handleSourceSelect(source)}>
                  <ListItemText primary={source.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        {selectedSource ? (
          <div>
            <Typography gutterBottom component="h1" variant="h4">
              { selectedSource.name }
            </Typography>
            <Typography color="text.secondary" variant="body1">
              { selectedSource.description }
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid size={{ md: 6, xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter input here..."
                  rows={10}
                  value={input}
                  variant="outlined"
                />
              </Grid>
              <Grid
                size={{ md: 6, xs: 12 }}
                sx={{
                  background: '#f5f5f5',
                  minHeight: '260px',
                  overflow: 'scroll',
                  padding: '1rem',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {selectedSource ? (
                  <MagicBox input={magicIn} sources={[selectedSource]} />
                ) : null}
              </Grid>
            </Grid>
          </div>
        ) : (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="h5">
              Select a tool from the sidebar to get started
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ToolsListPage;
