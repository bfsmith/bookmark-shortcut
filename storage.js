// Shared storage utilities
export const createBookmarkStorage = () => ({
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
});
export const createBookmarkStorageWithSettings = () => {
    const base = createBookmarkStorage();
    return {
        ...base,
        async getSettings() {
            const result = await chrome.storage.local.get('settings');
            return result.settings || { prefix: 'b', caseSensitive: false };
        },
        async setSettings(settings) {
            await chrome.storage.local.set({ settings });
        }
    };
};
//# sourceMappingURL=storage.js.map