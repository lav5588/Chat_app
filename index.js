import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose,{Schema,model} from 'mongoose';

dotenv.config();


//connecting the database
(async()=> {
  try{
    await mongoose.connect(`${process.env.DB_URL}`);
    console.log("MngoDb connected successfully ❤️");
      
  }
  catch(error){
    console.log("database connection error");
    console.log(error);
  }
}
)()


//making userSchema
const userSchema=new Schema({
  username:{
    type:String,
    required:true
  },
  socketId:{
    type:String,
     required:true
    }
},{timestamps:true});

//making the userModel named chatUsers in the database
const Users=model("chatUsers",userSchema);

//initializing the express server
const app = express();
const server = createServer(app);

//initializing the socket server
const io = new Server(server);


const __dirname = dirname(fileURLToPath(import.meta.url));
//serving the html file for ui
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});


// sending all existing users to newly connected client
app.get('/users',async(req,res)=>{
     try {
       const users=await Users.find({});
       if(! users || users.length===0){
         return res.status(400).json({messege:"user not found"});
       }
       console.log(users);
       return res.status(200).send(users);
     } catch (error) {
        console.log(error);
     }

})


//establishing the connection for the socket
io.on('connection', (socket) => {
    //adding the user to the database 
    socket.on("addUser", async(username) => {
        const newUser=await Users.create({
          username,
          socketId:socket.id
        })
        if(!newUser){
          //sending the messege if user not added to db
          io.to(socket.id).emit("addUser",`${username} not added`);
        }
        //sending the messege if user added to db
          io.to(socket.id).emit("addUser",{message:`${newUser.username} added successfully`});
          //sending the newly added User to all the cleints
          io.except(socket.id).emit("addUser",{newUser});
          console.log(newUser);
          console.log("userAdded");
    })
    console.log('a user connected');
    socket.on('disconnect', async() => {
        console.log('user disconnected', socket.id);
        //deleting the user from the database on disconnection
        await Users.findOneAndDelete({socketId:socket.id});
        //sending the information to client that a user is deleted from db
        io.emit('deleteUser',socket.id);
      });

      //chat messege handling
      socket.on('chat message', (msg) => {
        console.log(msg.recepentId);
        console.log(msg.message);
        try{
          io.to(msg.recepentId).emit('chat message',{senderId:socket.id, message:msg.message});
        }
        catch(error){
          console.log(error);
        }
      });
  });


server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});