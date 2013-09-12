define(["dojo/_base/declare",
        "dojo/dom-construct",
        "./_EntryRendererBase",
        "dui/_TemplatedMixin"
], function(declare, domConstruct, _EntryRendererBase, _TemplatedMixin){
	
	return declare([_EntryRendererBase, _TemplatedMixin], {

		templateString: '<li></li>',

		renderEntry: function(entry){
			var label = entry ? (entry.label ? entry.label : '') : '';
			this.domNode.innerHTML = label;
		}
	});
});