const { getCurrentUser, userLeave, userJoin, getAllPlayersInGame, setPlayerToReady } = require("../dummyuser");

export default app => {

    const io = require("socket.io")(app, {
        cors: {
            origin: "http://localhost:3005",
            methods: ["GET", "POST"]
        }
    });

    //can store players in an array for now 
    //https://github.com/RishabhVerma098/gameappBackend/blob/master/server.js
    io.on("connection", async (socket) => {

        console.log("New connection");

        socket.on("createNewLobbyEvent", data => {
            const { gameId } = data.query;
            console.log(`Creating a new game with id of ${gameId}`);
            socket.join(gameId);
        });

        socket.on("newPlayerLobbyEvent", data => {
            const { gameId, userName } = data.query;

            //* if the game doesn't exist yet then return a failure
            //* we only want users to create rooms from the 'new game' button
            if (!gameExists(gameId)) {
                //TODO error message to the client
                console.log("game doesn't exist yet, cancelling game join");
                return;
            }

            //* create user and put into temp storage (object for now, db soon)
            const user = userJoin(socket.id, userName, gameId);

            socket.join(user.gameId);
            const playersInGame = getAllPlayersInGame(gameId);
            console.log('Game ' + gameId + ' had player ' + userName + ' join');

            io.in(gameId).emit("newPlayerLobbyEvent", {
                userId: user.id,
                userName: user.userName,
                text: `${user.userName} has joined the game`,
                playersInGame: playersInGame
            });
        });

        socket.on("playerReadyEvent", () => {
            //* get user
            const user = getCurrentUser(socket.id);

            if (!user) {
                console.error(`No user found with socket id of ${socket.id}`);
                return;
            }

            setPlayerToReady(socket.id);

            console.log(`Player ${user.userName} is now ready in game ${user.gameId}`);
            const playersInGame = getAllPlayersInGame(user.gameId);

            //* emit message to all users that the player is ready
            io.in(user.gameId).emit("playerReadyEvent", {
                playersInGame
            });

        });

        socket.on("startNewGameEvent", (data: any) => {

            const { gameId } = data.query;

            if (!gameExists(gameId)) {
                //TODO error message to the client
                console.log("game doesn't exist yet, cancelling game start");
                return;
            }
            
            // start up a new game
            const playersInGame = getAllPlayersInGame(gameId);

            console.log(`Starting game with id of ${gameId}`);

            io.in(gameId).emit("gameStartedEvent", { playersInGame });
        });

        // Disconnect , when user leaves game
        socket.on("disconnect", () => {
            // delete user from users & emit that user has left the game
            const user = userLeave(socket.id);

            if (user) {
                console.log(`User ${user.userName} left the game`);

                io.to(user.gameId).emit("message", {
                    userId: user.id,
                    userName: user.userName,
                    text: `${user.userName} has left the game`,
                });
            }
        });

    });

    const gameExists = (gameId: string) => {
        return io.sockets.adapter.rooms.get(gameId);
    }

}