var mongoose = require('mongoose'),
	_ = require('underscore'),
	Schema = mongoose.Schema,
	Game = require('../game/Game.js'),
	socketio = require('socket.io'),
	Room;

var schema = new Schema({
	users : [{type: Schema.Types.ObjectId, ref : "User"}],
	owner : {type: Schema.Types.ObjectId, ref: "User", required : true}
});

_.extend(schema.methods, {
	addUser : function(user){
		this.users.push(user._id);
		return true;
	},
	removeUser : function(user){
		
		return true;
	}
});

_.extend(schema.statics, {
	createRoom : function(doc, cb){
		var room = new Room(doc);
		room.validate(function(err){
			if(err) {
				return cb && cb(err);
			}
			room.game = new Game();
			return cb && cb(null, room);
		});
	}
});

Room = mongoose.model('Room', schema);

module.exports = Room;