import type { SxProps, Theme } from '@mui/material/styles';

function extendSxProps<T extends Theme>(
  base: SxProps<T>,
  extra?: SxProps<T>
): SxProps<T> {
  const toArray = (sx?: SxProps<T>): SxProps<T>[] => {
    if (!sx) return [];
    return Array.isArray(sx)
      ? (sx.filter(Boolean) as SxProps<T>[])
      : [sx];
  };

  const merged: SxProps<T>[] = [...toArray(base), ...toArray(extra)];
  return merged as SxProps<T>;
}

export { extendSxProps };
