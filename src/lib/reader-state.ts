/** Reader UI state shared by the reader, its blocks and the HoverLayer. */
import { keyedStore, persistedFlag } from '@/lib/store';
import { SLUG } from '@/lib/data';

/** The open citation fold-out per block (one per paragraph, DESIGN-SYSTEM §4). */
export const foldouts = keyedStore<number | null>(null);
/** Whether a block's change list is open. */
export const changeLists = keyedStore<boolean>(false);
/** "Show what was checked" (KICKOFF §4b): off by default, persisted. */
export const showChecked = persistedFlag(`bx-checked:${SLUG}`, false);
/** "Substantive changes only" for the change markers, persisted. */
export const substantiveOnly = persistedFlag(`bx-substantive:${SLUG}`, false);
