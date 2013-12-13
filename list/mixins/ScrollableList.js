define(["dcl/dcl",
		"../../register",
		"dojo/dom-class",
		"../../Widget",
		"../../Invalidating",
		"../../themes/load!../../themes/{{theme}}/ScrollableList" // for duiScrollable
], function (dcl, register, domClass, Widget, Invalidating) {

	return dcl(Invalidating, {
		// summary:
		//		ScrollableList adds scrolling capabilities to a List widget.

		// scrollDisabled: Boolean
		//		If true, the scrolling capabilities are disabled. The default value is false.
		scrollDisabled: false,

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		// _scroll: Number
		//		The scroll amount on the y axis at time of the latest "scroll" event. 
		_scroll: 0, // TODO: review/redesign

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		scrollBy: function (y) {
			// summary:
			//		Scrolls by the given amount on the y axis.
			this.scrollTop += y;
		},

		getScroll: function () {
			// summary:
			//		Returns the scroll amount on the y axis at the time of the latest
			//		"scroll" event.
			// returns: Number
			return this._scroll;
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

		isBelowTop: function (node) {
			// summary:
			//		Returns true if the top of the node is below or exactly at the 
			//		top of the scrolling container. Returns false otherwise.
			return this.getTopDistance(node) >= 0;
		},

		getTopDistance: function (node) {
			// summary:
			//		Returns the distance between the top of the node and 
			//		the top of the scrolling container.
			return node.offsetTop - this.getScroll();
		},
		
		isAboveBottom: function (node) {
			// summary:
			//		Returns true if the bottom of the node is above or exactly at the 
			//		bottom of the scrolling container. Returns false otherwise.
			return this.getBottomDistance(node) <= 0;
		},

		getBottomDistance: function (node) {
			// summary:
			//		Returns the distance between the bottom of the node and 
			//		the bottom of the scrolling container.
			var clientRect = this.getBoundingClientRect();
			return node.offsetTop +
				node.offsetHeight -
				this.getScroll() -
				(clientRect.bottom - clientRect.top);
		},

		/////////////////////////////////
		// Widget methods updated by this mixin
		/////////////////////////////////

		preCreate: function () {
			this.addInvalidatingProperties("scrollDisabled");
		},

		refreshRendering: function(){
			if (!this.scrollDisabled) {
				domClass.add(this, "duiScrollable");
				this.on("scroll", this._scrollListHandler);
			}
		},
		
		buildRendering: dcl.after(function () {
			this.invalidateRendering();
		}),

		/////////////////////////////////
		// List methods updated by this mixin
		/////////////////////////////////

		_getFirst: dcl.superCall(function (sup) {
			return function () {
				var cell = sup.apply(this, arguments);
				while (cell) {
					if (this.isBelowTop(cell)) {
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
					if (this.isAboveBottom(cell)) {
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

		_scrollListHandler: dcl.before(function () {
			this._scroll = this.scrollTop;
		})
	});
});