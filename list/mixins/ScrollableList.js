define(["dcl/dcl",
		"dui/register",
		"dojo/_base/lang",
		"dojo/dom-construct",
		"dui/Widget",
		"../../themes/load!../../themes/{{theme}}/ScrollableList" // for duiScrollable
], function (dcl, register, lang, domConstruct, Widget) {

	return dcl(null, {
		// summary:
		//		ScrollableList wraps a Widget inside a scrollable div (viewport).
		//		The height of this div is defined by the height parameter of the ScrollableList mixin.

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_isScrollable: true,
		_viewportNode: null,
		_scroll: 0, // current scroll on the y axis
		_visibleHeight: null, // the height of the viewport, set by the resize method

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		scrollBy: function (y) {
			this._viewportNode.scrollTop += y;
		},

		/*jshint unused:false */
		onScroll: dcl.before(function (scroll) {
			// abstract method
		}),

		getCurrentScroll: function () {
			return this._scroll;
		},

		getViewportClientRect: function () {
			return this._viewportNode.getBoundingClientRect();
		},
		
		isTopScroll: function () {
			return this._viewportNode.scrollTop === 0;
		},
		
		isBottomScroll: function () {
			var scroller = this._viewportNode;
			return scroller.offsetHeight + scroller.scrollTop >= scroller.scrollHeight;
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
			return node.offsetTop
				+ node.offsetHeight
				- this.getCurrentScroll()
				- (viewportClientRect.bottom - viewportClientRect.top);
		},

		/////////////////////////////////
		// Widget methods updated by this mixin
		/////////////////////////////////

		buildRendering: dcl.after(function () {
			// Create a scrollable container and add the widget node to it
			this._viewportNode = domConstruct.create("div", {class: "duiScrollable"});
			register.dcl.mix(this._viewportNode, new Widget());
			if (this.parentNode) {
				domConstruct.place(this._viewportNode, this, "after");
			}
			this._viewportNode.appendChild(this);
			// listen to scroll initiated by the browser (when the user navigates the list using the TAB key)
			this._viewportNode.addEventListener("scroll", lang.hitch(this, "_nsOnBrowserScroll"), true);
		}),

		enteredViewCallback: dcl.after(function () {
			if (this.height) {
				this._viewportNode.style.height = this.height;
				this.style.height = "";
				this.height = null;
			} else {
				// TODO: what is the default height ?
			}
		}),

		placeAt: dcl.superCall(function (sup) {
			return function (/* String|DomNode|Widget */ reference, /* String|Int? */ position) {
				// The node to place is this._viewportNode, not this
				return sup.apply(this._viewportNode, arguments);
			};
		}),

		destroy: dcl.after(function () {
			if (this._viewportNode) {
				this._viewportNode.removeEventListener("scroll", lang.hitch(this, "_nsOnBrowserScroll"), true);
				domConstruct.destroy(this._viewportNode);
			}
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
			this._scroll = this._viewportNode.scrollTop;
			this.onScroll(oldScroll - this._scroll);
		}
	});
});