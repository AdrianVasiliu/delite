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

		// TODO: CAN'T BE CHANGED BY THE USER
		baseClass: "duiListCategoryHeader",
		_setBaseClassAttr: function(value){
			domClass.remove(this.domNode, this.baseClass);
			this._set('baseClass', value);
			domClass.add(this.domNode, this.baseClass);
		},

		// Method that render the category in the widget GUI
		renderCategory: function(category){
			// abstract method
		}

	});
});