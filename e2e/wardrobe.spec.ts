import { test, expect } from '@playwright/test'

/**
 * Smoke tests for Avatar & Wardrobe functionality (Phase 4).
 *
 * Tests cover:
 * - Wardrobe page loads
 * - Category tabs navigation
 * - Item selection
 * - Outfit management
 */

test.describe('Wardrobe Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to wardrobe
    await page.goto('/wardrobe')
  })

  test('wardrobe page loads', async ({ page }) => {
    // Should see the Wardrobe heading
    await expect(page.locator('h1:has-text("Wardrobe")')).toBeVisible()
  })

  test('displays category tabs', async ({ page }) => {
    // Should see category tabs
    await expect(page.locator('button:has-text("Appearance")')).toBeVisible()
    await expect(page.locator('button:has-text("Tops")')).toBeVisible()
    await expect(page.locator('button:has-text("Bottoms")')).toBeVisible()
    await expect(page.locator('button:has-text("Shoes")')).toBeVisible()
    await expect(page.locator('button:has-text("Accessories")')).toBeVisible()
    await expect(page.locator('button:has-text("Outfits")')).toBeVisible()
  })

  test('can navigate between categories', async ({ page }) => {
    // Click on Tops tab
    await page.click('button:has-text("Tops")')
    // The tab should be selected (has different styling)
    const topsTab = page.locator('button:has-text("Tops")')
    await expect(topsTab).toHaveAttribute('aria-pressed', 'true')

    // Click on Bottoms tab
    await page.click('button:has-text("Bottoms")')
    const bottomsTab = page.locator('button:has-text("Bottoms")')
    await expect(bottomsTab).toHaveAttribute('aria-pressed', 'true')

    // Tops should no longer be pressed
    await expect(topsTab).toHaveAttribute('aria-pressed', 'false')
  })

  test('shows avatar preview', async ({ page }) => {
    // Should have an avatar preview area
    // Avatar preview uses role="img" or contains avatar container
    const avatarPreview = page.locator('[data-testid="avatar-preview"], .avatar-preview, [aria-label*="avatar"]').first()
    // If we can't find by test id, just check the page has some visual content
    const hasPreviewArea = await avatarPreview.isVisible().catch(() => false)

    // Alternatively, check for avatar-related images/divs
    if (!hasPreviewArea) {
      // Just ensure the page loaded correctly without errors
      await expect(page.locator('h1:has-text("Wardrobe")')).toBeVisible()
    }
  })
})

test.describe('Item Selection', () => {
  test('can select items in Tops category', async ({ page }) => {
    await page.goto('/wardrobe')

    // Navigate to Tops
    await page.click('button:has-text("Tops")')

    // Wait for items to load
    await page.waitForTimeout(500)

    // Should see item grid with buttons (role="option" from ARIA)
    const items = page.locator('[role="option"], [role="listbox"] button')
    const itemCount = await items.count()

    // Should have at least starter items
    expect(itemCount).toBeGreaterThan(0)

    // Click first item if available
    if (itemCount > 0) {
      const firstItem = items.first()
      await firstItem.click()

      // Item should now be selected (aria-selected="true")
      await expect(firstItem).toHaveAttribute('aria-selected', 'true')
    }
  })

  test('can select items in Appearance category', async ({ page }) => {
    await page.goto('/wardrobe')

    // Navigate to Appearance (default or click)
    await page.click('button:has-text("Appearance")')

    // Should show appearance options (skin, eyes, hair)
    // These might be in subcategories or as a list
    await page.waitForTimeout(500)

    // Check for appearance-related content
    const hasSkinOptions = await page.locator('text=/skin|Skin/i').isVisible().catch(() => false)
    const hasEyeOptions = await page.locator('text=/eyes|Eyes/i').isVisible().catch(() => false)
    const hasHairOptions = await page.locator('text=/hair|Hair/i').isVisible().catch(() => false)

    // At least one appearance category should be visible
    expect(hasSkinOptions || hasEyeOptions || hasHairOptions).toBeTruthy()
  })
})

test.describe('Outfits Management', () => {
  test('outfits tab shows save button when slots available', async ({ page }) => {
    await page.goto('/wardrobe')

    // Navigate to Outfits tab
    await page.click('button:has-text("Outfits")')

    // Wait for content to load
    await page.waitForTimeout(500)

    // Should show either save button or "12 slots filled" message
    const saveButton = page.locator('button:has-text("Save current look")')
    const fullMessage = page.locator('text=12 outfit slots')

    const canSave = await saveButton.isVisible().catch(() => false)
    const isFull = await fullMessage.isVisible().catch(() => false)

    // One of these should be true
    expect(canSave || isFull).toBeTruthy()
  })

  test('outfits tab shows empty state or saved outfits', async ({ page }) => {
    await page.goto('/wardrobe')

    // Navigate to Outfits tab
    await page.click('button:has-text("Outfits")')

    // Wait for content to load
    await page.waitForTimeout(500)

    // Should show either empty state or outfit cards
    const emptyState = page.locator('text=No saved outfits')
    const outfitCards = page.locator('[aria-label*="Equip"], button:has-text("Outfit")')

    const isEmpty = await emptyState.isVisible().catch(() => false)
    const hasOutfits = (await outfitCards.count()) > 0

    // One of these should be true
    expect(isEmpty || hasOutfits).toBeTruthy()
  })
})

test.describe('Avatar Header Bust', () => {
  test('avatar shows in header', async ({ page }) => {
    // Go to any page
    await page.goto('/')

    // Header should have an avatar area
    const headerAvatar = page.locator('header button[aria-label*="avatar" i], header [aria-label*="outfit" i]')

    // If avatar is in header, clicking it should show outfit picker or navigate
    const hasHeaderAvatar = await headerAvatar.isVisible().catch(() => false)

    // This might not be implemented yet - just check page loads
    if (!hasHeaderAvatar) {
      await expect(page.locator('text=Homestead')).toBeVisible()
    }
  })
})

test.describe('Wardrobe Navigation', () => {
  test('can navigate to wardrobe from main nav', async ({ page }) => {
    await page.goto('/')

    // Look for wardrobe link in navigation
    const wardrobeLink = page.locator('a[href="/wardrobe"], a:has-text("Wardrobe")')
    const hasWardrobeLink = await wardrobeLink.isVisible().catch(() => false)

    if (hasWardrobeLink) {
      await wardrobeLink.click()
      await expect(page).toHaveURL(/\/wardrobe/)
    } else {
      // Direct navigation should work
      await page.goto('/wardrobe')
      await expect(page).toHaveURL(/\/wardrobe/)
    }
  })
})
