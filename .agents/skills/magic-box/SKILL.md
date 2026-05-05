```markdown
# magic-box Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill covers the core development patterns and conventions used in the `magic-box` repository, a React application written in TypeScript. It documents coding standards, common workflows for feature development and bugfixing, and provides guidance on testing and command usage for contributors and maintainers.

## Coding Conventions

### File Naming
- **Component files** use **PascalCase**:
  - Example: `UserProfile.tsx`, `MagicBoxHeader.tsx`
- **Test files** follow the pattern: `ComponentName.test.tsx`

### Import Style
- **Relative imports** are preferred:
  ```typescript
  import UserProfile from '../UserProfile';
  import styles from './MagicBoxHeader.module.css';
  ```

### Export Style
- **Mixed**: Both default and named exports are used.
  ```typescript
  // Default export
  export default MagicBoxHeader;

  // Named export
  export const MAGIC_BOX_CONSTANT = '...';
  ```

### Commit Patterns
- Commit messages often use prefixes like `ci` and `chore`.
- Average commit message length: ~32 characters.

## Workflows

### Feature Development: UI Component Update
**Trigger:** When adding a new feature or updating an existing UI component in the Magic Box app  
**Command:** `/feature-ui-update`

1. **Modify or add component files** in `src/components/`
   - Example: Create `MagicButton.tsx` or update `UserProfile.tsx`
2. **Update or add corresponding test files**
   - Example: `MagicButton.test.tsx`
3. **Update or add styles**
   - Edit `src/global/styles.css` or create component-specific styles
4. **Update related context or module files** if needed
   - Example: `src/contexts/UserContext.tsx`, `src/modules/featureModule.ts`
5. **Optionally update UI assets** in `public/`
   - Example: Add `public/icons/magic.svg`
6. **Optionally update documentation**
   - Example: Edit `DEFERRED.md`

**Example: Adding a New Component**
```typescript
// src/components/MagicButton.tsx
import React from 'react';

interface MagicButtonProps {
  onClick: () => void;
  label: string;
}

const MagicButton: React.FC<MagicButtonProps> = ({ onClick, label }) => (
  <button onClick={onClick} className="magic-btn">
    {label}
  </button>
);

export default MagicButton;
```

```typescript
// src/components/MagicButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import MagicButton from './MagicButton';

test('calls onClick when clicked', () => {
  const handleClick = jest.fn();
  render(<MagicButton onClick={handleClick} label="Click me" />);
  fireEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalled();
});
```

---

### Bugfix: UI or Style
**Trigger:** When fixing a UI bug or adjusting layout/styling in the app  
**Command:** `/fix-ui-bug`

1. **Identify the affected component or page**
2. **Edit the relevant `.tsx` file(s)** in `src/components/` or `src/pages/`
   - Example: Fix a typo or logic error in `UserProfile.tsx`
3. **Update `src/global/styles.css`** if the fix involves CSS
4. **Test the fix locally** to ensure the issue is resolved

**Example: Fixing a Button Style**
```css
/* src/global/styles.css */
.magic-btn {
  background-color: #6c5ce7;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
}
```

---

## Testing Patterns

- **Test files** are colocated with components and use the pattern: `*.test.tsx`
- **Testing framework** is not explicitly specified, but test files follow patterns compatible with Jest and React Testing Library.
- **Example test file:**
  ```typescript
  // src/components/ExampleComponent.test.tsx
  import { render, screen } from '@testing-library/react';
  import ExampleComponent from './ExampleComponent';

  test('renders the label', () => {
    render(<ExampleComponent label="Magic" />);
    expect(screen.getByText('Magic')).toBeInTheDocument();
  });
  ```

## Commands

| Command             | Purpose                                               |
|---------------------|-------------------------------------------------------|
| /feature-ui-update  | Start a new feature or update an existing UI component|
| /fix-ui-bug         | Fix a UI bug or adjust layout/styling                 |
```
