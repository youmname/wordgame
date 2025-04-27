/**
 * FlipClock.js
 *
 * @author     Justin Kimbrell
 * @copyright  2013 - Objective HTML, LLC
 * @licesnse   http://www.opensource.org/licenses/mit-license.php
 */
var Base = function() {
	// dummy
};

Base.extend = function(_instance, _static) { // subclass

	"use strict";

	var extend = Base.prototype.extend;

	// build the prototype
	Base._prototyping = true;
	var proto = new this();
	extend.call(proto, _instance);
  proto.base = function() {
    // call this method from any other method to invoke that method's ancestor
  };
	delete Base._prototyping;

	// create the wrapper for the constructor function
	//var constructor = proto.constructor.valueOf(); //-dean
	var constructor = proto.constructor;
	var klass = proto.constructor = function() {
		if (!Base._prototyping) {
			if (this._constructing || this.constructor == klass) { // instantiation
				this._constructing = true;
				constructor.apply(this, arguments);
				delete this._constructing;
			} else if (arguments[0] !== null) { // casting
				return (arguments[0].extend || extend).call(arguments[0], proto);
			}
		}
	};

	// build the class interface
	klass.ancestor = this;
	klass.extend = this.extend;
	klass.forEach = this.forEach;
	klass.implement = this.implement;
	klass.prototype = proto;
	klass.toString = this.toString;
	klass.valueOf = function(type) {
		//return (type == "object") ? klass : constructor; //-dean
		return (type == "object") ? klass : constructor.valueOf();
	};
	extend.call(klass, _static);
	// class initialisation
	if (typeof klass.init == "function") klass.init();
	return klass;
};

Base.prototype = {
	extend: function(source, value) {
		if (arguments.length > 1) { // extending with a name/value pair
			var ancestor = this[source];
			if (ancestor && (typeof value == "function") && // overriding a method?
				// the valueOf() comparison is to avoid circular references
				(!ancestor.valueOf || ancestor.valueOf() != value.valueOf()) &&
				/\bbase\b/.test(value)) {
				// get the underlying method
				var method = value.valueOf();
				// override
				value = function() {
					var previous = this.base || Base.prototype.base;
					this.base = ancestor;
					var returnValue = method.apply(this, arguments);
					this.base = previous;
					return returnValue;
				};
				// point to the underlying method
				value.valueOf = function(type) {
					return (type == "object") ? value : method;
				};
				value.toString = Base.toString;
			}
			this[source] = value;
		} else if (source) { // extending with an object literal
			var extend = Base.prototype.extend;
			// if this object has a customised extend method then use it
			if (!Base._prototyping && typeof this != "function") {
				extend = this.extend || extend;
			}
			var proto = {toSource: null};
			// do the "toString" and other methods manually
			var hidden = ["constructor", "toString", "valueOf"];
			// if we are prototyping then include the constructor
			var i = Base._prototyping ? 0 : 1;
			while (key = hidden[i++]) {
				if (source[key] != proto[key]) {
					extend.call(this, key, source[key]);

				}
			}
			// copy each of the source object's properties to this object
			for (var key in source) {
				if (!proto[key]) extend.call(this, key, source[key]);
			}
		}
		return this;
	}
};

// initialise
Base = Base.extend({
	constructor: function() {
		this.extend(arguments[0]);
	}
}, {
	ancestor: Object,
	version: "1.1",

	forEach: function(object, block, context) {
		for (var key in object) {
			if (this.prototype[key] === undefined) {
				block.call(context, object[key], key, object);
			}
		}
	},

	implement: function() {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] == "function") {
				// if it's a function, call it
				arguments[i](this.prototype);
			} else {
				// add the interface using the extend method
				this.prototype.extend(arguments[i]);
			}
		}
		return this;
	},

	toString: function() {
		return String(this.valueOf());
	}
});
/*jshint smarttabs:true */

var FlipClock;

/**
 * FlipClock.js
 *
 * @author     Justin Kimbrell
 * @copyright  2013 - Objective HTML, LLC
 * @licesnse   http://www.opensource.org/licenses/mit-license.php
 */

(function($) {

	"use strict";

	/**
	 * FlipFlock Helper
	 *
	 * @param  object  A jQuery object or CSS select
	 * @param  int     An integer used to start the clock (no. seconds)
	 * @param  object  An object of properties to override the default
	 */

	FlipClock = function(obj, digit, options) {
		return new FlipClock.Factory(obj, digit, options);
	};

	/**
	 * The global FlipClock.Lang object
	 */

	FlipClock.Lang = {};

	/**
	 * The Base FlipClock class is used to extend all other FlipFlock
	 * classes. It handles the callbacks and the basic setters/getters
	 *
	 * @param 	object  An object of the default properties
	 * @param 	object  An object of properties to override the default
	 */

	FlipClock.Base = Base.extend({

		/**
		 * Build Date
		 */

		buildDate: '2013-11-07',

		/**
		 * Version
		 */

		version: '0.3.1',

		/**
		 * Sets the default options
		 *
		 * @param	object 	The default options
		 * @param	object 	The override options
		 */

		constructor: function(_default, options) {
			if(typeof _default !== "object") {
				_default = {};
			}
			if(typeof options !== "object") {
				options = {};
			}
			this.setOptions($.extend(true, {}, _default, options));
		},

		/**
		 * Delegates the callback to the defined method
		 *
		 * @param	object 	The default options
		 * @param	object 	The override options
		 */

		callback: function(method) {
			 if(typeof method === "function") {
				var args = [];

				for(var x = 1; x <= arguments.length; x++) {
					if(arguments[x]) {
						args.push(arguments[x]);
					}
				}

				method.apply(this, args);
			}
		},

		/**
		 * Log a string into the console if it exists
		 *
		 * @param 	string 	The name of the option
		 * @return	mixed
		 */

		log: function(str) {
			if(window.console && console.log) {
				console.log(str);
			}
		},

		/**
		 * Get an single option value. Returns false if option does not exist
		 *
		 * @param 	string 	The name of the option
		 * @return	mixed
		 */

		getOption: function(index) {
			if(this[index]) {
				return this[index];
			}
			return false;
		},

		/**
		 * Get all options
		 *
		 * @return	bool
		 */

		getOptions: function() {
			return this;
		},

		/**
		 * Set a single option value
		 *
		 * @param 	string 	The name of the option
		 * @param 	mixed 	The value of the option
		 */

		setOption: function(index, value) {
			this[index] = value;
		},

		/**
		 * Set a multiple options by passing a JSON object
		 *
		 * @param 	object 	The object with the options
		 * @param 	mixed 	The value of the option
		 */

		setOptions: function(options) {
			for(var key in options) {
	  			if(typeof options[key] !== "undefined") {
		  			this.setOption(key, options[key]);
		  		}
		  	}
		}

	});

	/**
	 * The FlipClock Factory class is used to build the clock and manage
	 * all the public methods.
	 *
	 * @param 	object  A jQuery object or CSS selector used to fetch
	 		    the wrapping DOM nodes
	 * @param 	mixed   This is the digit used to set the clock. If an
	 		    object is passed, 0 will be used.
	 * @param 	object  An object of properties to override the default
	 */

	FlipClock.Factory = FlipClock.Base.extend({

		/**
		 * Auto start the clock on page load (True|False)
		 */

		autoStart: true,

		/**
		 * The callback methods
		 */

		callbacks: {
			destroy: false,
			create: false,
			init: false,
			interval: false,
			start: false,
			stop: false,
			reset: false
		},

		/**
		 * The CSS classes
		 */

		classes: {
			active: 'flip-clock-active',
			before: 'flip-clock-before',
			divider: 'flip-clock-divider',
			dot: 'flip-clock-dot',
			label: 'flip-clock-label',
			flip: 'flip',
			play: 'play',
			wrapper: 'flip-clock-wrapper'
		},

		/**
		 * The name of the clock face class in use
		 */

		clockFace: 'TwentyFourHourClock',

		/**
		 * The name of the default clock face class to use if the defined
		 * clockFace variable is not a valid FlipClock.Face object
		 */

		defaultClockFace: 'HourlyCounter',

		/**
		 * The default language
		 */

		defaultLanguage: 'english',

		/**
		 * The language being used to display labels (string)
		 */

		language: 'english',

		/**
		 * The language object after it has been loaded
		 */

		lang: false,

		/**
		 * The FlipClock.Face object
		 */

		face: true,

		/**
		 * Is the clock running? (True|False)
		 */

		running: false,

		/**
		 * The FlipClock.Time object
		 */

		time: false,

		/**
		 * The FlipClock.Timer object
		 */

		timer: false,

		/**
		 * An array of FlipClock.List objects
		 */

		lists: [],

		/**
		 * The wrapping jQuery object
		 */

		$wrapper: false,

		/**
		 * Constructor
		 *
		 * @param   object  The wrapping jQuery object
		 * @param	object  Number of seconds used to start the clock
		 * @param	object 	An object override options
		 */

		constructor: function(obj, digit, options) {

			this.lists 	  = [];
			this.running  = false;
			this.base(options);
			this.$wrapper = $(obj).addClass(this.classes.wrapper);
			this.time     = new FlipClock.Time(this, digit ? Math.round(digit) : 0);
			this.timer    = new FlipClock.Timer(this, options);

			this.lang     = this.loadLanguage(this.language);
			this.face     = this.loadClockFace(this.clockFace, options);

			if(this.autoStart) {
				this.start();
			}
		},

		/**
		 * Load the FlipClock.Face object
		 *
		 * @param	object  The name of the FlickClock.Face class
		 * @param	object 	An object override options
		 */

		loadClockFace: function(name, options) {
			var face, suffix = 'Face';

			name = name.ucfirst()+suffix;

			if(FlipClock[name]) {
				face = new FlipClock[name](this, options);
			}
			else {
				face = new FlipClock[this.defaultClockFace+suffix](this, options);
			}

			face.build();

			return face;
		},


		/**
		 * Load the FlipClock.Lang object
		 *
		 * @param	object  The name of the language to load
		 */

		loadLanguage: function(name) {
			var lang;

			if(FlipClock.Lang[name.ucfirst()]) {
				lang = FlipClock.Lang[name.ucfirst()];
			}
			else if(FlipClock.Lang[name]) {
				lang = FlipClock.Lang[name];
			}
			else {
				lang = FlipClock.Lang[this.defaultLanguage];
			}

			return lang;
		},

		/**
		 * Localize strings into various languages
		 *
		 * @param	string  The index of the localized string
		 * @param	object  Optionally pass a lang object
		 */

		localize: function(index, obj) {
			var lang = this.lang;

			if(!index) {
				return null;
			}

			var lindex = index.toLowerCase();

			if(typeof obj == "object") {
				lang = obj;
			}

			if(lang && lang[lindex]) {
				return lang[lindex];
			}

			return index;
		},


		/**
		 * Starts the clock
		 */

		start: function(callback) {
			var t = this;

			if(!t.running && (!t.countdown || t.countdown && t.time.time > 0)) {
				t.face.start(t.time);
				t.timer.start(function() {
					t.flip();

					if(typeof callback === "function") {
						callback();
					}
				});
			}
			else {
				t.log('Trying to start timer when countdown already at 0');
			}
		},

		/**
		 * Stops the clock
		 */

		stop: function(callback) {
			this.face.stop();
			this.timer.stop(callback);

			for(var x in this.lists) {
				this.lists[x].stop();
			}
		},

		/**
		 * Reset the clock
		 */

		reset: function(callback) {
			this.timer.reset(callback);
			this.face.reset();
		},

		/**
		 * Sets the clock time
		 */

		setTime: function(time) {
			this.time.time = time;
			this.face.setTime(time);
		},

		/**
		 * Get the clock time
		 *
		 * @return  object  Returns a FlipClock.Time object
		 */

		getTime: function(time) {
			return this.time;
		},

		/**
		 * Changes the increment of time to up or down (add/sub)
		 */

		setCountdown: function(value) {
			var running = this.running;

			this.countdown = value ? true : false;

			if(running) {
				this.stop();
				this.start();
			}
		},

		/**
		 * Flip the digits on the clock
		 *
		 * @param  array  An array of digits
		 */
		flip: function() {
			this.face.flip();
		}

	});

	/**
	 * The FlipClock Face class is the base class in which to extend
	 * all other FlockClock.Face classes.
	 *
	 * @param 	object  The parent FlipClock.Factory object
	 * @param 	object  An object of properties to override the default
	 */

	FlipClock.Face = FlipClock.Base.extend({

		/**
		 * An array of jQuery objects used for the dividers (the colons)
		 */

		dividers: [],

		/**
		 * An array of FlipClock.List objects
		 */

		factory: false,

		/**
		 * An array of FlipClock.List objects
		 */

		lists: [],

		/**
		 * Constructor
		 *
		 * @param 	object  The parent FlipClock.Factory object
		 * @param 	object  An object of properties to override the default
		 */

		constructor: function(factory, options) {
			this.base(options);
			this.factory  = factory;
			this.dividers = [];
		},

		/**
		 * Build the clock face
		 */

		build: function() {},

		/**
		 * Creates a jQuery object used for the digit divider
		 *
		 * @param	mixed 	The divider label text
		 * @param	mixed	Set true to exclude the dots in the divider.
		 *					If not set, is false.
		 */

		createDivider: function(label, css, excludeDots) {

			if(typeof css == "boolean" || !css) {
				excludeDots = css;
				css = label;
			}

			var dots = [
				'<span class="'+this.factory.classes.dot+' top"></span>',
				'<span class="'+this.factory.classes.dot+' bottom"></span>'
			].join('');

			if(excludeDots) {
				dots = '';
			}

			label = this.factory.localize(label);

			var html = [
				'<span class="'+this.factory.classes.divider+' '+(css ? css : '').toLowerCase()+'">',
					'<span class="'+this.factory.classes.label+'">'+(label ? label : '')+'</span>',
					dots,
				'</span>'
			];

			return $(html.join(''));
		},

		/**
		 * Creates a FlipClock.List object and appends it to the DOM
		 *
		 * @param	mixed 	The digit to select in the list
		 * @param	object  An object to override the default properties
		 */

		createList: function(digit, options) {
			if(typeof digit === "object") {
				options = digit;
				digit = 0;
			}

			var obj = new FlipClock.List(this.factory, digit, options);

			//this.factory.$wrapper.append(obj.$obj);

			return obj;
		},

		/**
		 * Triggers when the clock is reset
		 */

		reset: function() {},

		/**
		 * Sets the clock time
		 */

		setTime: function(time) {
			this.flip(time);
		},

		/**
		 * Sets the clock time
		 */

		addDigit: function(digit) {
			var obj = this.createList(digit, {
				classes: {
					active: this.factory.classes.active,
					before: this.factory.classes.before,
					flip: this.factory.classes.flip
				}
			});

			obj.$obj.insertBefore(this.factory.lists[0].$obj);

			this.factory.lists.unshift(obj);
		},

		/**
		 * Triggers when the clock is started
		 */

		start: function() {},

		/**
		 * Triggers when the time on the clock stops
		 */

		stop: function() {},

		/**
		 * Triggers when the numbers on the clock flip
		 */

		flip: function(time, doNotAddPlayClass) {
			var t = this;

			if(!doNotAddPlayClass) {
				if(!t.factory.countdown) {
					t.factory.time.time++;
				}
				else {
					if(t.factory.time.time <= 0) {
						t.factory.stop();
					}

					t.factory.time.time--;
				}
			}

			var offset = t.factory.lists.length - time.length;

			if(offset < 0) {
				offset = 0;
			}

			var totalNew = 0;
			var reFlip = false;

			$.each(time, function(i, digit) {
				i += offset;

				var list = t.factory.lists[i];

				if(list) {
					var currentDigit = list.digit;

					list.select(digit);

					if(digit != currentDigit && !doNotAddPlayClass) {
						list.play();
					}
				}
				else {
					t.addDigit(digit);
					reFlip = true;
				}
			});

			for(var x = 0; x < time.length; x++) {
				if(x >= offset && t.factory.lists[x].digit != time[x]) {
					t.factory.lists[x].select(time[x]);
				}
			}
		}

	});

	/**
	 * The FlipClock List class is used to build the list used to create
	 * the card flip effect. This object fascilates selecting the correct
	 * node by passing a specific digit.
	 *
	 * @param 	object  A FlipClock.Factory object
	 * @param 	mixed   This is the digit used to set the clock. If an
	 *				    object is passed, 0 will be used.
	 * @param 	object  An object of properties to override the default
	 */

	FlipClock.List = FlipClock.Base.extend({

		/**
		 * The digit (0-9)
		 */

		digit: 0,

		/**
		 * The CSS classes
		 */

		classes: {
			active: 'flip-clock-active',
			before: 'flip-clock-before',
			flip: 'flip'
		},

		/**
		 * The parent FlipClock.Factory object
		 */

		factory: false,

		/**
		 * The wrapping jQuery object
		 */

		$obj: false,

		/**
		 * The items in the list
		 */

		items: [],

		/**
		 * Constructor
		 *
		 * @param  object  A FlipClock.Factory object
		 * @param  int     An integer use to select the correct digit
		 * @param  object  An object to override the default properties
		 */

		constructor: function(factory, digit, options) {
			this.factory = factory;
			this.digit   = digit;
			this.$obj    = this.createList();

			if(digit > 0) {
				this.select(digit);
			}

			this.factory.$wrapper.append(this.$obj);
		},

		/**
		 * Select the digit in the list
		 *
		 * @param  int  A digit 0-9
		 */

		select: function(digit) {
			if(typeof digit === "undefined") {
				digit = this.digit;
			}
			else {
				this.digit = digit;
			}

			var target = this.$obj.find('[data-digit="'+digit+'"]');
			var active = this.$obj.find('.'+this.classes.active).removeClass(this.classes.active);
			var before = this.$obj.find('.'+this.classes.before).removeClass(this.classes.before);

			if(!this.factory.countdown) {
				if(target.is(':first-child')) {
					this.$obj.find(':last-child').addClass(this.classes.before);
				}
				else {
					target.prev().addClass(this.classes.before);
				}
			}
			else {
				if(target.is(':last-child')) {
					this.$obj.find(':first-child').addClass(this.classes.before);
				}
				else {
					target.next().addClass(this.classes.before);
				}
			}

			target.addClass(this.classes.active);
		},

		/**
		 * Adds the play class to the DOM object
		 */

		play: function() {
			this.$obj.addClass(this.factory.classes.play);
		},

		/**
		 * Removes the play class to the DOM object
		 */

		stop: function() {
			var t = this;

			setTimeout(function() {
				t.$obj.removeClass(t.factory.classes.play);
			}, this.factory.timer.interval);
		},

		/**
		 * Create the list of digits and appends it to the DOM object
		 */

		createList: function() {

			var html = $('<ul class="'+this.classes.flip+' '+(this.factory.running ? this.factory.classes.play : '')+'" />');

			for(var x = 0; x < 10; x++) {
				var item = $([
				'<li data-digit="'+x+'">',
					'<a href="#">',
						'<div class="up">',
							'<div class="shadow"></div>',
							'<div class="inn">'+x+'</div>',
						'</div>',
						'<div class="down">',
							'<div class="shadow"></div>',
							'<div class="inn">'+x+'</div>',
						'</div>',
					'</a>',
				'</li>'].join(''));

				this.items.push(item);

				html.append(item);
			}

			return html;
		}
	});

	/**
	 * The FlipClock Time class is used to manage all the time
	 * calculations.
	 *
	 * @param 	object  A FlipClock.Factory object
	 * @param 	mixed   This is the digit used to set the clock. If an
	 *				    object is passed, 0 will be used.
	 * @param 	object  An object of properties to override the default
	 */

	FlipClock.Time = FlipClock.Base.extend({

		/**
		 * The time (in seconds)
		 */

		minimumDigits: 0,

		/**
		 * The time (in seconds)
		 */

		time: 0,

		/**
		 * The parent FlipClock.Factory object
		 */

		factory: false,

		/**
		 * Constructor
		 *
		 * @param  object  A FlipClock.Factory object
		 * @param  int     An integer use to select the correct digit
		 * @param  object  An object to override the default properties
		 */

		constructor: function(factory, time, options) {
			this.base(options);
			this.factory = factory;

			if(time) {
				this.time = time;
			}
		},

		/**
		 * Convert a string or integer to an array of digits
		 *
		 * @param   mixed  String or Integer of digits
		 * @return  array  An array of digits
		 */

		convertDigitsToArray: function(str) {
			var data = [];

			str = str.toString();

			for(var x = 0;x < str.length; x++) {
				if(str[x].match(/^\d*$/g)) {
					data.push(str[x]);
				}
			}

			return data;
		},

		/**
		 * Get a specific digit from the time integer
		 *
		 * @param   int    The specific digit to select from the time
		 * @return  mixed  Returns FALSE if no digit is found, otherwise
		 *				   the method returns the defined digit
		 */

		digit: function(i) {
			var timeStr = this.toString();
			var length  = timeStr.length;

			if(timeStr[length - i])	 {
				return timeStr[length - i];
			}

			return false;
		},

		/**
		 * Formats any array of digits into a valid array of digits
		 *
		 * @param   mixed  An array of digits
		 * @return  array  An array of digits
		 */

		digitize: function(obj) {
			var data = [];

			$.each(obj, function(i, value) {
				value = value.toString();

				if(value.length == 1) {
					value = '0'+value;
				}

				for(var x = 0; x < value.length; x++) {
					data.push(value[x]);
				}
			});

			if(data.length > this.minimumDigits) {
				this.minimumDigits = data.length;
			}

			if(this.minimumDigits > data.length) {
				data.unshift('0');
			}

			return data;
		},

		/**
		 * Gets a daily breakdown
		 *
		 * @return  object  Returns a digitized object
		 */

		getDayCounter: function(includeSeconds) {
			var digits = [
				this.getDays(),
				this.getHours(true),
				this.getMinutes(true)
			];

			if(includeSeconds) {
				digits.push(this.getSeconds(true));
			}

			return this.digitize(digits);
		},

		/**
		 * Gets number of days
		 *
		 * @param   bool  Should perform a modulus? If not sent, then no.
		 * @return  int   Retuns a floored integer
		 */

		getDays: function(mod) {
			var days = this.time / 60 / 60 / 24;

			if(mod) {
				days = days % 7;
			}

			return Math.floor(days);
		},

		/**
		 * Gets an hourly breakdown
		 *
		 * @return  object  Returns a digitized object
		 */

		getHourCounter: function() {
			var obj = this.digitize([
				this.getHours(),
				this.getMinutes(true),
				this.getSeconds(true)
			]);

			return obj;
		},

		/**
		 * Gets an hourly breakdown
		 *
		 * @return  object  Returns a digitized object
		 */

		getHourly: function() {
			return this.getHourCounter();
		},

		/**
		 * Gets number of hours
		 *
		 * @param   bool  Should perform a modulus? If not sent, then no.
		 * @return  int   Retuns a floored integer
		 */

		getHours: function(mod) {
			var hours = this.time / 60 / 60;

			if(mod) {
				hours = hours % 24;
			}

			return Math.floor(hours);
		},

		/**
		 * Gets the twenty-four hour time
		 *
		 * @return  object  returns a digitized object
		 */

		getMilitaryTime: function() {
			var date = new Date();
			var obj  = this.digitize([
				date.getHours(),
				date.getMinutes(),
				date.getSeconds()
			]);

			return obj;
		},

		/**
		 * Gets number of minutes
		 *
		 * @param   bool  Should perform a modulus? If not sent, then no.
		 * @return  int   Retuns a floored integer
		 */

		getMinutes: function(mod) {
			var minutes = this.time / 60;

			if(mod) {
				minutes = minutes % 60;
			}

			return Math.floor(minutes);
		},

		/**
		 * Gets a minute breakdown
		 */

		getMinuteCounter: function() {
			var obj = this.digitize([
				this.getMinutes(),
				this.getSeconds(true)
			]);

			return obj;
		},

		/**
		 * Gets number of seconds
		 *
		 * @param   bool  Should perform a modulus? If not sent, then no.
		 * @return  int   Retuns a ceiled integer
		 */

		getSeconds: function(mod) {
			var seconds = this.time;

			if(mod) {
				if(seconds == 60) {
					seconds = 0;
				}
				else {
					seconds = seconds % 60;
				}
			}

			return Math.ceil(seconds);
		},

		/**
		 * Gets the current twelve hour time
		 *
		 * @return  object  Returns a digitized object
		 */

		getTime: function() {
			var date  = new Date();
			var hours = date.getHours();
			var merid = hours > 12 ? 'PM' : 'AM';
			var obj   = this.digitize([
				hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours),
				date.getMinutes(),
				date.getSeconds()
			]);

			return obj;
		},

		/**
		 * Gets number of weeks
		 *
		 * @param   bool  Should perform a modulus? If not sent, then no.
		 * @return  int   Retuns a floored integer
		 */

		getWeeks: function() {
			var weeks = this.time / 60 / 60 / 24 / 7;

			if(mod) {
				weeks = weeks % 52;
			}

			return Math.floor(weeks);
		},

		/**
		 * Removes a specific number of leading zeros from the array.
		 * This method prevents you from removing too many digits, even
		 * if you try.
		 *
		 * @param   int    Total number of digits to remove
		 * @return  array  An array of digits
		 */

		removeLeadingZeros: function(totalDigits, digits) {
			var total    = 0;
			var newArray = [];

			$.each(digits, function(i, digit) {
				if(i < totalDigits) {
					total += parseInt(digits[i], 10);
				}
				else {
					newArray.push(digits[i]);
				}
			});

			if(total === 0) {
				return newArray;
			}

			return digits;
		},

		/**
		 * Converts the object to a human readable string
		 */

		toString: function() {
			return this.time.toString();
		}

		/*
		getYears: function() {
			return Math.floor(this.time / 60 / 60 / 24 / 7 / 52);
		},

		getDecades: function() {
			return Math.floor(this.getWeeks() / 10);
		}*/
	});

	/**
	 * The FlipClock.Timer object managers the JS timers
	 *
	 * @param	object  The parent FlipClock.Factory object
	 * @param	object  Override the default options
	 */

	FlipClock.Timer = FlipClock.Base.extend({

		/**
		 * Callbacks
		 */

		callbacks: {
			destroy: false,
			create: false,
			init: false,
			interval: false,
			start: false,
			stop: false,
			reset: false
		},

		/**
		 * FlipClock timer count (how many intervals have passed)
		 */

		count: 0,

		/**
		 * The parent FlipClock.Factory object
		 */

		factory: false,

		/**
		 * Timer interval (1 second by default)
		 */

		interval: 1000,

		/**
		 * Constructor
		 *
		 * @return	void
		 */

		constructor: function(factory, options) {
			this.base(options);
			this.factory = factory;
			this.callback(this.callbacks.init);
			this.callback(this.callbacks.create);
		},

		/**
		 * This method gets the elapsed the time as an interger
		 *
		 * @return	void
		 */

		getElapsed: function() {
			return this.count * this.interval;
		},

		/**
		 * This method gets the elapsed the time as a Date object
		 *
		 * @return	void
		 */

		getElapsedTime: function() {
			return new Date(this.time + this.getElapsed());
		},

		/**
		 * This method is resets the timer
		 *
		 * @param 	callback  This method resets the timer back to 0
		 * @return	void
		 */

		reset: function(callback) {
			clearInterval(this.timer);
			this.count = 0;
			this._setInterval(callback);
			this.callback(this.callbacks.reset);
		},

		/**
		 * This method is starts the timer
		 *
		 * @param 	callback  A function that is called once the timer is destroyed
		 * @return	void
		 */

		start: function(callback) {
			this.factory.running = true;
			this._createTimer(callback);
			this.callback(this.callbacks.start);
		},

		/**
		 * This method is stops the timer
		 *
		 * @param 	callback  A function that is called once the timer is destroyed
		 * @return	void
		 */

		stop: function(callback) {
			this.factory.running = false;
			this._clearInterval(callback);
			this.callback(this.callbacks.stop);
			this.callback(callback);
		},

		/**
		 * Clear the timer interval
		 *
		 * @return	void
		 */

		_clearInterval: function() {
			clearInterval(this.timer);
		},

		/**
		 * Create the timer object
		 *
		 * @param 	callback  A function that is called once the timer is created
		 * @return	void
		 */

		_createTimer: function(callback) {
			this._setInterval(callback);
		},

		/**
		 * Destroy the timer object
		 *
		 * @param 	callback  A function that is called once the timer is destroyed
		 * @return	void
		 */

		_destroyTimer: function(callback) {
			this._clearInterval();
			this.timer = false;
			this.callback(callback);
			this.callback(this.callbacks.destroy);
		},

		/**
		 * This method is called each time the timer interval is ran
		 *
		 * @param 	callback  A function that is called once the timer is destroyed
		 * @return	void
		 */

		_interval: function(callback) {
			this.callback(this.callbacks.interval);
			this.callback(callback);
			this.count++;
		},

		/**
		 * This sets the timer interval
		 *
		 * @param 	callback  A function that is called once the timer is destroyed
		 * @return	void
		 */

		_setInterval: function(callback) {
			var t = this;

			t.timer = setInterval(function() {
				t._interval(callback);
			}, this.interval);
		}

	});

	/**
	 * Capitalize the first letter in a string
	 *
	 * @return string
	 */

	String.prototype.ucfirst = function() {
		return this.substr(0, 1).toUpperCase() + this.substr(1);
	};

	/**
	 * jQuery helper method
	 *
	 * @param  int     An integer used to start the clock (no. seconds)
	 * @param  object  An object of properties to override the default
	 */

	$.fn.FlipClock = function(digit, options) {
		if(typeof digit == "object") {
			options = digit;
			digit = 0;
		}
		return new FlipClock($(this), digit, options);
	};

	/**
	 * jQuery helper method
	 *
	 * @param  int     An integer used to start the clock (no. seconds)
	 * @param  object  An object of properties to override the default
	 */

	$.fn.flipClock = function(digit, options) {
		return $.fn.FlipClock(digit, options);
	};

}(jQuery));

(function($) {

	/**
	 * Twenty-Four Hour Clock Face
	 *
	 * This class will generate a twenty-four our clock for FlipClock.js
	 *
	 * @param  object  The parent FlipClock.Factory object
	 * @param  object  An object of properties to override the default
	 */

	FlipClock.TwentyFourHourClockFace = FlipClock.Face.extend({

		/**
		 * Constructor
		 *
		 * @param  object  The parent FlipClock.Factory object
		 * @param  object  An object of properties to override the default
		 */

		constructor: function(factory, options) {
			factory.countdown = false;
			this.base(factory, options);
		},

		/**
		 * Build the clock face
		 *
		 * @param  object  Pass the time that should be used to display on the clock.
		 */

		build: function(time) {
			var t        = this;
			var children = this.factory.$wrapper.find('ul');

			time = time ? time : (this.factory.time.time || this.factory.time.getMilitaryTime());

			if(time.length > children.length) {
				$.each(time, function(i, digit) {
					t.factory.lists.push(t.createList(digit));
				});
			}

			this.dividers.push(this.createDivider());
			this.dividers.push(this.createDivider());

			$(this.dividers[0]).insertBefore(this.factory.lists[this.factory.lists.length - 2].$obj);
			$(this.dividers[1]).insertBefore(this.factory.lists[this.factory.lists.length - 4].$obj);

			this._clearExcessDigits();

			if(this.autoStart) {
				this.start();
			}
		},

		/**
		 * Flip the clock face
		 */

		flip: function(time) {
			time = time ? time : this.factory.time.getMilitaryTime();
			this.base(time);
		},

		/**
		 * Clear the excess digits from the tens columns for sec/min
		 */

		_clearExcessDigits: function() {
			var tenSeconds = this.factory.lists[this.factory.lists.length - 2];
			var tenMinutes = this.factory.lists[this.factory.lists.length - 4];

			for(var x = 6; x < 10; x++) {
				tenSeconds.$obj.find('li:last-child').remove();
				tenMinutes.$obj.find('li:last-child').remove();
			}
		}

	});

}(jQuery));
(function($) {

	/**
	 * Counter Clock Face
	 *
	 * This class will generate a generice flip counter. The timer has been
	 * disabled. clock.increment() and clock.decrement() have been added.
	 *
	 * @param  object  The parent FlipClock.Factory object
	 * @param  object  An object of properties to override the default
	 */

	FlipClock.CounterFace = FlipClock.Face.extend({

		autoStart: false,

		/**
		 * Constructor
		 *
		 * @param  object  The parent FlipClock.Factory object
		 * @param  object  An object of properties to override the default
		 */

		constructor: function(factory, options) {
			factory.timer.interval = 0;
			factory.autoStart 	   = false;
			factory.running  	   = true;

			factory.increment = function() {
				factory.countdown = false;
				factory.setTime(factory.getTime().time + 1);
			};

			factory.decrement = function() {
				factory.countdown = true;
				factory.setTime(factory.getTime().time - 1);
			};

			factory.setValue = function(digits) {
				factory.setTime(digits);
			};

			factory.setCounter = function(digits) {
				factory.setTime(digits);
			};

			this.base(factory, options);
		},

		/**
		 * Build the clock face
		 */

		build: function() {
			var t        = this;
			var children = this.factory.$wrapper.find('ul');
			var lists    = [];
			var time 	 = this.factory.getTime().digitize([this.factory.getTime().time]);

			if(time.length > children.length) {
				$.each(time, function(i, digit) {
					var list = t.createList(digit);

					list.select(digit);
					lists.push(list);
				});

			}

			$.each(lists, function(i, list) {
				list.play();
			});

			this.factory.lists = lists;
		},

		/**
		 * Flip the clock face
		 */

		flip: function(doNotAddPlayClass) {
			var time = this.factory.getTime().digitize([this.factory.getTime().time]);

			this.base(time, doNotAddPlayClass);
		},

	});

}(jQuery));
(function($) {

	/**
	 * Daily Counter Clock Face
	 *
	 * This class will generate a daily counter for FlipClock.js. A
	 * daily counter will track days, hours, minutes, and seconds. If
	 * the number of available digits is exceeded in the count, a new
	 * digit will be created.
	 *
	 * @param  object  The parent FlipClock.Factory object
	 * @param  object  An object of properties to override the default
	 */

	FlipClock.DailyCounterFace = FlipClock.Face.extend({

		showSeconds: true,

		/**
		 * Constructor
		 *
		 * @param  object  The parent FlipClock.Factory object
		 * @param  object  An object of properties to override the default
		 */

		constructor: function(factory, options) {
			this.base(factory, options);
		},

		/**
		 * Build the clock face
		 */

		build: function(excludeHours, time) {
			var t        = this;
			var children = this.factory.$wrapper.find('ul');
			var lists    = [];
			var offset   = 0;

			time     = time ? time : this.factory.time.getDayCounter(this.showSeconds);

			if(time.length > children.length) {
				$.each(time, function(i, digit) {
					lists.push(t.createList(digit));
				});
			}

			this.factory.lists = lists;

			if(this.showSeconds) {
				$(this.createDivider('Seconds')).insertBefore(this.factory.lists[this.factory.lists.length - 2].$obj);
			}
			else
			{
				offset = 2;
			}

			$(this.createDivider('Minutes')).insertBefore(this.factory.lists[this.factory.lists.length - 4 + offset].$obj);
			$(this.createDivider('Hours')).insertBefore(this.factory.lists[this.factory.lists.length - 6 + offset].$obj);
			$(this.createDivider('Days', true)).insertBefore(this.factory.lists[0].$obj);

			this._clearExcessDigits();

			if(this.autoStart) {
				this.start();
			}
		},

		/**
		 * Flip the clock face
		 */

		flip: function(doNotAddPlayClass, time) {
			if(!time) {
				time = this.factory.time.getDayCounter(this.showSeconds);
			}
			this.base(time, doNotAddPlayClass);
		},

		/**
		 * Clear the excess digits from the tens columns for sec/min
		 */

		_clearExcessDigits: function() {
			var tenSeconds = this.factory.lists[this.factory.lists.length - 2];
			var tenMinutes = this.factory.lists[this.factory.lists.length - 4];

			for(var x = 6; x < 10; x++) {
				tenSeconds.$obj.find('li:last-child').remove();
				tenMinutes.$obj.find('li:last-child').remove();
			}
		}

	});

}(jQuery));
(function($) {

	/**
	 * Hourly Counter Clock Face
	 *
	 * This class will generate an hourly counter for FlipClock.js. An
	 * hour counter will track hours, minutes, and seconds. If number of
	 * available digits is exceeded in the count, a new digit will be
	 * created.
	 *
	 * @param  object  The parent FlipClock.Factory object
	 * @param  object  An object of properties to override the default
	 */

	FlipClock.HourlyCounterFace = FlipClock.Face.extend({

		clearExcessDigits: true,

		/**
		 * Constructor
		 *
		 * @param  object  The parent FlipClock.Factory object
		 * @param  object  An object of properties to override the default
		 */

		constructor: function(factory, options) {
			this.base(factory, options);
		},

		/**
		 * Build the clock face
		 */

		build: function(excludeHours, time) {
			var t        = this;
			var children = this.factory.$wrapper.find('ul');
			var lists = [];

			time     = time ? time : this.factory.time.getHourCounter();

			if(time.length > children.length) {
				$.each(time, function(i, digit) {
					lists.push(t.createList(digit));
				});
			}

			this.factory.lists = lists;

			$(this.createDivider('Seconds')).insertBefore(this.factory.lists[this.factory.lists.length - 2].$obj);
			$(this.createDivider('Minutes')).insertBefore(this.factory.lists[this.factory.lists.length - 4].$obj);

			if(!excludeHours) {
				$(this.createDivider('Hours', true)).insertBefore(this.factory.lists[0].$obj);
			}

			if(this.clearExcessDigits) {
				this._clearExcessDigits();
			}

			if(this.autoStart) {
				this.start();
			}
		},

		/**
		 * Flip the clock face
		 */

		flip: function(doNotAddPlayClass, time) {
			if(!time) {
				time = this.factory.time.getHourCounter();
			}
			this.base(time, doNotAddPlayClass);
		},

		/**
		 * Clear the excess digits from the tens columns for sec/min
		 */

		_clearExcessDigits: function() {
			var tenSeconds = this.factory.lists[this.factory.lists.length - 2];
			var tenMinutes = this.factory.lists[this.factory.lists.length - 4];

			for(var x = 6; x < 10; x++) {
				tenSeconds.$obj.find('li:last-child').remove();
				tenMinutes.$obj.find('li:last-child').remove();
			}
		}

	});

}(jQuery));
(function($) {

	/**
	 * Minute Counter Clock Face
	 *
	 * This class will generate a minute counter for FlipClock.js. A
	 * minute counter will track minutes and seconds. If an hour is
	 * reached, the counter will reset back to 0. (4 digits max)
	 *
	 * @param  object  The parent FlipClock.Factory object
	 * @param  object  An object of properties to override the default
	 */

	FlipClock.MinuteCounterFace = FlipClock.HourlyCounterFace.extend({

		clearExcessDigits: false,

		/**
		 * Constructor
		 *
		 * @param  object  The parent FlipClock.Factory object
		 * @param  object  An object of properties to override the default
		 */

		constructor: function(factory, options) {
			this.base(factory, options);
		},

		/**
		 * Build the clock face
		 */

		build: function() {
			this.base(true, this.factory.time.getMinuteCounter());
		},

		/**
		 * Flip the clock face
		 */

		flip: function(doNotAddPlayClass) {
			this.base(doNotAddPlayClass, this.factory.time.getMinuteCounter());
		},

	});

}(jQuery));
(function($) {

	/**
	 * Twelve Hour Clock Face
	 *
	 * This class will generate a twelve hour clock for FlipClock.js
	 *
	 * @param  object  The parent FlipClock.Factory object
	 * @param  object  An object of properties to override the default
	 */

	FlipClock.TwelveHourClockFace = FlipClock.TwentyFourHourClockFace.extend({

		/**
		 * The meridium jQuery DOM object
		 */

		meridium: false,

		/**
		 * The meridium text as string for easy access
		 */

		meridiumText: 'AM',

		/**
		 * Build the clock face
		 *
		 * @param  object  Pass the time that should be used to display on the clock.
		 */

		build: function(time) {
			var t        = this;

			time = time ? time : (this.factory.time.time ? this.factory.time.time : this.factory.time.getTime());

			this.base(time);
			this.meridiumText = this._isPM() ? 'PM' : 'AM';
			this.meridium = $([
				'<ul class="flip-clock-meridium">',
					'<li>',
						'<a href="#">'+this.meridiumText+'</a>',
					'</li>',
				'</ul>'
			].join(''));

			this.meridium.insertAfter(this.factory.lists[this.factory.lists.length-1].$obj);
		},

		/**
		 * Flip the clock face
		 */

		flip: function() {
			if(this.meridiumText != this._getMeridium()) {
				this.meridiumText = this._getMeridium();
				this.meridium.find('a').html(this.meridiumText);
			}
			this.base(this.factory.time.getTime());
		},

		/**
		 * Get the current meridium
		 *
		 * @return  string  Returns the meridium (AM|PM)
		 */

		_getMeridium: function() {
			return new Date().getHours() >= 12 ? 'PM' : 'AM';
		},

		/**
		 * Is it currently in the post-medirium?
		 *
		 * @return  bool  Returns true or false
		 */

		_isPM: function() {
			return this._getMeridium() == 'PM' ? true : false;
		},

		/**
		 * Clear the excess digits from the tens columns for sec/min
		 */

		_clearExcessDigits: function() {
			var tenSeconds = this.factory.lists[this.factory.lists.length - 2];
			var tenMinutes = this.factory.lists[this.factory.lists.length - 4];

			for(var x = 6; x < 10; x++) {
				tenSeconds.$obj.find('li:last-child').remove();
				tenMinutes.$obj.find('li:last-child').remove();
			}
		}

	});

}(jQuery));
(function($) {

	/**
	 * FlipClock German Language Pack
	 *
	 * This class will used to translate tokens into the German language.
	 *
	 */

	FlipClock.Lang.German = {

		'years'   : 'Jahre',
		'months'  : 'Monate',
		'days'    : 'Tage',
		'hours'   : 'Stunden',
		'minutes' : 'Minuten',
		'seconds' : 'Sekunden'

	};

	/* Create various aliases for convenience */

	FlipClock.Lang['de']     = FlipClock.Lang.German;
	FlipClock.Lang['de-de']  = FlipClock.Lang.German;
	FlipClock.Lang['german'] = FlipClock.Lang.German;

}(jQuery));
(function($) {

	/**
	 * FlipClock English Language Pack
	 *
	 * This class will used to translate tokens into the English language.
	 *
	 */

	FlipClock.Lang.English = {

		'years'   : 'Years',
		'months'  : 'Months',
		'days'    : 'Days',
		'hours'   : 'Hours',
		'minutes' : 'Minutes',
		'seconds' : 'Seconds'

	};

	/* Create various aliases for convenience */

	FlipClock.Lang['en']      = FlipClock.Lang.English;
	FlipClock.Lang['en-us']   = FlipClock.Lang.English;
	FlipClock.Lang['english'] = FlipClock.Lang.English;

}(jQuery));
(function($) {

	/**
	 * FlipClock Spanish Language Pack
	 *
	 * This class will used to translate tokens into the Spanish language.
	 *
	 */

	FlipClock.Lang.Spanish = {

		'years'   : 'A&#241;os',
		'months'  : 'Meses',
		'days'    : 'D&#205;as',
		'hours'   : 'Horas',
		'minutes' : 'Minutos',
		'seconds' : 'Segundo'

	};

	/* Create various aliases for convenience */

	FlipClock.Lang['es']      = FlipClock.Lang.Spanish;
	FlipClock.Lang['es-es']   = FlipClock.Lang.Spanish;
	FlipClock.Lang['spanish'] = FlipClock.Lang.Spanish;

}(jQuery));
(function($) {

  /**
   * FlipClock Canadian French Language Pack
   *
   * This class will used to translate tokens into the Canadian French language.
   *
   */

  FlipClock.Lang.French = {

    'years'   : 'ans',
    'months'  : 'mois',
    'days'    : 'jours',
    'hours'   : 'heures',
    'minutes' : 'minutes',
    'seconds' : 'secondes'

  };

  /* Create various aliases for convenience */

  FlipClock.Lang['fr']      = FlipClock.Lang.French;
  FlipClock.Lang['fr-ca']   = FlipClock.Lang.French;
  FlipClock.Lang['french']  = FlipClock.Lang.French;

}(jQuery));


// Original flip-clock.js content starts here
$(document).ready(function() {
    // 获取 DOM 元素
    const dateDisplay = $('#date');
    const mottoDisplay = $('#motto');
    const clockContainer = $('.flip-clock-container');
    const displaySelector = $('#displaySelector');
    const customTimeControls = $('#customTimeControls');
    const customHoursInput = $('#customHours');
    const customMinutesInput = $('#customMinutes');
    const setCustomTimeBtn = $('#setCustomTime');
    const backgroundUploadInput = $('#backgroundUpload');
    const backgroundSelector = $('#backgroundSelector');
    const fullscreenBtn = $('#fullscreenBtn'); // Selector for fullscreen button

    let clock; 
    let currentMode = 'realtime';
    let countdownInterval;

    // --- Clock Initialization Function ---
    function initializeClock(mode, initialTime = 0) {
        if (clock) {
            // If a clock instance exists, stop and clear its interval
            clock.stop();
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            // Destroy or remove the old clock elements if the library supports it
            // or simply empty the container
            clockContainer.empty();
            clock = null;
        }

        // 初始化闹钟音频
        let alarmAudio = new Audio('assets/sounds/alarm-clock.mp3');
        alarmAudio.loop = true;
        
        // 创建模态框（如果不存在）
        if (!$('#countdownFinishedModal').length) {
            $('body').append(`
                <div id="countdownFinishedModal" class="clock-modal">
                    <div class="modal-content">
                        <h2>倒计时结束！</h2>
                        <button id="stopAlarmBtn">确定</button>
                    </div>
                </div>
            `);
            
            // 添加模态框样式
            if (!$('#clockModalStyle').length) {
                $('head').append(`
                    <style id="clockModalStyle">
                        .clock-modal {
                            display: none;
                            position: fixed;
                            z-index: 1000;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            background-color: rgba(0, 0, 0, 0.75);
                            align-items: center;
                            justify-content: center;
                        }
                        .modal-content {
                            background-color: #222;
                            color: #fff;
                            padding: 30px 40px;
                            border-radius: 15px;
                            text-align: center;
                            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                            animation: modalFadeIn 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
                            border: 1px solid #444;
                            min-width: 300px;
                        }
                        .modal-content h2 {
                            margin: 0 0 25px 0;
                            font-size: 28px;
                            letter-spacing: 1px;
                            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                        }
                        @keyframes modalFadeIn {
                            from { opacity: 0; transform: translateY(-40px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        #stopAlarmBtn {
                            background-color: #333;
                            color: #fff;
                            border: none;
                            padding: 12px 30px;
                            margin-top: 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 18px;
                            font-weight: bold;
                            transition: all 0.3s;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                            border: 1px solid #555;
                        }
                        #stopAlarmBtn:hover {
                            background-color: #444;
                            transform: translateY(-2px);
                            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
                        }
                        #stopAlarmBtn:active {
                            transform: translateY(1px);
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
                        }
                    </style>
                `);
            }
        }
            
        // 添加按钮点击事件 - 移到外面以避免重复绑定
        $(document).off('click', '#stopAlarmBtn').on('click', '#stopAlarmBtn', function() {
            alarmAudio.pause();
            alarmAudio.currentTime = 0;
            $('#countdownFinishedModal').css('display', 'none');
            // 重置回实时模式
            initializeClock('realtime');
            displaySelector.val('realtime');
        });
        
        // 添加键盘事件 - 移到外面以避免重复绑定
        $(document).off('keydown.countdownAlarm').on('keydown.countdownAlarm', function(e) {
            if ($('#countdownFinishedModal').css('display') === 'flex') {
                alarmAudio.pause();
                alarmAudio.currentTime = 0;
                $('#countdownFinishedModal').css('display', 'none');
                // 重置回实时模式
                initializeClock('realtime');
                displaySelector.val('realtime');
            }
        });

        let clockOptions = { language: 'zh-cn', autoStart: true };
        let faceType = 'TwentyFourHourClock';
        let startTime = initialTime;
        let isCountdown = false;

        if (mode === 'realtime') {
            faceType = 'TwentyFourHourClock';
            startTime = 0;
        } else if (mode.startsWith('countdown-') || mode === 'custom-countdown') {
            if (mode !== 'custom-countdown') {
                 const minutes = parseInt(mode.split('-')[1], 10);
                 startTime = minutes * 60;
            } else {
                startTime = initialTime;
                if (startTime <= 0) {
                    alert("请输入有效的倒计时时间！");
                    return;
                }
            }
            faceType = (startTime >= 3600) ? 'HourlyCounter' : 'MinuteCounter'; 
            isCountdown = true;
            clockOptions.autoStart = false;
        }

        clockOptions.clockFace = faceType;

        clock = clockContainer.FlipClock(startTime, clockOptions);

        if (isCountdown) {
            clock.setCountdown(true);
            clock.setTime(startTime); 
            clock.start();
            
            // 监控倒计时结束
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            
            countdownInterval = setInterval(function() {
                const currentTime = clock.getTime().time;
                if (currentTime <= 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    
                    // 播放闹钟声音
                    alarmAudio.currentTime = 0;
                    alarmAudio.play().catch(error => {
                        console.error("无法播放闹钟声音：", error);
                    });
                    
                    // 显示模态框
                    $('#countdownFinishedModal').css('display', 'flex');
                }
            }, 1000);
        }
    }

    // --- Event Listener for Mode Change ---
    displaySelector.on('change', function() {
        const selectedMode = $(this).val();
        currentMode = selectedMode;

        if (selectedMode === 'custom-countdown') {
            customTimeControls.show();
            if (clock) {
                clock.stop();
             }
        } else {
            customTimeControls.hide();
            initializeClock(selectedMode);
        }
    });

    // --- Event Listener for Custom Countdown Start Button ---
    setCustomTimeBtn.on('click', function() {
        const hours = parseInt(customHoursInput.val()) || 0;
        const minutes = parseInt(customMinutesInput.val()) || 0;
        let totalSeconds = 0;

        if (hours < 0 || minutes < 0) {
             alert("小时和分钟不能为负数！");
             return;
        }
        
        totalSeconds = (hours * 3600) + (minutes * 60);

        if (totalSeconds > 0) {
             currentMode = 'custom-countdown';
             initializeClock(currentMode, totalSeconds);
        } else {
             alert("倒计时总时间必须大于 0 秒！");
        }
    });

    // --- Background Image Handling ---
    function applyBackground(imageDataUrl) {
        $('body').css({
            'background-image': imageDataUrl ? `url(${imageDataUrl})` : 'none',
            'background-size': 'cover',
            'background-position': 'center',
            'background-repeat': 'no-repeat'
        });
    }

    backgroundSelector.on('change', function(event) {
        const selectedValue = $(this).val();
        if (selectedValue === 'upload') {
            backgroundUploadInput.trigger('click');
            const savedBg = localStorage.getItem('customBackground');
            $(this).val(savedBg ? 'upload' : 'default'); 
        } else if (selectedValue === 'default') {
            applyBackground(null);
            localStorage.removeItem('customBackground');
        }
    });

    backgroundUploadInput.on('change', function(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageDataUrl = e.target.result;
                applyBackground(imageDataUrl);
                try {
                    localStorage.setItem('customBackground', imageDataUrl);
                    backgroundSelector.val('upload');
                } catch (error) {
                    console.error("Error saving background to localStorage:", error);
                    backgroundSelector.val('default');
                }
            };
            reader.onerror = function(error) {
                 console.error("Error reading file:", error);
                 alert("读取文件时出错。");
                 backgroundSelector.val('default');
            };
            reader.readAsDataURL(file);
        } else if (file) {
             alert("请选择一个有效的图片文件。");
             backgroundSelector.val('default');
        }
        $(this).val(''); 
    });

    // --- Fullscreen Handling ---
    function toggleFullScreen() {
        if (!document.fullscreenElement &&    // Standard
            !document.mozFullScreenElement && // Firefox
            !document.webkitFullscreenElement && // Chrome, Safari and Opera
            !document.msFullscreenElement ) {  // IE/Edge
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) { /* Firefox */
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (document.documentElement.msRequestFullscreen) { /* IE/Edge */
                document.documentElement.msRequestFullscreen();
            }
            fullscreenBtn.text("退出全屏"); // Update button text
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { /* Firefox */
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE/Edge */
                document.msExitFullscreen();
            }
             fullscreenBtn.text("全屏"); // Update button text
        }
    }

    fullscreenBtn.on('click', toggleFullScreen);

    // Optional: Update button text if exiting fullscreen via Esc key
    $(document).on('fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange', function() {
        if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
            fullscreenBtn.text("全屏");
        }
    });

    // --- Initial Setup ---
    initializeClock('realtime');
    customTimeControls.hide();

    // Load background from localStorage on startup
    const savedBackground = localStorage.getItem('customBackground');
    if (savedBackground) {
        applyBackground(savedBackground);
        backgroundSelector.val('upload');
    } else {
        backgroundSelector.val('default');
    }

    // --- Date Update --- 
    function updateDate() {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dateDisplay.text(now.toLocaleDateString('zh-CN', options));
    }
    updateDate();
    setInterval(updateDate, 60000);

}); 

// --- 新增：使 Motto 可拖动 (无延迟版本) ---
document.addEventListener('DOMContentLoaded', () => {
    const mottoElement = document.getElementById('motto');
    if (!mottoElement) return;

    let isDragging = false;
    let hasMoved = false; // 标记是否发生了移动
    let startX, startY;
    let initialLeft, initialTop; // 记录拖动开始时的元素位置
    let offsetX, offsetY;       // 记录鼠标按下时相对于元素左上角的偏移

    // --- 拖动阈值 (像素) ---
    const DRAG_THRESHOLD = 5;

    const startDrag = (e) => {
        // 只处理鼠标左键或触摸事件
        if (e.type === 'mousedown' && e.button !== 0) return;

        hasMoved = false; // 重置移动标记
        isDragging = false; // 尚未开始拖动

        startX = e.clientX || e.touches[0].clientX;
        startY = e.clientY || e.touches[0].clientY;

        // 获取元素当前计算后的位置 (left/top)
        const style = window.getComputedStyle(mottoElement);
        // 如果是第一次拖动，可能 left/top 是 'auto' 或百分比，需要获取绝对定位
        const rect = mottoElement.getBoundingClientRect();
        // 注意：如果元素初始不是绝对定位，这里需要处理
        initialLeft = rect.left - (parseFloat(style.marginLeft) || 0);
        initialTop = rect.top - (parseFloat(style.marginTop) || 0);

        // 计算鼠标按下点相对于元素左上角的偏移
        offsetX = startX - initialLeft;
        offsetY = startY - initialTop;

        // 添加移动和结束监听器 (注意：passive: false 很重要，因为需要 preventDefault)
        document.addEventListener('mousemove', onDrag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', stopDrag);

        // 初始时光标保持 text，允许编辑
        mottoElement.style.cursor = 'text';
        // 初始不阻止默认行为，允许点击聚焦编辑
    };

    const onDrag = (e) => {
        const currentX = e.clientX || e.touches[0].clientX;
        const currentY = e.clientY || e.touches[0].clientY;

        // 计算移动距离
        const dx = currentX - startX;
        const dy = currentY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (!isDragging && distance > DRAG_THRESHOLD) {
            // --- 超过阈值，正式开始拖动 ---
            isDragging = true;
            hasMoved = true; // 标记已移动
            mottoElement.classList.add('dragging');
            mottoElement.style.cursor = 'grabbing';

            // 开始拖动后，才阻止默认行为（如文本选择）
            e.preventDefault();
        }

        if (isDragging) {
            // 持续拖动时阻止默认行为（如页面滚动）
            e.preventDefault();

            let newLeft = currentX - offsetX;
            let newTop = currentY - offsetY;

            // 边界检查
            const parentRect = document.body.getBoundingClientRect(); // 或其他容器
            const elementWidth = mottoElement.offsetWidth;
            const elementHeight = mottoElement.offsetHeight;

            newLeft = Math.max(0, Math.min(newLeft, parentRect.width - elementWidth));
            newTop = Math.max(0, Math.min(newTop, parentRect.height - elementHeight));

            // 更新位置 (确保 transform 被清除)
            mottoElement.style.left = `${newLeft}px`;
            mottoElement.style.top = `${newTop}px`;
            mottoElement.style.transform = 'none';
        }
    };

    const stopDrag = (e) => {
        // 移除所有监听器
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', stopDrag);

        if (isDragging) {
            mottoElement.classList.remove('dragging');
        }

        // 恢复光标
        mottoElement.style.cursor = 'text';
        isDragging = false; // 重置拖动状态

        // 如果按下后没有移动（即点击），浏览器默认会处理 contenteditable 的聚焦和编辑
        // 如果移动了（isDragging 为 true），则拖动逻辑已处理
    };

    // 监听 mousedown 或 touchstart 事件开始潜在的拖动
    mottoElement.addEventListener('mousedown', startDrag);
    mottoElement.addEventListener('touchstart', startDrag, { passive: false });

    // 阻止浏览器默认的拖放行为干扰（如果 motto 本身不是 drag source）
    mottoElement.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

});
// --- Motto 可拖动结束 (无延迟版本) --- 