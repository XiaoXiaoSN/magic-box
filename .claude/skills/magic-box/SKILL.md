```markdown
# magic-box Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `magic-box` TypeScript codebase. You'll learn how to structure files, write and organize code, follow commit conventions, and understand the project's approach to testing.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `myComponent.ts`, `userService.ts`

### Import Style
- Use **relative imports** for referencing modules.
  - Example:
    ```typescript
    import { helperFunction } from './utils/helperFunction';
    ```

### Export Style
- **Mixed**: Both named and default exports are used.
  - Example (named export):
    ```typescript
    export function calculateSum(a: number, b: number): number {
      return a + b;
    }
    ```
  - Example (default export):
    ```typescript
    const magicBox = { /* ... */ };
    export default magicBox;
    ```

### Commit Messages
- Use **Conventional Commits** with the `feat` prefix for features.
  - Example:
    ```
    feat: add user authentication module
    ```
- Average commit message length: ~56 characters.

## Workflows

### Feature Development
**Trigger:** When adding a new feature or module  
**Command:** `/feature-development`

1. Create a new TypeScript file using camelCase naming.
2. Write your code, using relative imports for dependencies.
3. Export your functions or classes using named or default exports as appropriate.
4. Write corresponding test files with the `.test.` pattern.
5. Commit your changes using the `feat:` prefix and a concise description.
    - Example: `feat: implement login functionality`

### Testing
**Trigger:** When verifying code correctness  
**Command:** `/run-tests`

1. Identify or create test files matching the `*.test.*` pattern.
2. Run the tests using the project's test runner (framework not specified; check project scripts or documentation).
3. Review test results and fix any failing tests.

## Testing Patterns

- Test files follow the `*.test.*` naming convention.
  - Example: `userService.test.ts`
- The specific testing framework is **unknown**; check the project for further details.
- Place tests alongside or near the code they test for clarity.

## Commands
| Command              | Purpose                                    |
|----------------------|--------------------------------------------|
| /feature-development | Start a new feature/module development     |
| /run-tests           | Run all tests in the codebase              |
```