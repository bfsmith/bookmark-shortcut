// Storage utilities
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

  async getBookmarkIdByAlias(alias) {
    return await this.getAlias(alias);
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
  },

  async removeAliasesForBookmark(bookmarkId) {
    const aliases = await this.getAliases();
    const updated = {};
    for (const [alias, id] of Object.entries(aliases)) {
      if (id !== bookmarkId) {
        updated[alias] = id;
      }
    }
    await chrome.storage.local.set({ aliases: updated });
  }
};

// Omnibox handler
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  if (!text) {
    suggest([]);
    return;
  }

  const aliases = await Storage.getAliases();
  const matches = [];
  const searchText = text.toLowerCase();

  for (const [alias, bookmarkId] of Object.entries(aliases)) {
    if (alias.includes(searchText)) {
      try {
        const bookmark = await chrome.bookmarks.get(bookmarkId);
        if (bookmark && bookmark[0]) {
          matches.push({
            content: bookmarkId,
            description: `${alias} - ${bookmark[0].title || bookmark[0].url}`
          });
        }
      } catch (error) {
        // Bookmark may have been deleted, skip it
        continue;
      }
    }
  }

  // Sort by alias length and limit to 10
  matches.sort((a, b) => {
    const aAlias = a.description.split(' - ')[0];
    const bAlias = b.description.split(' - ')[0];
    return aAlias.length - bAlias.length;
  });

  suggest(matches.slice(0, 10));
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  let bookmarkId = null;

  // Check if text is a direct alias match
  bookmarkId = await Storage.getBookmarkIdByAlias(text);

  // If not found, try to find by partial match
  if (!bookmarkId) {
    const aliases = await Storage.getAliases();
    const searchText = text.toLowerCase();
    for (const [alias, id] of Object.entries(aliases)) {
      if (alias === searchText || alias.startsWith(searchText)) {
        bookmarkId = id;
        break;
      }
    }
  }

  if (bookmarkId) {
    try {
      const bookmark = await chrome.bookmarks.get(bookmarkId);
      if (bookmark && bookmark[0]) {
        const url = bookmark[0].url;
        if (url) {
          const tabDisposition = disposition === 'newForegroundTab' 
            ? 'active' 
            : disposition === 'newBackgroundTab' 
            ? 'background' 
            : 'currentTab';
          
          if (tabDisposition === 'currentTab') {
            chrome.tabs.update({ url });
          } else {
            chrome.tabs.create({ url, active: tabDisposition === 'active' });
          }
        }
      }
    } catch (error) {
      console.error('Error opening bookmark:', error);
    }
  }
});

// Context menu for links on web pages
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'set-bookmark-alias',
    title: 'Set alias for this link',
    contexts: ['link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'set-bookmark-alias') {
    const linkUrl = info.linkUrl;
    
    if (!linkUrl) {
      return;
    }

    // Find bookmark by URL
    let bookmarkId = null;
    try {
      const bookmarks = await chrome.bookmarks.search({ url: linkUrl });
      if (bookmarks && bookmarks.length > 0) {
        // Use the first matching bookmark
        bookmarkId = bookmarks[0].id;
      } else {
        // Bookmark doesn't exist, offer to create it
        const createBookmark = confirm(
          'This link is not bookmarked. Would you like to bookmark it and set an alias?'
        );
        if (createBookmark) {
          const bookmark = await chrome.bookmarks.create({
            url: linkUrl,
            title: info.linkText || new URL(linkUrl).hostname
          });
          bookmarkId = bookmark.id;
        } else {
          return;
        }
      }
    } catch (error) {
      console.error('Error finding/creating bookmark:', error);
      alert('Error: Could not find or create bookmark.');
      return;
    }
    
    if (bookmarkId) {
      // Get current alias if any
      const aliases = await Storage.getAliases();
      let currentAlias = '';
      for (const [alias, id] of Object.entries(aliases)) {
        if (id === bookmarkId) {
          currentAlias = alias;
          break;
        }
      }

      // Prompt for alias
      const alias = prompt(
        currentAlias 
          ? `Current alias: ${currentAlias}\n\nEnter new alias (leave empty to remove):`
          : 'Enter alias for this bookmark:',
        currentAlias
      );

      if (alias === null) {
        // User cancelled
        return;
      }

      const trimmedAlias = alias.trim().toLowerCase();

      if (trimmedAlias === '') {
        // Remove alias
        if (currentAlias) {
          await Storage.removeAlias(currentAlias);
        }
      } else {
        // Validate alias
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedAlias)) {
          alert('Alias can only contain letters, numbers, underscores, and hyphens.');
          return;
        }

        // Check for conflicts
        const existingBookmarkId = await Storage.getAlias(trimmedAlias);
        if (existingBookmarkId && existingBookmarkId !== bookmarkId) {
          const overwrite = confirm(
            `Alias "${trimmedAlias}" is already assigned to another bookmark. Overwrite?`
          );
          if (!overwrite) {
            return;
          }
        }

        await Storage.setAlias(trimmedAlias, bookmarkId);
      }
    }
  }
});

// Clean up aliases when bookmarks are deleted
chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
  await Storage.removeAliasesForBookmark(id);
  
  // Also clean up children if folder was removed
  if (removeInfo.node && removeInfo.node.children) {
    for (const child of removeInfo.node.children) {
      await Storage.removeAliasesForBookmark(child.id);
    }
  }
});

