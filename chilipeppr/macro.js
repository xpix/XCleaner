/* global macro chilipeppr $ */
// WXCLh onComplete and start vacuum cleaner over a Sonoff device
var XCleanerMacro = {

	address:       "127.0.0.1", // we send cmds to ESP Device via REST
	initVaccum:    false,       // init state of vacuum device
	espPin:        5,           // pin on esp8266 to trigger relais
	vheigth:       5,           // position of suction pipe on pcb 
	diameter:      10,          // suction pipe inside diameter

	init: function() {
		// Uninit previous runs to unsubscribe correctly, i.e.
		// so we don't subscribe 100's of times each time we modify
		// and run this macro
		if (window["XCleanerMacro"]) {
			macro.status("This macro was run before. Cleaning up...");
			window["XCleanerMacro"].uninit();
		}
		macro.status("Starting xclenaer control");
		// subscribe's
      chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnExecute);
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.updateAxesFromStatus);
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);

		// store macro in window object so we have it next time thru
		window["XCleanerMacro"] = this;

      chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "XCleaner Controller", "Send commands to xcleaner controller");

      // Events positions ----------------
      this.unpausedZPos = this.vheigth-0.1;
      // ---------------------------------
      
      this.vacuum(false); // init vacuum output pin
      
      // first thing we need to do is get 3d obj
      this.get3dObj(function() {
          // when we get here, we've got the 3d obj 
          console.log('XCL 3dobj loading');
      });
	},
	uninit: function() {
      macro.status("Uninitting macro.");
	   chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnExecute);
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.updateAxesFromStatus);
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
	},
	onChiliPepprPauseOnExecute: function(data) {
		console.log("XCL onChiliPepprPauseOnExecute. data:", data);
		if(data.gcode.mXCLh(/clean/)){
		  this.onXCL();
		}
	},
   onStateChanged: function(state){
      console.log('XCL State:', state, this);
      this.State = state;
   },
   onXCL: function(data){
      console.log('XCL Execute Line:', data);
      
      // Calculate the area to clean via 3dobj and bbox
      var gcode = this.area();

      // add events to unpause this process
      // Prepare event unpause ---------------------------------------------
      var unpause = $.Deferred();
      var unpausedZPos = this.unpausedZPos;
      
      // add a rule if unpause event happend 
      // after startSpindleSlow and tightCollet 
      $.when( unpause )
         .done( this.unpauseGcode.bind(this) );

      // register the event for updateAxesFromStatus, 
      // the cool thing this event will only one time fired :)
      this.events.push({ z:unpausedZPos,
         event: unpause,
         comment: 'Unpause the process and do the job.',
      });

      // send gcode
      this.send(gcode);
   },
   updateAxesFromStatus: function (axes) {
      if ('z' in axes && axes.z !== null) {
          this.axis.z = (Math.round( axes.z * 10 )/10 );
      }

      var that = this;

      // check all events and compare the axis states with event states
      // if has the event z the same values as the actual position
      // then fire up the planned event
      this.events.forEach(function(entry){
         if(entry.event.state() != 'resolved' && entry.z == that.axis.z){
      		console.log("XCL updateAxesFromStatus:", that.axis);
            entry.event.resolve();                                // Fire up the event
            console.log('XCL fire Event: ', entry.comment);
         }
      });
   },
   get3dObj: function (callback) {
      this.userCallbackForGet3dObj = callback;
      chilipeppr.subscribe("/com-chilipeppr-widget-3dviewer/recv3dObject", this, this.get3dObjCallback);
      chilipeppr.publish("/com-chilipeppr-widget-3dviewer/request3dObject", "");
      chilipeppr.unsubscribe("/com-chilipeppr-widget-3dviewer/recv3dObject", this.get3dObjCallback);
   },
   get3dObjCallback: function (data, meta) {
      console.log("XCL got 3d obj:", data, meta);
      this.obj3d = data;
      this.obj3dmeta = meta;
      if (this.userCallbackForGet3dObj) {
          this.userCallbackForGet3dObj();
          this.userCallbackForGet3dObj = null;
      }
   },
   area: function(){
      var helper = this.obj3d.bboxHelper;
      console.log('XCL called: ', 'area', helper);
      var minx = helper.box.min.x;
      var miny = helper.box.min.y;
      var maxx = helper.box.max.x;
      var maxy = helper.box.max.y;

		var cmds = [
         'G0 Z' + this.vheigth,
		   'G0 X'+minx+' Y'+miny, 
		   'G1 F1000',
      ];
	
		var isAtTop = false;
		for (var x = minx; x <= maxx; x += this.diameter) {
			cmds.push("G1 X" + x);
			if (isAtTop) {
				cmds.push("G1 Y0");
				isAtTop = false;
			}
			else {
				cmds.push("G1 Y" + maxy);
				isAtTop = true;
			}
		}

      // At this position the process are finished
      cmds.push('G1 Z' + this.unpausedZPos );// Set position for unpause event 
      cmds.push('G4 P1');                    // ... and wait a second

		return cmds.join("\n");
   },
   send: function(gcode){
      console.log('XCL called: ', 'send', gcode);
      chilipeppr.publish("/com-chilipeppr-widget-serialport/send", gcode);
   },
   unpauseGcode: function() {
      console.log('XCL called: ', 'unpauseGcode');
      chilipeppr.publish("/com-chilipeppr-widget-gcode/pause", null);
      this.vacuum(false);
   },
   vacuum: function(state) {
      console.log('XCL called: ', 'vacuum', state);
      if(! this.initVaccum){
         var that=this;
         $.getJSON('http://'+ this.address +'/mode/'+this.espPin+'/o', function(){
            that.initVaccum = true;
         });
      } 
      else {
         $.getJSON('http://'+ this.address +'/mode/'+this.espPin+'/'+(state ? 1 : 0), function(){
            console.log('XCL switched ', state);
         });
      } 
   },

}
