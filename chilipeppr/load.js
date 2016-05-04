/* global macro chilipeppr $ */
// get external js macro one times and run it


/* ------------Spindle DC Controller Macro ---------------------------------- */
var mspc = window["XCleanerMacro"];
if(! mspc){
  $.getScript( "http://chilipeppr.com/slingshot?url=https://raw.githubusercontent.com/xpix/XCleaner/master/chilipeppr/macro.js", 
    function( data, textStatus, jqxhr ) {
      console.log( "Load XCleaner controller was performed.", data );
      mspc = window["XCleanerMacro"];
      setSPCParams(mspc);
    });
}
else {
  setSPCParams(mspc);
}

function setSPCParams(macro){
  // here you can set your Parameters
  macro.address = '192.168.1.1';
  macro.diameter = 10;

  macro.init(); // start macro
}
