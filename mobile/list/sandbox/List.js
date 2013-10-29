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
], function (declare, lang, when, on, dom, domConstruct, domClass, domStyle, keys, registry, _WidgetBase, _Container,
		Selection, _KeyNavMixin, DefaultEntryRenderer, DefaultCategoryRenderer) {

	return declare([_WidgetBase, _Container, Selection, _KeyNavMixin], {

		// Architecture of the list:
		// - the domNode is a div
		// - it contains three children:
		//   - _topNode, a div that itself contains a spacer node which height is set to maintain the display
		//		when recycling cells
		//   - containerNode, a div that contains:
		//     - at the top, 0 or more pooled cells (they have the css class baseClass + "-pooledElement",
		//		which means display: "none")
		//     - the cells (div) that renders category headers and list entries. _firstEntryIndex is the index
		//		of the first entry displayed, _lastEntryIndex is the index of the last entry displayed.
		//   - _footerNode, which is currently an empty div
		// If the list is scrollable AND cellPages > 0, a fixed number of cells is used to display list entries:
		// cells are recycled when scrolling the list or removing entries.
		
		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		// The ordered entries to render in the list. You can also use the dui/list/StoreModel mixin to
		// populate this list of entries using a dojo object store, in which case there is no need to
		// define a value for this attribute.
		entries: [],

		 // Name of the list entry attribute that define the category of a list entry.
		//  If falsy, the list is not categorized.
		categoryAttribute: null,

		// The widget class to use to render list entries. It MUST extend the dui/list/AbstractEntryRenderer class.
		entriesRenderer: DefaultEntryRenderer,

		// The widget class to use to render category headers when the list entries are categorized.
		// It MUST extend the dui/list/AbstractEntryRenderer class.
		categoriesRenderer: DefaultCategoryRenderer,

		// TODO: FIND A BETTER NAME ? (SEEMS RELATED TO PAGELENGTH WHILE IT'S NOT !!!!)
		// Ignored if the Scrollable mixin is not added to the list
		// The number of pages of cells to use (one page fills the viewport of the widget).
		// If <= 0, all the list entries are rendered as once.
		cellPages: 0,

		// The base class that defines the style of the list.
		// Available values are:
		// - "duiRoundRectList" (default), that render a list with rounded corners and left and right margins;
		// - "duiEdgeToEdgeList", that render a list with no rounded corners and no left and right margins.
		baseClass: "duiRoundRectList2",

		// The selection mode for list entries (see dui/mixins/Selection).
		selectionMode: "none",

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_cssSuffixes: {entry: "-entry",
					   category: "-category",
					   pooled: "-pooledElement",
					   selected: "-selectedEntry",
					   loading: "-loading",
					   container: "-container",
					   header: "-header",
					   footer: "-footer"},
		_initialized: false,
		_spacerHeight: 0, // the height of the spacer element on top of the list
		_cellsHeight: 0, // the total height of the cells
		_firstEntryIndex: 0, // index of the entry in the first cell
		_lastEntryIndex: null, // index of the entry in the last cell
		_renderedEntriesPool: null,
		_renderedCategoriesPool: null,
		_hiddenCellsOnTop: 0,
		_cellEntryIds: null,
		_cellCategoryHeaders: null,
		_topNode: null,
		_bottomNode: null,

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		postMixInProperties: function () {
			this.inherited(arguments);
			this._renderedEntriesPool = [];
			this._renderedCategoriesPool = [];
			this._cellEntryIds = [];
			this._cellCategoryHeaders = {};
		},

		buildRendering: function () {
			var node;
			this.inherited(arguments);
			// Create the main node
			if (this.domNode.parentNode) {
				this.domNode = domConstruct.create("div", {className: this.baseClass, tabIndex: -1}, this.domNode, "replace");
			} else {
				this.domNode = domConstruct.create("div", {className: this.baseClass, tabIndex: -1});
			}
			this._topNode = domConstruct.create("div", {className: this.baseClass + this._cssSuffixes.header, tabIndex: -1}, this.domNode);
			this.containerNode = domConstruct.create("div", {className: this.baseClass + this._cssSuffixes.container, tabIndex: -1}, this.domNode);
			this._bottomNode = domConstruct.create("div", {className: this.baseClass + this._cssSuffixes.footer, tabIndex: -1}, this.domNode);
			// Create the spacer node, as a child of the top node. It is dynamically resized when moving list cells
			// in the _recycleCells method, to avoid flickering on iOS (if scrolling on iOS to
			// compensate the fact that nodes are moved in the list, there is flickering).
			domConstruct.create("div", {style: "height: 0px", tabIndex: -1}, this._topNode);
			if (this.srcNodeRef) {
				// reparent
				for(var i = 0, len = this.srcNodeRef.childNodes.length; i < len; i++) {
					node = this.srcNodeRef.firstChild;
					// make sure tabIndex is -1 for keyboard navigation
					node.tabIndex = -1;
					// TODO: CAN WE HAVE CATEGORIES HERE ???
					domClass.add(node, this.baseClass + this._cssSuffixes.entry);
					this.containerNode.appendChild(node);
					// TODO: IGNORE this.entries attribute in startup if entries are added using markup
				}
			}
		},

		startup: function () {
			this.inherited(arguments);
			this._toggleListLoadingStyle();
			if (this._isScrollable && this.cellPages > 0) {
				this.onScroll = function (scroll) {
					this._recycleCells(scroll > 0);
				};
			}
			// TODO: use when(this._renderEntries(), function () {
			//		this._toggleListLoadingStyle();
			//		this._registerEventHandlers();
			//		if (this._isScrollable) {
			//			this.registerScrollableEventHandlers();
			//		}
			//		this._initialized = true;
			// }); AND REMOVE initit code from _renderEntries .????
			this._renderEntries();
		},

		destroy: function () {
			var widget;
			this.inherited(arguments);
			while(this._renderedEntriesPool.length) {
				widget = this._renderedEntriesPool.pop();
				if (widget) {
					widget.destroyRecursive();
				}
			}
			while(this._renderedCategoriesPool.length) {
				widget = this._renderedCategoriesPool.pop();
				if (widget) {
					widget.destroyRecursive();
				}
			}
		},

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		onCellEvent: function (event, handler) {
			var that = this;
			return this.on(event, function (e) {
				var parentCell;
				if (domClass.contains(e.target, this.baseClass)) {
					return;
				} else {
					parentCell = that._getParentCell(e.target);
					if (parentCell) {
						// TODO: Pass the parentCell too ? Or run the handler in the parentCell context and pass the list ?
						return handler.call(that, e, that._getCellEntryIndex(parentCell));
					}
				}
			});
		},

		//////////////////////////////////////////////////////
		// TODO: rename as "geometryUpdated" ?
		//////////////////////////////////////////////////////
		renderingUpdated: function () { // Notify the list widget that cells rendering has been updated.
			if (this._isScrollable) { // we only care about _cellsHeight when the list is scrollable
				this._cellsHeight = this._getNodeHeight(this.domNode) - this._spacerHeight;
			}
		},

		addEntry: function (entry, entryIndex) {
			/////////////////////////////////
			// TODO: IMPLEMENT THIS
			/////////////////////////////////
		},

		deleteEntry: function (entryIndex) {
			var cell, node = this._getCellNodeByEntryIndex(entryIndex);
			// remove the entry from the entries array
			this.entries.splice(entryIndex, 1);
			// update the cell indexes
			this._cellEntryIds.splice(entryIndex, 1);
			// update first and last entry index references
			if (entryIndex < this._firstEntryIndex) {
				this._firstEntryIndex--;
			}
			if (entryIndex <= this._lastEntryIndex) {
				this._lastEntryIndex--;
			}
			if (node) {
				cell = registry.byNode(node);
				if (this._isScrollable) {
					if (this.cellPages > 0) {
						if (this._lastEntryIndex < this._getEntriesCount() - 1) {
							// move cell to the bottom
							this._recycleEntryCell(cell, "bottom");
						} else if (this._firstEntryIndex > 0) {
							// move cell to the top
							this._recycleEntryCell(cell, "top", true);
						} else {
							// move cell to the pool
							this._removeEntryCell(cell);
						}
					} else {
						this._removeEntryCell(cell);
					}
					this._endScroll();
				} else {
					this._removeEntryCell(cell);
				}
			}
			/////////////////////////////////////////////////////////////////////
			// TODO: IF DELETED CELL HAD FOCUS, MOVE THE FOCUS
			// TODO: REMOVE DESTROYED CELL FROM SELECTION IF IT WAS SELECTED
			/////////////////////////////////////////////////////////////////////
		},

		moveEntry: function (entryIndex) {
			/////////////////////////////////
			// TODO: IMPLEMENT THIS
			/////////////////////////////////
		},

		/////////////////////////////////
		// Selection implementation
		/////////////////////////////////

		getIdentity: function (item) {
			return item;
		},

		updateRenderers: function (entryIndexes) {
			var entryIndex, node;
			if (this.selectionMode !== "none") {
				for(var i=0; i < entryIndexes.length; i++) {
					entryIndex = entryIndexes[i];
					node = this._getCellNodeByEntryIndex(entryIndex);
					if (node) {
						this._setSelectionStyle(node, entryIndex);
					}
				}
			}
		},

		/////////////////////////////////
		// Methods for Scrollable support
		/////////////////////////////////

		getCurrentScroll: function () {
			return 0;
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_renderEntries: function () {
			this._createCells();
			if (!this._initialized) {
				this._toggleListLoadingStyle();
				this._registerEventHandlers();
				if (this._isScrollable) {
					this.registerScrollableEventHandlers();
				}
				this._initialized = true;
			}
		},

		_toggleListLoadingStyle: function () {
			domClass.toggle(this.domNode, this.baseClass + this._cssSuffixes.loading);
		},

		_getEntriesCount: function () {
			return this.entries.length;
		},

		_getEntry: function (index) {
			return this.entries[index];
		},

		_getCellHeight: function (cell) {
			return cell.getHeight();
		},

		_getNodeHeight: function (node) {
			var rect = node.getBoundingClientRect();
			return (rect.bottom - rect.top);
		},

		/////////////////////////////////
		// Private methods for cell life cycle
		/////////////////////////////////

		_createCells: function () {
			var entryIndex = this._lastEntryIndex != null ? this._lastEntryIndex + 1 : this._firstEntryIndex;
			var currentEntry;
//			var lastCategory = this.categoryAttribute && this._lastEntryIndex ? this._getEntry(this._lastEntryIndex - 1)[this.categoryAttribute] : null;
			// Create cells using renderers
			for (entryIndex; entryIndex < this._getEntriesCount(); entryIndex++) {
				if (this._isScrollable && (this.cellPages > 0) && (this._cellsHeight > (this.cellPages * this._visibleHeight))) {
					break;
				}
				currentEntry = this._getEntry(entryIndex);
//				if (this.categoryAttribute && currentEntry[this.categoryAttribute] !== lastCategory) {
//					// create a category header
//					lastCategory = currentEntry[this.categoryAttribute];
//					this._renderCategory(currentEntry[this.categoryAttribute], "bottom");
//				}
				this._addEntryCell(currentEntry, entryIndex, "bottom");
				this._lastEntryIndex = entryIndex;
			}
		},

		_recycleCells: function (fromBottomToTop) {
			var node, cell;
			// First recycle the entry cells that are currently in the pool
			if (fromBottomToTop) {
				while(this._renderedEntriesPool.length > 0 && this._firstEntryIndex > 0) {
					this._addEntryCell(this._getEntry(this._firstEntryIndex - 1), this._firstEntryIndex - 1, "top");
					this._firstEntryIndex--;
				}
			} else {
				while(this._renderedEntriesPool.length > 0 && this._lastEntryIndex < this._getEntriesCount() -1) {
					this._addEntryCell(this._getEntry(this._lastEntryIndex + 1), this._lastEntryIndex + 1, "bottom");
					this._lastEntryIndex++;
				}
			}
			// Then recycle non visible cells
			if (fromBottomToTop) {
				while(!this._centerOfListAboveCenterOfViewport()) {
					if (this._firstEntryIndex > 0) {
						if (this.categoryAttribute) {
							// If the last cell is a category header, move it to the pool
							node = this._getLastCellNode();
							if (this._nodeRendersCategoryHeader(node)) {
								this._moveCellToPool(registry.byNode(node));
							}
						}
						cell = registry.byNode(this._getLastCellNode());
						this._lastEntryIndex--;
						this._recycleEntryCell(cell, "top", true);
					} else {
						break;
					}
				}
			} else { // from top to bottom
				while(this._centerOfListAboveCenterOfViewport()) {
					if (this._lastEntryIndex < this._getEntriesCount() - 1) {
						if (this.categoryAttribute) {
							// If the first cell is a category header, move it to the pool
							node = this._getFirstCellNode();
							if (this._nodeRendersCategoryHeader(node)) {
								this._moveCellToPool(registry.byNode(node), true);
							}
						}
						cell = registry.byNode(this._getFirstCellNode());
						this._firstEntryIndex++;
						this._recycleEntryCell(cell, "bottom", true);
					} else {
						break;
					}
				}
			}
		},

		_recycleEntryCell: function (cell, newPos, updateSpacerHeight) {
			var nextNode, previousNode;
			var firstDisplayedEntryCategory, lastDisplayedEntryCategory, newEntryCategory, lastCellNode, firstCellNode, lastCellIsCategoryHeader, firstCellIsCategoryHeader;
			var position = newPos;
			var updatedHeight = -this._getCellHeight(cell);
			if (newPos === "bottom") {
				/////////////////////////////
				// move cell to the bottom
				/////////////////////////////
				if (this.categoryAttribute) {
					lastDisplayedEntryCategory = this._getEntry(this._lastEntryIndex)[this.categoryAttribute];
					newEntryCategory = this._getEntry(this._lastEntryIndex + 1)[this.categoryAttribute];
					previousNode = this._getPreviousCellNode(cell.domNode);
					nextNode = this._getNextCellNode(cell.domNode);
					lastCellNode = this._getLastCellNode();
					lastCellIsCategoryHeader = this._nodeRendersCategoryHeader(lastCellNode);
					if (newEntryCategory === lastDisplayedEntryCategory && lastCellIsCategoryHeader) {
						// move the category node to the pool
						this._moveCellToPool(registry.byNode(lastCellNode));
					} else if (newEntryCategory !== lastDisplayedEntryCategory) {
						if (lastCellIsCategoryHeader && newEntryCategory !== this._getNodeCategoryHeader(lastCellNode)) {
							/////////////////////////////////
							// TODO: IS THIS CASE POSSIBLE ?
							/////////////////////////////////
							console.log("TODO: UPDATE THE CATEGORY OF THE CATEGORY HEADER");
						} else if (!lastCellIsCategoryHeader) {
							this._renderCategory(newEntryCategory, position);
						}
					}
					// Move the previous category header to the pool if necessary
					if (previousNode && this._nodeRendersCategoryHeader(previousNode) && nextNode && this._nodeRendersCategoryHeader(nextNode)) {
						this._moveCellToPool(registry.byNode(previousNode));
					}
				}
				this._placeCellNode(cell.domNode, position);
				if (updateSpacerHeight) {
					this._updateSpacerHeight(-updatedHeight);
				}
				this._lastEntryIndex++;
				this._updateCellWithEntry(cell, this._getEntry(this._lastEntryIndex), this._lastEntryIndex);
				updatedHeight += this._getCellHeight(cell);
			} else if (newPos === "top") {
				/////////////////////////////
				// move cell to the top
				/////////////////////////////
				if (this.categoryAttribute) {
					firstDisplayedEntryCategory = this._getEntry(this._firstEntryIndex)[this.categoryAttribute];
					newEntryCategory = this._getEntry(this._firstEntryIndex - 1)[this.categoryAttribute];
					previousNode = this._getPreviousCellNode(cell.domNode);
					nextNode = this._getNextCellNode(cell.domNode);
					firstCellNode = this._getFirstCellNode();
					firstCellIsCategoryHeader = this._nodeRendersCategoryHeader(firstCellNode);
					if (newEntryCategory === firstDisplayedEntryCategory && firstCellIsCategoryHeader) {
						console.log("TODO: PLACE THE CELL AFTER THE FIRST ONE, NOT DIRECTLY ON THE TOP");
					} else if (newEntryCategory !== firstDisplayedEntryCategory) {
						if (!firstCellIsCategoryHeader) {
							this._renderCategory(firstDisplayedEntryCategory, position);
						}
					}
					// Move the previous category header to the pool if necessary
					if (previousNode && this._nodeRendersCategoryHeader(previousNode) && (!nextNode || (nextNode && this._nodeRendersCategoryHeader(nextNode)))) {
						this._moveCellToPool(registry.byNode(previousNode));
					}
				}
				this._placeCellNode(cell.domNode, position);
				if (updateSpacerHeight) {
					this._updateSpacerHeight(updatedHeight);
				}
				this._firstEntryIndex--;
				this._updateCellWithEntry(cell, this._getEntry(this._firstEntryIndex), this._firstEntryIndex);
				updatedHeight += this._getCellHeight(cell);
				// TODO: IF IT WAS THE FIRST CELL, ALSO ADD A CATEGORY !?
				// make sure that the first entry always has its category header displayed
				if (this.categoryAttribute && this._firstEntryIndex === 0) {
					firstCellNode = this._getFirstCellNode();
					if (firstCellNode && !this._nodeRendersCategoryHeader(firstCellNode)) {
						this._renderCategory(this._getEntry(0)[this.categoryAttribute], "top");
					}
				}
			} else {
				throw "unsupported recycling position";
			}
			this._cellsHeight += updatedHeight;
		},

		_removeEntryCell: function (cell) {
			var nextNode, previousNode, firstCellNode;
			var cellHeight = this._getCellHeight(cell);
			if (this.categoryAttribute) {
				previousNode = this._getPreviousCellNode(cell.domNode);
				nextNode = this._getNextCellNode(cell.domNode);
				// Move the previous category header to the pool if necessary
				if (previousNode && this._nodeRendersCategoryHeader(previousNode)) {
					if (!nextNode || (nextNode && this._nodeRendersCategoryHeader(nextNode))) {
						this._moveCellToPool(registry.byNode(previousNode));
					}
				}
			}
			if (this._isScrollable && this.cellPages > 0) {
				// move the cell to the pool
				this._moveCellToPool(cell);
			} else {
				// destroy the cell
				cell.destroyRecursive();
				this._cellsHeight -= cellHeight;
			}
			// make sure that the first entry always has its category header displayed
			if (this.categoryAttribute && this._firstEntryIndex === 0) {
				firstCellNode = this._getFirstCellNode();
				if (firstCellNode && !this._nodeRendersCategoryHeader(firstCellNode)) {
					this._renderCategory(this._getEntry(0)[this.categoryAttribute], "top");
				}
			}
		},

		_moveCellToPool: function (cell, resizeSpacer, isFirstEntryCell, isLastEntryCell) {
			var cellIsCategoryHeader = this._nodeRendersCategoryHeader(cell.domNode);
			var removedHeight = this._getCellHeight(cell);
			var cellIsFirstEntryCell = (isFirstEntryCell != null) ? isFirstEntryCell : !cellIsCategoryHeader && (cell.domNode === this._getFirstCellNode());
			var cellIsLastEntryCell = (isLastEntryCell != null) ? isLastEntryCell : !cellIsCategoryHeader && (cell.domNode === this._getLastCellNode());
			if (resizeSpacer) {
				this._updateSpacerHeight(removedHeight);
			}
			// hide the cell
			domClass.add(cell.domNode, this.baseClass + this._cssSuffixes.pooled);
			this._cellsHeight -= removedHeight;
			domConstruct.place(cell.domNode, this.containerNode, 0);
			this._hiddenCellsOnTop += 1;
			if (cellIsCategoryHeader) {
				this._renderedCategoriesPool.push(cell);
			} else {
				this._renderedEntriesPool.push(cell);
				if (cellIsFirstEntryCell) {
					this._firstEntryIndex++;
				} else if (cellIsLastEntryCell) {
					this._lastEntryIndex--;
				}
			}
			return removedHeight;
		},

		_updateSpacerHeight: function (addedValue) {
			if (!addedValue) {
				return;
			} else {
				this._spacerHeight += addedValue;
			}
			if (this._spacerHeight < 0) { // make sure the height is not negative otherwise it may be ignored
				this._spacerHeight = 0;
			}
			this._getSpacerNode().style.height = this._spacerHeight + "px";
		},

		_addEntryCell: function (entry, entryIndex, pos) {
			if (pos === "bottom") {
				var lastCategory = this.categoryAttribute && (this._lastEntryIndex != null && this._lastEntryIndex >= 0) ? this._getEntry(this._lastEntryIndex)[this.categoryAttribute] : null;
				if (this.categoryAttribute && entry[this.categoryAttribute] !== lastCategory) {
					// TODO: CHECK THAT THE FIRST CELL IS NOT ALREADY DISPLAYING THIS CATEGORY HEADER
					// create a category header
					this._renderCategory(entry[this.categoryAttribute], "bottom");
				}
			} else if (pos === "top") {
				var firstCategory = this.categoryAttribute && (this._firstEntryIndex != null && this._firstEntryIndex >= 0) ? this._getEntry(this._firstEntryIndex)[this.categoryAttribute] : null;
				if (this.categoryAttribute && entry[this.categoryAttribute] !== firstCategory) {
					// TODO: CHECK THAT THE LAST CELL IS NOT ALREADY DISPLAYING THIS CATEGORY HEADER
					// create a category header
					this._renderCategory(firstCategory, "top");
				}
			}
			this._placeCell(this._getCellForEntry(entry, entryIndex), pos);
		},

		_getCellForEntry: function (entry, entryIndex) {
			var renderedEntry = this._renderedEntriesPool.shift();
			if (!renderedEntry) {
				renderedEntry = new this.entriesRenderer({tabindex: "-1"});
				domClass.add(renderedEntry.domNode, this.baseClass + this._cssSuffixes.entry);
				renderedEntry.startup();
			}
			this._updateCellWithEntry(renderedEntry, entry, entryIndex);
			return renderedEntry;
		},

		_updateCellWithEntry: function (cell, entry, entryIndex) {
			cell._setEntryIndexAttr(entryIndex);
			cell._setEntryAttr(entry);
//			cell.set("entryIndex", entryIndex);
//			cell.set("entry", entry);
			//////////////////////////////////
			// TODO: UPDATE OR REMOVE THIS ? (NOTIFY RENDERER OF ITS SELECTION STATUS ?)
			//////////////////////////////////
			this._setSelectionStyle(cell.domNode, entryIndex);
			this._setCellEntryIndex(cell, entryIndex);
			this._setCellCategoryHeader(cell, null);
		},

		_renderCategory: function (category, pos) {
			this._placeCell(this._getCellForCategory(category), pos);
		},

		_getCellForCategory: function (category) {
			var renderedCategory = this._renderedCategoriesPool.shift();
			if (renderedCategory) {
				renderedCategory._setCategoryAttr(category);
//				renderedCategory.set("category", category);
			} else {
				renderedCategory = new this.categoriesRenderer({category: category, tabindex: "-1"});
				domClass.add(renderedCategory.domNode, this.baseClass + this._cssSuffixes.category);
				renderedCategory.startup();
			}
			this._setCellEntryIndex(renderedCategory, null);
			this._setCellCategoryHeader(renderedCategory, category);
			return renderedCategory;
		},

		_placeCell: function (cell, pos) {
			var addedHeight = 0;
			var fromCache = domClass.contains(cell.domNode, this.baseClass + this._cssSuffixes.pooled);
			if (fromCache) {
				this._hiddenCellsOnTop -= 1;
				// move the node to the bottom before displaying it and getting its height, to avoid flickering
				this._placeCellNode(cell.domNode, "bottom");
				domClass.remove(cell.domNode, this.baseClass + this._cssSuffixes.pooled);
				addedHeight = this._getCellHeight(cell);
				if (pos !== "bottom") {
					this._placeCellNode(cell.domNode, pos);
				}
			} else {
				this._placeCellNode(cell.domNode, pos);
				addedHeight = this._getCellHeight(cell);
			}
			this._cellsHeight += addedHeight;
			if (pos === "top") {
				this._updateSpacerHeight(-addedHeight);
			}
		},

		_placeCellNode: function (node, pos) {
			// TODO: USE INDEX POSITION FOR BETTER PERFORMANCES
			var refNode = null, position = null;
			if (pos === "bottom") {
				refNode = this._getLastCellNode();
				position = "after";
			} else if (pos === "top") {
				refNode = this._getFirstCellNode();
				position = "before";
			}
			if (refNode) {
				domConstruct.place(node, refNode, position);
			} else {
				domConstruct.place(node, this.containerNode);
			}
		},

		/////////////////////////////////////////////////
		// TODO: MOVE THIS TO THE ENTRY RENDERER ???
		/////////////////////////////////////////////////
		_setSelectionStyle: function (cellNode, entryIndex) {
			if (this.selectionMode !== "none") {
				if (this.isItemSelected(entryIndex)) {
					domClass.add(cellNode, this.baseClass + this._cssSuffixes.selected);
				} else {
					domClass.remove(cellNode, this.baseClass + this._cssSuffixes.selected);
				}
			}
		},

		_getSpacerNode: function () {
			return this._topNode.children[0];
		},

		_getNextCellNode: function (cellNode) {
			return cellNode.nextElementSibling;
		},

		_getPreviousCellNode: function (cellNode) {
			var node = cellNode.previousElementSibling;
			if (node && !domClass.contains(node, this.baseClass + this._cssSuffixes.pooled)) {
				return node;
			} else {
				return null;
			}
		},

		_getFirstCellNode: function () {
			var firstCellNode = this._getCellNodeByEntryIndex(this._firstEntryIndex);
			if (this.categoryAttribute) {
				var previousNode = null;
				if (firstCellNode) {
					previousNode = firstCellNode.previousElementSibling;
					if (previousNode && domClass.contains(previousNode, this.baseClass + this._cssSuffixes.category) && !domClass.contains(previousNode, this.baseClass + this._cssSuffixes.pooled)) {
						firstCellNode = previousNode;
					}
				}
			}
			return firstCellNode;
		},

		_getLastCellNode: function () {
			var lastCellNode = this._getCellNodeByEntryIndex(this._lastEntryIndex);
			if (this.categoryAttribute) {
				var nextNode = null;
				if (lastCellNode) {
					nextNode = lastCellNode.nextElementSibling;
					if (nextNode && domClass.contains(nextNode, this.baseClass + this._cssSuffixes.category)) {
						lastCellNode = nextNode;
					}
				}
			}
			return lastCellNode;
		},

		_getCellNodeByEntryIndex: function (entryIndex) {
			var node = null, nodeId = this._cellEntryIds[entryIndex];
			if (nodeId) {
				node = dom.byId(nodeId);
			}
			return node;
		},

		_getCellEntryIndex: function (cell) {
			var index = this._cellEntryIds.indexOf(cell.id);
			return index < 0 ? null : index;
		},

		_setCellEntryIndex: function (cell, entryIndex) {
				var index = this._cellEntryIds.indexOf(cell.id);
				if (index >= 0) {
					this._cellEntryIds[index] = null;
				}
			if (entryIndex != null) {
				this._cellEntryIds[entryIndex] = cell.id;
			}
		},

		_getNodeCategoryHeader: function (node) {
			return this._cellCategoryHeaders[node.id];
		},

		_setCellCategoryHeader: function (cell, categoryName) {
			if (categoryName === null) {
				delete this._cellCategoryHeaders[cell.id];
			} else {
				this._cellCategoryHeaders[cell.id] = categoryName;
			}
		},

		_getParentCell: function (node) {
			var currentNode = dom.byId(node);
			while(currentNode) {
				if (currentNode.parentNode && domClass.contains(currentNode.parentNode, this.baseClass + this._cssSuffixes.container)) {
					break;
				}
				currentNode = currentNode.parentNode;
			}
			if (currentNode) {
				return registry.byNode(currentNode);
			} else {
				return null;
			}
		},

		_centerOfListAboveCenterOfViewport: function () {
			return (this._visibleHeight / 2) - this.getCurrentScroll() - this._spacerHeight > (this._cellsHeight / 2);
		},

		_nodeRendersCategoryHeader: function (node) {
			return (this._getNodeCategoryHeader(node) != null);
		},

		/////////////////////////////////
		// Keyboard navigation (_KeyNavMixin implementation)
		/////////////////////////////////

		// Handle keydown events
		_onContainerKeydown: function (evt) {
			var continueProcessing = true, cell = this._getFocusedCell();
			if (cell && cell.onKeydown) {
				continueProcessing = cell.onKeydown(evt);
			}
			if (continueProcessing !== false) { // onKeydown implementation can return false to cancel the default action
				if ((evt.keyCode === keys.SPACE && !this._searchTimer)|| evt.keyCode === keys.ENTER) {
					this._onActionKeydown(evt);
				}
			}
			this.inherited(arguments);
		},

		// Handle SPACE and ENTER keys
		_onActionKeydown: function (evt) {
			if (this.selectionMode !== "none") {
				evt.preventDefault();
				this._handleSelection(event);
			}
		},

		childSelector: function (child) {
			return child;
		},

		_getFirst: function () {
			var node = this._getFirstCellNode();
			while (node) {
				if (this._topOfNodeIsBelowTopOfViewport(node)) {
					break;
				}
				node = node.nextElementSibling;
			}
			if (node) {
				return registry.byNode(node);
			} else {
				return null;
			}
		},

		_getLast: function () {
			var node = this._getLastCellNode();
			while (node) {
				if (this._bottomOfNodeIsBeforeTopOfViewport(node)) {
					break;
				}
				node = node.previousElementSibling;
			}
			if (node) {
				return registry.byNode(node);
			} else {
				return null;
			}
		},

		_getNext: function (child, dir) {
			var focusedCell, refChild, nextChild;
			if (this.focusedChild) {
				focusedCell = this._getFocusedCell();
				if (focusedCell === this.focusedChild) {
					// The cell itself has the focus
					refChild = child || this.focusedChild;
					if (refChild) {
						nextChild = refChild.domNode[(dir === 1) ? "nextElementSibling" : "previousElementSibling"]; // do not use _nextCellNode and _previousCellNode as we want to include the pageloader if it exists
						if (nextChild) {
							return registry.byNode(nextChild);
						}
					}
					return null;
				} else {
					// A descendant of the cell has the focus
					// FIXME: can it be a category header, with no _getNextFocusableChild method ?
					return focusedCell._getNextFocusableChild(child, dir);
				}
			} else {
				return dir === 1 ? this._getFirst() : this._getLast();
			}
		},

		_onLeftArrow: function () {
			var nextChild;
			if (this._getFocusedCell()._getNextFocusableChild) {
				nextChild = this._getFocusedCell()._getNextFocusableChild(null, -1);
				if (nextChild) {
					this.focusChild(nextChild);
				}
			}
		},

		_onRightArrow: function () {
			var nextChild;
			if (this._getFocusedCell()._getNextFocusableChild) {
				nextChild = this._getFocusedCell()._getNextFocusableChild(null, 1);
				if (nextChild) {
					// TODO: TURN THE NODE INTO A WIDGET ???
					this.focusChild(nextChild);
				}
			}
		},

		_onDownArrow: function () {
			this._focusNextChild(1);
		},

		_onUpArrow: function () {
			this._focusNextChild(-1);
		},

		_focusNextChild: function (dir) {
			var child, cell = this._getFocusedCell();
			if (cell === this.focusedChild) {
				child = this._getNext(cell, dir);
				if (!child) {
					child = cell;
				}
			} else {
				child = cell;
			}
			this.focusChild(child);
		},

		_getFocusedCell: function () {
			return this.focusedChild ? this._getParentCell(this.focusedChild.domNode) : null;
		},

		_topOfNodeIsBelowTopOfViewport: function (node) {
			return this._topOfNodeDistanceToTopOfViewport(node) >= 0;
		},

		_topOfNodeDistanceToTopOfViewport: function (node) {
			return node.offsetTop + this.getCurrentScroll();
		},

		_bottomOfNodeIsBeforeTopOfViewport: function (node) {
			return this._bottomOfNodeDistanceToBottomOfViewport(node) <= 0;
		},

		_bottomOfNodeDistanceToBottomOfViewport: function (node) {
			return node.offsetTop + node.offsetHeight + this.getCurrentScroll() - this._visibleHeight;
		},

		/////////////////////////////////
		// Other event handlers
		/////////////////////////////////

		_registerEventHandlers: function () {
			if (this.selectionMode !== "none") {
				this.on("click", lang.hitch(this, "_handleSelection"));
			}
		},

		_handleSelection: function (event) {
			var entryIndex, entrySelected, eventCell;
			eventCell = this._getParentCell(event.target);
			entryIndex = this._getCellEntryIndex(eventCell);
			if (entryIndex != null) {
				entrySelected = !this.isItemSelected(entryIndex);
				this.setSelected(entryIndex, entrySelected);
				this.emit(entrySelected ? "entrySelected" : "entryDeselected", {entryIndex: entryIndex});
			}
		}

	});
});