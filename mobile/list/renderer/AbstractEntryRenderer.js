define(["dojo/_base/declare",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dui/_WidgetBase"
], function(declare, domClass, domConstruct, _WidgetBase){

	return declare([_WidgetBase], {

		// The index of the entry to render
		entryIndex: null,
		_setEntryIndexAttr: function(value){
			this._set('entryIndex', value);
		},

		// The entry to render
		entry: null,
		_setEntryAttr: function(value){
			this._set('entry', value);
			this.renderEntry(value);
		},

		// TODO: CAN'T BE CHANGED BY THE USER
		baseClass: "duiListCell",
		_setBaseClassAttr: function(value){
			domClass.remove(this.domNode, this.baseClass);
			this._set('baseClass', value);
			domClass.add(this.domNode, this.baseClass);
		},

		_focusableNodes: null,
		_focusedNodeIndex: null,

		buildRendering: function(){
			if(!this.domNode){
				this.domNode = domConstruct.create('li');
			}
			this.inherited(arguments);
		},

		// Method that render the entry in the widget GUI
		renderEntry: function(entry){
			// abstract method
		},

		onFocus: function(){
			// abstract method
			console.log("onFocus " + this.id);
		},

		// Focus the next (forth == true) or previous element (forth == false), and return the id of the element that has the focus
		focusNextElement: function(forth){
			if(this._focusableNodes){
				var maxIndex = this._focusableNodes.length - 1;
				if(this._focusedNodeIndex == null){
					this._focusedNodeIndex = forth ? 0 : maxIndex;
				}else{
					if(forth){
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

		blurCurrentElement: function(){
			this._focusedNodeIndex = null;
		},

		onBlur: function(){
			// abstract method
			console.log("onBlur " + this.id);
		},

		onKeyDown: function(evt){
			// TO BE IMPLEMENTED BY CONCRETE CLASS
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
		}

	});
});