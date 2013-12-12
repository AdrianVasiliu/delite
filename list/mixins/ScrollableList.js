define(["dcl/dcl",
		"dui/register",
		"dojo/_base/lang",
		"dojo/dom-class",
		"dui/Widget",
		"../../themes/load!../../themes/{{theme}}/ScrollableList" // for duiScrollable
], function (dcl, register, lang, domClass, Widget) {

	return dcl(null, {
		// summary:
		//		ScrollableList adds scrolling capabilities to a List widget.

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_isScrollable: true, // Flag currently used in StoreModel and Editable. TODO: review/redesign.
		_scroll: 0, // scroll amount on the y axis at time of the latest "scroll" event. TODO: review/redesign.

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		scrollBy: function (y) {
			this.scrollTop += y;
		},

		getCurrentScroll: function () {
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
			return node.offsetTop - this.getCurrentScroll();
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
				this.getCurrentScroll() -
				(clientRect.bottom - clientRect.top);
		},

		/////////////////////////////////
		// Widget methods updated by this mixin
		/////////////////////////////////

		buildRendering: dcl.after(function () {
			domClass.add(this, "duiScrollable");
			this.on("scroll", this._onBrowserScroll);
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

		_onBrowserScroll: dcl.before(function () {
			this._scroll = this.scrollTop;
		})
	});
});