Ext.onReady(function ()
{
    var root = new Ext.tree.AsyncTreeNode(
    {
        text: "Global Scope",
        //expanded: true,
        leaf: true
    });

    function doOpen (btn, url)
    {
        if (btn != "ok")
            return;
        Ext.Ajax.request(
        {
            method: "GET",
            url: url,
            failure: onError,
            success: gotHierarchy
        });
    }

    function gotHierarchy ()
    {
        console.info("gotHierarchy");
        //
    }

    function onError ()
    {
        console.info("Error");
    }

    function onOpen ()
    {
        Ext.Msg.prompt("Open Content", "Enter URL:", doOpen, null);
    }

    var vport = new Ext.Viewport(
    {
        layout: "border",
        items:
        [
            {
                title: "Hierarchy",
                xtype: "treepanel",
                rootVisible : true,
                root: root,
                width: 250,
                tbar:
                [
                    {
                        text: "Open",
                        handler: onOpen
                    }
                ],
                region: "west"
            },
            {
                title: "Content",
                region: "center"
            }
        ]
    });

    // iconCls
});
