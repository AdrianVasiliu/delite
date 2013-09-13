define(["dojo/_base/declare",
        "dojo/dom-class",
        "dui/_WidgetBase"
], function(declare, domClass, _WidgetBase){

	return declare([_WidgetBase], {

		// The index of the entry to render
		entryIndex: null,
		_setEntryIndexAttr: function(value){
			this._set('entryIndex', value);
		},

		// The entry to render
		entry: null,
		_setEntryAttr: function(value){
			this._set('entry', value);
			this.renderEntry(value);
		},

		baseClass: "mblListCell",
		_setBaseClassAttr: function(value){
			domClass.remove(this.domNode, this.baseClass);
			this._set('baseClass', value);
			domClass.add(this.domNode, this.baseClass);
		},

		// Method that render the entry in the widget GUI
		renderEntry: function(entry){
			// abstract method
		}

	});
});