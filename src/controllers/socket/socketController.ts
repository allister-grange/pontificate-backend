import { ADD_POINT_TO_PLAYER_EVENT, CREATE_NEW_LOBBY_EVENT, DISCONNECT, DOES_GAME_EXIST_EVENT, DOES_USERNAME_EXIST_EVENT, GET_CURRENT_PLAYERS_IN_GAME_EVENT, NEW_PLAYER_LOBBY_EVENT, PLAYER_READY_EVENT, SET_PLAYER_TURN_STATUS, START_NEW_GAME_EVENT } from "../../constants/socketMessages";
import { addPointToPlayer, disconnectPlayer, doesGameExistEvent, doesUserNameExist, getCurrentPlayersInGameEvent, newPlayerLobbyEvent, startNewGameEvent } from "./gameController";
import { createNewLobbyEvent, playerReadyEvent, setPlayerTurnStatusInGame } from "./playerController";

export default app => {

  const io = require("socket.io")(app, {
    cors: {
      origin: ['http://localhost:3005', 'http://192.168.1.84:3005'],
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", async (socket) => {

    // game events
    socket.on(CREATE_NEW_LOBBY_EVENT, data => createNewLobbyEvent(socket, data));
    socket.on(NEW_PLAYER_LOBBY_EVENT, data => newPlayerLobbyEvent(io, socket, data));
    socket.on(GET_CURRENT_PLAYERS_IN_GAME_EVENT, data => getCurrentPlayersInGameEvent(io, socket, data));
    socket.on(DOES_GAME_EXIST_EVENT, data => doesGameExistEvent(io, socket, data));
    socket.on(START_NEW_GAME_EVENT, data => startNewGameEvent(io, socket, data));
    socket.on(DOES_USERNAME_EXIST_EVENT, data => doesUserNameExist(socket, data));
    socket.on(DISCONNECT, () => disconnectPlayer(io, socket));
    
    // player events
    socket.on(PLAYER_READY_EVENT, data => playerReadyEvent(io, socket, data));
    socket.on(ADD_POINT_TO_PLAYER_EVENT, data => addPointToPlayer(io, socket, data));
    socket.on(SET_PLAYER_TURN_STATUS, data => setPlayerTurnStatusInGame(io, socket, data));
  });
}
