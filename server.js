var
	express = require('express'),
	faye = require('faye'),
	bayeux = new faye.NodeAdapter({
		mount:    '/faye',
		timeout:  45
	}),

	app = express.createServer();

app.configure(function(){
	app.use(express.methodOverride());
	app.use(express.bodyParser());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});


var
	env = "dev",
	mongoStr = "mongodb://localhost/zneak";
app.configure('development', function(){
	console.log("Configuring for development");
});
app.configure('production', function(){
	console.log("Configuring for production");
	env = "prod",
	mongoStr = "mongodb://zneak_prod:jd78Fns$yv@ds033297.mongolab.com:33297/heroku_app4856593";
});


var
	mongoose = require('mongoose'),
	db = mongoose.createConnection(mongoStr),
	Schema = mongoose.Schema,
	StartUpSchema = new Schema({
		date: { type: Date, default: Date.now },
		env: { type: String, default: env },
	}),
	StartUp = db.model('StartUp', StartUpSchema),
	startUp = new StartUp;


bayeux.attach(app);
var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on " + port);
	startUp.save();
});
