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
	var container;

	/*jshint multistr: true */
	html = "<d-scrollable-container id='sc1' \
			style='position: absolute; width: 200px; height: 200px;'> \
			<div id='sc1content' style='width: 2000px; height: 2000px;'></div> \
			</d-scrollable-container>\
			<my-scrolable-container id='mysc1'> \
			</my-scrolable-container> \
			<d-scrollable-container scrollDirection='none' id='sc2'> \
			</d-scrollable-container>";

	// The test cases are shared with ScrollableContainer-prog via
	// tests/Scrollable-shared which is dynamically mixed into the 
	// test suite below.
	
	var suite = {
		name: "dui/ScrollableContainer in markup",
		setup: function () {
			container = document.createElement("div");
			document.body.appendChild(container);
			container.innerHTML = html;
			register("my-scrolable-container", [ScrollableContainer], {});
			register.parse();
		},
		teardown: function () {
			var body = document.body;
			while (body.firstChild) {
				body.removeChild(body.firstChild);
			}
		}
	};
	
	dcl.mix(suite, ScrollableSharedTests);
	
	registerSuite(suite);
});
