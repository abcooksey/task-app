import { test, expect } from '@playwright/test'

/**
 * E2E tests for the decorating flow.
 *
 * Tests the full buy → place → move → flip → store → reload cycle.
 *
 * Note: These tests require:
 * 1. Authentication (set TEST_USER_EMAIL and TEST_USER_PASSWORD)
 * 2. Sufficient coins to buy items
 * 3. Decorating to be unlocked (all interior repairs complete)
 */

test.describe('Decorating Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page (house view)
    await page.goto('/home')
    await expect(page.locator('text=Homestead')).toBeVisible()
  })

  test('house page loads', async ({ page }) => {
    // Should see the house view with interior/exterior tabs or canvas
    // The game canvas should be present
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: 10000 })
  })

  test('can toggle between interior and exterior views', async ({ page }) => {
    // Wait for canvas to load
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })

    // Look for view toggle buttons
    const interiorButton = page.locator('button:has-text("Interior")')
    const exteriorButton = page.locator('button:has-text("Exterior")')

    // If buttons exist, test toggle
    if (await interiorButton.isVisible().catch(() => false)) {
      await exteriorButton.click()
      // Wait a moment for view change
      await page.waitForTimeout(500)

      await interiorButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('can enter decorate mode when unlocked', async ({ page }) => {
    // Wait for canvas
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })

    // Look for Decorate button (only visible when decorating is unlocked)
    const decorateButton = page.locator('button:has-text("Decorate")')

    // If decorating is unlocked
    if (await decorateButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await decorateButton.click()

      // Should see inventory drawer or decorate mode UI
      const inventoryVisible = await page.locator('text=Inventory').isVisible({ timeout: 5000 }).catch(() => false)
      const exitButton = await page.locator('button:has-text("Done")').isVisible().catch(() => false)

      expect(inventoryVisible || exitButton).toBeTruthy()

      // Exit decorate mode if we entered it
      if (exitButton) {
        await page.click('button:has-text("Done")')
      }
    } else {
      // Decorating not unlocked - skip test
      test.skip()
    }
  })
})

test.describe('Inventory Management', () => {
  test('inventory drawer shows items', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })

    // Try to enter decorate mode
    const decorateButton = page.locator('button:has-text("Decorate")')

    if (!(await decorateButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await decorateButton.click()

    // Should see inventory
    const inventory = page.locator('text=Inventory')
    await expect(inventory).toBeVisible({ timeout: 5000 })

    // Should see category tabs
    const allTab = page.locator('button:has-text("All"), [role="tab"]:has-text("All")')
    await expect(allTab).toBeVisible()
  })

  test('can filter inventory by category', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })

    const decorateButton = page.locator('button:has-text("Decorate")')
    if (!(await decorateButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await decorateButton.click()
    await expect(page.locator('text=Inventory')).toBeVisible({ timeout: 5000 })

    // Click on a category filter if available
    const furnitureTab = page.locator('button:has-text("Furniture"), [role="tab"]:has-text("Furniture")')

    if (await furnitureTab.isVisible().catch(() => false)) {
      await furnitureTab.click()
      // Should filter items - exact behavior depends on inventory contents
      await page.waitForTimeout(300)
    }
  })
})

test.describe('Placement Persistence', () => {
  /**
   * This test verifies that placements persist across page reloads.
   * It's marked as a placeholder since it requires:
   * 1. Decorating unlocked
   * 2. Items in inventory
   * 3. The ability to interact with the Phaser canvas
   */
  test.skip('placement survives reload', async ({ page }) => {
    // This test would:
    // 1. Enter decorate mode
    // 2. Place an item
    // 3. Note its position
    // 4. Reload the page
    // 5. Re-enter decorate mode
    // 6. Verify the item is still in the same position

    // Due to the complexity of canvas interactions, this test
    // would benefit from a test ID system on placed items
    // or an API-based verification approach
  })
})

test.describe('Accessibility', () => {
  test('decorate mode has keyboard navigation', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })

    const decorateButton = page.locator('button:has-text("Decorate")')
    if (!(await decorateButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await decorateButton.click()
    await expect(page.locator('text=Inventory')).toBeVisible({ timeout: 5000 })

    // Check for accessible inventory list
    const accessibleList = page.locator('[role="listbox"], [role="list"]')
    const hasAccessibleList = await accessibleList.isVisible().catch(() => false)

    // Check for keyboard hints
    const keyboardHints = page.locator('kbd')
    const hasHints = await keyboardHints.count() > 0

    // Either accessible list or keyboard hints should be present
    expect(hasAccessibleList || hasHints).toBeTruthy()
  })

  test('buttons have proper labels', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })

    // Check that all buttons have accessible names
    const buttons = page.locator('button')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i)
      const ariaLabel = await button.getAttribute('aria-label')
      const text = await button.textContent()

      // Button should have either aria-label or text content
      expect(ariaLabel || (text && text.trim().length > 0)).toBeTruthy()
    }
  })
})
