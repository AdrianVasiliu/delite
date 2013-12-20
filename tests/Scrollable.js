define([
	"dcl/dcl",
	"intern!object",
	"intern/chai!assert",
	"dojo/dom-class",
	"../register",
	"dui/Widget",
	"dui/Scrollable"
], function (dcl, registerSuite, assert, domClass, register, Widget, Scrollable) {
	var container, MyScrollableWidget;

	registerSuite({
		name: "dui/Scrollable",
		setup: function () {
			container = document.createElement("div");
			document.body.appendChild(container);
			MyScrollableWidget = register("my-scrollable-widget", [HTMLElement, Widget, Scrollable], {
				// Going this way leads to the function being called before its 
				// injection into the widget instance, thus 'this' is wrong at that time! 
				// TODO: investigate (dcl issue? reproducible outside intern context?)
				/*
				buildRendering: dcl.superCall(function (sup) {
					sup.apply(this, arguments);
					this.scrollableNode = document.createElement("div");
					this.appendChild(this.scrollableNode);
				})
				*/
			});
			MyScrollableWidget.prototype.buildRendering = dcl.superCall(function (sup) {
				sup.apply(this, arguments);
				this.scrollableNode = document.createElement("div");
				this.appendChild(this.scrollableNode);
			});
		},
		"parse" : function () {
			register.parse(container);
		},
		
		"Default CSS" : function () {
			var w = (new MyScrollableWidget({id: "mysw"})).placeAt(container);
			w.startup();
			w.validateRendering();
			
			assert.isTrue(domClass.contains(w.scrollableNode, "d-scrollable")); // via the mixin dui/Scrollable
		},
		
		// For now, the remaining of the API of the mixin dui/Scrollable is tested
		// in the tests of dui/ScrollableContainer.
		 
		teardown: function () {
			var body = document.body;
			while (body.firstChild) {
				body.removeChild(body.firstChild);
			}
		}
	});
});
