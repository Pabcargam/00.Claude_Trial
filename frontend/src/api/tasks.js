import { apiClient } from './client'

// A TODO list is small: load it in one page (the API caps page_size at 200).
const PAGE_SIZE = 200

/** filters: { status: 'all'|'open'|'done', priority: ''|'LOW'..'URGENT', search: string } */
export async function fetchTasks({ status = 'all', priority = '', search = '' } = {}) {
  const params = { page_size: PAGE_SIZE }
  if (status !== 'all') params.completed = status === 'done'
  if (priority) params.priority = priority
  if (search.trim()) params.search = search.trim()
  const { data } = await apiClient.get('/tasks/', { params })
  return data.results
}

export async function createTask(task) {
  const { data } = await apiClient.post('/tasks/', task)
  return data
}

export async function updateTask(id, changes) {
  const { data } = await apiClient.patch(`/tasks/${id}/`, changes)
  return data
}

export async function deleteTask(id) {
  await apiClient.delete(`/tasks/${id}/`)
}
