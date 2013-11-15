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
		baseClass: "duiRoundRectList",

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
		_topSpacerHeight: 0, // the height of the spacer element on top of the list
		_bottomSpacerHeight: 0, // the height of the spacer element at the bottom of the list
		_cellsHeight: 0, // the total height of the cells
		_firstEntryIndex: 0, // index of the entry in the first entry cell
		_lastEntryIndex: null, // index of the entry in the last entry cell
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

		// Register a handler for a type of events generated in any of the list cells.
		// Parameters:
		//		event: the type of events ("click", ...)
		//		handler: the event handler
		// When the event handler is called, it receive the list as its first parameter, the event
		// as its second and the index of the list entry displayed in the cell.
		// TODO: WHAT IF THE CELL IS A CATEGORY HEADER ???
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
						// TODO: Pass the parentCell INSTEAD of the entry index, as it contains itself the entry index and the entry ?
						return handler.call(that, e, that._getCellEntryIndex(parentCell));
					}
				}
			});
		},

		// Notify the list widget that cells geometry has been updated.
		geometryUpdated: function () {
			if (this._isScrollable) { // we only care about _cellsHeight when the list is scrollable
				this._cellsHeight = this._getNodeHeight(this.domNode) - this._topSpacerHeight;
			}
		},

		addEntry: function (entry, entryIndex) {
			/////////////////////////////////
			// TODO: IMPLEMENT THIS
			/////////////////////////////////
		},

		deleteEntry: function (entryIndex) {
			var cell, node = this._getCellNodeByEntryIndex(entryIndex);
			// Make sure that the cell is not selected before removing it
			if(this.isItemSelected(entryIndex)){
				this.setSelected(entryIndex, false);
			}
			// Update the model
			this.entries.splice(entryIndex, 1);
			this._cellEntryIds.splice(entryIndex, 1);
			if (entryIndex < this._firstEntryIndex) {
				this._firstEntryIndex--;
			}
			if (entryIndex <= this._lastEntryIndex) {
				this._lastEntryIndex--;
			}
			// Then update the rendering
			if (node) {
				cell = registry.byNode(node);
				if (this._isScrollable) {
					if (this.cellPages > 0) {
						if (this._lastEntryIndex < this._getEntriesCount() - 1) {
							this._recycleEntryCell(cell, "bottom");
						} else if (this._firstEntryIndex > 0) {
							this._recycleEntryCell(cell, "top");
						} else {
							this._removeCell(cell);
						}
						this._updateVirtualHeight();
					} else {
						this._removeCell(cell);
					}
				} else {
					this._removeCell(cell);
				}
			}
			/////////////////////////////////////////////////////////////////////
			// TODO: IF DELETED CELL HAD FOCUS, MOVE THE FOCUS
			/////////////////////////////////////////////////////////////////////
		},

		moveEntry: function (entryIndex, newIndex) {
			/////////////////////////////////
			// TODO: IMPLEMENT THIS
			/////////////////////////////////
			console.log("TODO: move entry " + entryIndex + " to " + newIndex);
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
				for (var i = 0; i < entryIndexes.length; i++) {
					entryIndex = entryIndexes[i];
					node = this._getCellNodeByEntryIndex(entryIndex);
					if (node) {
						this._setSelectionStyle(node, entryIndex);
					}
				}
			}
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_renderEntries: function () {
			this._appendNewCells();
			if (!this._initialized) {
				this._toggleListLoadingStyle();
				this._registerEventHandlers();
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

		_appendNewCells: function () {
			var entryIndex = this._lastEntryIndex != null ? this._lastEntryIndex + 1 : this._firstEntryIndex;
			var currentEntry;
			// Create cells using renderers
			for (; entryIndex < this._getEntriesCount(); entryIndex++) {
				if (this._isScrollable && (this.cellPages > 0) && (this._cellsHeight > (this.cellPages * this._visibleHeight))) {
					this._updateVirtualHeight();
					break;
				}
				currentEntry = this._getEntry(entryIndex);
				this._placeCell(this._getCellForEntry(currentEntry, entryIndex), "bottom");
				this._lastEntryIndex = entryIndex;
			}
		},

		_updateVirtualHeight: function () {
			// estimate the total size of the list
			var numberOfDisplayedEntries = this._lastEntryIndex - this._firstEntryIndex + 1;
			var averageCellHeight = Math.round(this._cellsHeight / numberOfDisplayedEntries);
			var bottomVirtualHeight = (this._getEntriesCount() - (this._lastEntryIndex ? this._lastEntryIndex + 1 : 1))
										* averageCellHeight;
			this._updateBottomSpacerHeight(bottomVirtualHeight - this._bottomSpacerHeight);
		},

		// TODO: RENAME AS _recycleEntryCells ?
		_recycleCells: function (fromBottomToTop) {
			var node, cell, recycled = false;
			// First recycle the entry cells that are currently in the pool
			if (fromBottomToTop) {
				while(this._renderedEntriesPool.length > 0 && this._firstEntryIndex > 0) {
					this._placeCell(this._getCellForEntry(this._getEntry(this._firstEntryIndex - 1), this._firstEntryIndex - 1), "top");
					this._firstEntryIndex--;
					recycled = true;
				}
			} else {
				while(this._renderedEntriesPool.length > 0 && this._lastEntryIndex < this._getEntriesCount() -1) {
					this._placeCell(this._getCellForEntry(this._getEntry(this._lastEntryIndex + 1), this._lastEntryIndex + 1), "bottom");
					this._lastEntryIndex++;
					recycled = true;
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
								this._removeCell(registry.byNode(node));
							}
						}
						cell = registry.byNode(this._getLastCellNode());
						this._lastEntryIndex--;
						this._recycleEntryCell(cell, "top");
						recycled = true;
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
								this._removeCell(registry.byNode(node), true);
							}
						}
						cell = registry.byNode(this._getFirstCellNode());
						this._firstEntryIndex++;
						this._recycleEntryCell(cell, "bottom", true);
						recycled = true;
					} else {
						break;
					}
				}
			}
			// update virtual height if needed
			if (recycled) {
				this._updateVirtualHeight();
			}
		},

		_placeCell: function (cell, pos, resizeSpacer) {
			var refNode = (pos === "top" ? this._getFirstCellNode() : this._getLastCellNode()),
				position = (pos === "top" ? "before" : "after"),
				cellHeight = 0,
				fromCache = domClass.contains(cell.domNode, this.baseClass + this._cssSuffixes.pooled),
				cellIsCategoryHeader = this._nodeRendersCategoryHeader(cell.domNode),
				entryCategory, refNodeIsCategoryHeader, refNodeCategory, newCategoryCell;
			// Update category headers if necessary before placing an entry cell
			if (this.categoryAttribute && !cellIsCategoryHeader) {
				entryCategory = cell.entry[this.categoryAttribute];
				if (refNode) {
					refNodeIsCategoryHeader = this._nodeRendersCategoryHeader(refNode);
					refNodeCategory = refNodeIsCategoryHeader ? this._getNodeCategoryHeader(refNode) : this._getEntry(this._getCellEntryIndex(refNode))[this.categoryAttribute];
					if (entryCategory === refNodeCategory) { // same category
						if (pos === "top") {
							if (refNodeIsCategoryHeader) {
								// place the cell after the category header
								position = "after";
							} else {
								// add a category cell for the new entry cell
								newCategoryCell = this._getCellForCategory(entryCategory);
								this._placeCell(newCategoryCell, pos, resizeSpacer);
								refNode = newCategoryCell.domNode;
								position = "after";
							}
						}
					} else { // new category
						if (pos === "top" && !refNodeIsCategoryHeader) {
							// add a category cell for the following entry cell
							newCategoryCell = this._getCellForCategory(refNodeCategory);
							this._placeCell(newCategoryCell, pos, resizeSpacer);
						}
						// add a category cell for the new entry cell
						newCategoryCell = this._getCellForCategory(entryCategory);
						this._placeCell(newCategoryCell, pos, resizeSpacer);
						refNode = newCategoryCell.domNode;
						position = "after";
					}
				} else {
					// Empty list: create the first category
					newCategoryCell = this._getCellForCategory(entryCategory);
					this._placeCell(newCategoryCell, "bottom", resizeSpacer);
				}
			}
			// Place the cell and update the list geometry
			if (fromCache) {
				this._hiddenCellsOnTop -= 1;
				// move the node to the bottom before displaying it and getting its height, to avoid flickering
				this._placeCellNode(cell.domNode, this.containerNode);
				domClass.remove(cell.domNode, this.baseClass + this._cssSuffixes.pooled);
				if (pos !== "bottom") {
					if (refNode) {
						this._placeCellNode(cell.domNode, refNode, position);
					} else {
						this._placeCellNode(cell.domNode, this.containerNode);
					}
				}
			} else {
				if (refNode) {
					this._placeCellNode(cell.domNode, refNode, position);
				} else {
					this._placeCellNode(cell.domNode, this.containerNode);
				}
			}
			cellHeight = this._getCellHeight(cell);
			this._cellsHeight += cellHeight;
			if (resizeSpacer) {
				this._updateTopSpacerHeight(-cellHeight);
			}
		},

		_placeCellNode: function (node, refNode, pos) {
			domConstruct.place(node, refNode, pos);
		},

		_removeCell: function (cell, resizeSpacer) {
			var cellHeight = this._getCellHeight(cell),
				cellIsCategoryHeader = this._nodeRendersCategoryHeader(cell.domNode);
			// Update category headers before removing the cell, if necessary
			this._updateCategoryHeaderBeforeCellDisappear(cell, resizeSpacer);
			// remove the cell
			if (this._isScrollable && this.cellPages > 0) {
				/////////////////////////////////////////////////////
				// FIXME: REMOVE THIS CALCULATION (see next FIXME)
				/////////////////////////////////////////////////////
				var cellIsFirstEntryCell = !cellIsCategoryHeader && (cell.domNode === this._getFirstCellNode());
				var cellIsLastEntryCell = !cellIsCategoryHeader && (cell.domNode === this._getLastCellNode());
				if (resizeSpacer) {
					this._updateTopSpacerHeight(cellHeight);
				}
				// hide the cell
				domClass.add(cell.domNode, this.baseClass + this._cssSuffixes.pooled);
				this._placeCellNode(cell.domNode, this.containerNode, 0);
				this._hiddenCellsOnTop += 1;
				if (cellIsCategoryHeader) {
					this._renderedCategoriesPool.push(cell);
				} else {
					this._renderedEntriesPool.push(cell);
					/////////////////////////////////////////////////////
					// FIXME: UPDATE THIS IN THE CODE THAT CALLS THE _removeCell FUNCTION !!!
					/////////////////////////////////////////////////////
					if (cellIsFirstEntryCell) {
						this._firstEntryIndex++;
					} else if (cellIsLastEntryCell) {
						this._lastEntryIndex--;
					}
				}
			} else {
				cell.destroyRecursive();
			}
			this._cellsHeight -= cellHeight;
		},

		_updateCategoryHeaderBeforeCellDisappear: function (cell, resizeSpacer) {
			var cellIsCategoryHeader = this._nodeRendersCategoryHeader(cell.domNode),
				nextNode, previousNode;
			if (this.categoryAttribute && !cellIsCategoryHeader) {
				previousNode = this._getPreviousCellNode(cell.domNode);
				// remove the previous category header if necessary
				if (previousNode && this._nodeRendersCategoryHeader(previousNode)) {
					nextNode = this._getNextCellNode(cell.domNode);
					if (!nextNode || (nextNode && this._nodeRendersCategoryHeader(nextNode))) {
						this._removeCell(registry.byNode(previousNode), resizeSpacer);
					}
				}
			}
		},

		_recycleEntryCell: function (cell, newPos, resizeSpacer) {
			var cellHeight = this._getCellHeight(cell);
			this._updateCategoryHeaderBeforeCellDisappear(cell, resizeSpacer);
			this._cellsHeight -= cellHeight;
			if (resizeSpacer) {
				this._updateTopSpacerHeight(cellHeight);
			}
			if (newPos === "bottom") {
				this._updateCellWithEntry(cell, this._getEntry(this._lastEntryIndex + 1), this._lastEntryIndex + 1);
			} else { // newPos === "top"
				this._updateCellWithEntry(cell, this._getEntry(this._firstEntryIndex - 1), this._firstEntryIndex - 1);
			}
			this._placeCell(cell, newPos, newPos === "top");
			newPos === "bottom" ? this._lastEntryIndex++ : this._firstEntryIndex--;
		},

		_updateTopSpacerHeight: function (addedValue) {
			if (!addedValue) {
				return;
			} else {
				this._topSpacerHeight += addedValue;
			}
			if (this._topSpacerHeight < 0) { // make sure the height is not negative otherwise it may be ignored
				this._topSpacerHeight = 0;
			}
			this._getTopSpacerNode().style.height = this._topSpacerHeight + "px";
		},

		_updateBottomSpacerHeight: function (addedValue) {
			if (!addedValue) {
				return;
			} else {
				this._bottomSpacerHeight += addedValue;
			}
			if (this._bottomSpacerHeight < 0) { // make sure the height is not negative otherwise it may be ignored
				this._bottomSpacerHeight = 0;
			}
			this._getBottomSpacerNode().style.height = this._bottomSpacerHeight + "px";
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

		_getTopSpacerNode: function () {
			return this._topNode.children[0];
		},

		_getBottomSpacerNode: function () {
			return this._bottomNode;
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
			while (currentNode) {
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
			return (this._visibleHeight / 2) - (this._isScrollable ? this.getCurrentScroll() : 0) - this._topSpacerHeight > (this._cellsHeight / 2);
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
				if (this._bottomOfNodeIsBeforeBottomOfViewport(node)) {
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
			var focusedCell, refChild, nextChild, returned = null;
			if (this.focusedChild) {
				focusedCell = this._getFocusedCell();
				if (focusedCell === this.focusedChild) {
					// The cell itself has the focus
					refChild = child || this.focusedChild;
					if (refChild) {
						nextChild = refChild.domNode[(dir === 1) ? "nextElementSibling" : "previousElementSibling"]; // do not use _nextCellNode and _previousCellNode as we want to include the pageloader if it exists
						if (nextChild) {
							returned = registry.byNode(nextChild);
						}
					}
				} else {
					// A descendant of the cell has the focus
					// FIXME: can it be a category header, with no _getNextFocusableChild method ?
					returned = focusedCell._getNextFocusableChild(child, dir);
				}
			} else {
				returned = (dir === 1 ? this._getFirst() : this._getLast());
			}
			return returned;
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
			return node.offsetTop + (this._isScrollable ? this.getCurrentScroll() : 0);
		},

		_bottomOfNodeIsBeforeBottomOfViewport: function (node) {
			return this._bottomOfNodeDistanceToBottomOfViewport(node) <= 0;
		},

		_bottomOfNodeDistanceToBottomOfViewport: function (node) {
			return node.offsetTop + node.offsetHeight + (this._isScrollable ? this.getCurrentScroll() : 0) - this._visibleHeight;
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