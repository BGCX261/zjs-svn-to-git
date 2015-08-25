/*=============================================================================
    etc/antcore.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]

    This file provides some basic things (like "console") for running in Ant.

    You need these JAR's to use this script in Ant:

        bsf.jar
        commons-logging.jar
        js.jar

=============================================================================*/
importPackage(java.lang);
importPackage(java.io);

var window = function () { return this; }();

window.alert = function (msg) {
    System.out.println("[ALERT] " + msg);
};

window.console = {
    debug : function (msg) { System.out.println("[DEBUG] " + msg) },
    error : function (msg) { System.out.println("[ERROR] " + msg) },
    info : function (msg) { System.out.println("[INFO] " + msg) }
};
