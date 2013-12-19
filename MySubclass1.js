define([
	"dcl/dcl",
	"./register",
	"./MyClass"
], function (dcl, register, MyClass) {

	return register("d-mysubclass1", [HTMLElement, MyClass], {
		// summary:
		//		A subclass for testing purposes.
		
		buildRendering: dcl.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);
				console.log("MySubclass1.buildRendering, variant with dcl.superCall");
			};
		})
		/*
		buildRendering: function () {
			console.log("MySubclass1.buildRendering, variant without dcl.after or dcl/superCall");
		}
		*/
	});
});
