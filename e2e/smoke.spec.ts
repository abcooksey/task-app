import { test, expect } from '@playwright/test'

/**
 * Smoke tests for critical user flows.
 *
 * Note: These tests require authentication. Set TEST_USER_EMAIL and
 * TEST_USER_PASSWORD environment variables before running.
 */

test.describe('App Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home
    await page.goto('/')
  })

  test('homepage loads', async ({ page }) => {
    // Should see the header
    await expect(page.locator('text=Homestead')).toBeVisible()
  })

  test('navigation works', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('text=Homestead')).toBeVisible()

    // Navigate to Store
    await page.click('text=Store')
    await expect(page).toHaveURL(/\/store/)

    // Navigate to Home (house)
    await page.click('a[aria-label="Home"]')
    await expect(page).toHaveURL(/\/home/)

    // Navigate to Tasks
    await page.click('text=Tasks')
    await expect(page).toHaveURL(/\/tasks/)

    // Navigate to Settings
    await page.click('text=Settings')
    await expect(page).toHaveURL(/\/settings/)

    // Navigate back to Today
    await page.click('text=Today')
    await expect(page).toHaveURL('/')
  })
})

test.describe('Focus Timer', () => {
  test('can start and stop a focus session', async ({ page }) => {
    // Navigate to focus page
    await page.goto('/focus')

    // Should see Focus Timer heading
    await expect(page.locator('text=Focus Timer')).toBeVisible()

    // Should see preset buttons
    await expect(page.locator('text=10 min')).toBeVisible()
    await expect(page.locator('text=25 min')).toBeVisible()
    await expect(page.locator('text=50 min')).toBeVisible()

    // Click 10 min preset
    await page.click('text=10 min')

    // Start session button should show selected duration
    const startButton = page.locator('button:has-text("Start 10 minute session")')
    await expect(startButton).toBeVisible()

    // Start the session
    await startButton.click()

    // Should see timer display (either "remaining" or time display)
    await expect(page.locator('text=remaining')).toBeVisible({ timeout: 5000 })

    // Should see Pause and Stop buttons
    await expect(page.locator('button:has-text("Pause")')).toBeVisible()
    await expect(page.locator('button:has-text("Stop")')).toBeVisible()

    // Stop the session
    await page.click('button:has-text("Stop")')

    // Should see completion state with New Session button
    await expect(page.locator('button:has-text("New Session")')).toBeVisible({ timeout: 5000 })
  })

  test('shows coins earned on stop', async ({ page }) => {
    await page.goto('/focus')

    // Start a 10 min session
    await page.click('text=10 min')
    await page.click('button:has-text("Start 10 minute session")')

    // Wait for timer to start
    await expect(page.locator('text=remaining')).toBeVisible({ timeout: 5000 })

    // Stop immediately (will have 0 coins)
    await page.click('button:has-text("Stop")')

    // Should see coins earned display
    await expect(page.locator('text=/\\d+ earned/')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Store', () => {
  test('store page loads sections', async ({ page }) => {
    await page.goto('/store')

    // Should see store sections
    await expect(page.locator('text=Mystery Box')).toBeVisible()

    // Should see item cards (either "New this week" or "Always available")
    const hasItems = await page.locator('.grid button').count() > 0 ||
                     await page.locator('text=Always available').isVisible().catch(() => false)

    expect(hasItems || await page.locator('text=New this week').isVisible().catch(() => false)).toBeTruthy()
  })

  test('mystery box shows state', async ({ page }) => {
    await page.goto('/store')

    // Mystery box should show either "Open" or "Come back tomorrow"
    const canOpen = await page.locator('button:has-text("Open for")').isVisible().catch(() => false)
    const alreadyOpened = await page.locator('text=Come back tomorrow').isVisible().catch(() => false)
    const needCoins = await page.locator('text=/Need \\d+ more coins/').isVisible().catch(() => false)

    expect(canOpen || alreadyOpened || needCoins).toBeTruthy()
  })
})

test.describe('Settings', () => {
  test('can access export functionality', async ({ page }) => {
    await page.goto('/settings')

    // Should see Data section
    await expect(page.locator('text=Data')).toBeVisible()

    // Should see export button
    await expect(page.locator('button:has-text("Export JSON")')).toBeVisible()

    // Should see import button
    await expect(page.locator('button:has-text("Import JSON")')).toBeVisible()
  })
})
