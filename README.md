# Handball Goalkeeper Training Game

An interactive 2D game designed to train handball goalkeepers' reaction time and positioning skills.

## Features

- **Interactive 2D Goal**: Visual representation of a handball goal with realistic net pattern
- **Target System**: Randomly generated colored targets appear in the goal area
  - Green targets: +10 points when clicked
  - Red targets: -5 points when clicked (avoid these!)
- **Timer-based Gameplay**: 60-second rounds to test your reflexes
- **Difficulty Progression**: Targets spawn faster as the game progresses
- **Real-time Scoring**: Live score display during gameplay
- **Difficulty Levels**: Easy, Medium, and Hard settings
- **Sound Effects**: Audio feedback for hits and misses
- **Visual Feedback**: Animated effects when targets are hit

## How to Play

1. Click the "Start Game" button to begin
2. Watch for colored targets that appear in the goal area
3. Click on **GREEN** targets to earn points (+10)
4. Avoid clicking on **RED** targets (-5 points if clicked)
5. Try to achieve the highest score possible in 60 seconds!

## Controls

- **Start Game**: Begin the training session
- **Pause**: Temporarily stop the game
- **Reset**: Restart the game with zero score
- **Difficulty Selector**: Choose between Easy, Medium, or Hard
- **Sound Toggle**: Enable/disable audio effects

## Technical Details

Built with pure HTML5, CSS3, and JavaScript using:
- HTML5 Canvas for 2D graphics rendering
- Object-oriented JavaScript for game logic
- CSS3 for responsive styling
- Web Audio API for sound effects

## File Structure

```
handball-goalkeeper-game/
├── index.html          # Main HTML structure
├── css/
│   └── style.css       # Styling and layout
├── js/
│   ├── game.js         # Main game logic
│   ├── targets.js      # Target generation and management
│   └── ui.js           # User interface controls
└── README.md          # Documentation
```

## Requirements

- Modern web browser with HTML5 Canvas support
- JavaScript enabled

## Development

The game follows a modular architecture with separate concerns:
- `game.js`: Core game mechanics and main game loop
- `targets.js`: Target management system
- `ui.js`: User interface enhancements

## Future Enhancements

Potential features for future development:
- Multiplayer mode
- Different target shapes and sizes
- Power-ups and special effects
- Performance statistics and analytics
- Mobile touch support
- Different game modes (penalty shots, corner shots, etc.)

## License

This project is open source and available under the MIT License.