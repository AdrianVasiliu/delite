define([
	"dojo/_base/declare", // declare
	"dojo/sniff", // has("msapp")
	"../Widget",
	"../CssState",
	"../_TemplatedMixin",
	"./_FormWidgetMixin"
], function(declare, has, Widget, _CssStateMixin, _TemplatedMixin, _FormWidgetMixin){

	// module:
	//		dui/form/_FormWidget

	return declare("dui.form._FormWidget", [Widget, _TemplatedMixin, CssState, _FormWidgetMixin], {
		// summary:
		//		Base class for widgets corresponding to native HTML elements such as `<checkbox>` or `<button>`,
		//		which can be children of a `<form>` node or a `dui/form/Form` widget.
		//
		// description:
		//		Represents a single HTML element.
		//		All these widgets should have these attributes just like native HTML input elements.
		//		You can set them during widget construction or afterwards, via `dui/Widget.set()`.
		//
		//		They also share some common methods.

		// Override automatic assigning type --> focusNode, it causes exception on IE.
		// Instead, type must be specified as ${type} in the template, as part of the original DOM.
		// TODO: check if this is still needed or if it was only an issue for IE6/7
		_setTypeAttr: null
	});
});
