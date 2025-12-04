import { config as configDotenv } from "dotenv"
configDotenv()
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import sectionRoutes from "./routes/section.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import logRoutes from "./routes/log.routes.js";
import broadcastRoutes from "./routes/broadcast.routes.js";
import callLogRoutes from "./routes/callLog.routes.js";
import mongoose from 'mongoose';

const app = express();
const server = http.createServer(app)


const dbConnection = async () => {
   try {
      await mongoose.connect(process.env.MongoUrl)
      console.log("Db conected to " + process.env.MongoUrl)
   } catch (error) {
      console.log("Db error:" + error);

   }
}


dbConnection()
   .then(
      console.log("trying to connect with db ")
   )

const io = new Server(server, {
   cors: {
      origin: "*",
      methods: ["GET", "POST"],
   },

});


app.use(express.json());
app.use(cors({
   origin: "*",
   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
   allowedHeaders: ["Content-Type", "Authorization"],
})
)

app.use("/api", sectionRoutes);
app.use("/api", adminRoutes);
app.use("/api", logRoutes);
app.use("/api", broadcastRoutes);
app.use("/api", callLogRoutes);


let userSocketmap = [];

// WebRTC signaling
io.on("connection", Socket => {
   console.log("User connected:", Socket.id);

   Socket.on("register", (data) => {
      userSocketmap = userSocketmap.filter(user => user.id !== Socket.id);
      userSocketmap.push({ ...data, id: Socket.id });
      io.emit("users-online", userSocketmap.map(u => ({ email: u.email, sectionId: u.sectionId })));
   });



   // WebRTC signaling events
   Socket.on("call-user", (data) => {
      const targetUser = userSocketmap.find(u => u.email === data.to);
      console.log(`📞 [CALL] ${data.from} calling ${data.to}`)
      console.log(`📞 [CALL] Target user found:`, targetUser ? 'YES' : 'NO')
      console.log(`📞 [CALL] Call type: ${data.callType}`)

      if (targetUser) {
         io.to(targetUser.id).emit("incoming-call", {
            from: data.from,
            offer: data.offer,
            callType: data.callType
         });
         console.log(`✅ [CALL] Sent incoming-call to ${targetUser.email}`)
      } else {
         console.log(`❌ [CALL] Target user not found: ${data.to}`)
      }

   });



   Socket.on("call-accepted", (data) => {
      console.log(`✅ [ACCEPTED] Call accepted from ${data.from || 'unknown'} to ${data.to}`)
      const targetUser = userSocketmap.find(u => u.email === data.to);
      if (targetUser) {
         io.to(targetUser.id).emit("call-accepted", {
            answer: data.answer,
            from: data.from
         });
         console.log(`✅ [ACCEPTED] Sent call-accepted with answer to ${targetUser.email}`)
      } else {
         console.log(`❌ [ACCEPTED] Target user not found: ${data.to}`)
         // Also log the current users for debugging
         console.log(`📋 [DEBUG] Available users:`, userSocketmap.map(u => u.email))
      }
   });



   Socket.on("ice-candidate", (data) => {
      const targetUser = userSocketmap.find(u => u.email === data.to);
      console.log(`🧊 [ICE] Relaying ICE candidate to ${data.to}`)
      if (targetUser) {
         io.to(targetUser.id).emit("ice-candidate", {
            candidate: data.candidate
         });
         console.log(`✅ [ICE] Sent ICE candidate to ${targetUser.email}`)
      } else {
         console.log(`❌ [ICE] Target user not found: ${data.to}`)
      }
   });



   Socket.on("end-call", (data) => {
      console.log(`📴 [END] Call ended, notifying ${data.to}`)
      const targetUser = userSocketmap.find(u => u.email === data.to);
      if (targetUser) {
         io.to(targetUser.id).emit("call-ended");
         console.log(`✅ [END] Sent call-ended to ${targetUser.email}`)
      } else {
         console.log(`❌ [END] Target user not found: ${data.to}`)
      }
   });


   Socket.on("disconnect", () => {
      console.log("User disconnected:", Socket.id);
      userSocketmap = userSocketmap.filter(user => user.id !== Socket.id);
      io.emit("users-online", userSocketmap.map(u => ({ email: u.email, sectionId: u.sectionId })));
   });
})


server.listen(5000, '0.0.0.0', () => console.log('Signaling server running on port 5000'));