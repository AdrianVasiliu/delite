define(["dojo/_base/declare",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dui/_WidgetBase",
        "dui/mobile/list/mixins/ExternalFocusControl"
], function(declare, domClass, domConstruct, _WidgetBase, ExternalFocusControl){

	return declare([_WidgetBase, ExternalFocusControl], {

		// The index of the entry to render
		entryIndex: null,
		_setEntryIndexAttr: function(value){
			this._set('entryIndex', value);
		},

		// The entry to render
		entry: null,
		_setEntryAttr: function(value){
			this._set('entry', value);
			this.renderEntry(value, this.entryIndex);
		},

		buildRendering: function(){
			if(!this.domNode){
				this.domNode = domConstruct.create('div');
			}
			this.inherited(arguments);
		},

		// Method that render the entry in the widget GUI
		renderEntry: function(entry, entryIndex){
			// abstract method
			// this.entry = entry;
			// this.entryIndex = entryIndex;
		}

	});
});