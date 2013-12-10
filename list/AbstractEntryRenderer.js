define(["dcl/dcl",
        "dui/register",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dui/Widget",
        "./mixins/Measurable"
], function (dcl, register, domClass, domConstruct, Widget, Measurable) {

	return dcl([Widget, Measurable], {

		_focusableChildren: null,
		_focusedChild: null,

		// The entry to render
		entry: null,
		_setEntryAttr: function (value) {
			this._set("entry", value);
			this.renderEntry(value);
			this.label = value.label; // For text search in keyboard navigation
		},

		buildRendering: function () {
			this.containerNode = domConstruct.create("div", {className: "duiEntryNode"}, this);
		},

		// Method that render the entry in the widget GUI
		/*jshint unused:false */
		renderEntry: function (entry) {
			// abstract method
		},

		focus: dcl.superCall(function (sup) {
			return function () {
				this._focusedChild = null;
				sup.apply(this, arguments);
			};
		}),

		_getNextFocusableChild: function (fromChild, dir) {
			if (this._focusableChildren) {
				// retrieve the position of the from node
				var nextChildIndex, fromChildIndex = -1, refNode = fromChild || this._focusedChild;
				if (refNode) {
					fromChildIndex = this._focusableChildren.indexOf(refNode);
				}
				if (dir === 1) {
					nextChildIndex = fromChildIndex + 1;
				} else {
					nextChildIndex = fromChildIndex - 1;
				}
				if (nextChildIndex >= this._focusableChildren.length) {
					nextChildIndex = 0;
				} else if (nextChildIndex < 0) {
					nextChildIndex = this._focusableChildren.length - 1;
				}
				return this._focusableChildren[nextChildIndex];
			}
		},

		_setFocusableChildren: function (nodeNames) {
			var i = 0, node, that = this;
			this._focusableChildren = [];
			this._focusedChild = null;
			for (i = 0; i < nodeNames.length; i++) {
				node = this[nodeNames[i]];
				if (node) {
					// need a widget, not only a node
					register.dcl.mix(node, new Widget());
					node.onfocus = function () {
						that._focusedChild = this;
					};
					this._focusableChildren.push(node);
				}
			}
		}

	});

});