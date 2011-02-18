(function(oCanvas, window, document, undefined){

	// Define the class
	var mouse = function () {
		
		// Return an object when instantiated
		return {
			// Method used by oCanvas to give this object access to the current instance of the core object
			setCore: function (thecore) {
				this.core = thecore;
			},
			
			// List of all events that are added
			eventList: {
				mousemove: [],
				mouseenter: [],
				mouseleave: [],
				click: [],
				mousedown: [],
				mouseup: [],
				drag: []
			},
			
			last_event: {},
			
			// Method for initializing the module
			init: function () {
				var _this = this,
					core = this.core,
					canvasElement = core.canvasElement,
					types;
				
				// Register pointer
				core.events.types.mouse = types = ["mousemove", "mouseenter", "mouseleave", "mousedown", "mouseup", "click"];
				core.events.pointers.mouse = function (type, doAdd) {
					if (~types.indexOf(type) && !("ontouchstart" in window || "createTouch" in document)) {
						doAdd("mouse", "click");
					}
				};
				core.pointer = this;
				
				// Define properties
				this.x = 0;
				this.y = 0;
				this.buttonState = 'up';
				this.canvasFocused = false;
				this.canvasHovered = false;
				this.cancel();
				
				// Add event listeners to the canvas element
				canvasElement.addEventListener('mousemove', function (e) { _this.mousemove.call(_this, e); }, false);
				canvasElement.addEventListener('mousedown', function (e) { _this.mousedown.call(_this, e); }, false);
				canvasElement.addEventListener('mouseup', function (e) { _this.mouseup.call(_this, e); }, false);
				
				// Add event listeners to the canvas element (used for settings states and trigger mouseup events)
				document.addEventListener('mouseup', function (e) { _this.docmouseup.call(_this, e); }, false);
				document.addEventListener('mouseover', function (e) { _this.docmouseover.call(_this, e); }, false);
				document.addEventListener('click', function (e) { _this.docclick.call(_this, e); }, false);
			},
			
			// Method for adding an event to the event list
			addEvent: function (type, handler) {
				return this.eventList[type].push(handler) - 1;
			},
			
			// Method for removing an event from the event list
			removeEvent: function (type, index) {
				this.eventList[type].splice(index, 1);
			},
			
			// Method for updating the mouse position relative to the canvas top left corner
			updatePos: function (e, update) {
				var x, y,
					boundingRect = this.core.canvasElement.getBoundingClientRect();
					
				// Browsers supporting pageX/pageY
				if (e.pageX && e.pageY) {
					x = e.pageX - document.documentElement.scrollLeft - Math.round(boundingRect.left);
					y = e.pageY - document.documentElement.scrollTop - Math.round(boundingRect.top);
				}
				// Browsers not supporting pageX/pageY
				else if (e.clientX && e.clientY) {
					x = e.clientX + document.documentElement.scrollLeft - Math.round(boundingRect.left);
					y = e.clientY + document.documentElement.scrollTop - Math.round(boundingRect.top);
				}
				
				if (update !== false) {
					if (x !== undefined) {
						this.x = x;
					}
					if (y !== undefined) {
						this.y = y;
					}
				}
				
				return { x: this.x, y: this.y };
			},
			
			// Method for getting the current mouse position relative to the canvas top left corner
			getPos: function (e, update) {
				return this.updatePos(e, update);
			},
			
			// Method for checking if the mouse pointer is inside the canvas
			onCanvas: function (e) {
				e = e || this.last_event;
				var pos = e ? this.getPos(e, false) : {x:this.x, y:this.y};
				
				// Check boundaries => (left) && (right) && (top) && (bottom)
				if ( (pos.x > 0) && (pos.x < this.core.width) && (pos.y > 0) && (pos.y < this.core.height) ) {
					this.canvasHovered = true;
					this.updatePos(e);
					return true;
				} else {
					this.canvasHovered = false;
					return false;
				}
			},
			
			// Method for triggering all events of a specific type
			triggerEvents: function (type, e, forceLeave) {
				forceLeave = forceLeave || false;
				var events = this.eventList[type],
					i, event,
					eventObject = this.core.events.modifyEventObject(e, type);
						
				// Add new properties to the event object
				eventObject.x = this.x;
				eventObject.y = this.y;
				eventObject.which = eventObject.button;
				
				// Trigger all events associated with the type
				for (i = events.length; i--;) {
					event = events[i];
					if (typeof event === "function") {
						event(eventObject, forceLeave);
					}
				}
			},
			
			// Method that triggers all mousemove events that are added
			// Also handles parts of drag and drop
			mousemove: function (e) {
				this.last_event = e;
				this.updatePos(e);
				this.canvasHovered = true;
				
				this.triggerEvents("mouseenter", e);
				this.triggerEvents("mousemove", e);
				this.triggerEvents("mouseleave", e);
				this.triggerEvents("drag", e);
			},
			
			// Method that triggers all mousedown events that are added
			mousedown: function (e) {
				this.canvasFocused = true;
				this.last_event = e;
				this.start_pos = this.getPos(e);
				
				this.triggerEvents("mousedown", e);
				
				return false;
			},
			
			// Method that triggers all mouseup events that are added
			mouseup: function (e) {
				this.last_event = e;
				
				this.triggerEvents("mouseup", e);
				this.triggerEvents("click", e);
				
				this.cancel();
			},
			
			// Method that triggers all mouseleave events that are added (gets triggered by mouse::docmouseover)
			mouseleave: function(e){
				this.triggerEvents("mouseleave", e, true);
			},
			
			// Method that triggers all mouseup events when pointer was pressed down on canvas and released outside
			docmouseup: function (e) {
				this.last_event = e;
				if (this.buttonState === "down" && !this.onCanvas(e)) {
					this.mouseup(e);
				}
			},
			
			// Method that triggers all mouseleave events when pointer is outside the canvas
			docmouseover: function (e) {
				this.last_event = e;
				if (!this.onCanvas(e)) {
					this.mouseleave(e);
				}
			},
			
			// Method that sets the focus state when pointer is pressed down outside the canvas
			docclick: function (e) {
				this.last_event = e;
				if (!this.onCanvas(e)) {
					this.canvasFocused = false;
				}
			},
			
			// Method that cancels the click event
			// A click is triggered if both the start pos and end pos is within the object,
			// so resetting the start_pos cancels the click
			cancel: function () {
				this.start_pos = {x:-10,y:-10};
			},
			
			// Method for hiding the cursor
			hide: function () {
				this.core.canvasElement.style.cursor = "none";
			},
			
			// Method for showing the cursor
			show: function () {
				this.core.canvasElement.style.cursor = "default";
			}
		};
	};

	// Register the module
	oCanvas.registerModule("mouse", mouse);
	oCanvas.registerInit("mouse", "init");

})(oCanvas, window, document);