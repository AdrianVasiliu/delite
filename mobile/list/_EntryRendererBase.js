define(["dojo/_base/declare",
        "./_ListCellBase"
], function(declare, _ListCellBase){

	return declare([_ListCellBase], {

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
		}

	});
});