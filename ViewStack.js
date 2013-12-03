define(
	["dcl/dcl",
		"./register",
		"dojo/sniff",
		"dojo/on",
		"dojo/Deferred",
		"./Widget",
		"./DisplayContainer",
		"./Invalidating",
		"dojo/_base/lang",
		"dojo/dom",
		"dojo/dom-geometry",
		"dojo/dom-class",
		"./themes/load!./themes/{{theme}}/ViewStack",
		"./themes/load!./themes/common/transitions/slide",
		"./themes/load!./themes/common/transitions/reveal",
		"./themes/load!./themes/common/transitions/flip",
		"./themes/load!./themes/common/transitions/revealv",
		"./themes/load!./themes/common/transitions/scaleIn"],
	function (dcl, register, sniff, on, Deferred, Widget, DisplayContainer, Invalidating, lang, dom, domGeom, domClass) {
		function setVisibility(node, val) {
			if (val) {
				node.style.visibility = "visible";
				node.style.display = "";
			} else {
				node.style.visibility = "hidden";
				node.style.display = "none";
			}
		}

		function transitionClass(s) {
			return "dui" + s.charAt(0).toUpperCase() + s.substring(1);
		}

		return register("d-view-stack", [HTMLElement, Widget, DisplayContainer, Invalidating], {

			// summary:
			//		ViewStack container widget.
			//
			//		ViewStack displays its first child node by default.
			//		The methods 'show' is used to change the visible child.
			//
			//		Styling constrains: the following CSS attributes must not be changed.
			// 			- ViewStack node:  position, box-sizing, overflow-x
			// 			- ViewStack children:  position, box-sizing, width, height
			//		See ViewStack.css for default values.

			// example:
			//	|	<d-view-stack id="vs">
			//	|		<div id="childA">...</div>
			//	|		<div id="childB">...</div>
			//	|		<div id="childC">...</div>
			//	|	</d-view-stack>
			//	|	<d-button onclick="vs.show(childB, {transition: 'reveal', reverse: true})">...</d-button>

			baseClass: "duiViewStack",

			transition: "slide",

			reverse: false,

			transitionTiming: {default: 0, ios: 20, android: 100, mozilla: 100},

			_timing: 0,
			_visibleChild: null,
			_transitionEndHandlers: [],

			preCreate: function () {
				this.addInvalidatingProperties("transitionTiming");
			},

			buildRendering: function () {
				for (var i = 1; i < this.children.length; i++) {
					setVisibility(this.children[i], false);
				}
				this.invalidateRendering();
			},

			refreshRendering: function () {
				for (var o in this.transitionTiming) {
					if (sniff(o) && this._timing < this.transitionTiming[o]) {
						this._timing = this.transitionTiming[o];
					}
				}
			},

			showNext: function (props) {
				if (!this._visibleChild && this.children.length > 0) {
					this._visibleChild = this.children[0];
				}
				if (this._visibleChild && this._visibleChild.getNextSibling) {
					this.show(this._visibleChild.getNextSibling(), props);
				} else {
					console.log("ViewStack's children must implement getNextSibling()");
				}
			},

			showPrevious: function (props) {
				if (!this._visibleChild && this.children.length > 0) {
					this._visibleChild = this.children[0];
				}
				if (this._visibleChild && this._visibleChild.getPreviousSibling) {
					this.show(this._visibleChild.getPreviousSibling(), props);
				} else {
					console.log("ViewStack's children must implement getPreviousSibling()");
				}
			},

			performDisplay: function (event) {
				var origin = this._visibleChild;
				var dest = document.getElementById(event.dest);
				var deferred = new Deferred();
				setVisibility(dest, true);
				this._setAfterTransitionHandlers(origin, event);
				this._setAfterTransitionHandlers(dest, event, deferred);
				domClass.add(origin, transitionClass(event.transition));
				domClass.add(dest, transitionClass(event.transition));
				domClass.remove(dest, "duiTransition");
				domClass.add(dest, "duiIn");
				if (event.reverse) {
					domClass.add(origin, "duiReverse");
					domClass.add(dest, "duiReverse");
				}
				this.defer(function () {
					domClass.add(dest, "duiTransition");
					domClass.add(origin, "duiTransition");
					domClass.add(origin, "duiOut");
					if (event.reverse) {
						domClass.add(origin, "duiReverse");
						domClass.add(dest, "duiReverse");
					}
					domClass.add(dest, "duiIn");
				}, this._timing);
				this._visibleChild = dest;
				return deferred;
			},

			show: function (/* HTMLDivElement */ node, props) {
				//		Shows a children of the ViewStack. The parameter 'props' is optional and is
				//		{transition: 'slide', reverse: false} by default.
				if (!this._visibleChild) {
					this._visibleChild = this.children[0];
				}
				var origin = this._visibleChild;
				if (origin) {
					if (node && origin !== node) {
						if (!props) {
							props = {transition: this.transition, reverse: this.reverse};
						}
						if (!props.transition) {
							props.transition = this.transition;
						}
						dcl.mix(props, {
							dest: node.id,
							transitionDeferred: new Deferred(),
							bubbles: true,
							cancelable: true
						});
						on.emit(document, "delite-display", props);
					}
				}
			},

			addChild: dcl.superCall(function (sup) {
				return function (/*dui/Widget|DOMNode*/ widget, /*jshint unused: vars */insertIndex) {
					sup.apply(this, arguments);
					setVisibility(widget, false);
				};
			}),

			_setAfterTransitionHandlers: function (node, event, deferred) {
				var handle = lang.hitch(this, this._afterTransitionHandle);
				this._transitionEndHandlers.push({node: node, handle: handle, props: event, deferred: deferred});
				node.addEventListener("webkitTransitionEnd", handle);
				node.addEventListener("transitionend", handle); // IE10 + FF
			},

			_afterTransitionHandle: function (event) {
				var item;
				for (var i = 0; i < this._transitionEndHandlers.length; i++) {
					item = this._transitionEndHandlers[i];
					if (event.target === item.node) {
						if (domClass.contains(item.node, "duiOut")) {
							setVisibility(item.node, false);
						}
						domClass.remove(item.node, "duiIn");
						domClass.remove(item.node, "duiOut");
						domClass.remove(item.node, "duiReverse");
						domClass.remove(item.node, transitionClass(item.props.transition));
						domClass.remove(item.node, "duiTransition");
						item.node.removeEventListener("webkitTransitionEnd", item.handle);
						item.node.removeEventListener("transitionend", item.handle);
						this._transitionEndHandlers.splice(i, 1);
						if (item.props.deferred) {
							item.props.deferred.resolve();
						}
						break;
					}
				}
			}
		});
	});

