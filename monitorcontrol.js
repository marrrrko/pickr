const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { execSync } = require('child_process');
const _ = require('lodash');

async function set_vcgencmd(mode) {
  const { stdout, stderr } = await exec(`/opt/vc/bin/vcgencmd display_power ${mode}`);
 // return stdout;
}

async function test_vcgencmd(type) {
  const { stdout, stderr } = await exec('echo ' + type);  
  console.log('Output: ' + stdout); 
}

async function executeAction(action) {
  //await test_vcgencmd(action.type);

  let powermode = 0;
  if(action.type == 'wake')
    powermode = 1;
  await set_vcgencmd(powermode)
}

function getTimeFromMinuteOfDay(minuteOfDay, nextDay) {
  let startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  if(nextDay)
    startOfDay.setDate(startOfDay.getDate() + 1);
  return (new Date(startOfDay.getTime() + (minuteOfDay * 60 * 1000))).getTime();
}

function validateConfiguration(dailySleepAtMinutes, dailyWakeAtMinutes) {
  if(dailySleepAtMinutes.length != dailyWakeAtMinutes.length)
    throw new Error('Invalid sleep/wake configuration.  You need one sleep for every wake!');

  let duplicateMinutes = _.intersection(dailySleepAtMinutes,dailyWakeAtMinutes)
  if(duplicateMinutes.length)
    throw new Error('Cannot sleep and wake in the same minute (' + duplicateMinutes[0] + ').');
}

function getNextAction(action, dailySleepAtMinutes, dailyWakeAtMinutes) {

  validateConfiguration(dailySleepAtMinutes, dailyWakeAtMinutes);

  let nextAction;
  let previousTime = (new Date).getTime();
  if(action != null) {
    previousTime = action.time
  }

  let nextSleepMinute = _.find(dailySleepAtMinutes.sort(), (m) => getTimeFromMinuteOfDay(m) > previousTime);
  let nextWakeMinute = _.find(dailyWakeAtMinutes.sort(), (m) => getTimeFromMinuteOfDay(m) > previousTime);

  if(nextSleepMinute && nextWakeMinute) {
    if(nextSleepMinute <= nextWakeMinute) {
      nextAction = { type: 'sleep', time: getTimeFromMinuteOfDay(nextSleepMinute) }
    } else {
      nextAction = { type: 'wake', time: getTimeFromMinuteOfDay(nextWakeMinute) }
    }
  } else if (nextSleepMinute) {
    nextAction = { type: 'sleep', time: getTimeFromMinuteOfDay(nextSleepMinute) }
  } else if (nextWakeMinute) {
    nextAction = { type: 'wake', time: getTimeFromMinuteOfDay(nextWakeMinute) }
  } else {
    let firstSleepMinuteOfTheDay = dailySleepAtMinutes.sort()[0];
    let firstWakeMinuteOfTheDay = dailyWakeAtMinutes.sort()[0];

    if (firstSleepMinuteOfTheDay < firstWakeMinuteOfTheDay) {
      nextAction = { type: 'sleep', time: getTimeFromMinuteOfDay(firstSleepMinuteOfTheDay,true) }
    } else {
      nextAction = { type: 'wake', time: getTimeFromMinuteOfDay(firstWakeMinuteOfTheDay,true) }
    }
  }

  return nextAction;
}


module.exports = { executeAction: executeAction, getNextAction: getNextAction }