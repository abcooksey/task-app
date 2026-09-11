import { useState, useEffect, useCallback } from 'react'

type NotificationPermission = 'default' | 'granted' | 'denied'

const STORAGE_KEY = 'homestead-notifications-enabled'

interface ScheduledNotification {
  taskId: string
  title: string
  scheduledTime: Date
  timeoutId: number
}

// Keep track of scheduled notifications
const scheduledNotifications = new Map<string, ScheduledNotification>()

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)

      // Check if user has enabled notifications
      const savedEnabled = localStorage.getItem(STORAGE_KEY)
      setEnabled(savedEnabled === 'true' && Notification.permission === 'granted')
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        setEnabled(true)
        localStorage.setItem(STORAGE_KEY, 'true')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }, [isSupported])

  const toggleEnabled = useCallback((value: boolean) => {
    if (value && permission !== 'granted') {
      requestPermission()
    } else {
      setEnabled(value)
      localStorage.setItem(STORAGE_KEY, value.toString())

      // Clear all scheduled notifications if disabling
      if (!value) {
        clearAllScheduledNotifications()
      }
    }
  }, [permission, requestPermission])

  const showNotification = useCallback((title: string, options?: NotificationOptions): Notification | null => {
    if (!isSupported || !enabled || permission !== 'granted') {
      return null
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        ...options,
      })

      return notification
    } catch (error) {
      console.error('Failed to show notification:', error)
      return null
    }
  }, [isSupported, enabled, permission])

  const scheduleNotification = useCallback((
    taskId: string,
    title: string,
    scheduledTime: Date,
    body?: string
  ): boolean => {
    if (!isSupported || !enabled || permission !== 'granted') {
      return false
    }

    // Cancel any existing notification for this task
    cancelScheduledNotification(taskId)

    const now = new Date()
    const delay = scheduledTime.getTime() - now.getTime()

    // Don't schedule if the time has passed
    if (delay <= 0) {
      return false
    }

    // Don't schedule more than 24 hours in advance (browser limitations)
    if (delay > 24 * 60 * 60 * 1000) {
      return false
    }

    const timeoutId = window.setTimeout(() => {
      showNotification(title, {
        body: body || 'Time to work on this task!',
        tag: `task-${taskId}`,
        requireInteraction: true,
      })
      scheduledNotifications.delete(taskId)
    }, delay)

    scheduledNotifications.set(taskId, {
      taskId,
      title,
      scheduledTime,
      timeoutId,
    })

    return true
  }, [isSupported, enabled, permission, showNotification])

  const cancelScheduledNotification = useCallback((taskId: string) => {
    const scheduled = scheduledNotifications.get(taskId)
    if (scheduled) {
      window.clearTimeout(scheduled.timeoutId)
      scheduledNotifications.delete(taskId)
    }
  }, [])

  return {
    isSupported,
    permission,
    enabled,
    requestPermission,
    toggleEnabled,
    showNotification,
    scheduleNotification,
    cancelScheduledNotification,
  }
}

function clearAllScheduledNotifications() {
  for (const [, scheduled] of scheduledNotifications) {
    window.clearTimeout(scheduled.timeoutId)
  }
  scheduledNotifications.clear()
}

// Helper to parse time string (HH:mm) to today's date
export function parseTimeToDate(timeStr: string, dateStr?: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = dateStr ? new Date(dateStr) : new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Helper to format time for display
export function formatNotificationTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
