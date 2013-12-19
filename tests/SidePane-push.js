define([
	"intern!object",
	"intern/chai!assert",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"../register",
	"dojo/text!../widgetTests/test_Sidepane-push.html",
	"dui/css!../themes/defaultapp.css",
	"dui/SidePane"
], function (registerSuite, assert, domGeom, domClass, register, html) {
	var node;
	registerSuite({
		name: "SidePane Push",
		setup: function () {
			document.body.innerHTML = html;
			register.parse(document.body);
			node = document.getElementById("sp");
			node.open();
			node.mode = "push";
		},
		"Default values" : function () {
			assert.deepEqual(node.mode, "push");
			assert.deepEqual(node.position, "start");
			assert.deepEqual(node.animate, true);
			assert.deepEqual(node.swipeClosing, true);
		},
		"Size Computation" : function () {
			var box = domGeom.getMarginBox(node);
			assert.isTrue(box.w > 0);
			assert.isTrue(box.h > 0);
		},
		"Default CSS" : function () {
			assert.isTrue(domClass.contains(node, "d-side-pane"));
			assert.isTrue(domClass.contains(node, "-d-side-pane-push"));
			assert.isTrue(domClass.contains(node, "-d-side-pane-start"));
		},
		teardown: function () {
			document.body.removeChild(document.body.children[0]);
		}
	});
});
