import type { SxProps, Theme } from "@mui/material/styles";

export function extendSxProps<T extends Theme>(
  base: SxProps<T>,
  ...extras: (SxProps<T> | undefined)[]
): SxProps<T> {
  const toArray = (sx?: SxProps<T>): SxProps<T>[] => {
    if (!sx) return [];
    return Array.isArray(sx)
      ? (sx.filter(Boolean) as SxProps<T>[])
      : [sx];
  };

  const merged: SxProps<T>[] = [
    ...toArray(base),
    ...extras.flatMap(toArray),
  ];

  return merged as SxProps<T>;
}

// Named export already provided above; avoid duplicate export to satisfy bundlers
