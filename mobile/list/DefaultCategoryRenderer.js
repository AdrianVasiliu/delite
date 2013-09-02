define(["dojo/_base/declare",
        "dojo/dom-construct",
        "dui/_WidgetBase",
        "dui/_TemplatedMixin"
], function(declare, domConstruct, _WidgetBase, _TemplatedMixin){
	
	return declare([_WidgetBase, _TemplatedMixin], {

		templateString: '<div class="${listBaseClass}CategoryHeader" data-dojo-attach-point="labelNode"></div>',

		// The category to render
		category: null,
		_setCategoryAttr: {node: 'labelNode', type: 'innerHTML'},
		
		// The base class of the list
		listBaseClass: null,
		_setListBaseClass: function(value){
			this._set('listBaseClass', value);
		}
	});
});