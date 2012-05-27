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


bayeux.attach(app);
var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});