define([
	"dcl/dcl",
	"./Invalidating"
], function (dcl, Invalidating) {

	// module:
	//		dui/Scrollable
	
	return dcl(Invalidating, {
		// summary:
		//		A mixin for testing purposes.

		aProp: null,
		
		preCreate: function () {
			this.addInvalidatingProperties("aProp");
		},

		refreshRendering: function () {
			console.log("MyMixin.refreshRendering");
		},
		
		/*
		buildRendering: dcl.after(function () {
			console.log("MyMixin.buildRendering, variant with dcl.after");
			this.invalidateRendering();
		})
		*/
		/*
		buildRendering: dcl.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);
				console.log("MyMixin.buildRendering, variant with dcl.superCall");
				this.invalidateRendering();
			};
		})
		*/
		buildRendering: function () {
			console.log("MyMixin.buildRendering, variant without dcl.after or dcl/superCall");
			this.invalidateRendering();
		}
	});
});
