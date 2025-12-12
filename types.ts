// Type definitions for the bookmark shortcut extension

interface Aliases {
  [alias: string]: string; // alias -> bookmarkId
}

interface Settings {
  prefix: string;
  caseSensitive: boolean;
}

interface BookmarkNode {
  id: string;
  parentId?: string;
  index?: number;
  url?: string;
  title: string;
  children?: BookmarkNode[];
}

interface BookmarkRemoveInfo {
  parentId: string;
  index: number;
  node: BookmarkNode;
}

interface BookmarkStorage {
  getAliases(): Promise<Aliases>;
  setAlias(alias: string, bookmarkId: string): Promise<Aliases>;
  removeAlias(alias: string): Promise<Aliases>;
  getAlias(alias: string): Promise<string | null>;
  getBookmarkIdByAlias(alias: string): Promise<string | null>;
  getAllAliasesForBookmark(bookmarkId: string): Promise<string[]>;
  removeAliasesForBookmark(bookmarkId: string): Promise<void>;
}

interface BookmarkStorageWithSettings extends BookmarkStorage {
  getSettings(): Promise<Settings>;
  setSettings(settings: Settings): Promise<void>;
}

