define(["dojo/_base/declare",
        "dojo/string",
        "dojo/dom-class",
        "dui/_WidgetBase",
        "dui/_TemplatedMixin"
], function(declare, string, domClass, _WidgetBase, _TemplatedMixin){
	
	return declare([_WidgetBase, _TemplatedMixin], {

		templateString: '<li data-dojo-attach-point="labelNode"></li>',

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
		
		// The base class of the list
		listBaseClass: null,
		_setListBaseClass: function(value){
			this._set('listBaseClass', value);
			this._updateRendering();
		},

		_updateRendering: function(){
			var label = this.loading ? 'Loading ${pageLength} more entries...' : 'Click to load ${pageLength} more entries';
			label = string.substitute(label, this);
			this.labelNode.innerHTML = label;
			if(this.loading){
				domClass.add(this.domNode, this.listBaseClass + 'LoaderCellLoading');
				domClass.remove(this.domNode, this.listBaseClass + 'LoaderCell');
			}else{
				domClass.add(this.domNode, this.listBaseClass + 'LoaderCell');
				domClass.remove(this.domNode, this.listBaseClass + 'LoaderCellLoading');
			}
		}
	});
});