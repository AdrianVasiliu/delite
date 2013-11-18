define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/_base/array",
        "dojo/sniff",
        "dojo/dom-construct",
        "dojo/dom-class",
        "dojo/touch",
        "dojo/on",
        "dui/mobile/_css3"
], function(declare, lang, array, has, domConstruct, domClass, touch, on, css3){

	return declare(null, {
		// summary:
		//		NativeScrollable wraps a Widget inside a scrollable div (viewport). The height of this div is defined by the height parameter
		//		of the NativeScrollable mixin.

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		height: 0, // the height of the scrollable viewport, in pixel

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_isScrollable: true,
		_viewportNode: null,
		_scroll: 0, // current scroll on the y axis
		_visibleHeight: null, // the height of the viewport, set by the resize method

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		scrollBy: function(y){
			this._viewportNode.scrollTop += y;
		},

		onScroll: function(scroll){
			// abstract method
		},

		getCurrentScroll: function () {
			return this._scroll;
		},

		getViewportClientRect: function () {
			return this._viewportNode.getBoundingClientRect();
		},

		/////////////////////////////////
		// Widget methods updated by this mixin
		/////////////////////////////////

		buildRendering: function(){
			this.inherited(arguments);
			// Create a scrollable container and add the widget domNode to it
			this._viewportNode = domConstruct.create('div', {class: 'duiNativeScrollable'});
			if(this.height){
				this._viewportNode.style.height = this.height + 'px';
			}else{
				// TODO: what is the default height ?
			}
			if(this.domNode.parentNode){
				domConstruct.place(this._viewportNode, this.domNode, 'after');
			}
			this._viewportNode.appendChild(this.domNode);
			// listen to scroll initiated by the browser (when the user navigates the list using the TAB key)
			this._viewportNode.addEventListener('scroll', lang.hitch(this, '_nsOnBrowserScroll'), true);
		},

		placeAt: function(){
			// The node to place is this._viewportNode, not this.domNode
			var domNode = this.domNode;
			this.domNode = this._viewportNode;
			this.inherited(arguments);
			this.domNode = domNode;
		},

		startup: function(){
			this.resize();
			this.inherited(arguments);
		},

		resize: function(){
			// calculate the dimensions of the viewport
			var rect = this._viewportNode.getBoundingClientRect();
			this._visibleHeight = rect.bottom - rect.top;
		},

		destroy: function(){
			this.inherited(arguments);
			if(this._viewportNode){
				this._viewportNode.removeEventListener('scroll', lang.hitch(this, '_nsOnBrowserScroll'), true);
				domConstruct.destroy(this._viewportNode);
			};
		},

		/////////////////////////////////
		// Event handlers
		/////////////////////////////////

		_nsOnBrowserScroll: function(event){
			var oldScroll = this._scroll;
			this._scroll = this._viewportNode.scrollTop;
			this.onScroll(oldScroll - this._scroll);
		},

	});
});