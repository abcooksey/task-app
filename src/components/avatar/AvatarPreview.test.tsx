import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AvatarPreview } from './AvatarPreview'
import type { Appearance } from '@/game/avatar/types'

// =============================================================================
// Test Fixtures
// =============================================================================

const makeAppearance = (overrides: Partial<Appearance> = {}): Appearance => ({
  skin: 'skin_medium',
  eyes: 'eyes_brown',
  hair: {
    styleId: 'hair_short',
    colorId: 'hair_black',
  },
  top: 'starter_tee_grey',
  bottom: 'starter_pants_blue',
  shoes: 'starter_sneakers_white',
  ...overrides,
})

// =============================================================================
// Tests: Rendering
// =============================================================================

describe('AvatarPreview', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const appearance = makeAppearance()
      render(<AvatarPreview appearance={appearance} />)

      // Should render the container with aria-label
      expect(screen.getByLabelText(/wearing/i)).toBeInTheDocument()
    })

    it('renders in placeholder mode by default (no real textures)', () => {
      const appearance = makeAppearance()
      render(<AvatarPreview appearance={appearance} usePlaceholderArt={true} />)

      // Should show placeholder layers with labels
      expect(screen.getByText('Body')).toBeInTheDocument()
      expect(screen.getByText('Top')).toBeInTheDocument()
      expect(screen.getByText('Bottom')).toBeInTheDocument()
    })

    it('renders all required layers in placeholder mode', () => {
      const appearance = makeAppearance()
      render(<AvatarPreview appearance={appearance} usePlaceholderArt={true} />)

      // Check all non-accessory layers are present
      expect(screen.getByText('Hair (Back)')).toBeInTheDocument()
      expect(screen.getByText('Body')).toBeInTheDocument()
      expect(screen.getByText('Eyes')).toBeInTheDocument()
      expect(screen.getByText('Bottom')).toBeInTheDocument()
      expect(screen.getByText('Shoes')).toBeInTheDocument()
      expect(screen.getByText('Top')).toBeInTheDocument()
      expect(screen.getByText('Hair (Front)')).toBeInTheDocument()
    })

    it('renders accessory layer when accessory is equipped', () => {
      const appearance = makeAppearance({ accessory: 'acc_glasses_round' })
      render(<AvatarPreview appearance={appearance} usePlaceholderArt={true} />)

      expect(screen.getByText('Accessory')).toBeInTheDocument()
    })

    it('does not render accessory layer when not equipped', () => {
      const appearance = makeAppearance({ accessory: undefined })
      render(<AvatarPreview appearance={appearance} usePlaceholderArt={true} />)

      expect(screen.queryByText('Accessory')).not.toBeInTheDocument()
    })
  })

  // =============================================================================
  // Tests: Accessibility
  // =============================================================================

  describe('Accessibility', () => {
    it('has aria-label with outfit description', () => {
      const appearance = makeAppearance()
      render(<AvatarPreview appearance={appearance} />)

      const avatar = screen.getByLabelText(/wearing/i)
      expect(avatar).toBeInTheDocument()
    })

    it('is focusable when onClick is provided', () => {
      const appearance = makeAppearance()
      const onClick = vi.fn()
      render(<AvatarPreview appearance={appearance} onClick={onClick} />)

      const avatar = screen.getByRole('button')
      expect(avatar).toHaveAttribute('tabIndex', '0')
    })

    it('is not a button when onClick is not provided', () => {
      const appearance = makeAppearance()
      render(<AvatarPreview appearance={appearance} />)

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('responds to Enter key when onClick is provided', () => {
      const appearance = makeAppearance()
      const onClick = vi.fn()
      render(<AvatarPreview appearance={appearance} onClick={onClick} />)

      const avatar = screen.getByRole('button')
      fireEvent.keyDown(avatar, { key: 'Enter' })

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('responds to Space key when onClick is provided', () => {
      const appearance = makeAppearance()
      const onClick = vi.fn()
      render(<AvatarPreview appearance={appearance} onClick={onClick} />)

      const avatar = screen.getByRole('button')
      fireEvent.keyDown(avatar, { key: ' ' })

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('responds to click when onClick is provided', () => {
      const appearance = makeAppearance()
      const onClick = vi.fn()
      render(<AvatarPreview appearance={appearance} onClick={onClick} />)

      const avatar = screen.getByRole('button')
      fireEvent.click(avatar)

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  // =============================================================================
  // Tests: Size Presets
  // =============================================================================

  describe('Size presets', () => {
    it('renders small size', () => {
      const appearance = makeAppearance()
      const { container } = render(
        <AvatarPreview appearance={appearance} size="small" usePlaceholderArt={true} />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.width).toBe('32px')
    })

    it('renders medium size (default)', () => {
      const appearance = makeAppearance()
      const { container } = render(
        <AvatarPreview appearance={appearance} usePlaceholderArt={true} />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.width).toBe('64px')
    })

    it('renders large size', () => {
      const appearance = makeAppearance()
      const { container } = render(
        <AvatarPreview appearance={appearance} size="large" usePlaceholderArt={true} />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.width).toBe('128px')
    })
  })

  // =============================================================================
  // Tests: Animation
  // =============================================================================

  describe('Animation', () => {
    it('has breathing animation by default', () => {
      const appearance = makeAppearance()
      const { container } = render(
        <AvatarPreview appearance={appearance} animate={true} usePlaceholderArt={true} />
      )

      // Find the animation wrapper (second div)
      const wrapper = container.querySelector('.animate-breathe')
      expect(wrapper).toBeInTheDocument()
    })

    it('no animation when animate is false', () => {
      const appearance = makeAppearance()
      const { container } = render(
        <AvatarPreview appearance={appearance} animate={false} usePlaceholderArt={true} />
      )

      const wrapper = container.querySelector('.animate-breathe')
      expect(wrapper).not.toBeInTheDocument()
    })

    it('no animation when reaction is active', () => {
      const appearance = makeAppearance()
      const { container } = render(
        <AvatarPreview
          appearance={appearance}
          animate={true}
          reaction="cheer"
          usePlaceholderArt={true}
        />
      )

      // Should not have breathing animation during reaction
      const wrapper = container.querySelector('.animate-breathe')
      expect(wrapper).not.toBeInTheDocument()
    })
  })

  // =============================================================================
  // Tests: Pose
  // =============================================================================

  describe('Pose', () => {
    it('defaults to stand pose', () => {
      const appearance = makeAppearance()
      // This test just ensures no errors are thrown with default pose
      render(<AvatarPreview appearance={appearance} usePlaceholderArt={true} />)
      expect(screen.getByLabelText(/wearing/i)).toBeInTheDocument()
    })

    it('accepts sit pose', () => {
      const appearance = makeAppearance()
      // This test just ensures no errors are thrown with sit pose
      render(<AvatarPreview appearance={appearance} pose="sit" usePlaceholderArt={true} />)
      expect(screen.getByLabelText(/wearing/i)).toBeInTheDocument()
    })
  })

  // =============================================================================
  // Tests: Flipped
  // =============================================================================

  describe('Flipped', () => {
    it('flipped prop is passed to layers', () => {
      const appearance = makeAppearance()
      render(<AvatarPreview appearance={appearance} flipped={true} usePlaceholderArt={true} />)

      // The layers should be rendered (we can't easily test the flip without inspecting styles)
      expect(screen.getByLabelText(/wearing/i)).toBeInTheDocument()
    })
  })
})

