// Storage utilities (same as background.js)
const Storage = {
  async getAliases() {
    const result = await chrome.storage.local.get('aliases');
    return result.aliases || {};
  },

  async setAlias(alias, bookmarkId) {
    const aliases = await this.getAliases();
    aliases[alias.toLowerCase()] = bookmarkId;
    await chrome.storage.local.set({ aliases });
    return aliases;
  },

  async removeAlias(alias) {
    const aliases = await this.getAliases();
    delete aliases[alias.toLowerCase()];
    await chrome.storage.local.set({ aliases });
    return aliases;
  },

  async getAlias(alias) {
    const aliases = await this.getAliases();
    return aliases[alias.toLowerCase()] || null;
  },

  async getAllAliasesForBookmark(bookmarkId) {
    const aliases = await this.getAliases();
    const result = [];
    for (const [alias, id] of Object.entries(aliases)) {
      if (id === bookmarkId) {
        result.push(alias);
      }
    }
    return result;
  }
};

// Flatten bookmark tree
function flattenBookmarks(bookmarkTree) {
  const bookmarks = [];
  
  function traverse(nodes) {
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
async function renderBookmarks(searchTerm = '') {
  const container = document.getElementById('bookmarksList');
  const searchLower = searchTerm.toLowerCase();
  
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();
    const allBookmarks = flattenBookmarks(bookmarkTree);
    const aliases = await Storage.getAliases();
    
    // Create reverse mapping: bookmarkId -> alias
    const bookmarkToAlias = {};
    for (const [alias, bookmarkId] of Object.entries(aliases)) {
      bookmarkToAlias[bookmarkId] = alias;
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
      const aliasDisplay = alias ? `<span class="bookmark-alias">${alias}</span>` : '';
      
      return `
        <div class="bookmark-item" data-id="${bookmark.id}">
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function attachEventListeners() {
  // Edit alias buttons
  document.querySelectorAll('.edit-alias').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.bookmark-item');
      const inputContainer = item.querySelector('.alias-input-container');
      const isVisible = inputContainer.style.display !== 'none';
      
      if (isVisible) {
        inputContainer.style.display = 'none';
      } else {
        inputContainer.style.display = 'flex';
        const input = item.querySelector('.alias-input');
        input.focus();
        input.select();
      }
    });
  });
  
  // Save alias buttons
  document.querySelectorAll('.save-alias').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = btn.closest('.bookmark-item');
      const bookmarkId = item.dataset.id;
      const input = item.querySelector('.alias-input');
      const alias = input.value.trim().toLowerCase();
      
      if (alias === '') {
        // Remove alias
        const currentAliases = await Storage.getAllAliasesForBookmark(bookmarkId);
        for (const currentAlias of currentAliases) {
          await Storage.removeAlias(currentAlias);
        }
        renderBookmarks(document.getElementById('searchInput').value);
        return;
      }
      
      // Validate alias
      if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
        alert('Alias can only contain letters, numbers, underscores, and hyphens.');
        return;
      }
      
      // Check for conflicts
      const existingBookmarkId = await Storage.getAlias(alias);
      if (existingBookmarkId && existingBookmarkId !== bookmarkId) {
        const overwrite = confirm(
          `Alias "${alias}" is already assigned to another bookmark. Overwrite?`
        );
        if (!overwrite) {
          return;
        }
      }
      
      await Storage.setAlias(alias, bookmarkId);
      renderBookmarks(document.getElementById('searchInput').value);
    });
  });
  
  // Cancel alias buttons
  document.querySelectorAll('.cancel-alias').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.bookmark-item');
      const inputContainer = item.querySelector('.alias-input-container');
      inputContainer.style.display = 'none';
      // Reset input value
      const bookmarkId = item.dataset.id;
      Storage.getAllAliasesForBookmark(bookmarkId).then(aliases => {
        const input = item.querySelector('.alias-input');
        input.value = aliases[0] || '';
      });
    });
  });
  
  // Open bookmark on click
  document.querySelectorAll('.bookmark-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      // Don't open if clicking on buttons or inputs
      if (e.target.closest('button') || e.target.closest('input')) {
        return;
      }
      
      const bookmarkId = item.dataset.id;
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
document.getElementById('searchInput').addEventListener('input', (e) => {
  renderBookmarks(e.target.value);
});

// Open options page
document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Initial render
renderBookmarks();

// Listen for storage changes to update UI
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.aliases) {
    renderBookmarks(document.getElementById('searchInput').value);
  }
});

