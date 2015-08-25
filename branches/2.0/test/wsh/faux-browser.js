/*=============================================================================
    test/faux-browser.js
    Copyright (C) 2008, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/


document =
{
    getElementById : function (id) { return null; } //@@@
};

alert = function (msg)
{
    WScript.Echo("[ALERT] " + msg);
}

console = {
    debug : function (msg) { WScript.Echo("[DEBUG] " + msg) },
    error : function (msg) { WScript.Echo("[ERROR] " + msg) },
    info : function (msg) { WScript.Echo("[INFO] " + msg) }
};
