define(["dojo/_base/declare",
        "dojo/dom-style",
        "./_ListBase",
        "./DefaultEntryRenderer",
        "./DefaultCategoryRenderer",
        "./DefaultPageLoaderRenderer"
], function(declare, domStyle, _ListBase, DefaultEntryRenderer, DefaultCategoryRenderer, DefaultPageLoaderRenderer){
	
	return declare(_ListBase, {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		entriesRenderer: DefaultEntryRenderer,

		categoriesRenderer: DefaultCategoryRenderer, // renders the category headers when the list entries are categorized. The default one is defined in the postMixInProperties method.

		pageLoaderRenderer: DefaultPageLoaderRenderer, // when pageLength > 0, use this renderer to render the content of the cell that can be clicked to load one more page of entries.

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_renderedEntries: null,
		_renderedEntriesPool: null,
		_renderedCategories: null,
		_renderedCategoriesPool: null,
		_renderedPageLoader: null,

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		postMixInProperties: function(){
			this.inherited(arguments);
			this._renderedEntries = [];
			this._renderedEntriesPool = [];
			this._renderedCategories = {};
			this._renderedCategoriesPool = [];
		},

		destroy: function(){
			this.inherited(arguments);
			var widget;
			while(this._renderedEntries.length){
				widget = this._renderedEntries.pop();
				if(widget){
					widget.destroyRecursive();
				}
			}
			while(this._renderedEntriesPool.length){
				widget = this._renderedEntriesPool.pop();
				if(widget){
					widget.destroyRecursive();
				}
			}
			for(var cat in this._renderedCategories){
				this._renderedCategories[cat].destroyRecursive();
			}
			while(this._renderedCategoriesPool.length){
				widget = this._renderedCategoriesPool.pop();
				if(widget){
					widget.destroyRecursive();
				}
			}
		},

		/////////////////////////////////
		// _ListBase implementation
		/////////////////////////////////

		_renderEntry: function(entry, entryIndex){
			this._renderedEntries[entryIndex] = this._renderedEntriesPool.shift();
			if(this._renderedEntries[entryIndex]){
				domStyle.set(this._renderedEntries[entryIndex], 'display', '');
				this._renderedEntries[entryIndex].set('entryIndex', entryIndex);
				this._renderedEntries[entryIndex].set('entry', entry);
			}else{
				this._renderedEntries[entryIndex] = new this.entriesRenderer({entry: entry, entryIndex: entryIndex});
				this._renderedEntries[entryIndex].startup();
			}
			return this._renderedEntries[entryIndex].domNode;
		},

		_recycleEntryRenderer: function(entryIndex){
			this._renderedEntries[entryIndex].domNode.parentNode.removeChild(this._renderedEntries[entryIndex].domNode);
			this._renderedEntriesPool.push(this._renderedEntries[entryIndex]);
			domStyle.set(this._renderedEntries[entryIndex], 'display', 'none');
			delete this._renderedEntries[entryIndex];
		},

		_renderCategory: function(category){
			this._renderedCategories[category] = this._renderedCategoriesPool.shift();
			if(this._renderedCategories[category]){
				domStyle.set(this._renderedCategories[category], 'display', '');
				this._renderedCategories[category].set('category', category);
			}else{
				this._renderedCategories[category] = new this.categoriesRenderer({category: category, listBaseClass: this.baseClass});
				this._renderedCategories[category].startup();
			}
			return this._renderedCategories[category].domNode;
		},

		_recycleCategoryRenderer: function(category){
			this._renderedCategories[category].domNode.parentNode.removeChild(this._renderedCategories[category].domNode);
			this._renderedCategoriesPool.push(this._renderedCategories[category]);
			domStyle.set(this._renderedCategories[category], 'display', 'none');
			delete this._renderedCategories[category];
		},

		_renderPageLoader: function(loading){
			if(this._renderedPageLoader){
				this._renderedPageLoader.set('loading', loading);
			}else{
				this._renderedPageLoader = new this.pageLoaderRenderer({loading: loading, pageLength: this.pageLength});
				this._renderedPageLoader.startup();
			}
			return this._renderedPageLoader.domNode;
		},

		_destroyPageLoader: function(){
			this.inherited(arguments);
			this._renderedPageLoader.destroyRecursive();
			delete this._renderedPageLoader;
		}

	});
});