var
	express = require('express'),
	memStore = express.session.MemoryStore,
	mongoose = require('mongoose'),
	dust = require('express-dust'),
	crypto = require('crypto'),
	faye = require('faye'),
	bayeux = new faye.NodeAdapter({
		mount:    '/faye',
		timeout:  45
	}),
	app = express.createServer();



//--------------
// Config
//--------------
var
	env = "dev",
	mongoStr = "mongodb://localhost/zneak";
app.configure('development', function(){
	console.log("Configuring for development");
});
app.configure('production', function(){
	console.log("Configuring for production");
	env = "prod";
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
	app.use(function(req, res, next){
		if (req.accepts('html')) {
			res.status(404);
			res.render('404', { url: req.url });
			return;
		}
		if (req.accepts('json')) {
			res.send({ error: 'Not found' });
			return;
		}
		res.type('txt').send('Not found');
	});
	app.use(function(err, req, res, next){
		res.status(err.status || 500);
		res.render('500', { error: err });
	});
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.dynamicHelpers({
	session: function(req, res){
		return req.session;
	},
	flash: function(req, res){
		var msg = req.flash();
		return msg;
	}
});

dust.makeBase({
	copy: '&copy; 2012 <a href="http://nickswider.com/">Nick Swider</a>. All Rights reserved.'
});

var
	db = mongoose.createConnection(mongoStr),
	Schema = mongoose.Schema;



//-------------------
// Schemas & Models
//-------------------
	var
		StartUpSchema = new Schema({
			date: { type: Date, default: Date.now },
			env: { type: String, default: env }
		}),
		StartUp = db.model('StartUp', StartUpSchema),
		startUp = new StartUp();

	var UserSchema = new Schema({
		email: { type: String, required: true, index: { unique: true } },
		username: { type: String },
		password: { type: String },
		registered: { type: Date },
		lastchanged: { type: Date},
		lastlogin: { type: Date }
	});
	UserSchema.pre('save', function(next, done){
		this.lastchanged = new Date().toISOString();
		next();
	});
	var User = db.model('User', UserSchema);

	var DocSchema = new Schema({
		docId: { type: String, required: true, index: { unique: true } },
		pageId: { type: String },
		user: { type: String },
		created: { type: Date },
		lastchanged: { type: Date},
		name: { type: String },
		type: { type: String },
		content: { type: String }
	});
	DocSchema.pre('save', function(next, done){
		this.lastchanged = new Date().toISOString();
		next();
	});
	var Doc = db.model('Doc', DocSchema);

	var PageSchema = new Schema({
		pageId: { type: String },
		user: { type: String },
		created: { type: Date },
		lastchanged: { type: Date },
		documents: [Doc]
	});
	PageSchema.pre('save', function(next, done){
		this.lastchanged = new Date().toISOString();
		next();
	});
	var Page = db.model('Page', PageSchema);



//-------------------
// Auth Helpers
//-------------------
function requiresLogin(req, res, next){
	if(req.session.user){
		next();
	}else{
		res.redirect('/login?next='+req.url);
	}
}

function authenticate(email, password, callback){
	//console.log('Authenticating %s:%s', email, pass);
	User.findOne({ email: email}, function (err, doc){
		if(err){
			return callback('no such user: '+email, null);
		}else{
			if(doc.password == passHash(password))
				return callback(null, doc);
				return callback('invalid password', null);
		}
	});
}
function register(username, email, password){
	user = new User();
	user.username = username;
	user.email = email;
	user.password = passHash(password);
	user.registered = new Date().toISOString();
	user.save();
	return user;
}



//-------------------
// Page Helpers
//-------------------
function insertPage(pageId){
	page = new Page();
	page.pageId = pageId;
	page.created = new Date().toISOString();
	page.lastchanged = new Date().toISOString();
	page.user = "test";
	page.documents = [];
	//page.save();
	page.save(function(err){
		if(err){
			console.log('SAVE ERROR');
			console.log(err);
		}
	});
	return page;
}



//-------------------
// Authentication
//-------------------
function hash(msg, salt) {
	return crypto
		.createHmac('sha256', salt)
		.update(msg)
		.digest('hex');
}
function passHash(pass) { return hash(pass, "zneak0wbo76jw84"); }
function pageHash(pageInfo) { return hash(pageInfo, "zneak0ncf05bw26").substr(0,7); }



//-------------------
// Routes
//-------------------

//=== General
app.get(/^\/([a-zA-Z0-9]{7})?\/?(?!.)/, function(req, res, next) {
	console.log('.');
	var pageId = req.params[0];
	if(pageId){
		console.log('Fetching pageId '+ pageId);
		Page.findOne({ pageId: pageId}, function (err, doc){
			if(err){
				console.log('But it\'s invalid');
				req.flash("warn", "Invalid pageId, creating new page");
				pageId = pageHash('zneak'+new Date().getTime()*Math.random());
			}else{
				if(doc){
					console.log('And it exists');
					res.render('editor', {
						pageId: pageId,
						docs: [
							{
								type: "html",
								docId: "123abc"
							},
							{
								type: "css",
								docId: "456def"
							}
						]
					});
				}else{
					console.log('But it wasn\'t found');
					req.flash("warn", "Page not found, creating new page");
				}
			}
		});
	}else{
		console.log('Creating new page');
		pageId = pageHash('zneak'+new Date().getTime()*Math.random());
	}
	res.render('editor', {
		pageId: pageId,
		docs: [
			{
				type: "html",
				docId: "123abc",
				content: "<h2>HTML</h2>"
			},
			{
				type: "css",
				docId: "456def",
				content: "#css { color: red; }"
			}
		]
	});
});
app.get(/^\/([a-zA-Z0-9]{7})\/preview\/?(?!.)/, function(req, res, next) {
	var pageId = req.params[0];
	res.render('preview', {
		title: 'This is a preview',
		pageId: pageId
	});
});
app.post(/^\/([a-zA-Z0-9]{7})\/save\/?(?!.)/, function(req, res, next) {
	var pageId = req.params[0];
	console.log('Saving '+pageId);
	Page.findOne({ pageId: pageId}, function (err, doc){
		if(err){
			if (req.accepts('json')) {
				res.send({ error: 'invalid pageId' });
				return;
			}
			res.type('txt').send('invalid pageId');
		}else{
			if(doc){
				if (req.accepts('json')) {
					res.send({ success: 'update @doc' });
					return;
				}
				res.type('txt').send('update @doc');
			}else{
				var page = insertPage(pageId);
				if (req.accepts('json')) {
					res.send({ success: 'insert', page: page });
					return;
				}
				res.type('txt').send('insert');
			}
		}
	});
});

app.get('/account', requiresLogin, function(req, res, next) {
	res.render('index', {
		title: 'This is a login test'
	});
});

app.get('/memberHome', requiresLogin, function(req, res, next) {
	res.render('index', {
		title: 'Member Home'
	});
});


//=== Auth
app.get('/login', function(req, res, next) {
	res.render('login', { next: req.query.next || '/memberHome' });
});
app.post('/login', function(req, res, next) {
	var user = authenticate(req.body.email, req.body.password, function(err, user){
		if (user) {
			req.session.regenerate(function(){
				req.session.user = user;
				res.redirect(req.body.next+'?fromLogin=true');
			});
		} else {
			req.flash("warn", err);
			res.redirect('/login?next='+req.body.next);
		}
	});
});
app.get('/logout', function(req, res){
	req.session.destroy(function(){
		res.redirect('/');
	});
});

app.get('/register', function(req, res, next) {
	res.render('register', {});
});
app.post('/register', function(req, res, next) {
	var user = register(req.body.username, req.body.email, req.body.password);
	if(typeof user == "string"){
		req.flash("warn", user);
		res.redirect('/memberHome');
	}else{
		req.session.regenerate(function(){
			req.session.user = user;
			res.redirect(req.body.next+'?fromLogin=true');
		});
	}
});


//=== Helper
app.get('/partial', function(req, res, next) {
	res.partial('nav');
});
app.get('/partial_html', function(req, res, next) {
	res.partial('nav', function(err, html) {
		res.send(html);
	});
});



//-------------------
// Start Server
//-------------------
bayeux.attach(app);
var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on " + port);
	startUp.save();
});
