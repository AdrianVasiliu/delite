define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/string",
        "dojo/when",
        "dojo/on",
        "dojo/dom-construct",
        "dojo/dom-class",
        "dui/_WidgetBase",
], function(declare, lang, string, when, on, domConstruct, domClass, _WidgetBase){

	return declare(null , {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		store: null,

		query: null,

		queryOptions: null,

		pageLength: 0, // if > 0 define paging with the number of entries to display per page.

		pageLoadingMessage: 'Loading ${pageLength} more entries...',

		pageToLoadMessage: 'Click to load ${pageLength} more entries',

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_loaderNodeClickHandlerRef: null,
		_hasNextPage: false,
		_queryOptions: null,
		_loadingPage: false,
		_isLoaderNodeDisplayed: false,

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		destroy: function(){
			this.inherited(arguments);
			this._destroyPageLoader();
		},

		/////////////////////////////////
		// Public methods from List
		/////////////////////////////////

		deleteEntry: function(entryIndex, deleteFromStore){
			this.inherited(arguments);
			if(deleteFromStore){
				/////////////////////////////////////////////////
				// TODO: REMOVE FROM STORE (NEED THE ENTRY ID)
				/////////////////////////////////////////////////
				console.log("TODO: remove entry from store");
			}
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_renderEntries: function(){
			this._load(this.getInherited(arguments)); // FIXME: DOES IT WORK ???
		},

		_load: function(/*Function*/onDataReadyHandler){
			if(!this._queryOptions){
				this._queryOptions = this.queryOptions ? lang.clone(this.queryOptions) : {};
				if(this.pageLength > 0){
					this._queryOptions.start = (this.queryOptions && this.queryOptions.start ? this.queryOptions.start : 0);
					this._queryOptions.count = this.pageLength;
				}
			}
			if(this._hasNextPage){
				this._queryOptions.start += this.pageLength;
			}
			when(this.store.query(this.query, this._queryOptions), lang.hitch(this, function(result){
				this._hasNextPage = (result.length == this._queryOptions.count);
				if(this.entries){
					this.entries = this.entries.concat(result);
				}else{
					this.entries = result;
				}
				lang.hitch(this, onDataReadyHandler)();
			}), function(error){
				// WHAT TO DO WITH THE ERROR ?
				console.log(error);
			});
		},

		_onNextPageReady: function(){
			var loaderNode = this._getLoaderNode();
			var focusedCell = this._getFocusedCell();
			var loaderNodeHasFocus = loaderNode && focusedCell && loaderNode === focusedCell.domNode;
			if(loaderNodeHasFocus){
				this._focusNextChild(-1);
			}
			if(this._isScrollable && this.cellPages > 0){
				this._recycleCells(false);
			}else{
				this._createCells();
			}
			if(loaderNode){
				if(this._hasNextPage){
					if(loaderNodeHasFocus){
						this._focusNextChild(1);
					}
					this._renderPageLoader(false);
				}else{
					this._destroyPageLoader();
					this.defer(this._endScroll, 10); // defer (10ms because 0 doesn't work on IE) so that any browser scroll event is taken into account before _endScroll
				}
			}
			this._loadingPage = false;
		},

		_getNextCellNode: function(cellNode){
			var value = this.inherited(arguments);
			return value === this._getLoaderNode() ? null : value;
		},

		/////////////////////////////////
		// Private methods for cell life cycle
		/////////////////////////////////

		_createCells: function(){
			this.inherited(arguments);
			var loaderNode = this._getLoaderNode();
			if(loaderNode){
				// move it to the end of the list
				domConstruct.place(loaderNode, this.containerNode);
			}if(this._hasNextPage){
				loaderNode = this._renderPageLoader(false);
				domConstruct.place(loaderNode, this.containerNode);
				this._isLoaderNodeDisplayed = true;
				// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
				this._cellsHeight += this._getNodeHeight(loaderNode);
				////////////////////////////////////////////////////
				// TODO: Move this handler in the Renderer itself ?
				////////////////////////////////////////////////////
				this._loaderNodeClickHandlerRef = this.own(on(loaderNode, 'click', lang.hitch(this, '_onLoaderNodeClick')))[0];
			}
		},

		_renderPageLoader: function(loading){
			var loaderNode = this._getLoaderNode();
			var message = string.substitute(loading ? this.pageLoadingMessage : this.pageToLoadMessage, this);
			if(!loaderNode){
				loaderNode = domConstruct.create("div", {tabindex: "-1"});
				////////////////////
				// FIXME: WILL THE NEXT VERSION ALLOW TO WORK WITH DOM NODES ???
				// Create a widget so that it can be focused using _KeyNavMixin
				////////////////////
				new _WidgetBase({focus: function(){this.domNode.focus();}}, loaderNode);
			}
			loaderNode.innerHTML = message;
			if(loading){
				domClass.remove(loaderNode, this.baseClass + '-loaderNode');
				domClass.add(loaderNode, this.baseClass + '-loaderNodeLoading');
			}else{
				domClass.remove(loaderNode, this.baseClass + '-loaderNodeLoading');
				domClass.add(loaderNode, this.baseClass + '-loaderNode');
			}
			return loaderNode;
		},

		_destroyPageLoader: function(){
			var loaderNode = this._getLoaderNode();
			if(loaderNode){
				////////////////////////////
				// FIXME: IF WE CREATE A WIDGET TO WRAP THE NODE, WE NEED TO DESTROY IT !!!
				////////////////////////////
				this._loaderNodeClickHandlerRef.remove();
				this._loaderNodeClickHandlerRef = null;
				this._cellsHeight -= this._getNodeHeight(loaderNode);
				this.containerNode.removeChild(loaderNode);
				this._isLoaderNodeDisplayed = false;
			}
		},

		_getLoaderNode: function(){
			if(this._isLoaderNodeDisplayed){
				var children = this.containerNode.children;
				return children[children.length - 1];
			}else{
				return null;
			}
		},

		_onLoaderNodeClick: function(event){
			if(this._getLoaderNode){
				if(this._dy || this._loadingPage){
					return;
				}
				this._loadingPage = true;
				this._renderPageLoader(true);
				this._load(this._onNextPageReady);
			}
		},

		_onActionKeydown: function(event){
			if(this._hasNextPage && domClass.contains(event.target, this.baseClass + '-loaderNode')){
				event.preventDefault();
				this._onLoaderNodeClick(event);
			}else{
				this.inherited(arguments);
			}
		}
	});
});