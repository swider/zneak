var
	express = require('express'),
	dust = require('express-dust'),
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




//Sets up Global Variables to be used in all views
//dust.makeBase({
//    copy: '&copy; 2011 Nobody LLC'
//});
//
//app.get('/', function(req, res, next) {
//    res.render('index', {
//        title: 'This is a test'
//    });
//});
//
//app.get('/partial', function(req, res, next) {
//    res.partial('nav');
//});
//
//app.get('/partial_html', function(req, res, next) {
//    res.partial('nav', function(err, html) {
//        res.send(html);
//    });
//});



bayeux.attach(app);
var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on " + port);
	startUp.save();
});
