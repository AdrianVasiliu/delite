define([
	"dcl/dcl",
	"delite/Widget",
	"delite/Invalidating",
	"jquery/src/core", // for $
	"jquery/src/effects", // for "animate()"
	"jquery/src/attributes", // for "toggleClass()" and "css()"
	"delite/themes/load!./Scrollable/themes/{{theme}}/Scrollable_css"
], function (dcl, Widget, Invalidating, $) {

	// module:
	//		delite/Scrollable

	return dcl([Widget, Invalidating], {
		// summary:
		//		A mixin which adds scrolling capabilities to a widget.
		// description:
		//		When mixed into a widget, this mixin adds to it scrolling capabilities
		//		based on the overflow: scroll CSS property.
		//		By default, the scrolling capabilities are added to the widget
		//		node itself. The host widget can chose the node thanks to the property
		//		'scrollableNode'.
		//		During interactive or programmatic scrolling, native "scroll"
		//		events are emitted, and can be listen as follows (here,
		//		'scrollWidget' is the widget into which this mixin is mixed):
		// | scrollWidget.on("scroll", function () {
		// |	...
		// | }
		//		For widgets that customize the 'scrollableNode' property,
		//		the events should be listen on widget.scrollableNode.
		//		TODO: improve the doc.

		// TODO: optional styling of the scrollbar for browsers which by default do not provide
		//	a scroll indicator.

		// scrollDirection: String
		//		The direction of the interactive scroll. Possible values are:
		//		"vertical", "horizontal", "both, and "none". The default value is "vertical".
		//		Note that scrolling programmatically using scrollTo() is
		//		possible on both horizontal and vertical directions independently
		//		on the value of scrollDirection.
		scrollDirection: "vertical",

		// scrollableNode: [readonly] DomNode
		//		Designates the descendant node of this widget which is made scrollable.
		//		The default value is 'null'. If not set, defaults to this widget
		//		itself ('this').
		//		Note that this property can be set only at construction time, as a
		//		constructor argument or in markup as a property of the widget into
		//		which this class is mixed.
		scrollableNode: null,

		preCreate: function () {
			this.addInvalidatingProperties("scrollDirection");
		},

		refreshRendering: dcl.after(function () {
			if (!this.scrollableNode) {
				this.scrollableNode = this; // If unspecified, defaults to 'this'.
			}

			// Replaced:
			// domClass.toggle(this.scrollableNode, "d-scrollable", this.scrollDirection !== "none");
			// by:
			$(this.scrollableNode).toggleClass("d-scrollable", this.scrollDirection !== "none");

			// dom.setSelectable(this.scrollableNode, false);
			// JQuery used to have $.fn.disableSelection()/enableSelection() but these
			// were removed since JQuery 1.9. Hence, as a replacement, I added the 
			// corresponding style declarations to the CSS of the widget.
			// (The handling of this might anyway further change later.)
			
			// Replaced the use of domStyle.set by:
			$(this.scrollableNode).css("overflowX",
				/^(both|horizontal)$/.test(this.scrollDirection) ? "scroll" : "");
			$(this.scrollableNode).css("overflowY",
				/^(both|vertical)$/.test(this.scrollDirection) ? "scroll" : "");
		}),

		buildRendering: dcl.after(function () {
			this.invalidateRendering();
		}),
		
		destroy: function () {
			// Stop jquery's animation if any is ongoing (and clear the queue of queued animations).
			$(this.scrollableNode).stop(true/* clear queue*/, false/*jumpToEnd*/);
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
			return this.scrollableNode.scrollTop === 0;
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
			var scrollableNode = this.scrollableNode;
			return scrollableNode.offsetHeight + scrollableNode.scrollTop >=
				scrollableNode.scrollHeight;
		},

		isLeftScroll: function () {
			// summary:
			//		Returns true if container's scroll has reached the maximum at
			//		the left of the content. Returns false otherwise.
			// example:
			// | scrollContainer.on("scroll", function () {
			// |	if (scrollContainer.isLeftScroll()) {
			// |		console.log("Scroll reached the maximum at the left");
			// |	}
			// | }
			// returns: Boolean
			return this.scrollableNode.scrollLeft === 0;
		},

		isRightScroll: function () {
			// summary:
			//		Returns true if container's scroll has reached the maximum at
			//		the right of the content. Returns false otherwise.
			// example:
			// | scrollContainer.on("scroll", function () {
			// |	if (scrollContainer.isRightScroll()) {
			// |		console.log("Scroll reached the maximum at the right");
			// |	}
			// | }
			// returns: Boolean
			var scrollableNode = this.scrollableNode;
			return scrollableNode.offsetWidth + scrollableNode.scrollLeft >= scrollableNode.scrollWidth;
		},

		getCurrentScroll: function () {
			// summary:
			//		Returns the current amount of scroll, as an object with x and y properties
			//		for the horizontal and vertical scroll amount.
			//		This is a convenience method and it is not supposed to be overridden.
			// returns: Object
			return {x: this.scrollableNode.scrollLeft, y: this.scrollableNode.scrollTop};
		},

		scrollBy: function (by, duration) {
			// summary:
			//		Scrolls by the given amount.
			// by:
			//		The scroll amount. An object with x and/or y properties, for example
			//		{x:0, y:-5} or {y:-29}.
			// duration:
			//		Duration of scrolling animation in milliseconds. If 0 or unspecified,
			//		scrolls without animation.
			var to = {};
			if (by.x !== undefined) {
				to.x = this.scrollableNode.scrollLeft + by.x;
			}
			if (by.y !== undefined) {
				to.y = this.scrollableNode.scrollTop + by.y;
			}
			this.scrollTo(to, duration);
		},

		scrollTo: function (to, /*Number?*/duration) {
			// summary:
			//		Scrolls to the given position.
			// to:
			//		The scroll destination position. An object with x and/or y properties,
			//		for example {x:0, y:-5} or {y:-29}.
			// duration:
			//		Duration of scrolling animation in milliseconds. If 0 or unspecified,
			//		scrolls without animation.
			$(this.scrollableNode).animate(
				{
					scrollLeft: to.x !== undefined ? to.x : this.scrollableNode.scrollLeft,
					scrollTop: to.y !== undefined ? to.y : this.scrollableNode.scrollTop
				}, 
				duration
			);
		}
	});
});
