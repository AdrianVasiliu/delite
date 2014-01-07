define([
	"dcl/dcl"
], function (dcl) {

	// module:
	//		dui/Scrollable
	
	return dcl(null, {
		// summary:
		//		A mixin for testing purposes.

		aProp: null,
		
		refreshRendering: function () {
			console.log("MyMixin.refreshRendering");
		},
		
		/*
		buildRendering: dcl.after(function () {
			console.log("MyMixin.buildRendering, variant with dcl.after");
		})
		*/
		/*
		buildRendering: dcl.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);
				console.log("MyMixin.buildRendering, variant with dcl.superCall");
			};
		})
		*/
		buildRendering: function () {
			console.log("MyMixin.buildRendering, variant without dcl.after or dcl/superCall");
		}
	});
});
