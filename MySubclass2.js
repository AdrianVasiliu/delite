define([
	"dcl/dcl",
	"./register",
	"./MyClass"
], function (dcl, register, MyClass) {

	var MySubclass2 = dcl([MyClass], {
		// summary:
		//		Another subclass for testing purposes.
		
		buildRendering: dcl.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);
				console.log("MySubclass2.buildRendering, variant with dcl.superCall");
			};
		})
		/*
		buildRendering: function () {
			console.log("MySubclass2.buildRendering, variant without dcl.after or dcl/superCall");
		}
		*/
	});
	return register("d-mysubclass2", [HTMLElement, MySubclass2]);
});
