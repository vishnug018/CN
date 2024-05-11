Sure, here's a README file for the NextGenCollab application with the necessary commands and information:

# NextGenCollab

NextGenCollab is a collaborative whiteboard application that allows multiple users to draw, create sticky notes, and vote on whiteboards in real-time. It utilizes Socket.IO for real-time communication and Redis for data persistence.

## Features

- Collaborative Whiteboard: Multiple users can join the same whiteboard and draw simultaneously.
- Drawing Tools: Users can draw using different tools like pen, line, box, circle, and eraser. They can also change the color of the pen.
- Sticky Notes: Users can create, edit, move, and delete sticky notes on the whiteboard.
- Undo/Redo: Users can undo and redo their drawing actions.
- Voting: Each whiteboard has upvote and downvote buttons, allowing users to vote on the content.
- Recent Boards: The landing page displays a list of recently created whiteboards.
- Data Persistence: The whiteboard data (line history, notes, votes) is stored in Redis, ensuring that the state is preserved even if the server restarts.

## Prerequisites

- Node.js (v12 or higher)
- Redis (or a Redis hosting service)

## Installation

1. Clone the repository:

```
git clone https://github.com/your-username/NextGenCollab.git
```

2. Install dependencies:

```
cd NextGenCollab
npm install
```

## Usage

1. Start the server:

```
npm start
```

The server will start running on `http://localhost:3000`.

2. Open your browser and navigate to `http://localhost:3000` to access the application.

## Commands

- `npm install`: Install project dependencies.
- `npm start`: Start the server.

The application will be accessible at `http://localhost:3000`.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
