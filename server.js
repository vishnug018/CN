const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const { v1: uuidv1 } = require("uuid");
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname + "/public"));
app.get("/board/*", (req, res, next) => {
  res.sendFile(__dirname + "/public/board.html");
});

const Redis = require("ioredis");
const REDIS_PREFIX = process.env.REDIS_PREFIX || "whiteboard-";
const REDIS_TTL_SEC = process.env.REDIS_TTL_SEC || 30 * 24 * 60 * 60; // default: 30 days
const { REDIS_URL } = process.env;
let redis;
if (REDIS_URL) {
  console.log(
    'connect to ${REDIS_URL}. prefix=${REDIS_PREFIX} ttl=${REDIS_TTL_SEC}'
  );
  redis = new Redis(REDIS_URL);
}

const boards = {};

const saveLimitter = {};
async function saveBoard(boardId) {
  if (!redis || saveLimitter[boardId]) return;

  saveLimitter[boardId] = setTimeout(() => {
    redis.set(
      REDIS_PREFIX + "board-" + boardId,
      JSON.stringify(boards[boardId]),
      "ex",
      REDIS_TTL_SEC
    );
    delete saveLimitter[boardId];
    console.log("saveBoard", { boardId });
  }, 3000);
}
async function load() {
  if (redis) {
    const prefix = REDIS_PREFIX + "board-";
    const keys = await redis.keys(prefix + "*");
    for (const key of keys) {
      const boardId = key.replace(prefix, "");
      boards[boardId] = JSON.parse(await redis.get(key));
      console.log("load", { boardId });
    }
  }
}
load();

// function for dynamic sorting
function compareValues(key, order = "asc") {
  return function (a, b) {
    if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
      // property doesn't exist on either object
      return 0;
    }

    const varA = typeof a[key] === "string" ? a[key].toUpperCase() : a[key];
    const varB = typeof b[key] === "string" ? b[key].toUpperCase() : b[key];

    let comparison = 0;
    if (varA > varB) {
      comparison = 1;
    } else if (varA < varB) {
      comparison = -1;
    }
    return order == "desc" ? comparison * -1 : comparison;
  };
}

function onConnection(socket) {
  const { boardId } = socket.handshake.query;
  let lineHist = [];
  let noteList = {};
  let upvote=0;
  let downvote=0;
  pin=1234;
  if (boardId && boards[boardId]) {
    lineHist = boards[boardId].lineHist;
    noteList = boards[boardId].noteList;
    upvote=boards[boardId].upvote;
    downvote=boards[boardId].downvote;
  }
  socket.join(boardId);
  console.log("onConnection", { id: socket.id, boardId });

  socket.on("createBoard", (data, ack) => {
    const boardId = uuidv1();
    boards[boardId] = {
      lineHist: [],
      noteList: {},
      upvote:0, 
      downvote:0,
      createdTimestamp: new Date().getTime(),
      boardId,
      pin,
    };
    ack({ boardId });
    saveBoard(boardId);
  });
  socket.on("load", (data, ack) => {
    if (!boardId || !boards[boardId]) {
      ack({ status: "NOT_FOUND" });
    }
    ack({ status: "OK", ...boards[boardId] });
  });

  socket.on("drawLine", (data) => {
    lineHist.push(data);
    socket.broadcast.to(boardId).emit("drawLine", data);
    saveBoard(boardId);
  });

  socket.on("hideLine", (data) => {
    for (const line of lineHist) {
      if (line.id === data.id) {
        line.hidden = data.hidden;
      }
    }
    io.to(boardId).emit("redraw", boards[boardId]);
    saveBoard(boardId);
  });
  socket.on("sendpin", givenpin=>{
    io.to(boardId).emit("updatedpin", boards[boardId].pin);
  })
  socket.on("updatepin", (pin) => { 
    console.log(pin);
    boards[boardId].pin=pin;
    console.log(boards[boardId].pin);
    io.to(boardId).emit("updatedpin", boards[boardId].pin);
    saveBoard(boardId);
  });
  socket.on("upvote", (data) => { 
    boards[boardId].upvote=boards[boardId].upvote+1;
    console.log(upvote,downvote, "upvote");
    io.to(boardId).emit("updateupvote", boards[boardId].upvote);
    saveBoard(boardId);
  });
  socket.on("revokeupvote", (data) => { 
    boards[boardId].upvote=boards[boardId].upvote-1;
    console.log(upvote,downvote,"rup");
    io.to(boardId).emit("updateupvote", boards[boardId].upvote);
    saveBoard(boardId);
  });
  socket.on("downvote", (data) => {
    boards[boardId].downvote=boards[boardId].downvote-1;
    console.log(upvote,downvote, "downvote");
    io.to(boardId).emit("updatedownvote", boards[boardId].downvote);
    saveBoard(boardId);
  });
  socket.on("revokedownvote", (data) => {
    boards[boardId].downvote=boards[boardId].downvote+1;
    console.log(upvote,downvote,"rdown");
    io.to(boardId).emit("updatedownvote", boards[boardId].downvote);
    saveBoard(boardId);
  });
  socket.on("updateNote", (data) => {
    noteList[data.id] = { ...noteList[data.id], ...data };
    socket.broadcast.to(boardId).emit("updateNote", noteList[data.id]);
    saveBoard(boardId);
  });
  socket.on("setvote" , (upp,down) =>{
    upvote=upp;
    downvote=down;
    io.to(boardId).emit("updateupvote", upvote);
    io.to(boardId).emit("updatedownvote", downvote);
  });

  socket.on("hideNote", (data) => {
    noteList[data.id].hidden = data.hidden;
    io.to(boardId).emit("hideNote", data);
    saveBoard(boardId);
  });

  socket.on("clearBoard", (data, ack) => {
    boards[boardId] = { lineHist: [], noteList: {} };
    ack({ status: "OK" });
    socket.broadcast.to(boardId).emit("clearBoard");
    saveBoard(boardId);
  });

  socket.on("recentBoards", (data, ack) => {
    const list = Object.values(boards);
    ack(
      list
        .filter((b) => b.createdTimestamp)
        .sort(compareValues("createdTimestamp", "desc"))
        .slice(0, 9)
    );
  });
}
io.on("connection", onConnection);

http.listen(PORT, () => console.log("listening on port " + PORT));