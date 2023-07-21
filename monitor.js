const net = require('net');
const events = require('events');

class DataModel {
 constructor() {
   this.userID = null;
   this.username = null;
 }
}

class Request {
  constructor() {
   this.action = "";
  }
}

var model = new DataModel();
var eventEmitter = new events.EventEmitter();
let client = null;

function processCreateMonitorAction() {
  model.userID = process.argv[2];
  let request = new Request();
  request.action = "createMonitor";
  request.userID = model.userID;
  client.write(JSON.stringify(request));
}

function processCreateMonitorActionResponse(response) {

  if(response.result != null && response.result.length > 0) {
    eventEmitter.emit("monitorCreated",response.result);
  } else {
    eventEmitter.emit("monitorDenied");
  }
}

//events
function usersListArrived(users) {
  console.log("List of online user");
  users.forEach(user => {
    console.log(`- ${user}`);
  })
}

function loggedOut() {
  console.log(`${model.username} is logged out`);
  process.exit(0);
}

function monitorCreated(username) {
  model.username = username;
  console.log(`This is the monitor for user ${username}`);
}

function monitorDenied() {
  console.log(`Unable to create monitor as userID is invalid: ${model.userID}`);
  process.exit(0);
}

function broadcastArrived(fromUser, message) {
  console.log(`Broadcast from ${fromUser} > ${message}`);
}

function messageArrived(fromUser, message) {
  console.log(`${fromUser}>${message}`);
}

function notificationArrived(notification) {
  console.log(`Notification ---> ${notification}`);
}

//setting up events
eventEmitter.on("usersListArrived", usersListArrived);
eventEmitter.on("loggedOut", loggedOut);
eventEmitter.on("monitorCreated", monitorCreated);
eventEmitter.on("monitorDenied", monitorDenied);
eventEmitter.on("broadcastArrived", broadcastArrived);
eventEmitter.on("messageArrived", messageArrived);
eventEmitter.on("notificationArrived", notificationArrived);

client = new net.Socket();
client.connect(5500,"localhost",function() {
  console.log("connected to chat server");
  processCreateMonitorAction();
})

client.on("data", function(data) {
  var response = JSON.parse(data);
  if(response.action == "createMonitor") processCreateMonitorActionResponse(response);
  else if(response.action == "logout") eventEmitter.emit("loggedOut");
  else if(response.action == "getUsers") eventEmitter.emit("usersListArrived",response.result);
  else if(response.action == "broadcast") eventEmitter.emit("broadcastArrived", response.fromUser, response.message);
  else if(response.action == "send") eventEmitter.emit("messageArrived", response.fromUser, response.message);
  else if(response.action == "notification") eventEmitter.emit("notificationArrived", response.notificationMessage);
});

client.on("end", function() {

});

client.on("error", function() {

});




