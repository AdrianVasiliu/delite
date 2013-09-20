define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/_base/array",
        "dojo/when",
    	"dojo/_base/window",
        "dojo/sniff",
        "dojo/dom",
        "dojo/dom-construct",
        "dojo/dom-geometry",
        "dojo/dom-class",
        "dojo/dom-style",
        "dojo/touch",
        "dojo/on",
        "dojo/keys",
        "../_css3",
        "dui/registry",
        "dui/_WidgetBase",
        "dui/_Container",
        "dui/mixins/Selection",
        "./DefaultEntryRenderer2",
        "./DefaultCategoryRenderer2",
        "./DefaultPageLoaderRenderer2"
], function(declare, lang, array, when, win, has, dom, domConstruct, domGeometry, domClass, domStyle, touch, on, keys, css3, registry, _WidgetBase, _Container, Selection, DefaultEntryRenderer2, DefaultCategoryRenderer2, DefaultPageLoaderRenderer2){
	
	return declare([_WidgetBase, _Container, Selection], {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		entriesRenderer: DefaultEntryRenderer2,

		categoriesRenderer: DefaultCategoryRenderer2, // renders the category headers when the list entries are categorized. The default one is defined in the postMixInProperties method.

		pageLoaderRenderer: DefaultPageLoaderRenderer2, // when pageLength > 0, use this renderer to render the content of the cell that can be clicked to load one more page of entries.

		entries: [], // list entries to display. Can be an array or an object that define a store, a query and -optional- query options (ex: {store: myStore, query: 'my query', options: {sort: [{attribute: 'label', descending: true}]}}).

		categoryAttribute: null, // define the list entry attribute that define the category of a list entry. If null, the list is not categorized.

		pageLength: 0, // if > 0 define paging with the number of entries to display per page.

		height: 0, // the height of the list widget, in pixel

		// TODO: FIND A BETTER NAME ? (SEEMS RELATED TO PAGELENGTH WHILE IT'S NOT !!!!)
		cellPages: 2, // The number of pages of cells to use (one page fills the viewport of the widget). If <= 0, all the list entries are rendered as once.

		animateScrollFps: 25,

		baseClass: 'duiRoundRectList2',

		selectionMode: 'none',

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_entries: null, // array that contains the entries (resolved if entries are retrieved from a store that returns a promise...)
		_translation: 0, // current translation of the list on the y axis
		_visibleHeight: null, // the height of the list viewport, set by the resize method
		_spacerHeight: 0, // the height of the spacer element on top of the list
		_cellsHeight: 0, // the total height of the cells
		_nextCellIndex: 0, // the _createCells method use this to retrieve the index of the next cell to create
		_firstEntryIndex: 0, // index of the entry in the first cell
		_lastEntryIndex: null, // index of the entry in the last cell
		_browserScroll: 0, // the browser modify the scrollTop of the domNode when navigating the list using a keyboard. The current browser scroll on the y axis is stored there.
		_touchHandlersRefs: null,
		_loaderCellClickHandlerRef: null,
		_lastPressStopedAnimation: false,
		_lastYTouch: null,
		_lastMoveTimeStamp: null,
		_dy: null,
		_dt: null,
		_focusedNode: null,
		_currentPage: 0,
		_hasNextPage: false,
		_queryOptions: null,
		_loadingPage: false,
		_renderedEntriesPool: null,
		_renderedCategoriesPool: null,
		_isLoaderCellDisplayed: false,
		_hiddenCellsOnTop: 0,
		_cellEntryIndexes: null,
		_cellCategoryHeaders: null,

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		postMixInProperties: function(){
			this.inherited(arguments);
			this._touchHandlersRefs = [];
			this._renderedEntriesPool = [];
			this._renderedCategoriesPool = [];
			this._cellEntryIndexes = {};
			this._cellCategoryHeaders = {};
		},

		buildRendering: function(){
			var node;
			this.inherited(arguments);
			// Create a scrollable container for the list node
			if(this.domNode.parentNode){
				this.domNode = domConstruct.create('div', {className: this.baseClass + 'Container', tabindex: '0'}, this.domNode, 'replace');
			}else{
				this.domNode = domConstruct.create('div', {className: this.baseClass + 'Container', tabindex: '0'});
			}
			if(this.height){
				this.domNode.style.height = this.height + 'px';
			}else{
				// TODO: what is the default height ?
			}
			// Create the main list node
			this.containerNode = domConstruct.create('ol', {className: this.baseClass, tabindex: '-1'}, this.domNode);
			// Create the spacer node, as the first child of the list. We resize it dynamically when moving list cells
			// in the _recycleCells method, so that we do not have a flickering on iOS (if scrolling on iOS to
			// compensate the fact that nodes are moved in the list, there is flickering).
			domConstruct.create('li', {style: 'height: 0px'}, this.containerNode);
			if(this.srcNodeRef){
				// reparent
				for(var i = 0, len = this.srcNodeRef.childNodes.length; i < len; i++){
					node = this.srcNodeRef.firstChild;
					// make sure tabIndex is -1 for keyboard navigation
					node.tabIndex = -1;
					this.containerNode.appendChild(node);
					// TODO: IGNORE this.entries attribute in startup if entries are added using markup
				}
			}
			// listen to click events to cancel clicks at the end of a scroll on desktop
			if(!has('touch')){
				this.on('click', lang.hitch(this, '_onClick'));
			};
		},

		startup: function(){
			this.inherited(arguments);
			this.resize();
			this._toggleListLoadingStyle();
			if(this.entries instanceof Array){
				this._entries = this.entries;
				this._onFirstPageReady();
			}else{
				this._loadEntriesFromStore(this._onFirstPageReady);
			}
		},

		resize: function(){
			// calculate the dimensions of the container
			this._visibleHeight = this._getNodeHeight(this.domNode);
		},
		
		destroy: function(){
			var widget;
			this.inherited(arguments);
			this._destroyPageLoader();
			while(this._renderedEntriesPool.length){
				widget = this._renderedEntriesPool.pop();
				if(widget){
					widget.destroyRecursive();
				}
			}
			while(this._renderedCategoriesPool.length){
				widget = this._renderedCategoriesPool.pop();
				if(widget){
					widget.destroyRecursive();
				}
			}
			if(this._renderedPageLoader){
				this._renderedPageLoader.destroyRecursive();
			}
		},

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		scrollBy: function(y, animate, animOptions){
			this._scrollBy(y, animate, animOptions);
			this._recycleCells(y > 0);
		},

		onCellEvent: function(event, handler){
			var that = this;
			return this.on(event, function(e){
				if(domClass.contains(e.target, this.baseClass) || domClass.contains(e.target, this.baseClass + 'Container')){
					return;
				}else{
					return handler(e, that._getCellEntryIndex(that._getParentCell(e.target)));
				}
			});
		},

		renderingUpdated: function(){ // Notify the list widget that cells rendering has been updated.
			this._cellsHeight = this._getNodeHeight(this.containerNode) - this._spacerHeight;
		},

		/////////////////////////////////
		// Selection implementation
		/////////////////////////////////

		getIdentity: function(item){
			return item;
		},

		updateRenderers: function(entryIndexes){
			var entryIndex, node;
			if(this.selectionMode !== 'none'){
				for(var i=0; i < entryIndexes.length; i++){
					entryIndex = entryIndexes[i];
					node = this._getCellNodeByEntryIndex(entryIndex);
					if(node){
						this._setSelectionStyle(node, entryIndex);
					}
				}
			}
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_loadEntriesFromStore: function(/*Function*/onDataReadyHandler){
			if(!this._queryOptions){
				this._queryOptions = this.entries.options ? lang.clone(this.entries.options) : {};
				if(this.pageLength > 0){
					this._queryOptions.start = (this.entries.options && this.entries.options.start ? this.entries.options.start : 0);
					this._queryOptions.count = this.pageLength;
				}
			}
			if(this._hasNextPage){
				this._queryOptions.start += this.pageLength;
			}
			when(this.entries.store.query(this.entries.query, this._queryOptions), lang.hitch(this, function(result){
				this._hasNextPage = (result.length == this._queryOptions.count);
				if(this._entries){
					this._entries = this._entries.concat(result);
				}else{
					this._entries = result;
				}
				lang.hitch(this, onDataReadyHandler)();
			}), function(error){
				// WHAT TO DO WITH THE ERROR ?
				console.log(error);
			});
		},

		_onFirstPageReady: function(){
			this._createCells();
			this._toggleListLoadingStyle();
			this._registerEventHandlers();
		},

		_onNextPageReady: function(){
			var loaderCell = this._getLoaderCell();
			var loaderCellHasFocus = loaderCell && loaderCell.domNode === this._focusedNode;
			if(loaderCellHasFocus){
				this._focusNextNode(false);
			}
			if(this.cellPages > 0){
				this._recycleCells(false);
			}else{
				this._createCells();
			}
			if(loaderCell){
				if(this._hasNextPage){
					if(loaderCellHasFocus){
						this._focusNextNode(true);
					}
					this._renderPageLoader(false);
				}else{
					this._destroyPageLoader();
					this.defer(this._endScroll, 10); // defer (10ms because 0 doesn't work on IE) so that any browser scroll event is taken into account before _endScroll
				}
			}
			this._loadingPage = false;
		},

		_toggleListLoadingStyle: function(){
			domClass.toggle(this.domNode, this.baseClass + 'Loading');
		},

		_getEntriesCount: function(){
			return this._entries.length;
		},

		_getEntry: function(index){
			return this._entries[index];
		},

		_getCellHeight: function(cell){
			// TODO: CACHE CELL HEIGHT
			return this._getNodeHeight(cell.domNode);
		},

		_getNodeHeight: function(node){
			var rect = node.getBoundingClientRect();
			return (rect.bottom - rect.top);
		},

		/////////////////////////////////
		// Private methods for cell life cycle
		/////////////////////////////////

		_createCells: function(){
			var entryIndex = this._lastEntryIndex != null ? this._lastEntryIndex + 1 : 0;
			var currentEntry;
			var lastCategory = this.categoryAttribute && this._lastEntryIndex ? this._getEntry(this._lastEntryIndex - 1)[this.categoryAttribute] : null;
			var loaderCell = this._getLoaderCell();
			// Create cells using renderers
			for (entryIndex; entryIndex < this._getEntriesCount(); entryIndex++){
				if((this.cellPages > 0) && (this._cellsHeight > (this.cellPages * this._visibleHeight))){
					break;
				}
				currentEntry = this._getEntry(entryIndex);
				if(this.categoryAttribute && currentEntry[this.categoryAttribute] != lastCategory){
					// create a category header
					lastCategory = currentEntry[this.categoryAttribute];
					// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
					this._renderCategory(currentEntry[this.categoryAttribute], 'bottom');
				}
				// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
				this._renderEntry(currentEntry, entryIndex, 'bottom');
				this._lastEntryIndex = entryIndex;
			}
			if(loaderCell){
				// move it to the end of the list
				domConstruct.place(loaderCell.domNode, this.containerNode);
			}else{
				if(this._hasNextPage){
					loaderCell = this._renderPageLoader(false);
					this.addChild(loaderCell);
					this._isLoaderCellDisplayed = true;
					// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
					this._cellsHeight += this._getCellHeight(loaderCell);
					////////////////////////////////////////////////////
					// TODO: Move this handler in the Renderer itself ?
					////////////////////////////////////////////////////
					this._loaderCellClickHandlerRef = this.own(on(loaderCell, 'click', lang.hitch(this, '_onLoaderCellClick')))[0];
				}
			}
		},

		_recycleCells: function(fromBottomToTop){
			// TODO: the height calculations may cause bad performances on slower devices ?
			// FIXME: THE FOLLOWING IS A HACK: IT APPEARS THAT THE VALUE CALCULATED FOR this._cellsHeight when creating the cells is not always ok (see example List3 in the test page)
			this._cellsHeight = this._getNodeHeight(this.containerNode) - this._spacerHeight;
			if(fromBottomToTop){
				while(!this._centerOfListAboveCenterOfViewport()){
					if(this._firstEntryIndex > 0){
						// move the bottom cell to a pool
						this._moveBottomCellToPool();
						// move the bottom cell to the top while updating its content
						if(this.categoryAttribute && (this._getEntry(this._firstEntryIndex - 1)[this.categoryAttribute] != this._getEntry(this._firstEntryIndex)[this.categoryAttribute]) && !this._nodeRendersCategoryHeader(this._getFirstCellNode())){
							// render a category header at the top
							this._renderCategory(this._getEntry(this._firstEntryIndex)[this.categoryAttribute], 'top');
							// move the new bottom cell to the pool
							this._moveBottomCellToPool();
						}
						// render the new entry at the top
						--this._firstEntryIndex;
						this._renderEntry(this._getEntry(this._firstEntryIndex), this._firstEntryIndex, 'top');
					}else{
						if(this.categoryAttribute && this._firstEntryIndex == 0 && !this._nodeRendersCategoryHeader(this._getFirstCellNode())){
							// move the bottom cell to a pool
							this._moveBottomCellToPool();
							// render a category header at the top
							this._renderCategory(this._getEntry(this._firstEntryIndex)[this.categoryAttribute], 'top');
						}
						break;
					}
				}
			}else{ // from top to bottom
				while(this._centerOfListAboveCenterOfViewport()){
					if(this._lastEntryIndex < this._getEntriesCount() - 1){
						// move the top cell to a pool
						this._moveTopCellToPool();
						if(this.categoryAttribute && (this._getEntry(this._lastEntryIndex + 1)[this.categoryAttribute] != this._getEntry(this._lastEntryIndex)[this.categoryAttribute]) && !this._nodeRendersCategoryHeader(this._getLastCellNode())){
							// render a category header at the bottom
							this._renderCategory(this._getEntry(this._lastEntryIndex + 1)[this.categoryAttribute], 'bottom');
							// move the new top cell to the pool
							this._moveTopCellToPool();
						}
						// render the new entry at the bottom
						++this._lastEntryIndex;
						this._renderEntry(this._getEntry(this._lastEntryIndex), this._lastEntryIndex, 'bottom');
					}else{
						break;
					}
				}
			}
		},

		_moveTopCellToPool: function(){
			var topCellNode = this._getFirstCellNode();
			var topCell = registry.byNode(topCellNode);
			var topCellIsCategoryHeader = this._nodeRendersCategoryHeader(topCell.domNode);
			var removedHeight = this._getCellHeight(topCell);
			// update spacer height with the height of the cell and hide the cell
			this._updateSpacerHeight(removedHeight);
			domStyle.set(topCell.domNode, 'display', 'none');
			this._cellsHeight -= removedHeight;
			this._hiddenCellsOnTop += 1;
			if(topCellIsCategoryHeader){
				this._renderedCategoriesPool.push(topCell);
			}else{
				this._renderedEntriesPool.push(topCell);
				this._firstEntryIndex++;
			}
		},

		_moveBottomCellToPool: function(){
			var bottomCellNode = this._getLastCellNode();
			var bottomCell = registry.byNode(bottomCellNode);
			var removedHeight = this._getCellHeight(bottomCell);
			var bottomCellIsCategoryHeader = this._nodeRendersCategoryHeader(bottomCellNode);
			domStyle.set(bottomCellNode, 'display', 'none');
			this._cellsHeight -= removedHeight;
			domConstruct.place(bottomCellNode, this.containerNode, 1);
			this._hiddenCellsOnTop += 1;
			if(bottomCellIsCategoryHeader){
				this._renderedCategoriesPool.push(bottomCell);
			}else{
				this._renderedEntriesPool.push(bottomCell);
				this._lastEntryIndex--;
			}
		},

		_updateSpacerHeight: function(addedValue){
			if(!addedValue){
				return;
			}else{
				this._spacerHeight += addedValue;
			}
			if(this._spacerHeight < 0){ // make sure the height is not negative otherwise it may be ignored
				this._spacerHeight = 0;
			}
			this._getSpacerNode().style.height = this._spacerHeight + 'px';
		},

		_renderEntry: function(entry, entryIndex, pos){
			var addedHeight, fromCache = false;
			var renderedEntry = this._renderedEntriesPool.shift();
			if(renderedEntry){
				fromCache = true;
				renderedEntry._setEntryIndexAttr(entryIndex);
				renderedEntry._setEntryAttr(entry);
//				renderedEntry.set('entryIndex', entryIndex);
//				renderedEntry.set('entry', entry);
			}else{
				renderedEntry = new this.entriesRenderer({entry: entry, entryIndex: entryIndex, tabindex: "-1"});
			}
			//////////////////////////////////
			// TODO: UPDATE OR REMOVE THIS ? (NOTIFY RENDERER OF ITS SELECTION STATUS ?)
			//////////////////////////////////
			this._setSelectionStyle(renderedEntry.domNode, entryIndex);
			this._setCellEntryIndex(renderedEntry, entryIndex);
			this._setCellCategoryHeader(renderedEntry, null);
			if(fromCache){
				this._hiddenCellsOnTop -= 1;
				// move the node to the bottom before displaying it and getting its height, to avoid flickering
				this._placeCellNode(renderedEntry.domNode, 'bottom');
				domStyle.set(renderedEntry.domNode, 'display', '');
				addedHeight = this._getCellHeight(renderedEntry);
			}
			this._placeCellNode(renderedEntry.domNode, pos);
			if(!fromCache){
				addedHeight = this._getCellHeight(renderedEntry);
			}
			this._cellsHeight += addedHeight;
			if(pos == 'top'){
				this._updateSpacerHeight(-addedHeight);
			}
		},

		_setSelectionStyle: function(cellNode, entryIndex){
			if(this.selectionMode !== 'none'){
				if (this.isItemSelected(entryIndex)){
					domClass.add(cellNode, 'duiListSelectedCell');
				}else{
					domClass.remove(cellNode, 'duiListSelectedCell');
				}
			}
		},

		_renderCategory: function(category, pos){
			var addedHeight, fromCache = false;
			var renderedCategory = this._renderedCategoriesPool.shift();
			if(renderedCategory){
				fromCache = true;
				renderedCategory._setCategoryAttr(category);
//				renderedCategory.set('category', category);
			}else{
				renderedCategory = new this.categoriesRenderer({category: category, tabindex: "-1"});
			}
			this._setCellEntryIndex(renderedCategory, null);
			this._setCellCategoryHeader(renderedCategory, category);
			if(fromCache){
				this._hiddenCellsOnTop -= 1;
				// move the node to the bottom before displaying it and getting its height, to avoid flickering
				this._placeCellNode(renderedCategory.domNode, 'bottom');
				domStyle.set(renderedCategory.domNode, 'display', '');
				addedHeight = this._getCellHeight(renderedCategory);
			}
			this._placeCellNode(renderedCategory.domNode, pos);
			if(!fromCache){
				addedHeight = this._getCellHeight(renderedCategory);
			}
			this._cellsHeight += addedHeight;
			if(pos == 'top'){
				this._updateSpacerHeight(-addedHeight);
			}
		},

		_renderPageLoader: function(loading){
			var loaderCell = this._getLoaderCell();
			if(loaderCell){
				loaderCell.set('loading', loading);
			}else{
				loaderCell = new this.pageLoaderRenderer({loading: loading, pageLength: this.pageLength, tabindex: "-1"});
			}
			return loaderCell;
		},

		_destroyPageLoader: function(){
			var loaderCell = this._getLoaderCell();
			if(loaderCell){
				this._loaderCellClickHandlerRef.remove();
				this._loaderCellClickHandlerRef = null;
				this._cellsHeight -= this._getCellHeight(loaderCell);
				this.removeChild(loaderCell);
				loaderCell.destroyRecursive();
				this._isLoaderCellDisplayed = false;
			}
		},

		_placeCellNode: function(node, pos){
			var position, listLength;
			if(pos === 'bottom'){
				listLength = this.containerNode.children.length;
				position = this._isLoaderCellDisplayed ? listLength - 1 : listLength;
			}else if(pos === 'top'){
				position = 1 + this._hiddenCellsOnTop;
			}else{
				// TODO: THROW EXCEPTION ?
			}
			domConstruct.place(node, this.containerNode, position);
		},

		_getSpacerNode: function(){
			return this.containerNode.children[0];
		},

		_getFirstCellNode: function(){
			return this.containerNode.children[1 + this._hiddenCellsOnTop];
		},

		_getLastCellNode: function(){
			var children = this.containerNode.children;
			if(this._hasNextPage){
				return children[children.length - 2];
			}else{
				return children[children.length - 1];
			}
		},

		_getLoaderCell: function(){
			var children = this.getChildren();
			if(this._isLoaderCellDisplayed){
				return children[children.length - 1];
			}else{
				return null;
			}
		},

		_getCellNodeByEntryIndex: function(entryIndex){
			var node = null;
			if(entryIndex >= this._firstEntryIndex && entryIndex <= this._lastEntryIndex){
				for(var id in this._cellEntryIndexes){
					if(this._cellEntryIndexes[id] == entryIndex){
						node = dom.byId(id);
						break;
					}
				}
			}
			return node;
		},

		_getCellEntryIndex: function(cell){
			return this._cellEntryIndexes[cell.id];
		},

		_setCellEntryIndex: function(cell, entryIndex){
			if(entryIndex == null){
				delete this._cellEntryIndexes[cell.id];
			}else{
				this._cellEntryIndexes[cell.id] = entryIndex;
			}
		},

		_getNodeCategoryHeader: function(node){
			return this._cellCategoryHeaders[node.id];
		},

		_setCellCategoryHeader: function(cell, categoryName){
			if(categoryName == null){
				delete this._cellCategoryHeaders[cell.id];
			}else{
				this._cellCategoryHeaders[cell.id] = categoryName;
			}
		},

		_getParentCell: function(node){
			var currentNode = dom.byId(node);
			while(currentNode && !domClass.contains(currentNode, 'duiListCell')){
				currentNode = currentNode.parentNode;
			}
			return registry.byNode(currentNode);
		},

		_topOfNodeIsBelowTopOfViewport: function(node){
			return this._topOfNodeDistanceToTopOfViewport(node) >= 0;
		},

		_topOfNodeDistanceToTopOfViewport: function(node){
			return node.offsetTop + this._translation - this._browserScroll;
		},

		_bottomOfNodeDistanceToBottomOfViewport: function(node){
			return node.offsetTop + node.offsetHeight + this._translation - this._browserScroll - this._visibleHeight;
		},

		_centerOfListAboveCenterOfViewport: function(){
			return (this._visibleHeight / 2) - this._getApparentScroll() > (this._cellsHeight / 2);
		},

		_nodeRendersCategoryHeader: function(node){
			return (this._getNodeCategoryHeader(node) != null);
		},

		/////////////////////////////////
		// Private scroll methods
		/////////////////////////////////

		_scrollBy: function(y, animate, animOptions){
			if(animate){
				var animDuration = '0.3s';
				var animTimingFunc = 'ease-out';
				if(animOptions){
					animDuration=animOptions.duration?animOptions.duration:animDuration;
					animTimingFunc=animOptions.timingFunc?animOptions.timingFunc:animTimingFunc;
				}
				// TODO: OPTIMIZE BY GETTING THE NAMES OF THE CSS PROPERTIES ONLY ONCE WHEN WE CREATE THE WIDGET ?
				this.containerNode.style[css3.name('transition', false)] = css3.name('transform', true) + ' ' + animDuration + ' ' + animTimingFunc;
			}
			this._translation += y;
			this.containerNode.style[css3.name('transform', false)] = 'translate3d(0,' + this._translation + 'px,0)';
			if(animate){
				this.defer(function(){
					// defer setting back the transition property to no value, or the temporary change of the property
					// is ignored and a transition is performed
					this.containerNode.style[css3.name('transition', false)] = '';
				}, 300); // TODO: depends on the animation duration ?
			}
		},

		_endScroll: function(velocity){
			if(this._getApparentScroll() > 0 && this._firstEntryIndex == 0){
				this._scrollBy(-(this._getApparentScroll()), true);
			}else if(this._visibleHeight - this._cellsHeight > this._getApparentScroll()){
				this._scrollBy((this._visibleHeight - this._cellsHeight - this._getApparentScroll()), true);
			}else if(velocity){
//				if(this.cellPages > 0){
					this._animateScroll(this.animateScrollFps, 0.9, velocity*200);
//				}else{
					// TODO: find the correct animation for end of scroll... (see scrollable.js)
//					this._scrollBy(velocity*110, true, {duration: '1s'});
//				}
				this._endScroll();
			}
		},

		_animateScroll: function(fps, duration, length){
			var nbOfFrames = fps * duration;
			var lengthPerFrame = Math.round(length / nbOfFrames);
			var frameDuration = 1 / fps;
			var that = this;
			this._stopAnimatedScroll();
			this._currentAnimatedScroll = setInterval(function(){
				if(nbOfFrames-- <= 0){
					that._stopAnimatedScroll();
					that._endScroll();
				}else{
					that.scrollBy(lengthPerFrame, false);
				}
			}, frameDuration * 1000);
		},

		_stopAnimatedScroll: function(){
			// TODO: WHAT IF ANIMATION USING _scrollBy ?
			if(this._currentAnimatedScroll){
				clearInterval(this._currentAnimatedScroll);
				this._currentAnimatedScroll = null;
				return true;
			}else{
				return false;
			}
		},

		_getApparentScroll: function(){
			return this._translation + this._spacerHeight - this._browserScroll;
		},

		/////////////////////////////////
		// Event handlers
		/////////////////////////////////

		_registerEventHandlers: function(){
			// Note that on non touch device, there is also a handler registered
			// for click events. This is done in the buildRendering method, to make sure that
			// this handler (that performs stopImmediatePropagation) is the first of its kind
			// registered.
			// listen to mousewheel events
			if(win.doc.onmousewheel !== undefined){
				this.on('mousewheel', lang.hitch(this, '_onMouseWheel'));
			}
			// listen to drag events
			this.on(touch.press, lang.hitch(this, '_onTouchPress'));
			// listen to scroll initiated by the browser (when the user navigates the list using the TAB key)
			this.on('scroll', lang.hitch(this, '_onBrowserScroll'));
			// listen to keypress events to allow keyboard navigation in the list
			this.on('keydown', lang.hitch(this, '_onKeyDown'));
			this.on('focus', lang.hitch(this, '_onFocus'));
		},

		_onMouseWheel: function(event){
			this._captureEvent(event);
			this.scrollBy(event.wheelDeltaY / 2);
			this._endScroll();
		},

		_onTouchPress: function(event){
			this._captureEvent(event);
			this._touchHandlersRefs.push(this.own(on(win.doc, touch.move, lang.hitch(this, '_onTouchMove')))[0]);
			this._touchHandlersRefs.push(this.own(on(win.doc, touch.cancel, lang.hitch(this, '_onTouchRelease')))[0]);
			this._touchHandlersRefs.push(this.own(on(win.doc, touch.release, lang.hitch(this, '_onTouchRelease')))[0]);
			this._lastYTouch = event.clientY;
			this._lastMoveTimeStamp = event.timeStamp;
			this._dy = 0;
			this._lastPressStopedAnimation = this._stopAnimatedScroll();
		},

		_onTouchMove: function(event){
			var dy = event.clientY - this._lastYTouch;
			if(dy == 0){ // ignore moves on the x axis
				return;
			}
			this._dy = dy;
			this._dt = event.timeStamp - this._lastMoveTimeStamp;
			this._lastMoveTimeStamp = event.timeStamp;
			this._lastYTouch = event.clientY;
			this._captureEvent(event);
			this.scrollBy(this._dy);
		},

		_onTouchRelease: function(event){
			this._captureEvent(event);
			var velocity = this._dt?this._dy / this._dt:0;
			this._endScroll(velocity);
			array.forEach(this._touchHandlersRefs, function(handlerRef){
				handlerRef.remove();
			});
			this._touchHandlersRefs = [];
			if(!this._lastPressStopedAnimation){ // Do not trigger selection when the user touched the screen to stop the current animation
				this._handleSelection(event);
			}
		},

		_handleSelection: function(event){
			var entryIndex, entrySelected, eventCell;
			if(this.selectionMode !== 'none' && !this._dy){
				eventCell = this._getParentCell(event.target);
				entryIndex = this._getCellEntryIndex(eventCell);
				if(entryIndex != null){
					entrySelected = !this.isItemSelected(entryIndex);
					this.setSelected(entryIndex, entrySelected);
					this.emit(entrySelected ? 'entrySelected' : 'entryDeselected', {entryIndex: entryIndex});
				}
			}
		},

		_onBrowserScroll: function(event){
			var oldBrowserScroll = this._browserScroll;
			this._browserScroll = this.domNode.scrollTop;
			this._recycleCells(oldBrowserScroll - this._browserScroll > 0);
		},

		_onClick: function(event){
			if(this._dy && event.stopImmediatePropagation){
				event.stopImmediatePropagation();
			}
		},

		_onLoaderCellClick: function(event){
			if(this._getLoaderCell){
				if(this._dy || this._loadingPage){
					return;
				}
				this._loadingPage = true;
				this._renderPageLoader(true);
				this._loadEntriesFromStore(this._onNextPageReady);
			}
		},

		_onFocus: function(event){
			if(this._focusedNode){
				domClass.remove(this._focusedNode, this.baseClass + 'FocusedCell');
				this._focusedNode = null;
			}
		},

		_onKeyDown: function(event){
			switch (event.keyCode) {
				case keys.UP_ARROW:
					event.preventDefault();
					this._focusNextNode(false);
					break;
				case keys.DOWN_ARROW:
					event.preventDefault();
					this._focusNextNode(true);
					break;
				case keys.ENTER:
				case keys.SPACE:
					if(this._hasNextPage && domClass.contains(event.target, this.baseClass + 'LoaderCell')){
						event.preventDefault();
						this._onLoaderCellClick(event);
					}else if(this.selectionMode !== 'none'){
						event.preventDefault();
						this._handleSelection(event);
					}
					break;
			};
		},

		_focusNextNode: function(down){
			var node;
			var distanceToEdgeOfViewport;
			if(this._focusedNode){
				node = down?this._focusedNode.nextElementSibling:this._focusedNode.previousElementSibling;
				if(node != null && (down || node.previousElementSibling != null)){ // do not set focus on the spacer cell
					///////////////////////////////////////////////
					// TODO: THIS SHOULD BE DONE IN THE RENDERED WIDGET
					///////////////////////////////////////////////
					domClass.remove(this._focusedNode, this.baseClass + 'FocusedCell');
					this._focusedNode = node;
				}else{
					return;
				}
			}else{
				// Focus the first visible cell node
				node = this._getFirstCellNode();
				while(node){
					if(this._topOfNodeIsBelowTopOfViewport(node)){
						this._focusedNode = node;
						break;
					}
					node = node.nextElementSibling;
				}
			}
			this._focusedNode.focus();
			domClass.add(this._focusedNode, this.baseClass + 'FocusedCell');
			this.domNode.setAttribute('aria-activedescendant', this._focusedNode.id);
			this.defer(function(){
				// scroll has been updated: verify that the focused cell is visible, if not scroll to make it appear
				if(this._browserScroll == 0){
					// the browser won't scroll with negative values: if the focused cell is not entirely visible,
					// scroll it to make it visible.
					distanceToEdgeOfViewport = this._topOfNodeDistanceToTopOfViewport(node);
					if(distanceToEdgeOfViewport < 0){
						this.scrollBy(-distanceToEdgeOfViewport);
					}
				}else{
					distanceToEdgeOfViewport = this._bottomOfNodeDistanceToBottomOfViewport(node);
					if(distanceToEdgeOfViewport > 0){
						this.scrollBy(-distanceToEdgeOfViewport);
					}
				}
			}, 10);
		},

		_captureEvent: function(event){
			event.preventDefault();
			event.stopPropagation();
		}

	});
});