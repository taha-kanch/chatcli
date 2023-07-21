const net = require('net');
const fs = require('fs');

class Response {
 constructor() {
   this.action = "";
   this.success = false;
   this.error = null;
   this.result = null;
 }
}

class DataModel {
 constructor() {
  this.users = [];
  this.userID = 0;
 }

 getUserByUsername(username) {
   var user = this.users.find(user => user.username == username);
   return user;
 }

 getUserByUserID(userID) {
   var user = this.users.find(user => user.id == userID);
   return user;
 }

 getLoggedInUsers(userID) {
   var loggedInUsers = [];
   this.users.forEach(user => {
     if(user.id != userID && user.loggedIn) {
	loggedInUsers.push(user.username);
     }
   })
   return loggedInUsers;
 }

}

var model = new DataModel();

function populateDataStructure() {
 var userJSONString = fs.readFileSync("users.data", "utf-8");
 var {users} = JSON.parse(userJSONString);
 users.forEach(user => {
   user.loggedIn = false;
   user.id = 0;
   user.monitorSocket = null;
   model.users.push(user);
 });
}

function processRequest(requestObject) {

   if(requestObject.action == "broadcast") {
      let message = requestObject.message;
      let fromUser = requestObject.fromUser;
      model.users.forEach(user => {
        if(user.loggedIn && user.monitorSocket) {
	   let response = new Response();
	   response.action = requestObject.action;
	   response.message = message;
	   response.fromUser = fromUser;
	   user.monitorSocket.write(JSON.stringify(response));		
   	}
      });
   }

   if(requestObject.action == "send") {
     let message = requestObject.message;
     let fromUser = requestObject.fromUser;
     let toUser = requestObject.toUser;
     let user = model.getUserByUsername(fromUser);
     if(user && user.loggedIn && user.monitorSocket) {
       let response = new Response();
       response.action = requestObject.action;
       response.message = message;
       response.fromUser = fromUser;
       user.monitorSocket.write(JSON.stringify(response));
     }

     user = model.getUserByUsername(toUser);
     if(user && user.loggedIn && user.monitorSocket) {
       let response = new Response();
       response.action = requestObject.action;
       response.message = message;
       response.fromUser = fromUser;
       user.monitorSocket.write(JSON.stringify(response));
     }
   }

   if(requestObject.action == "createMonitor") {
      let userID = requestObject.userID;
      let user = model.getUserByUserID(userID);
      let response = new Response();
      response.action = requestObject.action;
      if(user) {
	response.result = user.username;
	user.monitorSocket = requestObject.socket;
      } else {
	response.result = "";
      }
      requestObject.socket.write(JSON.stringify(response));
   }

   if(requestObject.action == "login") {
      let username = requestObject.username;
      let password = requestObject.password;
      let success = false;
      let user = model.getUserByUsername(username);
      if(user)
 	if(user.password == password) success = true;

      let response = new Response();
      response.action = requestObject.action;
      response.success = success;
      if(success) {
        response.error = "";
	model.userID++;
     	requestObject.socket.userID = model.userID;
        user.id = model.userID;
	user.loggedIn = true;
	response.result = {
	  "username": user.username,
	  "id": user.id
	}
      } else {
	response.error = "Invalid username / password";
        response.result = "";
      }
      requestObject.socket.write(JSON.stringify(response));
      if(success) {
	let username = user.username;
	let notificationMessage = `${username} has logged in`;
        model.users.forEach(user => {
	  if(user.username != username && user.loggedIn && user.monitorSocket) {
	    response = new Response();
	    response.notificationMessage = notificationMessage;
	    response.action = "notification";
	    user.monitorSocket.write(JSON.stringify(response));
	  }
        })
      }
   }

   if(requestObject.action == "logout") {
      let userID = requestObject.userID;
      let user = model.getUserByUserID(userID);
      if(user && user.monitorSocket) {
        let response = new Response();
      	response.action = requestObject.action;
      	user.monitorSocket.write(JSON.stringify(response));
      }
      user.loggedIn = false;
      user.id = 0;
      user.monitorSocket = null;
      let username = user.username;
      let notificationMessage = `${username} has logged out`;
      model.users.forEach(user => {
        if(user.username != username && user.loggedIn && user.monitorSocket) {
	   response = new Response();
	   response.notificationMessage = notificationMessage;
	   response.action = "notification";
	   user.monitorSocket.write(JSON.stringify(response));
	}
      })
   }

   if(requestObject.action == "getUsers") {
      let userID = requestObject.userID;
      let user = model.getUserByUserID(userID);
      if(user && user.monitorSocket) {
      	let response = new Response();
      	response.action = requestObject.action;
      	response.result = model.getLoggedInUsers(requestObject.userID);
      	user.monitorSocket.write(JSON.stringify(response));
      }	
   }

}

populateDataStructure();

var server = net.createServer(function(socket) {

  socket.on("data",function(data) {
    var requestObject = JSON.parse(data);
    requestObject.socket = socket;
    try {
      processRequest(requestObject);
    } catch(e){
      console.log(e);
    }
  });

  socket.on("end", function() {
    console.log("client closed connection");
  });

  socket.on("error", function(error) {
    console.log("some problem occur at client side");
  });

});

server.listen(5500, function() {
  console.log("Chat server is ready to accept request on port 5500");
})
