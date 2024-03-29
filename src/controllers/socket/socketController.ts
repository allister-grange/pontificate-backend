import { Server } from 'socket.io';
import * as SOCKET_MESSAGES from '../../constants/socketMessages';
import {
  addPointToPlayer,
  connectPlayer,
  disconnectPlayer,
  doesGameExistEvent,
  doesUserNameExist, getCurrentPlayersInGameEvent, newPlayerLobbyEvent, skipWordEvent, startNewGameEvent,
} from './gameController';
import { createNewLobbyEvent, playerReadyEvent, setPlayerTurnStatusInGame, endPlayersTurn, swapSkippedWordForPlayer } from './playerController';

export default (io: Server) => {
  io.on('connection', async (socket) => {
    // game events
    socket.on(SOCKET_MESSAGES.CREATE_NEW_LOBBY_EVENT, (data) => createNewLobbyEvent(socket, data));
    socket.on(SOCKET_MESSAGES.NEW_PLAYER_LOBBY_EVENT,
      (data) => newPlayerLobbyEvent(io, socket, data));
    socket.on(SOCKET_MESSAGES.GET_CURRENT_PLAYERS_IN_GAME_EVENT,
      (data) => getCurrentPlayersInGameEvent(io, socket, data));
    socket.on(SOCKET_MESSAGES.DOES_GAME_EXIST_EVENT,
      (data) => doesGameExistEvent(io, socket, data));
    socket.on(SOCKET_MESSAGES.START_NEW_GAME_EVENT, (data) => startNewGameEvent(io, socket, data));
    socket.on(SOCKET_MESSAGES.DOES_USERNAME_EXIST_EVENT, (data) => doesUserNameExist(socket, data));
    socket.on(SOCKET_MESSAGES.DISCONNECT, () => disconnectPlayer(io, socket));
    socket.on(SOCKET_MESSAGES.REJOIN_PLAYER, (data) => connectPlayer(io, socket, data));
    socket.on(SOCKET_MESSAGES.SKIP_WORD_EVENT, (data) => skipWordEvent(io, socket, data));
    socket.on(SOCKET_MESSAGES.PLAYERS_TURN_OVER, (data) => endPlayersTurn(io, socket, data));

    // player events
    socket.on(SOCKET_MESSAGES.PLAYER_READY_EVENT, (data) => playerReadyEvent(io, socket, data));
    socket.on(SOCKET_MESSAGES.ADD_POINT_TO_PLAYER_EVENT,
      (data) => addPointToPlayer(io, data));
    socket.on(SOCKET_MESSAGES.SET_PLAYER_TURN_STATUS,
      (data) => setPlayerTurnStatusInGame(io, socket, data));
    socket.on(SOCKET_MESSAGES.SWAPPED_SKIP_WORD_EVENT,
      (data) => swapSkippedWordForPlayer(io, socket, data));
  });
};
