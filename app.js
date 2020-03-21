const http = require('http');

const Gpio = require('pigpio').Gpio;

const motor = new Gpio(5, {mode: Gpio.OUTPUT});
const green = new Gpio(17, {mode: Gpio.OUTPUT});
const red = new Gpio(27, {mode: Gpio.OUTPUT});
const blue = new Gpio(22, {mode: Gpio.OUTPUT});

const Wifi = require('rpi-wifi-connection');
const bluetooth = require('node-bluetooth');
const {register, listen} = require('push-receiver');
const Storage = require('node-storage');
const fs = require("fs");
const dao = require("./dao.js");

const store = new Storage('store');

async function getStatus() {
    let wifi = new Wifi();
    return await wifi.getState().catch(
        (err) => {
            console.log(err);
            return false
        });
}

function moveServo(duty) {
    let length = duty * 20 / 100;
    try {
        motor.servoWrite(length * 1000) // pulse is in µs
    } catch (e) {
        //console.log(e)
    }
}

function moveServoToStart() {
    moveServo(2.5)
}

function moveServoToEnd() {
    moveServo(12.5)
}

function setUpWifi(ssid, psk) {
    let wifi = new Wifi();
    wifi.connect({ssid: ssid, psk: psk}).then(() => {
        console.log('Connected to network.');
        setLedToConnected()
    }).catch((error) => {
        console.log(error);
        setLedToDisconnected()
    });
}

function setLedToConnected() {
    blue.digitalWrite(0);
    red.digitalWrite(0);
    green.digitalWrite(1)
}

function setLedToDisconnected() {
    blue.digitalWrite(0);
    red.digitalWrite(1);
    green.digitalWrite(0)
}

function setLedToProcessing() {
    blue.digitalWrite(0);
    red.digitalWrite(1);
    green.digitalWrite(1)
}

function setLedToBluetooth() {
    blue.digitalWrite(1);
    red.digitalWrite(0);
    green.digitalWrite(0)
}

//sudo apt-get install libbluetooth-dev

// create bluetooth device instance
const device = new bluetooth.DeviceINQ();

device
    .on('finished', console.log.bind(console, 'finished'))
    .on('found', function found(address, name) {

        console.log('Found: ' + address + ' with name ' + name);

        // find serial port channel
        device.findSerialPortChannel(address, function (channel) {
            console.log('Found RFCOMM channel for serial port on %s: ', name, channel);

            // make bluetooth connect to remote device
            bluetooth.connect(address, channel, function (err, connection) {
                if (err) return console.error(err);

                setLedToBluetooth();

                connection.delimiter = Buffer.from('\n', 'utf8');
                connection.on('data', (buffer) => {
                    console.log('received message:', buffer.toString());

                    let wifi = JSON.parse(buffer.toString());
                    setUpWifi(wifi.ssid, wifi.psk);

                    setLedToProcessing();
                    connection.write(new Buffer('connection', 'utf-8'), () => {
                        console.log('wrote');
                    });
                });


                connection.on("end", () => {
                    console.log('end bluetooth');
                    getStatus().then((isConnected) => {
                        console.log("Connected: " + isConnected);

                        if (isConnected) setLedToConnected();
                        else setLedToDisconnected();

                    });
                });
            });

        });

    });

device.scan();

const senderId = fs.readFileSync('fmc-server-id').toString();
if (!senderId) {
    console.error('Missing senderId');
    return;
}


(async () => {
    // First time
    // Register to GCM and FCM
    let c = store.get("fcm.credentials");

    let persistentIds = dao.getNotificationPersistentIds().map(item => item.persistentId);

    if (c === undefined) {
        console.log("no credentials yet, getting it");
        c = await register(senderId).catch(e => {
            console.log(e)
        }); // You should call register only once and then store the credentials somewhere
        store.put("fcm.credentials", c)
    }
    const credentials = c;
    const fcmToken = credentials.fcm.token; // Token to use to send notifications
    console.log('Use this following token to send a notification', fcmToken);
    // persistentIds is the list of notification ids received to avoid receiving all already received notifications on start.

    await listen({...credentials, persistentIds}, onNotification);
})();

// Called on new notification
function onNotification({notification, persistentId}) {
    // Do someting with the notification
    console.log('Notification received');
    console.log(notification);
    console.log(persistentId);

    let s = persistentId.split(":");
    s = s[1].split("%");
    let stamp = s[0];
    let notifDate = new Date(Number(stamp/1000));

    let date = new Date();
    date.setMinutes(date.getMinutes() - 5);

    dao.insertPersistentIds(persistentId);

    if(date.getTime() <= notifDate.getTime()) {

        moveServoToEnd();

        setTimeout(() => {
            moveServoToStart()
        }, 5000)
    }
}

setLedToDisconnected();
getStatus().then((isConnected) => {
        console.log("Connected: " + isConnected);

        if (isConnected) setLedToConnected();
        else setLedToDisconnected();

        moveServoToStart()
    });

http.createServer(function (req, res) {

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write('Hello World!');
    res.end();


}).listen(3000);
