var mongoose = require('mongoose'),
	crypto = require('crypto');

function getHashedPassword(password, salt){
	return crypto.createHmac('sha1', salt).update(password).digest('hex');
}

function getSalt(){
	return Math.round((new Date().valueOf() * Math.random())) + '';
}

var schema = new mongoose.Schema({
	username: { type: String, required: true, index: { unique: true, dropDups: true }, trim : true, match: /^[a-zA-Z0-9_\-\.]+$/ },
	password: { type: String, required: true, trim : true },
	salt : String
});

schema.pre('save', function(next){
	if(!this.isModified('password')) {
		return next();
	}
	this.salt = getSalt();
	this.password = getHashedPassword(this.password, this.salt);
	next();
});

schema.methods.verifyUser = function(password){
	if(this.password === getHashedPassword(password, this.salt)){
		return true;
	}
	return false;
};

var User = mongoose.model('User', schema);

module.exports = User;