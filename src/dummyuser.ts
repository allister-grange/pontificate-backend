// TODO need to replace this with some sort of db
const users = [];

// Join user to chat
function userJoin(id, userName, game, isReady) {
  const user = { id, userName, game, isReady };

  users.push(user);
  console.log(users, "users");

  return user;
}

// Get current user
function getCurrentUser(id) {
  return users.find((user) => user.id === id);
}

function getAllPlayersInGame(gameId: string): any[] {
    return users.filter((user) => user.game === gameId);
}

// User leaves chat
function userLeave(id) {
  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getAllPlayersInGame
};