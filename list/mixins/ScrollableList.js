define(["dcl/dcl",
		"dui/register",
		"dojo/_base/lang",
		// "dojo/dom-construct",
		"dojo/dom-class",
		"dui/Widget",
		"../../themes/load!../../themes/{{theme}}/ScrollableList" // for duiScrollable
], function (dcl, register, lang, /* domConstruct, */ domClass, Widget) {

	return dcl(null, {
		// summary:
		//		ScrollableList wraps a Widget inside a scrollable div (viewport).

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_isScrollable: true, // Flag currently used in StoreModel and Editable. TODO: review/redesign.
		_scroll: 0, // current scroll on the y axis TODO: review/redesign.

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		scrollBy: function (y) {
			this.scrollTop += y;
		},

		/*jshint unused:false */
		onScroll: dcl.before(function (scroll) {
			// abstract method
		}),

		getCurrentScroll: function () {
			return this._scroll;
		},

		getViewportClientRect: function () {
			return this.getBoundingClientRect();
		},
		
		isTopScroll: function () {
			// summary:
			//		Returns true if container's scroll has reached the maximum at
			//		the top of the content. Returns false otherwise.
			// example:
			// | scrollContainer.on("scroll", function () {
			// |	if (scrollContainer.isTopScroll()) {
			// |		console.log("Scroll reached the maximum at the top");
			// |	}
			// | }
			// returns: Boolean
			return this.scrollTop === 0;
		},
		
		isBottomScroll: function () {
			// summary:
			//		Returns true if container's scroll has reached the maximum at
			//		the bottom of the content. Returns false otherwise.
			// example:
			// | scrollContainer.on("scroll", function () {
			// |	if (scrollContainer.isBottomScroll()) {
			// |		console.log("Scroll reached the maximum at the bottom");
			// |	}
			// | }
			// returns: Boolean
			return this.offsetHeight + this.scrollTop >= this.scrollHeight;
		},

		isTopOfNodeBelowTopOfViewport: function (node) {
			return this.getTopOfNodeDistanceToTopOfViewport(node) >= 0;
		},

		getTopOfNodeDistanceToTopOfViewport: function (node) {
			return node.offsetTop - this.getCurrentScroll();
		},

		isBottomOfNodeBeforeBottomOfViewport: function (node) {
			return this.getBottomOfNodeDistanceToBottomOfViewport(node) <= 0;
		},

		getBottomOfNodeDistanceToBottomOfViewport: function (node) {
			var viewportClientRect = this.getViewportClientRect();
			return node.offsetTop +
				node.offsetHeight -
				this.getCurrentScroll() -
				(viewportClientRect.bottom - viewportClientRect.top);
		},

		/////////////////////////////////
		// Widget methods updated by this mixin
		/////////////////////////////////

		buildRendering: dcl.after(function () {
			domClass.add(this, "duiScrollable");
			this.addEventListener("scroll", lang.hitch(this, "_nsOnBrowserScroll"), true);
		}),

		destroy: dcl.after(function () {
			this.removeEventListener("scroll", lang.hitch(this, "_nsOnBrowserScroll"), true);
		}),

		/////////////////////////////////
		// List methods updated by this mixin
		/////////////////////////////////

		_getFirst: dcl.superCall(function (sup) {
			return function () {
				var cell = sup.apply(this, arguments);
				while (cell) {
					if (this.isTopOfNodeBelowTopOfViewport(cell)) {
						break;
					}
					cell = cell.nextElementSibling;
				}
				return cell;
			};
		}),

		_getLast: dcl.superCall(function (sup) {
			return function () {
				var cell = sup.apply(this, arguments);
				while (cell) {
					if (this.isBottomOfNodeBeforeBottomOfViewport(cell)) {
						break;
					}
					cell = cell.previousElementSibling;
				}
				return cell;
			};
		}),

		/////////////////////////////////
		// Event handlers
		/////////////////////////////////

		_nsOnBrowserScroll: function (event) {
			var oldScroll = this._scroll;
			this._scroll = this.scrollTop;
			this.onScroll(oldScroll - this._scroll);
		}
	});
});