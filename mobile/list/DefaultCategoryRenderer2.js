define(["dojo/_base/declare",
        "dojo/dom-construct",
        "./_CategoryRendererBase",
        "dui/_TemplatedMixin"
], function(declare, domConstruct, _CategoryRendererBase, _TemplatedMixin){
	
	return declare([_CategoryRendererBase, _TemplatedMixin], {

		templateString: '<li></li>',

		// The category to render
		category: null,
		_setCategoryAttr: function(value){
			this.inherited(arguments);
			this.domNode.innerHTML = value;
		}

	});
});