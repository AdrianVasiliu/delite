define(["dojo/_base/declare",
        "./AbstractCategoryRenderer"
], function(declare, AbstractCategoryRenderer){
	
	return declare([AbstractCategoryRenderer], {

		variableHeight: false,

		renderCategory: function(category){
			this.domNode.innerHTML = category;
		}

	});
});