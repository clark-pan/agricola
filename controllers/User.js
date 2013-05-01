var passport = require('passport'),
	User = require('../models/User.js'),
	_ = require('underscore');

var errorMessageMap = {
	11000 : "User already exists, please choose another username"
};

var UserController = {
	initialize : function(app){
		//Bind Routes
		app.post('/user', _.bind(this.userRoute, this));
	},
	userRoute : function(req, res, next){
		//TODO: rewrite view logic
		if(req.body.username && req.body.password){
			switch(req.body.action){
				case "Create" :
					this.create(req.body.username, req.body.password, function(err, user){
						if(err) {
							if(errorMessageMap[err.code]) {
								req.flash('message', errorMessageMap[err.code]);
								return res.redirect('/');
							}
							return next(err);
						}
						req.logIn(user, function(err){
							if(err) {
								return next(err);
							}
							req.flash('message', "User Successfully created!");
							return res.redirect('/room/');
						});
					});
				break;
				case "Login" :
					passport.authenticate('local', function(err, user, info){
						if(err) {
							next(err);
						}
						if(!user){
							req.flash('message', 'Unsuccessful login');
							return res.redirect('/');
						}
						req.logIn(user, function(err){
							if(err) {
								return next(err);
							}
							req.flash('message', "Logged In");
							return res.redirect('/room/');
						});
					})(req, res, next);
				break;
				default :
					next(new Error('no valid action'));
			}
		} else {
			next(new Error('This route requires body.username and body.password'));
		}
	},
	create : function(username, password, cb){
		User.create({
			username : username,
			password : password
		}, function(err, user){
			if(cb){
				cb(err, user);
			}
		});
	},
	login : function(username, password){
		
	}
};

module.exports = UserController;