import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getAppDay } from '@/lib/time'

interface BalanceData {
  balance: number
  todayCoins: number
}

async function fetchBalance(): Promise<BalanceData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get total balance
  const { data: balanceData, error: balanceError } = await supabase
    .from('coin_ledger')
    .select('amount')
    .eq('user_id', user.id)

  if (balanceError) {
    // Table may not exist yet - return zeros
    console.warn('coin_ledger query failed:', balanceError.message)
    return { balance: 0, todayCoins: 0 }
  }

  const balance = (balanceData as { amount: number }[] | null)?.reduce(
    (sum, row) => sum + row.amount,
    0
  ) ?? 0

  // Get today's coins (using 4am boundary)
  const { start, end } = getAppDayRange()

  const { data: todayData, error: todayError } = await supabase
    .from('coin_ledger')
    .select('amount')
    .eq('user_id', user.id)
    .gte('created_at', start)
    .lt('created_at', end)

  if (todayError) {
    console.warn('today coins query failed:', todayError.message)
    return { balance, todayCoins: 0 }
  }

  const todayCoins = (todayData as { amount: number }[] | null)?.reduce(
    (sum, row) => sum + row.amount,
    0
  ) ?? 0

  return { balance, todayCoins }
}

function getAppDayRange(): { start: string; end: string } {
  const now = new Date()
  const dayKey = getAppDay(now)

  // Parse day key back to date at 4am
  const [year, month, day] = dayKey.split('-').map(Number)
  const start = new Date(year, month - 1, day, 4, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export function useBalance() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['coinBalance'],
    queryFn: fetchBalance,
    staleTime: 1000 * 30, // 30 seconds
  })

  return {
    balance: data?.balance ?? 0,
    todayCoins: data?.todayCoins ?? 0,
    isLoading,
    error,
  }
}
