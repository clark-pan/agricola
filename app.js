var
	express = require('express'),
	hbs = require('hbs'),
	fs = require('fs'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	User = require('./models/User.js'),
	mongoose = require('mongoose'),
	flash = require('connect-flash'),
	app = express(),
	server = require('http').createServer(app),
	cookie = require('express/node_modules/cookie'),
	parseSignedCookie = require('express/node_modules/connect').utils.parseSignedCookie;

//Connecting to mongo instance
mongoose.connect('mongodb://localhost/agricola', function(err){
	if(err) {
		throw err;
	}
	console.log('Successfully connected to MongoDB instance');
});

//Registering partials
fs.readdirSync(__dirname + '/views/partials').forEach(function(value){
	var partialName = value.substring(0, value.lastIndexOf('.'));
	hbs.registerPartial(partialName, fs.readFileSync(__dirname + '/views/partials/' + value, 'utf8'));
});

//Registering helpers
(function(){
	//Redefine if check to also check for empty object
	var oldIf = hbs.handlebars.helpers['if'];
	hbs.registerHelper('if', function(context, options){
		if(isEmptyObject(context)){
			return options.inverse(this);
		} else {
			return oldIf.call(this, context, options);
		}
	});

	function isEmptyObject(obj){
		for(var name in obj){
			if(obj.hasOwnProperty(name)){
				return false;
			}
		}
		return true;
	}

	//forEach to enumerate through properties
	hbs.registerHelper('forEach', function(context, options){
		var fn = options.fn,
			rtn = '', data;

		if(options.data){
			data = hbs.handlebars.createFrame(options.data);
		}

		if(!isEmptyObject(context)){
			for(var i in context){
				if(context.hasOwnProperty(i)){
					if(data) { data.key = i; }
					rtn += fn(context[i], {data : data});
				}
			}
		} else {
			return options.inverse(this);
		}
		return rtn;
	});
})();

//Setting up view template engine
app.engine('hbs', hbs.__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');

//Connecting socketio middleware
//Store a reference to the socket.io server on app
app.socketio = require('socket.io').listen(server);

//Start logger
//app.use(express.logger());

//Serve static files
app.use(express.static(__dirname + '/public'));

//Enable sessions
app.sessionStore = new express.session.MemoryStore();

app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({ secret: 'foobar', store : app.sessionStore }));

//Enabling flash messages
app.use(flash());

//configuring passport
//TODO: refactor out into seperate bootstrap files

//configuring strategy
passport.use(new LocalStrategy(function(username, password, done){
	User.findOne({ username: username }, function (err, user) {
		if (err) { return done(err); }
		if (!user) {
		return done(null, false, { message: 'Incorrect username.' });
		}
		if (!user.verifyUser(password)) {
		return done(null, false, { message: 'Incorrect password.' });
		}
		return done(null, user);
	});
}));

//configuring serialization
passport.serializeUser(function(user, done){
	done(null, user._id);
});

passport.deserializeUser(function(id, done){
	User.findById(id, function(err, user){
		done(err, user);
	});
});

//binding passport middleware
app.use(passport.initialize());
app.use(passport.session());

//DEBUG
/*app.use(function(req, res, next){
	User.find({username : 'clark.pan'}, function(err, users){
		if(err){
			return next(err);
		}
		req.logIn(users[0], function(err, user){
			if(err){
				return next(err);
			}
			next();
		});
	});
});*/

//Make users available to locals
app.use(function(req, res, next){
	res.locals.user = req.user;
	next();
});

//Make users available to sockets
//Currently, any error in either getting the sessionstore, or deserializing the user, the error is ignored, and the authorization is deemed successful.
//The lack of user and session data will be handled by the application.
app.socketio.set('authorization', function(handshakeData, cb){
	if(handshakeData.headers.cookie){
		handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
		handshakeData.sessionId = parseSignedCookie(handshakeData.cookie['connect.sid'], 'foobar');
		app.sessionStore.get(handshakeData.sessionId, function(err, session){
			if(!err && session){
				handshakeData.session = session;
				if(handshakeData.session.passport && handshakeData.session.passport.user){
					//Private implementation in passport for deserialization
					passport.deserializeUser(handshakeData.session.passport.user, function(err, user){
						handshakeData.user = user;
						cb(null, true);
					});
				} else {
					cb(null, true);
				}
			} else {
				cb(null, true);
			}
		});
	} else {
		cb(null, true);
	}
});

//Bind Controllers
require('./controllers/User.js').initialize(app);
require('./controllers/Room.js').initialize(app);

app.all(/^\//, function(req, res, next){
	res.locals.message = req.flash('message');
	next();
});
app.get('/', function(req, res, next){
	res.render('index');
});

//Error middleware
app.use(function(err, req, res, next){
	console.log(err);
	res.status(500);
	res.render('error', { error : err});
});

server.listen(3000);