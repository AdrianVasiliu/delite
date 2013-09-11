define(["dojo/_base/declare",
        "dojo/dom-class",
        "dui/_WidgetBase"
], function(declare, domClass, _WidgetBase){
	
	return declare([_WidgetBase], {

		// The base class of the list that contains the cell
		listBaseClass: null,
		_setListBaseClassAttr: function(value){
			domClass.remove(this.domNode, this.listBaseClass + 'Cell');
			this._set('listBaseClass', value);
			domClass.add(this.domNode, this.listBaseClass + 'Cell');
		}

	});
});
