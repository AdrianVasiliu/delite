define(["dojo/_base/declare",
        "dui/registry",
        "dui/_WidgetBase"
], function(declare, registry, _WidgetBase){

	return declare(_WidgetBase, {

		_type: 'ListItem',

		// The label of the listItem
		label: null,
		_setLabelAttr: function(value){
			this._set('label', value);
		},

		startup: function(){
			var parent = this.getParent();
			if(parent){
				parent.addChild(this);
			}
		}

	});
});