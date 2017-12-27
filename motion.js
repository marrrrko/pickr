var Gpio = require('onoff').Gpio;
var pir = new Gpio(4, 'in', 'both');

pir.watch(function (err, value) {
  if (err) {
    throw err;
  }

  console.log('Got something from PIR: ' + value);
});

process.on('SIGINT', function () {
  pir.unexport();
});

