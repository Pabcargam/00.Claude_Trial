/** Same names the API uses (`priority` field). Ordered from lowest to highest. */
export const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export const DEFAULT_PRIORITY = 'MEDIUM'

export function priorityLabel(value) {
  return PRIORITIES.find((p) => p.value === value)?.label ?? value
}
