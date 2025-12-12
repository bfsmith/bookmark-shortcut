# Bookmark Shortcut

<p align="center">
  <img src="icons/icon128.png" alt="Bookmark Shortcut Logo" width="128" height="128" />
</p>


A browser extension that lets you create custom aliases for your bookmarks and open them from the address bar.

Instead of navigating through bookmark folders or typing full URLs, you can assign short aliases to your bookmarks and access them by typing `b` followed by your alias in the browser's address bar.

## Quick Start

1. Install the extension
2. Set an alias for any bookmark (via popup or options page)
3. Type `b` + space + your alias in the address bar
4. Press Enter to open the bookmark

## Features

### Omnibox Access
Type a short alias in your browser's address bar to open bookmarks. The extension provides suggestions as you type, so you can find bookmarks even if you don't remember the exact alias.

### Search
The popup and options page include search that matches bookmarks by:
- Title
- URL
- Alias
- Domain name

### Alias Management
You can set, edit, or remove aliases in two ways:
- **Popup**: Click the extension icon for quick access
- **Options Page**: Full management interface with all your bookmarks

### Settings
- **Custom Prefix**: Change the omnibox keyword from `b` to something else
- **Case Sensitivity**: Toggle case-sensitive alias matching

### Import & Export
Export your aliases to a JSON file for backup, or import them to restore or sync across devices.

### Automatic Cleanup
When you delete a bookmark, any aliases assigned to it are automatically removed.

## How to Use

### Setting an Alias

**Via Popup:**
1. Click the extension icon
2. Find the bookmark you want to alias
3. Click "Set Alias" (or "Edit" if it already has one)
4. Enter your alias
5. Click "Save"

**Via Options Page:**
1. Right-click the extension icon → Options
2. Use the search bar to find your bookmark
3. Click "Set Alias" or "Edit"
4. Enter your alias and save

### Opening a Bookmark

1. Click in your browser's address bar (or press `Ctrl+L` / `Cmd+L`)
2. Type `b` followed by a space
3. Type your alias (or start typing to see suggestions)
4. Press Enter to open in the current tab, or:
   - `Alt+Enter` to open in a new tab
   - `Ctrl+Enter` / `Cmd+Enter` to open in a new background tab

### Alias Rules

- Aliases can contain letters, numbers, underscores, and hyphens
- Aliases are case-insensitive by default (configurable in settings)
- Each bookmark can have one alias
- Each alias can only be assigned to one bookmark

## Interface

### Popup
A compact interface that shows all your bookmarks with their aliases. You can search, set aliases, and open bookmarks directly from here.

### Options Page
A full management interface where you can:
- View all bookmarks in a list
- Search and filter bookmarks
- Set, edit, or remove aliases
- Export your aliases to a JSON file
- Import aliases from a backup
- Configure extension settings

## Privacy

All data is stored locally in your browser. Your bookmarks and aliases never leave your device—no external servers, no tracking, no data collection.

## Technical Details

**Browser Support:** Chrome, Edge, and other Chromium-based browsers

**Permissions Required:**
- `bookmarks`: To read and access your bookmarks
- `storage`: To save your aliases locally
- `tabs`: To open bookmarks in new tabs
