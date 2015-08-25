/*=============================================================================
    test/test-imp.js
    Copyright (C) 2008, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

gTests.push
(
    function ()
    {
        var pm = new zjs.PackageManager();
        var js = "\n$requires(\"foo.bar\") ;\t; // !\n" +
                 "\n $requires(\"boo.far\")" +
                 "\n//$requires(\"no.way\")";

        var r = pm.getRequiredModules(js);
        assertEquals("foo.bar,boo.far", r);
    }
);
