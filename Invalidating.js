/** @module delite/Invalidating */
define(["dcl/dcl", "dojo/_base/lang", "./Stateful", "./Destroyable"], function (dcl, lang, Stateful, Destroyable) {

	/**
	 * @summary
	 * Mixin for classes (usually widgets) that watch a set of invalidating properties
	 * and delay to the next execution frame the refresh following the changes of
	 * the values of these properties. The receiving class must extend delite/Widget
	 * or dojo/Evented.
	 * @description
	 * Once a set of properties have been declared subject to invalidation using the method
	 * addInvalidatingProperties(), changes of the values of these properties possibly
	 * end up calling refreshProperties() and in all cases refreshRendering(),
	 * thus allowing the receiving class to refresh itself based on the new values.
	 * @mixin module:delite/Invalidating
	 * @augments {module:delite/Stateful}
	 * @augments {module:delite/Destroyable}
	 */
	return dcl([Stateful, Destroyable], /** @lends module:delite/Invalidating# */{

		_renderHandle: null,

		/**
		 * A hash of properties to watch in order to trigger the invalidation of these properties
		 * and/or the rendering invalidation. This list must be initialized by the time buildRendering() completes, 
		 * usually in preCreate(), using addInvalidatingProperties(). 
		 * @default null
		 * @private
		 */
		_invalidatingProperties: null,

		/**
		 * A hash of invalidated properties either to refresh them or to refresh the rendering.
		 * @private
		 */
		_invalidatedProperties: null,

		/**
		 * Whether at least one property is invalid. This is readonly information, one must call
		 * invalidateProperties() to modify this flag.
		 * @member {boolean}
		 * @default false
		 */
		invalidProperties: false,

		/**
		 * Whether the rendering is invalid. This is readonly information, one must call
		 * invalidateRendering() to modify this flag.
		 * @member {boolean}
		 * @default false
		 */
		invalidRendering: false,

		// if we are not a Widget, setup the listeners at construction time
		constructor: dcl.after(function () {
			this._initializeInvalidating();
		}),

		// if we are on a Widget, listen for any changes to properties after the widget has been rendered,
		// including when declarative properties (ex: iconClass=xyz) are applied.
		buildRendering: dcl.after(function () {
			// tags:
			//		protected
			this._initializeInvalidating();
		}),

		_initializeInvalidating: function () {
			if (this._invalidatingProperties) {
				Object.keys(this._invalidatingProperties).forEach(function (prop) {
					// Do late binding to support AOP on invalidateProperty() and invalidateRendering()
					var funcName = this._invalidatingProperties[prop];
					this.watch(prop, function (p, o, n) { this[funcName](p, o, n); });
				}, this);
			}
			this._invalidatedProperties = {};
		},

		/**
		 * @summary
		 * Adds the properties listed as arguments to the properties watched for triggering invalidation.
		 * This method must be called during the startup lifecycle before buildRendering() completes,
		 * usually in preCreate().
		 * @description
		 * This can be used to trigger invalidation for rendering or for both property and rendering. When
		 * no invalidation mechanism is specified, only the rendering refresh will be triggered, that is only
		 * the refreshRendering() method will be called.
		 * This method can either be called with a list of properties to invalidate the rendering as follows:
		 * ```javascript
		 *		this.addInvalidatingProperties("foo", "bar", ...);
		 *	```	
		 * or with an hash of keys/values, the keys being the properties to invalidate and the values
		 * being the invalidation method (either rendering or property and rendering):
		 * ```javascript
		 *		this.addInvalidatingProperties({
		 *			"foo": "invalidateProperty",
		 *			"bar": "invalidateRendering"
		 *		});
		 *	```	
		 * @param {HTMLElement|id} widget The child Widget or HTMLElement to display.
		 * @param {Object} params Optional params that might be taken into account when displaying the child. This can
		 * be the type of visual transitions involved. This might vary from one DisplayContainer to another.
		 * By default on the "hide" param is supporting meaning that the transition should hide the widget
		 * not display it.
		 * @returns {promise} Optionally a promise that will be resolved when the display & transition effect will have
		 * been performed.
		 * @protected
		 */
		addInvalidatingProperties: function () {
			if (this._invalidatingProperties == null) {
				this._invalidatingProperties = {};
			}
			for (var i = 0; i < arguments.length; i++) {
				if (typeof arguments[i] === "string") {
					// we just want the rendering to be refreshed
					this._invalidatingProperties[arguments[i]] = "invalidateRendering";
				} else {
					// we just merge key/value objects into our list of invalidating properties
					var props = Object.keys(arguments[i]);
					for (var j = 0; j < props.length; j++) {
						this._invalidatingProperties[props[j]] = arguments[i][props[j]];
					}
				}
			}
		},

		/**
		 * Invalidates the property for the next execution frame.
		 * @param {string} [name] The name of the property to invalidate. If absent, the revalidation
		 * is performed without a particular property being invalidated, that is
		 * the argument passed to refreshProperties() is called without any argument.
		 * @protected
		 */
		invalidateProperty: function (name) {
			if (name) {
				this._invalidatedProperties[name] = true;
			}
			if (!this.invalidProperties) {
				this.invalidProperties = true;
				// if we have a pending render, let's cancel it to execute it post properties refresh
				if (this._renderHandle) {
					this._renderHandle.remove();
					this.invalidRendering = false;
					this._renderHandle = null;
				}
				this.defer(this.validateProperties, 0);
			}
		},

		/**
		 * Invalidates the rendering for the next execution frame.
		 * @param {string} [name] The name of the property to invalidate. If absent then the revalidation is asked 
		 * without a particular property being invalidated, that is refreshRendering() is called without
		 * any argument.
		 * @protected
		 */
		invalidateRendering: function (name) {
			if (name) {
				this._invalidatedProperties[name] = true;
			}
			if (!this.invalidRendering) {
				this.invalidRendering = true;
				this._renderHandle = this.defer(this.validateRendering, 0);
			}
		},

		/**
		 * @summary
		 * Immediately validates the properties.
		 * @description 
		 * Does nothing if no invalidating property is invalid. You generally do not call that method 
		 * yourself.
		 * @protected
		 */
		validateProperties: function () {
			if (this.invalidProperties) {
				var props = lang.clone(this._invalidatedProperties);
				this.invalidProperties = false;
				this.refreshProperties(this._invalidatedProperties);
				this.emit("refresh-properties-complete",
					{ invalidatedProperties: props, bubbles: true, cancelable: false });
				// if there are properties still marked invalid pursue further with rendering refresh
				this.invalidateRendering();
			}
		},

		/**
		 * @summary
		 * Immediately validates the rendering.
		 * @description 
		 * Does nothing if the rendering is not invalid. You generally do not call that method
		 * yourself.
		 * @protected
		 */
		validateRendering: function () {
			if (this.invalidRendering) {
				var props = lang.clone(this._invalidatedProperties);
				this.invalidRendering = false;
				this.refreshRendering(this._invalidatedProperties);
				// do not fully delete invalidateProperties because someone might have set a property in
				// its refreshRendering method (not wise but who knows what people are doing) and a new cycle
				// should start with that properties listed as invalid instead of a blank set of properties
				for (var key in props) {
					delete this._invalidatedProperties[key];
				}
				this.emit("refresh-rendering-complete",
					{ invalidatedProperties: props, bubbles: true, cancelable: false });
			}
		},

		/**
		 * @summary
		 * Immediately validates the properties and the rendering.
		 * @description 
		 * The method calls validateProperties() then validateRendering(). You generally do not call 
		 * that method yourself.
		 * @protected
		 */
		validate: function () {
			this.validateProperties();
			this.validateRendering();
		},

		/**
		 * @summary
		 * Actually refreshes the properties.
		 * @description 
		 * The default implementation does nothing. A class using this mixin
		 * should implement this method if it needs to react to changes
		 * of the value of an invalidating property, except for modifying the
		 * DOM in which case refreshRendering() should be used instead.
		 * Typically, this method should be overriden for implementing
		 * the reconciliation of properties, for instance for adjusting
		 * interdependent properties such as "min", "max", and "value".
		 * The mixin calls this method before refreshRendering().
		 * @param {Object} props A hash of invalidated properties.
		 * @protected
		 */
		refreshProperties: function (/*jshint unused: vars */props) {
		},

		/**
		 * @summary
		 * Actually refreshes the rendering.
		 * @description
		 * The default implementation does nothing. A class using this mixin
		 * should implement this method if it needs to modify the DOM in reaction
		 * to changes of the value of invalidating properties.
		 * The mixin calls this method after refreshProperties().
		 * @param {Object} props A hash of invalidated properties.
		 * @protected
		 */
		refreshRendering: function (/*jshint unused: vars */props) {
		}
	});
});
