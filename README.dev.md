# Developer Guide

## Making Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and [Husky](https://typicode.github.io/husky/) to enforce commit message format. All commits must follow the conventional commit format or they will be rejected.

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Commit Types

- `feat`: A new feature (triggers a **minor** version bump)
- `fix`: A bug fix (triggers a **patch** version bump)
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without feature changes or bug fixes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to build process, dependencies, or tooling
- `ci`: Changes to CI configuration files and scripts

### Examples

✅ **Valid commits:**
```bash
feat: add search functionality to popup
fix: resolve alias validation bug
feat(omnibox): improve suggestion matching
fix(storage): handle corrupted data gracefully
chore: update dependencies
docs: update installation instructions
```

❌ **Invalid commits:**
```bash
Added new feature
fix bug
update code
WIP
```

### Commit Message Rules

- **Type is required** and must be lowercase
- **Subject is required** and should be in imperative mood (e.g., "add" not "added" or "adds")
- **Subject should not end with a period**
- **Scope is optional** but recommended for clarity
- **Breaking changes** should include `!` after the type/scope: `feat!: remove deprecated API` (triggers a **major** version bump)

### Breaking Changes

To indicate a breaking change, add `!` after the type:

```bash
feat!: change default omnibox keyword from 'b' to 'bm'
fix!: remove support for legacy bookmark format
```

Or include `BREAKING CHANGE:` in the footer:

```bash
feat: update manifest structure

BREAKING CHANGE: manifest.json now requires manifest_version 3
```

### Semantic Versioning

Commits automatically trigger version bumps when merged to `main`:

- `feat:` → **minor** version (1.0.0 → 1.1.0)
- `fix:` → **patch** version (1.0.0 → 1.0.1)
- `feat!:` or `BREAKING CHANGE:` → **major** version (1.0.0 → 2.0.0)
- Other types (`chore`, `docs`, `style`, etc.) → no version bump (unless they include `!`)

### Pre-commit Hooks

Husky automatically validates commit messages before they're accepted. If your commit message doesn't follow the format, you'll see an error and the commit will be rejected.

### Testing Locally

You can test your commit message format before committing:

```bash
echo "feat: your commit message" | npx commitlint
```

### Development Workflow

1. Make your changes
2. Stage your changes: `git add .`
3. Commit with a conventional commit message: `git commit -m "feat: add new feature"`
4. Push to your branch: `git push`
5. Create a pull request to `main`

### Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Commitlint Rules](https://commitlint.js.org/#/reference-rules)

