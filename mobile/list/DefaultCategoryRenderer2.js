define(["dojo/_base/declare",
        "dojo/dom-construct",
        "./_CategoryRendererBase"
], function(declare, domConstruct, _CategoryRendererBase){
	
	return declare([_CategoryRendererBase], {

		renderCategory: function(category){
			this.domNode.innerHTML = category;
		}

	});
});