import { seed } from './seed'
import type { DiaryData } from './models'

const KEY = 'bvd_data_v1'

export function loadData(): DiaryData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DiaryData
  } catch (e) { /* ignore */ }
  const data = seed()
  saveData(data)
  return data
}

export function saveData(data: DiaryData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) { /* ignore */ }
}

export function uid(): string {
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}
