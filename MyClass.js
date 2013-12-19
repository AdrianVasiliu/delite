define([
	"./register",
	"./Widget",
	"./Container",
	"./MyMixin"
], function (register, Widget, Container, MyMixin) {

	return register("d-myclass", [HTMLElement, Widget, Container, MyMixin], {
		// summary:
		//		A class for testing purposes.
	});
});
