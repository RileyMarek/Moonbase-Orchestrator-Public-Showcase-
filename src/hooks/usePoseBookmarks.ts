import { useState } from 'react';
import { useDemoState } from '../demo/state';

export interface PoseBookmark { label: string; pose: number[]; visual_target: string; available: boolean; reason: string; }
export interface BookmarkList { items: Record<string, PoseBookmark>; revision: string; scope: string; }

export function usePoseBookmarks(_robotId: string, _environmentRevision?: string) {
  const demoBookmarks = useDemoState(s => s.bookmarks);
  const [data, setData] = useState<BookmarkList>(demoBookmarks);

  return {
    data,
    error: '',
    update: (next: BookmarkList) => {
      setData(next);
      useDemoState.setState({ bookmarks: next });
    },
    refresh: () => setData(useDemoState.getState().bookmarks),
  };
}
