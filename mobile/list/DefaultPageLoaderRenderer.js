define(["dojo/_base/declare",
        "dojo/string",
        "dui/_WidgetBase",
        "dui/_TemplatedMixin"
], function(declare, string, _WidgetBase, _TemplatedMixin){
	
	return declare([_WidgetBase, _TemplatedMixin], {

		templateString: '<div data-dojo-attach-point="labelNode"></div>',

		// Is the page currently loading ?
		loading: false,
		_setLoadingAttr: function(value){
			this._set('loading', value);
			this._updateRendering();
		},
		
		// Number of entries per page
		pageLength: null,
		_setPageLengthAttr: function(value){
			this._set('pageLength', value);
			this._updateRendering();
		},
		
		_updateRendering: function(){
			var label = this.loading ? 'Loading ${pageLength} more entries...' : 'Click to load ${pageLength} more entries';
			label = string.substitute(label, this);
			this.labelNode.innerHTML = label;
		}
	});
});