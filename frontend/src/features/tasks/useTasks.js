import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
