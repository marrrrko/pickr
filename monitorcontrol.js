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

async function putMonitorToSleep() {
  await set_vcgencmd(0)
}

async function wakeMonitor() {
  await set_vcgencmd(1)
}
module.exports = { putMonitorToSleep: putMonitorToSleep, wakeMonitor: wakeMonitor }