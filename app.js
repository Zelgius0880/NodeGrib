const http = require('http');

const Wifi = require('rpi-wifi-connection');
// bluetooth = require('node-bluetooth');
const {register, listen} = require('push-receiver');
const Storage = require('node-storage');
const fs = require("fs");
const dao = require("./dao.js");
const led = require("./led");
const serverRequest = require("./serverRequest");

const store = new Storage('store');


var connected = false;

async function getStatus() {
    let wifi = new Wifi();


    let wifiConnected = false
    
    wifiConnected = await wifi.getState().catch(
        (err) => {
            console.log(err);
        });

    
    let c = store.get("fcm.credentials");
    let serverRegistered = {error: true};
    serverRegistered = serverRequest.registerToken(c.fcm.token)  // Token to use to send notifications
        .catch(e => {
            console.log(e)
        });

    return wifiConnected && !serverRegistered.error;
}

function setUpWifi(ssid, psk) {
    let wifi = new Wifi();
    wifi.connect({ssid: ssid, psk: psk}).then(() => {
        console.log('Connected to network.');
        led.setLedToConnected()
        connected = true;
        //btSerial.close();
    }).catch((error) => {
        console.log(error);
        led.setLedToDisconnected()
    });
}


//sudo apt-get install libbluetooth-dev
/*
var CHANNEL = 10; // My service channel. Defaults to 1 if omitted.
var UUID = '38e851bc-7144-44b4-9cd8-80549c6f2912'; // My own service UUID. Defaults to '1101' if omitted

server.on('data', function(buffer) {
    console.log('Received data from client: ' + buffer);

    // ...

    console.log('Sending data to the client');
    server.write(Buffer.from('...'), function (err, bytesWritten) {
        if (err) {
            console.log('Error!');
        } else {
            console.log('Send ' + bytesWritten + ' to the client!');
        }
    });
});

server.listen(function (clientAddress) {
    console.log('Client: ' + clientAddress + ' connected!');
}, function(error){
    console.error("Something wrong happened!:" + error);
}, /*{uuid: UUID, channel: CHANNEL} );
*/

/*btSerial
    .on('finished', () => {
        console.log('scan finished');
        if(!connected){
            console.log("not connected to wifi. Launching another scan");
            btSerial.inquire();
        }
    })
    .on('found', function found(address, name) {

        console.log('Found: ' + address + ' with name ' + name);


        // find serial port channel
        btSerial.findSerialPortChannel(address, function(channel) {
            console.log('Found RFCOMM channel for serial port on %s: ', name, channel);
            if(channel < 0) return;

            // make bluetooth connect to remote device
           btSerial.connect(address, channel, function() {
                if (err) return console.error(err);

                led.setLedToBluetooth();

                connection.delimiter = Buffer.from('\n', 'utf8');
                connection.on('data', (buffer) => {
                    console.log('received message:', buffer.toString());

                    let wifi = JSON.parse(buffer.toString());
                    setUpWifi(wifi.ssid, wifi.psk);

                    led.setLedToProcessing();
                    connection.write(new Buffer('connection', 'utf-8'), () => {
                        console.log('wrote');
                    });
                });


                connection.on("end", () => {
                    console.log('end bluetooth');
                    getStatus().then((isConnected) => {
                        console.log("Connected: " + isConnected);

                        if (isConnected) led.setLedToConnected();
                        else led.setLedToDisconnected();

                    });
                });
            }, function () {
                console.log('cannot connect');
                btSerial.close();
            });

        });

    });

btSerial.inquire();*/

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


    getStatus().then((isConnected) => {
        console.log("Connected: " + isConnected);

        if (isConnected) led.setLedToConnected();
        else led.setLedToDisconnected();

        led.moveServoToStart()
    });

    setInterval(() => {
        let wifi = new Wifi();
        console.log("Checking WiFi & Server connection ...");

        wifi.getState()
            .then(isConnected => {
                console.log(isConnected ? "WiFi & Server connected" : "Unhable to connect")

                if (isConnected) led.setLedToConnected();
                else led.setLedToDisconnected();

                if(connected != isConnected) {
                    if (isConnected) led.moveServoToStart();
                else led.moveServoToNotConnected();

                }
                connected = isConnected
            }).catch(
                (err) => {
                    console.log(err);
                    //return false
                });

    }, 2*60*1000);

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
    let notifDate = new Date(Number(stamp / 1000));

    let date = new Date();
    date.setMinutes(date.getMinutes() - 5);

    dao.insertPersistentIds(persistentId);

    if (date.getTime() <= notifDate.getTime()) {

        led.moveServoToEnd();

        setTimeout(() => {
            led.moveServoToStart()
        }, 3000)
    }
}


led.moveServoToEnd();
setTimeout(() => {
    led.moveServoToStart()
}, 100);

http.createServer(function (req, res) {

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write('Hello World!');
    res.end();

    led.moveServoToEnd();
    setTimeout(() => {  
        led.moveServo(12.5);
    }, 1000);

}).listen(3000);
