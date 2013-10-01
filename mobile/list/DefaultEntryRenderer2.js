define(["dojo/_base/declare",
        "dojo/dom-construct",
        "dojo/dom-class",
        "../iconUtils",
        "./_EntryRendererBase",
        "dui/_TemplatedMixin"
], function(declare, domConstruct, domClass, iconUtils, _EntryRendererBase, _TemplatedMixin){
	
	return declare([_EntryRendererBase, _TemplatedMixin], {

		templateString: '<li></li>',

		_focusableNodes: null,
		_focusedNodeIndex: null,

		renderEntry: function(entry){
			this._renderTextNode("labelNode", entry ? entry.label : null, "duiListEntryLabel");
			this._renderImageNode("iconNode", entry ? entry.icon : null, "duiListEntryIcon");
			this._renderTextNode("rightText", entry ? entry.rightText : null, "duiListEntryRightText");
			this._renderImageNode("rightIcon2", entry ? entry.rightIcon2 : null, "duiListEntryRightIcon2");
			this._renderImageNode("rightIcon", entry ? entry.rightIcon : null, "duiListEntryRightIcon");
			this._setFocusableNodes(["iconNode", "labelNode", "rightText", "rightIcon2", "rightIcon"]);
		},

		// Focus the next or previous element, and return the id of the element that has the focus
		doFocus: function(next){
			if(this._focusableNodes){
				var maxIndex = this._focusableNodes.length - 1;
				if(this._focusedNodeIndex == null){
					this._focusedNodeIndex = next ? 0 : maxIndex;
				}else{
					if(next){
						this._focusedNodeIndex++;
						if(this._focusedNodeIndex > maxIndex){
							this._focusedNodeIndex = 0;
						}
					}else{
						this._focusedNodeIndex--;
						if(this._focusedNodeIndex < 0){
							this._focusedNodeIndex = maxIndex;
						}
					}
				}
				this._focusableNodes[this._focusedNodeIndex].focus();
				return this._focusableNodes[this._focusedNodeIndex].id;
			}
		},

		doBlur: function(){
			this._focusedNodeIndex = null;
		},

		onKeyDown: function(evt){
			console.log("Key down event received:");
			console.log(evt);
		},

		_setFocusableNodes: function(nodeNames) {
			var i=0, node;
			this._focusableNodes = [];
			this._focusedNodeIndex = null;
			for(i=0; i < nodeNames.length; i++){
				node = this[nodeNames[i]];
				if(node){
					this._focusableNodes.push(node);
				}
			}
		},

		_renderTextNode: function(nodeName, text, nodeClass){
			if(text){
				if(this[nodeName]){
					this[nodeName].innerHTML = text;
				}else{
					this[nodeName] = domConstruct.create('DIV', {id: this.id + nodeName, innerHTML: text, class: nodeClass, tabindex: -1}, this.domNode, 0);
				}
			}else{
				if(this[nodeName]){
					this[nodeName].parentNode.removeChild(this[nodeName]);
					delete this[nodeName];
				}
			}
		},

		_renderImageNode: function(nodeName, image, nodeClass){
			if(image){
				if(this[nodeName]){
					if(this[nodeName].getAttribute("src") != image){
						this[nodeName].src = image;
					}
				}else{
					this[nodeName] = domConstruct.create('IMG', {id: this.id + nodeName, src: image, class: nodeClass, tabindex: -1}, this.domNode, 0);
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