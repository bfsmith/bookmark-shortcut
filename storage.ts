// Shared storage utilities

export const createBookmarkStorage = (): BookmarkStorage => ({
  async getAliases(): Promise<Aliases> {
    const result = await chrome.storage.local.get('aliases');
    return (result.aliases as Aliases) || {};
  },

  async setAlias(alias: string, bookmarkId: string): Promise<Aliases> {
    const aliases = await this.getAliases();
    aliases[alias.toLowerCase()] = bookmarkId;
    await chrome.storage.local.set({ aliases });
    return aliases;
  },

  async removeAlias(alias: string): Promise<Aliases> {
    const aliases = await this.getAliases();
    delete aliases[alias.toLowerCase()];
    await chrome.storage.local.set({ aliases });
    return aliases;
  },

  async getAlias(alias: string): Promise<string | null> {
    const aliases = await this.getAliases();
    return aliases[alias.toLowerCase()] || null;
  },

  async getBookmarkIdByAlias(alias: string): Promise<string | null> {
    return await this.getAlias(alias);
  },

  async getAllAliasesForBookmark(bookmarkId: string): Promise<string[]> {
    const aliases = await this.getAliases();
    const result: string[] = [];
    for (const [alias, id] of Object.entries(aliases)) {
      if (id === bookmarkId) {
        result.push(alias);
      }
    }
    return result;
  },

  async removeAliasesForBookmark(bookmarkId: string): Promise<void> {
    const aliases = await this.getAliases();
    const updated: Aliases = {};
    for (const [alias, id] of Object.entries(aliases)) {
      if (id !== bookmarkId) {
        updated[alias] = id;
      }
    }
    await chrome.storage.local.set({ aliases: updated });
  }
});

export const createBookmarkStorageWithSettings = (): BookmarkStorageWithSettings => {
  const base = createBookmarkStorage();
  return {
    ...base,
    async getSettings(): Promise<Settings> {
      const result = await chrome.storage.local.get('settings');
      return (result.settings as Settings) || { prefix: 'b', caseSensitive: false };
    },

    async setSettings(settings: Settings): Promise<void> {
      await chrome.storage.local.set({ settings });
    }
  };
};

