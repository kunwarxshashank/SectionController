import { config as configDotenv } from "dotenv"
configDotenv()
import express from 'express'
import http  from'http'
import { Server } from 'socket.io' 
import cors  from 'cors'
import sectionRoutes from "./routes/section.routes.js";

import adminRoutes from "./routes/admin.routes.js";

import logRoutes from "./routes/log.routes.js";

import mongoose from 'mongoose' ; 

const app = express() ;
const server = http.createServer(app)

const dbConnection = async () => {
    try {
       await mongoose.connect(process.env.MongoUrl)
       
        console.log("Db conected")
    } catch (error) {
        console.log( "Db error:"+ error);
        
    }
}

dbConnection()
.then(
   console.log("trying to connect with db ")
)

const io = new Server(server, {
  cors: { origin: process.env.URL , 
     methods:["GET" , "POST"],
  credentials: false
   },
 
});
app.use(express.json());
app.use(cors({
  
  origin:  process.env.URL ,
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}) 
)

app.use("/api", sectionRoutes);

app.use("/api", adminRoutes);

app.use("/api", logRoutes);


let userSocketmap = []  ;

io.on("connection" , Socket=>{
   Socket.on("register" ,async (data)=>{
      const id = Socket.id
      userSocketmap.push({data ,id })
      const s  = await  sectionSchema.find().select("trains")
      Socket.emit(s);
   })
})


server.listen(5000,'0.0.0.0',() => console.log('Signaling server running on port 5000'));