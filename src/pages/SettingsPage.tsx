import { useEffect, useState } from 'react';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useSettings } from '../contexts/SettingsContext';
import { boxSources } from '../modules/boxSources';

import type { DragEndEvent } from '@dnd-kit/core';

import type { BoxSetting, Settings } from '../contexts/SettingsContext';

function groupByPriority(boxes: BoxSetting[]): Record<number, BoxSetting[]> {
  const groups: Record<number, BoxSetting[]> = {};
  boxes.forEach((box) => {
    if (!groups[box.priority]) groups[box.priority] = [];
    groups[box.priority].push(box);
  });
  return groups;
}

interface SortableBoxRowProps {
  box: BoxSetting;
  idx: number;
  onToggle: (id: string) => void;
  onPriorityChange: (id: string, value: string) => void;
}

const SortableBoxRow = ({
  box,
  idx,
  onToggle,
  onPriorityChange,
}: SortableBoxRowProps) => {
  const theme = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: box.id });

  const boxSource = boxSources.find((bs) => bs.name === box.id);

  return (
    <Card
      ref={setNodeRef}
      elevation={0}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'none',
        opacity: isDragging ? 0.7 : 1,
        mb: { xs: 1, sm: 1.5 },
        background: box.enabled
          ? 'background.paper'
          : alpha(theme.palette.action.disabled, 0.1),
        border: box.enabled ? '1px solid' : '1px dashed',
        borderColor: box.enabled ? 'divider' : 'action.disabled',
        cursor: isDragging ? 'grabbing' : 'default',
        '&:hover': {
          borderColor: 'primary.light',
        },
      }}
      {...attributes}
    >
      <CardContent
        sx={{
          p: { xs: 1.5, sm: 2 },
          '&:last-child': { pb: { xs: 1.5, sm: 2 } },
        }}
      >
        <Stack alignItems="center" direction="row" spacing={{ xs: 1.5, sm: 2 }}>
          <Box
            sx={{
              minWidth: { xs: 28, sm: 32 },
              height: { xs: 28, sm: 32 },
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              fontWeight: 600,
            }}
          >
            {idx + 1}
          </Box>

          <IconButton
            aria-label={`Drag to reorder ${box.id} tool`}
            size="small"
            {...listeners}
            sx={{
              cursor: 'grab',
              color: 'text.secondary',
              p: { xs: 0.5, sm: 1 },
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              },
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <DragIndicatorIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />
          </IconButton>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 600,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {box.id}
            </Typography>
            {boxSource?.description ? (
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  display: { xs: 'none', sm: 'block' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {boxSource.description}
              </Typography>
            ) : null}
          </Box>

          <Stack
            alignItems="center"
            direction="row"
            spacing={{ xs: 1, sm: 1.5 }}
          >
            <IconButton
              aria-label={box.enabled ? `Disable ${box.id} tool` : `Enable ${box.id} tool`}
              onClick={() => onToggle(box.id)}
              size="small"
              sx={{
                color: box.enabled ? 'success.main' : 'action.disabled',
                p: { xs: 0.5, sm: 1 },
                '&:hover': {
                  bgcolor: alpha(
                    box.enabled
                       ? theme.palette.success.main
                      : theme.palette.action.active,
                    0.1
                  ),
                },
              }}
            >
              {box.enabled ? (
                <VisibilityIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              ) : (
                <VisibilityOffIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              )}
            </IconButton>

            <TextField
              aria-label={`Set priority for ${box.id} tool (0-99, higher is better)`}
              label="Priority"
              onChange={(e) => onPriorityChange(box.id, e.target.value)}
              size="small"
              sx={{ width: { xs: 70, sm: 80 } }}
              type="number"
              value={box.priority}
              variant="outlined"
              slotProps={{
                input: {
                  inputProps: { min: 0, max: 99 },
                  sx: { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
                },
                inputLabel: {
                  sx: { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
                },
              }}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

const SettingsPage: React.FC = () => {
  const { settings, updateSettings, validatePriority } = useSettings();

  // Create default settings for reset functionality
  const defaultSettings: Settings = {
    boxes: boxSources.reduce<Record<string, BoxSetting>>((acc, box, idx) => {
      acc[box.name] = {
        id: box.name,
        enabled: true,
        priority: box.priority ?? 10,
        secondaryOrder: idx,
      };
      return acc;
    }, {}),
  };
  const [boxes, setBoxes] = useState<BoxSetting[]>([]);

  useEffect(() => {
    const boxArray: BoxSetting[] = Object.values(settings.boxes);
    setBoxes(
      boxArray.sort((a, b) =>
        a.priority !== b.priority
          ? b.priority - a.priority
          : a.secondaryOrder - b.secondaryOrder
      )
    );
  }, [settings]);

  // Reset to default
  const handleReset = () => {
    updateSettings(defaultSettings);
  };

  // Toggle box enabled state
  const handleToggle = (id: string) => {
    const newSettings: Settings = { ...settings, boxes: { ...settings.boxes } };
    newSettings.boxes[id] = {
      ...newSettings.boxes[id],
      enabled: !newSettings.boxes[id].enabled,
    };
    updateSettings(newSettings);
  };

  // Priority number input
  const handlePriorityChange = (id: string, value: string) => {
    const num = validatePriority(value);

    let updated: BoxSetting[] = boxes.map((box) =>
      box.id === id ? { ...box, priority: num } : box
    );

    // Move to the new group and place at the end of that group
    updated = updated.map((box, _, arr) => {
      if (box.id === id) {
        const samePriority = arr.filter(
          (box) => box.priority === num && box.id !== id
        );
        return { ...box, secondaryOrder: samePriority.length };
      }
      return box;
    });
    // Re-index secondaryOrder
    const grouped = groupByPriority(updated);
    Object.values(grouped).forEach((group) => {
      group
        .sort((a, b) => a.secondaryOrder - b.secondaryOrder)
        .forEach((box, idx) => {
          box.secondaryOrder = idx;
        });
    });
    updated = Object.values(grouped).flat();
    setBoxes(
      updated.sort((a, b) =>
        a.priority !== b.priority
          ? b.priority - a.priority
          : a.secondaryOrder - b.secondaryOrder
      )
    );
    // Update settings
    const newSettings: Settings = { ...settings, boxes: { ...settings.boxes } };
    updated.forEach((box) => {
      newSettings.boxes[box.id] = {
        ...newSettings.boxes[box.id],
        priority: box.priority,
        secondaryOrder: box.secondaryOrder,
        enabled: box.enabled,
      };
    });
    updateSettings(newSettings);
  };

  // dnd-kit sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // Drag-and-drop sorting
  const handleDragEnd = (event: DragEndEvent, priority: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Only allow dragging within the same group
    const group = boxes.filter((b) => b.priority === priority);
    const oldIdx = group.findIndex((b) => b.id === active.id);
    const newIdx = group.findIndex((b) => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const newGroup = arrayMove(group, oldIdx, newIdx).map((box, idx) => ({
      ...box,
      secondaryOrder: idx,
    }));
    // Merge back into boxes
    const rest = boxes.filter((b) => b.priority !== priority);
    const updated: BoxSetting[] = [...rest, ...newGroup].sort((a, b) =>
      a.priority !== b.priority
        ? b.priority - a.priority
        : a.secondaryOrder - b.secondaryOrder
    );
    setBoxes(updated);
    // Update settings
    const newSettings: Settings = { ...settings, boxes: { ...settings.boxes } };
    updated.forEach((box) => {
      newSettings.boxes[box.id] = {
        ...newSettings.boxes[box.id],
        priority: box.priority,
        secondaryOrder: box.secondaryOrder,
        enabled: box.enabled,
      };
    });
    updateSettings(newSettings);
  };

  // group by priority
  const grouped = groupByPriority(boxes);
  const sortedPriorities = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: { xs: 2, sm: 3 },
          bgcolor: 'white',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.300',
        }}
      >
        <Stack
          alignItems="flex-start"
          direction="row"
          spacing={2}
        >
          <Stack alignItems="center" direction="row" spacing={1.5} sx={{ flex: 1 }}>
            <SettingsIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 500,
                  mb: 1,
                  color: 'primary.main',
                }}
              >
                Settings Page
              </Typography>
              <Typography
                sx={{ color: 'text.secondary' }}
                variant="body2"
              >
                Customize priority and visibility
              </Typography>
            </Box>
          </Stack>

          {/* Mobile: Icon only */}
          <IconButton
            onClick={handleReset}
            size="small"
            sx={{
              display: { xs: 'flex', sm: 'none' },
              color: 'primary.main',
              border: '1px solid',
              borderColor: 'primary.main',
              borderRadius: 1,
            }}
          >
            <RefreshIcon sx={{ fontSize: '1.25rem' }} />
          </IconButton>

          {/* Desktop: Button with text */}
          <Button
            onClick={handleReset}
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: '0.875rem' }} />}
            variant="outlined"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              color: 'primary.main',
              borderColor: 'primary.main',
              fontSize: '0.875rem',
              px: 2,
              py: 1,
              '&:hover': {
                borderColor: 'primary.dark',
                bgcolor: 'rgba(25, 118, 210, 0.04)',
              },
            }}
          >
            Reset
          </Button>
        </Stack>

      </Paper>

      {/* Priority Groups */}
      {sortedPriorities.map((priority) => {
        const groupSorted = grouped[priority].sort(
          (a, b) => a.secondaryOrder - b.secondaryOrder
        );
        const enabledCount = groupSorted.filter((box) => box.enabled).length;

        return (
          <Paper
            key={priority}
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: { xs: 2, sm: 3 },
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1.5, sm: 2 }}
              sx={{ mb: { xs: 2, sm: 3 } }}
            >
              <Stack
                alignItems="center"
                direction="row"
                spacing={1.5}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                <Chip
                  color="primary"
                  label={`Priority ${priority}`}
                  size="small"
                  variant="filled"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    height: { xs: 24, sm: 32 },
                  }}
                />
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  variant="body2"
                >
                  {enabledCount}/{groupSorted.length} tools enabled
                </Typography>
              </Stack>

              <Box sx={{ flex: 1 }} />

            </Stack>

            <Divider sx={{ mb: 2 }} />

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, priority)}
              sensors={sensors}
            >
              <SortableContext
                items={groupSorted.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {groupSorted.map((box, idx) => (
                  <SortableBoxRow
                    key={`${box.id}-${idx}`}
                    box={box}
                    idx={idx}
                    onPriorityChange={handlePriorityChange}
                    onToggle={handleToggle}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </Paper>
        );
      })}
    </Container>
  );
};

export default SettingsPage;
