define(["dojo/_base/declare",
        "dojo/dom-construct",
        "./_CategoryRendererBase",
        "dui/_TemplatedMixin"
], function(declare, domConstruct, _CategoryRendererBase, _TemplatedMixin){
	
	return declare([_CategoryRendererBase, _TemplatedMixin], {

		templateString: '<li></li>',

		renderCategory: function(category){
			this.domNode.innerHTML = category;
		}

	});
});