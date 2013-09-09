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
        "dojo/query",
        "dojo/touch",
        "dojo/on",
        "dojo/keys",
        "../_css3",
        "dui/_WidgetBase",
        "dui/mixins/Selection"
], function(declare, lang, array, when, win, has, dom, domConstruct, domGeometry, domClass, query, touch, on, keys, css3, _WidgetBase, Selection){
	
	return declare([_WidgetBase, Selection], {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		entries: [], // list entries to display. Can be an array or an object that define a store, a query and -optional- query options (ex: {store: myStore, query: 'my query', options: {sort: [{attribute: 'label', descending: true}]}}).

		categoryAttribute: null, // define the list entry attribute that define the category of a list entry. If null, the list is not categorized.

		pageLength: 0, // if > 0 define paging with the number of entries to display per page.

		height: 0, // the height of the list widget, in pixel

		// TODO: FIND A BETTER NAME ? (SEEMS RELATED TO PAGELENGTH WHILE IT'S NOT !!!!)
		cellPages: 2, // The number of pages of cells to use (one page fills the viewport of the widget). If <= 0, all the list entries are rendered as once.

		animateScrollFps: 25,

		baseClass: 'mblList',

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
		_selectedEntries: null,
		_browserScroll: 0, // the browser modify the scrollTop of the domNode when navigating the list using a keyboard. The current browser scroll on the y axis is stored there.
		_touchHandlersRefs: null,
		_loaderCellNode: null,
		_loaderCellClickHandlerRef: null,
		_lastPressStopedAnimation: false,
		_lastYTouch: null,
		_lastMoveTimeStamp: null,
		_dy: null,
		_dt: null,
		_focusedCell: null,
		_currentPage: 0,
		_hasNextPage: false,
		_queryOptions: null,
		_loadingPage: false,

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		postMixInProperties: function(){
			this.inherited(arguments);
			this._touchHandlersRefs = [];
		},

		buildRendering: function(){
			var listNode;
			this.inherited(arguments);
			// Create a scrollable container for the list node
			this.domNode = domConstruct.create('div', {className: this.baseClass + 'Container', tabindex: '0'}, this.domNode, 'replace');
			if(this.height){
				this.domNode.style.height = this.height + 'px';
			}else{
				// TODO: what is the default height ?
			}
			// Create the main list node
			listNode = domConstruct.create('ol', {className: this.baseClass, tabindex: '-1'}, this.domNode);
			// Create the spacer node, as the first child of the list. We resize it dynamically when moving list cells
			// in the _recycleCells method, so that we do not have a flickering on iOS (if scrolling on iOS to
			// compensate the fact that nodes are moved in the list, there is flickering).
			domConstruct.create('li', {style: 'height: 0px'}, listNode);
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
			if(this._pageLoader){
				this._destroyPageLoader();
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
			this._cellsHeight = this._getNodeHeight(this._getListNode()) - this._spacerHeight;
		},

//		getSelectedEntries: function(){
//			if(this._selectedEntries){
//				return lang.clone(this._selectedEntries).sort(function(first, second){
//					return first - second;
//				});
//			}else{
//				return null;
//			}
//		},

		/////////////////////////////////
		// Selection implementation
		/////////////////////////////////

		getIdentity: function(item){
			return item;
		},

		updateRenderers: function(entryIndexes){
			var entryIndex, cell;
			if(this.selectionMode !== 'none'){
				for(var i=0; i < entryIndexes.length; i++){
					entryIndex = entryIndexes[i];
					cell = this._getCellByEntryIndex(entryIndex);
					if(cell){
						if(this.isItemSelected(entryIndex)){
							domClass.add(cell, this.baseClass + 'SelectedCell');
						}else{
							domClass.remove(cell, this.baseClass + 'SelectedCell');
						}
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
			var loaderCellHasFocus = loaderCell && loaderCell === this._focusedCell;
			if(loaderCellHasFocus){
				this._focusNextCell(false);
			}
			if(this.cellPages > 0){
				this._recycleCells(false);
			}else{
				this._createCells();
			}
			if(loaderCell){
				if(this._hasNextPage){
					if(loaderCellHasFocus){
						this._focusNextCell(true);
					}
					this._updatePageLoaderStatus(false);
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

		_getListNode: function(){
			return this.domNode.children[0];
		},

		_setNodeData: function(node, key, value){
			var dataset = node.dataset;
			if(dataset){
				if(value == null){
					delete dataset[key];
				}else{
					dataset[key] = value;
				}
			}else{
				if(value == null){
					node.removeAttribute('data-' + key);
				}else{
					node.setAttribute('data-' + key, value);
				}
			}
		},

		_getNodeData: function(node, key){
			var dataset = node.dataset;
			if(dataset){
				return dataset[key];
			}else{
				return node.getAttribute('data-' + key);
			}
		},

		_getCellHeight: function(cell){
			return this._getNodeHeight(cell);
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
			var currentCell;
			var listNode = this._getListNode();
			var lastCategory = null;
			var loaderCell = this._getLoaderCell();
			// Create cells, calling renderers to generate content for the cells
			for (entryIndex; entryIndex < this._getEntriesCount(); entryIndex++){
				if((this.cellPages > 0) && (this._cellsHeight > (this.cellPages * this._visibleHeight))){
					break;
				}
				currentEntry = this._getEntry(entryIndex);
				if(this.categoryAttribute && currentEntry[this.categoryAttribute] != lastCategory){
					// create a category header
					lastCategory = currentEntry[this.categoryAttribute];
					currentCell = domConstruct.create('li', {id: this.domNode.id + '_' + this._nextCellIndex++, className: this.baseClass + 'Cell', tabindex: '-1'}, listNode);
					this._setCellContent(currentCell, this._renderCategory(currentEntry[this.categoryAttribute]));
					this._setCellCategoryHeader(currentCell, currentEntry[this.categoryAttribute]);
					// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
					this._cellsHeight += this._getCellHeight(currentCell);
				}
				currentCell = domConstruct.create('li', {id: this.domNode.id + '_' + this._nextCellIndex++, className: this.baseClass + 'Cell', tabindex: '-1'}, listNode);
				if(this.selectionMode !== 'none' && this.isItemSelected(entryIndex)){
					domClass.add(currentCell, this.baseClass + 'SelectedCell');
				}
				this._setCellContent(currentCell, this._renderEntry(currentEntry, entryIndex));
				this._setCellEntryIndex(currentCell, entryIndex);
				// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
				this._cellsHeight += this._getCellHeight(currentCell);
				this._lastEntryIndex = entryIndex;
			}
			if(loaderCell){
				// move it to the end of the list
				domConstruct.place(loaderCell, listNode);
			}else{
				if(this._hasNextPage){
					// create the loader cell
					this._loaderCell = domConstruct.create('li', {className: this.baseClass + 'Cell' + ' ' + this.baseClass + 'LoaderCell', tabindex: '-1'}, listNode);
					// TODO: should we issue an event to notify that we're changing the content of the cell ?
					this._setCellContent(this._loaderCell, this._renderPageLoader(false));
					// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
					this._cellsHeight += this._getCellHeight(this._loaderCell);
					this._loaderCellClickHandlerRef = this.own(on(this._loaderCell, 'click', lang.hitch(this, '_onLoaderCellClick')))[0];
				}
			}
		},

		_recycleCells: function(fromBottomToTop){
			// TODO: the height calculations may cause bad performances on slower devices ?
			var listNode = this._getListNode();
			var recycledCell, recycledCellIsCategoryHeader;
			var cellHeightBeforeUpdate, cellHeightAfterUpdate;
			// FIXME: THE FOLLOWING IS A HACK: IT APPEARS THAT THE VALUE CALCULATED FOR this._cellsHeight when creating the cells is not always ok (see example List3 in the test page)
			this._cellsHeight = this._getNodeHeight(listNode) - this._spacerHeight;
			if(fromBottomToTop){
				while(!this._centerOfListAboveCenterOfViewport()){
					if(this._firstEntryIndex > 0){
						// move the bottom cell to the top while updating its content
						recycledCell = this._getLastCell();
						recycledCellIsCategoryHeader = this._cellRendersCategoryHeader(recycledCell);
						cellHeightAfterUpdate = 0;
						if(this.categoryAttribute && (this._getEntry(this._firstEntryIndex - 1)[this.categoryAttribute] != this._getEntry(this._firstEntryIndex)[this.categoryAttribute]) && !this._cellRendersCategoryHeader(this._getFirstCell())){
							// recycle the cell to a header cell and get the next one to recycle it to display the list entry
							cellHeightAfterUpdate += this._updateCell(recycledCell, this._getEntry(this._firstEntryIndex), null, true, true);
							if(!recycledCellIsCategoryHeader){
								this._lastEntryIndex--;
							}
							domConstruct.place(recycledCell, this._getFirstCell(), 'before'); // TODO: can we optimize this, even if less maintainable ?
							recycledCell = this._getLastCell();
							recycledCellIsCategoryHeader = this._cellRendersCategoryHeader(recycledCell);
						}
						--this._firstEntryIndex;
						cellHeightAfterUpdate += this._updateCell(recycledCell, this._getEntry(this._firstEntryIndex), this._firstEntryIndex, false, true);
						if(!recycledCellIsCategoryHeader){
							this._lastEntryIndex--;
						}
						domConstruct.place(recycledCell, this._getFirstCell(), 'before'); // TODO: can we optimize this, even if less maintainable ?
						// we cannot use _scrollBy here to compensate for the node move, as it cause
						// flickering on iOS. Instead, we resize the spacer element.
						this._spacerHeight -= cellHeightAfterUpdate;
						this._updateSpacerHeight();
					}else{
						if(this.categoryAttribute && this._firstEntryIndex == 0 && !this._cellRendersCategoryHeader(this._getFirstCell())){
							// recycle the last cell to a category header for the first cell
							recycledCell = this._getLastCell();
							recycledCellIsCategoryHeader = this._cellRendersCategoryHeader(recycledCell);
							cellHeightAfterUpdate = this._updateCell(recycledCell, this._getEntry(this._firstEntryIndex), null, true, true);
							if(!recycledCellIsCategoryHeader){
								this._lastEntryIndex--;
							}
							domConstruct.place(recycledCell, this._getFirstCell(), 'before'); // TODO: can we optimize this, even if less maintainable ?
							// we cannot use _scrollBy here to compensate for the node move, as it cause
							// flickering on iOS. Instead, we resize the spacer element.
							this._spacerHeight -= cellHeightAfterUpdate;
							this._updateSpacerHeight();
						}
						break;
					}
				}
			}else if(!fromBottomToTop){
				while(this._centerOfListAboveCenterOfViewport()){
					if(this._lastEntryIndex < this._getEntriesCount() - 1){
						// move the top cell to the bottom while updating its content
						recycledCell = this._getFirstCell();
						recycledCellIsCategoryHeader = this._cellRendersCategoryHeader(recycledCell);
						cellHeightBeforeUpdate = 0;
						if(this.categoryAttribute && (this._getEntry(this._lastEntryIndex + 1)[this.categoryAttribute] != this._getEntry(this._lastEntryIndex)[this.categoryAttribute]) && !this._cellRendersCategoryHeader(this._getLastCell())){
							// recycle the cell to a header cell and get the next one to recycle it to display the list entry
							cellHeightBeforeUpdate += this._updateCell(recycledCell, this._getEntry(this._lastEntryIndex + 1), null, true, false);
							domConstruct.place(recycledCell, this._getLastCell(), 'after'); // TODO: can we optimize this, , even if less maintainable ?
							if(!recycledCellIsCategoryHeader){
								this._firstEntryIndex++;
							}
							recycledCell = this._getFirstCell();
							recycledCellIsCategoryHeader = this._cellRendersCategoryHeader(recycledCell);
						}
						++this._lastEntryIndex;
						cellHeightBeforeUpdate += this._updateCell(recycledCell, this._getEntry(this._lastEntryIndex), this._lastEntryIndex, false, false);
						if(!recycledCellIsCategoryHeader){
							this._firstEntryIndex++;
						}
						domConstruct.place(recycledCell, this._getLastCell(), 'after'); // TODO: can we optimize this, , even if less maintainable ?
						// we cannot use _scrollBy here to compensate for the node move, as it cause
						// flickering on iOS. Instead, we resize the spacer element.
						this._spacerHeight += cellHeightBeforeUpdate;
						this._updateSpacerHeight();
					}else{
						break;
					}
				}
			}
		},

		_updateSpacerHeight: function(){
			if(this._spacerHeight < 0){ // make sure the height is not negative otherwise it may be ignored
				this._spacerHeight = 0;
			}
			this._getSpacerNode().style.height = this._spacerHeight + 'px';
		},

		_updateCell: function(cell, newEntry, newEntryIndex, renderCategory, returnNewCellHeight){
			var oldCellHeight = this._getCellHeight(cell);
			var newCellHeight = null;
			var cellInitialEntryIndex = this._getCellEntryIndex(cell);
			var cellInitialCategoryHeader = this._getCellCategoryHeader(cell);
			if(this.selectionMode !== 'none'){
				if(this.isItemSelected(newEntryIndex)){
					domClass.add(cell, this.baseClass + 'SelectedCell');
				}else{
					domClass.remove(cell, this.baseClass + 'SelectedCell');
				}
			}
			var renderedContent = renderCategory ? this._renderCategory(newEntry[this.categoryAttribute]) : this._renderEntry(newEntry, newEntryIndex);
			if(cellInitialEntryIndex != null){
				this._recycleEntryRenderer(cellInitialEntryIndex);
			}else{
				this._recycleCategoryRenderer(cellInitialCategoryHeader);
			}
			this._setCellContent(cell, renderedContent);
			if(renderCategory){
				this._setCellCategoryHeader(cell, newEntry[this.categoryAttribute]);
			}else{
				this._setCellCategoryHeader(cell, null);
			}
			this._setCellEntryIndex(cell, newEntryIndex);
			newCellHeight = this._getCellHeight(cell);
			this._cellsHeight += (newCellHeight - oldCellHeight);
			if(returnNewCellHeight){
				return newCellHeight;
			}else{
				return oldCellHeight;
			}
		},

		_setCellContent: function(cell, content){
			if(typeof content === 'string'){
				cell.innerHTML = content;
			}else{
				if(cell.children[0] != content){
					domConstruct.empty(cell);
					cell.appendChild(content);
				}
			}
		},

		_renderEntry: function(entry, entryIndex){
			// TO BE IMPLEMENTED BY CONCRETE LIST CLASS
		},
		
		_recycleEntryRenderer: function(entryIndex){
			// TO BE IMPLEMENTED BY CONCRETE LIST CLASS
		},

		_renderCategory: function(category){
			// TO BE IMPLEMENTED BY CONCRETE LIST CLASS
		},

		_recycleCategoryRenderer: function(category){
			// TO BE IMPLEMENTED BY CONCRETE LIST CLASS
		},

		_renderPageLoader: function(loading){
			// TO BE IMPLEMENTED BY CONCRETE LIST CLASS
		},

		_updatePageLoaderStatus: function(loading){
			var loaderCell = this._getLoaderCell();
			if(loaderCell){
				if(loading){
					domClass.add(loaderCell, this.baseClass + 'LoaderCellLoading');
				}else{
					domClass.remove(loaderCell, this.baseClass + 'LoaderCellLoading');
				}
				this._setCellContent(loaderCell, this._renderPageLoader(loading));
			}
		},

		_destroyPageLoader: function(){
			this._loaderCellClickHandlerRef.remove();
			this._loaderCellClickHandlerRef = null;
			// TODO: EMIT AN EVENT TO SIGNAL WE'RE DESTROYING THE LOADER CELL ???
			this._cellsHeight -= this._getNodeHeight(this._loaderCell);
			domConstruct.destroy(this._loaderCell);
			delete this._loaderCell;
		},

		_getSpacerNode: function(){
			return this._getListNode().children[0];
		},

		_getFirstCell: function(){
			return this._getListNode().children[1];
		},
		
		_getLastCell: function(){
			var listNode = this._getListNode();
			if(this._hasNextPage){
				return listNode.children[listNode.children.length - 2];
			}else{
				return listNode.lastChild;
			}
		},

		_getLoaderCell: function(){
			return this._loaderCell;
		},

		_getCellByEntryIndex: function(entryIndex){
			var cell = null;
			if(entryIndex >= this._firstEntryIndex && entryIndex <= this._lastEntryIndex){
				cell = query('li[data-index^="' + entryIndex + '"]', this.domNode)[0];
			}
			return cell;
		},

		_getCellEntryIndex: function(cell){
			var rawIndex =  this._getNodeData(cell, 'index');
			if(rawIndex){
				return parseInt(this._getNodeData(cell, 'index'), 10);
			}else{
				return null;
			}
		},

		_setCellEntryIndex: function(cell, entryIndex){
			this._setNodeData(cell, 'index', entryIndex);
		},

		_getCellCategoryHeader: function(cell){
			return this._getNodeData(cell, 'section');
		},

		_setCellCategoryHeader: function(cell, categoryName){
			this._setNodeData(cell, 'section', categoryName);
		},

		_getParentCell: function(node){
			var currentNode = dom.byId(node);
			while(currentNode && !domClass.contains(currentNode, this.baseClass + 'Cell')){
				currentNode = currentNode.parentNode;
			}
			return currentNode;
		},

		_topOfCellIsBelowTopOfViewport: function(cell){
			return this._topOfCellDistanceToTopOfViewport(cell) >= 0;
		},

		_topOfCellDistanceToTopOfViewport: function(cell){
			return cell.offsetTop + this._translation - this._browserScroll;
		},

		_bottomOfCellDistanceToBottomOfViewport: function(cell){
			return cell.offsetTop + cell.offsetHeight + this._translation - this._browserScroll - this._visibleHeight;
		},

		_centerOfListAboveCenterOfViewport: function(){
			return (this._visibleHeight / 2) - this._getApparentScroll() > (this._cellsHeight / 2);
		},

		_cellRendersCategoryHeader: function(cell){
			return (this._getCellCategoryHeader(cell) != null);
		},

		/////////////////////////////////
		// Private scroll methods
		/////////////////////////////////

		_scrollBy: function(y, animate, animOptions){
			var listNode = this._getListNode();
			if(animate){
				var animDuration = '0.3s';
				var animTimingFunc = 'ease-out';
				if(animOptions){
					animDuration=animOptions.duration?animOptions.duration:animDuration;
					animTimingFunc=animOptions.timingFunc?animOptions.timingFunc:animTimingFunc;
				}
				// TODO: OPTIMIZE BY GETTING THE NAMES OF THE CSS PROPERTIES ONLY ONCE WHEN WE CREATE THE WIDGET ?
				listNode.style[css3.name('transition', false)] = css3.name('transform', true) + ' ' + animDuration + ' ' + animTimingFunc;
			}
			this._translation += y;
			listNode.style[css3.name('transform', false)] = 'translate3d(0,' + this._translation + 'px,0)';
			if(animate){
				this.defer(function(){
					// defer setting back the transition property to no value, or the temporary change of the property
					// is ignored and a transition is performed
					listNode.style[css3.name('transition', false)] = '';
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
			var entryIndex, entrySelected;
			var eventCell = this._getParentCell(event.target);
			if(this.selectionMode !== 'none' && !this._dy){
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
			if(this._loaderCell){
				if(this._dy || this._loadingPage){
					return;
				}
				this._loadingPage = true;
				this._updatePageLoaderStatus(true);
				this._loadEntriesFromStore(this._onNextPageReady);
			}
		},

		_onFocus: function(event){
			if(this._focusedCell){
				domClass.remove(this._focusedCell, this.baseClass + 'FocusedCell');
				this._focusedCell = null;
			}
		},

		_onKeyDown: function(event){
			switch (event.keyCode) {
				case keys.UP_ARROW:
					event.preventDefault();
					this._focusNextCell(false);
					break;
				case keys.DOWN_ARROW:
					event.preventDefault();
					this._focusNextCell(true);
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

		_focusNextCell: function(down){
			var cell;
			var distanceToEdgeOfViewport;
			if(this._focusedCell){
				cell = down?this._focusedCell.nextSibling:this._focusedCell.previousSibling;
				if(cell != null && (down || cell.previousSibling != null)){ // do not set focus on the spacer cell
					domClass.remove(this._focusedCell, this.baseClass + 'FocusedCell');
					this._focusedCell = cell;
				}else{
					return;
				}
			}else{
				// Focus the first visible cell
				cell = this._getFirstCell();
				while(cell){
					if(this._topOfCellIsBelowTopOfViewport(cell)){
						this._focusedCell = cell;
						break;
					}
					cell = cell.nextSibling;
				}
			}
			this._focusedCell.focus();
			domClass.add(this._focusedCell, this.baseClass + 'FocusedCell');
			this.domNode.setAttribute('aria-activedescendant', this._focusedCell.id);
			this.defer(function(){
				// scroll has been updated: verify that the focused cell is visible, if not scroll to make it appear
				if(this._browserScroll == 0){
					// the browser won't scroll with negative values: if the focused cell is not entirely visible,
					// scroll it to make it visible.
					distanceToEdgeOfViewport = this._topOfCellDistanceToTopOfViewport(cell);
					if(distanceToEdgeOfViewport < 0){
						this.scrollBy(-distanceToEdgeOfViewport);
					}
				}else{
					distanceToEdgeOfViewport = this._bottomOfCellDistanceToBottomOfViewport(cell);
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