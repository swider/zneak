var
	express = require('express'),
	memStore = express.session.MemoryStore,
	dust = require('express-dust'),
	crypto = require('crypto'),
	faye = require('faye'),
	bayeux = new faye.NodeAdapter({
		mount:    '/faye',
		timeout:  45
	}),

	app = express.createServer();


	app.dynamicHelpers({
		session: function(req, res){
			return req.session;
		},
		flash: function(req, res){
			var msg = req.flash();
			return msg;
		}
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
	app.use(express.logger());
	// TODO : add more analytics middleware here
});
app.configure(function(){
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret: 'zneak170154', store: memStore({reapInterval: 60*60*24*7})}));
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});



function requiresLogin(req, res, next){
	if(req.session.user){
		next();
	}else{
		res.redirect('/login?next='+req.url);
	}
}



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
dust.makeBase({
	copy: '&copy; 2011 Nobody LLC'
});

app.get('/', function(req, res, next) {
	res.render('index', {
		title: 'This is a test'
	});
});

app.get('/login', function(req, res, next) {
	res.render('login', { next: req.query.next || '/memberHome' });
});
app.post('/login', function(req, res, next) {
	var user = authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation 
      req.session.regenerate(function(){
        // Store the user's primary key 
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.user = user;
				res.redirect(req.body.next+'?fromLogin=true');
      });
    } else {
      req.flash("warn", "Invalid credentials.");
			res.redirect('/login?next='+req.body.next);
    }
  });
});
app.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/');
  });
});

var users = {
  tj: {
      name: 'tj'
    , salt: 'randomly-generated-salt'
    , pass: hash('foo', 'randomly-generated-salt')
  }
};

// Used to generate a hash of the plain-text password + salt
function hash(msg, key) {
  return crypto
    .createHmac('sha256', key)
    .update(msg)
    .digest('hex');
}

// Authenticate using our plain-object database of doom!
function authenticate(name, pass, fn) {
  if (!module.parent) console.log('authenticating %s:%s', name, pass);
  var user = users[name];
  // query the db for the given username
  if (!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  if (user.pass == hash(pass, user.salt)) return fn(null, user);
  // Otherwise password is invalid
  fn(new Error('invalid password'));
}

app.get('/test', requiresLogin, function(req, res, next) {
	res.render('index', {
		title: 'This is a login test'
	});
});

app.get('/partial', function(req, res, next) {
	res.partial('nav');
});

app.get('/partial_html', function(req, res, next) {
	res.partial('nav', function(err, html) {
		res.send(html);
	});
});



bayeux.attach(app);
var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on " + port);
	startUp.save();
});
