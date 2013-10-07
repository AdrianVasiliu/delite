define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/_base/array",
        "dojo/sniff",
        "dojo/dom-construct",
        "dojo/dom-class",
        "dojo/touch",
        "dojo/on",
        "dui/mobile/_css3"
], function(declare, lang, array, has, domConstruct, domClass, touch, on, css3){

	// TODO: ADD THIS TO DOJO
	window.requestAnimFrame = (function(){
		  return  window.requestAnimationFrame       ||
		          window.webkitRequestAnimationFrame ||
		          window.mozRequestAnimationFrame    ||
		          function( callback ){
		            window.setTimeout(callback, 1000 / 60);
		          };
		})();

	return declare(null, {
		// summary:
		//		Scrollable wraps a Widget inside a scrollable div (viewport). The height of this div is defined by the height parameter
		//		of the Scrollable mixin. To register the mixin event handlers, call the registerScrollableEventHandlers method.

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		height: 0, // the height of the scrollable viewport, in pixel

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_isScrollable: true,
		_viewportNode: null,
		_translation: 0, // current translation on the y axis
		_visibleHeight: null, // the height of the viewport, set by the resize method
		_browserScroll: 0, // the browser modify the scrollTop of the domNode when navigating the list using a keyboard. The current browser scroll on the y axis is stored there.
		_lastPressStopedAnimation: false,
		_lastYTouch: null,
		_lastMoveTimeStamp: null,
		_dy: null,
		_dt: null,
		_scrollAnimationSpec: null,
		_touchHandlersRefs: null,

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		registerScrollableEventHandlers: function(){
			// Note that on non touch device, there is also a handler registered
			// for click events. This is done in the buildRendering method, to make sure that
			// this handler (that performs stopImmediatePropagation) is the first of its kind
			// registered.
			// listen to mousewheel events
			if(document.onmousewheel !== undefined){
				this.on('mousewheel', lang.hitch(this, '_scrollableOnMouseWheel'));
			}
			// listen to drag events
			this.on(touch.press, lang.hitch(this, '_scrollableOnTouchPress'));
		},

		scrollBy: function(y, animate, animOptions){
			this._scrollBy(y, animate, animOptions);
			this.onScroll(y);
		},

		onScroll: function(scroll){
			// abstract method
		},

		getCurrentScroll: function(){
			return this._translation - this._browserScroll;
		},

		/////////////////////////////////
		// Widget methods updated by this mixin
		/////////////////////////////////

		postMixInProperties: function(){
			this.inherited(arguments);
			this._touchHandlersRefs = [];
		},

		buildRendering: function(){
			this.inherited(arguments);
			// Create a scrollable container and add the widget domNode to it
			this._viewportNode = domConstruct.create('div', {class: 'duiScrollable', tabindex: -1});
			if(this.height){
				this._viewportNode.style.height = this.height + 'px';
			}else{
				// TODO: what is the default height ?
			}
			if(this.domNode.parentNode){
				domConstruct.place(this._viewportNode, this.domNode, 'after');
			}
			this._viewportNode.appendChild(this.domNode);
			// listen to click events to cancel clicks at the end of a scroll on desktop
			if(!has('touch')){
				this._viewportNode.addEventListener('click', lang.hitch(this, '_scrollableOnClick'), true);
			};
			// listen to scroll initiated by the browser (when the user navigates the list using the TAB key)
			this._viewportNode.addEventListener('scroll', lang.hitch(this, '_scrollableOnBrowserScroll'), true);
		},

		placeAt: function(){
			// The node to place is this._viewportNode, not this.domNode
			var domNode = this.domNode;
			this.domNode = this._viewportNode;
			this.inherited(arguments);
			this.domNode = domNode;
		},

		startup: function(){
			this.resize();
			this.inherited(arguments);
		},

		resize: function(){
			// calculate the dimensions of the viewport
			var rect = this._viewportNode.getBoundingClientRect();
			this._visibleHeight = rect.bottom - rect.top;
		},

		destroy: function(){
			this.inherited(arguments);
			if(this._viewportNode){
				this._viewportNode.removeEventListener('scroll', lang.hitch(this, '_scrollableOnBrowserScroll'), true);
				if(!has('touch')){
					this._viewportNode.removeEventListener('click', lang.hitch(this, '_scrollableOnClick'), true);
				}
				domConstruct.destroy(this._viewportNode);
			};
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_scrollBy: function(y, animate, animOptions){
			if(animate){
				var animDuration = '0.3s';
				var animTimingFunc = 'ease-out';
				if(animOptions){
					animDuration=animOptions.duration?animOptions.duration:animDuration;
					animTimingFunc=animOptions.timingFunc?animOptions.timingFunc:animTimingFunc;
				}
				// TODO: OPTIMIZE BY GETTING THE NAMES OF THE CSS PROPERTIES ONLY ONCE WHEN WE CREATE THE WIDGET ?
				this.domNode.style[css3.name('transition', false)] = css3.name('transform', true) + ' ' + animDuration + ' ' + animTimingFunc;
			}
			this._translation += y;
			this.domNode.style[css3.name('transform', false)] = 'translate3d(0,' + this._translation + 'px,0)';
			if(animate){
				this.defer(function(){
					// defer setting back the transition property to no value, or the temporary change of the property
					// is ignored and a transition is performed
					this.domNode.style[css3.name('transition', false)] = '';
				}, 300); // TODO: depends on the animation duration ?
			}
		},

		_endScroll: function(velocity){
			if(this.getCurrentScroll() > 0){
				this._scrollBy(-(this.getCurrentScroll()), true);
			}else if(this._visibleHeight - this._getContentHeight() > this.getCurrentScroll()){
				this._scrollBy((this._visibleHeight - this._getContentHeight() - this.getCurrentScroll()), true);
			}else if(velocity){
//				if(this.cellPages > 0){
					this._animateScroll(0.9, velocity*200);
//				}else{
					// TODO: find the correct animation for end of scroll... (see scrollable.js)
//					this._scrollBy(velocity*110, true, {duration: '1s'});
//				}
			}
		},

//		_animateScroll: function(duration, length){
//			var fps = 25;
//			var nbOfFrames = fps * duration;
//			var lengthPerFrame = Math.round(length / nbOfFrames);
//			var frameDuration = 1 / fps;
//			var that = this;
//			this._stopAnimatedScroll();
//			this._currentAnimatedScroll = setInterval(function(){
//				if(nbOfFrames-- <= 0){
//					that._stopAnimatedScroll();
//					that._endScroll();
//				}else{
//					that.scrollBy(lengthPerFrame, false);
//				}
//			}, frameDuration * 1000);
//		},
//
//		_stopAnimatedScroll: function(){
//			// TODO: WHAT IF ANIMATION USING _scrollBy ?
//			if(this._currentAnimatedScroll){
//				clearInterval(this._currentAnimatedScroll);
//				this._currentAnimatedScroll = null;
//				return true;
//			}else{
//				return false;
//			}
//		},

		_animateScroll: function(duration, length){
			var lengthPerMillisec = length / (duration * 1000);
			if(Math.abs(lengthPerMillisec) > 0.1){
				this._scrollAnimationSpec = {
						duration: duration * 1000,
						length: length,
						lengthPerMillisec: lengthPerMillisec,
						start: null,
						lastTS: null,
						cancel: false
				};
				requestAnimFrame(lang.hitch(this, this._renderScrollAnimation));
			}
		},

		_renderScrollAnimation: function(timestamp){
			if(!this._scrollAnimationSpec.start){this._scrollAnimationSpec.start = timestamp;}
			if(this._scrollAnimationSpec.lastTS){
				var l = Math.round(this._scrollAnimationSpec.lengthPerMillisec * (timestamp - this._scrollAnimationSpec.lastTS));
				this.scrollBy(l, false);
			}
			this._scrollAnimationSpec.lastTS = timestamp;
			if(timestamp - this._scrollAnimationSpec.start < this._scrollAnimationSpec.duration && !this._scrollAnimationSpec.cancel){
				requestAnimFrame(lang.hitch(this, this._renderScrollAnimation));
			}else{
				this._scrollAnimationSpec = null;
				this._endScroll();
			}
		},

		_stopAnimatedScroll: function(){
			// TODO: WHAT IF ANIMATION USING _scrollBy ?
			if(this._scrollAnimationSpec && !this._scrollAnimationSpec.cancel){
				this._scrollAnimationSpec.cancel = true;
				return true;
			}else{
				return false;
			}
		},

		_getContentHeight: function(){
			var rect = this.domNode.getBoundingClientRect();
			return rect.bottom - rect.top;
		},

		/////////////////////////////////
		// Event handlers
		/////////////////////////////////

		_scrollableOnMouseWheel: function(event){
			this._scrollableCaptureEvent(event);
			this.scrollBy(event.wheelDeltaY / 2);
			this._endScroll();
		},

		_scrollableOnTouchPress: function(event){
			this._scrollableCaptureEvent(event);
			this._touchHandlersRefs.push(this.own(on(document, touch.move, lang.hitch(this, '_scrollableOnTouchMove')))[0]);
			this._touchHandlersRefs.push(this.own(on(document, touch.cancel, lang.hitch(this, '_scrollableOnTouchRelease')))[0]);
			this._touchHandlersRefs.push(this.own(on(document, touch.release, lang.hitch(this, '_scrollableOnTouchRelease')))[0]);
			this._lastYTouch = event.clientY;
			this._lastMoveTimeStamp = event.timeStamp;
			this._dy = 0;
			this._lastPressStopedAnimation = this._stopAnimatedScroll();
		},

		_scrollableOnTouchMove: function(event){
			var dy = event.clientY - this._lastYTouch;
			if(dy == 0){ // ignore moves on the x axis
				return;
			}
			this._dy = dy;
			this._dt = event.timeStamp - this._lastMoveTimeStamp;
			this._lastMoveTimeStamp = event.timeStamp;
			this._lastYTouch = event.clientY;
			this._scrollableCaptureEvent(event);
			this.scrollBy(this._dy);
		},

		_scrollableOnTouchRelease: function(event){
			this._scrollableCaptureEvent(event);
			var velocity = this._dt?this._dy / this._dt:0;
			this._endScroll(velocity);
			array.forEach(this._touchHandlersRefs, function(handlerRef){
				handlerRef.remove();
			});
			this._touchHandlersRefs = [];
			// TODO: CALL SOME HANDLERS HERE ??? OR EMIT AN EVENT ???
//			if(!this._lastPressStopedAnimation){ // Do not trigger selection when the user touched the screen to stop the current animation
//				this._handleSelection(event);
//			}
		},

		_scrollableOnBrowserScroll: function(event){
			var oldBrowserScroll = this._browserScroll;
			this._browserScroll = this._viewportNode.scrollTop;
			this.onScroll(oldBrowserScroll - this._browserScroll);
		},

		_scrollableOnClick: function(event){
			if(this._dy && event.stopImmediatePropagation){
				event.stopImmediatePropagation();
			}
		},

		_scrollableCaptureEvent: function(event){
			event.preventDefault();
			event.stopPropagation();
		}

	});
});