define(["dojo/_base/declare",
        "dojo/dom-class",
        "dui/_WidgetBase"
], function(declare, domClass, _WidgetBase){

	return declare([_WidgetBase], {

		// The category to render
		category: null,
		_setCategoryAttr: function(value){
			this._set('category', value);
			this.renderCategory(value);
		},

		// The base class of the list that contains the cell
		_setListBaseClassAttr: function(value){
			domClass.remove(this.domNode, this.listBaseClass + 'CategoryHeader');
			domClass.remove(this.domNode, this.listBaseClass + 'Cell');
			this._set('listBaseClass', value);
			domClass.add(this.domNode, this.listBaseClass + 'Cell');
			domClass.add(this.domNode, this.listBaseClass + 'CategoryHeader');
		},

		// Method that render the category in the widget GUI
		renderCategory: function(category){
			// abstract method
		}
	});
});