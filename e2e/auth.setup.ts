import { test as setup, expect } from '@playwright/test'

/**
 * Authentication setup for e2e tests.
 *
 * This file handles logging in once and saving the auth state
 * for reuse across all tests.
 *
 * To use:
 * 1. Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables
 * 2. Run tests with: npx playwright test
 *
 * The auth state is saved to .playwright/auth/user.json
 */

const authFile = '.playwright/auth/user.json'

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!email || !password) {
    console.warn('TEST_USER_EMAIL and TEST_USER_PASSWORD not set. Skipping auth setup.')
    console.warn('Tests requiring auth will fail. Set these env vars for full testing.')
    return
  }

  // Navigate to the app
  await page.goto('/')

  // Wait for auth UI to load
  // The app should show a sign-in form when not authenticated
  const emailInput = page.locator('input[type="email"]')

  // If we're already logged in, skip
  if (!(await emailInput.isVisible({ timeout: 5000 }).catch(() => false))) {
    // Save empty state - we're already logged in
    await page.context().storageState({ path: authFile })
    return
  }

  // Fill in credentials
  await emailInput.fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()

  // Wait for redirect to main app (should see Today page or similar)
  await expect(page.locator('text=Today')).toBeVisible({ timeout: 10000 })

  // Save auth state
  await page.context().storageState({ path: authFile })
})
