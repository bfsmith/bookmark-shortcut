// Storage utilities
import { createBookmarkStorage } from '../storage';

const BookmarkStorage = createBookmarkStorage();

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
        <div class="empty-state">
          <p>No bookmarks found</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = filtered.map(bookmark => {
      const alias = bookmarkToAlias[bookmark.id] || '';
      const aliasDisplay = alias ? `<span class="bookmark-alias">${escapeHtml(alias)}</span>` : '';
      
      return `
        <div class="bookmark-item" data-id="${escapeHtml(bookmark.id)}">
          <div class="bookmark-info">
            <div class="bookmark-title">${escapeHtml(bookmark.title || 'Untitled')}</div>
            <div class="bookmark-url">${escapeHtml(bookmark.url || '')}</div>
            ${aliasDisplay}
            <div class="alias-input-container" style="display: none;">
              <input type="text" class="alias-input" placeholder="Enter alias" value="${escapeHtml(alias)}" maxlength="50">
              <button class="btn-small btn-primary save-alias">Save</button>
              <button class="btn-small cancel-alias">Cancel</button>
            </div>
          </div>
          <button class="btn-small ${alias ? 'btn-danger' : 'btn-primary'} edit-alias" title="${alias ? 'Edit/Remove alias' : 'Set alias'}">
            ${alias ? '✏️' : '➕'}
          </button>
        </div>
      `;
    }).join('');
    
    // Attach event listeners
    attachEventListeners();
    
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p>Error loading bookmarks</p>
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
      const item = btn.closest('.bookmark-item') as HTMLElement;
      if (!item) return;
      const inputContainer = item.querySelector('.alias-input-container') as HTMLElement;
      if (!inputContainer) return;
      const isVisible = inputContainer.style.display !== 'none';
      
      if (isVisible) {
        inputContainer.style.display = 'none';
      } else {
        inputContainer.style.display = 'flex';
        const input = item.querySelector('.alias-input') as HTMLInputElement;
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
      const item = btn.closest('.bookmark-item') as HTMLElement;
      if (!item) return;
      const bookmarkId = item.dataset.id;
      if (!bookmarkId) return;
      const input = item.querySelector('.alias-input') as HTMLInputElement;
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
      const searchInput = document.getElementById('searchInput') as HTMLInputElement;
      renderBookmarks(searchInput?.value || '');
    });
  });
  
  // Cancel alias buttons
  document.querySelectorAll('.cancel-alias').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.bookmark-item') as HTMLElement;
      if (!item) return;
      const inputContainer = item.querySelector('.alias-input-container') as HTMLElement;
      if (!inputContainer) return;
      inputContainer.style.display = 'none';
      // Reset input value
      const bookmarkId = item.dataset.id;
      if (bookmarkId) {
        BookmarkStorage.getAllAliasesForBookmark(bookmarkId).then((aliases: string[]) => {
          const input = item.querySelector('.alias-input') as HTMLInputElement;
          if (input) {
            input.value = aliases[0] || '';
          }
        });
      }
    });
  });
  
  // Open bookmark on click
  document.querySelectorAll('.bookmark-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      // Don't open if clicking on buttons or inputs
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
        return;
      }
      
      const bookmarkId = (item as HTMLElement).dataset.id;
      if (!bookmarkId) return;
      try {
        const bookmark = await chrome.bookmarks.get(bookmarkId);
        if (bookmark && bookmark[0] && bookmark[0].url) {
          chrome.tabs.create({ url: bookmark[0].url });
        }
      } catch (error) {
        console.error('Error opening bookmark:', error);
      }
    });
  });
}

// Search functionality
const popupSearchInput = document.getElementById('searchInput');
if (popupSearchInput) {
  popupSearchInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    renderBookmarks(target.value);
  });
}

// Open options page
const openOptions = document.getElementById('openOptions');
if (openOptions) {
  openOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// Initial render
renderBookmarks();

// Listen for storage changes to update UI
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.aliases) {
    const popupSearchInput = document.getElementById('searchInput') as HTMLInputElement;
    renderBookmarks(popupSearchInput?.value || '');
  }
});

