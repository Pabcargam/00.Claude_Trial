import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createTask, deleteTask, fetchTasks, updateTask } from '../../api/tasks'

const TASKS = 'tasks'

/** The task list for the given filters. Keeps showing the previous list while filters change. */
export function useTasks(filters) {
  return useQuery({
    queryKey: [TASKS, filters],
    queryFn: () => fetchTasks(filters),
    placeholderData: keepPreviousData,
  })
}

const OPEN_TASKS = { status: 'open', priority: '', search: '' }

/**
 * Open outdoor tasks with a due date, counted per date ("YYYY-MM-DD" → count), for the
 * forecast's rain warnings. Same key shape as useTasks, so writes refresh it too.
 */
export function useOpenOutdoorTasksByDate({ enabled = true } = {}) {
  const { data } = useQuery({
    queryKey: [TASKS, OPEN_TASKS],
    queryFn: () => fetchTasks(OPEN_TASKS),
    enabled,
  })
  return useMemo(() => {
    const counts = new Map()
    for (const task of data ?? []) {
      if (task.is_outdoor && task.due_date) {
        counts.set(task.due_date, (counts.get(task.due_date) ?? 0) + 1)
      }
    }
    return counts
  }, [data])
}

// Every write refetches the lists: the server owns the ordering (open, then most urgent).
function useTaskMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS] }),
  })
}

export const useCreateTask = () => useTaskMutation(createTask)
export const useUpdateTask = () => useTaskMutation(({ id, changes }) => updateTask(id, changes))
export const useDeleteTask = () => useTaskMutation(deleteTask)
