var socket = io.connect('http://' + location.host, {
    'max reconnection attempts': 100000
});

var rColor = new RColor();
var roomContents = {};
var usernameColors = {};

function playSound(name, volume) {
    if (settings[name] == null) return;

    var audio = new Audio('/sounds/' + settings[name] + '.mp3');
    if (volume) audio.volume = volume;
    audio.play();
}

// on connection to server, ask for user's name with an anonymous callback
socket.on('connect', function(){
    // call the server-side function 'adduser' and send one parameter (value of prompt)
    if (localStorage.name == null) {
        localStorage.name = prompt("What's your name?");
    }

    if (localStorage.settings == null) localStorage.settings = "{}";

    socket.emit('adduser', localStorage.name || "Anonymous");
    //updateCharList();
});

// Register an event on error with the Socket.IO connection
socket.on('error', function (error) {
    console.log('error from socket', error);
    if (error == 'handshake error') {
        notAuthorized();
        return;
    }
    if (typeof(error) != 'string') error = 'Something bad happened on the server';
    var html =[];
    html.push('<div class="alert alert-warning alert-dismissable">');
    html.push('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>');
    html.push('<strong>Error!</strong> ' + error);
    html.push('</div>');
    $('#content').append(html.join(''));
});

//Connection failure
function notAuthorized() {
    var html =[];
    html.push('<div class="authorization-error alert alert-warning alert-dismissable">');
    html.push('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>');
    html.push('<strong>Warning!</strong> No session found. Logging in...');
    html.push('</div>');
    $('#content').append(html.join(''));

    $.get('/login', function(data) {
        $('.authorization-error .close').click();
        // When login is done, we need to reconnect to the socket
        // If we don't reconnect, the browser will not restart the handshake with the Socket.IO server
        socket.socket.reconnect();
    });
}

// listener, whenever the server emits 'updatechat', this updates the chat body
socket.on('updatechat', processMessage);

function getUsernameColor(username) {
    if (usernameColors[username] != null) return usernameColors[username];

    usernameColors[username] = rColor.get(true, 0.95, 0.95);
    return usernameColors[username];
}

function getMessageHtml(data) {
	var html = [ '<div>'];
	html.push('<span class="dateTime">(' + (data.time || new Date().toLocaleTimeString()) + ')</span> ');

	var style = '';

	if (getSetting('usernameColors') == 'on') {
		var color = getUsernameColor(data.user);
		//var color = hex_md5(data.user);
		// color = color.substr(0,6)
		//color = parseInt(color.substr(0,6), 16);
		//color = parseFloat("0." + color);
		//color = rColor.get(true, 0.5, 0.95, color);
		style += 'color: ' + color + ';';
		//rColor.get(true, 0.25, 0.8, parseFloat("0." + parseInt(hex_md5(data.user).substr(4,8), 16)))
	}

	if (data.impersonate != null && data.impersonate.length > 0) {
		html.push('<span class="user impersonated" title="Impersonated by ' + data.user + '" style="' + style + '">' + data.impersonate + '</span>');
	}
	else {
		html.push('<span class="user" style="' + style + '">' + data.user + '</span>');
	}

	if (data.emote == null || data.emote == false) html.push(':');
	html.push(' ');
	html.push('<span class="message');
	if (data.messageClass != null) html.push(' ' + data.messageClass);
	html.push('">');
	if (data.message == null)
		html.push(data);
	else
		html.push(prettify(data.message));
	html.push('</span>');
	html.push('</div>');

	return html.join('');
}

function processMessage(data) {
    var html = getMessageHtml(data);

    document.title = data.user + ' says...';
    setTimeout(function(){ document.title = settings.defaultTitle;}, 2000);

    var roomContentsDiv = $('#chatList .roomContents');

    if (roomContents[data.room] == null) {
        roomContents[data.room] = $('<div class="roomContents" data-room-id="' + data.room + '" />');
        console.log("Unknown room!");
    }

    roomContents[data.room].append(html);

    if(roomContentsDiv.length == 0) {
        switchToRoom(data.room);
    } else if (data.silent == null && $('#chatList .roomContents').attr('data-room-id') != data.room) {
        $('#rooms [data-id="' + data.room +'"]').addClass('hasNew');
    }

    if ($('#autoScrollButton').hasClass('glyphicon-play')) {
        roomContentsDiv.prop('scrollTop', roomContentsDiv.prop('scrollHeight'));
    }

    if (!$('#toggleAudio').hasClass('glyphicon-volume-off')){
        var volume = $('#toggleAudio').hasClass('glyphicon-volume-up') ? 1 : 0.33;
        playSound('soundReceive', volume);
    }
}

// listener, whenever the server emits 'updaterooms', this updates the room the client is in
socket.on('updaterooms', function(rooms, joined_rooms) {
    var html = [];
    $.each(rooms, function(key, value) {
        if (roomContents[value] == null) roomContents[value] = $('<div class="roomContents" data-room-id="' + value + '" />');
        html.push('<div data-id="' + value + '" class="');

	    if (~joined_rooms.indexOf(value)){
            html.push('joined');
        }

        html.push('"><span class="roomName">' + value + '</span><span class="roomIndicator"></span></div>');
    });

    $('#rooms').html(html.join(''));

    if ($('#rooms .selected').length == 0) $('#rooms>div:first-child .roomName').click();
});

socket.on('updatebacklog', function(backlog){
    var currentRoom = $('#chatList .roomContents').attr('data-room-id');

	var html = {};
    for(var r in roomContents) {
        if (!roomContents.hasOwnProperty(r) || roomContents[r] == null) continue;
	    roomContents[r].empty();
	    html[r] = [];
    }


    for(var c = 0, l = backlog.length; c < l; c++) {
        if (backlog[c].room != null && html[backlog[c].room] != null) html[backlog[c].room].push(getMessageHtml(backlog[c]));
    }

	for (var room in html) {
		if (html.hasOwnProperty(room)) roomContents[room].append(html[room].join(''));
	}

	currentRoom = currentRoom || $('#rooms>div:first-child').attr('data-id');

    if (currentRoom != null && currentRoom != '') switchToRoom(currentRoom);
});

socket.on('updateusers', function(users) {
    var html = [];
    $.each(users, function(key, value){
        html.push('<div>' + value + '</div>');
    });
    $('#onlineList').html(html);
});

function joinRoom(room){
    socket.emit('joinRoom', room);
}

function leaveRoom(room){
    socket.emit('leaveRoom', room);
}

function switchToRoom(room){
    $('#rooms [data-id="' + room + '"]').addClass('selected').removeClass('hasNew').siblings().removeClass('selected');

    $('#chatList .roomContents').detach();

    $('#chatList').append(roomContents[room]);

    if ($('#autoScrollButton').hasClass('glyphicon-play')) {
        $('#chatList .roomContents').prop('scrollTop', $('#chatList .roomContents').prop('scrollHeight'));
    }
}

function prettify(message) {
    var regex = new RegExp("<(?!\\s*\\/?(i|b|u|s|strong|sub)\\b)[^>]+>","gi"),
        linkRegex = /([^ ]*:\/\/[^ ]*)/ig,
        result = message.replace(regex, '');

    result = result.replace(linkRegex, '<a href="$1" target="_blank">$1</a> ');
    // /(<\/?[a|b|i|br]( [^>]*)?>)/ig - regex for matching tags including a

    return result;
}

function sendMessage() {
    var message = $('#inputField').val();
    $('#inputField').val('');

    if (message == null || message.length == 0) return;

    var impersonate = $('#impersonateAs').val();

    var room = $('#rooms .selected').attr('data-id');

    // tell server to execute 'sendchat' and send along one parameter
    socket.emit('sendchat', room, {
        message: message,
        impersonate: impersonate
    });
}

function updateCharList() {
    $('#charList').empty();
    $('#charList').append('<option>' + localStorage.name + '</option>');
    if (localStorage.characters != null && localStorage.characters.length > 0) {
        $.each(localStorage.characters.split(','), function(name){
            $('#charList').append('<option>' + name + '</option>');
        });
    }
}

function setHideRooms(val) {
	if (val == 'on') $('body').addClass('no-rooms');
	else $('body').removeClass('no-rooms');
}

function setHideUsers(val) {
	if (val == 'on') $('body').addClass('no-users');
	else $('body').removeClass('no-users');
}

// on load of page
$(function(){
    // when the client clicks SEND
    $('#submitButton').click(sendMessage);

    // For room links
    $('#rooms').on('click', '.roomIndicator', function(){
        var room = $(this).parent().attr('data-id');
        if($(this).parent().hasClass('joined')) {
            leaveRoom(room);
        } else {
            joinRoom(room);
        }
    });

    $('#rooms').on('click', '.roomName', function(){
        var room = $(this).parent().attr('data-id');
        if(!$(this).parent().hasClass('joined')) joinRoom(room);

        switchToRoom(room);
    });

    $('#autoScrollButton').on('click', function(){
        if ($(this).hasClass('glyphicon-play')){
            $(this).removeClass('glyphicon-play').addClass('glyphicon-stop');
        } else {
            $(this).addClass('glyphicon-play').removeClass('glyphicon-stop');
        }
    });

    $('#toggleAudio').on('click', function(){
        if ($(this).hasClass('glyphicon-volume-up')){
            $(this).removeClass('glyphicon-volume-up').addClass('glyphicon-volume-down');
            setSetting('volume', 'low');
        } else if($(this).hasClass('glyphicon-volume-down')) {
            $(this).removeClass('glyphicon-volume-down').addClass('glyphicon-volume-off');
            setSetting('volume', 'off');
        } else {
            $(this).addClass('glyphicon-volume-up').removeClass('glyphicon-volume-off');
            setSetting('volume', 'on');
        }
    });

    switch(getSetting('volume')) {
        case 'low':
            $('#toggleAudio').removeClass('glyphicon-volume-off').removeClass('glyphicon-volume-up').addClass('glyphicon-volume-down');
            break;
        case 'on':
            $('#toggleAudio').removeClass('glyphicon-volume-off').removeClass('glyphicon-volume-down').addClass('glyphicon-volume-up');
            break;
    }

	setHideRooms(getSetting('hideRooms'));
	setHideUsers(getSetting('hideUsers'));

    // when the client hits ENTER on their keyboard
    $('#inputField').keypress(function(e) {
        if(e.which == 13 && !e.shiftKey) {
            sendMessage();
            return false;
        }
    });

    $('#logout').click(function(){
        localStorage.clear();
        if (socket.disconnect) socket.disconnect();
        location.href = 'http://www.cynicslair.com/jtf';
    });

    $('#settingsModal').on('show.bs.modal', function () {
        if (localStorage.settings == null) return;

        var settings = JSON.parse(localStorage.settings);

        for (var c in settings) {
	        if (!settings.hasOwnProperty(c)) continue;
            $('#settingsModal select[name="' + c + '"]').val(settings[c]);
	        if (settings[c] == $('#settingsModal input[type="checkbox"]').val()) $('#settingsModal input[type="checkbox"]').prop('checked', true);
	        else $('#settingsModal input[type="checkbox"]').prop('checked', false);
        }
    });

    $('#settingsModal button[type="submit"]').on('click', function(ev){
        ev.preventDefault();

        var arr = $('#settingsModal form').serializeArray();

        var settings = {};

        for(var c = 0, l = arr.length; c < l; c++) {
            settings[arr[c].name] = arr[c].value;
        }

        localStorage.settings = JSON.stringify(settings);

        switchStyles(settings.theme);
	    setHideUsers(settings.hideUsers);
	    setHideRooms(settings.hideRooms);
    });

    // FROM http://web.enavu.com/daily-tip/maxlength-for-textarea-with-jquery/
    $('textarea[maxlength]').keyup(function(){
        //get the limit from maxlength attribute
        var limit = parseInt($(this).attr('maxlength'));
        //get the current text inside the textarea
        var text = $(this).val();

        //check if there are more characters then allowed
        if(text.length > limit){
            //and if there are use substr to get the text before the limit
            text = text.substr(0, limit);

            //and change the current text with the new text
            $(this).val(text);
        }

        var indicator = $(this).attr('data-maxlength-target');
        if (indicator != null && indicator.length > 0) {
            $('#' + indicator).text(text.length + '/' + limit);
        }
    });
});