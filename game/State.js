/* {
	round : Number,
	phase : {
		name : String
	},
	players : {
		'player_id' : {
			id : 'player_id',
			user : {
				username : String,
				color : String
			},
			nextPlayer : 'player_id',
			resources : {
				food : Number,
				wood : Number,
				clay : Number,
				reed : Number,
				stone : Number,
				grain : Number,
				vegetable : Number
			},
			board : [{ //Length of 15 for each field position
				type : "empty|field|pasture|room",
				crop : "grain|vegetable",
				cropRemaining : Number,
				pastureConnections : Number, //1 for top, 2 for right, 4 for bottom, 8 for left
				hasStable : Boolean,
				animal : "sheep|boar|cow",
				animalCount : Number,
				roomType : "wood|clay|stone"
			}],
			occupations : {
				name : {
					name : String,
					played : Boolean
				}
			},
			improvements : {
				name : {
					name : String,
					played : Boolean
				}
			},
			familyMembers : Number,
			newFamilyMembers : Number,
			fencesRemaining : 15,
			stablesRemaining : 4,
			beggerCards : Number
		}
	},
	startingPlayer : 'string',
	actions : {
		name : {
			name : String
		}
	},
	majorImprovements : {
		name : {
			name : String,
			owner : 'player_id'
		}
	}
}
*/
define(['underscore'], function(_){
	var defaultState = {
		round : 0,
		phase : {
			name : 'pre'
		},
		hostPlayer : null,
		players : [],
		startingPlayer : null,
		actions : {

		},
		majorImprovements : {
			'major-1' : {
				name : 'major-1',
				owner : null
			},
			'major-2' : {
				name : 'major-2',
				owner : null
			},
			'major-3' : {
				name : 'major-3',
				owner : null
			},
			'major-4' : {
				name : 'major-4',
				owner : null
			},
			'major-5' : {
				name : 'major-5',
				owner : null
			},
			'major-6' : {
				name : 'major-6',
				owner : null
			},
			'major-7' : {
				name : 'major-7',
				owner : null
			},
			'major-8' : {
				name : 'major-8',
				owner : null
			},
			'major-9' : {
				name : 'major-9',
				owner : null
			},
			'major-10' : {
				name : 'major-10',
				owner : null
			}
		}
	};

	var defaultBoard = (function(){
		var board = [];
		var emptyField = {
			type : 'empty',
			hasStable : false
		};
		var roomField = {
			type : 'room',
			roomType : 'wood'
		};
		for(var i = 0; i < 15; i++){
			if(i === 6 || i === 11){
				board.push(roomField);
			} else {
				board.push(emptyField);
			}
		}
		return board;
	})();

	var deepClone = function(obj) {
		return JSON.parse(JSON.stringify(obj));
	};

	function State(state, stateId){
		this.state = state;
		this.stateId = stateId || 0;
		this.events = {

		};
	}

	_.extend(State.prototype, {
		applyTransform : function(op){
			var self = this;
			//https://github.com/josephg/ShareJS/blob/master/src/types/json.coffee
			var c, container, e, elem, i, key, p, parent, parentkey, _i, _j, _len, _len1, _ref;
			self.checkValidOp(op);
			op = deepClone(op);
			container = {
				data: deepClone(this.state)
			};
			try {
				for (i = _i = 0, _len = op.length; _i < _len; i = ++_i) {
					c = op[i];
					parent = null;
					parentkey = null;
					elem = container;
					key = 'data';
					_ref = c.p;
					for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
						p = _ref[_j];
						parent = elem;
						parentkey = key;
						elem = elem[key];
						key = p;
						if (parent === null) {
							throw new Error('Path invalid');
						}
					}
					if (c.na !== void 0) {
						if (typeof elem[key] !== 'number') {
							throw new Error('Referenced element not a number');
						}
						elem[key] += c.na;
					} else if (c.si !== void 0) {
						if (typeof elem !== 'string') {
							throw new Error("Referenced element not a string (it was " + (JSON.stringify(elem)) + ")");
						}
						parent[parentkey] = elem.slice(0, key) + c.si + elem.slice(key);
					} else if (c.sd !== void 0) {
						if (typeof elem !== 'string') {
							throw new Error('Referenced element not a string');
						}
						if (elem.slice(key, key + c.sd.length) !== c.sd) {
							throw new Error('Deleted string does not match');
						}
						parent[parentkey] = elem.slice(0, key) + elem.slice(key + c.sd.length);
					} else if (c.li !== void 0 && c.ld !== void 0) {
						self.checkList(elem);
						elem[key] = c.li;
					} else if (c.li !== void 0) {
						self.checkList(elem);
						elem.splice(key, 0, c.li);
					} else if (c.ld !== void 0) {
						self.checkList(elem);
						elem.splice(key, 1);
					} else if (c.lm !== void 0) {
						self.checkList(elem);
						if (c.lm !== key) {
							e = elem[key];
							elem.splice(key, 1);
							elem.splice(c.lm, 0, e);
						}
					} else if (c.oi !== void 0) {
						self.checkObj(elem);
						elem[key] = c.oi;
					} else if (c.od !== void 0) {
						self.checkObj(elem);
						delete elem[key];
					} else {
						throw new Error('invalid / missing instruction in op');
					}

					//Fire events based on path
					this.fireEvent(_ref.join('/'));
				}
			} catch (error) {
				throw error;
			}
			this.state = container.data;
		},
		checkValidOp : function(op){

		},
		checkList : function(elem) {
			if (!_.isArray(elem)) {
				throw new Error('Referenced element not a list');
			}
		},
		checkObj : function(elem) {
			if (elem.constructor !== Object) {
				throw new Error("Referenced element not an object (it was " + (JSON.stringify(elem)) + ")");
			}
		},
		bindTransformEvent : function(path, fn){
			if(!this.events[path]){
				this.events[path] = [];
			}
			this.events[path].push(fn);
		},
		unbindTransformEvent : function(path, fn){
			var index;
			if(this.events[path]){
				index = this.events[path].indexOf(fn);
				if(index !== -1){
					this.events[path].splice(index, 1);
					if(this.events[path].length === 0){
						delete this.events[path];
					}
				}
			}
		},
		fireTransformEvent : function(path, data){
			/*
			path based events,
			i.e :
			a path of 'some/foo/bar' fires event handler 'some/foo/''
			a path of 'some/foo/bar' fires 'some/* /bar', capturing foo
			*/
			var regex, result;
			for(var key in this.events){
				if(this.events.hasOwnProperty(key)){
					regex = new RegExp('^' + key.replace('*', '([^/]+?)'));
					result = regex.exec(path);
					if(result){
						result.shift();
						var eventData = {
							path : path,
							data : _.extend(data, {
								matches : result
							})
						};
						for(var i = 0, length = this.events[key].length; i < length; i++){
							this.events[key][i](eventData);
						}
					}
				}
			}
		},
		getStateJSON : function(){
			return JSON.stringify(this.state);
		}
	});

	_.extend(State, {
		defaults : {
			numPlayers : 5,
			gameType : 'classic',
			cardStrategy : 'classic',
			startingPlayer : 'random'
		},
		getNewState : function(options){
			//TODO: state for family game
			var i;
			var state = deepClone(defaultState), obj;
			options = _.extend(options, State.defaults);
			//Setting up actions
			obj = {};
			if(options.gameType === 'classic'){
				for(i = 1; i <= 10; i++){
					obj['basic-'+i] = {
						name : 'basic-'+i
					};
				}
				//Setting up actions based on number of players
				switch(options.numPlayers){
					case 5 :
						for(i = 1; i <= 6; i++){
							obj['num5-'+ i] = {
								name : 'num5-' + 1
							};
						}
					break;
					case 4 :
						for(i = 1; i <= 6; i++){
							obj['num4-'+ i] = {
								name : 'num4-' + 1
							};
						}
					break;
					case 3 :
						for(i = 1; i <= 4; i++){
							obj['num3-'+ i] = {
								name : 'num3-' + 1
							};
						}
					break;
					default :
						//No extra actions
				}
			} else {
				//TODO Family basic cards
				throw new Error('Family game currently not supported');
			}
			_.extend(state.actions, obj);

			for(i = 0; i < options.numPlayers; i++){
				var nextPlayer = (i < options.numPlayers - 1)?'player-' + (i + 1):'player-1';
				var player = {
					id : 'player-' + (i + 1),
					user : null,
					nextPlayer : nextPlayer,
					resources : {
						food : 3,
						wood : 0,
						clay : 0,
						reed : 0,
						stone : 0,
						grain : 0,
						vegetable : 0
					},
					board : deepClone(defaultBoard),
					occupations : {
						/*name : {
							name : String,
							played : Boolean
						}*/
					},
					improvements : {
						/*name : {
							name : String,
							played : Boolean
						}*/
					},
					familyMembers : 2,
					newFamilyMembers : 0,
					fencesRemaining : 15,
					stablesRemaining : 4,
					beggerCards : 0
				};
				//TODO implement occupations and improvements
				state.players[player.id] = player;
			}
			if(options.startingPlayer === 'random'){
				state.startingPlayer = 'player-' + (Math.floor(Math.random() * 5) + 1);
			} else {
				state.startingPlayer = 'player-' + options.startingPlayer;
			}
			state.players[state.startingPlayer].resources.food += -1;
			
			return new State(state);
		}
	});

	return State;
});