var ErlShell = {
    status: 1,                                           //ErlShell状态，1表示没启动，2已启动
    pid: undefined,                                      //ErlShell的进程标识
    timer: undefined,                                    //心跳包定时
    interval: 10,                                        //心跳包定时间隔
    line_num: 1,                                         //ErlShell的行数
    process: 0,                                          //0标识当前没请求要处理，1反之
    url: "https://genfsm.herokuapp.com/erlshellaction/", //POST请求的地址
    command_history: [],                            	    //使用过的历史命令
    command_cursor: 0,								    //命令光标位置
    width: 0,
    start_time: "",
    client_ip: "",
    system_info: ""
};

//创建命令行
ErlShell.create_es_command_line = function (line_num) {
    var _html = [];
    _html.push('<table class="es_line">');
    _html.push('    <tr>');
    _html.push('        <td class="es_num">', line_num, '></td>');
    _html.push('        <td class="es_str">');
    _html.push('            <div id="es_command_line" contenteditable="true"></div>');
    _html.push('        </td>');
    _html.push('    </tr>');
    _html.push('    <tr><td colspan="2" id="es_result"></td></tr>');
    _html.push('</table>');
    $("#es_div").append(_html.join(''));
    $("#es_command_line").focus();
};

//绑定命令行事件
ErlShell.bind_es_command_line_keypress = function () {
    var ecl = $("#es_command_line");
    ecl.bind("keydown", function (event) {
        var keycode = event.keyCode ? event.keyCode : event.which;
        switch (keycode) {
            //回车键
            case 13:
                var erl_str = "", data = {};
                // 获取命令行里的 erlang 表达式字符串
                erl_str = $.trim(ecl.text());
                if (erl_str) {
                    data = { "action": 3, "pid": ErlShell.pid, "erl_str": erl_str };
                    ErlShell.action_status("loading...");
                    //$("#es_div").css({"background-color" : "#EDEDED"});
                    ErlShell.get_jsonp(data, function (rs) {
                        if (rs.action == 3) {
                            $("#es_status").css("display", "none");
                            //$("#es_div").css({"background-color" : "#FFF"});
                            $("#es_result").html(rs.value);
                            if (rs.result == 1) {
                                ErlShell.reset_es_command_line_keypress();
                                ErlShell.line_num = rs.line_num;
                                ErlShell.create_es_command_line(ErlShell.line_num);
                                ErlShell.bind_es_command_line_keypress();
                            } else if (rs.result == 31) {       //进程异常关闭
                                ErlShell.erlshell_stop();
                                ErlShell.action_status("进程异常已关闭，请重新启动 ErlShell！");
                            }
                            ErlShell.command_history.unshift(erl_str);
                            ErlShell.command_cursor = 0;
                        } else if (rs.action == 2) {
                            ErlShell.erlshell_stop();
                        }
                    });
                } else {            //空行按回车键光标跳到下一行
                    ErlShell.reset_es_command_line_keypress();
                    ErlShell.create_es_command_line(ErlShell.line_num);
                    ErlShell.bind_es_command_line_keypress();
                }
                return;
                break;
            //上方向键
            case 38:
                if (ErlShell.command_history.length > 0) {
                    if (ErlShell.command_cursor >= ErlShell.command_history.length) {
                        ErlShell.command_cursor = ErlShell.command_history.length - 1;
                    }
                    ecl.html(ErlShell.command_history[ErlShell.command_cursor]);
                    ErlShell.command_cursor++;
                }
                break;
            //下方向键
            case 40:
                if (ErlShell.command_history.length > 0) {
                    if (ErlShell.command_cursor <= 0) {
                        ErlShell.command_cursor = 0;
                        ecl.html("");
                    } else {
                        ErlShell.command_cursor--;
                        ecl.html(ErlShell.command_history[ErlShell.command_cursor]);
                    }
                }
                break;
            default:
                break;
        }
    });
};

ErlShell.reset_es_command_line_keypress = function () {
    var ecl = $('#es_command_line');
    ecl.unbind('keydown');
    ecl.attr({"id": "", "contenteditable": "false"});
    $('#es_result').attr({"id": ""});
};

// ErlShell 的心跳包函数
ErlShell.erlshell_heart = function () {
    //ErlShell如果已经关闭，则关停定时器
    if (ErlShell.status != 2) {
        if (ErlShell.timer) {
            clearTimeout(ErlShell.timer);
        }
        ErlShell.timer = undefined;
        return;
    }
    var data = { "action": 4, "pid": ErlShell.pid };
    ErlShell.get_jsonp(data, function (rs) {
        if (rs.result == 41) {                  //进程异常关闭
            ErlShell.erlshell_stop();
            ErlShell.action_status("进程异常已关闭，请重新启动 ErlShell！");
        }
    });
};

//启动ErlShell
ErlShell.erlshell_start = function (rs) {
    $("#es_status").css("display", "none");
    //初始状态数据
    ErlShell.pid = rs.pid;
    ErlShell.interval = rs.interval;
    ErlShell.line_num = rs.line_num;
    ErlShell.status = 2;
    ErlShell.process = 0;
    ErlShell.command_history = [];
    ErlShell.command_cursor = 0;
    var _html = [];
    _html.push('<div class="esshell_welcome">Start at ', rs.start_time, ', From ', rs.client_ip);
    if (rs.system_info) {
        _html.push('<br />', rs.system_info);
    }
    _html.push('</div>');
    var ed = $("#es_div");
    ed.html(_html.join(""));
    //创建命令行
    ErlShell.create_es_command_line(ErlShell.line_num);
    //绑定命令行事件
    ErlShell.bind_es_command_line_keypress();
    ed.css({"background-color": "#FFF"});
    $("#erlshell_action").html("Stop");
    //开启 ErlShell 心跳包定时器
    ErlShell.timer = setInterval(ErlShell.erlshell_heart, ErlShell.interval * 1000);
    ErlShell.erlshell_heart();
    $(window).bind('beforeunload', function () {
        return "确定要退出 ErlShell ？";
    });
};

// 关闭ErlShell
ErlShell.erlshell_stop = function () {
    if (ErlShell.timer) {
        clearTimeout(ErlShell.timer);
    }
    $('#es_command_line').blur();
    ErlShell.timer = undefined;
    ErlShell.pid = undefined;
    ErlShell.status = 1;
    $("#erlshell_action").html("Start");
    $("#es_div").css({"background-color": "#EDEDED"});
    ErlShell.reset_es_command_line_keypress();
    $(window).unbind('beforeunload');
};


//获取jsonp函数
ErlShell.get_jsonp = function (data, callbackfun) {
    $.ajax({
        type: "get",
        async: false,
        url: ErlShell.url,
        dataType: "jsonp",
        jsonp: "callback",
        data: data,
        success: callbackfun
    });
};

ErlShell.action_status = function (content) {
    var es = $("#es_status");
    es.html(content);
    var left = parseInt((ErlShell.width - es.width()) / 2);
    es.css("left", left + "px");
    es.css("display", "block");
};

//初始ErlShell
ErlShell.init = function () {
    var ez = $("#es_zone");
    ErlShell.width = ez.width();
    ez.append("<div id='es_status'></div>");
    if (ErlShell.process == 1) {
        return;
    }
    ErlShell.process = 1;
    ErlShell.action_status("loading...");
    var data = {};
    if (ErlShell.status == 1) {
        data = { "action": 1 };
    } else {
        data = { "action": 2, "pid": ErlShell.pid };
        //关闭ErlShell
        ErlShell.erlshell_stop();
    }
    ErlShell.get_jsonp(data, function (rs) {
        if (rs.result == 1 && rs.action == 1) {
            //启动ErlShell
            $("#es_close").css("display", "block");
            $("#es_mask").css("display", "none");
            ErlShell.erlshell_start(rs);
        }
        ErlShell.process = 0
    });
};
