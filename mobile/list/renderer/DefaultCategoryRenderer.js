define(["dojo/_base/declare",
        "./AbstractCategoryRenderer"
], function(declare, AbstractCategoryRenderer){
	
	return declare([AbstractCategoryRenderer], {

		renderCategory: function(category){
			this.domNode.innerHTML = category;
		}

	});
});