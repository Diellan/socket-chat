/**
 * Created by Dylan on 11/23/13.
 */
var dice = require('./dice.js');

function executeMessage(message) {
    return message;
}

var serverUser = 'CHATBOT';

exports.serverUser = serverUser;

exports.evaluateMessage = function(data){
    if (data.message == null || data.message.length == 0) return data;
    if (data.message[0] != '/') {
        data.message = executeMessage(data.message);
        return data;
    }

    var parts = data.message.substr(1).split(' ');
    if (parts.length < 2) return data;
    var command = parts.shift();
    switch (command) {
        case 'me':
        case 'em':
            data.message = parts.join(' ');
            data.emote = true;
            break;
        case 'takeover':
            data.message = parts.join(' ');
            data.user = serverUser;
            break;
        case 'takeoverme':
            data.message = parts.join(' ');
            data.user = serverUser;
            data.emote = true;
            break;
        case 'w':
        case 'msg':
            if (parts.length < 2) return data;
            data.targetUser = parts.shift();
            data.message = parts.join(' ');
            data.whisper = true;
            break;
        case 'roll':
            data.message = dice.calculateRoll(parts.shift());
            data.emote = true;
            break;
        case 'ore':
            data.message = dice.calculateOneEngineRoll(parts.shift());
            data.emote = true;
            break;
        case 'fate':
            data.message = dice.calculateRoll('4f');
            data.emote = true;
            break;
    }

    return data;
};

exports.generateServerMessage = function (data) {
    data.user = serverUser;
    data.time = (new Date().toLocaleTimeString());
    data.messageClass = (data.messageClass ? data.messageClass + ' chatbot' : 'chatbot');
    data.silent = true;

    return data;
};


