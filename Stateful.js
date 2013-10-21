define(["dcl/dcl"], function(dcl){
	// module:
	//		dui/Stateful

	var apn = {};
	function propNames(name){
		// summary:
		//		Helper function to map "foo" --> "_setFooAttr" with caching to avoid recomputing strings.
		//		Note: in dojo/Stateful they are _fooGetter and _fooSetter.

		if(apn[name]){ return apn[name]; }
		var uc = name.replace(/^[a-z]|-[a-zA-Z]/g, function(c){ return c.charAt(c.length-1).toUpperCase(); });
		return (apn[name] = {
			p: "_" + name + "Attr",		// shadow property, since real property hidden by setter/getter
			s: "_set" + uc + "Attr",	// converts dashes to camel case, ex: accept-charset --> _setAcceptCharsetAttr
			g: "_get" + uc + "Attr"
		});
	}

	var Stateful = dcl(null, {
		// summary:
		//		Base class for objects that provide named properties with optional getter/setter
		//		control and the ability to watch for property changes.
		//
		//		The class also provides the functionality to auto-magically manage getters
		//		and setters for class attributes/properties.  Note though that expando properties
		//		(i.e. properties added to an instance but not in the prototype) are not supported.
		//
		//		Getters and Setters should follow the format of _setXxxAttr or _getXxxAttr where
		//		the xxx is a name of the attribute to handle.  So an attribute of "foo"
		//		would have a custom getter of _getFooAttr and a custom setter of _setFooAttr.
		//		Setters must save and announce the new property value by calling this._set("foo", val),
		//		and getters should access the property value as this._fooAttr.
		//
		// example:
		//	|	var MyClass = dcl(Stateful, {});
		//	|	var obj = new MyClass();
		//	|	obj.watch("foo", function(){
		//	|		console.log("foo changed to " + this.foo);
		//	|	});
		//	|	obj.foo = bar;

		_introspect: function(){
			// summary:
			//		Sets up ES5 getters/setters for each class property, except for functions and privates
			//		and properties inside of an HTMLElement type base class.
			//		Inside _introspect(), "this" is a reference to the prototype rather than any individual instance.

			var self = this, proto = this, ctor;

			do {
				Object.keys(proto).forEach(function(prop){
					if(typeof proto[prop] == "function" || /^_/.test(prop)){ return; }
					var names = propNames(prop),
						shadowProp = names.p,
						getter = names.g,
						setter = names.s;

					// Setup ES5 getter and setter for this property, if not already setup.
					// For a property named foo, saves raw value in _fooAttr.
					// ES5 setter intentionally does late checking for this[names.s] in case a subclass sets up a
					// _setFooAttr method.
					if(!(shadowProp in proto)){
						self[shadowProp] = self[prop];
						Object.defineProperty(self, prop, {
							set: function(x){
								setter in this ? this[setter](x) : this._set(prop, x);
							},
							get: function(){
								return getter in this ? this[getter]() : this[shadowProp];
							}
						});
					}
				});

				proto = Object.getPrototypeOf(proto);
				ctor = proto && proto.constructor;
			} while(proto && !/HTML[a-zA-Z]*Element/.test(ctor.name || ctor.toString()));
		},

		constructor: dcl.advise({
			before: function(){
				// First time this class is instantiated, introspect it.
				if(!this.constructor._introspected){	// note: checking if this class was introspected, not a superclass
					this.constructor.prototype._introspect();	// note: inside _introspect() this refs prototype
					this.constructor._introspected = true;
				}
			},

			after: function(args){
				// Automatic setting of params during construction.
				// In after() advice so that it runs after all the subclass constructor methods.
				if (args.length){ this.mix(args[0]); }
			}
		}),

		mix: function(/*Object*/ hash){
			// summary:
			//		Set a hash of properties on a Stateful instance
			//	|	myObj.mix({
			//	|		foo: "Howdy",
			//	|		bar: 3
			//	|	})

			for(var x in hash){
				if(hash.hasOwnProperty(x) && x != "_watchCallbacks"){
					this[x] = hash[x];
				}
			}
		},

		_set: function(name, value){		// note: called _changeAttrValue() in dojo/Stateful
			// summary:
			//		Internal helper for directly changing an attribute value.
			// name: String
			//		The property to set.
			// value: Mixed
			//		The value to set in the property.
			// description:
			//		Directly change the value of an attribute on an object, bypassing any
			//		accessor setter.  Also notifies callbacks registered via watch().
			//		It is designed to be used by descendant class when there are two values
			//		of attributes that are linked, but calling .set() is not appropriate.

			var shadowPropName = propNames(name).p;
			var oldValue = this[shadowPropName];
			this[shadowPropName] = value;
			if(this._watchCallbacks){
				this._watchCallbacks(name, oldValue, value);
			}
		},

		_get: function(name){
			// summary:
			//		Internal helper for directly accessing an attribute value.
			// name: String
			//		The property to get.
			// description:
			//		Directly get the value of an attribute on an object, bypassing any
			//		accessor getter.
			//		It is designed to be used by descendant class if they want in their custom getter to access the value
			//		before returning it.

			return this[propNames(name).p];
		},

		watch: function(/*String?*/ name, /*Function*/ callback){
			// summary:
			//		Watches a property for changes
			// name:
			//		Indicates the property to watch. This is optional (the callback may be the
			//		only parameter), and if omitted, all the properties will be watched
			// returns:
			//		An object handle for the watch. The unwatch method of this object
			//		can be used to discontinue watching this property:
			//		|	var watchHandle = obj.watch("foo", callback);
			//		|	watchHandle.unwatch(); // callback won't be called now
			// callback:
			//		The function to execute when the property changes. This will be called after
			//		the property has been changed. The callback will be called with the |this|
			//		set to the instance, the first argument as the name of the property, the
			//		second argument as the old value and the third argument as the new value.

			var callbacks = this._watchCallbacks;
			if(!callbacks){
				var self = this;
				callbacks = this._watchCallbacks = function(name, oldValue, value, ignoreCatchall){
					var notify = function(propertyCallbacks){
						if(propertyCallbacks){
							propertyCallbacks = propertyCallbacks.slice();
							for(var i = 0, l = propertyCallbacks.length; i < l; i++){
								propertyCallbacks[i].call(self, name, oldValue, value);
							}
						}
					};
					notify(callbacks['_' + name]);
					if(!ignoreCatchall){
						notify(callbacks["*"]); // the catch-all
					}
				}; // we use a function instead of an object so it will be ignored by JSON conversion
			}
			if(!callback && typeof name === "function"){
				callback = name;
				name = "*";
			}else{
				// prepend with dash to prevent name conflicts with function (like "name" property)
				name = '_' + name;
			}
			var propertyCallbacks = callbacks[name];
			if(typeof propertyCallbacks !== "object"){
				propertyCallbacks = callbacks[name] = [];
			}
			propertyCallbacks.push(callback);

			return {
				remove: function(){
					var index = propertyCallbacks.indexOf(callback);
					if(index > -1){
						propertyCallbacks.splice(index, 1);
					}
				}
			}; //Object
		}
	});

	dcl.chainAfter(Stateful, "_introspect");

	return Stateful;
});
