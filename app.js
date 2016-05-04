/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , message = require('./routes/messages')
    , chat = require('./libs/chat')
    , dice = require ('./libs/dice')
  , http = require('http')
  , path = require('path')
  , mysql = require('mysql')
  , async = require('async')
  , app = express()
  , socketIo = require('socket.io')
	, cookieParser = require('cookie-parser')
	, session = require('express-session'),
	favicon = require('serve-favicon')
	, logger = require('morgan')
	, bodyParser = require('body-parser')
	, methodOverride = require('method-override')
	, serveStatic = require('serve-static')
	, errorHandler = require('errorhandler');

var PORT = process.env.PORT || 80;

// We define the key of the cookie containing the Express SID
var EXPRESS_SID_KEY = 'express.sid';

// We define a secret string used to crypt the cookies sent by Express
var COOKIE_SECRET = 'very secret string';
app.use(cookieParser(COOKIE_SECRET));

// Create a new store in memory for the Express sessions
app.use(session({
	secret: 'COOKIE_SECRET',
	resave: false,
	saveUninitialized: true,
	cookie: { secure: true, httpOnly: true }
}));

function log(){
	var args = [];
	for(var c = 0; c < arguments.length; c++) args.push(arguments[c]);
	console.log(new Date().toUTCString() + ': ' + args.join(' '));
}



app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(serveStatic(__dirname + '/public'));
app.use(errorHandler());

app.get('/users', user.list);
app.get('/messages', message.index);
app.post('/add_message', message.add_message);


// Create HTTP server, register socket.io as listener
var server = http.createServer(app);
var io = socketIo(server);

// usernames which are currently connected to the chat
var usernames = {};

// rooms which are currently available in chat
var rooms = ['OOC','IC'];

var message_history = [];

function getUsers () {
    var userNames = [];
    for(var name in usernames) {
        if(usernames[name] != null) {
            userNames.push(name);
        }
    }
    return userNames;
}

io.on('connection', function (socket) {

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
        log('adduser', username);
		// store the username in the socket session for this client
		socket.username = username;

		// add the client's username to the global list
        if (usernames[socket.username] == null) usernames[socket.username] = {};
        clearTimeout(usernames[socket.username].timeoutFunc);
		usernames[socket.username].socket = socket;

        // give client list of rooms
        socket.emit('updaterooms', rooms, socket.rooms);

        socket.emit('updatebacklog', message_history);

        //socket.emit('usernames', usernames);

		io.emit('updateusers', getUsers(), rooms[0]);
	});

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (targetroom, data) {
        log(socket.username, 'sendchat', targetroom, data);
        data.time = (new Date().toLocaleTimeString());

		// we tell the client to execute 'updatechat' with 2 parameters
        data.room = targetroom;
        data = chat.evaluateMessage(data);

        if (data.user == null) {
            data.user = socket.username;
        }

        message_history.push(data);
        if (message_history.length > 400) {
            message_history.shift();
        }

        if (data.targetUser != null) {
            socket.emit('updatechat', data);
            if (usernames[data.targetUser] != null && usernames[data.targetUser].socket != null && usernames[data.targetUser].socket.emit != null) {
                usernames[data.targetUser].socket.emit('updatechat', data);
            } else {
                socket.emit('updatechat', chat.generateServerMessage({ message: 'The user ' + data.targetUser + ' does not exist.', room: targetroom}));
            }
        } else {
		    io.in(targetroom).emit('updatechat', data);
        }
	});
	
	socket.on('leaveRoom', function(oldroom){
		socket.leave(oldroom, function(){
			log(socket.username, 'leaveRoom', oldroom);
			socket.broadcast.to(oldroom).emit('updatechat', chat.generateServerMessage({ message: socket.username + ' has left this room', room: oldroom }));
			socket.emit('updatechat', chat.generateServerMessage({ message: 'You have left '+ oldroom, room: rooms[0]}));
			socket.emit('updaterooms', rooms, socket.rooms);
		});
	});

	socket.on('joinRoom', function(newroom){
		socket.join(newroom, function(){
			log(socket.username, 'joinRoom', newroom);
			socket.emit('updatechat', chat.generateServerMessage({ message: 'You have joined '+ newroom, room: newroom}));

			// update socket session room title
			socket.broadcast.to(newroom).emit('updatechat', chat.generateServerMessage({ message: socket.username+' has joined this room', room: newroom }));
			socket.emit('updaterooms', rooms, socket.rooms);
		});
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
        log('disconnect', socket.username);
        if (usernames[socket.username] == null || usernames[socket.username].socket != socket) return;

        usernames[socket.username].timeoutFunc = setTimeout(function(){
            log(new Date().toUTCString() + ' disconnect timeoutFunc', socket.username);
            // remove the username from global usernames list
            delete usernames[socket.username];
            // update list of users in chat, client-side
            io.emit('updateusers', getUsers());
            // echo globally that this client has left
            socket.broadcast.emit('updatechat', chat.generateServerMessage({ message: socket.username + ' has disconnected', room: rooms[0] }));
        }, 30000);
	});
});

server.listen(PORT, '192.163.234.231', function() {
//server.listen(PORT, 'localhost', function() {
    log('Server listening on port %d in %s mode', this.address().port, app.settings.env);
});

