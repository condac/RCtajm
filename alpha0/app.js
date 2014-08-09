var express = require('express');                       // Express template
var path = require('path');                             // Express template
var favicon = require('static-favicon');                // Express template
var logger = require('morgan');                         // Express template
var cookieParser = require('cookie-parser');            // Express template
var bodyParser = require('body-parser');                // Express template
var debug = require('debug')('alpha0');

var routes = require('./routes/index');                 // Express template
var users = require('./routes/users');                  // Express template
var admin = require('./routes/admin');

var io = require('socket.io');
//var spawn = require('child_process').spawn;
var exec = require('child_process').exec,
                    child;

var app = express(),
mongo = require('mongodb'),
server = require('http').createServer(app).listen(8080),
client = io.listen(server);



//debug('Express server listening on port ' + server.address().port);

var SerialPort = require("serialport").SerialPort;
var sendData = "";
var serialPort;
var portName = '/dev/ttyACM0'; //change this to your serial port


// view engine setup                                    // Express template
app.set('views', path.join(__dirname, 'views'));        // Express template
app.set('view engine', 'jade');                         // Express template

app.use(favicon());                                     // Express template
app.use(logger('dev'));                                 // Express template
app.use(bodyParser.json());                             // Express template
app.use(bodyParser.urlencoded());                       // Express template
app.use(cookieParser());                                // Express template
app.use(express.static(path.join(__dirname, 'public'))); // Express template

app.use('/', routes);                                   // Express template
app.use('/users', users);                               // Express template
app.use('/admin', admin); 

/// catch 404 and forward to error handler              // Express template
app.use(function(req, res, next) {                      // Express template
    var err = new Error('Not Found');                   // Express template
    err.status = 404;                                   // Express template
    next(err);                                          // Express template
});                                                     // Express template

/// error handlers                                      // Express template

// development error handler                            // Express template
// will print stacktrace                                                // Express template
if (app.get('env') === 'development') {                                                 // Express template
    app.use(function(err, req, res, next) {                                                 // Express template
        res.status(err.status || 500);                                              // Express template
        res.render('error', {                                               // Express template
            message: err.message,                                               // Express template
            error: err                                              // Express template
        });                                                 // Express template
    });                                                 // Express template
}                                               // Express template

// production error handler                                 // Express template
// no stacktraces leaked to user                            // Express template
app.use(function(err, req, res, next) {                     // Express template
    res.status(err.status || 500);                                  // Express template
    res.render('error', {                               // Express template
        message: err.message,                           // Express template
        error: {}                                       // Express template
    });                                                 // Express template
});                                                     // Express template


module.exports = app;                                   // Express template





/*function handleData(inData,col) {
    console.log("handleData"+inData);

    var name = "auto", 
        message = inData;

        col.insert({name: name, message: message }, function(err,result) {
            if (err) throw err;
        });

}*/

mongo.connect("mongodb://localhost/rctajm", function(err,db) {
    if (err) throw err;
    var colLaps = db.collection("laptimes");
    colLaps.remove({}, function(err,res) {
        if (err) throw err;
    });

    console.log("Opening serial device on "+portName);
    var receivedData = "";
    serialPort = new SerialPort(portName, {
        baudrate: 9600,
        // defaults for Arduino serial communication
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        flowControl: false
    });
 
    serialPort.on("open", function () {
      console.log('serial communication is open');
            // Listens to incoming data
        serialPort.on('data', function(data) {
            receivedData += data.toString();
            
            if (receivedData[0] !== 'C' && receivedData.length>2 && receivedData.indexOf('C') >= 0) {
                console.log("FIRST NOT START CHAR");
                receivedData = receivedData.substring(receivedData.indexOf('C'));
            }
            if (receivedData.indexOf('\n') >= 0 && receivedData.indexOf('C') >= 0) {
                
                var splitData2 = receivedData.substring(receivedData.indexOf('C'), receivedData.indexOf('\n')+1);
                receivedData = receivedData.replace(splitData2,"");
                console.log(splitData2);
                var splitData = splitData2.split(":");
                console.log("."+receivedData);

                //receivedData = "";
                
                if (splitData.length>4) {
                    var colDrivers = db.collection("drivers");
                    var name2 =  splitData[1];
                    colDrivers.findOne({ transponders: splitData[1]}, function(err, document, name2) {
                        if (err) throw err;
                        if (document !== null) {
                            name2 = document.name;
                        } else {
                            name2 = splitData[1];
                        }
                        var colLaps = db.collection("laptimes");
                        colLaps.find({ name: name2 }, {'limit':1, 'sort':[[ 'lapTime', 'desc']]}).toArray(function(err, docs) {            
                            var lap;
                            if (docs.length>0) {
                                
                                var lap = (splitData[2] - docs[0].lapTime)/1000;
                                var totallaps = docs[0].laps+1;
                                console.log(splitData[1]+"Returned #" + docs[0].lapTime + " serial: "+splitData[2]+" sum:" + lap);  
                                
                                
				                
                                //client.emit("laptime", "name: "+name2+" tran: "+splitData[1]+" laptime: "+lap/1000+" strength: "+splitData[3]+" hits: "+splitData[4]+" ");
                                

                            } else {
                                //console.log("no laps");
                                lap = "first lap";
				                totallaps = 0;
                                    //"name: "+name2+" tran: "+splitData[1]+" laptime: first lap"+" strength: "+splitData[3]+" hits: "+splitData[4]+" ");
                        
                            }
                            client.emit("laptime", {
                                    name: name2,
                                    laptime: lap,
                                    transponder: splitData[1],
                                    strength: splitData[3],
                                    hits: splitData[4],
                                    laps: totallaps
                            });

                            colLaps.insert({name: name2, 
                                         transponder: splitData[1],
                                             lapTime: parseInt(splitData[2]), 
                                            strength: parseInt(splitData[3]), 
                                                hits: parseInt(splitData[4]),
                                                laps: totallaps }, 
                                function(err,result) {
                                    if (err) throw err;

                                    //console.log("inserted "+name2+" "+splitData[2]+" trying to clear:"+splitData2+" in:"+receivedData);
                                    receivedData = receivedData.replace(splitData2,"");
                                }
                            );

                            var colRace = db.collection("currentrace");
                            console.log("race insert:"+name2+splitData[0]+":"+splitData[1]+":"+splitData[2]+":");
                            colRace.update({name: name2}, {  name: name2, totalTime:parseInt(splitData[2]), laps: parseInt(totallaps), lastLapTime: lap },{upsert: true},
                                function(err,result) {
                                    if (err) throw err;
                                    //console.log("racetable result");
                                }

                            );
                            colRace.find({}).sort({laps: -1, totalTime: 1}).toArray(function(err,res) {
                            //colRace.find({}, {  "sort": [['laps','asc'], ['totalTime','desc']] }, function(err,result) {
                                    if (err) throw err;
                                    //console.log("cartable result"+res);
                                    client.emit("cartable", res);
                                }

                            );
                            
                            colDrivers.find({}).toArray (function(err,res) {
                                //console.log(res);
                                //console.log(res.transponders);
                            });

                            //client.emit("cartable", "banan")
                        });
                            
                            //var laptime = splitData - document.lapTime
                            
                        //client.emit("laptime", "laptime "+name2+" "+splitData[1]+" "+splitData[2]+" "+splitData[3]+" "+splitData[4]+" ");
                
                        

                        //var colLaps = db.collection("laptimes");
                        //colLaps.insert({name: name2, lapTime: parseInt(splitData[2]), strength: parseInt(splitData[3]), hits: parseInt(splitData[4]) }, function(err,result) {
                        //    if (err) throw err;
                        //    console.log("inserted "+name2+" "+splitData[2]);
                        //});
                    });
                    
                    
                }
                
            }
         // send the incoming data to browser with websockets.
       //socketServer.emit('update', sendData);

      });  
    });  

    client.on("connection", function(socket) {

        col = db.collection("laptimes"),
            sendStatus = function(s) {
                socket.emit("status", s);
            };
        
        // emit all messages
        col.find().limit(100).sort({_id: 1}).toArray(function(err,res) {
            if (err) throw err;
            //socket.emit("output", res);
        });


        //wait for input
        socket.on("input", function(data) {
            console.log(data);
            
        });

        //wait for input
        socket.on("adddriver", function(data) {
            console.log(data);
            var colDrivers = db.collection("drivers");
            colDrivers.insert({name: data.name, transponders: [ data.transponder ]}, function(err,result) {
                if (err) throw err;
                console.log("inserted "+data.name+" "+data.transponder);
            });
            //colDrivers = db.collection("drivers");
            
            colDrivers.find().sort({name: 1}).toArray(function(err,res) {
                if (err) throw err;
                socket.emit("drivertable", res);
            });
            
        });
        socket.on("addMoreTrans", function(data) {
            console.log(data);
            
            var colDrivers = db.collection("drivers");

            var o_id = require('mongodb').ObjectID(data.id);
            if (data.transponder.length>1) {
                colDrivers.update({ _id: o_id }, { $addToSet: { transponders: data.transponder}},function(err,res) {
                    if (err) throw err;
                    console.log(res);
                    console.log("updated transponder number");

                    var colDrivers = db.collection("drivers");
            
                    colDrivers.find().sort({name: 1}).toArray(function(err,res) {
                        if (err) throw err;
                        socket.emit("drivertable", res);
                    });
                });
            }
            
            colDrivers.find({ _id: o_id }).toArray(function(err,res) {
                if (err) throw err;
                console.log(res);
            });
            
        });
        socket.on("getdriver", function(data) {
            console.log(data);
            var colDrivers = db.collection("drivers");
            
            colDrivers.find().sort({name: 1}).toArray(function(err,res) {
                if (err) throw err;
                socket.emit("drivertable", res);
            });
            
            
        });
        socket.on("racecommand", function(data) {
            console.log(data);
            if (data == "start"){
                serialPort.write("Start");
                

                child = exec('mpg123 sound/AirHorn-SoundBible.com-1561808001.mp3',
                  function (error, stdout, stderr) {
                    //console.log('stdout: ' + stdout);
                    //console.log('stderr: ' + stderr);
                    if (error !== null) {
                      console.log('exec error: ' + error);
                    }
                });
                //spawn('vlc', 'AirHorn-SoundBible.com-1561808001.mp3', function() {
                    //sound end calback
               
            }
            if (data == "stop"){
                serialPort.write("Quit");
            }
            if (data == "clear"){
                var colRace = db.collection("currentrace");
                colRace.remove({}, function(err,res) {
                    if (err) throw err;
                });
                var colLaps = db.collection("laptimes");
                colLaps.remove({}, function(err,res) {
                    if (err) throw err;
                });
            }
                
            
        });
        socket.on("getAllLaps", function(data) {
            console.log(data);
            
            var colLaps = db.collection("laptimes");
            colLaps.find({ name: data}).sort({laps: 1}).toArray( function(err,res) {
                if (err) throw err;
                socket.emit("laptimes", res);
            });
            
                
            
        });

    });


});
