var mw = $("#es_zone").width(), mh = $("#es_zone").height();
$("#es_mask").css({"width": mw + "px", "height": mh + "px"});

$("#es_start").click(function () {
    ErlShell.init();
});

$("#es_close").click(function () {
    if (ErlShell.process == 1) {
        return;
    }
    ErlShell.process = 1;
    var data = { "action": 2, "pid": ErlShell.pid };
    //关闭ErlShell
    ErlShell.erlshell_stop();
    ErlShell.get_jsonp(data, function (rs) {

    });
    $("#es_mask").css("display", "block");
    $("#es_close").css("display", "none");
    ErlShell.process = 0
});
