// Storage utilities
import { createBookmarkStorageWithSettings } from '../storage.js';

const BookmarkStorage = createBookmarkStorageWithSettings();

// Flatten bookmark tree
function flattenBookmarks(bookmarkTree: BookmarkNode[]): BookmarkNode[] {
  const bookmarks: BookmarkNode[] = [];
  
  function traverse(nodes: BookmarkNode[]): void {
    for (const node of nodes) {
      if (node.url) {
        bookmarks.push(node);
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }
  
  traverse(bookmarkTree);
  return bookmarks;
}

// Render bookmarks
async function renderBookmarks(searchTerm: string = ''): Promise<void> {
  const container = document.getElementById('bookmarksList');
  if (!container) return;
  
  const searchLower = searchTerm.toLowerCase();
  
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();
    const allBookmarks = flattenBookmarks(bookmarkTree);
    const aliases = await BookmarkStorage.getAliases();
    
    // Create reverse mapping: bookmarkId -> alias
    const bookmarkToAlias: { [bookmarkId: string]: string } = {};
    for (const [alias, bookmarkId] of Object.entries(aliases)) {
      bookmarkToAlias[bookmarkId as string] = alias;
    }
    
    // Filter bookmarks
    const filtered = allBookmarks.filter(bookmark => {
      if (!searchTerm) return true;
      const title = (bookmark.title || '').toLowerCase();
      const url = (bookmark.url || '').toLowerCase();
      const alias = (bookmarkToAlias[bookmark.id] || '').toLowerCase();
      
      // Extract URL without protocol for better matching (everything except protocol)
      let urlWithoutProtocol = '';
      try {
        if (url) {
          const urlObj = new URL(url);
          // Get everything after the protocol (hostname + pathname + search + hash)
          urlWithoutProtocol = (urlObj.hostname + urlObj.pathname + urlObj.search + urlObj.hash).toLowerCase();
        }
      } catch (e) {
        // Invalid URL, skip URL parsing
      }
      
      return title.includes(searchLower) || 
             url.includes(searchLower) || 
             urlWithoutProtocol.includes(searchLower) ||
             alias.includes(searchLower);
    });
    
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="py-[60px] px-5 text-center text-gray-600">
          <p class="mt-2 text-sm">No bookmarks found</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = filtered.map(bookmark => {
      const alias = bookmarkToAlias[bookmark.id] || '';
      const aliasDisplay = alias ? `<span class="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium mr-1">${escapeHtml(alias)}</span>` : '<span class="text-gray-400 text-xs">No alias</span>';
      
      return `
        <div class="flex items-start p-4 border-b border-gray-100 transition-colors hover:bg-gray-50" data-id="${escapeHtml(bookmark.id)}">
          <div class="flex-1 min-w-0 mr-4">
            <div class="font-medium text-gray-900 mb-1 text-[15px]">${escapeHtml(bookmark.title || 'Untitled')}</div>
            <div class="text-[13px] text-gray-600 mb-1.5 break-all">${escapeHtml(bookmark.url || '')}</div>
            <div class="mt-1.5">
              ${aliasDisplay}
            </div>
            <div class="flex gap-2 mt-2 items-center" style="display: none;">
              <input type="text" class="flex-1 max-w-[300px] px-2.5 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(66,133,244,0.1)]" placeholder="Enter alias" value="${escapeHtml(alias)}" maxlength="50">
              <button class="px-3 py-1.5 border-0 rounded bg-blue-500 text-white cursor-pointer text-[13px] transition-all whitespace-nowrap hover:bg-blue-600 save-alias">Save</button>
              <button class="px-3 py-1.5 border border-gray-300 rounded bg-white cursor-pointer text-[13px] transition-all whitespace-nowrap hover:bg-gray-100 cancel-alias">Cancel</button>
            </div>
          </div>
          <button class="px-3 py-1.5 rounded cursor-pointer text-[13px] transition-all whitespace-nowrap self-start mt-0 ${alias ? 'bg-red-500 text-white border-0 hover:bg-red-600' : 'bg-blue-500 text-white border-0 hover:bg-blue-600'} edit-alias" title="${alias ? 'Edit/Remove alias' : 'Set alias'}">
            ${alias ? 'Edit' : 'Set Alias'}
          </button>
        </div>
      `;
    }).join('');
    
    // Attach event listeners
    attachEventListeners();
    
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    container.innerHTML = `
      <div class="py-[60px] px-5 text-center text-gray-600">
        <p class="mt-2 text-sm">Error loading bookmarks: ${escapeHtml(errorMessage)}</p>
      </div>
    `;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function attachEventListeners(): void {
  // Edit alias buttons
  document.querySelectorAll('.edit-alias').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('[data-id]') as HTMLElement;
      if (!item) return;
      const inputContainer = item.querySelector('div[style*="display"]') as HTMLElement;
      if (!inputContainer) return;
      const isVisible = inputContainer.style.display !== 'none';
      
      if (isVisible) {
        inputContainer.style.display = 'none';
      } else {
        inputContainer.style.display = 'flex';
        const input = item.querySelector('input[type="text"]') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }
    });
  });
  
  // Save alias buttons
  document.querySelectorAll('.save-alias').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = btn.closest('[data-id]') as HTMLElement;
      if (!item) return;
      const bookmarkId = item.dataset.id;
      if (!bookmarkId) return;
      const input = item.querySelector('input[type="text"]') as HTMLInputElement;
      if (!input) return;
      const alias = input.value.trim().toLowerCase();
      
      if (alias === '') {
        // Remove alias
        const currentAliases = await BookmarkStorage.getAllAliasesForBookmark(bookmarkId);
        for (const currentAlias of currentAliases) {
          await BookmarkStorage.removeAlias(currentAlias);
        }
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        renderBookmarks(searchInput?.value || '');
        return;
      }
      
      // Validate alias
      if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
        alert('Alias can only contain letters, numbers, underscores, and hyphens.');
        return;
      }
      
      // Check for conflicts
      const existingBookmarkId = await BookmarkStorage.getAlias(alias);
      if (existingBookmarkId && existingBookmarkId !== bookmarkId) {
        const overwrite = confirm(
          `Alias "${alias}" is already assigned to another bookmark. Overwrite?`
        );
        if (!overwrite) {
          return;
        }
      }
      
      await BookmarkStorage.setAlias(alias, bookmarkId);
      const optionsSearchInput = document.getElementById('searchInput') as HTMLInputElement;
      renderBookmarks(optionsSearchInput?.value || '');
    });
  });
  
  // Cancel alias buttons
  document.querySelectorAll('.cancel-alias').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('[data-id]') as HTMLElement;
      if (!item) return;
      const inputContainer = item.querySelector('div[style*="display"]') as HTMLElement;
      if (!inputContainer) return;
      inputContainer.style.display = 'none';
      // Reset input value
      const bookmarkId = item.dataset.id;
      if (bookmarkId) {
        BookmarkStorage.getAllAliasesForBookmark(bookmarkId).then((aliases: string[]) => {
          const input = item.querySelector('input[type="text"]') as HTMLInputElement;
          if (input) {
            input.value = aliases[0] || '';
          }
        });
      }
    });
  });
}

// Search functionality
const optionsSearchInput = document.getElementById('searchInput');
if (optionsSearchInput) {
  optionsSearchInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    renderBookmarks(target.value);
  });
}

// Export aliases
interface ExportData {
  version: string;
  exportDate: string;
  aliases: {
    [alias: string]: {
      bookmarkId: string;
      title: string;
      url?: string;
    };
  };
}

const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
  exportBtn.addEventListener('click', async () => {
    try {
      const aliases = await BookmarkStorage.getAliases();
      const bookmarkTree = await chrome.bookmarks.getTree();
      const allBookmarks = flattenBookmarks(bookmarkTree);
      
      // Create export data with bookmark info
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        aliases: {}
      };
      
      for (const [alias, bookmarkId] of Object.entries(aliases)) {
        const bookmark = allBookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
          exportData.aliases[alias] = {
            bookmarkId: bookmarkId,
            title: bookmark.title,
            url: bookmark.url
          };
        }
      }
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookmark-aliases-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Error exporting aliases: ' + errorMessage);
    }
  });
}

// Import aliases
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile') as HTMLInputElement;

if (importBtn && importFile) {
  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text) as ExportData | { aliases: { [key: string]: string | { bookmarkId: string } } };
      
      if (!importData.aliases || typeof importData.aliases !== 'object') {
        throw new Error('Invalid import file format');
      }
      
      const confirmImport = confirm(
        `This will import ${Object.keys(importData.aliases).length} alias(es). ` +
        `Existing aliases with the same name will be overwritten. Continue?`
      );
      
      if (!confirmImport) {
        importFile.value = '';
        return;
      }
      
      const aliases = await BookmarkStorage.getAliases();
      let imported = 0;
      let skipped = 0;
      
      for (const [alias, data] of Object.entries(importData.aliases)) {
        let bookmarkId: string | null = null;
        
        if (typeof data === 'string') {
          // Old format: just bookmarkId
          bookmarkId = data;
        } else if (data && typeof data === 'object' && 'bookmarkId' in data) {
          // New format: object with bookmarkId
          bookmarkId = (data as { bookmarkId: string }).bookmarkId;
        } else {
          skipped++;
          continue;
        }
        
        if (!bookmarkId) {
          skipped++;
          continue;
        }
        
        // Verify bookmark exists
        try {
          await chrome.bookmarks.get(bookmarkId);
          aliases[alias.toLowerCase()] = bookmarkId;
          imported++;
        } catch (error) {
          // Bookmark doesn't exist, skip it
          skipped++;
        }
      }
      
      await chrome.storage.local.set({ aliases });
      
      alert(
        `Import complete!\n` +
        `Imported: ${imported}\n` +
        `Skipped: ${skipped}`
      );
      
      const optionsSearchInput = document.getElementById('searchInput') as HTMLInputElement;
      renderBookmarks(optionsSearchInput?.value || '');
      importFile.value = '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Error importing aliases: ' + errorMessage);
      importFile.value = '';
    }
  });
}

// Load and display settings
async function loadSettings(): Promise<void> {
  const settings = await BookmarkStorage.getSettings();
  const prefixInput = document.getElementById('prefixInput') as HTMLInputElement;
  const caseSensitiveCheck = document.getElementById('caseSensitiveCheck') as HTMLInputElement;
  const currentPrefix = document.getElementById('currentPrefix');
  
  if (prefixInput) {
    prefixInput.value = settings.prefix || 'b';
  }
  if (caseSensitiveCheck) {
    caseSensitiveCheck.checked = settings.caseSensitive || false;
  }
  if (currentPrefix) {
    currentPrefix.textContent = settings.prefix || 'b';
  }
}

// Save settings
const saveSettings = document.getElementById('saveSettings');
if (saveSettings) {
  saveSettings.addEventListener('click', async () => {
    const prefixInput = document.getElementById('prefixInput') as HTMLInputElement;
    const caseSensitiveCheck = document.getElementById('caseSensitiveCheck') as HTMLInputElement;
    
    if (!prefixInput || !caseSensitiveCheck) return;
    
    const prefix = prefixInput.value.trim();
    const caseSensitive = caseSensitiveCheck.checked;
    
    if (!prefix || prefix.length === 0) {
      alert('Prefix cannot be empty');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(prefix)) {
      alert('Prefix can only contain letters, numbers, underscores, and hyphens.');
      return;
    }
    
    await BookmarkStorage.setSettings({
      prefix: prefix,
      caseSensitive: caseSensitive
    });
    
    const currentPrefix = document.getElementById('currentPrefix');
    if (currentPrefix) {
      currentPrefix.textContent = prefix;
    }
    alert('Settings saved! Note: Changing the prefix requires updating manifest.json and reloading the extension.');
  });
}

// Initial render
loadSettings();
renderBookmarks();

// Listen for storage changes to update UI
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.aliases) {
    const optionsSearchInput = document.getElementById('searchInput') as HTMLInputElement;
    renderBookmarks(optionsSearchInput?.value || '');
  }
});

