/**
 * Created by Dylan on 11/30/13.
 */
var settings = {
    defaultTitle: '5M2M Chat',
    // Defines the sound that is played when normal messages are reveived:
    soundReceive: 'sound_1',
    // Defines the sound that is played on sending normal messages:
    soundSend: 'sound_2',
    // Defines the sound that is played on channel enter or login:
    soundEnter: 'sound_3',
    // Defines the sound that is played on channel leave or logout:
    soundLeave: 'sound_4',
    // Defines the sound that is played on chatBot messages:
    soundChatBot: 'sound_5',
    // Defines the sound that is played on error messages:
    soundError: 'sound_6',

    styles: [
        'prosilver'
    ]
};

function getSetting(name) {
	if (localStorage.settings == null) localStorage.settings = "{}";
    return JSON.parse(localStorage.settings)[name];
}

function setSetting(name, value) {
	if (localStorage.settings == null) localStorage.settings = "{}";
    var settings = JSON.parse(localStorage.settings);
    settings[name] = value;
    localStorage.settings = JSON.stringify(settings);
}

function initStyles(){
    var html = [], opts = [];
    for (var c = 0, l = settings.styles.length; c < l; c++) {
        html.push('<link rel="alternate stylesheet" type="text/css" href="stylesheets/' + settings.styles[c] + '.css" title="' + settings.styles[c] + '"/>');
        opts.push('<option>' + settings.styles + '</option>');
    }
    $('head').append(html.join(''));
    $('#settingsTheme').append(opts.join(''));

    var style = getSetting('theme');
    if (style != null && style.length > 0) switchStyles(style);
}

function switchStyles(name) {
    $('link[rel="alternate stylesheet"]').prop('disabled', true);
    $('link[rel="alternate stylesheet"][title="' + name + '"]').prop('disabled', false);
}

$(function(){
    initStyles();
});