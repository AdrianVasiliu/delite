define(["dojo/_base/declare",
        "dojo/dom-class",
        "dui/_WidgetBase"
], function(declare, domClass, _WidgetBase){

	return declare([_WidgetBase], {

		// The index of the entry to render
		entryIndex: null,
		_setEntryIndexAttr: function(value){
			this._set('entryIndex', value);
			this.domNode.setAttribute('data-index', this.entryIndex);
		},

		// The entry to render
		entry: null,
		_setEntryAttr: function(value){
			this._set('entry', value);
			this.renderEntry(value);
		},

		// The base class of the list that contains the cell
		listBaseClass: null,
		_setListBaseClassAttr: function(value){
			domClass.remove(this.domNode, this.listBaseClass + 'Cell');
			this._set('listBaseClass', value);
			domClass.add(this.domNode, this.listBaseClass + 'Cell');
		},

		// Method that render the entry in the widget GUI
		renderEntry: function(entry){
			// abstract method
		}

	});
});