define([
	"dcl/dcl",
	"intern!object",
	"intern/chai!assert",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"dui/register",
	"dui/ScrollableContainer",
	"./Scrollable-shared"
], function (dcl, registerSuite, assert, domGeom, domClass, register, 
		ScrollableContainer, ScrollableSharedTests) {
	var container, MyScrollableContainer;

	// The test cases are shared with ScrollableContainer-markup via
	// tests/Scrollable-shared which is dynamically mixed into the 
	// test suite below.
	
	var suite = {
		name: "dui/ScrollableContainer programatically",
		setup: function () {
			MyScrollableContainer = register("my-sc-prog", [ScrollableContainer], {});
			
			var w = new ScrollableContainer({ id: "sc1" });
			w.style.position = "absolute";
			w.style.width = "200px";
			w.style.height = "200px";
			w.startup();
			document.body.appendChild(w);
			
			var innerContent = document.createElement("div");
			innerContent.id = "sc1content";
			innerContent.style.width = "2000px";
			innerContent.style.height = "2000px";
			w.startup();
			w.appendChild(innerContent);
			
			w = new MyScrollableContainer({ id: "mysc1" });
			w.startup();
			document.body.appendChild(w);
			
			w = new ScrollableContainer({ id: "sc2" });
			w.scrollDirection = "none";
			w.startup();
			document.body.appendChild(w);
		},
		teardown: function () {
			// document.body.removeChild(document.body.children[0]);
			var body = document.body;
			while (body.firstChild) {
				body.removeChild(body.firstChild);
			}
		}
	};
	
	dcl.mix(suite, ScrollableSharedTests);
	
	registerSuite(suite);
});
