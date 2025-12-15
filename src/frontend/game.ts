import io from "socket.io-client";

const JOIN_GAME_ROOM = "join-game-room";
const LEAVE_GAME_ROOM = "leave-game-room";
const GAME_CHAT_MESSAGE = "game-chat-message";
const PLAYER_JOINED = "player-joined";
const PLAYER_LEFT = "player-left";

const gameId = parseInt(document.body.dataset.gameId || "0");

if (gameId) {
  const socket = io();

  socket.emit(JOIN_GAME_ROOM, gameId);

  socket.on(PLAYER_JOINED, ({ username }: { username: string }) => {
    console.log(`${username} joined the game`);
    // add UI updates here later
  });

  socket.on(PLAYER_LEFT, ({ username }: { username: string }) => {
    console.log(`${username} left the game`);
    // add UI updates here later
  });

  const chatInput = document.getElementById("game-chat-input") as HTMLInputElement;
  const chatMessages = document.getElementById("game-chat-messages");

  if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && chatInput.value.trim()) {
        socket.emit(GAME_CHAT_MESSAGE, {
          gameId,
          message: chatInput.value.trim(),
        });
        chatInput.value = "";
      }
    });
  }

  socket.on(GAME_CHAT_MESSAGE, ({ username, message }: { username: string; message: string }) => {
    if (chatMessages) {
      const messageDiv = document.createElement("div");
      messageDiv.className = "message";
      messageDiv.textContent = `${username}: ${message}`;
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });

  window.addEventListener("beforeunload", () => {
    socket.emit(LEAVE_GAME_ROOM, gameId);
  });
}