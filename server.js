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
		documents: [ String ]
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
function insertPage(pageId, docs){
	page = new Page();
	page.pageId = pageId;
	page.created = new Date().toISOString();
	page.lastchanged = new Date().toISOString();
	page.user = "test";
	page.documents = docs;
	page.save(function(err){
		if(err){
			console.log('PAGE SAVE ERROR');
			console.log(err);
		}
	});
	return page;
}
function insertDoc(pageId, o){
	doc = new Doc();
	doc.docId = o.docId;
	doc.pageId = pageId;
	doc.created = new Date().toISOString();
	doc.lastchanged = new Date().toISOString();
	doc.user = "test";
	doc.name = "whatever";
	doc.type = o.type;
	doc.content = o.content;
	doc.save(function(err){
		if(err){
			console.log('DOC SAVE ERROR');
			console.log(err);
		}
	});
	return doc;
}



//-------------------
// Hashes
//-------------------
function hash(msg, salt) {
	return crypto
		.createHmac('sha256', salt)
		.update(msg)
		.digest('hex');
}
function passHash(pass) { return hash(pass, "zneak0wbo76jw84"); }
function pageHash(pageInfo) { return hash(pageInfo, "zneak0ncf05bw26").substr(0,7); }
function docHash(pageInfo) { return hash(pageInfo, "zneak0son68dk52").substr(0,10); }
function newDocHash() { return docHash('zneak'+new Date().getTime()*Math.random()); }



//-------------------
// Routes
//-------------------

//=== General
app.get(/^\/([a-zA-Z0-9]{7})?\/?(?!.)/, function(req, res, next) {
	var pageId = req.params[0];
	if(pageId){
		console.log('Fetching pageId '+ pageId);
		Page.findOne({ pageId: pageId}, function (err, page){
			if(err){
				console.log('--But it\'s invalid');
				req.flash("warn", "Invalid pageId, creating new page");
				pageId = pageHash('zneak'+new Date().getTime()*Math.random());
			}else{
				if(page){
					console.log('--And it exists');
					var data = { 
						pageId: pageId,
						docs: []
					};
					Doc.find({pageId: pageId}, function (err, docs){
						if(err){
							console.log('--Invalid doc query');
						}else{
							console.log('--Found '+docs.length+' docs');
							for(var i=0; i < docs.length; i++){
								var doc = docs[i];
								data.docs.push({
									type: doc.type,
									docId: doc.docId,
									content: doc.content
								});
							};
						}
						res.render('editor', data);
					});
				}else{
					console.log('--But it wasn\'t found');
					req.flash("warn", "Page not found, creating new page");
				}
			}
		});
	}else{
		console.log('Creating new page');
		pageId = pageHash('zneak'+new Date().getTime()*Math.random());
		res.render('editor', {
			pageId: pageId,
			docs: [
				{
					type: "html",
					docId: newDocHash(),
					content: "<h2>HTML</h2>"
				},
				{
					type: "css",
					docId: newDocHash(),
					content: "#css { color: red; }"
				},
				{
					type: "js",
					docId: newDocHash(),
					content: "console.log('hello world');"
				}
			]
		});
	}
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
	var docArr = [];
	for(var i=0; i < req.body.docs.length; i++){
		var doc = req.body.docs[i];
		docArr.push({
			type: doc.type,
			docId: doc.docId,
			content: doc.content
		});
	};
	Page.findOne({ pageId: pageId}, function (err, doc){
		if(err){
			if (req.accepts('json')) {
				res.send({ error: 'invalid pageId' });
				return;
			}
			res.type('txt').send('invalid pageId');
		}else{
			if(doc){ // Do Update
				if (req.accepts('json')) {
					res.send({ success: 'update @doc' });
					return;
				}
				res.type('txt').send('update @doc');
			}else{ // Do Insert
				var docs = [];
				for(var i=0; i < docArr.length; i++){
					var doc = insertDoc(pageId, docArr[i]);
					docs.push(doc._id);
				};
				console.log(docs);
				var page = insertPage(pageId, docs);
				if (req.accepts('json')) {
					res.send({ success: 'insert', page: page });
					return;
				}
				res.type('txt').send('insert');
			}
		}
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



//-------------------
// Start Server
//-------------------
bayeux.attach(app);
var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on " + port);
	startUp.save();
});
