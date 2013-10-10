define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/when",
        "dojo/on",
        "dojo/dom",
        "dojo/dom-construct",
        "dojo/dom-class",
        "dojo/dom-style",
        "dojo/keys",
        "dui/registry",
        "dui/_WidgetBase",
        "dui/_Container",
        "dui/mixins/Selection",
        "dui/_KeyNavMixin",
        "./DefaultEntryRenderer",
        "./DefaultCategoryRenderer"
], function(declare, lang, when, on, dom, domConstruct, domClass, domStyle, keys, registry, _WidgetBase, _Container, Selection, _KeyNavMixin, DefaultEntryRenderer, DefaultCategoryRenderer){

	return declare([_WidgetBase, _Container, Selection, _KeyNavMixin], {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		entries: [],

		categoryAttribute: null, // define the list entry attribute that define the category of a list entry. If null, the list is not categorized.

		entriesRenderer: DefaultEntryRenderer,

		categoriesRenderer: DefaultCategoryRenderer, // renders the category headers when the list entries are categorized.

		// TODO: FIND A BETTER NAME ? (SEEMS RELATED TO PAGELENGTH WHILE IT'S NOT !!!!)
		// Ignored if the Scrollable mixin is not added to the list
		cellPages: 0, // The number of pages of cells to use (one page fills the viewport of the widget). If <= 0, all the list entries are rendered as once.

		baseClass: 'duiRoundRectList2',

		selectionMode: 'none',

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_initialized: false,
		_spacerHeight: 0, // the height of the spacer element on top of the list
		_cellsHeight: 0, // the total height of the cells
		_nextCellIndex: 0, // the _createCells method use this to retrieve the index of the next cell to create
		_firstEntryIndex: 0, // index of the entry in the first cell
		_lastEntryIndex: null, // index of the entry in the last cell
		_focusedNode: null,
		_renderedEntriesPool: null,
		_renderedCategoriesPool: null,
		_hiddenCellsOnTop: 0,
		_cellEntryIndexes: null,
		_cellCategoryHeaders: null,
		_cellManagedFocus: false,
		_topNode: null,
		_bottomNode: null,

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		postMixInProperties: function(){
			this.inherited(arguments);
			this._renderedEntriesPool = [];
			this._renderedCategoriesPool = [];
			this._cellEntryIndexes = {};
			this._cellCategoryHeaders = {};
		},

		buildRendering: function(){
			var node;
			this.inherited(arguments);
			// Create the main node
			if(this.domNode.parentNode){
				this.domNode = domConstruct.create('div', {className: this.baseClass, tabIndex: -1}, this.domNode, 'replace');
			}else{
				this.domNode = domConstruct.create('div', {className: this.baseClass, tabIndex: -1});
			}
			this._topNode = domConstruct.create('div', {className: this.baseClass + '-header', tabIndex: -1}, this.domNode);
			this.containerNode = domConstruct.create('div', {className: this.baseClass + '-container', tabIndex: -1}, this.domNode);
			this._bottomNode = domConstruct.create('div', {className: this.baseClass + '-footer', tabIndex: -1}, this.domNode);
			// Create the spacer node, as a child of the top node. It is dynamically resized when moving list cells
			// in the _recycleCells method, to avoid flickering on iOS (if scrolling on iOS to
			// compensate the fact that nodes are moved in the list, there is flickering).
			domConstruct.create('div', {style: 'height: 0px', tabIndex: -1}, this._topNode);
			if(this.srcNodeRef){
				// reparent
				for(var i = 0, len = this.srcNodeRef.childNodes.length; i < len; i++){
					node = this.srcNodeRef.firstChild;
					// make sure tabIndex is -1 for keyboard navigation
					node.tabIndex = -1;
					// TODO: CAN WE HAVE CATEGORIES HERE ???
					domClass.add(node, this.baseClass + '-cell');
					this.containerNode.appendChild(node);
					// TODO: IGNORE this.entries attribute in startup if entries are added using markup
				}
			}
		},

		startup: function(){
			this.inherited(arguments);
			this._toggleListLoadingStyle();
			if(this._isScrollable && this.cellPages > 0){
				this.onScroll = function(scroll){
					this._recycleCells(scroll > 0);
				};
			}
			// TODO: use when(this._renderEntries(), function(){
			//		this._toggleListLoadingStyle();
			//		this._registerEventHandlers();
			//		if(this._isScrollable){
			//			this.registerScrollableEventHandlers();
			//		}
			//		this._initialized = true;
			// }); AND REMOVE initit code from _renderEntries .????
			this._renderEntries();
		},

		destroy: function(){
			var widget;
			this.inherited(arguments);
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
		},

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		onCellEvent: function(event, handler){
			var that = this;
			return this.on(event, function(e){
				if(domClass.contains(e.target, this.baseClass)){
					return;
				}else{
					return handler(e, that._getCellEntryIndex(that._getParentCell(e.target)));
				}
			});
		},

		renderingUpdated: function(){ // Notify the list widget that cells rendering has been updated.
			if(this._isScrollable){ // we only care about _cellsHeight when the list is scrollable
				this._cellsHeight = this._getNodeHeight(this.domNode) - this._spacerHeight;
			}
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
		// Methods for Scrollable support
		/////////////////////////////////

		getCurrentScroll: function(){
			return 0;
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_renderEntries: function(){
			this._createCells();
			if(!this._initialized){
				this._toggleListLoadingStyle();
				this._registerEventHandlers();
				if(this._isScrollable){
					this.registerScrollableEventHandlers();
				}
				this._initialized = true;
			}
		},

		_toggleListLoadingStyle: function(){
			domClass.toggle(this.domNode, this.baseClass + '-loading');
		},

		_getEntriesCount: function(){
			return this.entries.length;
		},

		_getEntry: function(index){
			return this.entries[index];
		},

		_getCellHeight: function(cell, isEntryCell){
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
			// Create cells using renderers
			for (entryIndex; entryIndex < this._getEntriesCount(); entryIndex++){
				if(this._isScrollable && (this.cellPages > 0) && (this._cellsHeight > (this.cellPages * this._visibleHeight))){
					break;
				}
				currentEntry = this._getEntry(entryIndex);
				if(this.categoryAttribute && currentEntry[this.categoryAttribute] != lastCategory){
					// create a category header
					lastCategory = currentEntry[this.categoryAttribute];
					/////////////////////////////////////////
					//
					// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
					//
					/////////////////////////////////////////
					this._renderCategory(currentEntry[this.categoryAttribute], 'bottom');
				}
				/////////////////////////////////////////
				//
				// FIXME: cells height calculation is not correct in some cases here (example: list3 in test page !!!)
				//
				/////////////////////////////////////////
				this._renderEntry(currentEntry, entryIndex, 'bottom');
				this._lastEntryIndex = entryIndex;
			}
		},

		_recycleCells: function(fromBottomToTop){
			// TODO: the height calculations may cause bad performances on slower devices ?
			// FIXME: THE FOLLOWING IS A HACK: IT APPEARS THAT THE VALUE CALCULATED FOR this._cellsHeight when creating the cells is not always ok (see example List3 in the test page)
			this._cellsHeight = this._getNodeHeight(this.domNode) - this._spacerHeight;
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
			var removedHeight = this._getCellHeight(topCell, !topCellIsCategoryHeader);
			// update spacer height with the height of the cell and hide the cell
			this._updateSpacerHeight(removedHeight);
			domClass.add(topCell.domNode, this.baseClass + '-pooledElement');
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
			var bottomCellIsCategoryHeader = this._nodeRendersCategoryHeader(bottomCellNode);
			var removedHeight = this._getCellHeight(bottomCell, !bottomCellIsCategoryHeader);
			domClass.add(bottomCell.domNode, this.baseClass + '-pooledElement');
			this._cellsHeight -= removedHeight;
			domConstruct.place(bottomCellNode, this.containerNode, 0);
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
			var addedHeight = 0, fromCache = false;
			var renderedEntry = this._renderedEntriesPool.shift();
			if(renderedEntry){
				fromCache = true;
				renderedEntry._setEntryIndexAttr(entryIndex);
				renderedEntry._setEntryAttr(entry);
//				renderedEntry.set('entryIndex', entryIndex);
//				renderedEntry.set('entry', entry);
			}else{
				renderedEntry = new this.entriesRenderer({entry: entry, entryIndex: entryIndex, tabindex: "-1"});
				domClass.add(renderedEntry.domNode, this.baseClass + '-cell');
				renderedEntry.startup();
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
				domClass.remove(renderedEntry.domNode, this.baseClass + '-pooledElement');
				addedHeight = this._getCellHeight(renderedEntry, true);
			}
			this._placeCellNode(renderedEntry.domNode, pos);
			if(!fromCache){
				addedHeight = this._getCellHeight(renderedEntry, true);
			}
			this._cellsHeight += addedHeight;
			if(pos == 'top'){
				this._updateSpacerHeight(-addedHeight);
			}
		},

		_setSelectionStyle: function(cellNode, entryIndex){
			if(this.selectionMode !== 'none'){
				if (this.isItemSelected(entryIndex)){
					domClass.add(cellNode, this.baseClass + '-selectedCell');
				}else{
					domClass.remove(cellNode, this.baseClass + '-selectedCell');
				}
			}
		},

		_renderCategory: function(category, pos){
			var addedHeight = 0, fromCache = false;
			var renderedCategory = this._renderedCategoriesPool.shift();
			if(renderedCategory){
				fromCache = true;
				renderedCategory._setCategoryAttr(category);
//				renderedCategory.set('category', category);
			}else{
				renderedCategory = new this.categoriesRenderer({category: category, tabindex: "-1"});
				domClass.add(renderedCategory.domNode, this.baseClass + '-category');
				renderedCategory.startup();
			}
			this._setCellEntryIndex(renderedCategory, null);
			this._setCellCategoryHeader(renderedCategory, category);
			if(fromCache){
				this._hiddenCellsOnTop -= 1;
				// move the node to the bottom before displaying it and getting its height, to avoid flickering
				this._placeCellNode(renderedCategory.domNode, 'bottom');
				domClass.remove(renderedCategory.domNode, this.baseClass + '-pooledElement');
				addedHeight = this._getCellHeight(renderedCategory, false);
			}
			this._placeCellNode(renderedCategory.domNode, pos);
			if(!fromCache){
				addedHeight = this._getCellHeight(renderedCategory, false);
			}
			this._cellsHeight += addedHeight;
			if(pos == 'top'){
				this._updateSpacerHeight(-addedHeight);
			}
		},

		_placeCellNode: function(node, pos){
			var position;
			if(pos === 'bottom'){
				position = this._getLastCellNodePosition();
			}else if(pos === 'top'){
				position = this._getFirstCellNodePosition();
			}else{
				// TODO: THROW EXCEPTION ?
				return;
			}
			domConstruct.place(node, this.containerNode, position);
		},

		_getSpacerNode: function(){
			return this._topNode.children[0];
		},

		_getFirstCellNode: function(){
			return this.containerNode.children[this._getFirstCellNodePosition()];
		},

		_getLastCellNode: function(){
			return this.containerNode.children[this._getLastCellNodePosition() - 1];
		},

		_getFirstCellNodePosition: function(){
			return this._hiddenCellsOnTop;
		},

		_getLastCellNodePosition: function(){
			return this.containerNode.children.length;
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
//			while(currentNode && !domClass.contains(currentNode, this.baseClass + '-cell')){
			while(currentNode){
				if(currentNode.parentNode && domClass.contains(currentNode.parentNode, this.baseClass + '-container')){
					break;
				}
				currentNode = currentNode.parentNode;
			}
			return registry.byNode(currentNode);
		},

		_centerOfListAboveCenterOfViewport: function(){
			return (this._visibleHeight / 2) - this.getCurrentScroll() - this._spacerHeight > (this._cellsHeight / 2);
		},

		_nodeRendersCategoryHeader: function(node){
			return (this._getNodeCategoryHeader(node) != null);
		},

		/////////////////////////////////
		// Keyboard navigation (_KeyNavMixin implementation)
		/////////////////////////////////

		_onContainerKeydown: function(evt){
			var continueProcessing = true, cell = this._getFocusedCell();
			if(cell && cell.onKeydown){
				continueProcessing = cell.onKeydown(evt);
			}
			if(continueProcessing !== false){ // onKeydown implementation can return false to cancel the default action
				if((evt.keyCode == keys.SPACE && !this._searchTimer) || evt.keyCode == keys.ENTER){
					this._onActionKeydown(evt);
				};
			}
			this.inherited(arguments);
		},

		_onActionKeydown: function(evt){
			if(this.selectionMode !== 'none'){
				evt.preventDefault();
				this._handleSelection(event);
			}
		},

		childSelector: function(node){
			return node;
		},

		_getFirst: function(){
			var node = this._getFirstCellNode();
			while(node){
				if(this._topOfNodeIsBelowTopOfViewport(node)){
					break;
				}
				node = node.nextElementSibling;
			}
			return registry.byNode(node);
		},

		_getLast: function(){
			var node = this._getLastCellNode();
			while(node){
				if(this._bottomOfNodeIsBeforeTopOfViewport(node)){
					break;
				}
				node = node.previousElementSibling;
			}
			return registry.byNode(node);
		},

		//////////////////////////////////////////
		// FIXME: TO ENABLE KEYBOARD SEARCH, _getNext MUST
		// BE ABLE TO RETURN NEXT ELEMENT FROM WITHIN A CELL
		// WHEN THE child PARAMETER IS A CELL ELEMENT.
		// => FEATURE IS CURRENTLY INHIBITED
		//////////////////////////////////////////
		_keyboardSearch: function(/*Event*/ evt, /*String*/ keyChar){
			console.log("FIXME: Keyboard search is not yet implemented");
			return null;
		},

		_getNext: function(child, dir){
			// return the next cell
			var nextNode = child.domNode[(dir == 1)?'nextElementSibling':'previousElementSibling'];
			if(nextNode){
				return registry.byNode(nextNode);
			}else{
				return null;
			};
		},

		_onLeftArrow: function(){
			var nextNode;
			if (this._getFocusedCell()._getNextFocusableNode){
				nextNode = this._getFocusedCell()._getNextFocusableNode(-1);
				if(nextNode){
					// TODO: TURN THE NODE INTO A WIDGET ???
					this.focusChild(nextNode);
				}
			}
		},

		_onRightArrow: function(){
			var nextNode;
			if (this._getFocusedCell()._getNextFocusableNode){
				nextNode = this._getFocusedCell()._getNextFocusableNode(1);
				if(nextNode){
					// TODO: TURN THE NODE INTO A WIDGET ???
					this.focusChild(nextNode);
				}
			}
		},

		_onDownArrow: function(){
			this._focusNextChild(1);
		},

		_onUpArrow: function(){
			this._focusNextChild(-1);
		},

		_focusNextChild: function(dir){
			var cell = this._getFocusedCell();
			var child = this._getNext(cell, dir);
			if(child){
				this.focusChild(child);
			}else{
				this.focusChild(cell);
			}
		},

		_getFocusedCell: function(){
			return this._getParentCell(this.focusedChild.domNode);
		},

		_topOfNodeIsBelowTopOfViewport: function(node){
			return this._topOfNodeDistanceToTopOfViewport(node) >= 0;
		},

		_topOfNodeDistanceToTopOfViewport: function(node){
			return node.offsetTop + this.getCurrentScroll();
		},

		_bottomOfNodeIsBeforeTopOfViewport: function(node){
			return this._bottomOfNodeDistanceToBottomOfViewport(node) <= 0;
		},

		_bottomOfNodeDistanceToBottomOfViewport: function(node){
			return node.offsetTop + node.offsetHeight + this.getCurrentScroll() - this._visibleHeight;
		},

		/////////////////////////////////
		// Event handlers
		/////////////////////////////////

		_registerEventHandlers: function(){
//			this.on('keydown', lang.hitch(this, '_onKeydown'));
//			this.on('focus', lang.hitch(this, '_onFocus'));
			if(this.selectionMode !== 'none'){
				this.on('click', lang.hitch(this, '_handleSelection'));
			}
		},

		_handleSelection: function(event){
			var entryIndex, entrySelected, eventCell;
			eventCell = this._getParentCell(event.target);
			entryIndex = this._getCellEntryIndex(eventCell);
			if(entryIndex != null){
				entrySelected = !this.isItemSelected(entryIndex);
				this.setSelected(entryIndex, entrySelected);
				this.emit(entrySelected ? 'entrySelected' : 'entryDeselected', {entryIndex: entryIndex});
			}
		},

//		_onKeydown: function(event){
//			console.log("DEBUG");
//			var cell;
//			switch (event.keyCode) {
//				case keys.UP_ARROW:
//					event.preventDefault();
//					this._focusNextNode(false);
//					break;
//				case keys.DOWN_ARROW:
//					event.preventDefault();
//					this._focusNextNode(true);
//					break;
//				case keys.RIGHT_ARROW:
//					if(this._focusedNode){
//						event.preventDefault();
//						this._focusCellContent(true);
//					}
//					break;
//				case keys.LEFT_ARROW:
//					if(this._focusedNode){
//						event.preventDefault();
//						this._focusCellContent(false);
//					}
//					break;
//				case keys.ENTER:
//				case keys.SPACE:
//					if(!this._cellManagedFocus){
//						this._onActionKeydown(event);
//						break;
//					}
//				default:
//					if(this._cellManagedFocus){
//						cell = registry.byNode(this._focusedNode);
//						if(cell.onKeydown){
//							cell.onKeydown(event);
//						}
//					}
//			};
//		},


//		_focusNextNode: function(down){
//			var node, cell;
//			var distanceToEdgeOfViewport;
//			if(this._focusedNode){
//				if(!this._cellManagedFocus){
//					node = down?this._focusedNode.nextElementSibling:this._focusedNode.previousElementSibling;
//					if(node != null){
//						///////////////////////////////////////////////
//						// TODO: THIS SHOULD BE DONE IN THE RENDERED WIDGET
//						///////////////////////////////////////////////
//						cell = registry.byNode(this._focusedNode);
//						domClass.remove(this._focusedNode, this.baseClass + '-focusedCell');
//						if(cell && cell.onBlur){
//							cell.onBlur();
//						}
//						this._focusedNode = node;
//					}else{
//						return;
//					}
//				}else{
//					cell = registry.byNode(this._focusedNode);
//					if(cell && cell.blurCurrentElement){
//						cell.blurCurrentElement();
//					}
//				}
//			}else{
//				// Focus the first visible cell node
//				node = this._getFirstCellNode();
//				while(node){
//					if(this._topOfNodeIsBelowTopOfViewport(node)){
//						this._focusedNode = node;
//						break;
//					}
//					node = node.nextElementSibling;
//				}
//			}
//			this._focusedNode.focus();
//			domClass.add(this._focusedNode, this.baseClass + '-focusedCell');
//			this.domNode.setAttribute('aria-activedescendant', this._focusedNode.id);
//			cell = registry.byNode(this._focusedNode);
//			if(cell && !this._cellManagedFocus && cell.onFocus){
//				cell.onFocus();
//			}
//			this._cellManagedFocus = false;
//			this.defer(function(){
//				// scroll has been updated: verify that the focused cell is visible, if not scroll to make it appear
//				if(this._browserScroll == 0){
//					// the browser won't scroll with negative values: if the focused cell is not entirely visible,
//					// scroll it to make it visible.
//					distanceToEdgeOfViewport = this._topOfNodeDistanceToTopOfViewport(this._focusedNode);
//					if(distanceToEdgeOfViewport < 0){
//						this.scrollBy(-distanceToEdgeOfViewport);
//					}
//				}else{
//					distanceToEdgeOfViewport = this._bottomOfNodeDistanceToBottomOfViewport(this._focusedNode);
//					if(distanceToEdgeOfViewport > 0){
//						this.scrollBy(-distanceToEdgeOfViewport);
//					}
//				}
//			}, 10);
//		},

//		_focusCellContent: function(next){
//			var cell, cellFocusedNodeId;
//			if(!this._nodeRendersCategoryHeader(this._focusedNode)){				
//				cell = registry.byNode(this._focusedNode);
//				if(cell.focusNextElement){
//					cellFocusedNodeId = cell.focusNextElement(next);
//					if(cellFocusedNodeId){
//						this.domNode.setAttribute('aria-activedescendant', cellFocusedNodeId);
//					}
//					this._cellManagedFocus = true;
//				}
//			}
//		},

		_captureEvent: function(event){
			event.preventDefault();
			event.stopPropagation();
		}

	});
});