define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/string",
        "dojo/when",
        "dojo/on",
        "dojo/dom-construct",
        "dojo/dom-class",
        "dui/_WidgetBase",
], function (declare, lang, string, when, on, domConstruct, domClass, _WidgetBase) {

	return declare(null, {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		store: null,

		query: null,

		queryOptions: null,

		pageLength: 0, // if > 0 define paging with the number of entries to display per page.

		pageLoadingMessage: "Loading ${pageLength} more entries...",

		pageToLoadMessage: "Click to load ${pageLength} more entries",

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_loaderNodeClickHandlerRef: null,
		_hasNextPage: false,
		_queryOptions: null,
		_loaderNode: null,
		_loadingPage: false,

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		destroy: function () {
			this.inherited(arguments);
			this._destroyPageLoader();
		},

		/////////////////////////////////
		// Public methods from List
		/////////////////////////////////

		deleteEntry: function (entryIndex, deleteFromStore) {
			this.inherited(arguments);
			if (deleteFromStore) {
				/////////////////////////////////////////////////
				// TODO: REMOVE FROM STORE (NEED THE ENTRY ID)
				/////////////////////////////////////////////////
				console.log("TODO: remove entry from store");
			}
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_renderEntries: function () {
			this._load(this.getInherited(arguments)); // FIXME: DOES IT WORK ???
		},

		_load: function (/*Function*/onDataReadyHandler) {
			if (!this._queryOptions) {
				this._queryOptions = this.queryOptions ? lang.clone(this.queryOptions) : {};
				if (this.pageLength > 0) {
					this._queryOptions.start = (this.queryOptions && this.queryOptions.start ? this.queryOptions.start : 0);
					this._queryOptions.count = this.pageLength;
				}
			}
			if (this._hasNextPage) {
				this._queryOptions.start += this.pageLength;
			}
			when(this.store.query(this.query, this._queryOptions), lang.hitch(this, function (result) {
				this._hasNextPage = (result.length == this._queryOptions.count);
				if (this.entries) {
					this.entries = this.entries.concat(result);
				} else {
					this.entries = result;
				}
				lang.hitch(this, onDataReadyHandler)();
			}), function (error) {
				// WHAT TO DO WITH THE ERROR ?
				console.log(error);
			});
		},

		_onNextPageReady: function () {
			var focusedCell = this._getFocusedCell();
			var loaderNodeHasFocus = this._loaderNode && focusedCell && this._loaderNode === focusedCell.domNode;
			if (loaderNodeHasFocus) {
				this._focusNextChild(-1);
			}
			if (this._isScrollable && this.cellPages > 0) {
				this._recycleCells(false);
			} else {
				this._appendNewCells();
			}
			if (this._loaderNode) {
				if (this._hasNextPage) {
					if (loaderNodeHasFocus) {
						this._focusNextChild(1);
					}
					this._renderPageLoader(false);
				} else {
					this._destroyPageLoader();
					this.defer(this._endScroll, 10); // defer (10ms because 0 doesn't work on IE) so that any browser scroll event is taken into account before _endScroll
				}
			}
			this._loadingPage = false;
		},

		_getNextCellNode: function (cellNode) {
			var value = this.inherited(arguments);
			return value === this._loaderNode ? null : value;
		},

		/////////////////////////////////
		// Private methods for cell life cycle
		/////////////////////////////////

		_appendNewCells: function () {
			this.inherited(arguments);
			if (this._loaderNode) {
				// move it to the end of the list
				domConstruct.place(this._loaderNode, this.containerNode);
			}if (this._hasNextPage) {
				this._renderPageLoader(false);
				domConstruct.place(this._loaderNode, this.containerNode);
				// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
				this._cellsHeight += this._getNodeHeight(this._loaderNode);
				////////////////////////////////////////////////////
				// TODO: Move this handler in the Renderer itself ?
				////////////////////////////////////////////////////
				this._loaderNodeClickHandlerRef = this.own(on(this._loaderNode, "click", lang.hitch(this, "_onLoaderNodeClick")))[0];
			}
		},

		_placeCellNode: function (node, pos) {
			if (this._loaderNode && pos === "bottom") {
				domConstruct.place(node, this._loaderNode, "before");
			} else {
				this.inherited(arguments);
			}
		},

		_renderPageLoader: function (loading) {
			var message = string.substitute(loading ? this.pageLoadingMessage : this.pageToLoadMessage, this);
			if (!this._loaderNode) {
				this._loaderNode = domConstruct.create("div", {tabindex: "-1"});
				////////////////////
				// FIXME: WILL THE NEXT VERSION ALLOW TO WORK WITH DOM NODES ???
				// Create a widget so that it can be focused using _KeyNavMixin
				////////////////////
				new _WidgetBase({focus: function () {this.domNode.focus();}}, this._loaderNode);
			}
			this._loaderNode.innerHTML = message;
			if (loading) {
				domClass.remove(this._loaderNode, this.baseClass + "-loaderNode");
				domClass.add(this._loaderNode, this.baseClass + "-loaderNodeLoading");
			} else {
				domClass.remove(this._loaderNode, this.baseClass + "-loaderNodeLoading");
				domClass.add(this._loaderNode, this.baseClass + "-loaderNode");
			}
		},

		_destroyPageLoader: function () {
			if (this._loaderNode) {
				////////////////////////////
				// FIXME: IF WE CREATE A WIDGET TO WRAP THE NODE, WE NEED TO DESTROY IT !!!
				////////////////////////////
				this._loaderNodeClickHandlerRef.remove();
				this._loaderNodeClickHandlerRef = null;
				this._cellsHeight -= this._getNodeHeight(this._loaderNode);
				if (this._loaderNode.parentNode) {
					this.containerNode.removeChild(this._loaderNode);
				}
				this._loaderNode = null;
			}
		},

		_onLoaderNodeClick: function (event) {
			if (this._dy || this._loadingPage) {
				return;
			}
			this._loadingPage = true;
			this._renderPageLoader(true);
			this._load(this._onNextPageReady);
		},

		_onActionKeydown: function (event) {
			if (this._hasNextPage && domClass.contains(event.target, this.baseClass + "-loaderNode")) {
				event.preventDefault();
				this._onLoaderNodeClick(event);
			} else {
				this.inherited(arguments);
			}
		}
	});
});