// http://127.0.0.1:9001
// http://localhost:9001
const rpn = require("request-promise-native");
const winston = require("./demos/js/winston");
const ejs = require("ejs");
const qs = require("querystring");
const { PythonShell } = require("python-shell");

const fs = require("fs");
const path = require("path");
const url = require("url");
var httpServer = require("http");

const ioServer = require("socket.io");
const RTCMultiConnectionServer = require("rtcmulticonnection-server");
const pushLogs = RTCMultiConnectionServer.pushLogs;

var PORT = 9001;
var isUseHTTPs = false;

const jsonPath = {
  config: "config.json",
  logs: "logs.json",
};

const BASH_COLORS_HELPER = RTCMultiConnectionServer.BASH_COLORS_HELPER;
const getValuesFromConfigJson =
  RTCMultiConnectionServer.getValuesFromConfigJson;
const getBashParameters = RTCMultiConnectionServer.getBashParameters;
const resolveURL = RTCMultiConnectionServer.resolveURL;

var config = getValuesFromConfigJson(jsonPath);
config = getBashParameters(config, BASH_COLORS_HELPER);

// if user didn't modifed "PORT" object
// then read value from "config.json"
if (PORT === 9001) {
  PORT = config.port;
}
if (isUseHTTPs === false) {
  isUseHTTPs = config.isUseHTTPs;
}

function serverHandler(request, response) {
  // to make sure we always get valid info from json file
  // even if external codes are overriding it
  config = getValuesFromConfigJson(jsonPath);
  config = getBashParameters(config, BASH_COLORS_HELPER);

  // HTTP_GET handling code goes below
  try {
    var uri, filename;

    try {
      if (!config.dirPath || !config.dirPath.length) {
        config.dirPath = null;
      }

      uri = url.parse(request.url).pathname;
      filename = path.join(
        config.dirPath ? resolveURL(config.dirPath) : process.cwd(),
        uri
      );
    } catch (e) {
      pushLogs(config, "url.parse", e);
    }

    filename = (filename || "").toString();

    // (1) 채팅 받아와서 룸넘버별로 파일 만들어놓기
    // (2) 입장 로비 만들기

    // ===========================================================
    //
    // config api routers
    //
    // ===========================================================
    winston.info(request.method + " " + request.url); // request.method path

    // POST METHOD
    if (request.method == "POST") {
      if (request.url.indexOf("/new") != -1) {
        let body = "";
        request.on("data", (chunk) => {
          body += chunk.toString();
        });
        return request.on("end", () => {
          const { username, userid } = qs.parse(decodeURIComponent(body));
          let htmlContent = fs.readFileSync(
            __dirname + "/demos/new.ejs",
            "utf-8"
          );
          let html = ejs.render(htmlContent, {
            username: username,
            userid: userid,
            roomid: Math.random().toString(36).substring(2, 10),
          });
          response.writeHead(201, {
            "Content-Type": "text/html;charset=utf-8",
          });
          response.end(html, "utf-8");
        });
      }

      if (request.url.indexOf("/join") != -1) {
        let body = "";
        request.on("data", (chunk) => {
          body += chunk.toString();
        });
        return request.on("end", () => {
          const { username, userid } = qs.parse(decodeURIComponent(body));
          let htmlContent = fs.readFileSync(
            __dirname + "/demos/join.ejs",
            "utf-8"
          );
          let html = ejs.render(htmlContent, {
            username: username,
            userid: userid,
          });
          response.writeHead(201, {
            "Content-Type": "text/html;charset=utf-8",
          });
          response.end(html, "utf-8");
        });
      }

      // create json log file
      if (request.url == "/chat") {
        let body = "";
        request.on("data", (chunk) => {
          body += chunk.toString();
        });
        return request.on("end", () => {
          let data = JSON.parse(body);

          console.log(body);

          const filepath = __dirname + "/logs/" + data.roomid + ".json";

          try {
            // file already exists
            let data_list = fs.readFileSync(filepath);
            data_list = JSON.parse(data_list);
            data_list.push(data);
            data = data_list;
          } catch (err) {
            if (err.code === "ENOENT") {
              // file not exists
              data = [data];
            } else {
              throw err;
            }
          }

          fs.writeFile(filepath, JSON.stringify(data), (err) => {
            if (err) throw err;
          });

          response.writeHead(201);
          response.end("created");
        });
      }
    }

    // GET METHOD
    if (request.method == "GET") {
      if (request.url == "/") {
        return fs.readFile(__dirname + "/demos/index.html", (err, data) => {
          if (err) {
            throw err;
          }
          response.end(data);
        });
      }

      if (request.url == "/health") {
        response.writeHead(200);
        return response.end("OK");
      }

      if (request.url.indexOf("/register") != -1) {
        return fs.readFile(__dirname + "/demos/register.html", (err, data) => {
          if (err) {
            throw err;
          }
          response.end(data);
        });
      }

      if (request.url.indexOf("/room") != -1) {
        const { roomid, username, userid } = qs.parse(
          url.parse(request.url).query
        );
        let htmlContent = fs.readFileSync(
          __dirname + "/demos/room.ejs",
          "utf-8"
        );
        let html = ejs.render(htmlContent, {
          roomid: roomid,
          username: username,
          userid: userid,
        });
        response.writeHead(201, {
          "Content-Type": "text/html;charset=utf-8",
        });
        return response.end(html, "utf-8");
      }

      if (request.url.indexOf("/report") != -1) {
        const { roomid } = qs.parse(url.parse(request.url).query);

        const homepage = "https://dodamdodam.site";
        // const homepage = "http://localhost:5000";

        // 채팅 파일 가져오기
        const chatfile = fs.readFileSync(`${__dirname}/logs/${roomid}.json`);
        const options = {
          uri: `${homepage}/api/report/${roomid}`,
          method: "POST",
          //   headers: { "content-type": "application/json" },
          json: true,
          body: JSON.parse(chatfile),
        };
        // 채팅 json 파일을 api 서버로 전송
        rpn(options, (err, res, body) => {
          if (!err && res.statusCode == 200) {
            console.log("json file created!");
          }
        });

        // 템플릿 렌더링
        let htmlContent = fs.readFileSync(
          __dirname + "/demos/report.ejs",
          "utf-8"
        );
        let html = ejs.render(htmlContent, {
          down_url: `${homepage}/api/report/${roomid}`,
        });
        response.writeHead(201, {
          "Content-Type": "text/html;charset=utf-8",
        });
        return response.end(html, "utf-8");
      }
    }

    // ===========================================================
    //
    // config etc router
    //
    // ===========================================================
    if (request.method !== "GET" || uri.indexOf("..") !== -1) {
      try {
        response.writeHead(401, {
          "Content-Type": "text/plain",
        });
        response.write("401 Unauthorized: " + path.join("/", uri) + "\n");
        response.end();
        return;
      } catch (e) {
        pushLogs(config, "!GET or ..", e);
      }
    }

    if (
      filename.indexOf(resolveURL("/admin/")) !== -1 &&
      config.enableAdmin !== true
    ) {
      try {
        response.writeHead(401, {
          "Content-Type": "text/plain",
        });
        response.write("401 Unauthorized: " + path.join("/", uri) + "\n");
        response.end();
        return;
      } catch (e) {
        pushLogs(config, "!GET or ..", e);
      }
      return;
    }

    var matched = false;
    [
      "/demos/",
      "/dev/",
      "/dist/",
      "/socket.io/",
      "/node_modules/canvas-designer/",
      "/admin/",
    ].forEach(function (item) {
      if (filename.indexOf(resolveURL(item)) !== -1) {
        matched = true;
      }
    });

    // files from node_modules
    [
      "RecordRTC.js",
      "FileBufferReader.js",
      "getStats.js",
      "getScreenId.js",
      "adapter.js",
      "MultiStreamsMixer.js",
    ].forEach(function (item) {
      if (
        filename.indexOf(resolveURL("/node_modules/")) !== -1 &&
        filename.indexOf(resolveURL(item)) !== -1
      ) {
        matched = true;
      }
    });

    if (filename.search(/.js|.json/g) !== -1 && !matched) {
      try {
        response.writeHead(404, {
          "Content-Type": "text/plain",
        });
        response.write("404 Not Found: " + path.join("/", uri) + "\n");
        response.end();
        return;
      } catch (e) {
        pushLogs(config, "404 Not Found", e);
      }
    }

    ["Video-Broadcasting", "Screen-Sharing", "Switch-Cameras"].forEach(
      function (fname) {
        try {
          if (filename.indexOf(fname + ".html") !== -1) {
            filename = filename.replace(
              fname + ".html",
              fname.toLowerCase() + ".html"
            );
          }
        } catch (e) {
          pushLogs(config, "forEach", e);
        }
      }
    );

    var stats;

    try {
      stats = fs.lstatSync(filename);

      if (
        filename.search(/demos/g) === -1 &&
        filename.search(/admin/g) === -1 &&
        stats.isDirectory() &&
        config.homePage === "/demos/index.html"
      ) {
        if (response.redirect) {
          response.redirect("/demos/");
        } else {
          response.writeHead(301, {
            Location: "/demos/",
          });
        }
        response.end();
        return;
      }
    } catch (e) {
      response.writeHead(404, {
        "Content-Type": "text/plain",
      });
      response.write("404 Not Found: " + path.join("/", uri) + "\n");
      response.end();
      return;
    }

    try {
      if (fs.statSync(filename).isDirectory()) {
        response.writeHead(404, {
          "Content-Type": "text/html",
        });

        if (filename.indexOf(resolveURL("/demos/MultiRTC/")) !== -1) {
          filename = filename.replace(resolveURL("/demos/MultiRTC/"), "");
          filename += resolveURL("/demos/MultiRTC/index.html");
        } else if (filename.indexOf(resolveURL("/admin/")) !== -1) {
          filename = filename.replace(resolveURL("/admin/"), "");
          filename += resolveURL("/admin/index.html");
        } else if (filename.indexOf(resolveURL("/demos/dashboard/")) !== -1) {
          filename = filename.replace(resolveURL("/demos/dashboard/"), "");
          filename += resolveURL("/demos/dashboard/index.html");
        } else if (
          filename.indexOf(resolveURL("/demos/video-conference/")) !== -1
        ) {
          filename = filename.replace(
            resolveURL("/demos/video-conference/"),
            ""
          );
          filename += resolveURL("/demos/video-conference/index.html");
        } else if (filename.indexOf(resolveURL("/demos")) !== -1) {
          filename = filename.replace(resolveURL("/demos/"), "");
          filename = filename.replace(resolveURL("/demos"), "");
          filename += resolveURL("/demos/index.html");
        } else {
          filename += resolveURL(config.homePage);
        }
      }
    } catch (e) {
      pushLogs(config, "statSync.isDirectory", e);
    }

    var contentType = "text/plain";
    if (filename.toLowerCase().indexOf(".html") !== -1) {
      contentType = "text/html";
    }
    if (filename.toLowerCase().indexOf(".css") !== -1) {
      contentType = "text/css";
    }
    if (filename.toLowerCase().indexOf(".png") !== -1) {
      contentType = "image/png";
    }

    fs.readFile(filename, "binary", function (err, file) {
      if (err) {
        response.writeHead(500, {
          "Content-Type": "text/plain",
        });
        response.write("404 Not Found: " + path.join("/", uri) + "\n");
        response.end();
        return;
      }

      try {
        file = file.replace(
          "connection.socketURL = '/';",
          "connection.socketURL = '" + config.socketURL + "';"
        );
      } catch (e) {}

      response.writeHead(200, {
        "Content-Type": contentType,
      });
      response.write(file, "binary");
      response.end();
    });
  } catch (e) {
    pushLogs(config, "Unexpected", e);

    response.writeHead(404, {
      "Content-Type": "text/plain",
    });
    response.write(
      "404 Not Found: Unexpected error.\n" + e.message + "\n\n" + e.stack
    );
    response.end();
  }
}

var httpApp;

if (isUseHTTPs) {
  httpServer = require("https");

  // See how to use a valid certificate:
  // https://github.com/muaz-khan/WebRTC-Experiment/issues/62
  var options = {
    key: null,
    cert: null,
    ca: null,
  };

  var pfx = false;

  if (!fs.existsSync(config.sslKey)) {
    console.log(
      BASH_COLORS_HELPER.getRedFG(),
      "sslKey:\t " + config.sslKey + " does not exist."
    );
  } else {
    pfx = config.sslKey.indexOf(".pfx") !== -1;
    options.key = fs.readFileSync(config.sslKey);
  }

  if (!fs.existsSync(config.sslCert)) {
    console.log(
      BASH_COLORS_HELPER.getRedFG(),
      "sslCert:\t " + config.sslCert + " does not exist."
    );
  } else {
    options.cert = fs.readFileSync(config.sslCert);
  }

  if (config.sslCabundle) {
    if (!fs.existsSync(config.sslCabundle)) {
      console.log(
        BASH_COLORS_HELPER.getRedFG(),
        "sslCabundle:\t " + config.sslCabundle + " does not exist."
      );
    }

    options.ca = fs.readFileSync(config.sslCabundle);
  }

  if (pfx === true) {
    options = {
      pfx: sslKey,
    };
  }

  httpApp = httpServer.createServer(options, serverHandler);
} else {
  httpApp = httpServer.createServer(serverHandler);
}

RTCMultiConnectionServer.beforeHttpListen(httpApp, config);
httpApp = httpApp.listen(
  process.env.PORT || PORT,
  process.env.IP || "0.0.0.0",
  function () {
    RTCMultiConnectionServer.afterHttpListen(httpApp, config);
  }
);

// --------------------------
// socket.io codes goes below

ioServer(httpApp).on("connection", function (socket) {
  RTCMultiConnectionServer.addSocket(socket, config);

  // ----------------------
  // below code is optional

  const params = socket.handshake.query;

  if (!params.socketCustomEvent) {
    params.socketCustomEvent = "custom-message";
  }

  // socket.emit('event', 'message')
  // socket.on('event', function (data) {})
  socket.on(params.socketCustomEvent, function (message) {
    socket.broadcast.emit(params.socketCustomEvent, message);
  });
});

// 채팅 데이터 가져오기

// 이미지 데이터 가져오기
