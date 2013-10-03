define(["dojo/_base/declare"
], function(declare){

	return declare(null, {

		_focusableNodes: null,
		_focusedNodeIndex: null,

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
			// abstract method
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