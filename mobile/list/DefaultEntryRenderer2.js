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
			this._renderImageNode("iconNode", entry ? entry.icon : null, "duiListEntryIcon");
			if(entry && entry.rightText){
				if(this.rightTextNode){
					this.rightTextNode.innerHTML = entry.rightText;
				}else{
					this.rightTextNode = domConstruct.create('DIV', {innerHTML: entry.rightText, class: "duiListEntryRightText"}, this.domNode, 0);
				}
			}else{
				if(this.rightTextNode){
					this.rightTextNode.parentNode.removeChild(this.rightTextNode);
					delete this.rightTextNode;
				}
			}
			this._renderImageNode("rightIcon2", entry ? entry.rightIcon2 : null, "duiListEntryRightIcon2");
			this._renderImageNode("rightIcon", entry ? entry.rightIcon : null, "duiListEntryRightIcon");
		},

		_renderImageNode: function(nodeName, image, nodeClass){
			if(image){
				if(this[nodeName]){
					if(this[nodeName].getAttribute("src") != image){
						this[nodeName].src = image;
					}
				}else{
					this[nodeName] = domConstruct.create('IMG', {src: image, class: nodeClass}, this.domNode, 0);
				}
			}else{
				if(this[nodeName]){
					this[nodeName].parentNode.removeChild(this[nodeName]);
					delete this[nodeName];
				}
			}
		}
	});
});