define(["dojo/_base/declare",
        "dojo/dom-class",
        "./_ListCellBase"
], function(declare, domClass, _ListCellBase){

	return declare([_ListCellBase], {

		// The category to render
		category: null,
		_setCategoryAttr: function(value){
			this._set('category', value);
			this.domNode.setAttribute('data-section', value);
		},

		// The base class of the list that contains the cell
		_setListBaseClassAttr: function(value){
			domClass.remove(this.domNode, this.listBaseClass + 'CategoryHeader');
			this.inherited(arguments);
			domClass.add(this.domNode, this.listBaseClass + 'CategoryHeader');
		}

	});
});