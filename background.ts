// Storage utilities
import { createBookmarkStorage } from './storage.js';

const BookmarkStorage = createBookmarkStorage();

// Omnibox handler
chrome.omnibox.onInputChanged.addListener(async (text: string, suggest: (suggestResults: chrome.omnibox.SuggestResult[]) => void) => {
  if (!text) {
    suggest([]);
    return;
  }

  const aliases = await BookmarkStorage.getAliases();
  const matches: chrome.omnibox.SuggestResult[] = [];
  const searchText = text.toLowerCase();

  for (const [alias, bookmarkId] of Object.entries(aliases)) {
    if (alias.includes(searchText)) {
      try {
        const bookmark = await chrome.bookmarks.get(bookmarkId);
        if (bookmark && bookmark[0]) {
          const bookmarkNode = bookmark[0];
          matches.push({
            content: bookmarkId,
            description: `${alias} - ${bookmarkNode.title || bookmarkNode.url || ''}`
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

chrome.omnibox.onInputEntered.addListener(async (text: string, disposition: chrome.omnibox.OnInputEnteredDisposition) => {
  let bookmarkId: string | null = null;

  // Check if text is a direct alias match
  bookmarkId = await BookmarkStorage.getBookmarkIdByAlias(text);

  // If not found, try to find by partial match
  if (!bookmarkId) {
    const aliases = await BookmarkStorage.getAliases();
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

// Clean up aliases when bookmarks are deleted
chrome.bookmarks.onRemoved.addListener(async (id: string, removeInfo: chrome.bookmarks.BookmarkRemoveInfo) => {
  await BookmarkStorage.removeAliasesForBookmark(id);
  
  // Also clean up children if folder was removed
  if (removeInfo.node && removeInfo.node.children) {
    for (const child of removeInfo.node.children) {
      await BookmarkStorage.removeAliasesForBookmark(child.id);
    }
  }
});

