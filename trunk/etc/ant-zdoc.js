/*=============================================================================
    etc/ant-zdoc.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]

    This is the code behind our custom Ant tasks.

=============================================================================*/

function zdocAntTask (project, files, out, format, force, verbosity,
                      beforebuild, afterbuild) {
    _project = project;

    var cfg = {
        files: new zjsAnt.FileSet(project, null, files),
        force: force,
        format: format,
        output: project.resolveFile(out),
        verbosity: verbosity || "quiet"
    };

    if (beforebuild) {
        cfg.beforebuild = function () {
            beforebuild.get(0).execute();
        };
    }

    if (afterbuild) {
        cfg.afterbuild = function () {
            afterbuild.get(0).execute();
        }
    }

    zdoc.run(cfg);
    _project = null;
}
