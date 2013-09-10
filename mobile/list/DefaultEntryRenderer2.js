define(["dojo/_base/declare",
        "dojo/dom-construct",
        "dui/_WidgetBase",
        "dui/_TemplatedMixin"
], function(declare, domConstruct, _WidgetBase, _TemplatedMixin){
	
	return declare([_WidgetBase, _TemplatedMixin], {

		templateString: '<li class="${listBaseClass}Cell" data-dojo-attach-point="labelNode""></li>',

		// The index of the entry to render
		entryIndex: null,
		_setEntryIndexAttr: function(value){
			this._set('entryIndex', value);
			this.domNode.setAttribute('data-index', this.entryIndex);
		},

		// The entry to render
		entry: null,
		_setEntryAttr: function(value){
			var label = value ? (value.label ? value.label : '') : '';
			this._set('item', value);
			this.labelNode.innerHTML = label;
		},

		// The base class of the list
		listBaseClass: null,
		_setListBaseClass: function(value){
			this._set('listBaseClass', value);
		}

	});
});