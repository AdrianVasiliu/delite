define(["dojo/_base/declare",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dui/_WidgetBase",
        "dui/_Container",
        "dui/_KeyNavMixin"
], function(declare, domClass, domConstruct, _WidgetBase, _Container, _KeyNavMixin){

	return declare([_WidgetBase], {

		_focusableNodes: null,
		_focusedNodeIndex: null,

		// The index of the entry to render
		entryIndex: null,
		_setEntryIndexAttr: function(value){
			this._set('entryIndex', value);
		},

		// The entry to render
		entry: null,
		_setEntryAttr: function(value){
			this._set('entry', value);
			this.renderEntry(value, this.entryIndex);
			this.label = value.label; // For text search in keyboard navigation
		},

		buildRendering: function(){
			if(!this.domNode){
				this.domNode = domConstruct.create('div');
			}
			this.inherited(arguments);
		},

		// Method that render the entry in the widget GUI
		renderEntry: function(entry, entryIndex){
			// abstract method
			// this.entry = entry;
			// this.entryIndex = entryIndex;
		},

		isFocusable: function(){
			return true;
		},

		focus: function(param){
			this.domNode.focus();
		},

		_getNextFocusableNode: function(dir){
			if(this._focusableNodes){
				var maxIndex = this._focusableNodes.length - 1;
				if(this._focusedNodeIndex == null){
					this._focusedNodeIndex = (dir == 1) ? 0 : maxIndex;
				}else{
					if(dir == 1){
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
				return this._focusableNodes[this._focusedNodeIndex];
			}
		},

		_setFocusableNodes: function(nodeNames) {
			var i=0, node;
			this._focusableNodes = [];
			this._focusedNodeIndex = null;
			for(i=0; i < nodeNames.length; i++){
				node = this[nodeNames[i]];
				if(node){
					////////////////////
					// FIXME: WILL THE NEXT VERSION ALLOW TO WORK WITH DOM NODES ???
					// Create a widget so that it can be focused using _KeyNavMixin
					////////////////////
					this._focusableNodes.push(new _WidgetBase({focus: function(){this.domNode.focus();}}, node));
				}
			}
		}

	});
});