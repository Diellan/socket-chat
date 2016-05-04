/**
 * Created by Dylan on 11/21/13.
 */
exports.calculateRoll = function(text){
    if (text.length == 0) return ' rolls 1d6 => ' + simpleRoll(6);

    // Remove anything that isn't a number, +, -, or the roll types (d, f, h)
    var dieText = text.replace(/^[ \t]*(-)?(\d+)?(?:(d)(\d+))?[ \t]*$/ig, '');
    var components = dieText.split('+');
    if (components.length == 0) return ' rolls 1d6 => ' + simpleRoll(6);

    var result = roll(text);

    if (!result) {
        return ' tried to roll but failed miserably.';
    }

    return ' rolls ' + text + ' and gets ' + resultString(result);
};

exports.calculateOneEngineRoll = function(text){
    var diceParts = text.split('+');

    var msg = ' rolled ';

    var numberOfDice = 0;

    for(var i=0; i < diceParts.length; i++){
        numberOfDice += parseInt(diceParts[i]);
    }

    if(numberOfDice > 10) numberOfDice= 10;
    if(numberOfDice < 1) numberOfDice=1;

    msg += numberOfDice + ' dice: ';

    var resultArray = [];
    var bins = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for(var c=0; c < numberOfDice; c++){
        var dieRoll = simpleRoll(10);
        resultArray.push(dieRoll);
        bins[dieRoll]++;
    }

    msg += resultArray.join(',') + ' => ';

    for(var d=0; d < bins.length; d++){
        if(bins[d] > 0){
            msg += ' ' + bins[d] + 'x' + d;
        }
    }

    return msg;
};

function roll(dice)
{
    dice = dice.replace(/- */,'+ -');
    dice = dice.replace(/D/,'d');
    var re = / *\+ */;
    var items = dice.split(re);
    var res = [];
    var type = [];
    for ( var i=0; i<items.length; i++) {
        var match = items[i].match(/^[ \t]*(-)?(\d+)?(?:(d)(\d+))?[ \t]*$/);
        if (match) {
            var sign = match[1]?-1:1;
            var num = parseInt(match[2] || "1");
            var max = parseInt(match[4] || "0");
            if (match[3]) {
                for (var j=1; j<=num; j++) {
                    res[res.length] = sign * Math.ceil(max*Math.random());
                    type[type.length] = max;
                }
            }
            else {
                res[res.length] = sign * num;
                type[type.length] = 0;
            }
        }
        else return null;
    }
    if (res.length == 0) return null;
    return {"res":res, "type":type};
}

function simpleRoll(max) {
    return Math.floor(max*Math.random() + 1);
}

function resultString(data)
{
    var total = 0;
    var str = [];
    for (var i=0; i<data.res.length; i++) {
        total = total + data.res[i];
        if (data.res.length>1) {
            if (i) str.push((data.res[i])>=0?"+":"-");
            str.push(Math.abs(data.res[i]));
            if (data.type[i]) str.push("<sub>[d"+data.type[i]+"]</sub>");
        }
    }
    str = str.join('');
    str = "<strong>" + total + "</strong>" + (str?"&nbsp;=&nbsp;" + str:'');
    return str;
}