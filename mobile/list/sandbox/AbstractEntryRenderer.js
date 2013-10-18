define(["dojo/_base/declare",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dui/_WidgetBase",
        "dui/_Container",
        "dui/_KeyNavMixin",
        "dui/mobile/list/mixins/Measurable"
], function(declare, domClass, domConstruct, _WidgetBase, _Container, _KeyNavMixin, Measurable){

	return declare([_WidgetBase, Measurable], {

		_focusableChildren: null,
		_focusedChild: null,

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
			this.containerNode = domConstruct.create('div', {className: 'duiEntryNode'}, this.domNode);
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
			this._focusedChild = null;
			this.domNode.focus();
		},

		_getNextFocusableChild: function(fromChild, dir){
			if(this._focusableChildren){
				// retrieve the position of the from node
				var nextChildIndex, fromChildIndex = -1, refNode = fromChild || this._focusedChild;
				if(refNode){
					fromChildIndex = this._focusableChildren.indexOf(refNode);
				}
				if(dir == 1){
					nextChildIndex = fromChildIndex + 1;
				}else{
					nextChildIndex = fromChildIndex - 1;
				}
				if(nextChildIndex >= this._focusableChildren.length){
					nextChildIndex = 0;
				}else if(nextChildIndex < 0){
					nextChildIndex = this._focusableChildren.length - 1;
				}
				return this._focusableChildren[nextChildIndex];
			}
		},

		_setFocusableChildren: function(nodeNames) {
			var i=0, node, that = this;
			this._focusableChildren = [];
			this._focusedChild = null;
			for(i=0; i < nodeNames.length; i++){
				node = this[nodeNames[i]];
				if(node){
					////////////////////
					// FIXME: WILL THE NEXT VERSION ALLOW TO WORK WITH DOM NODES ???
					// Create a widget so that it can be focused using _KeyNavMixin
					////////////////////
					this._focusableChildren.push(new _WidgetBase({focus: function(){that._focusedChild = this; this.domNode.focus();}}, node));
				}
			}
		}

	});
});