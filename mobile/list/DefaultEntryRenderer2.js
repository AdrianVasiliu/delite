define(["dojo/_base/declare",
        "dojo/dom-construct",
        "./_EntryRendererBase",
        "dui/_TemplatedMixin"
], function(declare, domConstruct, _EntryRendererBase, _TemplatedMixin){
	
	return declare([_EntryRendererBase, _TemplatedMixin], {

		templateString: '<li></li>',

		// The entry to render
		entry: null,
		_setEntryAttr: function(value){
			this.inherited(arguments);
			var label = value ? (value.label ? value.label : '') : '';
			this.domNode.innerHTML = label;
		}

	});
});