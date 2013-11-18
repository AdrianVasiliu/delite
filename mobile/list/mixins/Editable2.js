define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/_base/array",
        "dui/registry",
        "dojo/on",
        "dojo/dom",
        "dojo/dom-class",
        "dojo/dom-style",
        "dojo/dom-construct",
        "dojo/dom-geometry",
        "dojo/touch"
], function (declare, lang, array, registry, on, dom, domClass, domStyle, domConstruct, domGeometry, touch) {

	return declare(null, {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		moveable: true, // Should be a statefull property
		
		deleteable: true,  // Should be a statefull property
		
		deleteFromStore: true,

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_indexOfDeleteableEntry: -1,
		_touchHandlersRefs: null,
		_placeHolderNode: null,
		_placeHolderNodeClientRect: null,
		_draggedCell: null,
		_touchStartY: null,
		_startTop: null,
		_draggedCellTop: null,
		_draggedEntryIndex: null,
		_dropPosition: -1,

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		setEditableMode: function (moveable, deleteable) {
			this.moveable = moveable;
			this.deleteable = deleteable;
			// TODO: EVENT HANDLERS, RENDERING, ETC...
		},

		// Called before the deletion of an entry through the UI delete action.
		// If it returns false, the entry is not deleted. The entry is deleted
		// if it returns any other value.
		// TODO: RENAME "beforeEntryDelete" or "beforeEntryDeletion" ?
		onEntryDelete: function (entry, entryIndex) {
			// to be implemented
		},

		onEntryMove: function(entry, originalIndex, newIndex) {
			// to be immplemented
		},

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		postMixInProperties: function(){
			this.inherited(arguments);
			this._touchHandlersRefs = [];
			if (this.categoryAttribute) {
				this.moveable = false; // movinf entries not yet supported on categorized lists
			}
		},

		postCreate: function () {
			this.inherited(arguments);
			if (this.deleteable) {
				this.onCellEvent("click", lang.hitch(this, "_onCellClick"));
			}
			if (this.moveable) {
				this.on(touch.press, lang.hitch(this, "_onEditableTouchPress"));
			}
		},

		destroy: function () {
			this.inherited(arguments);
			if (this._rightEditNode) {
				if (this._rightEditNode.parentNode) {
					this._rightEditNode.parentNode.removeChild(this._rightEditNode);
				}
				delete this._rightEditNode;
			}
		},

		/////////////////////////////////
		// List methods
		/////////////////////////////////

		_handleSelection: function (event) {
			if (this.deleteable) {
				// cannot select / unselect entries why the list is deleteable
				return;
			}
			this.inherited(arguments);
		},

		deleteEntry: function (entryIndex, removeFromStore) {
			if (this.onEntryDelete(this.entries[entryIndex], entryIndex) !== false) {
				this.inherited(arguments);
			}
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_showDeleteButton: function (entryIndex) {
			// TODO: USE i18n string
			this._setRightEditNodeInnerHTML(entryIndex,
					"<div class='" + this.baseClass + "-deleteButton'>delete</div>");
		},

		_hideDeleteButton: function (entryIndex) {
			// TODO: USE i18n strings
			var innerHTML = this.moveable
					? "<div class='duiDomButtonGrayKnob' style='cursor: move;'><div><div><div></div></div></div></div></div>"
					: "<div></div>";
			this._setRightEditNodeInnerHTML(entryIndex, innerHTML);
		},

		_setRightEditNodeInnerHTML: function (entryIndex, innerHTML) {
			var cellNode = this._getCellNodeByEntryIndex(entryIndex);
			if (cellNode) {
				cellNode.children[2].innerHTML = innerHTML;
			}
		},

		_isRightEditNodeDescendant: function (node) {
			var currentNode = node;
			while (currentNode) {
				if (domClass.contains(currentNode, "duiListEntryRightEdit")) {
					return true;
				}
				currentNode = currentNode.parentNode;
			}
			return false;
		},

		////////////////////////////////////
		// TODO: SUPPORT DELETETION / ADDITIONS AT THE STORE LEVEL
		//       (HERE OR IN StoreModel ?)
		////////////////////////////////////

		////////////////////////////////////
		// TODO: KEYBOARD NAVIGATION !!!
		////////////////////////////////////

		_createEntryCell: function (entry, entryIndex) {
			var cell = this.inherited(arguments);
			// This is a new cell
			if (this.deleteable || this.moveable) {
				// TODO: USE i18n string
				domConstruct.create("div", {innerHTML: this.moveable
					? "<div class='duiDomButtonGrayKnob' style='cursor: move;'><div><div><div></div></div></div></div></div>"
					: "<div></div>",
					className: "duiListEntryRightEdit"}, cell.domNode);
			}
			if (this.deleteable) {
				domConstruct.create("div", {innerHTML:
					"<div class='duiDomButtonRedCircleMinus'><div><div><div></div></div></div></div></div>",
					className: "duiListEntryLeftEdit"}, cell.domNode, 0);
			}
			return cell;
		},

		_onCellClick: function (evt, entryIndex) {
			var node = evt.target;
			var resetDeleteableEntry = true;
			if (this.deleteable) {
				while (node && !domClass.contains(node, this.baseClass + this._cssSuffixes.container)) {
					if (domClass.contains(node, "duiListEntryLeftEdit")) {
						if (this._indexOfDeleteableEntry === entryIndex) {
							// do nothing
							resetDeleteableEntry = false;
							break;
						} else if (this._indexOfDeleteableEntry >= 0) {
							this._hideDeleteButton(this._indexOfDeleteableEntry);
						}
						this._showDeleteButton(entryIndex);
						this._indexOfDeleteableEntry = entryIndex;
						resetDeleteableEntry = false;
						break;
					} else if (domClass.contains(node, "duiListEntryRightEdit")) {
						if (this._indexOfDeleteableEntry === entryIndex) {
							this._hideDeleteButton(entryIndex);
							this._indexOfDeleteableEntry = -1;
							this.deleteEntry(entryIndex, this.deleteFromStore);
						}
						break;
					}
					node = node.parentNode;
				}
			}
			if (resetDeleteableEntry && this._indexOfDeleteableEntry >= 0) {
				this._hideDeleteButton(this._indexOfDeleteableEntry);
				this._indexOfDeleteableEntry = -1;
			}
		},

		///////////////////////////////
		// Moveable implementation
		///////////////////////////////
		
		_onEditableTouchPress: function (event) {
			if (this._draggedCell) {
				return;
			}
			var cell = this._getParentCell(event.target);
			if (cell && this._isRightEditNodeDescendant(event.target)) {
				if (cell.entryIndex === this._indexOfDeleteableEntry) {
					return;
				}
				this._draggedCell = cell;
				this._draggedEntryIndex = cell.entryIndex;
				this._dropPosition = cell.entryIndex;
				this._placeHolderNode = domConstruct.create("li", {className: this.baseClass + this._cssSuffixes.entry});
				this._placeHolderNode.style.height = this._draggedCell.getHeight() + "px";
				this._placePlaceHolderNode(this._draggedCell.domNode, "after");
				this._setNodeDraggable(this._draggedCell.domNode, true);
				this._touchStartY = event.touches ? event.touches[0].pageY : event.pageY;
				this._startTop = domGeometry.getMarginBox(this._draggedCell.domNode).t;
				this._touchHandlersRefs.push(this.own(on(document, touch.release, lang.hitch(this, "_onEditableTouchRelease")))[0]);
				this._touchHandlersRefs.push(this.own(on(document, touch.move, lang.hitch(this, "_onEditableTouchMove")))[0]);
				event.preventDefault();
				event.stopPropagation();
			}
		},

		_onEditableTouchMove: function (event) {
			///////////////////////////////////////////////////////////
			// TODO: CATEGORIZED LISTS SUPPORT
			///////////////////////////////////////////////////////////
			var nextCellNode, previousCellNode,
				pageY = event.touches ? event.touches[0].pageY : event.pageY,
				clientY = event.touches ? event.touches[0].clientY : event.clientY;
			this._draggedCellTop = this._startTop + (pageY - this._touchStartY);
			this._stopEditableAutoScroll();
			this._draggedCell.domNode.style.top = this._draggedCellTop + "px";
			this._updatePlaceholderPosition(clientY);
			event.preventDefault();
			event.stopPropagation();
		},

		_updatePlaceholderPosition: function (clientY) {
			if (clientY < this._placeHolderNodeClientRect.top) {
				previousCellNode = this._getPreviousCellNode(this._placeHolderNode);
				if (previousCellNode === this._draggedCell.domNode) {
					previousCellNode = this._getPreviousCellNode(previousCellNode);
				}
				if (previousCellNode) {
					this._placePlaceHolderNode(previousCellNode, "before");
					this._dropPosition--;
				}
			} else if (clientY > this._placeHolderNodeClientRect.bottom) {
				nextCellNode = this._getNextCellNode(this._placeHolderNode);
				if (nextCellNode === this._draggedCell.domNode) {
					nextCellNode = this._getNextCellNode(nextCellNode);
				}
				if (nextCellNode) {
					this._placePlaceHolderNode(nextCellNode, "after");
					this._dropPosition++;
				}
			}
			if (this._isScrollable) {
				var viewportRect = this.getViewportClientRect();
				if (clientY < viewportRect.top + 15) {
					this._editableAutoScroll(-15, clientY);
				} else if (clientY > viewportRect.top + viewportRect.height - 15) {
					this._editableAutoScroll(15, clientY);
				} else {
					this._stopEditableAutoScroll();
				}
			}
		},

		_editableAutoScroll: function (rate, clientY) {
			this._editableAutoScrollID = setTimeout(lang.hitch(this, function () {
				var oldScroll = this._scroll;
				this.scrollBy(rate);
				setTimeout(lang.hitch(this, function () {
					if (this._scroll !== oldScroll) {
						if (this._placeHolderNode) {
							this._placeHolderNodeClientRect = this._placeHolderNode.getBoundingClientRect();
							this._startTop += rate;
							this._draggedCellTop += rate;
							this._draggedCell.domNode.style.top = this._draggedCellTop + "px";
							this._updatePlaceholderPosition(clientY);
						}
					}
				}));
			}), 50);
		},

		_stopEditableAutoScroll: function() {
			if (this._editableAutoScrollID) {
				clearTimeout(this._editableAutoScrollID);
				this._editableAutoScrollID = null;
			}
		},

		_onEditableTouchRelease: function (event) {
			if (this._draggedCell) {this._draggedEntryIndex
				if (this._dropPosition >= 0) {
					if (this._dropPosition !== this._draggedEntryIndex) {
						// TODO: ADD A HANDLER THAT IS ABLE TO CANCEL THE MOVE !!!
						this.moveEntry(this._draggedEntryIndex, this._dropPosition);
					}
					this._draggedEntryIndex = null;
					this._dropPosition = -1;
				}
				this.defer(function () { // iPhone needs setTimeout (via defer)
					this._setNodeDraggable(this._draggedCell.domNode, false);
					this._draggedCell = null;
				});
				array.forEach(this._touchHandlersRefs, function (handlerRef) {
					handlerRef.remove();
				});
				this._touchHandlersRefs = [];
				if (this._placeHolderNode) {
					this._placeHolderNode.parentNode.removeChild(this._placeHolderNode);
					this._placeHolderNode = null;
				}
				event.preventDefault();
				event.stopPropagation();
			}
		},

		_setNodeDraggable: function (node, draggable) {
			if (draggable) {
				domStyle.set(node, {
					width: domGeometry.getContentBox(node).w + "px",
					top: node.offsetTop + "px"
				});
				domClass.add(node, "duiListEntryDragged");
			} else {
				domClass.remove(node, "duiListEntryDragged");
				domStyle.set(node, {
					width: "",
					top: ""
				});
			}
			if (this._isScrollable) {
				this.disableTouchScroll = draggable;
			}
		},
		
		_placePlaceHolderNode: function (refNode, pos) {
			domConstruct.place(this._placeHolderNode, refNode, pos);
			this._placeHolderNodeClientRect = this._placeHolderNode.getBoundingClientRect();
		}

	});
});