console.log("📦 Starting backend server...");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Document = require("./models/Document");
const app = express();
const server = http.createServer(app);
app.use(cors());
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});
mongoose.connect("mongodb://127.0.0.1:27017/collab-docs")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

io.on("connection", socket => {
  console.log("🔌 A client connected:", socket.id);

  socket.on("get-document", async documentId => {
    if (!documentId) return;

    console.log(`📄 Loading document: ${documentId}`);

    try {
      let document = await Document.findById(documentId);
      if (!document) {
        document = await Document.create({ _id: documentId, data: "" });
        console.log("🆕 New document created.");
      }

      socket.join(documentId);
      socket.emit("load-document", document.data);

      socket.on("send-changes", delta => {
        socket.broadcast.to(documentId).emit("receive-changes", delta);
      });

      socket.on("save-document", async data => {
        await Document.findByIdAndUpdate(documentId, { data });
        console.log(`💾 Document ${documentId} saved.`);
      });

    } catch (err) {
      console.error("❌ Error handling document:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});