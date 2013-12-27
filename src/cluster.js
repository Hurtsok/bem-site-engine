var fs = require('fs'),
    luster = require('luster'),
    config = require('./config');

if (luster.isMaster) {
    var socket = config.get('app:socket');

    if(socket) {
        try {
            fs.unlinkSync(socket);
        } catch(e) {}
    }

    luster.registerRemoteCommand('reload', function(sender, value) {
        console.log('master receive message reload from sender %s with value %s', sender.wid, value);
        luster.forEach(function(worker) {
            worker.remoteCall('reloadCache', sender.id, value);
        });
    });
    luster.registerRemoteCommand('request', function(sender, value) {
        console.log('master receive message request from sender %s with value %s', sender.wid, value);
    });
}

luster.configure({
    app : './app.js',
    workers : config.get('app:workers'),
    control : {
        forkTimeout : 1000,
        stopTimeout : 1000,
        exitThreshold : 3000,
        allowedSequentialDeaths : 3
    },

    server : {
        port : config.get('app:socket') || config.get('app:port'),
        groups : 1
    }
}, true, __dirname).run();