const request = require('request');
const key = require('./local-env');

exports.registerToken = function (token) {
    return new Promise((resolve, reject) => {
        let options = {
            uri: 'https://us-central1-piclock-c9af5.cloudfunctions.net/register',
            method: 'POST',
            json: {
                data: {
                    "token": token,
                    "key": key.identificationKey
                }
            }
        };

        request(options, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                resolve(true, body)
            }  else {
                reject(false, error)
            }
        });
    })
}
