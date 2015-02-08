$(document).ready( function(){






/////////////////////////////////////////////////////////////////
//                                                             //
//                     STRIP JSON COMMENTS                     //
//                                                             //
/////////////////////////////////////////////////////////////////
// The package.json file has comments in it to make it easier  //
// for the user to read. However you can't parse JSON that has //
// comments. Node, Grunt, NW.js, and others have no problem    //
// reading .json config files with comments though.            //
/////////////////////////////////////////////////////////////////
// by Sindre Sorhus - MIT License                              //
// https://github.com/sindresorhus/strip-json-comments         //
/////////////////////////////////////////////////////////////////

(function () {
    'use strict';
    function stripJsonComments(str) {
        var currentChar;
        var nextChar;
        var insideString = false;
        var insideComment = false;
        var ret = '';
        for (var i = 0; i < str.length; i++) {
            currentChar = str[i];
            nextChar = str[i + 1];
            if (!insideComment && str[i - 1] !== '\\' && currentChar === '"') {
                insideString = !insideString;
            }
            if (insideString) {
                ret += currentChar;
                continue;
            }
            if (!insideComment && currentChar + nextChar === '//') {
                insideComment = 'single';
                i++;
            } else if (insideComment === 'single' && currentChar + nextChar === '\r\n') {
                insideComment = false;
                i++;
                ret += currentChar;
                ret += nextChar;
                continue;
            } else if (insideComment === 'single' && currentChar === '\n') {
                insideComment = false;
            } else if (!insideComment && currentChar + nextChar === '/*') {
                insideComment = 'multi';
                i++;
                continue;
            } else if (insideComment === 'multi' && currentChar + nextChar === '*/') {
                insideComment = false;
                i++;
                continue;
            }
            if (insideComment) {
                continue;
            }
            ret += currentChar;
        }
        return ret;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = stripJsonComments;
    } else {
        window.stripJsonComments = stripJsonComments;
    }
})();







/////////////////////////////////////////////////////////////////
//                                                             //
//                         READ A FILE                         //
//                                                             //
/////////////////////////////////////////////////////////////////
// A function that allows you to set the contents of a file to //
// a variable. Like so:                                        //
//                                                             //
// var devTools = readAFile('_markup/ugui-devtools.htm');      //
//                                                             //
/////////////////////////////////////////////////////////////////

function readAFile(filePathAndName) {
    var fs = require('fs');
    var fileData = fs.readFileSync(filePathAndName, {encoding: "UTF-8"});
    return fileData;
}







/////////////////////////////////////////////////////////////////
//                                                             //
//                           RUN CMD                           //
//                                                             //
/////////////////////////////////////////////////////////////////
// This is what makes running your CLI program and arguments   //
// easier. Cow & Taco examples below to make life simpler.     //
//                                                             //
// $("#taco").click( function(){                               //
//   runcmd("pngquant", ["--force", "file.png"]);              //
// });                                                         //
//                                                             //
// runcmd("node", ["--version"], function(data){               //
//   $("#cow").html("<pre>Node Version: " + data + "</pre>");  //
// });                                                         //
//                                                             //
/////////////////////////////////////////////////////////////////

function runcmd( executable, args, callback ) {
  var spawn = require('child_process').spawn;
  console.log( executable, args );
  var child = spawn( executable, args );
  child.stdout.on('data', function(chunk) {
    if (typeof callback === 'function'){
      callback(chunk);
    }
  });

  //child.stderr.on('data', function (data) {
  //  console.log('stderr: ' + data);
  //});

};







/////////////////////////////////////////////////////////////////
//                                                             //
//                        UGUI VARIABLES                       //
//                                                             //
/////////////////////////////////////////////////////////////////
// Listing of Variables used throughout this library.          //
/////////////////////////////////////////////////////////////////

//Current Version of UGUI!
var uguiVersion = "0.95.0";

//Create an object for all the command line switches
var cmdSwitches = [];

//Create an object containing all elements with an argOrder.
var cmdArgs = $('#argsForm *[data-argOrder]');

//Get the contents of the package.json file
var packagejsonData = readAFile('package.json');

//Parse the package.json file after removing its comments
var packageJSON = JSON.parse(stripJsonComments(packagejsonData));

//The file.exe defined by the developer in the package.json file
var executable = packageJSON.executable;

//Name of the developer's application, set in package.json
var appName = packageJSON.name;

//Version of the developer's application, set in package.json
var appVersion = packageJSON.version;







/////////////////////////////////////////////////////////////////
//                                                             //
//                 WARN IF IDENTICAL ARGORDERS                 //
//                                                             //
/////////////////////////////////////////////////////////////////
// If the designer/developer uses the same data-argOrder value //
// for multiple elements, display a warning.                   //
/////////////////////////////////////////////////////////////////

var arr = {};

for (var index = 0; index < cmdArgs.length; index++) {
    arr[cmdArgs[index].dataset.argorder] = cmdArgs[index];
}

//Create a new array with duplicate argOrders removed
cmdArgs = new Array();
for ( var key in arr )
    cmdArgs.push(arr[key]);

//If the new array had any duplicates removed display a warning.
if ( cmdArgs.length < $("#argsForm *[data-argOrder]").length ) {
    $.get('_markup/ugui-multiargorders.htm', function( multiArgOrdersMarkup ){
        //Put alert mesage at top of page
        $("body.dev").prepend( multiArgOrdersMarkup );
    });
    console.warn( "///////////////////////////////////////////////////////////////" );
    console.warn( "// You have more than one data-argOrder with the same value. //" );
    console.warn( "///////////////////////////////////////////////////////////////" );
}







/////////////////////////////////////////////////////////////////
//                                                             //
//            SUBMIT LOCKED UNTIL REQUIRED FULFILLED           //
//                                                             //
/////////////////////////////////////////////////////////////////
// Gray out the submit button until all required elements are  //
// filled out.                                                 //
/////////////////////////////////////////////////////////////////

//When you click out of a form element
$("#argsForm *[data-argOrder]").change( function(){
    //check if any of the required elements aren't filled out
    for (var index = 0; index < cmdArgs.length; index++) {
        var cmdArg = $(cmdArgs[index]);
        //console.log(cmdArg.is(':invalid'));
        //If a required element wasn't filled out, make the submit button gray
        if ( cmdArg.is(':invalid') ) {
            $("#sendCmdArgs").prop("disabled",true);
            return;
        }
    };
    //If all the required elements are filled out, enable the submit button
    $("#sendCmdArgs").prop("disabled",false);
//on page load have this run once
}).trigger('change');







/////////////////////////////////////////////////////////////////
//                                                             //
//                       CLICKING SUBMIT                       //
//                                                             //
/////////////////////////////////////////////////////////////////
// What happens when you click the submit button.              //
/////////////////////////////////////////////////////////////////
// When the button is pressed, prevent it from submitting the  //
// form like it normally would in a browser. Then grab all     //
// elements with an argOrder except for unchecked checkboxes.  //
// Combine the prefix, value and suffix into one variable per  //
// element. Put them in the correct order. Send out all of the //
// prefix/value/suffix combos in the correct order to the CLI  //
// executable.                                                 //
/////////////////////////////////////////////////////////////////

//When you click the Compress button.
$("#sendCmdArgs").click( function( event ){

    //Prevent the form from sending like a normal website.
    event.preventDefault();
    //clear out the commandLine box every time sendCmdArgs is clicked.
    $("#commandLine").html(" ");

    var unsortedDevCmds = new Object();
    var unsortedCmds = new Object();

    //If an element is an unchecked checkbox, it gets skipped, otherwise it gets processed.
    for (var index = 0; index < cmdArgs.length; index++) {
        var cmdArg = $(cmdArgs[index]);

        //skips extraction if checkbox not checked.
        if ( cmdArg.is(':checkbox') && !cmdArg.prop("checked") ) continue;

        //All elements other than unchecked checkboxes get ran through this function.
        extractSwitchString(cmdArg);
    }

    //Intentionally generic code used to sort objects
    function sortObject(obj) {
        var theSwitchArray = [];
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                theSwitchArray.push({
                    'key': prop,
                    'value': obj[prop]
                });
            }
        }
        theSwitchArray.sort(function(a, b) { return a.key - b.key; });
        //theSwitchArray.sort(function(a, b) { a.value.toLowerCase().localeCompare(b.value.toLowerCase()); }); //use this to sort as strings
        return theSwitchArray; // returns array
    }

    function extractSwitchString(argumentElement) {

        //1. Create a variable based on the elements argPrefix data.
        var prefix = htmlEscape(argumentElement.data('argprefix'));
        var prefixCmd = argumentElement.data('argprefix');

        //2. Create a variable based on the value of the element, if no value present log error.
        var value = htmlEscape(argumentElement.val());
        var valueCmd = argumentElement.val();
        if (!value) { console.warn("Something not good happend! The value for argumentElement is null.") }

        //3. Create a variable based on the elements argSuffix data.
        var suffix = htmlEscape(argumentElement.data('argsuffix'));
        var suffixCmd = argumentElement.data('argsuffix');

        //4. Combine the above 3 variables into one new variable in the proper order and skipping Pre/Suf if not supplied.
        var theSwitchString = (prefix || '') + value + (suffix || '');
        var theSwitchStringCmd = (prefixCmd || '') + valueCmd + (suffixCmd || '');

        //5. Create a variable with the numeral value of the order the arguments should be outputted in.
        var argOrder = argumentElement.data('argorder');

        //6. Create a variable named using the argOrder and setting it to the combined Pre/Val/Suf. Like so: cmdSwitch6 = "--speed 9mph";
        window['devSwitch' + argOrder] = theSwitchString;
        window['cmdSwitch' + argOrder] = theSwitchStringCmd;

        //7. Plug above variables in to the unsortedCmds object to be sorted later
        unsortedDevCmds[argOrder] = theSwitchString;
        unsortedCmds[argOrder] = theSwitchStringCmd;
    }

    function htmlEscape(str) {
        if (!str) return;
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /* The user can just use the prefix and suffix if something needs to be in quotes
    String.prototype.hasWhiteSpace = function() {
        return /\s/g.test(this);
    }

    //Wrap text with spaces in quotes
    function handleWhiteSpaces(text) {
        if (!text) return;
        if (text.hasWhiteSpace()) {
`            return "\"" + text + "\"";
        }
        return text;
    }
    */

    //Create an array with the sorted content
    var theSwitchArray = sortObject(unsortedDevCmds);
    var theSwitchArrayCmd = sortObject(unsortedCmds);

    //Creat an array to fill with the arguments to be sent to the cmd line
    var cmdSwitchArray = [];

    //Get the value of each element and send it to be outputted.
    for (var index = 0; index < theSwitchArray.length; index++) {
        //add the arguments for #commandLine dev tool
        outputCmd(theSwitchArray[index].value);
        //push arguments to the command line
        cmdSwitchArray.push(theSwitchArrayCmd[index].value);
    }

    //Output the commands arguments in the correct order in the #commandLine dev tool
    function outputCmd(cmdSwitch) {
        $("#commandLine").append(cmdSwitch + " ");
    }

    $("#commandLine").prepend(executable);

    runcmd(executable, cmdSwitchArray);

});







/////////////////////////////////////////////////////////////////
//                                                             //
//              DETECT IF IN DEVELOPER ENVIRONMENT             //
//                                                             //
/////////////////////////////////////////////////////////////////
// Detects if you're in Development or Production environment. //
//                                                             //
// If you have a class of "dev" or "prod" in the body tag UGUI //
// will enable key bindings such as F12 or CTRL+Shift+I to     //
// launch Webkit's Developer Tools, or F5 to refresh. Also it  //
// displays the Command Line output at the bottom of the page. //
/////////////////////////////////////////////////////////////////

//Check if the body has a class of prod for Production Environment
if ( $("body").hasClass("prod") ) {
    $("#uguiDevTools").hide();
} else if ( $("body").hasClass("dev") ){

    //get node webkit GUI - WIN
    var gui = require('nw.gui');
    // get the window object
    var win = gui.Window.get();

    //Create UGUI Dev Tools markup
    $.get('_markup/ugui-devtools.htm', function( uguiDevToolsMarkup ){
        //Put Dev Tool Markup on the page
        $("body.dev").append( uguiDevToolsMarkup );
        putExeHelpInDevTools();
        $("#uguiDevTools section").addClass("shrink");
        $("#uguiDevTools section *").addClass("shrink");
        $("#uguiDevTools").show();

        $("#commandLine").html("<span class='commandLineHint'>Click the <em>" + $("#sendCmdArgs").html() + "</em> button to see output.</span>");

        //Hide/Show based on UGUI Dev Tools navigation
        $("#uguiDevTools nav span").click( function(){
            var sectionClicked = $(this).attr('data-nav');

            if ( $("#uguiDevTools section." + sectionClicked).hasClass("shrink") ) {
                $("#uguiDevTools section").addClass("shrink");
                $("#uguiDevTools section *").addClass("shrink");
                $("#uguiDevTools section." + sectionClicked).removeClass("shrink");
                $("#uguiDevTools section." + sectionClicked + " *").removeClass("shrink");
            } else {
                $("#uguiDevTools section." + sectionClicked).addClass("shrink")
                $("#uguiDevTools section." + sectionClicked + " *").addClass("shrink")
            }
        })

        swatchSwapper();
    });

    //Keyboard shortcuts
    keyBindings();

}

function putExeHelpInDevTools() {
    //Add a new nav item in the Dev Tools based on the name of the user's Executable
    $("#uguiDevTools span[data-nav=uguiExecutable]").html(executable);
    $("#uguiDevTools .executableName").html(executable);

    //Declare a variable
    var executableHelpChoice;

    //Everytime the dropdown changes update the <pre>
    $("#uguiDevTools .helpDropdown").change( function(){

        //Update the variable to match the user's choice
        executableHelpChoice = $(this).val();

        //Run the executable using the user's chosen argument to get it's help info
        runcmd(executable, [ executableHelpChoice ], function( returnedHelpInfo ){
            //Put the help info in a <pre>
            $("#uguiDevTools pre.executableHelp").text( returnedHelpInfo );
        });

    });
}

function swatchSwapper() {
    //Allow access to the filesystem
    var fs = require('fs');
    //Grab all the files in the ven.bootswatch file and put them in an array
    var allSwatches = fs.readdir('_style/ven.bootswatch', function(err, files){
        //if that works
        if (!err)
            //check each file and put it in the dropdown box
            for (var index = 0; index < files.length; index++) {
                $("#swatchSwapper").append("<option value='_style/ven.bootswatch/" + files[index] + "'>" + files[index].split(".min.css")[0] + "</option>");
            }
        else
            console.warn('Could not return list of style swatches.');
    });

    //When you change what is selected in the dropdown box, swap out the current swatch for the new one.
    $('#swatchSwapper').change(function (){
        $('head link[data-swatch]').attr('href', $('#swatchSwapper').val() );
    });
}

function keyBindings() {
    //Keyboard shortcuts
    document.onkeydown = function (pressed) {
        ///Check CTRL + F key and do nothing :(
        if ( pressed.ctrlKey && pressed.keyCode === 70 ) {
            pressed.preventDefault();
            console.info("NW.js currently has no 'Find' feature built in. Sorry :(")
            return false;
        //Check CTRL + F5 keys and hard refresh the page
        } else if ( pressed.ctrlKey && pressed.keyCode === 116 ) {
            pressed.preventDefault();
            win.reloadDev();
            return false;
        //Check Shift + F5 keys and refresh ignoring cache
        } else if ( pressed.shiftKey && pressed.keyCode === 116 ) {
            pressed.preventDefault();
            win.reloadIgnoringCache();
            return false;
        //Check F5 key and soft refresh
        } else if ( pressed.keyCode === 116 ) {
            pressed.preventDefault();
            win.reload();
            return false;
        //Check F12, Ctrl+Shift+I, or Option+Shift+I and display Webkit Dev Tools
        } else if (
            pressed.keyCode === 123 ||
            pressed.ctrlKey && pressed.shiftKey && pressed.keyCode === 73 ||
            pressed.altKey && pressed.shiftKey && pressed.keyCode === 73 ) {
                pressed.preventDefault();
                win.showDevTools();
                return false;
        }
    }
};







/////////////////////////////////////////////////////////////////
//                                                             //
//                   DROPZONE MODIFICATIONS                    //
//                                                             //
/////////////////////////////////////////////////////////////////
// After dropping a file in the DropZone, put the file name in //
// the DropZone. If the file is an image, display a thumbnail. //
/////////////////////////////////////////////////////////////////

$('#DropZone input[type=file]').change( function(){
    var filepath = $('#DropZone input[type=file]').val();
    var filename = $('#DropZone input[type=file]').val().split('\\').pop();
    var droppedFilename = "Dropped " + filename;
    $("#DropZone label").attr("data-content", droppedFilename);
    //if (filename ends in png||jpg||jpeg||webp||bmp||gif) {
        $("#DropZone").append('<img src="' + filepath + '" alt="Thumbnail of dropped image." />');
    //}
})







/////////////////////////////////////////////////////////////////
//                                                             //
//                   RANGE SLIDER INCREMENTS                   //
//                                                             //
/////////////////////////////////////////////////////////////////
// This will automatically add incremental lines/ticks above   //
// range sliders in your forms. Copy/Edit the HTML below and   //
// the JS will take care of the rest.                          //
//                                                             //
// <label for="amp">How loud is your amp?</label>              //
// <input type="range" min="1" max="11" value="5" id="amp"     //
// step="1" list="amplist">                                    //
//                                                             //
/////////////////////////////////////////////////////////////////

//http://demosthenes.info/blog/757/Playing-With-The-HTML5-range-Slider-Input
//http://demosthenes.info/blog/864/Auto-Generate-Marks-on-HTML5-Range-Sliders-with-JavaScript

function ticks(element) {
    if (element.hasOwnProperty('list')
     && element.hasOwnProperty('min')
     && element.hasOwnProperty('max')
     && element.hasOwnProperty('step')) {
        var datalist = document.createElement('datalist'),
             minimum = parseInt(element.getAttribute('min')),
                step = parseInt(element.getAttribute('step')),
             maximum = parseInt(element.getAttribute('max'));
         datalist.id = element.getAttribute('list');
        for (var i = minimum; i < maximum + step; i = i + step) {
            datalist.innerHTML += "<option value=" + i + "></option>";
        }
        element.parentNode.insertBefore(datalist, element.nextSibling);
    }
}
var lists = document.querySelectorAll("input[type=range][list]"),
      arr = Array.prototype.slice.call(lists);
arr.forEach(ticks);







/////////////////////////////////////////////////////////////////
//                                                             //
//                 CUT/COPY/PASTE CONTEXT MENU                 //
//                                                             //
/////////////////////////////////////////////////////////////////
// Right-click on any text or text field and you can now C&P!  //
//                                                             //
// Credit: https://github.com/b1rdex/nw-contextmenu            //
/////////////////////////////////////////////////////////////////

$(function() {
  function Menu(cutLabel, copyLabel, pasteLabel) {
    var gui = require('nw.gui')
      , menu = new gui.Menu()

      , cut = new gui.MenuItem({
        label: cutLabel || "Cut"
        , click: function() {
          document.execCommand("cut");
          console.log('Menu:', 'cutted to clipboard');
        }
      })

      , copy = new gui.MenuItem({
        label: copyLabel || "Copy"
        , click: function() {
          document.execCommand("copy");
          console.log('Menu:', 'copied to clipboard');
        }
      })

      , paste = new gui.MenuItem({
        label: pasteLabel || "Paste"
        , click: function() {
          document.execCommand("paste");
          console.log('Menu:', 'pasted to textarea');
        }
      })
    ;

    menu.append(cut);
    menu.append(copy);
    menu.append(paste);

    return menu;
  }

  var menu = new Menu(/* pass cut, copy, paste labels if you need in */);
  $(document).on("contextmenu", function(e) {
    e.preventDefault();
    menu.popup(e.originalEvent.x, e.originalEvent.y);
  });
});







}); //end onReady