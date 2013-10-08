define(["dojo/_base/declare"
], function(declare){

	return declare(null, {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		store: null,

		query: null,

		queryOptions: null,

		pageLength: 0,
		
		pageLoadingMessage: 'Loading ${pageLength} more entries...',
		
		pageToLoadMessage: 'Click to load ${pageLength} more entries',

		loaderWidget: null, // a widget which state is updated when loading data, etc...

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_loaderNodeClickHandlerRef: null,
		_currentPage: 0,
		_hasNextPage: false,
		_queryOptions: null,
		_loadingPage: false,
		_isLoaderNodeDisplayed: false,

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		// TODO: RETURN A PROMISE
		load: function(){
			
		},

		onFirstPageReady: function(data){
			
		},
		
		onNextPageReady: function(data){
			
		}

	});
});