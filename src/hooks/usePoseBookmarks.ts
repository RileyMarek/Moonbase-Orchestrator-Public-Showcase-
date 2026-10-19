import { useDemoState } from '../demo/state';

export interface PoseBookmark { label: string; pose: number[]; visual_target: string; available: boolean; reason: string; }
export interface BookmarkList { items: Record<string, PoseBookmark>; revision: string; scope: string; }

export function usePoseBookmarks(_robotId: string, _environmentRevision?: string) {
  const data=useDemoState(s=>s.bookmarks);
  return {data,error:'',update:(bookmarks:BookmarkList)=>useDemoState.setState({bookmarks}),refresh:()=>{}};
}
