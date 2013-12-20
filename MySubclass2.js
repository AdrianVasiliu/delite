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
	
	// The line below calls dui/register.register() which throws an error at this line
	// of dui/register:
	//
	// Run introspection to add ES5 getters/setters. [...]
	// proto._introspect(proto._getProps());
	//
	// because _getProps is undefined.
	return register("d-mysubclass2", [HTMLElement, MySubclass2]);
});
