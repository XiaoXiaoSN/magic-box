import { createContext, useContext } from 'react';

// True only inside a catalog preview. `/list` mounts the real box so the
// demonstration cannot drift from the tool, which means a box that acts on
// mount would act for someone who is still reading the shelf. Boxes with a
// side effect at mount — network, worker, permission — read this and stay
// inert until the user opens them for real.
const BoxPreviewContext = createContext(false);

export const BoxPreviewProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  // Deliberately not a settable value: nothing should be able to declare a
  // real box a preview, and `false` is already the default outside this tree.
  <BoxPreviewContext.Provider value={true}>
    {children}
  </BoxPreviewContext.Provider>
);

export const useIsBoxPreview = (): boolean => useContext(BoxPreviewContext);
