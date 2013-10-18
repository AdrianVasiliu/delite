define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/dom",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dui/registry",
        "dui/_WidgetBase"
], function(declare, lang, dom, domClass, domConstruct, registry, _WidgetBase){

	return declare(null , {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		moveable: true, // Should be a statefull property
		
		deleteable: true,  // Should be a statefull property
		
		deleteFromStore: true,

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_deleteNode: null,
		_moveNode: null,
		_indexOfDeleteableEntry: -1,

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		setEditableMode: function(moveable, deleteable){
			this.moveable = moveable;
			this.deleteable = deleteable;
			// TODO: EVENT HANDLERS, RENDERING, ETC...
		},

		onEntryDelete: function(entry, entryIndex){
			// to be implemented
		},

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		postCreate: function(){
			this.inherited(arguments);
			if(this.deleteable){
				this.onCellEvent('click', function(evt, entryIndex){
					var node = evt.target;
					var resetDeleteableEntry = true;
					if(this.deleteable){
						while(node && !domClass.contains(node, this.baseClass + this._cssSuffixes.container)){
							if(domClass.contains(node, 'duiListEntryLeftEdit')){
								if(this._indexOfDeleteableEntry == entryIndex){
									// do nothing
									resetDeleteableEntry = false;
									break;
								}else if(this._indexOfDeleteableEntry >= 0){
									this._hideDeleteButton(this._indexOfDeleteableEntry);
								}
								this._showDeleteButton(entryIndex);
								this._indexOfDeleteableEntry = entryIndex;
								resetDeleteableEntry = false;
								break;
							}else if(domClass.contains(node, 'duiListEntryRightEdit')){
								if(this._indexOfDeleteableEntry == entryIndex){
									this._hideDeleteButton(entryIndex);
									this._indexOfDeleteableEntry = -1;
									this.deleteEntry(entryIndex, this.deleteFromStore);
								}
								break;
							}
							node = node.parentNode;
						}
					}
					if(resetDeleteableEntry && this._indexOfDeleteableEntry >= 0){
						this._hideDeleteButton(this._indexOfDeleteableEntry);
						this._indexOfDeleteableEntry = -1;
					}
				});
			}
		},

		destroy: function(){
			this.inherited(arguments);
			if(this._rightEditNode){
				if(this._rightEditNode.parentNode){
					this._rightEditNode.parentNode.removeChild(this._rightEditNode);
				}
				delete this._rightEditNode;
			}
		},

		/////////////////////////////////
		// List methods
		/////////////////////////////////

		_handleSelection: function(event){
			if(this.deleteable){
				// cannot select / unselect entries why the list is deleteable
				return;
			}
			this.inherited(arguments);
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_showDeleteButton: function(entryIndex){
			// TODO: USE i18n string
			this._setRightEditNodeInnerHTML(entryIndex, '<div class="' + this.baseClass + '-deleteButton">delete</div>');
		},

		_hideDeleteButton: function(entryIndex){
			// TODO: USE i18n strings
			var innerHTML = this.moveable ? '<div class="duiDomButtonGrayKnob"><div><div><div></div></div></div></div></div>' : '<div></div>';
			this._setRightEditNodeInnerHTML(entryIndex, innerHTML);
		},

		_setRightEditNodeInnerHTML: function(entryIndex, innerHTML){
			var cellNode = this._getCellNodeByEntryIndex(entryIndex);
			if(cellNode){
				cellNode.children[2].innerHTML = innerHTML;
			}
		},

		deleteEntry: function(entryIndex, removeFromStore){
			if(this.onEntryDelete(this.entries[entryIndex], entryIndex) !== false){
				this.inherited(arguments);
			}
		},

		////////////////////////////////////
		// TODO: SUPPORT DELETETION / ADDITIONS AT THE STORE LEVEL
		//       (HERE OR IN StoreModel ?)
		////////////////////////////////////

		////////////////////////////////////
		// TODO: KEYBOARD NAVIGATION !!!
		////////////////////////////////////

		_getCellForEntry: function(entry, entryIndex){
			var cell = this.inherited(arguments);
			if(domClass.contains(cell.domNode, this.baseClass + this._cssSuffixes.pooled)){
				// Cell comes from the pool
				if(this.deleteable){
					if(this._indexOfDeleteableEntry == entryIndex){
						this._showDeleteButton(entryIndex);
					}else{
						if(domClass.contains(cell.domNode.children[2].children[0], this.baseClass + '-deleteButton')){
							this._hideDeleteButton(entryIndex);
						}
					}
				}
			}else{
				// This is a new cell
				if(this.deleteable || this.moveable){
					// TODO: USE i18n string
					domConstruct.create('div', {innerHTML: this.moveable ? '<div class="duiDomButtonGrayKnob"><div><div><div></div></div></div></div></div>':'<div></div>', className: 'duiListEntryRightEdit'}, cell.domNode);
				}
				if(this.deleteable){
					domConstruct.create('div', {innerHTML: '<div class="duiDomButtonRedCircleMinus"><div><div><div></div></div></div></div></div>', className: 'duiListEntryLeftEdit'}, cell.domNode, 0);
				}
			}
			return cell;
		},

	});
});