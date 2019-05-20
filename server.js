
var express = require('express'); //Web server lib
var app = express(); // A var that contains an instance of Express
var bodyParser = require('body-parser') // Used by Express to parse POST request
var MongoClient = require('mongodb').MongoClient; // MongoDb driver for NodeJs
var influxLib = require('influx') // InfluxDB driver for NodeJs
var json2csv = require('json2csv') // Lib for converting JSON to CSV 

// To install dependencies run 'npm install'. It installs the dependenecies defined in package.json file

// Server config
var influx = new influxLib.InfluxDB( // Var that contains an instance of Influx
{
    host: 'localhost', // Where the database is located
    database: 'emsReadings', // The targeted DB name
    schema: [
    {
        measurement: 'carReadings', // Measurement means table in Influx
        fields: { // ColumnName : influxLib.FieldType.[DataType]
            temp: influxLib.FieldType.FLOAT,
            humidity: influxLib.FieldType.FLOAT,
            uvIndex: influxLib.FieldType.INTEGER,
            airQuality: influxLib.FieldType.FLOAT,
            latitude: influxLib.FieldType.FLOAT,
            longitude: influxLib.FieldType.FLOAT,
            speed: influxLib.FieldType.INTEGER
        },
        tags: [ // 'tagName'. A value that describes the fields
        'carId'
        ]
    } 
    ]
}
);

// Tell Express to use BodyParser
app.use(bodyParser.urlencoded({ // URL-Encode data if received as x-www-form-urlencode (Not used in this case)
    extended: true
}));
app.use(bodyParser.json()); // Parse JSON from POST requests to make Express use it.

app.use(express.static('public')); // Config Express to serve static webpages from folder public

var db; // Var to store the database instance from MongoDB
MongoClient.connect("mongodb://localhost:27017/emsData", function(err, database) { // Connects to MongoDB and specifies where is Mongo located & the database name
  if(err) throw err; 

  db = database; // If no error then store the targeted database instance in db var;

    app.listen(3000, function () { // Start Express 
        console.log('EMS system listening on port 3000!')
    });
});




//Routes

app.get('/', function(req, res) {
    res.send('Hello Ruba from NodeJs');
});


// Gets all user/car info for a specific CarId 
app.get('/api/viewCarData/:carId', function(req, res) { // Get data for a certain car name passed in :carId 
    var carId = req.params.carId; // Gets the value of :carId

    if (carId) { // If carId exists or not null
        var users = db.collection('users'); // Get the collection instance for users collection
         users.findOne({'carId': carId}) // Query users collection for the requested carId
            .then(docs => { // On success return the matching docs
                if (docs) // If there are matching docs 
                    res.send(docs); // Return them
                else
                    res.status(404).send({ error : 'Car not found' }); // Return no cars found for this id
            })
            .catch(err => { // On MongoDb Failure
                res.status(500).send({ error: 'Failure: ' + err}); // Return a server error
            });
    } else { // Send Bad Request response if carId is null
          res.status(400).send({ error: 'Missing params. CarID is required' });
    }
});

// app.get('/insertCarData/:carId/:temp/:uvIndex/:humidity/:airQuality/:long/:lat', function (req, res) {
    
//     // Connection URL
//     var url = 'mongodb://localhost:27017/rubaDb';
//     // Use connect method to connect to the Server
   
//         insertReadings({carId : req.params.carId, temp : req.params.temp, uv : req.params.uvIndex, humidity : req.params.humidity, airQuality: req.params.airQuality, long:req.params.long,lat:req.params.lat}, db, function(results){
//             db.close();
//             res.send('Data inserted succesfully');
//         });
// });

// Inserts a new reading
app.post('/api/newReading', function(req, res) { // name of route 
    // Get the params sent in POST body & store them in variables
    var t = req.body.temp;
    var h = req.body.humidity;
    var uv = req.body.uvIndex;
    var aq = req.body.airQuality;
    var lat = req.body.lat;
    var lng = req.body.lng;
    var spd = req.body.speed;
    var car = req.body.carId;
    
    // Check if carId isn't null
    if (car) {
        influx.writePoints( // Write the readings to Influx
        [
            {
                measurement: 'carReadings', // The name of the Influx measurement (table)
                tags: { carId: car }, // Write the tags
                fields: { temp: t, humidity: h, uvIndex: uv, airQuality: aq, latitude: lat, longitude:lng, speed: spd },
                // Write the fields
            }
        ]
        ).then(() => { // On Success
            res.send({status: 'Success'});
        }).catch(err => { // On Influx
            res.status(500).send({ error: 'Failure: ' + err});
        });
    } else { // If carId wasn't sent or it was null, send Bad Request response
        res.status(400).send({ error: 'Missing param: CarID' });
    }
    
});

// app.post('/api/newCar', function(req, res){
//     var id = req.body.carId;
    
//     var url = 'mongodb://localhost:27017/rubaDb';
//     // Use connect method to connect to the Server
//             var cars = db.collection('cars');
//             cars.insert({carId:id}, function(err, result){
//                 if (!err) {
//                     console.log('Data inserted');
//                     res.send("Car created successfully");
//                 } else {
//                     res.status(500).send("Something wrong happened " + err);
//                 }
//             });
// });

// Login route, used in the app
app.post('/api/login', function(req, res) {
    // Get the params sent in POST body & store them in variables
    var carID = req.body.carId;
    var password = req.body.password;

    // If carId & password aren't null
    if (carID && password) {
            var users = db.collection('users'); // Get the collection instance for users collection
            users.findOne({'carId': carID, 'password':password}) // Query users collection for the requested username & password
            .then(docs => { // On success return the matching docs
                    if (docs) // If there are matching docs 
                        res.status(200).send({ status : 'Success' }); // Return them
                    else
                        res.status(404).send({ error: 'Invalid Credentials' }); // Return no users found for these credentials (Invalid Credentials)
            })
            .catch(err => { // On MongoDb Failure
                res.status(500).send({ error: 'Failure: ' + err});  
            });
    } else { // If username & password weren't sent or were null, send Bad Request response
         res.status(400).send({ error: 'Missing params. CarID & Password are required' });
    }
});

// Register route, used in the app
app.post('/api/register', function(req, res) {
    // Get the params sent in POST body & store them in variables
    var email = req.body.email;
    var name = req.body.name;
    var password = req.body.password;
    var location = req.body.location;
    var carId = req.body.carId;

    // If carId & email & password (the fields you think are required) aren't null
    if (carId && email && password)  {

            var users = db.collection('users'); // Get the collection instance for users collection
            
            users.findOne({'email' : email, 'carId' : carId}) // Check for dublicates by querying users collection for the sent username & carId
            .then(docs => { // On success of that query
                    if (docs) // If there's a user with the same carId & username
                        res.status(409).send({ error : 'User Exists' }); // Send an error saying User Exists
                    else // If no dublicates
                        // Insert the new user info
                        users.insertOne({'name' : name, 'location' : location, 'email' : email, 'password' : password, 'carId': carId})
                        .then(doc => { // On success 
                            // console.log(doc);
                            res.status(200).send({ status: 'User Registered' }); // Send success status
                        })
                        .catch(err => { // on Mongo failure
                            // console.log(err);
                            res.status(500).send({ error: 'Failure ' + err }); // Send the error
                        });
            })
            .catch(err => { // on Mongo failure
                // console.log(err);
                res.status(500).send({ error: 'Failure ' + err }); // Send the error
            });
    } else { // If one of the required fields are missing then send Bad Request response
        res.status(400).send({ error: 'Missing params. CarID, Email & Password are required' }); 
    }
});

// Gets readings for a specific car & between 2 times
app.get('/api/getReadings/:carId/:from/:to', function(req, res) {

    // Get the params sent in the URL & store them in variables
    var carId = req.params.carId;
    var from = req.params.from;
    var to = req.params.to;

    // If they aren't null
    if (carId && from && to) {
        // Query Influx for the sent carId, starting time & end time
        influx.query(`select * from carReadings where carId = '${carId}' and time > ${from} and time < ${to}`, {precision:'s'})
        .then(results => { // On success
            res.json(results); // Send the results
        })
        .catch(err => { // On Influx failure
            res.status(500).send({ error : 'Failure: ' + err}); // Send the error
        });
    } else { // If one of the params is missing
        res.status(400).send({ error : 'Missing Params' }); // Send Bad Request response
    }
});

// Gets all readings for a specific car
app.get('/api/getAllReadings/:carId', function(req, res) {

    // Get the params sent in the URL & store them in variables
    var carId = req.params.carId;

    // If carId isn't null
    if (carId) { 
        //Query Influx for the readings of the sent carId
        //s for secs. Used to select Influx time precision 
        influx.query(`select * from carReadings where carId = '${carId}'`, {precision:'s'}) 
        .then(results => { // On success
            // Send the results
            res.json(results);
        })
        .catch(err => { // On Influx failure
            res.status(500).send({ error : 'Failure: ' + err}); // Send the error
        });
    } else { // If carId is null send Bad request
        res.status(400).send({ error : 'Missing Params' });
    }
});

// Gets all readings for a specific car in CSV
app.get('/api/getAllReadingsCSV/:carId/data.csv', function(req, res) {
    // Get the params sent in the URL & store them in variables
    var carId = req.params.carId;

    // If carId isn't null
    if (carId) {
        //Query Influx for the readings of the sent carId
        //s for secs. Used to select Influx time precision 
        influx.query(`select * from carReadings where carId = '${carId}'`, {precision:'s'})
        .then(results => { // On success

            // Convert the response to CSV
            var influxFields = ['carId', 'temp', 'humidity', 'uvIndex', 'airQuality', 'latitude', 'longitude', 'speed']
            var csv = json2csv({data: results, fields: influxFields});
            res.status(200).send(csv); // Send the results
        })
        .catch(err => { // On Influx failure
            res.status(500).send({ error : 'Failure: ' + err}); // Send the error
        });
    } else { // If carId is null send Bad request
        res.status(400).send({ error : 'Missing Params' });
    }
});

// Gets all reading for all cars
app.get('/api/getAllReadings', function(req, res) { 
        // Query Influx for all readings from all cars
        influx.query(`select * from carReadings`, {precision:'s'})
        .then(results => { // On success
            // Send the result
            res.json(results);
        })
        .catch(err => { // On Influx failure
            res.status(500).send({ error : 'Failure: ' + err}); // Send the error
        });
});

// Gets all readings in CSV
app.get('/api/getAllReadingsCSV/data.csv', function(req, res) {
    // Query Influx for all readings from all cars
        influx.query(`select * from carReadings`, {precision:'s'}) //s for secs. Used to select Influx time precision 
        .then(results => { // On Success

            // Convert the response to CSV
            var influxFields = ['carId', 'temp', 'humidity', 'uvIndex', 'airQuality', 'latitude', 'longitude', 'speed']
            var csv = json2csv({data: results, fields: influxFields});
            res.status(200).send(csv); // Send the results
        })
        .catch(err => { // On Influx failure
            res.status(500).send({ error : 'Failure: ' + err}); // Send the error
        });
});



// function insertReadings(data, db, callback) {
//     // Get the documents collection
//     var collection = db.collection('readings');
//     // Insert some documents
//     collection.insert(
//     data
//     , function(err, result) {
//         console.log("Inserted " + data + " into the document collection");
//         callback(result);
//     });
// }

// function findReadings(car, db, callback) {
//     // NodeJs code to communicate with the database
//     db.collection('readings').find({carId : car}).toArray(function(err, docs) {
//         callback(err,docs);
//     });
// }
