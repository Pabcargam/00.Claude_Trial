import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../api/health'
import styles from './HealthBadge.module.css'

const REFRESH_MS = 30_000

function describe({ data, isPending, isError }) {
  if (isPending) return { tone: 'pending', label: 'Checking API…' }
  if (isError) return { tone: 'error', label: 'API unreachable' }
  if (data.status === 'ok') return { tone: 'ok', label: 'API online' }
  const failing = Object.entries(data)
    .filter(([key, value]) => key !== 'status' && value === 'error')
    .map(([key]) => key)
  return { tone: 'warn', label: `API degraded (${failing.join(', ')})` }
}

export default function HealthBadge() {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: REFRESH_MS,
    retry: false,
  })
  const { tone, label } = describe(query)

  return (
    <span className={`${styles.badge} ${styles[tone]}`} role="status">
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  )
}
