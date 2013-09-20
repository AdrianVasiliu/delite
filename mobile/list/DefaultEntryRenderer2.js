define(["dojo/_base/declare",
        "dojo/dom-construct",
        "dojo/dom-class",
        "../iconUtils",
        "./_EntryRendererBase",
        "dui/_TemplatedMixin"
], function(declare, domConstruct, domClass, iconUtils, _EntryRendererBase, _TemplatedMixin){
	
	return declare([_EntryRendererBase, _TemplatedMixin], {

		templateString: '<li><div class="duiListEntryLabel" data-dojo-attach-point="labelNode"></div></li>',

		renderEntry: function(entry){
			var label = entry ? (entry.label ? entry.label : '') : '';
			this.labelNode.innerHTML = label;
			if(entry && entry.icon){
				if(this.iconNode){
					if(this.iconNode.getAttribute("src") != entry.icon){
						console.log(this.iconNode.getAttribute("src"));
						this.iconNode.src = entry.icon;
					}
				}else{
					this.iconNode = domConstruct.create('IMG', {src: entry.icon, class: "duiListEntryIcon"}, this.domNode, 0);
				}
			}else{
				if(this.iconNode){
					this.iconNode.parentNode.removeChild(this.iconNode);
					delete this.iconNode;
				}
			}
		}
	});
});