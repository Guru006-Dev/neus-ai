import { useSyncExternalStore } from 'react'
import { localRuns, type LocalRunEntry } from '../data/localRuns'

const EMPTY: LocalRunEntry[] = []
export const useLocalRuns = (): LocalRunEntry[] => useSyncExternalStore(localRuns.subscribe, localRuns.list, () => EMPTY)
