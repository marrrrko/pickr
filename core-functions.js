const _ = require('lodash');


exports.isTimeWithinBlackOutPeriod = function(time, blackoutPeriodConfig) {
    return _.some(blackoutPeriodConfig, function(v) { return isTimeWithinBlackOutPeriodValue(time,v) } );
}

function isTimeWithinBlackOutPeriodValue(time, blackoutPeriodValue) {
    if(!time || !blackoutPeriodValue)
        return false;
    
    let hours = time.getHours();
    let dayOfWeek = time.getDay();
    let dayOfWeekSynonymsMap = {
        0: ['sun','sunday'],
        1: ['mon','monday'],
        2: ['tue','tuesday'],
        3: ['wed','wednesday'],
        4: ['thu','thursday'],
        5: ['fri','friday'],
        6: ['sat','saturday']
    }
    
    var isInBlackout;
    if(blackoutPeriodValue.length == 2 && hours >= blackoutPeriodValue[0] && hours < blackoutPeriodValue[1])
        isInBlackout = true;
    else if(blackoutPeriodValue.length == 3 && 
            hours >= blackoutPeriodValue[0] && 
            hours < blackoutPeriodValue[1] &&
            dayOfWeekSynonymsMap[dayOfWeek] &&
            dayOfWeekSynonymsMap[dayOfWeek].indexOf(blackoutPeriodValue[2] >= 0))
        isInBlackout = true
    else
        isInBlackout = false
    
    return isInBlackout;
}