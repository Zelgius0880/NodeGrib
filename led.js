
const Gpio = require('pigpio').Gpio;

const motor = new Gpio(5, {mode: Gpio.OUTPUT});
const green = new Gpio(17, {mode: Gpio.OUTPUT});
const red = new Gpio(27, {mode: Gpio.OUTPUT});
const blue = new Gpio(22, {mode: Gpio.OUTPUT});

exports.setLedToConnected = function() {
    try {
        blue.digitalWrite(0);
        red.digitalWrite(0);
        green.digitalWrite(1)
    } catch (e) {
        //console.log(e)
    }
}

exports.setLedToDisconnected= function () {
    try {
        blue.digitalWrite(0);
        red.digitalWrite(1);
        green.digitalWrite(0)
    } catch (e) {
        //console.log(e)
    }
}

exports.setLedToProcessing = function() {
    try {
        blue.digitalWrite(0);
        red.digitalWrite(1);
        green.digitalWrite(1)
    } catch (e) {
        //console.log(e)
    }
}

exports.setLedToBluetooth = function() {
    try {
        blue.digitalWrite(1);
        red.digitalWrite(0);
        green.digitalWrite(0)
    } catch (e) {
        //console.log(e)
    }
};

function moveServo(duty) {
    let length = duty * 20 / 100;
    try {
        motor.servoWrite(length * 1000) // pulse is in µs
    } catch (e) {
        //console.log(e)
    }
}
function moveServoToStart() {
    moveServo(12.5)
}

function moveServoToEnd() {
    moveServo(2.5)
}

exports.moveServo = moveServo;

exports.moveServoToStart = moveServoToStart;

exports.moveServoToEnd = moveServoToEnd;

exports.moveServoToNotConnected = function(){
    moveServo(2.5);
}
