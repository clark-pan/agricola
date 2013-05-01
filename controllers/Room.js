var Room = require('../models/Room.js'),
	EventEmitter = require('events').EventEmitter,
	_ = require('underscore');

var RoomController = {
	initialize : function(app){
		var self = this;
		this.rooms = {};

		//Need to be logged in
		app.all(/^\/room/, function(req, res, next){
			if(req.user){
				return next();
			}
			req.flash('message', 'You must be logged in to view this page');
			return res.redirect('/');
		});

		//Binding routes
		app.get('/room/', _.bind(this.listRoute, this));
		app.post('/room/new', _.bind(this.createRoute, this));
		app.get('/room/:roomid', _.bind(this.showRoute, this));

		this.socketio = app.socketio.of('/room');
		this.socketio.on('connection', function(socket){
			socket.on('join', function(data, cb){
				var room = self.join(data.roomid, socket.handshake.user);
				if(room){
					socket.room = room;
					socket.join(room._id);
					self.bindSocketListeners(socket);
				} else {
					if(cb){
						cb({ error : true, message: 'Could not join room with roomid: ' + data.roomid});
					}
				}
			});
			socket.on('disconnect', function(){
				var room = socket.room;
				if(room){
					room.removeUser(socket.handshake.user);
					delete socket.room;
				}
			});
		});
	},
	listRoute : function(req, res, next){
		res.render('list', {
			rooms : this.rooms
		});
	},
	createRoute : function(req, res, next){
		this.create({
			owner : req.user,
		}, function(err, room){
			if(err) {
				return next(err);
			}
			res.redirect('/room/' + room._id);
		});
	},
	showRoute : function(req, res, next){
		var room = this.rooms[req.params.roomid];
		if(room){
			res.render('room', {
				room : room.toJSON()
			});
		} else {
			next(new Error('Could not find room specified with id:'+req.params.roomid));
		}
	},
	create : function(options, cb){
		var self = this;
		var room = Room.createRoom(options, function(err, room){
			if(err){
				return cb && cb(err);
			}
			self.rooms[room._id] = room;
			return cb && cb(null, room);
		});
	},
	join : function(roomid, user){
		var room = this.rooms[roomid];
		if(!room) {
			return false;
		}
		if(!room.addUser(user)){
			return false;
		}

		return room;
	},
	leave : function(roomid, user){

	},
	remove : function(roomid){

	},
	bindSocketListeners : function(socket){
		socket.on('message', function(data){
			socket.broadcast.to(socket.room._id).emit('message', {
				message : data.message,
				username : socket.handshake.user.username
			});
		});
	}
};

module.exports = RoomController;