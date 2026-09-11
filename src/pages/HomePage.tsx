import HouseGame from '@/game/HouseGame'

/**
 * Home page - displays the house repair game
 *
 * The game is wrapped in a full-height container that takes up
 * all available space in the layout.
 */
export default function HomePage() {
  return (
    <div className="h-[calc(100vh-8rem)] -mx-4 -my-4">
      <HouseGame />
    </div>
  )
}
