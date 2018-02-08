const motion = require("./motion.js");
const logger = require('winston')
const PubSub = require('pubsub-js');

logger.add(logger.transports.File, { name: 'debug', filename: 'motion-test.log',level: 'warning', 'timestamp':function() { return moment().format() ; } })

motion.startWatching(true);
var token = PubSub.subscribe( 'motion-activity', async function(mvalue) { 
    logger.info('Motion detected: ' + mvalue);
});  

