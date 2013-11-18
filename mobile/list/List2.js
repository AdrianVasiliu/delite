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
		_firstEntryIndex: 0, // index of the entry in the first entry cell
		_lastEntryIndex: null, // index of the entry in the last entry cell
		_cellEntryIds: null,
		_cellCategoryHeaders: null,
		_topNode: null,
		_bottomNode: null,

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		postMixInProperties: function () {
			this.inherited(arguments);
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
			// TODO: use when(this._renderEntries(), function () {
			//		this._toggleListLoadingStyle();
			//		this._registerEventHandlers();
			//		this._initialized = true;
			// }); AND REMOVE initit code from _renderEntries .????
			this._renderEntries();
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
				this._removeCell(cell);
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

		_destroyPageOfCells: function (firstEntryIndex, lastEntryIndex) {
			// TODO
		},

		_createPageOfCells: function (firstEntryIndex, lastEntryIndex) {
			var currentIndex = firstEntryIndex,
				currentEntry,
				previousEntry = firstEntryIndex > 0 ? this._getEntry(firstEntryIndex - 1) : null;
			var documentFragment = document.createDocumentFragment();
			for (; currentIndex <= lastEntryIndex; currentIndex++) {
				currentEntry = this._getEntry(currentIndex);
				if (this.categoryAttribute) {
					if (!previousEntry || currentEntry[this.categoryAttribute] !== previousEntry[this.categoryAttribute]) {
						documentFragment.appendChild(this._createCategoryCell(currentEntry[this.categoryAttribute]).domNode);
					}
				}
				documentFragment.appendChild(this._createEntryCell(currentEntry, currentIndex).domNode);
				previousEntry = currentEntry;
			}
			return documentFragment;
		},

		_appendNewCells: function () {
			var firstEntryIndex = this._lastEntryIndex != null ? this._lastEntryIndex + 1 : this._firstEntryIndex;
			this.containerNode.appendChild(this._createPageOfCells(firstEntryIndex, this._getEntriesCount() - 1));
			this._lastEntryIndex = this._getEntriesCount() - 1;
		},

		_removeCell: function (cell, resizeSpacer) {
			var cellHeight = this._getCellHeight(cell),
				cellIsCategoryHeader = this._nodeRendersCategoryHeader(cell.domNode);
			// Update category headers before removing the cell, if necessary
			this._updateCategoryHeaderBeforeCellDisappear(cell, resizeSpacer);
			// remove the cell
			cell.destroyRecursive();
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

		_createEntryCell: function (entry, entryIndex) {
			var renderedEntry = new this.entriesRenderer({tabindex: "-1"});
			domClass.add(renderedEntry.domNode, this.baseClass + this._cssSuffixes.entry);
			renderedEntry.startup();
			renderedEntry._setEntryIndexAttr(entryIndex);
			renderedEntry._setEntryAttr(entry);
//			renderedEntry.set("entryIndex", entryIndex);
//			renderedEntry.set("entry", entry);
			//////////////////////////////////
			// TODO: UPDATE OR REMOVE THIS ? (NOTIFY RENDERER OF ITS SELECTION STATUS ?)
			//////////////////////////////////
			this._setSelectionStyle(renderedEntry.domNode, entryIndex);
			this._setCellEntryIndex(renderedEntry, entryIndex);
			this._setCellCategoryHeader(renderedEntry, null);
			return renderedEntry;
		},

 		_createCategoryCell: function (category) {
			var renderedCategory = new this.categoriesRenderer({category: category, tabindex: "-1"});
			domClass.add(renderedCategory.domNode, this.baseClass + this._cssSuffixes.category);
			renderedCategory.startup();
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
			return node.offsetTop - (this._isScrollable ? this.getCurrentScroll() : 0);
		},

		_bottomOfNodeIsBeforeBottomOfViewport: function (node) {
			return this._bottomOfNodeDistanceToBottomOfViewport(node) <= 0;
		},

		_bottomOfNodeDistanceToBottomOfViewport: function (node) {
			return node.offsetTop + node.offsetHeight - (this._isScrollable ? this.getCurrentScroll() : 0) - this._visibleHeight;
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