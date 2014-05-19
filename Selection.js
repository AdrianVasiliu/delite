/** @module delite/Selection */
define(["dcl/dcl", "dojo/sniff", "./Widget"], function (dcl, has, Widget) {
	/**
	 * Mixin for widgets that manage a list of selected data items.
	 * @mixin module:delite/Selection
	 * @augments {module:delite/Widget}
	 */
	return dcl(Widget, {
		preCreate: function () {
			this._set("selectedItems", []);
		},
		
		/**
		 * @summary
		 * The chosen selection mode.
		 * @description
		 * Valid values are:
		 * 1. "none": No selection can be done.
		 * 2. "single": Only one item can be selected at a time.
		 * 3. "multiple": Several item can be selected using the control key modifier.
		 * Changing this value impacts the current selected items to adapt the selection to the new mode. However
		 * whatever the selection mode is you can always set several selected items using the selectItem(s) API.
		 * The mode will be enforced only when using setSelected and/or selectFromEvent APIs.
		 * @member {string}
		 * @default "single"
		 */
		selectionMode: "single",

		_setSelectionModeAttr: function (value) {
			if (value !== "none" && value !== "single" && value !== "multiple") {
				throw new TypeError("selectionMode invalid value");
			}
			if (value !== this.selectionMode) {
				this._set("selectionMode", value);
				if (value === "none") {
					this.selectedItems = null;
				} else if (value === "single" && this.selectedItem) {
					this.selectedItems = [this.selectedItem];
				}
			}
		},

		/**
		 * In single selection mode, the selected item or in multiple selection mode the last selected item.
		 * @member {Object}
		 * @default null
		 */
		selectedItem: null,

		_setSelectedItemAttr: function (value) {
			if (this.selectedItem !== value) {
				this.selectedItems = (value == null ? null : [value]);
			}
		},

		/**
		 * The list of selected items.
		 * @member {object[]}
		 * @default null
		 */
		selectedItems: null,

		_setSelectedItemsAttr: function (value) {
			var oldSelectedItems = this.selectedItems;

			this._set("selectedItems", value);

			if (oldSelectedItems != null && oldSelectedItems.length > 0) {
				this.updateRenderers(oldSelectedItems);
			}
			if (this.selectedItems && this.selectedItems.length > 0) {
				this._set("selectedItem", this.selectedItems[0]);
				this.updateRenderers(this.selectedItems);
			} else {
				this._set("selectedItem", null);
			}
		},

		_getSelectedItemsAttr: function () {
			return this._get("selectedItems") == null ? [] : this._get("selectedItems").concat();
		},

		/**
		 * @summary
		 * Tests if an event has a selection modifier.
		 * @description
		 * If it has a selection modifier, that means that:
		 *		*if selectionMode is "single", the event will be able to deselect a selected item
		 *		* if selectionMode is "multiple", the event will trigger the selection state of the item
		 * The default implementation of this method returns true if the event.ctrlKey attribute is
		 * true, which means that:
		 *		* if selectionMode is "single", the Ctrl (or Command on MacOS) key must be pressed for the
		 *		event to deselect the currently selected item
		 *		* if selectionMode is "multiple", the Ctrl (or Command on MacOS) key must be pressed for the
		 *		event to toggle the selection status of the item.
		 * @param {Event} event The event that lead to the selection 
		 * @returns {boolean} Whether the event has selection modifier
		 * @protected
		 */
		hasSelectionModifier: function (event) {
			return !has("mac") ? event.ctrlKey : event.metaKey;
		},

		/**
		 * Returns whether an item is selected or not.
		 * @param {item} object The item to test.
		 * @returns {Object} The item to test the selection for.
		 */
		isSelected: function (item) {
			if (this.selectedItems == null || this.selectedItems.length === 0) {
				return false;
			}
			var identity = this.getIdentity(item);
			return this.selectedItems.some(function (sitem) {
				return this.getIdentity(sitem) === identity;
			}, this);
		},

		/**
		 * This function must be implemented to return the id of a item.
		 * @param {item} object The item the identity of must be returned
		 * @returns {string} The identity of the item
		 */
		getIdentity: function (/*jshint unused: vars */item) {
		},

		/**
		 * This function must be implemented to update the rendering of the items based on whether they are
		 * selected or not. The implementation must check for their new selection state and update
		 * accordingly.
		 * @param {object[]} items The array of items changing their selection state
		 * @protected
		 */
		updateRenderers: function (/*jshint unused: vars */items) {
		},


		/**
		 * Change the selection state of an item.
		 * @param {Object} item The item to change the selection state for.
		 * @param {boolean] value True to select the item, false to deselect it.
		 */
		setSelected: function (item, value) {
			if (this.selectionMode === "none" || item == null) {
				return;
			}

			this._setSelected(item, value);
		},

		_setSelected: function (item, value) {
			// copy is returned
			var sel = this.selectedItems, res, identity;

			if (this.selectionMode === "single") {
				if (value) {
					this.selectedItem = item;
				} else if (this.isSelected(item)) {
					this.selectedItems = null;
				}
			} else { // multiple
				if (value) {
					if (this.isSelected(item)) {
						return; // already selected
					}
					if (sel == null) {
						sel = [item];
					} else {
						sel.unshift(item);
					}
					this.selectedItems = sel;
				} else {
					identity = this.getIdentity(item);
					res = sel ? sel.filter(function (sitem) {
						return this.getIdentity(sitem) !== identity;
					}, this) : [];
					if (res == null || res.length === sel.length) {
						return; // already not selected
					}
					this.selectedItems = res;
				}
			}
		},

		/**
		 * Applies selection triggered by an user interaction.
		 * @param {Event} event The source event of the user interaction.
		 * @param {Object} value The render item that has been selected/deselected.
		 * @param {Object} renderer The visual renderer of the selected/deselected item.
		 * @param {boolean} dispatch Whether an event must be dispatched or not.
		 * @returns {boolean} True if the selection has changed and false otherwise.
		 * @protected
		 */
		selectFromEvent: function (event, item, renderer, dispatch) {
			if (this.selectionMode === "none") {
				return false;
			}

			return this._selectFromEvent(event, item, renderer, dispatch);
		},

		_selectFromEvent: function (event, item, renderer, dispatch) {
			var changed;
			var oldSelectedItem = this.selectedItem;
			var selected = item == null ? false : this.isSelected(item);

			if (item == null) {
				if ((this.selectionMode === "multiple" && !this.hasSelectionModifier(event))
					&& this.selectedItem != null) {
					this.selectedItem = null;
					changed = true;
				}
			} else if (this.selectionMode === "multiple") {
				if (this.hasSelectionModifier(event)) {
					this.setSelected(item, !selected);
					changed = true;
				} else {
					this.selectedItem = item;
					changed = true;
				}
			} else { // single
				if (this.hasSelectionModifier(event)) {
					//if the object is selected deselects it.
					this.selectedItem = (selected ? null : item);
					changed = true;
				} else {
					if (!selected) {
						this.selectedItem = item;
						changed = true;
					}
				}
			}

			if (dispatch && changed) {
				this.dispatchSelectionChange(oldSelectedItem, this.selectedItem, renderer, event);
			}

			return changed;
		},

		/**
		 * Dispatch a selection change event.
		 * @param {Object} oldSelectedItem The previously selectedItem.
		 * @param {Object} newSelectedItem The new selectedItem.
		 * @param {Object} renderer The visual renderer of the selected/deselected item.
		 * @param {Event} triggerEvent The event that lead to the selection of the item.
		 * @protected
		 */
		dispatchSelectionChange: function (oldSelectedItem, newSelectedItem, renderer, triggerEvent) {
			this.emit("selection-change", {
				oldValue: oldSelectedItem,
				newValue: newSelectedItem,
				renderer: renderer,
				triggerEvent: triggerEvent
			});
		}
	});
});